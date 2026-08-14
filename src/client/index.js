/**
 * dsh-theme-triptych — browser half (plain JS, no build-time imports).
 *
 * scripts/build.mjs wraps this file into lib/client.js with the
 * __ModuleLoader__.load factory contract; the wrapper injects `React`
 * via require("react") and assigns exports.apply / exports.inject.
 * Keep this file free of import/export statements.
 *
 * What it does:
 *  1. theme.register — three themes (NEXUS dark / COMIKET light / IRONCORE dark)
 *     mapping the keyshub palettes onto the DSH --dsw-alias-* tokens. Surface
 *     tokens are semi-transparent so the wallpaper shows through (glassmorphism).
 *     A custom token --dsw-theme-wallpaper carries the wallpaper URL; the theme
 *     presenter applies any active-theme token to <body> inline CSS variables,
 *     so switching themes swaps the wallpaper with zero DOM code.
 *  2. One <style> element (fiber-owned) with the body wallpaper rule and the
 *     switcher UI styles; removed on plugin stop (the module system also tags
 *     and claims it for HMR bookkeeping).
 *  3. Two additive switcher entry points:
 *       - settings.general.item row "外观主题 / Theme" (order 11, right after
 *         the built-in Appearance row) with three wallpaper cards + System.
 *       - sidebar.footer.action palette button (order 10) with a popover menu.
 *     Both are additive list entries — replaceRisk none; nothing shipped is
 *     shadowed.
 */

/* ── palettes (verbatim from keyshub.top / isolo-news web/src/config/themes.ts) ── */

const THEME_SPECS = [
  {
    id: 'nexus', displayName: 'NEXUS', colorScheme: 'dark', wallpaper: '/dsh-theme-triptych/nexus.jpg',
    // Transparency model: the backdrop is nearly open so the wallpaper reads
    // clearly; only content surfaces (message cards, inputs) keep a
    // semi-transparent mask for legibility, and popovers stay near-opaque.
    alpha: { base: 0.35, layer1: 0.78, layer2: 0.7, overlay: 0.94, sidebar: 0.66 },
    colors: {
      primary: '#00f0ff', primaryDark: '#00b8c5', secondary: '#ff2d95', bgBase: '#0a0e1a', bgLayer1: '#151c2e',
      bgLayer2: '#1a2035', bgTertiary: '#1a2035', bgOverlay: '#1e2640', sidebar: '#111827',
      border1: 'rgba(0, 240, 255, 0.15)', border2: 'rgba(0, 240, 255, 0.4)',
      text1: '#e8edf5', text2: '#8892a8', text3: '#5a6478', success: '#00ff88', warn: '#ffaa00', error: '#ff3366',
    },
  },
  {
    id: 'comiket', displayName: 'COMIKET', colorScheme: 'light', wallpaper: '/dsh-theme-triptych/comiket.jpg',
    alpha: { base: 0.4, layer1: 0.82, layer2: 0.76, overlay: 0.95, sidebar: 0.7 },
    colors: {
      primary: '#ff6b2b', primaryDark: '#cc5522', secondary: '#3b9eff', bgBase: '#faf8f5', bgLayer1: '#ffffff',
      bgLayer2: '#ebe6de', bgTertiary: '#ebe6de', bgOverlay: '#ffffff', sidebar: '#f2eee8',
      border1: 'rgba(0, 0, 0, 0.1)', border2: 'rgba(0, 0, 0, 0.24)',
      text1: '#2a2520', text2: '#6b6158', text3: '#9e958b', success: '#22c55e', warn: '#f59e0b', error: '#ef4444',
    },
  },
  {
    id: 'ironcore', displayName: 'IRONCORE', colorScheme: 'dark', wallpaper: '/dsh-theme-triptych/ironcore.jpg',
    alpha: { base: 0.35, layer1: 0.78, layer2: 0.7, overlay: 0.94, sidebar: 0.66 },
    colors: {
      primary: '#f0a030', primaryDark: '#c08020', secondary: '#4ecdc4', bgBase: '#121418', bgLayer1: '#1e2128',
      bgLayer2: '#22262e', bgTertiary: '#22262e', bgOverlay: '#282c35', sidebar: '#1a1d24',
      border1: 'rgba(240, 160, 48, 0.12)', border2: 'rgba(240, 160, 48, 0.36)',
      text1: '#d8dce5', text2: '#808898', text3: '#555c6c', success: '#4ecdc4', warn: '#f0a030', error: '#e74c5e',
    },
  },
]

