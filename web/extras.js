'use strict';
/* Riven arayüz eklentileri: özel renk, hareketli arka plan, 3B karakter, giriş ekranı.
   app.js'ten ÖNCE yüklenir; app.js'teki h/$/api/toast gibi yardımcılar yalnızca çağrı anında kullanılır. */

/* ------------------------------------------------------------ özel vurgu rengi */
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgbHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const ACCENT_VARS = ['--g', '--g2', '--g3', '--glow', '--glow2', '--on', '--bg1', '--bg2', '--panel-solid'];
let currentAccent = '';
let skinRev = Date.now();

function applyAccent(hex) {
  const st = document.documentElement.style;
  if (!hex) { ACCENT_VARS.forEach((n) => st.removeProperty(n)); currentAccent = ''; return; }
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const W = [255, 255, 255], K = [0, 0, 0], g2 = mixRgb(c, W, .28), g3 = mixRgb(c, K, .24);
  const lum = .299 * c[0] + .587 * c[1] + .114 * c[2];
  const set = (k, v) => st.setProperty(k, v);
  set('--g', hex); set('--g2', rgbHex(g2)); set('--g3', rgbHex(g3));
  set('--glow', c.join(',')); set('--glow2', g2.join(','));
  set('--on', lum > 150 ? rgbHex(mixRgb(c, K, .88)) : '#ffffff');
  set('--bg1', rgbHex(mixRgb(c, K, .92))); set('--bg2', rgbHex(mixRgb(c, K, .955)));
  set('--panel-solid', `rgba(${mixRgb(c, K, .9).join(',')},.95)`);
  currentAccent = hex;
}

function themePanel() {
  const start = currentAccent || '#22c55e';
  const picker = h('input', { type: 'color', class: 'color-input', value: start, title: 'İstediğin rengi seç' });
  const hex = h('input', { class: 'input hex-input', value: start, maxlength: 7, spellcheck: 'false' });
  const wrap = h('div', { class: 'custom-wrap' + (currentTheme === 'custom' ? ' sel' : '') }, picker, hex);
  const dots = Object.entries(THEMES).map(([key, [label, color]]) =>
    h('div', { class: 'theme-dot' + (key === currentTheme ? ' sel' : ''), title: label, style: `background:${color}`,
      onclick: async () => {
        applyTheme(key); mark(dots[Object.keys(THEMES).indexOf(key)]);
        try { await api('/theme', { method: 'POST', body: { theme: key } }); } catch (e) { toast(e.message, 'error'); }
      } }));
  function mark(el) {
    dots.forEach((d) => d.classList.toggle('sel', d === el));
    wrap.classList.toggle('sel', !el);
  }
  let timer;
  function setCustom(v) {
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    v = v.toLowerCase();
    applyTheme('custom', v); mark(null);
    picker.value = v;
    if (document.activeElement !== hex) hex.value = v;
    clearTimeout(timer);
    timer = setTimeout(() => api('/theme', { method: 'POST', body: { theme: 'custom', color: v } })
      .catch((e) => toast(e.message, 'error')), 350);
  }
  picker.addEventListener('input', () => setCustom(picker.value));
  hex.addEventListener('input', () => setCustom(hex.value.startsWith('#') ? hex.value : '#' + hex.value));
  const langSeg = h('div', { class: 'seg lang-seg' }, [['tr', 'Türkçe'], ['en', 'English']].map(([code, label]) =>
    h('button', { class: code === LANG ? 'sel' : '', onclick: () => setLang(code, true) }, label)));
  const gtModes = [['auto', 'Otomatik'], ['day', 'Gündüz'], ['night', 'Gece'], ['off', 'Kapalı']];
  const gtNow = (typeof S !== 'undefined' && S && S.game_theme) || 'auto';
  const gtBtns = gtModes.map(([key, label]) => h('button', { class: key === gtNow ? 'sel' : '', 'data-k': key,
    onclick: async () => {
      gtBtns.forEach((b) => b.classList.toggle('sel', b.dataset.k === key));
      try { await api('/gametheme', { method: 'POST', body: { mode: key } }); toast('Oyun teması bir sonraki başlatmada uygulanır'); }
      catch (e) { toast(e.message, 'error'); }
    } }, label));
  const gtSeg = h('div', { class: 'seg lang-seg' }, gtBtns);
  return h('div', { class: 'panel form' }, h('h3', { class: 'section-title' }, 'Görünüm ve dil'),
    h('div', { class: 'lang-row' }, h('div', {}, h('div', { class: 'row-title' }, 'Dil'),
      h('div', { class: 'row-sub' }, 'Arayüz dilini seç')), langSeg),
    h('div', { class: 'lang-row' }, h('div', {}, h('div', { class: 'row-title' }, 'Güncellemeler'),
      h('div', { class: 'row-sub' }, tr('Sürüm') + ' ' + ((typeof S !== 'undefined' && S && S.app_version) || ''))),
      h('button', { class: 'btn small', onclick: async () => {
        try { await api('/update/check', { method: 'POST' }); toast(tr('Güncelleme kontrol ediliyor…')); } catch (e) { toast(e.message, 'error'); }
      } }, 'Güncellemeleri denetle')),
    h('div', { class: 'lang-row' }, h('div', {}, h('div', { class: 'row-title' }, 'Oyun ana ekranı teması'),
      h('div', { class: 'row-sub' }, 'Minecraft açılış ekranı (1.14+): sabah/öğlen güneşli, akşam/gece karanlık')), gtSeg),
    h('p', { class: 'muted', style: 'margin:0;line-height:1.5' },
      'Launcher rengi: yalnızca bu uygulamanın arayüzünü boyar (oyun arayüzünün rengi aşağıdaki "Oyun Arayüzü Teması" bölümünden ayrı seçilir). Hazır bir renk seç ya da sağdaki kutudan istediğin rengi bul.'),
    h('div', { class: 'themes' }, dots, wrap));
}


