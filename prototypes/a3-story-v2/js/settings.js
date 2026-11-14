/* Tuning knobs: definitions, named presets ("looks"), URL + localStorage
   persistence and the collapsible panel. Everything applies live. */
(function (global) {
  'use strict';
  const KNOBS = [
    { g: 'Projection', k: 'tilt', label: 'Tilt (3/4 view)', min: 0, max: 1, step: 0.02, hint: 'How far up the screen each unit of height is drawn. 0 = straight top-down.' },
    { g: 'Projection', k: 'lean', label: 'Lean (perspective)', min: 0, max: 3, step: 0.1, hint: 'Tops of tall things lean away from the screen centre and shift as the camera moves.' },
    { g: 'Projection', k: 'leanClamp', label: 'Max lean (px at 40 voxels tall)', min: 0, max: 30, step: 1, hint: 'Caps how far a 40-voxel-tall top may shift; keeps lamp posts and houses from over-leaning.' },
    { g: 'Projection', k: 'zoom', label: 'Zoom', type: 'select', options: ['auto', '2', '3', '4', '5'] },
    { g: 'Walls', k: 'walls', label: 'Wall treatment', type: 'select', options: ['cutaway', 'low', 'full', 'fade'],
      names: { cutaway: 'Cut-away: back wall full, others drop when inside', low: 'Low walls everywhere (dollhouse plan)', full: 'Full-height walls', fade: 'Full, front/side walls fade when inside' } },
    { g: 'Walls', k: 'wallLean', label: 'Wall lean', type: 'select', options: ['segmented', 'none', 'rigid'],
      names: { segmented: 'True perspective (per 16px segment)', none: 'Tilt only, no lean', rigid: 'Rigid per wall (round 1, splays)' } },
    { g: 'Walls', k: 'wallH', label: 'Cut wall height', min: 2, max: 16, step: 1 },
    { g: 'Light', k: 'tod', label: 'Time of day', type: 'select', options: ['morning', 'noon', 'golden', 'dusk'] },
    { g: 'Light', k: 'sun', label: 'Sun direction (°)', min: 0, max: 355, step: 5, hint: 'Direction shadows fall, clockwise from east.' },
    { g: 'Light', k: 'shadowLen', label: 'Shadow length', min: 0, max: 2, step: 0.05 },
    { g: 'Light', k: 'shadow', label: 'Shadow strength', min: 0, max: 1, step: 0.02 },
    { g: 'Light', k: 'shadowSoft', label: 'Shadow softness', min: 0, max: 6, step: 0.2 },
    { g: 'Light', k: 'ao', label: 'Contact shadows (AO)', min: 0, max: 1, step: 0.05 },
    { g: 'Light', k: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.05 },
    { g: 'Light', k: 'sat', label: 'Saturation', min: 0.5, max: 1.5, step: 0.05 },
    { g: 'Light', k: 'contrast', label: 'Contrast', min: 0.8, max: 1.3, step: 0.02 },
    { g: 'Sky', k: 'clouds', label: 'Clouds', min: 0, max: 10, step: 1 },
    { g: 'Sky', k: 'cloudSpeed', label: 'Cloud speed', min: 0, max: 30, step: 1 },
    { g: 'Sky', k: 'cloudAlpha', label: 'Cloud opacity', min: 0, max: 1, step: 0.05 },
    { g: 'Sky', k: 'cloudShadow', label: 'Cloud shadows', min: 0, max: 0.5, step: 0.02 },
    { g: 'Character', k: 'charH', label: 'Character height (world px)', min: 14, max: 32, step: 1 },
    { g: 'Character', k: 'charSnap', label: 'Snap to whole screen pixels', type: 'check' },
    { g: 'Character', k: 'speed', label: 'Walk speed', min: 30, max: 140, step: 2 },
    { g: 'Character', k: 'accel', label: 'Acceleration', min: 100, max: 3000, step: 20, hint: 'Higher = snappier starts and stops.' },
    { g: 'Character', k: 'animRate', label: 'Animation rate', min: 0.4, max: 2, step: 0.05 },
    { g: 'Character', k: 'dust', label: 'Footstep dust', type: 'check' },
    { g: 'Character', k: 'follow', label: 'Camera follow (1 = locked)', min: 0.02, max: 1, step: 0.01 },
  ];
  const BASE = { tilt: 0.72, lean: 1, leanClamp: 10, zoom: 'auto', walls: 'cutaway', wallLean: 'segmented', wallH: 7, tod: 'morning', sun: 37, shadowLen: 0.7,
    shadow: 0.42, shadowSoft: 1.6, ao: 0.55, vignette: 0.28, sat: 1.05, contrast: 1.04, clouds: 3, cloudSpeed: 4, cloudAlpha: 0.45, cloudShadow: 0.14,
    charH: 21, charSnap: true, speed: 72, accel: 520, animRate: 1, dust: true, follow: 0.12 };
  const PRESETS = {
    diorama: { name: 'Diorama (recommended)', desc: 'Stacked voxel diorama, cut-away walls, warm morning light, soft shadows.', v: {} },
    classic: { name: 'Classic top-down RPG', desc: 'Nearly flat, no lean, low walls, crisp noon light, no clouds. Reads like a 16-bit RPG.',
      v: { tilt: 0.36, lean: 0, leanClamp: 0, walls: 'low', wallLean: 'none', wallH: 6, tod: 'noon', sun: 50, shadowLen: 0.45, shadow: 0.32, shadowSoft: 0.4, ao: 0.35,
        vignette: 0, sat: 1.12, contrast: 1, clouds: 0, cloudShadow: 0, accel: 1600, follow: 0.25, dust: false } },
    skyforce: { name: 'Lit depth (Sky Force-like)', desc: 'Strong perspective lean, long golden-hour shadows, dense drifting clouds, heavy grade.',
      v: { tilt: 0.84, lean: 2.2, leanClamp: 22, walls: 'fade', wallLean: 'segmented', tod: 'golden', sun: 28, shadowLen: 1.35, shadow: 0.55, shadowSoft: 2.6, ao: 0.7,
        vignette: 0.55, sat: 1.15, contrast: 1.12, clouds: 7, cloudSpeed: 10, cloudAlpha: 0.6, cloudShadow: 0.24, speed: 80, accel: 360, follow: 0.07 } },
    evening: { name: 'Evening, lamps on', desc: 'Dusk tint, glowing street lamps, tube light and CRT; full-height walls with tilt only.',
      v: { tilt: 0.72, lean: 0.6, leanClamp: 8, walls: 'full', wallLean: 'none', tod: 'dusk', sun: 120, shadowLen: 0.5, shadow: 0.22, shadowSoft: 3.2, ao: 0.65,
        vignette: 0.5, sat: 0.92, contrast: 1.06, clouds: 2, cloudSpeed: 2, cloudAlpha: 0.25, cloudShadow: 0.05 } },
  };
  const DEFAULT_PRESET = 'diorama';
  const LS = 'bb-story-v2-settings';
  const presetValues = (p) => Object.assign({}, BASE, (PRESETS[p] || PRESETS[DEFAULT_PRESET]).v);
  const knob = (k) => KNOBS.find((x) => x.k === k);

  function parse(k, raw) {
    const d = knob(k); if (!d) return undefined;
    if (d.type === 'check') return raw === '1' || raw === 'true' || raw === true;
    if (d.type === 'select') return d.options.includes(String(raw)) ? String(raw) : undefined;
    const n = parseFloat(raw); return isFinite(n) ? Math.max(d.min, Math.min(d.max, n)) : undefined;
  }

  const Q = new URLSearchParams(location.search);
  let preset = DEFAULT_PRESET, values;
  const urlHas = Q.has('preset') || KNOBS.some((d) => Q.has(d.k));
  if (urlHas) {
    preset = PRESETS[Q.get('preset')] ? Q.get('preset') : DEFAULT_PRESET;
    values = presetValues(preset);
    for (const d of KNOBS) if (Q.has(d.k)) { const v = parse(d.k, Q.get(d.k)); if (v !== undefined) values[d.k] = v; }
  } else {
    let st = null; try { st = JSON.parse(localStorage.getItem(LS)); } catch (e) { /* ignore */ }
    if (st && st.preset && PRESETS[st.preset]) { preset = st.preset; values = Object.assign(presetValues(preset), st.values || {}); }
    else values = presetValues(preset);
  }
  const listeners = [];
  const CFG = {
    KNOBS, PRESETS, values, get preset() { return preset; },
    on(fn) { listeners.push(fn); },
    set(k, v, quiet) { values[k] = v; save(); if (!quiet) listeners.forEach((f) => f(k, v)); syncPanel(); },
    applyPreset(p) { preset = p; const nv = presetValues(p); for (const k in nv) values[k] = nv[k]; save(); listeners.forEach((f) => f('*')); syncPanel(); },
    diff() { const base = presetValues(preset), o = {}; for (const d of KNOBS) if (values[d.k] !== base[d.k]) o[d.k] = values[d.k]; return o; },
    link() { const u = new URL(location.href); const keep = ['char']; [...u.searchParams.keys()].forEach((k) => { if (!keep.includes(k)) u.searchParams.delete(k); });
      u.searchParams.set('preset', preset); const df = this.diff(); for (const k in df) u.searchParams.set(k, typeof df[k] === 'boolean' ? (df[k] ? 1 : 0) : df[k]); return u.toString(); },
  };
  function save() { try { localStorage.setItem(LS, JSON.stringify({ preset, values })); } catch (e) { /* private mode */ } }
  save();

  // ---------------- panel ----------------
  let syncPanel = () => {};
  function buildPanel() {
    const panel = document.getElementById('tune'); if (!panel) return;
    const body = panel.querySelector('.tune-body');
    const top = document.createElement('div'); top.className = 'tune-top';
    const psel = document.createElement('select'); psel.id = 'tune-preset'; psel.setAttribute('aria-label', 'Preset look');
    for (const p in PRESETS) { const o = document.createElement('option'); o.value = p; o.textContent = PRESETS[p].name; psel.appendChild(o); }
    psel.addEventListener('change', () => CFG.applyPreset(psel.value));
    const pdesc = document.createElement('p'); pdesc.className = 'tune-desc';
    const lab = document.createElement('label'); lab.className = 'tune-plabel'; lab.htmlFor = 'tune-preset'; lab.textContent = 'Look (preset)';
    const btns = document.createElement('div'); btns.className = 'tune-btns';
    const mk = (t, fn, title) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (title) b.title = title; b.addEventListener('click', fn); btns.appendChild(b); return b; };
    const status = document.createElement('span'); status.className = 'tune-status'; status.setAttribute('aria-live', 'polite');
    const copy = async (text, what) => {
      try { await navigator.clipboard.writeText(text); status.textContent = what + ' copied'; }
      catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); status.textContent = what + ' copied'; } catch (e2) { status.textContent = 'Copy failed; see console'; console.log(text); } ta.remove(); }
      setTimeout(() => (status.textContent = ''), 2500);
    };
    mk('Reset to preset', () => CFG.applyPreset(preset));
    mk('Copy settings', () => copy(JSON.stringify({ preset, changed: CFG.diff(), all: values }, null, 2), 'Settings JSON'), 'Copies JSON to the clipboard');
    mk('Copy link', () => copy(CFG.link(), 'Link'), 'A URL that reproduces exactly these settings');
    top.append(lab, psel, pdesc, btns, status);
    body.appendChild(top);
    const inputs = {};
    let group = null, sec = null;
    for (const d of KNOBS) {
      if (d.g !== group) { group = d.g; sec = document.createElement('fieldset'); const lg = document.createElement('legend'); lg.textContent = group; sec.appendChild(lg); body.appendChild(sec); }
      const row = document.createElement('div'); row.className = 'tune-row';
      const id = 'k-' + d.k, l = document.createElement('label'); l.htmlFor = id; l.textContent = d.label;
      const out = document.createElement('output'); out.htmlFor = id;
      let inp;
      if (d.type === 'select') { inp = document.createElement('select'); d.options.forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = (d.names && d.names[o]) || o; inp.appendChild(op); }); inp.addEventListener('change', () => CFG.set(d.k, inp.value)); }
      else if (d.type === 'check') { inp = document.createElement('input'); inp.type = 'checkbox'; inp.addEventListener('change', () => CFG.set(d.k, inp.checked)); }
      else { inp = document.createElement('input'); inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.addEventListener('input', () => CFG.set(d.k, parseFloat(inp.value))); }
      inp.id = id; if (d.hint) { inp.title = d.hint; l.title = d.hint; }
      const url = document.createElement('code'); url.textContent = d.k; url.title = 'URL parameter';
      row.append(l, url, inp, out); sec.appendChild(row);
      inputs[d.k] = { inp, out, d };
    }
    syncPanel = () => {
      psel.value = preset; const df = CFG.diff(), n = Object.keys(df).length;
      pdesc.textContent = PRESETS[preset].desc + (n ? `  (${n} setting${n > 1 ? 's' : ''} changed)` : '');
      for (const k in inputs) {
        const { inp, out, d } = inputs[k], v = values[k];
        if (d.type === 'check') inp.checked = !!v; else if (document.activeElement !== inp || d.type === 'select') inp.value = v;
        out.textContent = d.type === 'check' ? (v ? 'on' : 'off') : d.type === 'select' ? '' : String(Math.round(v * 100) / 100);
        inp.closest('.tune-row').classList.toggle('changed', k in df);
      }
    };
    syncPanel();
    const toggle = document.getElementById('tuneBtn');
    const setOpen = (o) => { panel.hidden = !o; toggle.setAttribute('aria-expanded', o ? 'true' : 'false'); try { localStorage.setItem(LS + '-open', o ? '1' : '0'); } catch (e) { /* */ } };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    panel.querySelector('.tune-close').addEventListener('click', () => setOpen(false));
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyT' && !e.target.closest('input, select, textarea') && !document.querySelector('.modal:not([hidden])')) setOpen(panel.hidden); });
    let open; const qp = Q.get('panel'); const st = (() => { try { return localStorage.getItem(LS + '-open'); } catch (e) { return null; } })();
    if (qp !== null) open = qp === '1'; else if (st !== null) open = st === '1'; else open = window.innerWidth >= 900;
    setOpen(open);
  }
  CFG.buildPanel = buildPanel;
  global.CFG = CFG;
})(window);
