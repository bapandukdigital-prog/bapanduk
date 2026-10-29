// Bapanduk — mesin render web mandiri untuk file layar .dc.html
// Membaca template tiap layar (dari window.DC_FILES), lalu merendernya dengan React.
import React from 'react';
import { createRoot } from 'react-dom/client';

const FILES = window.DC_FILES || {};
const START = window.DC_START || 'Awal';
const h = React.createElement;

/* ---------- komponen dasar ---------- */
class DCLogic extends React.Component {
  constructor(props) {
    super(props);
    if (!this.state) this.state = {};
  }
  render() {
    const vals = typeof this.renderVals === 'function' ? (this.renderVals() || {}) : {};
    return renderList(this.constructor.__dcNodes, [vals], 'r');
  }
}

/* ---------- penilaian {{ hole }} ---------- */
const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
const ANY = /\{\{\s*([^}]+?)\s*\}\}/g;

function lookup(expr, scopes) {
  const p = expr.trim();
  if (p === 'true') return true;
  if (p === 'false') return false;
  if (p === 'null') return null;
  if (p === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  if (/^(['"]).*\1$/.test(p)) return p.slice(1, -1);
  const parts = p.split('.');
  let cur;
  let found = false;
  for (let i = scopes.length - 1; i >= 0; i--) {
    const sc = scopes[i];
    if (sc && Object.prototype.hasOwnProperty.call(sc, parts[0])) { cur = sc[parts[0]]; found = true; break; }
  }
  if (!found) return undefined;
  for (let i = 1; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}
function interp(str, scopes) {
  return str.replace(ANY, (_, e) => {
    const v = lookup(e, scopes);
    return v == null ? '' : String(v);
  });
}
function attrValue(raw, scopes) {
  const m = WHOLE.exec(raw);
  if (m) return lookup(m[1], scopes);
  if (raw.indexOf('{{') >= 0) return interp(raw, scopes);
  return raw;
}

/* ---------- pemetaan atribut ke React ---------- */
const EVENTS = {
  onclick: 'onClick', ondblclick: 'onDoubleClick', onmousedown: 'onMouseDown', onmouseup: 'onMouseUp',
  onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave', onmousemove: 'onMouseMove',
  ontouchstart: 'onTouchStart', ontouchend: 'onTouchEnd', ontouchmove: 'onTouchMove', ontouchcancel: 'onTouchCancel',
  onpointerdown: 'onPointerDown', onpointerup: 'onPointerUp', onpointermove: 'onPointerMove',
  onchange: 'onChange', oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp',
  onfocus: 'onFocus', onblur: 'onBlur', onscroll: 'onScroll', onload: 'onLoad', onended: 'onEnded'
};
const RENAME = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', autocomplete: 'autoComplete', inputmode: 'inputMode',
  readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', autoplay: 'autoPlay', playsinline: 'playsInline',
  colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', contenteditable: 'contentEditable',
  spellcheck: 'spellCheck', autofocus: 'autoFocus', enterkeyhint: 'enterKeyHint'
};
const BOOL = { disabled: 1, checked: 1, selected: 1, muted: 1, hidden: 1, autoPlay: 1, playsInline: 1, readOnly: 1, required: 1, multiple: 1, autoFocus: 1 };
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function parseStyle(str) {
  const out = {};
  String(str).split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return;
    let k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (!k || v === '') return;
    if (k.startsWith('--')) { out[k] = v; return; }
    if (k.startsWith('-webkit-')) k = 'Webkit' + camel(k.slice(8)).replace(/^./, (c) => c.toUpperCase());
    else if (k.startsWith('-moz-')) k = 'Moz' + camel(k.slice(5)).replace(/^./, (c) => c.toUpperCase());
    else k = camel(k);
    out[k] = v;
  });
  return out;
}

function screenFromHref(href) {
  const m = /^(?:\.\/|\/)?([A-Za-z0-9_.-]+)\.dc\.html(#.*)?$/.exec(href || '');
  return m ? m[1] : null;
}

function buildProps(el, scopes, key) {
  const isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
  const props = { key };
  for (const a of Array.from(el.attributes)) {
    let name = a.name;
    if (name.startsWith('hint-')) continue;
    let val = attrValue(a.value, scopes);
    if (EVENTS[name]) { if (typeof val === 'function') props[EVENTS[name]] = val; continue; }
    if (name === 'ref') { if (typeof val === 'function') props.ref = val; continue; }
    if (name === 'style') { props.style = parseStyle(val == null ? '' : val); continue; }
    if (RENAME[name]) name = RENAME[name];
    else if (isSvg && name.indexOf('-') > 0 && !name.startsWith('aria-') && !name.startsWith('data-')) name = camel(name);
    if (BOOL[name]) {
      if (val === '' || val === name.toLowerCase()) val = true;
      if (val === 'false') val = false;
      if (!val) continue;
      val = true;
    }
    if (val === undefined || val === null) continue;
    props[name] = val;
  }
  if (el.localName === 'a' && typeof props.href === 'string') {
    const target = screenFromHref(props.href);
    if (target) props.href = '#/' + target;
  }
  if (el.localName === 'input' && 'value' in props && !props.onChange && !props.readOnly) {
    props.defaultValue = props.value; delete props.value;
  }
  return props;
}

/* ---------- render pohon template ---------- */
function renderList(nodes, scopes, prefix) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const r = renderNode(nodes[i], scopes, prefix + '.' + i);
    if (r !== null && r !== undefined && r !== false) out.push(r);
  }
  return out.length === 1 ? out[0] : out;
}

function renderNode(node, scopes, key) {
  if (node.nodeType === 3) {
    const t = node.nodeValue;
    return t.indexOf('{{') >= 0 ? interp(t, scopes) : t;
  }
  if (node.nodeType !== 1) return null;
  const tag = node.localName;
  if (tag === 'helmet') return null;
  if (tag === 'sc-if') {
    const v = lookup((WHOLE.exec(node.getAttribute('value') || '') || [0, 'false'])[1], scopes);
    if (!v) return null;
    return h(React.Fragment, { key }, renderList(Array.from(node.childNodes), scopes, key));
  }
  if (tag === 'sc-for') {
    const list = lookup((WHOLE.exec(node.getAttribute('list') || '') || [0, ''])[1], scopes);
    const as = node.getAttribute('as') || 'item';
    if (!Array.isArray(list)) return null;
    const kids = Array.from(node.childNodes);
    return h(React.Fragment, { key }, list.map((item, i) => {
      const sc = { $index: i }; sc[as] = item;
      return h(React.Fragment, { key: i }, renderList(kids, scopes.concat([sc]), key + '-' + i));
    }));
  }
  if (tag === 'dc-import') {
    const name = node.getAttribute('name');
    const Comp = getComponent(name);
    const props = { key };
    for (const a of Array.from(node.attributes)) {
      if (a.name === 'name' || a.name.startsWith('hint-')) continue;
      props[camel(a.name)] = attrValue(a.value, scopes);
    }
    return Comp ? h(Comp, props) : h('div', { key, style: { padding: 16, color: '#9C2E1C' } }, 'Layar ' + name + ' tidak ditemukan');
  }
  const props = buildProps(node, scopes, key);
  const kids = node.childNodes.length ? renderList(Array.from(node.childNodes), scopes, key) : undefined;
  if (tag === 'textarea' || tag === 'input' || tag === 'img' || tag === 'br' || tag === 'hr') return h(tag, props);
  return Array.isArray(kids) ? h(tag, props, ...kids) : (kids === undefined ? h(tag, props) : h(tag, props, kids));
}

/* ---------- memuat file layar ---------- */
const compiled = {};
const injected = {};
function injectHelmet(name, helmet) {
  if (!helmet || injected[name]) return;
  injected[name] = true;
  for (const el of Array.from(helmet.children)) {
    const tag = el.localName;
    if (tag === 'link') {
      const href = el.getAttribute('href');
      if (document.querySelector('link[href="' + CSS.escape(href) + '"]')) continue;
      const l = document.createElement('link');
      for (const a of Array.from(el.attributes)) l.setAttribute(a.name, a.value);
      document.head.appendChild(l);
    } else if (tag === 'style') {
      const s = document.createElement('style');
      s.setAttribute('data-layar', name);
      s.textContent = el.textContent;
      document.head.appendChild(s);
    }
  }
}

function getComponent(name) {
  if (compiled[name]) return compiled[name];
  const src = FILES[name];
  if (!src) return null;
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const xdc = doc.querySelector('x-dc');
  const helmet = xdc ? Array.from(xdc.children).find((c) => c.localName === 'helmet') : null;
  injectHelmet(name, helmet);
  const nodes = xdc ? Array.from(xdc.childNodes).filter((n) => n !== helmet && !(n.nodeType === 3 && !n.nodeValue.trim())) : [];
  const script = doc.querySelector('script[data-dc-script]');
  let Cls;
  try {
    Cls = new Function('DCLogic', 'React', (script ? script.textContent : 'class Component extends DCLogic {}') + '\n;return Component;')(DCLogic, React);
  } catch (e) {
    console.error('Gagal memuat logika layar', name, e);
    Cls = class extends DCLogic {};
  }
  Cls.__dcNodes = nodes;
  Cls.displayName = name;
  compiled[name] = Cls;
  return Cls;
}

/* ---------- penangkap error per layar ---------- */
class Guard extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (this.state.err) {
      return h('div', { style: { width: 390, height: 844, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, boxSizing: 'border-box', background: '#F2E9DA', color: '#24180F', fontFamily: 'system-ui, sans-serif', textAlign: 'center' } },
        h('strong', null, 'Layar gagal dimuat'),
        h('span', { style: { fontSize: 13, color: '#6A5644' } }, String(this.state.err && this.state.err.message || this.state.err)),
        h('a', { href: '#/' + START, style: { color: '#8A5A12', fontWeight: 700 } }, 'Kembali ke awal'));
    }
    return this.props.children;
  }
}