/* ------------------------------------------------------------ oyun arayüzü teması (V50) */
function gameUiPanel() {
  let state = { ui_accent: '#22c55e', ui_glass: 62, ui_hud: true, ui_presets: [] };
  let busy = false, glassValEl = null;

  const container = h('div', { class: 'panel form' },
    h('h3', { class: 'section-title' }, 'Oyun Arayüzü Teması'));

  // Etiketsiz renk noktası (adı yalnızca ipucu/erişilebilirlik olarak kalır)
  function presetEl(p) {
    const [, label, color] = p;
    const sel = state.ui_accent.toLowerCase() === color.toLowerCase();
    return h('button', {
      type: 'button', class: 'gui-dot' + (sel ? ' sel' : ''), title: label, 'aria-label': label,
      style: `background:${color};color:${color}`,
      onclick: () => apply('accent', color)
    });
  }

  async function apply(field, value) {
    if (busy) return false;
    busy = true;
    const prev = { accent: state.ui_accent, glass: state.ui_glass, hud: state.ui_hud };
    try {
      const body = {};
      if (field === 'accent') { state.ui_accent = value; body.accent = value; }
      else if (field === 'glass') { state.ui_glass = value; body.glass = value; }
      else if (field === 'hud') { state.ui_hud = value; body.hud = value; }
      await api('/gameui', { method: 'POST', body });
      // Oyun arayüzü rengi yalnızca resource pack'i boyar; launcher rengi "Görünüm ve dil" bölümünden seçilir.
      if (field === 'accent') render();
      toast('Arayüz teması güncellendi');
      return true;
    } catch (e) {
      state.ui_accent = prev.accent; state.ui_glass = prev.glass; state.ui_hud = prev.hud;
      toast(e.message, 'error');
      return false;
    } finally { busy = false; }
  }

  function render() {
    const curPreset = (state.ui_presets || []).some((p) => p[2].toLowerCase() === state.ui_accent.toLowerCase());
    const wrap = h('div', { class: 'custom-wrap' + (curPreset ? '' : ' sel') },
      h('input', { type: 'color', class: 'color-input', value: state.ui_accent, title: 'Özel renk seç',
        onchange: (e) => apply('accent', e.target.value.toLowerCase()) }),
      h('input', { class: 'input hex-input', value: state.ui_accent, maxlength: 7, spellcheck: 'false',
        title: 'Hex renk kodu',
        oninput: (e) => {
          const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
          if (/^#[0-9a-f]{6}$/i.test(v)) apply('accent', v.toLowerCase());
        } }));
    const dots = (state.ui_presets || []).map(presetEl);

    const glassWrap = h('div', { class: 'row' },
      h('div', {}, h('div', { class: 'row-title' }, 'Cam saydamlığı'),
        h('div', { class: 'row-sub' }, 'Panellerin şeffaf katmanı (0 = katı, 100 = çok saydam)')),
      h('div', { style: 'display:flex;align-items:center;gap:10px;flex:1' },
        h('input', { type: 'range', min: 0, max: 100, value: state.ui_glass, class: 'range',
          oninput: (e) => { glassValEl.textContent = e.target.value + '%'; },
          onchange: (e) => { state.ui_glass = +e.target.value; apply('glass', state.ui_glass); } }),
        h('span', { class: 'muted', style: 'min-width:36px' }, (glassValEl = h('span', {}, state.ui_glass + '%')))));

    // HUD anahtarı: tek bir düğme; durum yazısı anahtarın hemen altında
    const hudState = h('span', { class: 'switch-state' }, state.ui_hud ? 'Açık' : 'Kapalı');
    const hudSwitch = h('button', {
      type: 'button', class: 'hud-switch' + (state.ui_hud ? ' on' : ''),
      role: 'switch', 'aria-checked': String(!!state.ui_hud), 'aria-label': 'HUD teması',
      onclick: async () => {
        if (busy) return;
        const next = !state.ui_hud;
        hudSwitch.classList.toggle('on', next);
        hudSwitch.setAttribute('aria-checked', String(next));
        hudState.textContent = next ? 'Açık' : 'Kapalı';
        const ok = await apply('hud', next);
        if (!ok) {   // başarısızsa eski görünüme dön
          hudSwitch.classList.toggle('on', state.ui_hud);
          hudSwitch.setAttribute('aria-checked', String(!!state.ui_hud));
          hudState.textContent = state.ui_hud ? 'Açık' : 'Kapalı';
        }
      }
    });
    const hudWrap = h('div', { class: 'row' },
      h('div', {}, h('div', { class: 'row-title' }, 'HUD teması'),
        h('div', { class: 'row-sub' }, 'Can, yeşil, experience bar ve hotbar (yalnızca 1.20.2+)')),
      h('div', { class: 'switch-col' }, hudSwitch, hudState));

    container.replaceChildren(
      h('h3', { class: 'section-title' }, 'Oyun Arayüzü Teması'),
      h('p', { class: 'muted', style: 'margin:0 0 14px' },
        'Minecraft menü, buton, kaydırıcı ve HUD dokularını seçilen vurgu rengine göre boyar. Her sürüm (1.14+) için otomatik yüklenir.'),
      h('div', { class: 'lang-row' },
        h('div', {}, h('div', { class: 'row-title' }, 'Vurgu rengi'),
          h('div', { class: 'row-sub' }, 'Yalnızca Minecraft içindeki dokuların rengi (launcher rengini değiştirmez)')),
        h('div', { class: 'gui-accent-wrap' }, h('div', { class: 'gui-presets' }, ...dots), wrap)),
      h('div', { class: 'lang-row' }, glassWrap),
      h('div', { class: 'lang-row' }, hudWrap));
  }
  render();

  async function load() {
    try { state = Object.assign(state, await api('/state')); } catch (e) { /* varsayılanla devam */ }
    render();
  }
  // extras.js app.js'den önce yüklenir; api() henüz tanımlı olmayabilir, bu yüzden yüklemeyi ertele
  setTimeout(load, 0);

  return container;
}

/* ------------------------------------------------------------ hareketli blok manzarası (V36) */
function startScene() {
  const cv = document.getElementById('scene');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, tick = 0, last = 0, rgb = [34, 197, 94], rgb2 = [74, 222, 128], shoot = null, nextShoot = 260;
  // uzaktan yakına 4 katman: hız, blok boyu, yükseklik, doluluk, koyuluk
  const L = [{ s: .10, b: 56, y: .56, a: .30, k: .34, amp: .20 }, { s: .20, b: 44, y: .66, a: .38, k: .28, amp: .18 },
    { s: .36, b: 34, y: .77, a: .50, k: .22, amp: .15 }, { s: .60, b: 26, y: .88, a: .70, k: .15, amp: .12 }];
  const STARS = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .58, z: Math.random() * 1.6 + .8, p: Math.random() * 6.3, f: Math.random() * .05 + .015 }));
  const FLY = Array.from({ length: 34 }, () => ({ x: Math.random(), y: .45 + Math.random() * .55, z: Math.random() * 2 + 1.5,
    v: Math.random() * .0009 + .0003, p: Math.random() * 6.3, w: Math.random() * .0035 + .001 }));
  const glow = document.createElement('canvas'); glow.width = glow.height = 32;   // yumuşak ışık sprite'ı
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  size(); addEventListener('resize', size);
  const rgba = (c, k, a) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
  const mix = (c, t) => c.map((v) => Math.round(v + (255 - v) * t));
  const hgt = (c, i) => Math.sin(c * .21 + i * 2.1) * .5 + Math.sin(c * .067 + i) * .35 + Math.sin(c * .43 + i * .7) * .15;
  function makeGlow() {
    const g = glow.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, rgba(rgb2, 1, .85)); r.addColorStop(1, rgba(rgb2, 1, 0));
    g.clearRect(0, 0, 32, 32); g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  }
  makeGlow();
  function draw() {
    tick++;
    if (tick % 40 === 1) {
      const get = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).split(',').map(Number);
      const a = get('--glow'), b = get('--glow2');
      const ch = (a.length === 3 && !a.some(isNaN) && a.join() !== rgb.join()) || (b.length === 3 && !b.some(isNaN) && b.join() !== rgb2.join());
      if (a.length === 3 && !a.some(isNaN)) rgb = a;
      if (b.length === 3 && !b.some(isNaN)) rgb2 = b;
      if (ch) makeGlow();
    }
    ctx.clearRect(0, 0, W, H);
    const u = H / 900, t = tick;
    // kuzey ışığı şeritleri (V53): üç yumuşak, dalgalanan renk bandı
    for (let i = 0; i < 3; i++) {
      const base = H * (.20 + i * .07), amp = 34 * u + i * 8 * u, col = i === 1 ? rgb2 : rgb;
      const g = ctx.createLinearGradient(0, base - 90 * u, 0, base + 150 * u);
      g.addColorStop(0, rgba(col, 1, 0)); g.addColorStop(.45, rgba(col, 1, .08 - i * .018)); g.addColorStop(1, rgba(col, 1, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, base + 150 * u);
      for (let x = 0; x <= W; x += 18) ctx.lineTo(x, base + Math.sin(x * .004 + t * .006 * (1 + i * .4) + i * 2) * amp + Math.sin(x * .011 - t * .004 + i) * amp * .45);
      ctx.lineTo(W, base + 150 * u); ctx.closePath(); ctx.fill();
    }
    // yıldızlar
    STARS.forEach((s) => {
      const a = .25 + .55 * (.5 + .5 * Math.sin(t * s.f + s.p));
      ctx.fillStyle = `rgba(${mix(rgb2, .55).join(',')},${a})`;
      const z = Math.max(1.5, s.z * u * 1.6); ctx.fillRect(Math.round(s.x * W), Math.round(s.y * H), z, z);
    });
    // ay / güneş: pikselli çekirdek + yumuşak hale
    const ox = W * .80, oy = H * .17 + Math.sin(t * .004) * 6 * u, or = 46 * u;
    const halo = ctx.createRadialGradient(ox, oy, 0, ox, oy, or * 7);
    halo.addColorStop(0, rgba(rgb2, 1, .30)); halo.addColorStop(.35, rgba(rgb, 1, .10)); halo.addColorStop(1, rgba(rgb, 1, 0));
    ctx.fillStyle = halo; ctx.fillRect(ox - or * 7, oy - or * 7, or * 14, or * 14);
    // ışık huzmeleri (orbdan aşağıya)
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI * (.62 + i * .075) + Math.sin(t * .006 + i * 1.7) * .035, len = H * 1.1, wd = (60 + i * 26) * u;
      const ex = ox + Math.cos(ang) * len, ey = oy + Math.sin(ang) * len;
      const g = ctx.createLinearGradient(ox, oy, ex, ey);
      g.addColorStop(0, rgba(rgb2, 1, .13 - i * .02)); g.addColorStop(1, rgba(rgb2, 1, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy);
      ctx.lineTo(ex - Math.sin(ang) * wd, ey + Math.cos(ang) * wd); ctx.lineTo(ex + Math.sin(ang) * wd, ey - Math.cos(ang) * wd);
      ctx.closePath(); ctx.fill();
    }
    const q = Math.max(6, Math.round(or * .62));
    ctx.fillStyle = `rgba(${mix(rgb2, .75).join(',')},.92)`; ctx.fillRect(Math.round(ox - q), Math.round(oy - q), q * 2, q * 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(Math.round(ox - q), Math.round(oy - q), q * 2, Math.max(2, q * .22));
    // kayan yıldız
    if (!shoot && --nextShoot <= 0) { shoot = { x: Math.random() * .6 * W, y: Math.random() * .25 * H, l: 0 }; nextShoot = 420 + Math.random() * 480; }
    if (shoot) {
      shoot.l += 14 * u; const sx = shoot.x + shoot.l, sy = shoot.y + shoot.l * .42, tl = 110 * u;
      const g = ctx.createLinearGradient(sx, sy, sx - tl, sy - tl * .42);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.5, 2 * u); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - tl, sy - tl * .42); ctx.stroke();
      if (shoot.l > 360 * u) shoot = null;
    }
    // arazi katmanları: tek yol + dikey gradyan dolgu + parlayan üst kenar
    L.forEach((l, i) => {
      const bs = Math.max(8, Math.round(l.b * u)), off = t * l.s * u * .5, c0 = Math.floor(off / bs);
      const baseY = H * l.y, amp = H * l.amp;
      ctx.beginPath(); ctx.moveTo(c0 * bs - off, H);
      let minTop = H;
      for (let c = c0; c * bs - off < W + bs; c++) {
        const x = c * bs - off, top = Math.round((baseY - (hgt(c, i) * .5 + .5) * amp) / bs) * bs;
        if (top < minTop) minTop = top;
        ctx.lineTo(x, top); ctx.lineTo(x + bs, top);
      }
      ctx.lineTo(W + bs * 2, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, minTop, 0, H);
      g.addColorStop(0, rgba(rgb, l.k * 1.7, l.a)); g.addColorStop(.55, rgba(rgb, l.k, l.a * .75)); g.addColorStop(1, rgba(rgb, l.k * .35, l.a * .35));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = rgba(rgb2, 1, Math.min(.55, l.a * .8)); ctx.lineWidth = Math.max(1.5, 2 * u);
      ctx.beginPath();
      for (let c = c0; c * bs - off < W + bs; c++) {
        const x = c * bs - off, top = Math.round((baseY - (hgt(c, i) * .5 + .5) * amp) / bs) * bs;
        if (c === c0) ctx.moveTo(x, top); else ctx.lineTo(x, top);
        ctx.lineTo(x + bs, top);
      }
      ctx.stroke();
    });
    // ateş böcekleri: yumuşak ışıklı, süzülen parçacıklar
    FLY.forEach((p) => {
      p.y -= p.v; p.x += Math.sin(t * p.w * 6 + p.p) * .0006;
      if (p.y < .25) { p.y = 1.02; p.x = Math.random(); }
      const a = Math.max(.08, .35 + .65 * Math.sin(t * .03 + p.p)) * Math.min(1, (1.02 - p.y) * 5), s = p.z * u * 9;
      ctx.globalAlpha = Math.min(.9, a); ctx.drawImage(glow, p.x * W - s / 2, p.y * H - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
  }
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (document.hidden || !document.hasFocus() || now - last < 33) return;   // odakta değilken çizme
    last = now; draw();
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) draw(); else requestAnimationFrame(loop);
}