/* ── helpers ── */

function hexToRgba(hex, alpha) {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alpha + ')'
}

function buildThemeDef(spec) {
  const c = spec.colors
  const a = spec.alpha
  return {
    id: spec.id,
    displayName: spec.displayName,
    colorScheme: spec.colorScheme,
    tokens: {
      /* ── surfaces ── */
      '--dsw-alias-bg-base': hexToRgba(c.bgBase, a.base),
      '--dsw-alias-bg-layer-1': hexToRgba(c.bgLayer1, a.layer1),
      '--dsw-alias-bg-layer-2': hexToRgba(c.bgLayer2, a.layer2),
      '--dsw-alias-bg-layer-3': hexToRgba(c.bgLayer2, 0.92),
      '--dsw-alias-bg-overlay': hexToRgba(c.bgOverlay, a.overlay),
      '--dsw-specific-sidebar-fill': hexToRgba(c.sidebar, a.sidebar),
      /* ── strokes ── */
      '--dsw-alias-border-l1': c.border1,
      '--dsw-alias-border-l2': c.border2,
      '--dsw-alias-border-l2-darkmode-thin': c.border1,
      '--dsw-alias-border-l3': hexToRgba(c.primary, 0.3),
      '--dsw-alias-border-l4': hexToRgba(c.primary, 0.4),
      /* ── brand / labels ── */
      '--dsw-alias-brand-primary': c.primary,
      '--dsw-alias-label-primary': c.text1,
      '--dsw-alias-label-secondary': c.text2,
      '--dsw-alias-label-tertiary': c.text3,
      '--dsw-alias-label-caption': c.text3,
      '--dsw-alias-label-dimmed': c.text3,
      /* ── state accents ──
         business-primary is the UI's main interactive accent: active
         conversation tab text/bar, active folder icon, tool status, composer
         caret and pending dot — it must be the theme's PRIMARY hue (e.g.
         COMIKET orange), not the secondary. */
      '--dsw-alias-state-success-primary': c.success,
      '--dsw-alias-state-warn-primary': c.warn,
      '--dsw-alias-state-error-primary': c.error,
      '--dsw-alias-state-business-primary': c.primary,
      '--dsw-alias-state-business-tertiary': hexToRgba(c.primary, 0.18),
      /* ── buttons (composer + generic) ──
         info-fill is the composer send circle (white glyph is hard-coded, so
         it uses the darker primary variant for contrast); tool-bar fill drives
         the composer tool-row buttons. */
      '--dsw-alias-button-info-fill': c.primaryDark,
      '--dsw-alias-button-info-hover': c.primary,
      '--dsw-alias-button-primary-fill': c.primary,
      '--dsw-alias-button-primary-hover': c.primaryDark,
      '--dsw-alias-button-primary-dimmed': hexToRgba(c.primary, 0.35),
      '--dsw-alias-button-tool-bar-fill': hexToRgba(c.primary, 0.22),
      '--dsw-alias-button-tool-bar-hover': hexToRgba(c.primary, 0.34),
      '--dsw-alias-button-tool-bar-fill-invisible': hexToRgba(c.primary, 0.13),
      '--dsw-alias-button-ghost-active-fill': hexToRgba(c.primary, 0.14),
      '--dsw-alias-button-ghost-active-hover': hexToRgba(c.primary, 0.2),
      '--dsw-alias-button-ghost-active-border': hexToRgba(c.primary, 0.45),
      '--dsw-alias-button-floating-fill': hexToRgba(c.bgLayer1, 0.92),
      '--dsw-alias-button-floating-hover': hexToRgba(c.bgLayer2, 0.92),
      /* ── interactive hovers (message actions, chips, lists) ── */
      '--dsw-alias-interactive-bg-hover': hexToRgba(c.primary, 0.1),
      '--dsw-alias-interactive-bg-hover-solid': hexToRgba(c.primary, 0.18),
      '--dsw-alias-interactive-bg-active': hexToRgba(c.primary, 0.16),
      '--dsw-alias-interactive-bg-hover-accent': hexToRgba(c.primary, 0.22),
      /* ── system output cards: code blocks, tool status, bubbles ── */
      '--dsw-alias-markdown-code-block': hexToRgba(c.bgTertiary, 0.82),
      '--dsw-alias-markdown-code-block-banner': hexToRgba(c.bgTertiary, 0.9),
      '--dsw-alias-markdown-inline-code': hexToRgba(c.bgTertiary, 0.75),
      '--dsw-alias-markdown-tag': hexToRgba(c.bgTertiary, 0.75),
      '--dsw-alias-markdown-placeholder': hexToRgba(c.bgTertiary, 0.55),
      '--dsw-alias-markdown-citation': hexToRgba(c.bgTertiary, 0.6),
      /* ── specific seats: input card, message bubbles, attach, nav ── */
      '--dsw-specific-input-major': hexToRgba(c.bgLayer1, 0.9),
      '--dsw-specific-bubble': hexToRgba(c.bgLayer1, 0.85),
      '--dsw-specific-bubble-highlight': hexToRgba(c.bgLayer2, 0.85),
      '--dsw-specific-selector': hexToRgba(c.primary, 0.22),
      '--dsw-specific-tip': hexToRgba(c.bgTertiary, 0.7),
      '--dsw-specific-sidebar-nav-item-active': hexToRgba(c.primary, 0.14),
      '--dsw-specific-sidebar-nav-item-hover': hexToRgba(c.primary, 0.09),
      '--dsw-specific-sidebar-nav-item-active-accent': hexToRgba(c.primary, 0.3),
      /* ── wallpaper (custom token consumed by the WALLPAPER_CSS rule) ── */
      '--dsw-theme-wallpaper': "url('" + spec.wallpaper + "')",
    },
  }
}