/* ---------- router hash ---------- */
function currentScreen() {
  const m = /^#\/([A-Za-z0-9_.-]+)/.exec(location.hash);
  const n = m ? m[1] : START;
  return FILES[n] ? n : START;
}
const MODE_OF = (screen) => (screen === 'Pedagang' ? 'pedagang' : 'wisatawan');
let currentMode = MODE_OF(currentScreen());

function App() {
  const [screen, setScreen] = React.useState(currentScreen());
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    const on = () => { setScreen(currentScreen()); };
    const reset = () => { setNonce((n) => n + 1); };
    window.addEventListener('hashchange', on);
    window.addEventListener('bp-reset', reset);
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('bp-reset', reset); };
  }, []);
  React.useEffect(() => {
    currentMode = MODE_OF(screen);
    document.querySelectorAll('[data-mode]').forEach((a) => {
      a.setAttribute('aria-current', a.getAttribute('data-mode') === currentMode ? 'true' : 'false');
    });
    if (window.DC_TITLES && window.DC_TITLES[screen]) document.title = 'Bapanduk · ' + window.DC_TITLES[screen];
  }, [screen]);
  const Comp = getComponent(screen);
  return h(Guard, { key: screen + ':' + nonce }, Comp ? h(Comp, null) : null);
}

/* pemilih mode: kartu mode yang sedang aktif tidak memulai ulang aplikasi */
document.addEventListener('click', (e) => {
  const card = e.target.closest && e.target.closest('[data-mode]');
  if (card && card.getAttribute('data-mode') === currentMode) { e.preventDefault(); return; }
  const rst = e.target.closest && e.target.closest('[data-reset]');
  if (rst) {
    e.preventDefault();
    const target = currentMode === 'pedagang' ? '#/Pedagang' : '#/' + START;
    if (location.hash !== target) location.hash = target;
    window.dispatchEvent(new Event('bp-reset'));
  }
});