/* ------------------------------------------------------------ 3B Minecraft karakteri (CSS 3D) */
const MC_PARTS = [  // x,y: parçanın merkezi / üst ucu (texel), sw: yürüme sallanması yönü, g: ikinci katman payı
  { k: 'head', w: 8, h: 8, d: 8, u: 0, v: 0, ou: 32, ov: 0, x: 0, y: 0, sw: 0, g: 1 },
  { k: 'body', w: 8, h: 12, d: 4, u: 16, v: 16, ou: 16, ov: 32, x: 0, y: 8, sw: 0, g: .5 },
  { k: 'ra', w: 4, h: 12, d: 4, u: 40, v: 16, ou: 40, ov: 32, x: -6, y: 8, sw: 1, g: .5 },
  { k: 'la', w: 4, h: 12, d: 4, u: 32, v: 48, ou: 48, ov: 48, x: 6, y: 8, sw: -1, g: .5 },
  { k: 'rl', w: 4, h: 12, d: 4, u: 0, v: 16, ou: 0, ov: 32, x: -2, y: 20, sw: -1, g: .5 },
  { k: 'll', w: 4, h: 12, d: 4, u: 16, v: 48, ou: 0, ov: 48, x: 2, y: 20, sw: 1, g: .5 },
];
let _defSkin = null;
function defaultSkin() {  // skin bulunamazsa çizilen varsayılan karakter
  if (_defSkin) return _defSkin;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const R = (col, a, b, w, hh) => { x.fillStyle = col; x.fillRect(a, b, w, hh); };
  const SK = '#c48a65', HR = '#3b2616', SH = '#1fa3a3', PN = '#3a3a9c', SO = '#6b6b6b';
  R(SK, 0, 8, 32, 8); R(SK, 8, 0, 16, 8);
  R(HR, 8, 0, 8, 8); R(HR, 24, 8, 8, 8); R(HR, 0, 8, 8, 3); R(HR, 16, 8, 8, 3); R(HR, 8, 8, 8, 2);
  R('#fff', 9, 12, 2, 1); R('#fff', 13, 12, 2, 1); R('#4b3a9a', 10, 12, 1, 1); R('#4b3a9a', 13, 12, 1, 1);
  R('#8a5a40', 11, 14, 2, 1);
  R(SH, 16, 16, 24, 16);
  R(SK, 40, 16, 16, 16); R(SH, 44, 16, 8, 4); R(SH, 40, 20, 16, 4);
  R(SK, 32, 48, 16, 16); R(SH, 36, 48, 8, 4); R(SH, 32, 52, 16, 4);
  R(PN, 0, 16, 16, 16); R(SO, 0, 30, 16, 2); R(PN, 16, 48, 16, 16); R(SO, 16, 62, 16, 2);
  return (_defSkin = c.toDataURL('image/png'));
}