/* ── styles ── */

const WALLPAPER_CSS = `
body {
  background-image: var(--dsw-theme-wallpaper, none);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}
`

const UI_CSS = `
.dswt-row { display: flex; flex-direction: column; gap: 10px; padding: 4px 0 14px; }
.dswt-title { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-secondary); }
.dswt-cards { display: flex; gap: 10px; flex-wrap: wrap; }
.dswt-card { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px; border: none; background: transparent; border-radius: 10px; cursor: pointer; }
.dswt-card:hover { background: var(--dsw-alias-bg-layer-2); }
.dswt-preview { width: 108px; height: 60px; border-radius: 8px; background-size: cover; background-position: center; border: 1px solid var(--dsw-alias-border-l1); position: relative; overflow: hidden; box-sizing: border-box; }
.dswt-dots { position: absolute; left: 6px; bottom: 6px; display: flex; gap: 4px; }
.dswt-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4); }
.dswt-name { font-size: 12px; color: var(--dsw-alias-label-primary); text-align: center; }
.dswt-card[data-active='true'] .dswt-preview { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dswt-card[data-active='true'] .dswt-name { color: var(--dsw-alias-brand-primary); }
.dswt-system .dswt-preview { background: linear-gradient(135deg, var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-layer-2)); display: flex; align-items: center; justify-content: center; }
.dswt-system-mark { font-size: 24px; line-height: 1; opacity: 0.8; color: var(--dsw-alias-label-secondary); }
.dswt-foot { width: 100%; }
.dswt-foot-btn { display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%; padding: 7px 10px; border: none; background: transparent; color: var(--dsw-alias-label-primary); border-radius: 8px; cursor: pointer; font-size: 13px; }
.dswt-foot-btn:hover, .dswt-foot-btn[data-open='true'] { background: var(--dsw-alias-bg-layer-2); }
.dswt-rail { justify-content: center; padding: 7px 0; }
.dswt-palette { width: 16px; height: 16px; border-radius: 5px; flex: none; background: conic-gradient(from 90deg, #00f0ff, #ff2d95, #f0a030, #4ecdc4, #00f0ff); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25); }
.dswt-foot-label { font-size: 13px; }
.dswt-pop { position: fixed; left: 10px; bottom: 68px; z-index: 200; min-width: 216px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35); }
.dswt-pop-backdrop { position: fixed; inset: 0; z-index: 190; background: transparent; border: none; cursor: default; }
.dswt-pop-item { display: flex; align-items: center; gap: 9px; padding: 7px 8px; border: none; background: transparent; color: var(--dsw-alias-label-primary); border-radius: 8px; cursor: pointer; font-size: 13px; text-align: left; width: 100%; }
.dswt-pop-item:hover { background: var(--dsw-alias-bg-layer-2); }
.dswt-pop-item[data-active='true'] { color: var(--dsw-alias-brand-primary); }
.dswt-pop-swatch { width: 22px; height: 22px; border-radius: 6px; background-size: cover; background-position: center; border: 1px solid var(--dsw-alias-border-l1); flex: none; }
.dswt-pop-swatch-system { background: linear-gradient(135deg, var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-layer-2)); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--dsw-alias-label-secondary); }
`

