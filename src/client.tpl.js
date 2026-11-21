window.__ModuleLoader__.load({
  id: '@dsh-desktop/glass-ui',
  factory: (require) => {
    const PACKAGE = '@dsh-desktop/glass-ui';
    const STYLE_ID = 'dsh-glass-ui';
    const VERSION = __GLASS_VERSION__;

    /* build.mjs injects the merged styles. */
    const CSS = __GLASS_CSS__;

    const m = (light, dark) => ({ light, dark });

    /* 语义 token 层：light / dark 双语义都写，跟随系统与偏好切换。
     * 覆盖范围 = 背景 / 层 / 描边 / 文本 / 强调 / 状态 / 交互 / 弹层 / 代码块 /
     * 滚动条 / 圆角 / shadow / 模糊，所以第三方插件读 token 的地方也会一起玻璃化。 */
    const TOKENS = {
      /* 背景与层 */
      '--dsw-alias-bg-base': m('rgba(244, 248, 255, 0.4)', 'rgba(11, 14, 22, 0.5)'),
      '--dsw-alias-bg-layer-1': m('rgba(255, 255, 255, 0.56)', 'rgba(26, 31, 45, 0.66)'),
      '--dsw-alias-bg-layer-2': m('rgba(255, 255, 255, 0.52)', 'rgba(32, 38, 55, 0.6)'),
      '--dsw-alias-bg-layer-3': m('rgba(255, 255, 255, 0.52)', 'rgba(40, 47, 68, 0.56)'),
      '--dsw-alias-bg-overlay': m('rgba(255, 255, 255, 0.86)', 'rgba(26, 31, 46, 0.9)'),
      '--dsw-alias-bg-skeleton': m('rgba(255, 255, 255, 0.55)', 'rgba(40, 47, 68, 0.6)'),
      '--dsw-alias-bg-mask-1': m('rgba(18, 26, 48, 0.26)', 'rgba(4, 7, 14, 0.55)'),
      '--dsw-alias-bg-mask-2': m('rgba(18, 26, 48, 0.14)', 'rgba(4, 7, 14, 0.3)'),
      '--dsw-alias-bg-mask-3': m('rgba(18, 26, 48, 0.42)', 'rgba(4, 7, 14, 0.62)'),
      '--dsw-alias-bg-mask-drop': m('rgba(255, 255, 255, 0.62)', 'rgba(20, 24, 36, 0.72)'),
      '--dsw-alias-bg-mask-photo': m('rgba(10, 14, 26, 0.82)', 'rgba(0, 0, 0, 0.86)'),

      /* 描边 */
      '--dsw-alias-border-l1': m('rgba(22, 32, 60, 0.08)', 'rgba(255, 255, 255, 0.1)'),
      '--dsw-alias-border-l2': m('rgba(22, 32, 60, 0.12)', 'rgba(255, 255, 255, 0.14)'),
      '--dsw-alias-border-l3': m('rgba(22, 32, 60, 0.1)', 'rgba(255, 255, 255, 0.12)'),
      '--dsw-alias-border-l4': m('rgba(22, 32, 60, 0.18)', 'rgba(255, 255, 255, 0.2)'),
      '--dsw-alias-border-selected': m('#4c6fff', '#7f9dff'),
      '--dsw-alias-border-inverted': m('rgba(255, 255, 255, 0.4)', 'rgba(0, 0, 0, 0.4)'),

      /* 文本 */
      '--dsw-alias-label-primary': m('#12172a', '#eef2fb'),
      '--dsw-alias-label-secondary': m('#566074', '#a7b1c7'),
      '--dsw-alias-label-tertiary': m('#8a93a6', '#78829a'),
      '--dsw-alias-label-caption': m('#8a93a6', '#78829a'),
      '--dsw-alias-label-dimmed': m('#9aa3b4', '#6b7488'),
      '--dsw-alias-label-primary-foreground': m('#ffffff', '#0b0f1a'),
      '--dsw-alias-label-on-color': m('#ffffff', '#ffffff'),
      '--dsw-alias-label-primary-inverted': m('#ffffff', '#0b0f1a'),

      /* 品牌与链接 */
      '--dsw-alias-brand-primary': m('#4c6fff', '#7f9dff'),
      '--dsw-alias-brand-text': m('#3d5bea', '#9db4ff'),
      '--dsw-alias-link': m('#3d5bea', '#9db4ff'),
      '--dsw-alias-brand-primary-invert': m('#ffffff', '#0b0f1a'),

      /* 按钮 */
      '--dsw-alias-button-primary-fill': m('#4c6fff', '#5b7bff'),
      '--dsw-alias-button-primary-hover': m('#3d5bea', '#7f9dff'),
      '--dsw-alias-button-primary-dimmed': m('rgba(76, 111, 255, 0.35)', 'rgba(127, 157, 255, 0.35)'),
      '--dsw-alias-button-info-fill': m('#4c6fff', '#5b7bff'),
      '--dsw-alias-button-info-hover': m('#3d5bea', '#7f9dff'),
      '--dsw-alias-button-elevated-fill': m('rgba(255, 255, 255, 0.72)', 'rgba(255, 255, 255, 0.08)'),
      '--dsw-alias-button-floating-fill': m('rgba(255, 255, 255, 0.66)', 'rgba(255, 255, 255, 0.1)'),
      '--dsw-alias-button-floating-hover': m('rgba(255, 255, 255, 0.88)', 'rgba(255, 255, 255, 0.17)'),
      '--dsw-alias-button-tool-bar-fill': m('rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.06)'),
      '--dsw-alias-button-tool-bar-fill-invisible': m('rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0)'),
      '--dsw-alias-button-tool-bar-hover': m('rgba(255, 255, 255, 0.78)', 'rgba(255, 255, 255, 0.12)'),
      '--dsw-alias-button-contrast-fill': m('rgba(18, 23, 42, 0.9)', 'rgba(238, 242, 251, 0.92)'),
      '--dsw-alias-button-ghost-active-fill': m('rgba(76, 111, 255, 0.12)', 'rgba(127, 157, 255, 0.18)'),
      '--dsw-alias-button-ghost-active-hover': m('rgba(76, 111, 255, 0.18)', 'rgba(127, 157, 255, 0.26)'),
      '--dsw-alias-button-ghost-active-border': m('rgba(76, 111, 255, 0.3)', 'rgba(127, 157, 255, 0.34)'),

      /* 交互态 */
      '--dsw-alias-interactive-bg-hover': m('rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.08)'),
      '--dsw-alias-interactive-bg-active': m('rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.14)'),
      '--dsw-alias-interactive-bg-hover-solid': m('rgba(238, 242, 252, 0.92)', 'rgba(255, 255, 255, 0.07)'),
      '--dsw-alias-interactive-bg-hover-danger': m('rgba(224, 74, 79, 0.12)', 'rgba(255, 123, 127, 0.18)'),
      '--dsw-alias-interactive-bg-hover-accent': m('rgba(76, 111, 255, 0.12)', 'rgba(127, 157, 255, 0.18)'),

      /* 卡片 / 代码 / 气泡 */
      '--dsw-alias-card-fill': m('rgba(255, 255, 255, 0.58)', 'rgba(255, 255, 255, 0.06)'),
      '--dsw-alias-card-fill-hover': m('rgba(255, 255, 255, 0.78)', 'rgba(255, 255, 255, 0.1)'),
      '--dsw-alias-card-tile-fill': m('rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.05)'),
      '--dsw-alias-markdown-code-block': m('rgba(255, 255, 255, 0.6)', 'rgba(9, 12, 20, 0.62)'),
      '--dsw-alias-markdown-code-block-banner': m('rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0.06)'),
      '--dsw-alias-markdown-inline-code': m('rgba(22, 32, 60, 0.07)', 'rgba(255, 255, 255, 0.09)'),
      '--dsw-alias-markdown-placeholder': m('rgba(22, 32, 60, 0.12)', 'rgba(255, 255, 255, 0.14)'),
      '--dsw-specific-bubble': m('rgba(255, 255, 255, 0.62)', 'rgba(255, 255, 255, 0.07)'),
      '--dsw-specific-bubble-highlight': m('rgba(76, 111, 255, 0.14)', 'rgba(127, 157, 255, 0.2)'),
      '--dsw-alias-turn-trigger-bg': m('rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.06)'),
      '--dsw-alias-turn-trigger-bg-hover': m('rgba(255, 255, 255, 0.78)', 'rgba(255, 255, 255, 0.12)'),

      /* 侧栏 */
      '--dsw-specific-sidebar-fill': m('rgba(255, 255, 255, 0.24)', 'rgba(13, 16, 26, 0.38)'),
      '--dsw-specific-sidebar-tint': m('rgba(255, 255, 255, 0.28)', 'rgba(14, 17, 28, 0.3)'),
      '--dsw-specific-sidebar-glass-fill': m('rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.07)'),
      '--dsw-specific-sidebar-glass-hover': m('rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0.14)'),
      '--dsw-specific-sidebar-glass-collapsed-fill': m('rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.06)'),
      '--dsw-specific-sidebar-glass-collapsed-hover': m('rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.12)'),
      '--dsw-specific-sidebar-nav-item-active': m('rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0.12)'),
      '--dsw-specific-sidebar-nav-item-active-accent': m('#4c6fff', '#7f9dff'),
      '--dsw-specific-sidebar-wash-top': m('rgba(76, 111, 255, 0.14)', 'rgba(76, 111, 255, 0.2)'),
      '--dsw-specific-sidebar-wash-top-clear': m('rgba(76, 111, 255, 0)', 'rgba(76, 111, 255, 0)'),
      '--dsw-specific-sidebar-wash-bottom': m('rgba(120, 140, 200, 0.16)', 'rgba(120, 140, 220, 0.18)'),
      '--dsw-specific-sidebar-wash-bottom-clear': m('rgba(120, 140, 200, 0)', 'rgba(120, 140, 220, 0)'),

      /* 输入与选择器 */
      '--dsw-specific-input-major': m('rgba(255, 255, 255, 0.62)', 'rgba(31, 37, 54, 0.7)'),
      '--dsw-specific-selector': m('rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.08)'),
      '--dsw-specific-menu': m('rgba(255, 255, 255, 0.8)', 'rgba(28, 33, 49, 0.82)'),
      '--dsw-specific-tip': m('rgba(255, 255, 255, 0.64)', 'rgba(255, 255, 255, 0.07)'),
      '--dsw-alias-menu-icon': m('#4e5a72', '#c2cbdd'),
      '--dsw-alias-menu-group-header-fill': m('rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.05)'),

      /* 弹层与提示 */
      '--dsw-alias-tooltip-bg': m('rgba(16, 21, 36, 0.9)', 'rgba(8, 11, 20, 0.94)'),
      '--dsw-alias-tooltip-label': m('#f7f9ff', '#eef2fb'),
      '--dsw-alias-tooltip-key-bg': m('rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.14)'),
      '--dsw-alias-toast-bg': m('rgba(20, 26, 44, 0.9)', 'rgba(8, 11, 20, 0.94)'),
      '--dsw-alias-toast-label': m('#f7f9ff', '#eef2fb'),
      '--dsw-alias-toast-action': m('#a9beff', '#9db4ff'),
      '--dsw-alias-hovercard-bg': m('rgba(255, 255, 255, 0.92)', 'rgba(24, 29, 44, 0.95)'),
      '--dsw-alias-hovercard-label-primary': m('#12172a', '#eef2fb'),
      '--dsw-alias-hovercard-label-secondary': m('#566074', '#a7b1c7'),
      '--dsw-alias-hovercard-label-tertiary': m('#8a93a6', '#78829a'),

      /* 滚动条 */
      '--dsw-alias-scrollbar-bg-l1': m('rgba(22, 32, 60, 0.16)', 'rgba(255, 255, 255, 0.16)'),
      '--dsw-alias-scrollbar-hover-l1': m('rgba(22, 32, 60, 0.3)', 'rgba(255, 255, 255, 0.3)'),
      '--dsw-alias-scrollbar-bg-l2': m('rgba(22, 32, 60, 0.2)', 'rgba(255, 255, 255, 0.2)'),
      '--dsw-alias-scrollbar-hover-l2': m('rgba(22, 32, 60, 0.34)', 'rgba(255, 255, 255, 0.34)'),

      /* 状态色 */
      '--dsw-alias-state-success-primary': m('#12996a', '#35c98a'),
      '--dsw-alias-state-success-secondary': m('rgba(18, 153, 106, 0.16)', 'rgba(53, 201, 138, 0.2)'),
      '--dsw-alias-state-error-primary': m('#e04a4f', '#ff7b7f'),
      '--dsw-alias-state-error-secondary': m('rgba(224, 74, 79, 0.14)', 'rgba(255, 123, 127, 0.2)'),
      '--dsw-alias-state-warn-primary': m('#d7820f', '#f0b24a'),
      '--dsw-alias-state-warn-label': m('#a15f06', '#f5c877'),
      '--dsw-alias-state-warn-secondary': m('rgba(215, 130, 15, 0.14)', 'rgba(240, 178, 74, 0.2)'),
      '--dsw-alias-state-idle-primary': m('#8a93a6', '#78829a'),
      '--dsw-alias-state-done-primary': m('#3f7dff', '#7f9dff'),
      '--dsw-alias-state-business-primary': m('#6b5bd6', '#a58cff'),
      '--dsw-alias-code-diff-added': m('#12996a', '#35c98a'),
      '--dsw-alias-code-diff-deleted': m('#e04a4f', '#ff7b7f'),
      '--dsw-alias-file-diff-added-bg': m('rgba(18, 153, 106, 0.1)', 'rgba(53, 201, 138, 0.12)'),
      '--dsw-alias-file-diff-deleted-bg': m('rgba(224, 74, 79, 0.08)', 'rgba(255, 123, 127, 0.12)'),

      /* 几何：更大的圆角 + 玻璃阴影 + 磨砂强度 */
      '--dsw-radius-xs': m('6px', '6px'),
      '--dsw-radius-sm': m('10px', '10px'),
      '--dsw-radius-md': m('14px', '14px'),
      '--dsw-radius-lg': m('18px', '18px'),
      '--dsw-radius-xl': m('22px', '22px'),
      '--dsw-radius-panel': m('26px', '26px'),
      '--dsw-mask-blur': m('blur(18px) saturate(160%)', 'blur(18px) saturate(160%)'),
      '--dsw-elevation-soft': m(
        '0 18px 40px -26px rgba(21, 33, 64, 0.5), 0 2px 8px -4px rgba(21, 33, 64, 0.18)',
        '0 20px 44px -28px rgba(0, 0, 0, 0.8), 0 2px 8px -4px rgba(0, 0, 0, 0.5)',
      ),
      '--dsw-elevation-panel': m(
        '0 28px 64px -34px rgba(21, 33, 64, 0.55)',
        '0 30px 70px -36px rgba(0, 0, 0, 0.85)',
      ),
      '--dsw-elevation-prominent': m(
        '0 34px 80px -40px rgba(21, 33, 64, 0.6)',
        '0 38px 90px -42px rgba(0, 0, 0, 0.9)',
      ),
      '--dsw-shadow-lv1': m('0 8px 24px -16px rgba(21, 33, 64, 0.4)', '0 8px 24px -16px rgba(0, 0, 0, 0.7)'),
      '--dsw-shadow-lv2': m('0 14px 36px -20px rgba(21, 33, 64, 0.45)', '0 14px 36px -20px rgba(0, 0, 0, 0.75)'),
      '--dsw-shadow-lv3': m('0 20px 48px -24px rgba(21, 33, 64, 0.5)', '0 20px 48px -24px rgba(0, 0, 0, 0.8)'),
    };

    const React = require('react');
    const h = React.createElement;
    const NS = 'settings.glass-ui';
    const QUALITIES = ['full', 'balanced', 'static'];
    const TONES = ['aurora', 'cool', 'neutral'];
    const DEFAULTS = Object.freeze({
      quality: 'full', intensity: 60, tone: 'aurora', messages: true,
      transparency: 'auto', motion: false, texture: false,
    });
    const KEYS = Object.fromEntries(Object.keys(DEFAULTS).map(name => [name, 'dsh.glass-ui.' + name]));
    const DICTIONARIES = {
      zh: {
        title: 'Glass UI 玻璃外观', description: '调节磨砂、底景和消息外观，改动实时生效。',
        quality: '渲染质量', full: '完整玻璃', balanced: '均衡', static: '静态',
        intensity: '玻璃强度', intensityHelp: '调节磨砂模糊和光晕。',
        tone: '背景色调', aurora: '极光', cool: '清蓝', neutral: '中性',
        messages: '消息玻璃', messagesHelp: '为用户气泡和助手回复添加半透明底色。',
        transparency: '减少透明度', motion: '极光背景动效', texture: '细腻纹理',
        effective: '当前材质为{quality}。', system: '系统辅助功能偏好已生效。',
        reset: '恢复默认', saved: '偏好会自动保存。', unavailable: '偏好只在当前窗口生效。',
      },
      en: {
        title: 'Glass UI', description: 'Adjust how the glass, background, and messages look as you make changes.',
        quality: 'Rendering quality', full: 'Full glass', balanced: 'Balanced', static: 'Static',
        intensity: 'Glass intensity', intensityHelp: 'Adjust the blur and glow of glass surfaces.',
        tone: 'Background tone', aurora: 'Aurora', cool: 'Cool blue', neutral: 'Neutral',
        messages: 'Glass messages', messagesHelp: 'Add translucent surfaces to user bubbles and assistant replies.',
        transparency: 'Reduce transparency', motion: 'Aurora motion', texture: 'Fine texture',
        effective: 'Active material: {quality}.', system: 'System accessibility preferences are active.',
        reset: 'Restore defaults', saved: 'Preferences save automatically.', unavailable: 'Preferences apply to this window only.',
      },
    };

    function isPreference(name, value) {
      switch (name) {
        case 'quality': return QUALITIES.includes(value);
        case 'tone': return TONES.includes(value);
        case 'intensity': return Number.isInteger(value) && value >= 0 && value <= 100;
        case 'transparency': return value === 'auto' || value === 'reduced';
        default: return typeof DEFAULTS[name] === 'boolean' && typeof value === 'boolean';
      }
    }

    function readPreference(name) {
      let raw;
      try { raw = window.localStorage.getItem(KEYS[name]); } catch { return undefined; }
      if (raw === null || raw.trim() === '') return undefined;
      let value = raw;
      if (typeof DEFAULTS[name] === 'number') value = Number(raw);
      if (typeof DEFAULTS[name] === 'boolean') value = raw === 'true' ? true : raw === 'false' ? false : undefined;
      return isPreference(name, value) ? value : undefined;
    }

    function readPreferences() {
      return Object.fromEntries(Object.keys(DEFAULTS).map(name => [name, readPreference(name) ?? DEFAULTS[name]]));
    }

    function createController(ctx) {
      const root = document.documentElement;
      const listeners = new Set();
      let requested = readPreferences();
      let snapshot;
      let auto = false;
      let manualQuality = readPreference('quality') !== undefined;
      let storageAvailable = true;
      try { window.localStorage.getItem(KEYS.quality); } catch { storageAvailable = false; }
      let disposed = false;
      let releaseTokens;
      let tokenMode;
      const media = {};
      const queries = {
        motion: '(prefers-reduced-motion: reduce)',
        transparency: '(prefers-reduced-transparency: reduce)',
        contrast: '(prefers-contrast: more)',
        forced: '(forced-colors: active)',
      };
      for (const [name, query] of Object.entries(queries)) {
        try { media[name] = window.matchMedia(query); } catch { media[name] = { matches: false }; }
      }
      const attr = (name, value) => {
        if (value === undefined) root.removeAttribute(name);
        else root.setAttribute(name, value);
      };
      const refresh = () => {
        if (disposed) return;
        const reduced = requested.transparency === 'reduced' || media.transparency.matches || media.contrast.matches || media.forced.matches;
        const quality = reduced ? 'static' : auto && requested.quality === 'full' ? 'balanced' : requested.quality;
        const motion = requested.motion && quality === 'full' && !media.motion.matches && !reduced;
        const texture = requested.texture && quality === 'full' && !reduced;
        const messages = requested.messages && quality !== 'static';
        const tone = quality === 'static' ? null : requested.tone;
        const intensity = quality === 'static' ? 0 : requested.intensity;
        root.style.setProperty('--gx-strength', String(intensity / 100));
        attr('data-glass-tone', tone ?? undefined);
        attr('data-glass-messages', messages ? 'on' : undefined);
        attr('data-glass-quality', quality);
        attr('data-glass-auto', auto && requested.quality === 'full' && !reduced ? 'balanced' : undefined);
        attr('data-glass-transparency', reduced ? 'reduced' : undefined);
        attr('data-glass-contrast', media.contrast.matches ? 'more' : undefined);
        attr('data-glass-forced-colors', media.forced.matches ? 'on' : undefined);
        attr('data-glass-reduced-motion', media.motion.matches ? 'true' : undefined);
        attr('data-glass-motion', motion ? 'on' : undefined);
        attr('data-glass-texture', texture ? 'on' : undefined);
        const nextTokenMode = media.forced.matches ? 'forced' : reduced || quality === 'static' ? 'opaque' : 'glass';
        if (nextTokenMode !== tokenMode) {
          const tokens = {};
          for (const [name, modes] of Object.entries(TOKENS)) {
            tokens[name] = { ...modes };
            if ((reduced || quality === 'static') && /bg-|fill|bubble|selector|menu|tip|code-block/.test(name) && !/invisible|clear/.test(name)) {
              const opaque = value => value.replace(/rgba\(([^)]+),\s*([\d.]+)\)/g, (original, channels, alpha) => Number(alpha) === 0 ? original : 'rgb(' + channels.trim() + ')');
              tokens[name] = { light: opaque(modes.light), dark: opaque(modes.dark) };
            }
            if ((reduced || quality === 'static') && name === '--dsw-mask-blur') tokens[name] = m('none', 'none');
            if (media.forced.matches) {
              if (/label-on-color|label-primary-foreground|brand-primary-invert/.test(name)) tokens[name] = m('HighlightText', 'HighlightText');
              else if (/label|link|menu-icon/.test(name)) tokens[name] = m('CanvasText', 'CanvasText');
              else if (/border/.test(name)) tokens[name] = m('ButtonText', 'ButtonText');
              else if (/brand|button-primary|button-info/.test(name)) tokens[name] = m('Highlight', 'Highlight');
              else if (/bg-|fill|bubble|selector|menu|tip|code-block/.test(name)) tokens[name] = m('Canvas', 'Canvas');
            }
          }
          const previousRelease = releaseTokens;
          releaseTokens = ctx.theme.overrideTokens(PACKAGE, tokens);
          previousRelease?.();
          tokenMode = nextTokenMode;
        }
        snapshot = Object.freeze({
          version: VERSION,
          quality, auto: auto && !manualQuality && quality === 'balanced' ? 'balanced' : 'none',
          cores: (window.navigator || {}).hardwareConcurrency || 0,
          motion, texture, transparency: reduced ? 'reduced' : 'auto',
          storageAvailable,
          requested: Object.freeze({ ...requested }),
          effective: Object.freeze({ quality, intensity, tone, messages, motion, texture, transparency: reduced ? 'reduced' : 'auto' }),
          system: Object.freeze({ motion: media.motion.matches, transparency: media.transparency.matches, contrast: media.contrast.matches, forcedColors: media.forced.matches }),
        });
        for (const listener of listeners) listener();
      };
      const update = (name, value) => {
        if (!isPreference(name, value)) throw new TypeError('Invalid Glass UI preference: ' + name);
        if (disposed) return snapshot.requested[name];
        requested = { ...requested, [name]: value };
        if (name === 'quality') { auto = false; manualQuality = true; }
        try {
          window.localStorage.setItem(KEYS[name], String(value));
        } catch {
          storageAvailable = false;
        }
        refresh();
        return value;
      };
      const api = {
        version: VERSION,
        quality: next => next === undefined ? snapshot.quality : update('quality', next),
        intensity: next => next === undefined ? snapshot.requested.intensity : update('intensity', next),
        tone: next => next === undefined ? snapshot.requested.tone : update('tone', next),
        messages: next => next === undefined ? snapshot.requested.messages : update('messages', next),
        transparency: next => next === undefined ? snapshot.requested.transparency : update('transparency', next),
        motion: (on = true) => update('motion', on),
        texture: (on = true) => update('texture', on),
        info: () => snapshot,
        reset: () => {
          if (disposed) return snapshot;
          try {
            for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
          } catch {
            storageAvailable = false;
          }
          requested = { ...DEFAULTS };
          auto = false;
          manualQuality = true;
          refresh();
          return snapshot;
        },
      };
      refresh();
      ctx.effect(() => {
        const onStorage = event => {
          if (event.key !== null && !Object.values(KEYS).includes(event.key)) return;
          requested = readPreferences();
          if (event.key === KEYS.quality || event.key === null) {
            auto = false;
            manualQuality = true;
          }
          refresh();
        };
        window.addEventListener('storage', onStorage);
        const removers = [];
        for (const query of Object.values(media)) {
          if (query.addEventListener) {
            query.addEventListener('change', refresh);
            removers.push(() => query.removeEventListener('change', refresh));
          } else if (query.addListener) {
            query.addListener(refresh);
            removers.push(() => query.removeListener(refresh));
          }
        }
        return () => {
          window.removeEventListener('storage', onStorage);
          for (const remove of removers) remove();
          disposed = true;
          listeners.clear();
          releaseTokens?.();
        };
      }, 'glass-ui: preference subscriptions');
      return {
        api,
        getSnapshot: () => snapshot,
        subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
        degrade: () => {
          if (!manualQuality && requested.quality === 'full') { auto = true; refresh(); }
        },
      };
    }

    // Follow the host's selection state. The track paints one decorative pill,
    // so real buttons and their keyboard behavior stay under the host's control.
    const PILL_TRACKS = [
      {
        track: "[data-shortcut-modal='settings'] > nav > [class$='_navList']",
        selected: ":scope > button[class*='_navCell'][aria-current='true']",
        vertical: true,
      },
      {
        track: ":is([data-conversation-tabs], [role='tablist'][style*='--dsh-segment-count:'], [role='tablist'][data-size]:has(> [aria-hidden='true'][style*='--segmented-tabs-inset']))",
        selected: ":scope > button[role='tab'][aria-selected='true']",
      },
      {
        track: '.gx-settings-options',
        selected: ':scope > .gx-settings-option:has(> input:checked)',
      },
      {
        track: "[data-shortcut-modal='settings'] [class$='_cubeRow']:has(> button[class*='_themeCube'][aria-pressed])",
        selected: ":scope > button[aria-pressed='true']",
      },
    ];
    const PILL_SELECTOR = PILL_TRACKS.map(({ track }) => track).join(',');
    const PILL_FIELDS = ['x', 'y', 'width', 'height'];
    const backdropSupported = () => window.CSS?.supports('backdrop-filter: blur(2px)')
      || window.CSS?.supports('-webkit-backdrop-filter: blur(2px)');
    const point = position => ({ position, velocity: 0 });

    function advanceSpring(point, goal, stiffness, damping, step) {
      point.velocity += ((goal - point.position) * stiffness - point.velocity * damping) * step;
      point.position += point.velocity * step;
    }

    function paintPill(entry, start, size) {
      const { track, target } = entry;
      const { vertical, cross, thickness, limit } = target;
      size = Math.min(size, limit);
      start = Math.max(0, Math.min(start, limit - size));
      const values = vertical ? [cross, start, thickness, size] : [start, cross, size, thickness];
      for (const [i, field] of PILL_FIELDS.entries()) {
        const next = values[i].toFixed(2) + 'px';
        if (entry.painted?.[i] !== next) track.style.setProperty('--gx-pill-' + field, next);
        values[i] = next;
      }
      entry.painted = values;
      if (!track.hasAttribute('data-glass-pill')) track.setAttribute('data-glass-pill', '');
    }

    function clearPill(entry) {
      if (entry.painted) {
        entry.track.removeAttribute('data-glass-pill');
        for (const field of PILL_FIELDS) entry.track.style.removeProperty('--gx-pill-' + field);
      }
      entry.item = entry.painted = entry.target = entry.spring = null;
    }

    function measurePill(entry, animate) {
      const { track, definition } = entry;
      const item = track.querySelector(definition.selected);
      if (item?.offsetParent !== track || !item.offsetWidth || !item.offsetHeight) {
        clearPill(entry);
        return;
      }
      // Use the track's layout coordinates even while an ancestor opens with a scale transform.
      const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = item;
      const vertical = !!definition.vertical && window.getComputedStyle(track).flexDirection === 'column';
      const target = vertical
        ? { vertical, start: y, size: height, cross: x, thickness: width, limit: track.scrollHeight }
        : { vertical, start: x, size: width, cross: y, thickness: height, limit: track.scrollWidth };
      const previous = entry.target;
      const sameItem = item === entry.item;
      const sameLine = previous && previous.vertical === target.vertical && Math.abs(previous.cross - target.cross) < 1;
      const sameBox = sameLine && Math.abs(previous.start - target.start) < .1
        && Math.abs(previous.size - target.size) < .1 && Math.abs(previous.thickness - target.thickness) < .1;
      entry.item = item;
      entry.target = target;
      if (animate && sameItem && sameBox) return;
      if (!animate || !sameLine || sameItem || sameBox) {
        entry.spring = null;
        paintPill(entry, target.start, target.size);
        return;
      }
      entry.spring ??= {
        start: point(previous.start), end: point(previous.start + previous.size), size: point(previous.size), lastTime: 0,
      };
      const { start, end } = entry.spring;
      entry.spring.forward = target.start + target.size / 2 >= (start.position + end.position) / 2;
    }

    function animatePill(entry, time) {
      const { start, end, size, forward, lastTime } = entry.spring;
      const target = entry.target;
      let remaining = Math.max(0, Math.min(lastTime ? (time - lastTime) / 1000 : 1 / 60, .05));
      entry.spring.lastTime = time;
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 120);
        remaining -= step;
        advanceSpring(size, target.size, 240, 27, step);
        const stretch = Math.min(Math.abs(start.velocity + end.velocity) * .0025, target.size * .12);
        const low = target.start - (forward ? 0 : stretch);
        const high = target.start + target.size + (forward ? stretch : 0);
        // The leading edge responds first. Keep its stretch within the size of
        // the current capsule as it interpolates between unequal controls.
        advanceSpring(start, low, forward ? 190 : 295, forward ? 22 : 26, step);
        advanceSpring(end, high, forward ? 295 : 190, forward ? 26 : 22, step);
        const max = size.position * 1.12;
        if (end.position - start.position > max) {
          if (forward) { start.position = end.position - max; start.velocity = Math.max(start.velocity, end.velocity); }
          else { end.position = start.position + max; end.velocity = Math.min(end.velocity, start.velocity); }
        }
        const min = size.position * .88;
        if (end.position - start.position < min) {
          const middle = (start.position + end.position) / 2;
          start.position = middle - min / 2;
          end.position = middle + min / 2;
        }
      }
      const distance = Math.abs(start.position - target.start) + Math.abs(end.position - target.start - target.size);
      const speed = Math.abs(start.velocity) + Math.abs(end.velocity) + Math.abs(size.velocity);
      if (distance < .25 && speed < 3) {
        entry.spring = null;
        paintPill(entry, target.start, target.size);
      } else paintPill(entry, start.position, end.position - start.position);
    }

    function installSelectionPills(ctx, controller) {
      ctx.effect(() => {
        if (!window.ResizeObserver || !window.MutationObserver || !backdropSupported()) return;
        const entries = new Map();
        const pending = new Set();
        let { quality, system: { motion: reducedMotion } } = controller.getSnapshot();
        let raf = 0;

        function queue() {
          if (!raf) raf = window.requestAnimationFrame(update);
        }
        function update(time) {
          raf = 0;
          const animate = !reducedMotion && document.visibilityState === 'visible';
          for (const entry of pending) {
            if (quality === 'static') clearPill(entry);
            else measurePill(entry, animate);
          }
          pending.clear();
          for (const entry of entries.values()) {
            if (entry.spring) animatePill(entry, time);
            if (entry.spring) queue();
          }
        }
        function invalidate(entry) {
          if (entry) { pending.add(entry); queue(); }
        }
        const resize = new window.ResizeObserver(records => {
          for (const { target } of records) invalidate(entries.get(target));
        });
        function add(track) {
          if (entries.has(track)) return;
          const definition = PILL_TRACKS.find(({ track: selector }) => track.matches(selector));
          const entry = { track, definition };
          entries.set(track, entry);
          resize.observe(track);
          invalidate(entry);
        }
        function discover(node) {
          if (node.matches(PILL_SELECTOR)) add(node);
          for (const track of node.querySelectorAll(PILL_SELECTOR)) add(track);
        }
        const mutations = new window.MutationObserver(records => {
          let removed = false;
          for (const record of records) {
            const { target, type } = record;
            if (target.nodeType !== 1) continue;
            if (type === 'childList') {
              removed ||= record.removedNodes.length > 0;
              for (const node of record.addedNodes) if (node.nodeType === 1) discover(node);
            }
            const track = target.closest(PILL_SELECTOR);
            if (!track) continue;
            if (entries.has(track)) invalidate(entries.get(track));
            else add(track);
          }
          if (removed) for (const [track, entry] of entries) {
            if (track.isConnected && track.matches(entry.definition.track)) continue;
            resize.unobserve(track);
            clearPill(entry);
            entries.delete(track);
            pending.delete(entry);
          }
        });
        const onChoice = event => invalidate(entries.get(event.target.closest?.(PILL_SELECTOR)));
        const refresh = () => {
          for (const entry of entries.values()) invalidate(entry);
        };
        const unsubscribe = controller.subscribe(() => {
          const next = controller.getSnapshot();
          if (next.quality === quality && next.system.motion === reducedMotion) return;
          quality = next.quality;
          reducedMotion = next.system.motion;
          refresh();
        });
        mutations.observe(document.body, {
          subtree: true, childList: true, attributes: true,
          attributeFilter: ['aria-current', 'aria-selected', 'aria-pressed', 'checked'],
        });
        document.addEventListener('change', onChoice, true);
        document.addEventListener('visibilitychange', refresh);
        document.fonts?.addEventListener('loadingdone', refresh);
        discover(document.body);
        return () => {
          mutations.disconnect();
          resize.disconnect();
          unsubscribe();
          document.removeEventListener('change', onChoice, true);
          document.removeEventListener('visibilitychange', refresh);
          document.fonts?.removeEventListener('loadingdone', refresh);
          window.cancelAnimationFrame(raf);
          for (const entry of entries.values()) clearPill(entry);
        };
      }, 'glass-ui: shared selection pills');
    }

    const GUIDE_CARD = "[data-sidebar-right-guide] :is([data-sidebar-right-guide-entry], button[class$='_entry'][aria-haspopup='menu']):not(:disabled)";
    function installGuideLight(ctx, controller) {
      ctx.effect(() => {
        if (!document.addEventListener || !backdropSupported()) return;
        let current;
        let pending;
        let raf = 0;
        const clear = () => {
          window.cancelAnimationFrame(raf);
          raf = 0;
          pending = null;
          current?.removeAttribute('data-glass-guide-lit');
          current?.style.removeProperty('--gx-guide-x');
          current?.style.removeProperty('--gx-guide-y');
          current = null;
        };
        const move = event => {
          if (event.pointerType !== 'mouse' || !controller.getSnapshot().motion) return;
          const card = event.target.closest?.(GUIDE_CARD);
          if (!card) return;
          if (current && current !== card) clear();
          current = card;
          pending = { x: event.clientX, y: event.clientY };
          if (raf) return;
          raf = window.requestAnimationFrame(() => {
            raf = 0;
            if (!current?.isConnected || !pending) { clear(); return; }
            const bounds = current.getBoundingClientRect();
            current.style.setProperty('--gx-guide-x', (pending.x - bounds.left) + 'px');
            current.style.setProperty('--gx-guide-y', (pending.y - bounds.top) + 'px');
            current.setAttribute('data-glass-guide-lit', '');
          });
        };
        const leave = event => {
          if (current?.contains(event.target) && !current.contains(event.relatedTarget)) clear();
        };
        const unsubscribe = controller.subscribe(() => { if (!controller.getSnapshot().motion) clear(); });
        document.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerout', leave);
        document.addEventListener('pointercancel', clear);
        document.addEventListener('visibilitychange', clear);
        window.addEventListener('blur', clear);
        return () => {
          unsubscribe();
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerout', leave);
          document.removeEventListener('pointercancel', clear);
          document.removeEventListener('visibilitychange', clear);
          window.removeEventListener('blur', clear);
          clear();
        };
      }, 'glass-ui: start panel guide light');
    }

    function installWatchdog(ctx, controller) {
      ctx.effect(() => {
        let raf = 0;
        let last;
        let elapsed = 0;
        let frames = 0;
        let done = false;
        const tick = now => {
          if (done) return;
          if (document.visibilityState !== 'hidden' && Number.isFinite(now)) {
            if (last !== undefined) { elapsed += Math.min(now - last, 250); frames++; }
            last = now;
            if (elapsed >= 2500) {
              done = true;
              if (frames && elapsed / frames > 22) controller.degrade();
              return;
            }
          } else last = undefined;
          raf = window.requestAnimationFrame(tick);
        };
        if (Number(window.navigator?.hardwareConcurrency || 8) <= 4) controller.degrade();
        raf = window.requestAnimationFrame(tick);
        return () => { done = true; window.cancelAnimationFrame(raf); };
      }, 'glass-ui: visible frame watchdog');
    }

    function GlassSettings({ t, controller }) {
      const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
      const id = React.useId();
      const { requested } = state;
      const { api } = controller;
      const choices = (name, values) => h('fieldset', { className: 'gx-settings-fieldset' },
        h('legend', null, t(name)),
        h('div', { className: 'gx-settings-options' }, values.map(value =>
          h('label', { className: 'gx-settings-option', key: value },
            h('input', {
              type: 'radio', name: id + '-' + name, value, checked: requested[name] === value,
              'data-glass-tone-choice': name === 'tone' ? value : undefined,
              onChange: () => api[name](value),
            }),
            h('span', null, t(value))))));
      const toggle = (name, checked, change, help) => h('label', { className: 'gx-settings-toggle' },
        h('span', { className: 'gx-settings-toggle-label' },
          h('span', null, t(name)),
          help && h('span', { className: 'gx-settings-description' }, t(help))),
        h('input', { type: 'checkbox', checked, onChange: event => change(event.target.checked) }));
      const hasSystemOverride = state.system.transparency || state.system.contrast || state.system.forcedColors
        || (state.system.motion && requested.motion);
      return h('section', { 'data-glass-settings': '', className: 'gx-settings', 'aria-labelledby': id },
        h('header', { className: 'gx-settings-header' },
          h('h2', { id, className: 'gx-settings-title' }, t('title')),
          h('p', { className: 'gx-settings-description' }, t('description'))),
        choices('quality', QUALITIES),
        h('div', { className: 'gx-settings-status', role: 'status' }, t('effective', { quality: t(state.quality) }),
          hasSystemOverride ? ' ' + t('system') : ''),
        h('div', { className: 'gx-settings-range' },
          h('label', { htmlFor: id + '-intensity' }, t('intensity')),
          h('span', { className: 'gx-settings-value', 'aria-hidden': true }, requested.intensity + '%'),
          h('input', {
            id: id + '-intensity', type: 'range', min: 0, max: 100, step: 1, value: requested.intensity,
            'data-glass-intensity': '', 'aria-valuetext': requested.intensity + '%',
            'aria-describedby': id + '-intensity-help', onChange: event => api.intensity(event.target.valueAsNumber),
          }),
          h('p', { id: id + '-intensity-help', className: 'gx-settings-description' }, t('intensityHelp'))),
        choices('tone', TONES),
        h('div', { className: 'gx-settings-toggles' },
          toggle('messages', requested.messages, api.messages, 'messagesHelp'),
          toggle('transparency', requested.transparency === 'reduced', checked => api.transparency(checked ? 'reduced' : 'auto')),
          toggle('motion', requested.motion, api.motion),
          toggle('texture', requested.texture, api.texture)),
        h('footer', { className: 'gx-settings-footer' },
          h('p', { className: 'gx-settings-description' }, t(state.storageAvailable ? 'saved' : 'unavailable')),
          h('button', { type: 'button', className: 'gx-settings-reset', onClick: api.reset }, t('reset'))));
    }

    function apply(ctx) {
      const root = document.documentElement;
      ctx.effect(() => {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.dataset.plugin = PACKAGE;
        style.textContent = CSS;
        document.head.append(style);
        root.setAttribute('data-glass-ui', '');
        return () => {
          style.remove();
          for (const name of ['ui', 'quality', 'auto', 'transparency', 'contrast', 'forced-colors', 'reduced-motion', 'motion', 'texture', 'tone', 'messages']) root.removeAttribute('data-glass-' + name);
          root.style.removeProperty('--gx-strength');
        };
      }, 'glass-ui: surface stylesheet');
      const controller = createController(ctx);
      ctx.effect(() => {
        const previous = window.__dshGlass;
        window.__dshGlass = controller.api;
        return () => {
          if (window.__dshGlass !== controller.api) return;
          if (previous === undefined) delete window.__dshGlass;
          else window.__dshGlass = previous;
        };
      }, 'glass-ui: preferences api');
      installWatchdog(ctx, controller);
      installSelectionPills(ctx, controller);
      installGuideLight(ctx, controller);
      ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'glass-ui: settings dictionaries');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: 'glass-ui', order: 12, locale: NS,
        label: () => t('title'), inject: () => ({ controller }),
      }, GlassSettings));
    }

    const exports_ = {};
    exports_.inject = ['theme', 'slots', 'locale'];
    exports_.apply = apply;
    return exports_;
  },
});