function mcFigure(S = 9) {
  const fig = h('div', { class: 'mc-fig' });
  const scene = h('div', { class: 'mc-scene', style: `width:${S * 20}px;height:${S * 36}px` },
    h('div', { class: 'mc-floor' }), fig);
  let swings = [], ry = -32, drag = null, tex = '', slim = false;

  function box(w, hh, d, u, v, g) {
    const faces = [
      [u + d, v + d, w, hh, `translateZ(${(d + g) / 2 * S}px)`],
      [u + 2 * d + w, v + d, w, hh, `rotateY(180deg) translateZ(${(d + g) / 2 * S}px)`],
      [u, v + d, d, hh, `rotateY(-90deg) translateZ(${(w + g) / 2 * S}px)`],
      [u + d + w, v + d, d, hh, `rotateY(90deg) translateZ(${(w + g) / 2 * S}px)`],
      [u + d, v, w, d, `rotateX(90deg) translateZ(${(hh + g) / 2 * S}px)`],
      [u + d + w, v, w, d, `rotateX(-90deg) translateZ(${(hh + g) / 2 * S}px)`],
    ];
    return h('div', { class: 'mc-box' }, faces.map(([fx, fy, rw, rh, tr]) => {
      const fw = (rw + g) * S, fh = (rh + g) * S, kx = fw / rw, ky = fh / rh;
      return h('div', { class: 'mc-face', style: `width:${fw}px;height:${fh}px;left:${-fw / 2}px;top:${-fh / 2}px;` +
        `background-image:url("${tex}");background-size:${64 * kx}px ${64 * ky}px;` +
        `background-position:${-fx * kx}px ${-fy * ky}px;transform:${tr}` });
    }));
  }

  function build() {
    fig.replaceChildren(); swings = [];
    MC_PARTS.forEach((p) => {
      const arm = p.k === 'ra' || p.k === 'la';
      const w = slim && arm ? 3 : p.w, px = arm ? Math.sign(p.x) * (4 + w / 2) : p.x;
      const limb = h('div', { class: 'mc-limb', style: `transform:translate3d(0,${p.h / 2 * S}px,0)` },
        box(w, p.h, p.d, p.u, p.v, 0), box(w, p.h, p.d, p.ou, p.ov, p.g));
      const pivot = h('div', { class: 'mc-pivot' }, limb);
      pivot._pos = `translate3d(${px * S}px,${(p.y - 16) * S}px,0)`; pivot._sw = p.sw;
      pivot.style.transform = pivot._pos;
      fig.append(pivot);
      if (p.sw) swings.push(pivot);
    });
  }

  function setSkin(src) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
      if (img.height === 32) {  // eski 64x32 skin: sol kol/bacak sağdakinden kopyalanır
        x.drawImage(c, 0, 16, 16, 16, 16, 48, 16, 16); x.drawImage(c, 40, 16, 16, 16, 32, 48, 16, 16);
      }
      slim = img.height === 64 && x.getImageData(55, 25, 1, 1).data[3] === 0;  // ince (Alex) kol: kullanılmayan sütun şeffaf
      tex = c.toDataURL('image/png');
      build();
    };
    img.onerror = () => { if (src !== defaultSkin()) setSkin(defaultSkin()); };
    img.src = src;
  }

  const born = performance.now();
  let seen = false;
  (function loop(now) {
    if (scene.isConnected) seen = true; else if (seen || now - born > 6000) return;
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (drag === null) ry += .45;
    const sw = Math.sin(now / 520) * 9;
    fig.style.transform = `rotateX(-9deg) rotateY(${ry}deg)`;
    swings.forEach((p) => { p.style.transform = `${p._pos} rotateX(${p._sw * sw}deg)`; });
  })(born);
  scene.addEventListener('pointerdown', (e) => { drag = e.clientX; scene.setPointerCapture(e.pointerId); scene.classList.add('grab'); });
  scene.addEventListener('pointermove', (e) => { if (drag !== null) { ry += (e.clientX - drag) * .8; drag = e.clientX; } });
  const up = () => { drag = null; scene.classList.remove('grab'); };
  scene.addEventListener('pointerup', up); scene.addEventListener('pointercancel', up);
  setSkin(defaultSkin());
  return { el: scene, setSkin };
}