/* ── switcher UI data ── */

const ROW_CARDS = [
  { id: 'nexus', name: 'NEXUS', preview: '/dsh-theme-triptych/nexus.jpg', dots: ['#00f0ff', '#ff2d95'] },
  { id: 'comiket', name: 'COMIKET', preview: '/dsh-theme-triptych/comiket.jpg', dots: ['#ff6b2b', '#3b9eff'] },
  { id: 'ironcore', name: 'IRONCORE', preview: '/dsh-theme-triptych/ironcore.jpg', dots: ['#f0a030', '#4ecdc4'] },
]

const QUICK_CARDS = [
  { id: 'nexus', name: 'NEXUS 赛博霓虹', swatch: '/dsh-theme-triptych/nexus.jpg' },
  { id: 'comiket', name: 'COMIKET 温暖纸感', swatch: '/dsh-theme-triptych/comiket.jpg' },
  { id: 'ironcore', name: 'IRONCORE 机械工业', swatch: '/dsh-theme-triptych/ironcore.jpg' },
]

function isCustom(id) {
  return id === 'nexus' || id === 'comiket' || id === 'ironcore'
}

/* ── components (React.createElement only; React is injected by the wrapper) ── */

function ThemeRow(props) {
  const [pref, setPref] = React.useState(props.snapshot())
  React.useEffect(() => props.subscribe(setPref), [])
  return React.createElement('div', { className: 'dswt-row' },
    React.createElement('div', { className: 'dswt-title' }, '外观主题 / Theme'),
    React.createElement('div', { className: 'dswt-cards' },
      ROW_CARDS.map((card) => React.createElement('button', {
        key: card.id, type: 'button', className: 'dswt-card',
        'data-active': pref === card.id || undefined,
        onClick: () => props.setTheme(card.id),
      },
        React.createElement('div', { className: 'dswt-preview', style: { backgroundImage: "url('" + card.preview + "')" } },
          React.createElement('div', { className: 'dswt-dots' },
            card.dots.map((d) => React.createElement('span', { key: d, className: 'dswt-dot', style: { background: d } })),
          ),
        ),
        React.createElement('div', { className: 'dswt-name' }, card.name),
      )),
      React.createElement('button', {
        type: 'button', className: 'dswt-card dswt-system',
        'data-active': !isCustom(pref) || undefined,
        onClick: () => props.setTheme('system'),
      },
        React.createElement('div', { className: 'dswt-preview' },
          React.createElement('span', { className: 'dswt-system-mark' }, '◐'),
        ),
        React.createElement('div', { className: 'dswt-name' }, '默认 System'),
      ),
    ),
  )
}

