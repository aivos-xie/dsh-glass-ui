/**
 * Edge rendering regressions for Glass UI's offline AppFrame fixture.
 * This deliberately does not claim to be an end-to-end test of a running DSH.
 * Usage: node test-browser.mjs --module-dir C:/path/to/playwright-project --output C:/path/to/report
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlassStyles } from './src/styles.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const output = resolve(option('output', join(here, 'browser-results')));
const moduleDir = option('module-dir', process.env.GLASS_UI_TEST_MODULE_DIR || 'C:/dsh-desktop/browser-auto-test');
const require = createRequire(join(resolve(moduleDir), 'package.json'));
const { chromium } = require('playwright-core');
await mkdir(output, { recursive: true });

let sourceCss = await readGlassStyles();
// Diagnostic-only switch for verifying that the caption regression detects the
// original bug. Production CSS is never changed by this switch.
if (args.includes('--simulate-before-caption-fix')) sourceCss=sourceCss.replace(/html\[data-glass-ui\]\[data-windows-titlebar\][^{]+\{\s*overflow: visible;\s*z-index: auto;[^}]*\}/g, '');
const originalPreview = await readFile(join(here, 'preview.html'), 'utf8');
// The original preview has static drawing-only controls. Supply native host
// geometry and real buttons/close handlers in memory for hit-testing, without
// changing production plugin code or the checked-in preview.
const preview = originalPreview
  .replace(/<link rel="stylesheet" href="\.\/src\/(?:chat|controls|rightbar)-glass\.css"\s*\/?>/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(/<div id="probe"><\/div>/g, '')
  .replace('</head>', `<style>
    .mP3x-q_frame {position:relative;box-sizing:border-box}
    .mP3x-q_centerCol,.mP3x-q_mainPanel,.cV7t_root{min-width:0}
    .cV7t_header{flex-wrap:wrap}
    .cV7t_titleCluster{min-width:0}
    .cV7t_title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cH2k_text table{width:100%}
    .sB1x_sidebarRoot{box-sizing:border-box}
    .mP3x-q_leadingSeat button{width:36px;height:36px;cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-primary)}
    .fixture-probes{position:fixed;left:-10000px;top:0;width:240px;pointer-events:none}
    .fixture-probes>div{padding:8px}
    @media(max-width:600px){.oV3m_menu{display:none}.cP9s_composerSeat{padding:0 10px 10px}.cH2k_scroller{padding:16px 14px}.cP9s_row{flex-wrap:wrap}.cV7t_header{padding:8px 14px}.cV7t_viewTabs{margin-left:0}}
  </style></head>`);

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/' || path === '/preview.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(preview);
  } else if (path === '/src/glass.css') {
    res.setHeader('content-type', 'text/css; charset=utf-8');
    res.end(sourceCss);
  } else if (path === '/favicon.ico') {
    res.writeHead(204).end();
  } else {
    res.writeHead(404).end('Not found');
  }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const checks = [];
const errors = [];
let browser;

const assert = (condition, message, detail) => {
  if (!condition) throw new Error(`${message}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
};
async function run(name, fn) {
  try {
    const detail = await fn();
    if (detail?.skipped) {
      checks.push({ name, status: 'skipped', detail });
      console.log(`SKIP ${name}: ${detail.reason}`);
      return;
    }
    checks.push({ name, status: 'passed', detail: detail || undefined });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, status: 'failed', error: String(error.message || error) });
    console.error(`FAIL ${name}: ${error.message || error}`);
  }
}

async function fixture({ dark = false, width = 1280, height = 860, quality = 'full', attributes = {}, media = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...media });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.evaluate(({ dark, quality, attributes, width }) => {
    const root = document.documentElement;
    document.body.toggleAttribute('data-ds-dark-theme', dark);
    root.dataset.glassQuality = quality;
    for (const [key, value] of Object.entries(attributes)) root.setAttribute(key, value);
    const frame = document.querySelector('.mP3x-q_frame');
    const mask = document.createElement('div');
    mask.className = 'mP3x-q_drawerMask';
    mask.setAttribute('data-sidebar-mask', '');
    mask.setAttribute('aria-hidden', 'true');
    const leading = document.createElement('div');
    leading.className = 'mP3x-q_leadingSeat';
    leading.setAttribute('data-shell-leading', '');
    leading.innerHTML = '<button type="button" data-sidebar-opener aria-label="打开侧边栏">☰</button>';
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭侧边栏');
    close.textContent = '关闭';
    document.querySelector('.sB1x_topStrip').append(close);
    const setOpen = open => {
      frame.toggleAttribute('data-sidebar-collapsed', !open);
      leading.toggleAttribute('inert', open);
      leading.querySelector('button').setAttribute('aria-expanded', String(open));
    };
    leading.querySelector('button').onclick = () => setOpen(true);
    close.onclick = () => setOpen(false);
    mask.onclick = () => setOpen(false);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    if (width < 768) {
      frame.setAttribute('data-sidebar-drawer', '');
      frame.style.gridTemplateColumns = '0px minmax(0, 1fr) 0px';
      setOpen(false);
      frame.append(mask, leading);
    } else {
      mask.style.display = 'none';
      close.style.display = 'none';
      frame.append(mask);
    }
    const probes = document.createElement('section');
    probes.className = 'fixture-probes';
    probes.setAttribute('aria-hidden', 'true');
    probes.innerHTML = `<div id="probe-menu" role="menu"><div role="menuitem">菜单项</div></div>
      <div id="probe-listbox" role="listbox"><div role="option" aria-selected="true">选项</div></div>
      <div id="probe-dialog" role="dialog" aria-label="对话框">对话框</div>
      <div id="probe-alertdialog" role="alertdialog" aria-label="警告">警告</div>
      <div id="probe-tooltip" role="tooltip" style="color:var(--dsw-alias-tooltip-label,#f7f9ff)">提示文字</div>
      <div id="probe-toast" class="fixture_toast" role="status" style="color:var(--dsw-alias-toast-label,#f7f9ff)">已保存</div>
      <div id="probe-status" role="status">普通行内状态</div>
      <div id="probe-class-menu" class="fixture_menu">类名菜单</div>
      <div id="probe-class-dialog" class="fixture_dialog">类名对话框</div>
      <input id="probe-input" aria-label="焦点检查" />`;
    document.body.append(probes);
  }, { dark, quality, attributes, width });
  await page.waitForTimeout(180);
  return { page, context };
}

// Isolate the installed renderer's React and ReactDOM module wrappers so the
// offline settings test never invokes the DeepSeek Harness web bootstrap.
async function loadHostReact() {
  const defaultAssets = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA,
    'Programs/DeepSeek Harness/resources/app/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets');
  const assets = option('host-assets', defaultAssets);
  if (!assets) return undefined;
  const entries = await readdir(assets).catch(error => {
    if (error.code === 'ENOENT' && !args.includes('--host-assets')) return [];
    throw error;
  });
  const renderer = entries.find(name => /^index-[\w-]+\.js$/.test(name));
  if (!renderer) return undefined;
  const source = await readFile(join(assets, renderer), 'utf8');
  const react = /\bvar [\w$]+=\{exports:\{\}\},[\w$]+=\{\};\/\*\*\s+\* @license React\s+\* react\.production\.min\.js\b/.exec(source);
  const scheduler = /\bvar (?:[\w$]+=\{(?:exports:\{\})?\},){3}[\w$]+=\{\};\/\*\*\s+\* @license React\s+\* scheduler\.production\.min\.js\b/.exec(source);
  const wrapper = /\bvar ([\w$]+)=([\w$]+)\(\);const [\w$]+=[\w$]+\(\1\),[\w$]+=[\w$]+\(\{__proto__:null,default:[\w$]+\},\[\1\]\);/;
  const domLicense = source.indexOf('* react-dom.production.min.js', scheduler?.index);
  const reactExport = react && scheduler && wrapper.exec(source.slice(react.index, scheduler.index));
  const domExport = domLicense >= 0 && wrapper.exec(source.slice(domLicense));
  assert(reactExport && domExport && scheduler && domLicense > scheduler.index, 'Could not locate the installed React wrappers', renderer);
  return [
    source.slice(react.index, react.index + reactExport.index),
    source.slice(scheduler.index, domLicense + domExport.index),
    `export const React = ${reactExport[2]}(); export const createRoot = ${domExport[2]}().createRoot;`,
  ].join('\n');
}

// The controls use the same selected attributes and direct children as the
// installed SettingsRoot and ConversationSession. Host handlers own selection.
const fixturePillTracks = `
  <div id="root" class="fixture-pill-shell">
    <aside role="dialog" data-shortcut-modal="settings" aria-label="设置导航">
      <div class="AnXs9G_navTitle">设置</div>
      <nav class="AnXs9G_nav"><div class="AnXs9G_navList" data-fixture-selection="aria-current">
        <button class="AnXs9G_navCell" aria-current="true"><span class="AnXs9G_navLabel">账号与余额</span></button>
        <button class="AnXs9G_navCell"><span class="AnXs9G_navLabel">工作区和其他设置</span></button>
        <button class="AnXs9G_navCell"><span class="AnXs9G_navLabel">模型</span></button>
      </div></nav>
    </aside>
    <div class="fixture-pill-content">
      <div class="cV7t_viewTabs" data-conversation-tabs role="tablist" aria-label="会话视图" data-fixture-selection="aria-selected">
        <button class="cV7t_tab cV7t_tabActive" role="tab" aria-selected="true"><span>对话</span></button>
        <button class="cV7t_tab" role="tab" aria-selected="false"><span>工作区文件记录</span></button>
        <button class="cV7t_tab" role="tab" aria-selected="false"><span>终端</span></button>
      </div>
      <main></main>
    </div>
  </div>`;

async function mountSettingsFixture(page, react, { hostTracks = false } = {}) {
  const bundle = await readFile(join(here, 'lib/client.js'), 'utf8');
  const adapter = `
    import { React, createRoot } from './react.js';
    const locale = new URL(location.href).searchParams.get('lang') || 'zh';
    document.documentElement.lang = locale;
    for (const track of document.querySelectorAll('[data-fixture-selection]')) {
      const attribute = track.dataset.fixtureSelection;
      track.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target || target.disabled) return;
        for (const button of track.children) {
          const current = button === target;
          if (attribute === 'aria-selected') {
            button.setAttribute(attribute, String(current));
            button.classList.toggle('cV7t_tabActive', current);
          } else if (current) button.setAttribute(attribute, 'true');
          else button.removeAttribute(attribute);
        }
      });
    }
    const dictionaries = new Map();
    const styles = document.head.appendChild(document.createElement('style'));
    const overrides = new Set();
    const syncTokens = () => {
      const values = Object.assign({}, ...overrides);
      const declarations = mode => Object.entries(values).map(([key, value]) => key + ':' + value[mode]).join(';');
      styles.textContent = ':root{' + declarations('light') + '}body[data-ds-dark-theme]{' + declarations('dark') + '}';
    };
    const bind = namespace => (key, values = {}) => dictionaries.get(namespace)[locale][key]
      .replace(/\\{(\\w+)\\}/g, (token, name) => values[name] ?? token);
    let settings;
    let plugin;
    window.__ModuleLoader__ = { load({ factory }) { plugin = factory(name => {
      if (name !== 'react') throw new Error('Unexpected module: ' + name);
      return React;
    }); } };
    await import('./bundle.js');
    plugin.apply({
      effect: callback => callback(),
      theme: { overrideTokens(_plugin, tokens) {
        overrides.add(tokens);
        syncTokens();
        return () => { overrides.delete(tokens); syncTokens(); };
      } },
      locale: { register: (namespace, translations) => dictionaries.set(namespace, translations), bind },
      slots: {
        inject: (name, register) => { if (name === 'settings.section') register(); },
        register: (options, Component) => { settings = { options, Component }; },
      },
    });
    const { options, Component } = settings;
    window.__settingsFixture = { react: React.version, label: options.label(), slot: options.name };
    const props = { t: bind(options.locale), ...options.inject() };
    createRoot(document.querySelector('main')).render(React.createElement(Component, props));
  `;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Glass UI</title><style>
    body { margin:0; min-height:100vh; font:14px 'Segoe UI',sans-serif; color:var(--dsw-alias-label-primary); }
    main { box-sizing:border-box; max-width:650px; margin:0 auto; padding:16px; }
    .fixture-pill-shell { display:grid; grid-template-columns:188px minmax(0,1fr); gap:24px; max-width:830px; padding:50px 28px 20px; margin:0 auto; }
    .fixture-pill-shell aside { align-self:start; padding:12px; }
    .fixture-pill-shell .AnXs9G_navList { display:flex; flex-direction:column; gap:6px; overflow:auto; }
    .fixture-pill-shell .AnXs9G_navTitle { padding:4px 8px 12px; }
    .fixture-pill-shell button { box-sizing:border-box; display:flex; align-items:center; justify-content:center; font:inherit; line-height:1.4; cursor:pointer; }
    .fixture-pill-shell .cV7t_viewTabs { display:flex; align-items:center; margin:0 0 14px 16px; }
    .fixture-pill-shell .cV7t_tab { min-width:80px; min-height:35px; border:1px solid transparent; }
    </style><script type="module" src="./mount.js"></script></head>
    <body>${hostTracks ? fixturePillTracks : '<main></main>'}<div hidden><div class="fixture_centerCol" data-conversation-content>
    <p data-message-bubble></p></div></div></body></html>`;
  const resources = new Map([
    ['/settings-test/', ['text/html', html]],
    ['/settings-test/react.js', ['text/javascript', react]],
    ['/settings-test/bundle.js', ['text/javascript', bundle]],
    ['/settings-test/mount.js', ['text/javascript', adapter]],
  ]);
  await page.route(url => url.origin === baseUrl && resources.has(url.pathname), route => {
    const [contentType, body] = resources.get(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: `${contentType}; charset=utf-8`, body });
  });
}

async function settledPill(rail, selected) {
  return rail.evaluate(async (el, choice) => {
    let result;
    for (let frame = 0; frame < 120; frame++) {
      const target = el.querySelector(choice);
      const railRect = el.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const style = getComputedStyle(el);
      const pseudo = getComputedStyle(el, '::after');
      const x = parseFloat(style.getPropertyValue('--gx-pill-x'));
      const y = parseFloat(style.getPropertyValue('--gx-pill-y'));
      const width = parseFloat(style.getPropertyValue('--gx-pill-width'));
      const height = parseFloat(style.getPropertyValue('--gx-pill-height'));
      const error = Math.max(
        Math.abs(railRect.left + el.clientLeft - el.scrollLeft + x - targetRect.left),
        Math.abs(railRect.top + el.clientTop - el.scrollTop + y - targetRect.top),
        Math.abs(width - targetRect.width), Math.abs(height - targetRect.height),
      );
      result = {
        target: choice, offsetParent: target.offsetParent?.className,
        x, y, width, height, error, painted: el.hasAttribute('data-glass-pill')
        && pseudo.content !== 'none' && pseudo.content !== 'normal' && pseudo.pointerEvents === 'none' };
      if (result.painted && error <= 1) return result;
      await new Promise(resolveFrame => requestAnimationFrame(resolveFrame));
    }
    return result;
  }, selected);
}

async function reversePill(rail, axis) {
  return rail.evaluate(async (el, direction) => {
    const buttons = [...el.children];
    const start = buttons[0];
    const destination = buttons.at(-1);
    const label = start.firstElementChild;
    const coordinate = direction === 'x' ? 'left' : 'top';
    const span = direction === 'x' ? 'width' : 'height';
    const read = () => {
      const style = getComputedStyle(el);
      return { position: parseFloat(style.getPropertyValue('--gx-pill-' + direction)),
        span: parseFloat(style.getPropertyValue('--gx-pill-' + span)) };
    };
    const initial = read();
    const distance = destination.getBoundingClientRect()[coordinate] - start.getBoundingClientRect()[coordinate];
    destination.click();
    const samples = [];
    for (let frame = 0; frame < 18; frame++) {
      await new Promise(resolveFrame => requestAnimationFrame(resolveFrame));
      const current = read();
      samples.push(current);
      if (current.position > initial.position + 1 && current.position < initial.position + distance - 1
        && Math.abs(current.span - initial.span) > .5) break;
    }
    const turning = samples.at(-1);
    const intermediate = turning.position > initial.position + 1
      && turning.position < initial.position + distance - 1 && Math.abs(turning.span - initial.span) > .5;
    const nextState = getComputedStyle(label).transform;
    start.click();
    await Promise.resolve();
    return { direction, initial, turning, immediate: read(), intermediate, distance, foreground: nextState };
  }, axis);
}

async function filters(page) {
  return page.evaluate(() => {
    const entries = [
      ['frame-before', '.mP3x-q_frame', '::before'],
      ['sidebar', '.mP3x-q_sidebarCol'], ['center', '.mP3x-q_centerCol'],
      ['rightbar', '.mP3x-q_rightbarCol'], ['mask', '.mP3x-q_drawerMask'],
      ['composer', '.cP9s_card'], ['menu', '#probe-menu'], ['listbox', '#probe-listbox'],
      ['dialog', '#probe-dialog'], ['alertdialog', '#probe-alertdialog'],
      ['tooltip', '#probe-tooltip'], ['toast', '#probe-toast'],
      ['class-menu', '#probe-class-menu'], ['class-dialog', '#probe-class-dialog'],
    ];
    return entries.map(([name, selector, pseudo]) => {
      const style = getComputedStyle(document.querySelector(selector), pseudo);
      return { name, backdrop: style.backdropFilter, background: style.backgroundColor, animation: style.animationName };
    });
  });
}
function noFilters(items) {
  const remaining = items.filter(item => item.backdrop !== 'none');
  assert(remaining.length === 0, 'Fallback left active backdrop filters', remaining);
}

try {
  browser = await chromium.launch({ channel: option('channel', 'msedge'), headless: true });
  for (const dark of [false, true]) {
    const label = dark ? 'dark' : 'light';
    await run(`${label}: visible glass material and stable layout`, async () => {
      const { page, context } = await fixture({ dark });
      try {
        const data = await page.evaluate(() => {
          const pane = document.querySelector('.mP3x-q_centerCol');
          const style = getComputedStyle(pane);
          return { pane: { background: style.backgroundColor, filter: style.backdropFilter, shadow: style.boxShadow }, bodyBackground: getComputedStyle(document.body).backgroundImage, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert(data.pane.filter.includes('blur'), 'Normal glass pane has no blur', data);
        assert(data.bodyBackground.includes('gradient'), 'Scene background is missing', data);
        assert(!data.overflow, 'Desktop fixture has horizontal overflow', data);
        await page.screenshot({ path: join(output, `${label}.png`), animations: 'disabled' });
        return data;
      } finally { await context.close(); }
    });
    await run(`${label}: tooltip and toast text contrast`, async () => {
      const { page, context } = await fixture({ dark });
      try {
        const data = await page.evaluate(() => {
          const rgb = text => (text.match(/[\d.]+/g) || []).map(Number);
          const luminance = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
          const composite = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
          return ['#probe-tooltip', '#probe-toast'].map(selector => {
            const style = getComputedStyle(document.querySelector(selector));
            const ink = rgb(style.color), fill = rgb(style.backgroundColor);
            // Probe against both white and black behind the translucent popup.
            const contrasts = [[255,255,255], [0,0,0]].map(bg => {
              const surface = composite(fill, bg);
              const text = composite(ink, surface);
              const [a,b] = [luminance(surface),luminance(text)].sort((a,b) => b-a);
              return (a+.05)/(b+.05);
            });
            return { selector, color: style.color, background: style.backgroundColor, worstContrast: Math.min(...contrasts) };
          });
        });
        assert(data.every(item => item.worstContrast >= 4.5), 'Tooltip/toast contrast below 4.5:1', data);
        return data;
      } finally { await context.close(); }
    });
    await run(`${label}: static includes every plugin filter surface`, async () => {
      const { page, context } = await fixture({ dark, quality: 'static', attributes: { 'data-glass-auto': 'balanced', 'data-glass-motion': 'on', 'data-glass-texture': 'on' } });
      try {
        const items = await filters(page); noFilters(items);
        const panes = items.filter(item => ['sidebar','center'].includes(item.name));
        assert(panes.every(item => /^rgb\(/.test(item.background)), 'Static structural panes must be opaque', panes);
        return items;
      } finally { await context.close(); }
    });
  }

  await run('390px: drawer opener hit-test, open geometry, mask close and Escape', async () => {
    const { page, context } = await fixture({ width: 390, height: 844 });
    try {
      const opener = page.getByRole('button', { name: '打开侧边栏' });
      await opener.click();
      await page.waitForTimeout(350);
      const data = await page.evaluate(() => {
        const sidebar = document.querySelector('.mP3x-q_sidebarCol');
        const rect = sidebar.getBoundingClientRect();
        return { x: rect.x, width: rect.width, height: rect.height, right: rect.right, open: !document.querySelector('.mP3x-q_frame').hasAttribute('data-sidebar-collapsed'), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(data.open && data.width >= 240 && data.right <= 390, 'Drawer is not within viewport', data);
      assert(!data.overflow, 'Narrow fixture has horizontal overflow', data);
      await page.screenshot({ path: join(output, 'narrow-drawer-open.png'), animations: 'disabled' });
      await page.locator('.mP3x-q_drawerMask').click({ position: { x: 374, y: 300 } });
      await page.waitForTimeout(350);
      assert(await page.locator('.mP3x-q_frame').evaluate(el => el.hasAttribute('data-sidebar-collapsed')), 'Mask did not close drawer');
      await opener.click();
      await page.keyboard.press('Escape');
      assert(await page.locator('.mP3x-q_frame').evaluate(el => el.hasAttribute('data-sidebar-collapsed')), 'Escape did not close drawer');
      await page.screenshot({ path: join(output, 'narrow-drawer-closed.png'), animations: 'disabled' });
      return data;
    } finally { await context.close(); }
  });

  for (const [name, attribute] of [['reduced transparency','data-glass-transparency'], ['increased contrast','data-glass-contrast']]) {
    await run(`live ${name}: opaque panes and complete filter fallback`, async () => {
      const { page, context } = await fixture();
      try {
        await page.evaluate(({ attribute, value }) => document.documentElement.setAttribute(attribute, value), { attribute, value: attribute.includes('transparency') ? 'reduced' : 'more' });
        const items = await filters(page); noFilters(items);
        assert(items.filter(item => ['sidebar','center'].includes(item.name)).every(item => /^rgb\(/.test(item.background)), 'Preference fallback still translucent', items);
        await page.evaluate(attribute => document.documentElement.removeAttribute(attribute), attribute);
        assert((await filters(page)).find(item => item.name === 'center').backdrop.includes('blur'), 'Removing preference did not restore base material');
        return items;
      } finally { await context.close(); }
    });
  }

  await run('reduced motion: live media change stops decorations, popup animation and hover movement', async () => {
    const { page, context } = await fixture({ attributes: { 'data-glass-motion':'on' } });
    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('.sB1x_newSession').hover();
      const data = await page.evaluate(() => ({
        decorations: getComputedStyle(document.body, '::before').animationName,
        hoverTransform: getComputedStyle(document.querySelector('.sB1x_newSession')).transform,
        popups: [...document.querySelectorAll('.fixture-probes > div')].map(el => ({ id: el.id, animation: getComputedStyle(el).animationName })),
      }));
      assert(data.decorations === 'none', 'Background motion still animates', data);
      assert(data.hoverTransform === 'none' || data.hoverTransform === 'matrix(1, 0, 0, 1, 0, 0)', 'Hover still moves under reduced motion', data);
      assert(data.popups.every(item => item.animation === 'none'), 'Popup animations still active', data);
      return data;
    } finally { await context.close(); }
  });

  await run('increased contrast: live system media preference', async () => {
    const { page, context } = await fixture();
    try {
      await page.emulateMedia({ contrast:'more' });
      assert(await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches), 'Contrast media simulation was not applied');
      const items = await filters(page); noFilters(items);
      assert(items.filter(item => ['sidebar','center'].includes(item.name)).every(item => /^rgb\(/.test(item.background)), 'System contrast fallback still translucent', items);
      return items;
    } finally { await context.close(); }
  });

  await run('reduced transparency: live system media preference', async () => {
    const { page, context } = await fixture();
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-transparency', value:'reduce' }] });
      if (!await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)) return { skipped:true, reason:'This Edge build cannot emulate reduced transparency; explicit reduced-transparency attribute remains covered separately.' };
      const items = await filters(page); noFilters(items);
      assert(items.filter(item => ['sidebar','center'].includes(item.name)).every(item => /^rgb\(/.test(item.background)), 'System reduced transparency fallback still translucent', items);
      return items;
    } finally { await context.close(); }
  });

  await run('forced colors: system colors, complete filter fallback and keyboard focus', async () => {
    const { page, context } = await fixture({ media: { forcedColors: 'active' } });
    try {
      const items = await filters(page); noFilters(items);
      await page.locator('#probe-input').focus();
      const focus = await page.locator('#probe-input').evaluate(el => {
        const style = getComputedStyle(el);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, background: style.backgroundColor, text: style.color };
      });
      assert(focus.style !== 'none' && parseFloat(focus.width) >= 1, 'Keyboard focus outline disappeared', focus);
      return { surfaces: items, focus };
    } finally { await context.close(); }
  });

  await run('plain status role preserves inline semantics', async () => {
    const { page, context } = await fixture();
    try {
      const data = await page.locator('#probe-status').evaluate(el => {
        const style = getComputedStyle(el);
        return { filter: style.backdropFilter, shadow: style.boxShadow, background: style.backgroundColor, radius: style.borderRadius };
      });
      assert(data.filter === 'none' && data.shadow === 'none', 'Plain live region incorrectly decorated as toast', data);
      return data;
    } finally { await context.close(); }
  });

  await run('no backdrop support: simulated unsupported CSS branch remains opaque', async () => {
    const { page, context } = await fixture();
    try {
      // @supports cannot be disabled through Playwright. Invert ONLY this known
      // production condition to exercise its declarations, then simulate the
      // unsupported filter property. This is a branch test, not engine evidence.
      const fallbackCss = sourceCss.replace(/@supports not \(\(backdrop-filter: blur\(2px\)\) or \(-webkit-backdrop-filter: blur\(2px\)\)\)/g, '@supports (display: block)');
      await page.addStyleTag({ content: fallbackCss });
      const data = await page.evaluate(() => {
        document.querySelector('.cV7t_root').setAttribute('data-conversation-content', '');
        document.querySelector('.cP9s_card').setAttribute('data-composer-card', '');
        return ['.mP3x-q_sidebarCol', '.mP3x-q_centerCol', '#probe-menu', '[data-composer-card]'].map(selector => ({
          selector, background: getComputedStyle(document.querySelector(selector)).backgroundColor,
        }));
      });
      assert(data.every(item => /^rgb\(/.test(item.background)), 'No-blur branch leaves transparent text surfaces', data);
      return { simulated: true, reason: 'Native Edge supports backdrop-filter; tested production fallback declarations with the @supports condition activated.', surfaces: data };
    } finally { await context.close(); }
  });

  await run('narrow static rendering', async () => {
    const { page, context } = await fixture({ width: 390, height: 844, dark: true, quality: 'static' });
    try {
      noFilters(await filters(page));
      await page.screenshot({ path: join(output, 'narrow-static.png'), animations: 'disabled' });
      return { width:390,height:844,theme:'dark',quality:'static' };
    } finally { await context.close(); }
  });

  await run('built settings section: keyboard, live materials, persistence and localization', async () => {
    const react = await loadHostReact();
    if (!react) return { skipped: true, reason: 'Installed DeepSeek Harness renderer not found. Use --host-assets to specify its dist/assets directory.' };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await mountSettingsFixture(page, react);
      await page.goto(`${baseUrl}/settings-test/?lang=zh`);
      const panel = page.getByRole('region', { name: 'Glass UI 玻璃外观', exact: true });
      await panel.getByRole('heading', { name: 'Glass UI 玻璃外观', exact: true }).waitFor({ timeout: 5000 });
      const built = await page.evaluate(() => ({ ...window.__settingsFixture, version: window.__dshGlass.version }));
      assert(built.label === 'Glass UI 玻璃外观' && built.slot === 'settings.section' && built.version && built.react, 'Built plugin did not register its localized settings slot', built);

      await panel.getByText('均衡', { exact: true }).click();
      const balanced = panel.getByRole('radio', { name: /^均衡/ });
      assert(await balanced.isChecked(), 'Visible label did not select its radio');
      await balanced.press('ArrowRight');
      const staticRadio = panel.getByRole('radio', { name: /^静态/ });
      const radio = await staticRadio.evaluate(el => ({ checked: el.checked, focused: el === document.activeElement,
        outline: getComputedStyle(el.nextElementSibling).outlineWidth, quality: document.documentElement.dataset.glassQuality }));
      assert(radio.checked && radio.focused && parseFloat(radio.outline) >= 2 && radio.quality === 'static', 'Keyboard selection did not update styling and effective quality', radio);
      await panel.getByText('完整玻璃', { exact: true }).click();

      const slider = panel.getByRole('slider', { name: '玻璃强度', exact: true });
      const chat = page.locator('[data-conversation-content]');
      const bubble = page.locator('[data-message-bubble]');
      const blur = await chat.evaluate(el => getComputedStyle(el).backdropFilter);
      const light = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage);
      const surface = await bubble.evaluate(el => getComputedStyle(el).backgroundImage);
      assert(blur.includes('blur') && light.includes('gradient') && surface.includes('gradient'), 'Default chat material missing');
      await slider.press('ArrowRight');
      assert(await slider.getAttribute('aria-valuetext') === '61%', 'Range keyboard input did not update the accessible value');
      assert(await chat.evaluate(el => getComputedStyle(el).backdropFilter) !== blur, 'Range keyboard input did not change glass blur');
      await panel.getByText('清蓝', { exact: true }).click();
      assert(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage) !== light, 'Tone radio did not change the canvas');
      await panel.getByRole('checkbox', { name: /^消息玻璃/ }).uncheck();
      assert(await bubble.evaluate(el => getComputedStyle(el).backgroundImage) === 'none', 'Message toggle did not remove the bubble material');
      const layout = await panel.evaluate(el => ({ viewport: innerWidth, width: el.getBoundingClientRect().width,
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
      assert(layout.width <= layout.viewport && layout.scrollWidth <= layout.clientWidth + 1, 'Settings overflow at a narrow width', layout);
      await page.screenshot({ path: join(output, 'settings-panel.png'), animations: 'disabled' });

      await page.goto(`${baseUrl}/settings-test/?lang=en`);
      const english = page.getByRole('region', { name: 'Glass UI', exact: true });
      const range = english.getByRole('slider', { name: 'Glass intensity', exact: true });
      await range.waitFor({ timeout: 5000 });
      assert(await page.evaluate(() => window.__settingsFixture.label) === 'Glass UI', 'English settings slot label did not localize');
      const blue = english.getByRole('radio', { name: /^Cool blue/ });
      const messages = english.getByRole('checkbox', { name: /^Glass messages/ });
      assert(await range.inputValue() === '61' && await blue.isChecked() && !await messages.isChecked(), 'Preferences did not persist across a page load');
      await english.getByRole('button', { name: 'Restore defaults', exact: true }).click();
      assert(await range.inputValue() === '60' && await english.getByRole('radio', { name: /^Aurora/ }).isChecked()
        && await messages.isChecked(), 'Reset did not restore the default controls');
      assert(await page.evaluate(() => Object.keys(localStorage).every(key => !key.startsWith('dsh.glass-ui.'))), 'Reset left persisted Glass UI settings');
      assert(await chat.evaluate(el => getComputedStyle(el).backdropFilter) === blur
        && await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage) === light
        && await bubble.evaluate(el => getComputedStyle(el).backgroundImage) === surface, 'Reset did not restore the default glass material');
      return { ...built, ...layout, locales: ['zh', 'en'] };
    } finally { await context.close(); }
  });
  await run('built shared pills: host selection, both axes, mid-motion reversal and fallbacks', async () => {
    const react = await loadHostReact();
    if (!react) return { skipped: true, reason: 'Installed DeepSeek Harness renderer not found.' };
    const context = await browser.newContext({ viewport: { width: 1050, height: 900 } });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.addInitScript(() => localStorage.setItem('dsh.glass-ui.quality', 'full'));
      await mountSettingsFixture(page, react, { hostTracks: true });
      await page.goto(`${baseUrl}/settings-test/?lang=zh`);
      const menu = page.getByRole('navigation');
      const tablist = page.getByRole('tablist', { name: '会话视图' });
      const vertical = menu.locator('[class$="_navList"]');
      const horizontal = tablist;
      const activeNav = 'button[aria-current="true"]';
      const activeTab = 'button[aria-selected="true"]';
      const radios = page.getByRole('group', { name: '背景色调' });
      const tone = radios.locator('.gx-settings-options');
      await tone.waitFor({ timeout: 5000 });
      for (const [track, target] of [[vertical, activeNav], [horizontal, activeTab], [tone, 'label:has(input:checked) > span']]) {
        const geometry = await settledPill(track, target);
        assert(geometry.painted && geometry.error <= 1, 'Initial pill is not aligned or the shared layer is missing', geometry);
      }
      assert(await vertical.locator(':scope > *').count() === 3 && await horizontal.locator(':scope > *').count() === 3
        && await tone.locator(':scope > *').count() === 3, 'Pill enhancement inserts competing controls');

      const motion = [];
      for (const [track, active, axis] of [[vertical, activeNav, 'y'], [horizontal, activeTab, 'x']]) {
        const reversal = await reversePill(track, axis);
        assert(reversal.intermediate && reversal.foreground === 'none', 'The selection does not stretch and move independently of the labels', reversal);
        assert(Math.abs(reversal.immediate.position - reversal.turning.position) <= 1
          && Math.abs(reversal.immediate.span - reversal.turning.span) <= 1, 'Reversing a moving pill jumps to an endpoint', reversal);
        const after = await settledPill(track, active);
        assert(after.painted && after.error <= 1, 'Pill did not settle after reversal', after);
        motion.push(reversal);
      }

      await menu.getByRole('button', { name: '账号与余额' }).focus();
      await page.keyboard.press('Tab');
      const focused = menu.getByRole('button', { name: '工作区和其他设置' });
      assert(await focused.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle !== 'none'), 'Keyboard focus disappeared over the pill');
      await page.keyboard.press('Enter');
      assert(await focused.getAttribute('aria-current') === 'true', 'Host keyboard selection failed');
      const selectedTab = tablist.getByRole('tab', { name: '工作区文件记录' });
      await selectedTab.click();
      assert(await selectedTab.getAttribute('aria-selected') === 'true', 'Shared pill intercepts chat tab clicks');
      const toneChoice = radios.getByRole('radio', { name: /^清蓝/ });
      await radios.getByText('清蓝', { exact: true }).click();
      assert(await toneChoice.isChecked(), 'Shared pill intercepts a real settings radio');
      const aligned = [];
      for (const [track, target] of [[vertical, activeNav], [horizontal, activeTab], [tone, 'label:has(input:checked) > span']]) {
        const geometry = await settledPill(track, target);
        assert(geometry.painted && geometry.error <= 1, 'Shared layer missed a different sized target', geometry);
        aligned.push(geometry);
      }
      await page.screenshot({ path: join(output, 'shared-glass-pills.png'), animations: 'disabled' });
      const readPalette = () => horizontal.evaluate(el => ({
        fill: getComputedStyle(el, '::after').backgroundColor,
        ink: getComputedStyle(el.querySelector('[aria-selected="true"]')).color,
      }));
      const light = await readPalette();
      await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''));
      assert((await settledPill(horizontal, activeTab)).painted, 'The shared pill disappeared in dark mode');
      await page.screenshot({ path: join(output, 'shared-glass-pills-dark.png'), animations: 'disabled' });
      const dark = await readPalette();
      assert(dark.fill !== light.fill && dark.ink !== light.ink, 'Shared pill does not follow the host theme', { light, dark });
      await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'));

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-glass-reduced-motion'), undefined, { timeout: 5000 });
      const reduced = await horizontal.evaluate(async track => {
        const target = track.lastElementChild;
        target.click();
        // Allow one discovery frame and one measurement frame. A spring cannot
        // traverse this distance in that time unless reduced motion snaps.
        await new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
        const pill = getComputedStyle(track);
        const targetRect = target.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const left = parseFloat(pill.getPropertyValue('--gx-pill-x'));
        return { visible: track.hasAttribute('data-glass-pill'), selected: target.getAttribute('aria-selected'),
          delta: Math.abs(trackRect.left + track.clientLeft - track.scrollLeft + left - targetRect.left) };
      });
      assert(reduced.visible && reduced.selected === 'true' && reduced.delta <= 1, 'Reduced motion still slides or loses the pill', reduced);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await page.locator('[data-glass-pill]').first().waitFor({ state: 'detached', timeout: 5000 });
      assert(await page.locator('[data-glass-pill]').count() === 0 && await focused.getAttribute('aria-current') === 'true'
        && await toneChoice.isChecked(), 'Forced colors removes selection or leaves the enhanced layer present');
      await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
      await page.locator('[data-conversation-tabs][data-glass-pill]').waitFor({ timeout: 5000 });
      await page.getByRole('group', { name: '渲染质量' }).getByText('静态', { exact: true }).click();
      await page.locator('[data-glass-pill]').first().waitFor({ state: 'detached', timeout: 5000 });
      assert(await page.locator('[data-glass-pill]').count() === 0 && await selectedTab.getAttribute('aria-selected') === 'false', 'Static quality retains the enhanced layer or changes the selected tab');
      return { motion, aligned, reduced, palette: { light, dark } };
    } finally { await context.close(); }
  });

  await run('built guide reflection: pointer position, press, keyboard and reduced motion', async () => {
    const react = await loadHostReact();
    if (!react) return { skipped: true, reason: 'Installed DeepSeek Harness renderer not found.' };
    const context = await browser.newContext({ viewport: { width: 900, height: 850 } });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.addInitScript(() => {
        localStorage.setItem('dsh.glass-ui.quality', 'full');
        localStorage.setItem('dsh.glass-ui.motion', 'true');
      });
      await mountSettingsFixture(page, react);
      await page.goto(`${baseUrl}/settings-test/?lang=zh`);
      await page.locator('html[data-glass-motion="on"]').waitFor({ timeout: 5000 });
      await page.evaluate(() => {
        const guide = document.createElement('div');
        guide.dataset.sidebarRightGuide = '';
        const entry = document.createElement('button');
        entry.dataset.sidebarRightGuideEntry = '';
        entry.setAttribute('aria-haspopup', 'menu');
        entry.setAttribute('aria-expanded', 'false');
        entry.type = 'button';
        entry.textContent = '打开工作区文件';
        entry.style.cssText = 'padding:16px 24px;border-radius:18px;color:inherit;font:inherit;cursor:pointer';
        entry.addEventListener('click', () => entry.setAttribute('aria-expanded', 'true'));
        guide.append(entry);
        document.querySelector('main').prepend(guide);
      });
      const entry = page.getByRole('button', { name: '打开工作区文件' });
      await entry.hover({ position: { x: 30, y: 18 } });
      await page.locator('[data-glass-guide-lit]').waitFor({ timeout: 5000 });
      const box = await entry.boundingBox();
      await page.mouse.move(box.x + 60, box.y + 24);
      await page.waitForFunction(() => parseFloat(document.querySelector('[data-sidebar-right-guide-entry]')?.style.getPropertyValue('--gx-guide-x')) >= 58);
      const light = await entry.evaluate(el => {
        const fill = getComputedStyle(el, '::before');
        const rim = getComputedStyle(el, '::after');
        return { fill: fill.backgroundImage, rim: rim.backgroundImage, pointerEvents: [fill.pointerEvents, rim.pointerEvents] };
      });
      assert([light.fill, light.rim].every(value => value.includes('radial-gradient')) && light.pointerEvents.every(value => value === 'none'), 'Guide loses its reflection layers or intercepts pointer input', light);
      await entry.click();
      assert(await entry.getAttribute('aria-expanded') === 'true', 'Guide reflection prevents host button activation');
      await page.mouse.move(1, 1);
      await page.locator('[data-glass-guide-lit]').waitFor({ state: 'detached', timeout: 5000 });
      await entry.hover();
      await page.locator('[data-glass-guide-lit]').waitFor({ timeout: 5000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-glass-guide-lit]').waitFor({ state: 'detached', timeout: 5000 });
      await entry.hover({ position: { x: 35, y: 18 } });
      await entry.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
      assert(await page.locator('[data-glass-guide-lit]').count() === 0, 'Guide adds motion after the live reduced-motion setting');
      await entry.evaluate(el => el.setAttribute('aria-expanded', 'false'));
      await entry.focus();
      await page.keyboard.press('Enter');
      assert(await entry.getAttribute('aria-expanded') === 'true', 'Guide button cannot be activated with the keyboard');
      return light;
    } finally { await context.close(); }
  });

  for (const quality of ['full','balanced','static']) for (const nested of [false,true]) {
    await run(`Windows caption: ${quality}, ${nested ? 'nested host, CSSOM columns' : 'direct host, inline columns'} preserves fixed controls`, async () => {
      const { page, context } = await fixture({ quality });
      try {
        // Reproduce SidebarRoot's real Windows ownership: caption controls stay
        // INSIDE the collapsed sidebar, position:fixed, rather than shell.leading.
        await page.addStyleTag({content:`
          html[data-windows-titlebar]{--dsh-windows-titlebar-height:40px;--dsh-frame-chrome-top:40px}
          [data-windows-titlebar] .mP3x-q_frame{padding-top:40px}
          .wtg9ga_root{height:100%;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,#d1d6e1)}
          .wtg9ga_topStrip{display:flex;align-items:center}
          [data-windows-titlebar] .wtg9ga_toggle,
          [data-windows-titlebar] .wtg9ga_collapsed .wtg9ga_newSession{position:fixed;top:calc((var(--dsh-windows-titlebar-height) - 28px) / 2);z-index:30;width:28px;height:28px}
          [data-windows-titlebar] .wtg9ga_toggle{left:12px}
          [data-windows-titlebar] .wtg9ga_collapsed .wtg9ga_newSession{left:48px}
        `});
        await page.evaluate(({nested}) => {
          document.documentElement.setAttribute('data-windows-titlebar','');
          document.documentElement.dataset.platform='win32';
          const frame=document.querySelector('.mP3x-q_frame');
          frame.setAttribute('data-sidebar-collapsed','true');
          frame.style.gridTemplateColumns='0px minmax(0, 1fr) 0px';
          if(nested){
            const host=document.createElement('div');host.className='fixture-host-wrapper';
            frame.before(host);host.append(frame);
            // Exercise layout independent of root adjacency or style text.
            // CSSOM supplies the same computed columns as native React style.
            frame.removeAttribute('style');
            const sheet=new CSSStyleSheet();sheet.replaceSync('.mP3x-q_frame[data-sidebar-collapsed]{grid-template-columns:0px minmax(0,1fr) 0px}.mP3x-q_frame:not([data-sidebar-collapsed]){grid-template-columns:260px minmax(0,1fr) 0px}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];
          }
          const sidebar=document.querySelector('.mP3x-q_sidebarCol');
          const content = sidebar.firstElementChild;
          sidebar.innerHTML = '<div class="wtg9ga_root wtg9ga_quietBars wtg9ga_collapsed" style="width:260px"><div class="wtg9ga_topStrip"><button class="wtg9ga_toggle" aria-label="打开侧边栏">☰</button></div><div class="wtg9ga_newSessionRow"><button class="wtg9ga_newSession" aria-label="新建会话">＋</button></div></div>';
          const sidebarRoot = sidebar.firstElementChild;
          if (nested) {
            const slot = document.createElement('div');
            slot.dataset.slot = 'sidebar';
            slot.style.display = 'contents';
            slot.append(sidebarRoot);
            sidebar.append(slot);
          }
          sidebarRoot.querySelector('button').onclick = () => {
            frame.removeAttribute('data-sidebar-collapsed');
            sidebarRoot.classList.remove('wtg9ga_collapsed');
            sidebarRoot.querySelector('.wtg9ga_newSessionRow').remove();
            sidebarRoot.append(content);
            if (!nested) frame.style.gridTemplateColumns = '260px minmax(0, 1fr) 0px';
          };
        }, {nested});
        // Wait beyond native collapse settle; animation's wide rail must not hide
        // the stable zero-width containing-block regression.
        await page.waitForTimeout(500);
        const data=await page.locator('.wtg9ga_toggle').evaluate(el=>{
          const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          const sidebar=el.closest('[class*=sidebarCol]');
          return {x:r.x,y:r.y,width:r.width,height:r.height,hit:hit?.className,reachable:el===hit||el.contains(hit),sidebarWidth:sidebar.getBoundingClientRect().width,sidebarFilter:getComputedStyle(sidebar).backdropFilter};
        });
        assert(data.reachable&&data.x>=0&&data.y>=0&&data.y+data.height<=40,'Fixed Windows caption opener is clipped or covered',data);
        const newSessionReachable=await page.locator('.wtg9ga_newSession').evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);});
        assert(newSessionReachable,'Fixed Windows new-session caption control is clipped or covered');
        await page.getByRole('button',{name:'打开侧边栏',exact:true}).click({timeout:2000});
        assert(!await page.locator('.mP3x-q_frame').evaluate(el=>el.hasAttribute('data-sidebar-collapsed')),'Caption opener cannot restore sidebar');
        const paint = await page.locator('.wtg9ga_root').evaluate(el => ({
          inner: getComputedStyle(el).backgroundColor,
          corner: getComputedStyle(el.closest('[class$="_sidebarCol"]')).borderTopLeftRadius,
        }));
        assert(paint.inner === 'rgba(0, 0, 0, 0)' && parseFloat(paint.corner) > 0, 'An opaque SidebarRoot still paints behind the rounded corner', paint);
        if (nested && quality === 'full') {
          await page.screenshot({ path: join(output, 'windows-sidebar-corner.png'), animations: 'disabled' });
        }
        return { ...data, paint };
      } finally {await context.close();}
    });
  }
  await run('collapsed right rail does not leave a glass stripe', async () => {
    const { page, context } = await fixture();
    try {
      await page.locator('.mP3x-q_frame').evaluate(el => {el.setAttribute('data-rightbar-collapsed','');el.style.gridTemplateColumns='260px minmax(0, 1fr) 0px';});
      const data = await page.locator('.mP3x-q_rightbarCol').evaluate(el => {const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,background:s.backgroundColor,border:s.borderLeftWidth,shadow:s.boxShadow,filter:s.backdropFilter};});
      assert(data.width === 0 && data.shadow === 'none' && data.filter === 'none','Collapsed rail retains glass decoration',data);
      return data;
    } finally {await context.close();}
  });
  await run('balanced quality retains glass with reduced blur', async () => {
    const { page, context } = await fixture({ quality:'balanced' });
    try {
      const items = await filters(page);
      const center = items.find(item => item.name === 'center');
      assert(center.backdrop.includes('blur'), 'Balanced pane loses glass', center);
      await page.screenshot({ path:join(output,'balanced.png'),animations:'disabled' });
      return items;
    } finally { await context.close(); }
  });
  await run('200% browser zoom equivalent: 640 CSS pixel viewport', async () => {
    // Browser zoom at 200% halves the CSS viewport of a 1280px-wide window.
    // Device scale factor supplies the corresponding 2x raster density.
    const { page, context } = await fixture({ width:640,height:430,media:{deviceScaleFactor:2} });
    try {
      const data = await page.evaluate(() => ({ width:innerWidth,scrollWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio }));
      assert(data.scrollWidth <= data.width + 1,'Zoom-equivalent layout overflows',data);
      await page.getByRole('button',{name:'打开侧边栏'}).click();
      await page.keyboard.press('Escape');
      await page.screenshot({path:join(output,'zoom-200-equivalent.png'),animations:'disabled'});
      return {...data,scope:'CSS viewport and raster equivalent; not browser toolbar zoom automation.'};
    } finally { await context.close(); }
  });
  await run('chat: hero glow, focused frosted composer and unfiltered transcript', async () => {
    const { page, context } = await fixture({ attributes: { 'data-glass-messages': 'on' } });
    try {
      await page.locator('.cV7t_root').evaluate(root => {
        root.innerHTML = `<div data-phase="hero" style="display:contents">
          <div data-conversation-content data-content-phase="hero" style="flex:1;display:grid;place-items:center;padding:24px">
            <div style="width:min(100%,680px)">
              <h1 class="WOwLGG_headline" style="text-align:center;font-size:26px;margin:0 0 24px">探索未至之境</h1>
              <div class="cP9s_composerSeat" data-composer-seat>
                <div class="cP9s_card" data-composer-card>
                  <div contenteditable="true" role="textbox" aria-label="消息" data-composer-input style="min-height:52px;outline:none">帮我整理本周的观察记录</div>
                  <div class="cP9s_row"><span class="cP9s_chip">工作区</span><span class="cP9s_trigger">模型</span><span class="cP9s_send">↑</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      });
      await page.locator('.oV3m_menu').evaluate(el => el.hidden = true);
      const card = page.locator('[data-composer-card]');
      const idle = await card.evaluate(el => getComputedStyle(el).borderColor);
      await page.getByRole('textbox', { name: '消息' }).click();
      await page.waitForFunction(color => getComputedStyle(document.querySelector('[data-composer-card]')).borderColor !== color, idle);
      const composer = await card.evaluate(el => ({
        fill: getComputedStyle(el).backgroundImage,
        filter: getComputedStyle(el).backdropFilter,
        hero: getComputedStyle(el.closest('[data-conversation-content]')).backgroundImage,
      }));
      assert(composer.filter.includes('blur') && composer.fill.includes('gradient') && composer.hero.includes('radial-gradient'), 'Chat materials missing', composer);
      await page.screenshot({ path: join(output, 'chat-hero.png'), animations: 'disabled' });
      await card.evaluate(el => {
        const chat = el.closest('[data-conversation-content]');
        chat.dataset.contentPhase = 'chat';
        chat.insertAdjacentHTML('afterbegin', `<div style="width:min(100%,540px);padding:16px">
          <p data-message-bubble style="padding:12px;border-radius:12px">把三条观察记录整理成摘要。</p>
          <div data-chat-flow-kind="assistant-step"><div data-slot="conversation.chat.node"><div class="fixture_root"><div class="fixture_body">这周的记录可以归纳为三个主题。</div></div></div></div>
        </div>`);
      });
      const bubble = page.locator('[data-message-bubble]');
      const response = page.locator('.fixture_root');
      for (const message of [bubble, response]) {
        const style = await message.evaluate(el => ({ image: getComputedStyle(el).backgroundImage, filter: getComputedStyle(el).backdropFilter }));
        assert(style.image.includes('gradient') && style.filter === 'none', 'Transcript material requires a filter-free fill', style);
      }
      await page.screenshot({ path: join(output, 'chat-messages.png'), animations: 'disabled' });
      await page.evaluate(() => delete document.documentElement.dataset.glassMessages);
      assert(await response.evaluate(el => getComputedStyle(el).backgroundImage) === 'none', 'Message appearance cannot be disabled');
      return composer;
    } finally { await context.close(); }
  });

  await run('settings navigation: focus and selected section in a narrow layout', async () => {
    const { page, context } = await fixture({ width: 460, height: 740 });
    try {
      await page.evaluate(() => {
        const dialog = document.createElement('div');
        dialog.dataset.shortcutModal = 'settings';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', '设置');
        dialog.style.cssText = 'position:fixed;inset:16px;z-index:120;display:flex;flex-direction:column';
        dialog.innerHTML = `<div class="AnXs9G_navTitle" style="padding:16px">设置</div>
          <nav class="AnXs9G_nav" style="overflow:auto"><div class="AnXs9G_navList" style="display:flex;gap:4px;width:max-content">
            <button class="AnXs9G_navCell" aria-current="true"><span class="AnXs9G_navIcon" aria-hidden="true">◎</span><span class="AnXs9G_navLabel">账号与余额</span></button>
            <button class="AnXs9G_navCell"><span class="AnXs9G_navIcon" aria-hidden="true">⚙</span><span class="AnXs9G_navLabel">通用设置</span></button>
            <button class="AnXs9G_navCell"><span class="AnXs9G_navIcon" aria-hidden="true">◇</span><span class="AnXs9G_navLabel">模型</span></button>
          </div></nav><div style="padding:16px" data-active-settings>账号与余额</div>`;
        dialog.querySelector('nav').onclick = event => {
          const button = event.target.closest('button');
          if (!button) return;
          dialog.querySelector('[aria-current]').removeAttribute('aria-current');
          button.setAttribute('aria-current', 'true');
          dialog.querySelector('[data-active-settings]').textContent = button.querySelector('[class$="_navLabel"]').textContent;
        };
        document.body.append(dialog);
      });
      const nav = page.getByRole('navigation');
      const target = nav.getByRole('button', { name: '通用设置' });
      await nav.getByRole('button', { name: '账号与余额' }).focus();
      await page.keyboard.press('Tab');
      assert(await target.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle !== 'none'), 'Settings nav keyboard focus is missing');
      await page.keyboard.press('Enter');
      assert(await target.getAttribute('aria-current') === 'true', 'Settings nav loses the active section');
      const detail = await target.evaluate(el => ({ fill: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow, docWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert(detail.shadow.includes('inset') && detail.docWidth <= detail.viewport, 'Settings nav loses the selection treatment or overflows', detail);
      await page.screenshot({ path: join(output, 'settings-navigation.png'), animations: 'disabled' });
      await page.setViewportSize({ width: 920, height: 740 });
      await nav.evaluate(el => {
        document.documentElement.dataset.windowsTitlebar = '';
        const dialog = el.closest('[data-shortcut-modal]');
        dialog.style.cssText += ';display:grid;grid-template-columns:188px minmax(0,1fr);grid-template-rows:54px minmax(0,1fr);grid-template-areas:"title main" "nav main";inset:40px 45px';
        dialog.firstElementChild.style.gridArea = 'title';
        dialog.lastElementChild.style.gridArea = 'main';
        el.style.cssText = 'grid-area:nav;box-sizing:border-box;min-width:0;padding:10px 12px 0';
        const rows = el.firstElementChild;
        rows.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        const long = rows.lastElementChild;
        long.lastElementChild.textContent = '这是一个较长的设置分类名称';
        long.lastElementChild.style.cssText = 'flex:1;min-width:0;overflow:hidden';
        for (const row of rows.children) row.style.cssText = 'display:flex;align-items:center;text-align:left';
      });
      const desktop = await nav.getByRole('button', { name: '这是一个较长的设置分类名称' }).evaluate(el => ({
        lines: el.lastElementChild.getBoundingClientRect().height / parseFloat(getComputedStyle(el.lastElementChild).lineHeight),
        fill: getComputedStyle(el.parentElement).backgroundImage,
        filter: getComputedStyle(el.parentElement).backdropFilter,
      }));
      assert(desktop.lines === 2 && desktop.fill.includes('gradient') && desktop.filter === 'none', 'Rail lost two-line labels or requires another blur', desktop);
      await page.screenshot({ path: join(output, 'settings-navigation-desktop.png'), animations: 'disabled' });
      await page.emulateMedia({ forcedColors: 'active' });
      assert(await nav.locator('[class$="_navList"]').evaluate(el => getComputedStyle(el).backgroundImage) === 'none', 'Forced colors retained navigation glow');
      return { ...detail, desktop };
    } finally { await context.close(); }
  });

  await run('right Dockkit pane: track sizing, resize hit target and floating host', async () => {
    const { page, context } = await fixture();
    try {
      await page.locator('.mP3x-q_rightbarCol').evaluate(track => {
        track.dataset.rightbarCol = '';
        const frame = track.parentElement;
        frame.style.gridTemplateColumns = '240px minmax(560px,1fr) minmax(0px,480px)';
        frame.insertAdjacentHTML('beforeend', '<div class="mP3x-q_handle" data-side="rightbar" style="position:absolute;grid-area:1 / 1 / 2 / -1;left:800px;top:0;bottom:0;width:8px;margin-left:-4px;cursor:col-resize"></div>');
        track.innerHTML = `<div data-sidebar-right-panel="push" data-sidebar-right-open style="position:absolute;inset:0 0 0 auto;width:480px;overflow:clip;pointer-events:none">
          <div data-dockkit-host="dock" data-dockkit-column="0" style="height:100%;pointer-events:auto">
            <section data-dockkit-content="reference" data-dockkit-pane="files" style="height:100%">
              <div><div data-dockkit-strip role="tablist" style="display:flex;align-items:center;gap:6px;padding:10px 10px 5px">
                <div data-dockkit-strip-tabs><button type="button" role="tab" aria-selected="true" data-dockkit-tab style="padding:5px 11px">观察记录.md</button></div>
                <button data-dockkit-add-tab aria-label="添加标签页">+</button>
              </div></div>
              <div class="acoR2W_tabBody" data-sidebar-right-tab="reference"><p data-sidebar-right-unavailable>没有可用的查看方式</p></div>
            </section>
          </div>
          <button data-dockkit-host="float" style="position:fixed;top:70px;right:540px;z-index:60;pointer-events:auto" aria-label="浮动窗检查">浮动窗</button>
        </div>`;
      });
      await page.locator('.oV3m_menu').evaluate(el => el.hidden = true);
      const style = await page.locator('[data-rightbar-col]').evaluate(track => {
        const pane = track.querySelector('[data-dockkit-pane]');
        const outline = getComputedStyle(pane);
        const carrier = getComputedStyle(track);
        const center = track.parentElement.querySelector('.mP3x-q_centerCol').getBoundingClientRect();
        const panel = track.querySelector('[data-sidebar-right-panel]').getBoundingClientRect();
        const handle = track.parentElement.querySelector('[data-side="rightbar"]');
        const grip = handle.getBoundingClientRect();
        return { track: carrier.backgroundColor, filter: carrier.backdropFilter, frameBorder: carrier.borderLeftWidth,
          pane: outline.backgroundImage, border: outline.borderLeftWidth, edge: outline.boxShadow,
          gutter: panel.left - center.right, dockWidth: panel.width, sizing: Math.abs(panel.left - track.getBoundingClientRect().left),
          grip: document.elementFromPoint(grip.left + grip.width / 2, grip.top + grip.height / 2) === handle,
          stripped: track.querySelector('[data-dockkit-strip]').getBoundingClientRect().width };
      });
      assert(style.track === 'rgba(0, 0, 0, 0)' && style.filter === 'none' && style.frameBorder === '0px', 'Right track adds a second material layer', style);
      assert(style.pane.includes('gradient') && style.edge.includes('inset') && style.border === '0px' && style.stripped > 280, 'Right pane material or strip is missing', style);
      assert(style.sizing <= 1 && style.gutter >= 6 && style.grip, 'Dock overlaps the conversation or covers the resize handle', style);
      await page.getByRole('button', { name: '浮动窗检查' }).click();
      await page.getByRole('button', { name: '添加标签页' }).click();
      await page.getByRole('button', { name: '浮动窗检查' }).evaluate(el => el.remove());
      await page.screenshot({ path: join(output, 'right-panel.png'), animations: 'disabled' });
      return style;
    } finally { await context.close(); }
  });

  for (const quality of ['full', 'static']) await run(`model picker (${quality}): fixed anchor and a single glass surface`, async () => {
    const { page, context } = await fixture({ width: 480, height: 700, quality });
    try {
      await page.addStyleTag({ content: `._9r0rkG_trigger{anchor-name:var(--dsh-model-anchor)}
        ._9r0rkG_menu{position:fixed;position-anchor:var(--dsh-model-anchor);inset:12px anchor(right) calc(anchor(top) + 8px) 12px;align-self:safe end;justify-self:safe end;z-index:90;display:grid;margin:0;box-sizing:border-box;isolation:isolate}
        ._material_1w4el_21{position:absolute;inset:0;z-index:-1;border-radius:inherit;background:var(--dsw-menu-surface-fill);backdrop-filter:var(--dsw-menu-backdrop-filter);pointer-events:none}
        ._9r0rkG_cell{display:flex;align-items:center;justify-content:space-between;color:inherit;background:transparent}
      ` });
      await page.locator('.cP9s_trigger').evaluate(previous => {
        const trigger = document.createElement('button');
        trigger.className = '_9r0rkG_trigger';
        trigger.style.setProperty('--dsh-model-anchor', '--fixture-model');
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<span class="_9r0rkG_triggerLabel">Orchid Flash</span><span class="_9r0rkG_triggerEffort">高</span>⌄';
        previous.replaceWith(trigger);
        const menu = document.createElement('div');
        menu.className = '_9r0rkG_menu';
        menu.style.setProperty('--dsh-model-anchor', '--fixture-model');
        menu.setAttribute('data-menu-material', '');
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', '模型选择');
        menu.setAttribute('aria-busy', 'false');
        menu.innerHTML = `<span class="_material_1w4el_21" aria-hidden="true"></span>
          <button class="_9r0rkG_cell" role="menuitem"><span class="_9r0rkG_cellLabel">模型</span><span class="_9r0rkG_cellValue">Orchid Flash ›</span></button>
          <button class="_9r0rkG_cell" role="menuitem"><span class="_9r0rkG_cellLabel">推理等级</span><span class="_9r0rkG_cellValue">高 ›</span></button>`;
        trigger.onclick = () => {
          trigger.setAttribute('aria-expanded', 'true');
          document.body.append(menu);
          menu.querySelector('button').focus();
        };
        menu.addEventListener('keydown', event => {
          if (event.key === 'Escape') {
            menu.remove();
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
          }
        });
      });
      const trigger = page.getByRole('button', { name: /Orchid Flash/ });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const menu = page.getByRole('menu', { name: '模型选择' });
      const state = await menu.evaluate(el => {
        const anchored = document.querySelector('button[aria-expanded="true"][style*="--dsh-model-anchor:"]').getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return { gap: anchored.top - rect.bottom, left: rect.left, right: rect.right, viewport: innerWidth,
          filter: getComputedStyle(el).backdropFilter, layer: getComputedStyle(el.firstElementChild).backdropFilter,
          focused: el.contains(document.activeElement), position: getComputedStyle(el).position };
      });
      assert(state.position === 'fixed' && Math.abs(state.gap - 8) <= 1 && state.left >= 0 && state.right <= state.viewport && state.focused, 'Popup is clipped or detached from trigger', state);
      assert(state.filter === 'none' && (quality === 'full' ? state.layer.includes('blur') : state.layer === 'none'), 'Popup material is duplicated or ignores static mode', state);
      await page.screenshot({ path: join(output, `model-picker-${quality}.png`), animations: 'disabled' });
      const pinned = await menu.evaluate(el => {
        const heading = document.createElement('div');
        heading.setAttribute('data-menu-group-heading', '');
        heading.setAttribute('data-stuck', '');
        heading.textContent = '模型提供方';
        el.append(heading);
        const light = getComputedStyle(heading).backgroundColor;
        document.body.setAttribute('data-ds-dark-theme', '');
        const dark = getComputedStyle(heading).backgroundColor;
        document.body.removeAttribute('data-ds-dark-theme');
        heading.remove();
        return { light, dark };
      });
      assert(Object.values(pinned).every(color => /^rgb\(/.test(color)) && pinned.light !== pinned.dark,
        'Pinned provider heading lets model rows bleed through or ignores the theme', pinned);
      await page.keyboard.press('Escape');
      assert(await trigger.evaluate(el => document.activeElement === el && el.getAttribute('aria-expanded') === 'false'), 'Picker fails to restore trigger focus');
      return { ...state, pinned };
    } finally { await context.close(); }
  });

  await run('fixture console and resource errors', async () => {
    assert(errors.length === 0, 'Browser errors occurred', [...new Set(errors)]);
  });
} finally {
  const report = {
    generatedAt:new Date().toISOString(),
    scope:'Offline AppFrame rendering and native-control fixtures, not a live DSH end-to-end test.',
    browser:browser ? { engine:'Chromium',channel:option('channel','msedge'),version:browser.version() } : { channel:option('channel','msedge'),launch:'failed' },
    passed:checks.filter(item => item.status === 'passed').length,
    failed:checks.filter(item => item.status === 'failed').length,
    skipped:checks.filter(item => item.status === 'skipped').length,
    checks,
    limitations:['No macOS/Safari, Firefox, or real mobile-device verification.','No physical refraction claim or measurement.','Unsupported-backdrop test explicitly simulates the CSS support branch.','Settings renders the built slot with the installed React runtime and offline host service adapters.'],
  };
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
  console.log(`${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped. Report: ${join(output,'report.json')}`);
  if (report.failed) process.exitCode=1;
}