function readFileAsDataUrl(file) {
  return new Promise((ok, no) => {
    if (!file) return no(new Error('Dosya seçilmedi'));
    if (file.type && file.type !== 'image/png') return no(new Error('Skin bir PNG dosyası olmalı.'));
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => no(new Error('Dosya okunamadı'));
    r.readAsDataURL(file);
  });
}

function skinHead(src, size = 56) {  // skin'in yüzünü (kafa + şapka katmanı) piksel net çizer
  const c = h('canvas', { width: 8, height: 8, class: 'skin-head', style: `width:${size}px;height:${size}px` });
  const img = new Image();
  img.onload = () => {
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8); x.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8);
  };
  let fell = false;
  img.onerror = () => { if (!fell) { fell = true; img.src = defaultSkin(); } };  // skin yoksa varsayılan karakter
  img.src = src;
  return c;
}

const skinFor = (name) => (/^\w{3,16}$/.test(name) ? `/skin/${encodeURIComponent(name)}.png?v=${skinRev}` : defaultSkin());

function characterPreview(name) {  // hesap sayfası için küçük karakter
  const fig = mcFigure(5);
  fig.setSkin(skinFor(name));
  return h('div', { class: 'char-mini' }, fig.el);
}

/* ------------------------------------------------------------ giriş ekranı */
const LG_BADGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC9UlEQVR4nH2TT2hcZRTFf/d9773JJJoxJp3WZFKDii3VCCrqWLFGhSrUCoW6cRXBjRRxV8R9oHRjBVeC0E1duNCsam0WRlpKRIuaLFrFJq1Jmz+dJmlmknlv3vvuddGkKKJ3czb3cC7c8xM2x8yciHgzC4HXgZdr2dogBj1x5xTwHXBGRPKtXQDZNAciomb24nQyf+ybWz9VL7fmgrn0JqpKb9zNrqhPD/ZUJx7u6P1QRM5teeRvyW+P3f755Iml0Wi2vkhEaM4C1HuSNCXRlvR1ljlaeSs7sO25YRH5wszc1gV7x27/Mv7RzOdRaM6HibmslWECZoa7N4bMaDTXfWIt9/FjR7I3ytUhEbkQmllhOpk/fuLmaORy0UJ7wV0aOc3qxVnEwAQ6n+yj991niUttLm/mOnLlVPRoe+W4mb0aAENnVi5W/1ydt4JE4tWT11O0mbHtzT3cV93JrW9/Y/HLX9EQ2ojk6vJ1G71xrgoMhcD+S+msi8yZNy9mDjBcR0zlvedJFuusfD9NOl9HvaLqJSK0ycaMA/aHtdba4FxSw1mANwUv4ALyRsrlI1/jmxmmRumlAUwVr56IgGv1BZaaK4MBgKliquimmlfC9hj1SmNyge3DT1N65SGyeoIBqoaZAhD0xJ1TD8T3k+Z3ktQUM0OKEX3v7yUqd1D/cY58o3XnK2qkeUqlWKZc7JoKgLO7437f9CmBYaqGtTz58gZhTzvdB3ezNj7D6tgfUHCIN9vIU564Z8ADZ0Ng/ED3MxNf1c6/sLy2rAVi2T78FPl6C81ySq89QvRgCemIIPGs503rL+0IDleGJoDxu0U6Xfth/IPJT6PQnG9vK7rcPPlGipohsUNyo75e9808dZ9Vj2aHKvvuFsmJyAUzG9bH7eTIlVPR1dp1IpxFQYiqkjRSmnkq/V073Cd73skOVfYNb3rcv2D6vT57bPTG+epkYya41ljATKkUywx2DOjh/qGJXaWd/4Tp/3Beaq4MApSLXf+J819RN8wJiLsnvgAAAABJRU5ErkJggg==';
const LG_FRIEND = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAARklEQVR4nGNkgAKLOyX/GZDACZUeRmT+oe9XUOTtOHUYGRgYGJgYKAQDb8DAA3hID1gsMKLbjA66pBPwGjDw0TgMDBh4AAArqBOieAEFDgAAAABJRU5ErkJggg==';
function msLogo() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 23 23'); s.setAttribute('width', 17); s.setAttribute('height', 17);
  s.innerHTML = '<path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/>' +
    '<path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>';
  return s;
}
function showLogin() {
  const root = document.getElementById('login-root');
  if (!root || root.firstChild) return;
  const a = S.account || {};
  const ms = a.mode === 'microsoft';
  const fig = mcFigure(innerHeight < 780 ? 8 : 10);
  const name = h('input', { class: 'lg-input', value: ms ? a.name : (a.offline_name || a.name || ''),
    maxlength: 16, placeholder: ' ', spellcheck: 'false', autocomplete: 'off', readonly: ms });
  const plateName = h('span', {}, '');
  const plate = h('div', { class: 'lg-plate' },
    h('img', { src: LG_BADGE, alt: '' }), h('img', { src: LG_FRIEND, alt: '' }), plateName);
  let timer, busy = false;
  const sync = () => { plateName.textContent = name.value.trim() || 'Oyuncu'; };
  const refresh = () => fig.setSkin(skinFor(name.value.trim()));
  sync(); refresh();
  name.addEventListener('input', () => { sync(); clearTimeout(timer); timer = setTimeout(refresh, 450); });

  const goBtn = h('button', { class: 'btn primary lg-go', onclick: () => go() }, icon('play', 18, true), h('span', {}, 'Oyuna başla'));
  const close = () => {
    root.removeEventListener('pointermove', move);
    root.classList.add('out');
    setTimeout(() => { vid.pause(); vid.replaceChildren(); vid.load(); root.replaceChildren(); root.classList.remove('out'); }, 420);
  };
  async function go(to) {
    if (busy) return;
    busy = true; goBtn.classList.add('busy'); goBtn.lastChild.textContent = 'Hazırlanıyor…';
    if (!ms) {
      try {
        S.account = await api('/account/offline', { method: 'POST', body: { name: name.value.trim() } });
        whoKey = ''; renderTopbar();
      } catch (e) {
        toast(e.message, 'error'); busy = false; goBtn.classList.remove('busy'); goBtn.lastChild.textContent = 'Oyuna başla';
        return;
      }
    }
    close();
    if (to) location.hash = to; else route();
  }
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  const file = h('input', { type: 'file', accept: 'image/png', style: 'display:none' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      const data_url = await readFileAsDataUrl(f);
      await api('/skin/upload', { method: 'POST', body: { data_url, name: f.name.replace(/\.png$/i, '') } });
      skinRev = Date.now(); refresh(); toast('Skin yüklendi');
    } catch (e) { toast(e.message, 'error'); }
    file.value = '';
  });

  const word = [...'RIVEN'].map((c, i) => h('span', { class: 'lg-letter', style: `--i:${i}` }, c));
  const card = h('div', { class: 'lg-card' },
    h('div', { class: 'lg-brand' },
      h('img', { src: '/favicon-180.png', alt: 'Riven' }),
      h('div', { class: 'lg-word' }, h('b', {}, word), h('small', {}, 'LAUNCHER'))),
    h('h1', {}, ms ? 'Tekrar hoş geldin' : 'Kim oynuyor?'),
    h('p', { class: 'sub lg-sub' }, ms
      ? 'Microsoft hesabınla giriş yapıldı. Karakterin hazır.'
      : 'Adını yaz, karakterin hemen belirsin. Premium bir adsa gerçek skin\'in, değilse varsayılan karakter görünür.'),
    h('div', { class: 'lg-field' }, icon('user', 22), name, h('label', {}, 'Oyuncu adı')),
    h('div', { class: 'lg-actions' }, goBtn,
      ms ? null : h('button', { class: 'btn lg-ms', onclick: () => go('#/account') }, msLogo(), 'Microsoft ile giriş yap')),
    h('div', { class: 'lg-skin' },
      h('button', { class: 'lg-link', onclick: () => file.click() }, 'Kendi skin\'ini yükle'),
      h('span', {}, '•'),
      h('button', { class: 'lg-link', onclick: async () => {
        try { await api('/skin/reset', { method: 'POST' }); skinRev = Date.now(); refresh(); toast('Skin sıfırlandı'); }
        catch (e) { toast(e.message, 'error'); }
      } }, 'Sıfırla'), file),
    h('p', { class: 'muted login-note' }, 'Çevrimdışı ad; tek kişilik dünyalar ve korsan/çevrimdışı sunucular içindir.'));

  const lg = h('div', { class: 'lg' },
    h('div', { class: 'lg-stage' },
      h('div', { class: 'lg-aura' }, h('i', { class: 'sweep' }), h('i', { class: 'r1' }), h('i', { class: 'r2' })),
      plate, fig.el,
      h('div', { class: 'lg-cap' }, 'Oyunda böyle görünürsün'),
      h('div', { class: 'login-hint' }, 'Sürükle, karakterini döndür')),
    card);
  function move(e) {  // fare ile hafif paralaks + kartta ışık takibi
    lg.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3));
    lg.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3));
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }
  root.addEventListener('pointermove', move);
  const foot = h('div', { class: 'lg-foot' },
    h('span', {}, h('i', { class: 'dot on' }), 'Riven Tag aktif'), h('span', {}, 'Minecraft 1.21.11'), h('span', {}, 'Fabric'));

  /* arka plan videosu (web/intro.mp4 — istersen kendi videonla değiştir) */
  const srcMp4 = h('source', { src: '/intro.mp4', type: 'video/mp4' });
  const srcWebm = h('source', { src: '/intro.webm', type: 'video/webm' });
  const vid = h('video', { class: 'lg-video', preload: 'auto' }, srcMp4, srcWebm);
  vid.muted = true; vid.loop = true; vid.autoplay = true; vid.playsInline = true; vid.disablePictureInPicture = true;
  srcWebm.addEventListener('error', () => vid.remove());  // iki biçim de açılmazsa eski arka plan kalır
  vid.addEventListener('playing', () => vid.classList.add('on'));
  try {  // videoyu seçili vurgu rengine boya (video yeşil: ~142°)
    const c = getComputedStyle(document.documentElement).getPropertyValue('--g').trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) {
      const n = parseInt(c.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let hue = d === 0 ? 142 : mx === r ? 60 * (((g - b) / d + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
      vid.style.setProperty('--vh', Math.round(hue - 142) + 'deg');
    }
  } catch (e) { /* varsayılan renk */ }
  vid.play().catch(() => {});

  /* sinematik açılış: logo + harfler + ilerleme çubuğu, sonra giriş kartı gelir */
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Intro: son 6 saatte görüldüyse hiç gösterme, ilk seferde kısa göster (açılışı geciktirmesin) */
  let seenRecently = false;
  try { seenRecently = Date.now() - Number(localStorage.getItem('riven-intro') || 0) < 6 * 3600 * 1000; } catch (_) { /* depolama yok */ }
  try { localStorage.setItem('riven-intro', String(Date.now())); } catch (_) { /* yoksay */ }
  const INTRO_MS = 800;
  const intro = h('div', { class: 'lg-intro' },
    h('div', { class: 'in-flash' }),
    h('div', { class: 'in-logo' }, h('i', { class: 'in-ring' }), h('i', { class: 'in-ring r2' }), h('img', { src: '/favicon-512.png', alt: 'Riven' })),
    h('div', { class: 'in-word' }, [...'RIVEN'].map((c, i) => h('span', { style: `--i:${i}` }, c))),
    h('div', { class: 'in-tag' }, 'L A U N C H E R'),
    h('div', { class: 'in-bar' }, h('i', { style: `animation-duration:${INTRO_MS}ms` })),
    h('div', { class: 'in-skip' }, 'Geçmek için tıkla'));
  let revealed = false;
  function reveal() {
    if (revealed || !root.isConnected) return;
    revealed = true;
    removeEventListener('keydown', reveal);
    root.classList.remove('intro');
    intro.classList.add('done');
    root.append(lg, foot);
    setTimeout(() => intro.remove(), 900);
    name.focus();
  }
  if (still || seenRecently) { root.replaceChildren(vid); reveal(); return; }
  root.classList.add('intro');
  root.replaceChildren(vid, intro);
  intro.addEventListener('click', reveal);
  addEventListener('keydown', reveal);
  setTimeout(reveal, INTRO_MS);
}


/* ===== KOYU VİDEOLU GİRİŞ + RENK ÇUBUĞU (v10 eklentisi) =====
   Mevcut showLogin() aynen çalışır; sonrasına videoyu boyayan katmanlar ve sağ üstte renk çubuğu eklenir. */
(function () {
  const baseLogin = showLogin;
  const EXTRA = [['Kırmızı', '#ef4444'], ['Turkuaz', '#06b6d4'], ['Altın', '#eab308'], ['Beyaz', '#e5e7eb']];
  const hsl2hex = (hh, s, l) => {
    const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return rgbHex([f(0), f(8), f(4)]);
  };
  const hex2hue = (hex) => {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    if (!d) return 0;
    return Math.round(mx === r ? 60 * (((g - b) / d + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4));
  };

  showLogin = function () {
    const root = document.getElementById('login-root');
    if (!root || root.firstChild) return;
    baseLogin();
    const vid = root.querySelector('.lg-video');
    if (vid) vid.after(h('div', { class: 'lgx-tint' }), h('div', { class: 'lgx-shade' }));

    let saveTimer;
    const save = (body) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => api('/theme', { method: 'POST', body }).catch(() => {}), 350);
    };
    const hue = h('input', { class: 'lgx-hue', type: 'range', min: 0, max: 360, step: 1, title: 'Rengi kaydırarak değiştir' });
    const picker = h('input', { type: 'color', title: 'İstediğin rengi seç' });
    const pickWrap = h('span', { class: 'lgx-pick', title: 'Özel renk' }, picker);
    const dots = [];
    const mark = () => {
      dots.forEach((d) => d.el.classList.toggle('sel', d.key ? currentTheme === d.key : currentTheme === 'custom' && currentAccent === d.hex));
      const isDot = dots.some((d) => d.el.classList.contains('sel'));
      pickWrap.classList.toggle('sel', currentTheme === 'custom' && !isDot);
      const cur = currentAccent || (THEMES[currentTheme] || THEMES.green)[1];
      picker.value = cur; hue.value = hex2hue(cur);
    };
    const setPreset = (key) => { applyTheme(key); mark(); save({ theme: key }); };
    const setCustom = (hex) => { applyTheme('custom', hex.toLowerCase()); mark(); save({ theme: 'custom', color: hex.toLowerCase() }); };

    Object.entries(THEMES).forEach(([key, [label, color]]) =>
      dots.push({ key, el: h('button', { class: 'lgx-dot', title: label, style: `background:${color};color:${color}`, onclick: () => setPreset(key) }) }));
    EXTRA.forEach(([label, color]) =>
      dots.push({ hex: color, el: h('button', { class: 'lgx-dot', title: label, style: `background:${color};color:${color}`, onclick: () => setCustom(color) }) }));
    picker.addEventListener('input', () => setCustom(picker.value));
    hue.addEventListener('input', () => setCustom(hsl2hex(+hue.value, .78, .52)));
    mark();
    root.append(h('div', { class: 'lgx-dock' }, h('span', { class: 'lgx-lbl' }, 'Renk'),
      h('div', { class: 'lgx-dots' }, ...dots.map((d) => d.el), pickWrap), hue));
  };
})();


