/* Visitor preferences: one localStorage key, applied before first paint.
   Load synchronously in <head>. Same behaviour on every style page. */
(function () {
  'use strict';
  var KEY = 'bb-site-prefs-v1';
  var d = document.documentElement;
  var FONTS = [['default', 'Style default'], ['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono'], ['legible', 'Easy read']];
  var SIZES = [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']];
  var THEMES = [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']];
  var defTheme = d.getAttribute('data-default-theme') || 'system';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(p) { try { if (Object.keys(p).length) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch (e) {} }

  var prefs = load();
  var q = new URLSearchParams(location.search);
  var view = {}; // prefs + URL overrides (URL overrides are never saved)
  function compute() {
    view = {
      theme: prefs.theme || defTheme,
      font: prefs.font || 'default',
      size: prefs.size || 'm',
      accent: prefs.accent == null ? 0 : prefs.accent
    };
    var t = q.get('theme'), s = q.get('size'), a = q.get('accent'), f = q.get('font');
    if (t && /^(light|dark|system)$/.test(t)) view.theme = t;
    if (s === 'default') s = 'm';
    if (s && /^(s|m|l|xl)$/.test(s)) view.size = s;
    if (a !== null && /^[0-5]$/.test(a)) view.accent = +a;
    if (f && FONTS.some(function (x) { return x[0] === f; })) view.font = f;
  }
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() {
    compute();
    var dark = view.theme === 'dark' || (view.theme === 'system' && mq && mq.matches);
    d.setAttribute('data-theme', dark ? 'dark' : 'light');
    d.setAttribute('data-theme-pref', view.theme);
    d.setAttribute('data-font', view.font);
    d.setAttribute('data-size', view.size);
    d.setAttribute('data-accent', String(view.accent));
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  window.addEventListener('storage', function (e) { if (e.key === KEY) { prefs = load(); apply(); sync(); } });

  /* ---------- panel ---------- */
  var panel, toggleBtn;
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function group(name, legend, items, kind) {
    var fs = el('fieldset', { 'class': 'sp-group sp-' + kind });
    fs.appendChild(el('legend', {}, [legend]));
    var row = el('div', { 'class': 'sp-row' });
    items.forEach(function (it, i) {
      var id = 'sp-' + name + '-' + it[0];
      var inp = el('input', { type: 'radio', name: 'sp-' + name, id: id, value: it[0] });
      var lab = el('label', { 'for': id, 'class': 'sp-opt', 'data-v': it[0], title: it[1] });
      if (kind === 'swatch') { lab.appendChild(el('span', { 'class': 'sp-dot', 'data-i': i })); lab.appendChild(el('span', { 'class': 'sp-vh' }, [it[1]])); }
      else if (name === 'size') { lab.appendChild(el('span', { 'class': 'sp-a sp-a-' + it[0], 'aria-hidden': 'true' }, ['A'])); lab.appendChild(el('span', { 'class': 'sp-vh' }, [({ s: 'Small', m: 'Default', l: 'Large', xl: 'Extra large' })[it[0]]])); }
      else lab.appendChild(document.createTextNode(it[1]));
      row.appendChild(inp); row.appendChild(lab);
    });
    fs.appendChild(row);
    return fs;
  }
  function build() {
    toggleBtn = document.querySelector('[data-settings-toggle]');
    if (!toggleBtn) return;
    var names = (d.getAttribute('data-swatches') || 'One,Two,Three,Four,Five,Six').split(',');
    panel = el('div', { 'class': 'sp', id: 'sp', role: 'dialog', 'aria-label': 'Display settings', hidden: '' });
    var head = el('div', { 'class': 'sp-head' }, [el('h2', {}, ['Display settings'])]);
    var close = el('button', { type: 'button', 'class': 'sp-close', 'aria-label': 'Close settings' }, ['×']);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(group('theme', 'Theme', THEMES, 'seg'));
    panel.appendChild(group('font', 'Font', FONTS, 'seg sp-fonts'.replace(' sp-fonts', '')));
    panel.appendChild(group('size', 'Text size', SIZES, 'seg'));
    panel.appendChild(group('accent', 'Accent colour', names.map(function (n, i) { return [String(i), n.trim()]; }), 'swatch'));
    var foot = el('div', { 'class': 'sp-foot' }, [el('button', { type: 'button', 'class': 'btn btn-ghost sp-reset' }, ['Reset to defaults']), el('span', { 'class': 'sp-note' }, ['Saved on this device'])]);
    panel.appendChild(foot);
    document.body.appendChild(panel);
    toggleBtn.setAttribute('aria-controls', 'sp');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.addEventListener('click', function () { isOpen() ? closeP(true) : openP(); });
    close.addEventListener('click', function () { closeP(true); });
    panel.addEventListener('change', function (e) {
      var t = e.target; if (!t.name) return;
      var k = t.name.slice(3);
      if (k === 'accent') prefs.accent = +t.value; else prefs[k] = t.value;
      save(prefs); q = new URLSearchParams(''); apply(); sync();
    });
    foot.querySelector('.sp-reset').addEventListener('click', function () { prefs = {}; save(prefs); q = new URLSearchParams(''); apply(); sync(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { closeP(true); } });
    document.addEventListener('mousedown', function (e) { if (isOpen() && !panel.contains(e.target) && !toggleBtn.contains(e.target)) closeP(false); });
    sync();
    if (q.get('settings') === 'open') openP(true);
  }
  function sync() {
    if (!panel) return;
    var map = { theme: view.theme, font: view.font, size: view.size, accent: String(view.accent) };
    for (var k in map) { var r = panel.querySelector('input[name="sp-' + k + '"][value="' + map[k] + '"]'); if (r) r.checked = true; }
  }
  function isOpen() { return panel && !panel.hasAttribute('hidden'); }
  function openP(quiet) {
    panel.removeAttribute('hidden'); toggleBtn.setAttribute('aria-expanded', 'true');
    if (!quiet) { var c = panel.querySelector('input:checked') || panel.querySelector('input'); if (c) c.focus(); }
  }
  function closeP(refocus) {
    panel.setAttribute('hidden', ''); toggleBtn.setAttribute('aria-expanded', 'false');
    if (refocus) toggleBtn.focus();
  }
  if (q.get('measure')) window.addEventListener('load', function () { document.body.setAttribute('data-h', document.documentElement.scrollHeight); document.body.setAttribute('data-w', document.documentElement.scrollWidth); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