function ThemeFooterAction(props) {
  const [pref, setPref] = React.useState(props.snapshot())
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => props.subscribe(setPref), [])
  const btn = React.createElement('button', {
    type: 'button',
    className: props.wide ? 'dswt-foot-btn' : 'dswt-foot-btn dswt-rail',
    'data-open': open || undefined,
    'aria-label': '主题外观',
    'aria-expanded': open || undefined,
    onClick: () => setOpen(!open),
  },
    React.createElement('span', { className: 'dswt-palette' }),
    props.wide ? React.createElement('span', { className: 'dswt-foot-label' }, '主题外观') : null,
  )
  const pop = React.createElement('div', { className: 'dswt-pop', role: 'menu', 'aria-label': '主题外观' },
    QUICK_CARDS.map((item) => React.createElement('button', {
      key: item.id, type: 'button', role: 'menuitem', className: 'dswt-pop-item',
      'data-active': pref === item.id || undefined,
      onClick: () => { props.setTheme(item.id); setOpen(false) },
    },
      React.createElement('span', { className: 'dswt-pop-swatch', style: { backgroundImage: "url('" + item.swatch + "')" } }),
      React.createElement('span', null, item.name),
    )),
    React.createElement('button', {
      key: 'system', type: 'button', role: 'menuitem', className: 'dswt-pop-item',
      'data-active': !isCustom(pref) || undefined,
      onClick: () => { props.setTheme('system'); setOpen(false) },
    },
      React.createElement('span', { className: 'dswt-pop-swatch dswt-pop-swatch-system' }, '◐'),
      React.createElement('span', null, '默认 System'),
    ),
  )
  return React.createElement('div', { className: 'dswt-foot' },
    btn,
    open ? React.createElement(React.Fragment, null,
      React.createElement('button', { type: 'button', className: 'dswt-pop-backdrop', 'aria-hidden': 'true', tabIndex: -1, onClick: () => setOpen(false) }),
      pop,
    ) : null,
  )
}

/* ── plugin face (the wrapper assigns exports.apply / exports.inject) ── */

/** Hard service dependencies: theme registry and the slot system. */
const inject = ['theme', 'slots']

function apply(ctx) {
  const theme = ctx.theme
  const slots = ctx.slots

  // 1. Register the three themes; disposers are fiber-owned so a stop or
  //    update unregisters them (an active custom preference resets safely).
  for (const spec of THEME_SPECS) {
    const dispose = theme.register(buildThemeDef(spec))
    ctx.effect(() => dispose)
  }

  // 2. Wallpaper rule + switcher styles, fiber-owned. NOTE: ctx.effect(execute)
  //    runs `execute` immediately and treats its RETURN as the unload cleanup —
  //    `() => { style.remove() }` would remove the styles right away, so the
  //    body returns a cleanup function instead.
  const style = document.createElement('style')
  style.textContent = WALLPAPER_CSS + '\n' + UI_CSS
  document.head.appendChild(style)
  ctx.effect(() => () => { style.remove() })

  // 3. Live preference state for both entry points.
  let preference = theme.getTheme().preference
  const listeners = new Set()
  const disposeEvent = ctx.on('theme/change', (snapshot) => {
    preference = snapshot.preference
    for (const fn of Array.from(listeners)) fn(preference)
  })
  ctx.effect(() => disposeEvent)
  const face = () => ({
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    snapshot: () => preference,
    setTheme: (id) => theme.setTheme(id),
  })

  // 4. Additive entry points.
  slots.inject('settings.general.item', () => slots.register(
    { name: 'settings.general.item', id: 'dsh-theme-triptych-appearance', order: 11, inject: face },
    ThemeRow,
  ))
  slots.inject('sidebar.footer.action', () => slots.register(
    { name: 'sidebar.footer.action', id: 'dsh-theme-triptych-quick', order: 10, inject: face },
    ThemeFooterAction,
  ))
}