/* ---------- skala bingkai ponsel ---------- */
// Di HP: lebar aplikasi = lebar layar, tinggi aplikasi menyesuaikan tinggi layar (tidak terpotong).
// Di laptop: bingkai ponsel 390×844 diperkecil agar muat di tinggi jendela.
function fit() {
  const stage = document.getElementById('stage');
  const frame = document.getElementById('frame');
  if (!stage || !frame) return;
  const vw = window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const phone = vw < 600;
  document.body.classList.toggle('hp', phone);
  let s, appH;
  if (phone) {
    s = vw / 390;
    appH = Math.max(560, Math.round(vh / s));
    stage.style.width = vw + 'px';
    stage.style.height = Math.round(appH * s) + 'px';
  } else {
    const panel = vw > 860 ? 320 + 56 : 0;
    const availW = vw - panel - 48;
    const availH = vh - 64;
    s = Math.max(0.5, Math.min(availW / 390, availH / 844, 1.1));
    appH = 844;
    stage.style.width = Math.round(390 * s) + 'px';
    stage.style.height = Math.round(844 * s) + 'px';
  }
  document.documentElement.style.setProperty('--app-h', appH + 'px');
  frame.style.height = appH + 'px';
  frame.style.transform = 'scale(' + s + ')';
}
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

createRoot(document.getElementById('frame')).render(h(App));