/* ------------------------------------------------------------ v11: neon koyu arayüz hareketleri
   Aurora + hareketli ızgara zemini ekler, imleci izleyen ışık ve kutucuklarda 3B eğilme sağlar. */
(function riven11() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mountBg() {
    const bg = document.querySelector('.bg');
    if (!bg || bg.querySelector('.aurora')) return;
    const mk = (cls) => { const s = document.createElement('span'); s.className = cls; return s; };
    bg.prepend(mk('grid-floor'));
    bg.prepend(mk('aurora'));
    const cv = bg.querySelector('canvas');
    bg.insertBefore(mk('blob b3'), cv);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBg); else mountBg();

  if (reduce) return;
  let raf = 0, ev = null;
  const SEL = '.panel, .card, .row, .stat, .tile-art';
  function apply() {
    raf = 0; if (!ev) return;
    const el = ev.target.closest && ev.target.closest(SEL);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    if (el.classList.contains('tile-art')) {
      el.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((.5 - py) * 14).toFixed(2) + 'deg');
    }
  }
  document.addEventListener('pointermove', (e) => { ev = e; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest && e.target.closest('.tile-art');
    if (el && !el.contains(e.relatedTarget)) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
  }, { passive: true });
})();


/* ===== Çerçevesiz pencere: küçült / büyüt / kapat + kenardan boyutlandırma ===== */
(function () {
  const SVG = {
    min: '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    max: '<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  const api = () => window.pywebview && window.pywebview.api;

  function build() {
    const box = document.getElementById('winctl');
    if (!box || !api() || box.dataset.ready) return;
    box.dataset.ready = '1';
    document.body.classList.add('native');
    const mk = (cls, title, svg, fn) => {
      const b = document.createElement('button');
      b.className = 'wc ' + cls; b.title = title; b.type = 'button'; b.innerHTML = svg;
      b.addEventListener('click', fn);
      return b;
    };
    box.append(
      mk('wc-min', 'Küçült', SVG.min, () => api().minimize()),
      mk('wc-max', 'Büyüt / Geri al', SVG.max, () => api().toggle_maximize()),
      mk('wc-close', 'Kapat', SVG.close, () => api().close()));
    box.hidden = false;

    const bar = document.getElementById('topbar');
    if (bar) bar.addEventListener('dblclick', (e) => { if (e.target === bar) api().toggle_maximize(); });

    // Kenarlardan yeniden boyutlandırma (çerçeve olmadığı için kendimiz yapıyoruz)
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => {
      const g = document.createElement('div');
      g.className = 'rz rz-' + d;
      g.addEventListener('mousedown', async (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        const st = await api().get_bounds();
        if (st.max) return;
        const sx = ev.screenX, sy = ev.screenY;
        let busy = false;
        const move = async (e) => {
          if (busy) return;
          busy = true;
          const dx = e.screenX - sx, dy = e.screenY - sy;
          let { x, y, w, h } = st;
          if (d.includes('e')) w = st.w + dx;
          if (d.includes('s')) h = st.h + dy;
          if (d.includes('w')) { w = st.w - dx; x = st.x + dx; }
          if (d.includes('n')) { h = st.h - dy; y = st.y + dy; }
          if (w < 960) { if (d.includes('w')) x = st.x + st.w - 960; w = 960; }
          if (h < 640) { if (d.includes('n')) y = st.y + st.h - 640; h = 640; }
          try { await api().set_bounds(x, y, w, h); } catch (_) {}
          busy = false;
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });
      document.body.appendChild(g);
    });
  }
  window.addEventListener('pywebviewready', build);
  if (window.pywebview && window.pywebview.api) build();
})();


/* Performans: pencere odakta değilken (oyun açıkken, başka uygulamadayken) tüm CSS animasyonları durur */
(function () {
  const sync = () => document.body && document.body.classList.toggle('idle', document.hidden || !document.hasFocus());
  addEventListener('focus', sync); addEventListener('blur', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('DOMContentLoaded', sync);
})();
