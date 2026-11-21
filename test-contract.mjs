// Deterministic lifecycle and preference regression checks; no browser claims.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { readGlassStyles } from './src/styles.mjs';

const [source, cssSource, metadata] = await Promise.all([
  readFile(new URL('./lib/client.js', import.meta.url), 'utf8'),
  readGlassStyles(),
  readFile(new URL('./package.json', import.meta.url), 'utf8'),
]);
let passed = 0;
function check(name, body) { body(); passed++; console.log('✓ ' + name); }

function mount({ stored = {}, media: initialMedia = {}, cores = 8, previous } = {}) {
  const attrs = new Map();
  const styles = new Map();
  const root = {
    style: { setProperty: (key, value) => styles.set(key, value), removeProperty: key => styles.delete(key) },
    dataset: new Proxy({}, {
      get: (_, key) => attrs.get('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())),
      set: (_, key, value) => { attrs.set('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()), String(value)); return true; },
    }),
    setAttribute: (key, value) => attrs.set(key, String(value)),
    removeAttribute: key => attrs.delete(key),
  };
  const nodes = [];
  const document = {
    documentElement: root, visibilityState: 'visible',
    head: { append: node => nodes.push(node) },
    createElement: () => ({ dataset: {}, remove() { nodes.splice(nodes.indexOf(this), 1); } }),
  };
  const media = new Map();
  const windowListeners = new Map();
  const rafs = new Map();
  const store = new Map(Object.entries(stored));
  let sequence = 0;
  let loaded;
  let currentTokens;
  const disposers = [];
  const registrations = [];
  const dictionaries = [];
  let language = 'zh';
  const window = {
    document, navigator: { hardwareConcurrency: cores }, __dshGlass: previous,
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
    },
    matchMedia: query => {
      if (!media.has(query)) {
        const listeners = new Set();
        media.set(query, {
          matches: Boolean(initialMedia[query]), listeners,
          addEventListener: (_, listener) => listeners.add(listener),
          removeEventListener: (_, listener) => listeners.delete(listener),
        });
      }
      return media.get(query);
    },
    addEventListener: (type, fn) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => windowListeners.get(type)?.delete(fn),
    requestAnimationFrame: fn => { const id = ++sequence; rafs.set(id, fn); return id; },
    cancelAnimationFrame: id => rafs.delete(id),
    __ModuleLoader__: { load: entry => { loaded = entry; } },
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useSyncExternalStore: (_, get) => get(),
    useId: () => 'glass-test-id',
  };
  vm.runInNewContext(source, { window, document, console });
  assert.equal(loaded.id, '@dsh-desktop/glass-ui');
  const mod = loaded.factory(name => { assert.equal(name, 'react'); return React; });
  const ctx = {
    effect: fn => { const cleanup = fn(); disposers.push(cleanup); return cleanup; },
    theme: {
      overrideTokens: (source, tokens) => {
        assert.equal(source, '@dsh-desktop/glass-ui');
        const layer = { tokens };
        currentTokens = layer;
        return () => { if (currentTokens === layer) currentTokens = undefined; };
      },
    },
    locale: {
      register: (ns, texts) => { dictionaries.push({ ns, texts }); return () => dictionaries.pop(); },
      bind: ns => key => dictionaries.find(entry => entry.ns === ns)?.texts[language]?.[key] ?? key,
    },
    slots: {
      inject: (name, callback) => { assert.equal(name, 'settings.section'); const cleanup = callback(); disposers.push(cleanup); },
      register: (options, component) => {
        const entry = { options, component };
        registrations.push(entry);
        return () => registrations.splice(registrations.indexOf(entry), 1);
      },
    },
  };
  mod.apply(ctx);
  return {
    window, document, nodes, root, attrs, styles, store, rafs, media, registrations, dictionaries,
    api: window.__dshGlass,
    changeLanguage: next => { language = next; },
    tokens: () => currentTokens?.tokens,
    frame(now) { const callbacks = [...rafs.values()]; rafs.clear(); callbacks.forEach(fn => fn(now)); },
    preference(query, value) { const entry = media.get(query); entry.matches = value; [...entry.listeners].forEach(fn => fn({ matches: value })); },
    storage(key, value) { if (value === null) store.delete(key); else store.set(key, value); [...(windowListeners.get('storage') || [])].forEach(fn => fn({ key })); },
    dispose() { [...disposers].reverse().forEach(fn => { if (typeof fn === 'function') fn(); }); },
    listenerCount: () => [...windowListeners.values(), ...[...media.values()].map(q => q.listeners)].reduce((n, set) => n + set.size, 0),
  };
}
const keys = Object.fromEntries(['quality', 'intensity', 'tone', 'messages', 'transparency', 'motion', 'texture']
  .map(name => [name, 'dsh.glass-ui.' + name]));
const q = { motion: '(prefers-reduced-motion: reduce)', transparency: '(prefers-reduced-transparency: reduce)', contrast: '(prefers-contrast: more)', forced: '(forced-colors: active)' };

check('built CSS matches source byte for byte; settings locale and slot mount', () => {
  const app = mount();
  assert.equal(app.nodes[0].textContent, cssSource);
  assert.equal(app.api.version, JSON.parse(metadata).version);
  assert.ok(Object.keys(app.tokens()).length >= 100);
  assert.ok(Object.values(app.tokens()).every(value => typeof value.light === 'string' && typeof value.dark === 'string'));
  assert.equal(app.registrations[0].options.locale, 'settings.glass-ui');
  assert.equal(app.dictionaries[0].texts.zh.title, 'Glass UI 玻璃外观');
  assert.equal(app.dictionaries[0].texts.en.title, 'Glass UI');
  const entry = app.registrations[0];
  assert.equal(entry.options.id, 'glass-ui');
  assert.equal(entry.options.label(), 'Glass UI 玻璃外观');
  app.changeLanguage('en');
  assert.equal(entry.options.label(), 'Glass UI');
  const tree = entry.component({ t: key => key, ...entry.options.inject() });
  assert.equal(tree.props['data-glass-settings'], '');
  assert.equal(tree.type, 'section');
  app.dispose();
});
check('quality and boolean values validate before state/storage mutations', () => {
  const app = mount();
  for (const bad of ['invalid', null, 1, {}]) assert.throws(() => app.api.quality(bad), /Invalid/);
  assert.throws(() => app.api.transparency('invalid'), /Invalid/);
  assert.throws(() => app.api.motion('true'), /Invalid/);
  assert.throws(() => app.api.texture(1), /Invalid/);
  assert.throws(() => app.api.messages(1), /Invalid/);
  assert.throws(() => app.api.tone('purple'), /Invalid/);
  for (const bad of [-1, 101, NaN, '90', 61.5]) assert.throws(() => app.api.intensity(bad), /Invalid/);
  assert.equal(app.store.size, 0);
  assert.equal(app.api.info().quality, 'full');
  app.dispose();
});
check('all requested preferences persist and survive remount', () => {
  const app = mount();
  app.api.quality('balanced'); app.api.transparency('reduced'); app.api.motion(true); app.api.texture(true);
  app.api.intensity(82); app.api.tone('cool'); app.api.messages(false);
  const next = mount({ stored: Object.fromEntries(app.store) });
  assert.equal(next.api.info().requested.quality, 'balanced');
  assert.equal(next.api.info().requested.transparency, 'reduced');
  assert.equal(next.api.info().requested.motion, true);
  assert.equal(next.api.info().requested.texture, true);
  assert.equal(next.api.info().requested.intensity, 82);
  assert.equal(next.api.info().requested.tone, 'cool');
  assert.equal(next.api.info().requested.messages, false);
  assert.equal(next.api.info().effective.quality, 'static');
  assert.equal(next.styles.get('--gx-strength'), '0');
  assert.equal(next.root.dataset.glassTone, undefined);
  assert.equal(next.root.dataset.glassMessages, undefined);
  next.api.transparency('auto');
  assert.equal(next.styles.get('--gx-strength'), '0.82');
  assert.equal(next.root.dataset.glassTone, 'cool');
  assert.equal(next.root.dataset.glassMessages, undefined);
  next.api.messages(true);
  assert.equal(next.root.dataset.glassMessages, 'on');
  app.dispose(); next.dispose();
});
check('live system transparency and contrast override stored full with opaque tokens', () => {
  const app = mount({ stored: { [keys.quality]: 'full' } });
  app.preference(q.transparency, true);
  assert.equal(app.api.info().quality, 'static');
  assert.equal(app.api.info().requested.quality, 'full');
  assert.equal(app.root.dataset.glassTransparency, 'reduced');
  assert.equal(app.tokens()['--dsw-alias-bg-layer-1'].light, 'rgb(255, 255, 255)');
  assert.equal(app.tokens()['--dsw-alias-button-tool-bar-fill-invisible'].light, 'rgba(255, 255, 255, 0)');
  assert.equal(app.tokens()['--dsw-specific-sidebar-wash-top-clear'].dark, 'rgba(76, 111, 255, 0)');
  assert.ok(app.tokens()['--dsw-shadow-lv1'].light.includes('rgba'));
  assert.equal(app.tokens()['--dsw-mask-blur'].dark, 'none');
  app.preference(q.transparency, false);
  assert.equal(app.api.info().quality, 'full');
  app.preference(q.contrast, true);
  assert.equal(app.api.info().quality, 'static');
  app.preference(q.forced, true);
  assert.equal(app.tokens()['--dsw-alias-label-primary'].dark, 'CanvasText');
  app.dispose();
});
check('live reduced motion suppresses effective motion without losing requested preference', () => {
  const app = mount();
  app.api.motion(true);
  assert.equal(app.root.dataset.glassMotion, 'on');
  app.preference(q.motion, true);
  assert.equal(app.api.info().motion, false);
  assert.equal(app.api.info().requested.motion, true);
  assert.equal(app.root.dataset.glassMotion, undefined);
  app.preference(q.motion, false);
  assert.equal(app.api.info().motion, true);
  app.api.quality('balanced');
  assert.equal(app.api.info().motion, false);
  app.dispose();
});
check('storage changes synchronize state; reset clears only owned preference keys', () => {
  const app = mount();
  app.storage(keys.quality, 'static');
  assert.equal(app.api.info().quality, 'static');
  app.storage(keys.quality, 'invalid');
  assert.equal(app.api.info().quality, 'full');
  app.storage(keys.motion, 'true');
  assert.equal(app.api.info().requested.motion, true);
  app.storage(keys.intensity, '');
  assert.equal(app.api.intensity(), 60);
  app.storage(keys.intensity, '0');
  assert.equal(app.styles.get('--gx-strength'), '0');
  app.storage(keys.tone, 'neutral');
  assert.equal(app.root.dataset.glassTone, 'neutral');
  app.storage(keys.messages, 'false');
  assert.equal(app.root.dataset.glassMessages, undefined);
  app.store.set('other-plugin', 'keep');
  app.api.reset();
  assert.equal(app.api.info().quality, 'full');
  assert.equal(app.api.info().requested.motion, false);
  assert.equal(app.styles.get('--gx-strength'), '0.6');
  assert.equal(app.root.dataset.glassTone, 'aurora');
  assert.equal(app.root.dataset.glassMessages, 'on');
  assert.equal(app.store.get('other-plugin'), 'keep');
  assert.ok(Object.values(keys).every(key => !app.store.has(key)));
  app.dispose();
});
check('watchdog samples visible elapsed time and stops; explicit quality wins', () => {
  const app = mount();
  for (let now = 0; now <= 2520; now += 40) app.frame(now);
  assert.equal(app.api.info().quality, 'balanced');
  assert.equal(app.rafs.size, 0);
  app.dispose();
  const manual = mount();
  manual.api.quality('full');
  for (let now = 0; now <= 2520; now += 40) manual.frame(now);
  assert.equal(manual.api.info().quality, 'full');
  manual.dispose();
  const hidden = mount();
  hidden.document.visibilityState = 'hidden';
  hidden.frame(0); hidden.frame(8000);
  assert.equal(hidden.api.info().quality, 'full');
  hidden.document.visibilityState = 'visible';
  hidden.frame(16000); hidden.frame(16016);
  assert.equal(hidden.api.info().quality, 'full');
  hidden.dispose();
  const saved = mount({ stored: { [keys.quality]: 'full' }, cores: 4 });
  assert.equal(saved.api.info().quality, 'full');
  for (let now = 0; now <= 2520; now += 40) saved.frame(now);
  assert.equal(saved.api.info().quality, 'full');
  assert.equal(saved.api.info().auto, 'none');
  saved.dispose();
  const automatic = mount({ cores: 4 });
  assert.equal(automatic.api.info().quality, 'balanced');
  automatic.api.transparency('reduced');
  assert.equal(automatic.api.info().auto, 'none');
  assert.equal(automatic.root.dataset.glassAuto, undefined);
  automatic.dispose();
});
check('dispose removes styles/attributes/media/storage/RAF/slots/tokens and restores prior API', () => {
  const previous = { original: true };
  const app = mount({ previous });
  app.api.motion(true); app.api.texture(true); app.api.transparency('reduced');
  app.dispose();
  assert.equal(app.nodes.length, 0);
  assert.equal(app.attrs.size, 0);
  assert.equal(app.styles.size, 0);
  assert.equal(app.listenerCount(), 0);
  assert.equal(app.rafs.size, 0);
  assert.equal(app.registrations.length, 0);
  assert.equal(app.dictionaries.length, 0);
  assert.equal(app.tokens(), undefined);
  assert.equal(app.window.__dshGlass, previous);
});
console.log(passed + ' contract regression groups passed.');
