'use strict';
/* AFK Bölgesi: sonsuz parkur mini oyunu (canvas).
   - Karakter otomatik koşar; sen zıplar, çift zıplar, hızını ayarlarsın.
   - Parkur sonsuz ve rastgele üretilir; hız ve zorluk mesafeyle artar. 4 biyom: Çim Ovası, Çöl, Nether, End.
   - Parkurda: dikenli bloklar, merdivenler, yüzen taşlar, basınca çöken kırık taşlar; biyom kapıları ve 100 m tabelaları.
   - Puan: mesafe + altın + boşluk geçme + "yakın" iniş, hepsi kombo çarpanıyla (x1..x5).
   Yardımcılar (tr, h) i18n.js / app.js içindedir; burası yalnızca çağrı anında kullanır.
   Dışarıya açılan iki fonksiyon: AFKGame.page() sayfa düğümlerini verir, AFKGame.stop() sayfadan çıkınca oyunu durdurur. */
const AFKGame = (() => {
  const W = 960, H = 540, T = 40;
  const PW = 24, PH = 44;
  const GRAV = 2300, FALLM = 1.28, VJ = 780, VJ2 = 690, MAXFALL = 1150, FASTFALL = 1500, JUMPCUT = 430;
  const LIQ_Y = H - 52, COYOTE = 0.1, BUFFER = 0.13, BIOME_LEN = 450, STEP = 1 / 120, CAM_X = 280;
  const MULT_COL = ['#ffffff', '#ffe066', '#ffb347', '#ff7a59', '#ff4d8d'];

  /* ------------------------------------------------------------ yardımcılar */
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const mod = (a, n) => ((a % n) + n) % n;
  const hash = (a, b = 0) => {
    let n = (a * 374761393 + b * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, s) => { const i = Math.floor(x), f = smooth(x - i); return hash(i, s) * (1 - f) + hash(i + 1, s) * f; };
  const rnd = Math.random;
  const pick = (a) => a[(rnd() * a.length) | 0];
  const T_ = (s) => (typeof tr === 'function' ? tr(s) : s);

  const BIOMES = [
    { name: 'Çim Ovası', skyTop: '#3d9bff', skyBot: '#c3e8ff', hillA: '#86cd80', hillB: '#5fae5f', top: '#5dbb3c', topHi: '#92e65e',
      body: '#8a5a34', bodyAlt: '#744a28', floor: '#2a7fd8', floorHi: '#7cc0ff', cloud: '#ffffff', cloudA: 0.9, sky: 'sun',
      amb: 'pollen', dead: 'Suya düştün', spike: 'stone', far: 'peaks', farCol: '#9ccbea' },
    { name: 'Çöl', skyTop: '#f09a4a', skyBot: '#ffe9ad', hillA: '#e6bf74', hillB: '#cb9d55', top: '#ead58c', topHi: '#faf0bd',
      body: '#d9c075', bodyAlt: '#c3a75a', floor: '#c79f45', floorHi: '#edcb6e', cloud: '#fff1c8', cloudA: 0.55, sky: 'sun2', amb: 'sand',
      dead: 'Yutan kuma battın', spike: 'cactus', far: 'pyr', farCol: '#d79f55' },
    { name: 'Nether', skyTop: '#240505', skyBot: '#762011', hillA: '#4d1210', hillB: '#331010', top: '#a13232', topHi: '#d85a43',
      body: '#6e2222', bodyAlt: '#591a1a', floor: '#ff6a00', floorHi: '#ffd24a', cloud: '#4a1a14', cloudA: 0.7, amb: 'ember',
      dead: 'Lavda yandın', spike: 'fire', far: 'pillars', farCol: '#5c1a16' },
    { name: 'End', skyTop: '#06021a', skyBot: '#2a1250', hillA: '#33265a', hillB: '#201638', top: '#e6e3a8', topHi: '#fbf9cc',
      body: '#cfcb8e', bodyAlt: '#b8b478', floor: '#6a1fd0', floorHi: '#c08cff', cloud: '#7c5bc0', cloudA: 0.28, sky: 'moon', amb: 'mote',
      dead: 'Boşluğa düştün', spike: 'crystal', far: 'spires', farCol: '#3f2c72' },
  ].map((b) => {
    const o = { ...b };
    ['skyTop', 'skyBot', 'hillA', 'hillB', 'cloud', 'floor', 'floorHi', 'farCol'].forEach((k) => { o[k + 'C'] = hex(b[k]); });
    return o;
  });
  const biomeAt = (tx) => ((Math.max(0, tx) / BIOME_LEN) | 0) % 4;

  /* Tek zıplamayla kapatılabilecek mesafeyi simüle eder: kalkış noktasından dy piksel yukarıdaki yüzeye inme süresi. */
  const AT = {};
  for (let dy = -8; dy <= 4; dy++) {
    let y = 0, vy = -VJ, t = 0, res = 3;
    for (; t < 3; t += 1 / 240) {
      vy += GRAV * (vy > 0 ? FALLM : 1) / 240; y += vy / 240;
      if (vy > 0 && y >= -dy * T) { res = t; break; }
    }
    AT[dy] = res;
  }
  const speedAt = (tiles) => 300 + 230 * (1 - Math.exp(-tiles / 900));

  /* ------------------------------------------------------------ ses (WebAudio) */
  function makeAudio() {
    let ctx = null, muted = false;
    try { muted = localStorage.getItem('riven_afk_mute') === '1'; } catch (_) { /* depolama kapalı */ }
    const ensure = () => {
      if (!ctx) {
        try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } catch (_) { ctx = null; }
      }
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    };
    const tone = (f0, f1, dur, type = 'square', vol = 0.05, delay = 0) => {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      try {
        const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + dur + 0.03);
      } catch (_) { /* ses çalınamadı, oyun sessiz devam eder */ }
    };
    return {
      unlock: ensure,
      get muted() { return muted; },
      setMuted(v) { muted = !!v; try { localStorage.setItem('riven_afk_mute', muted ? '1' : '0'); } catch (_) { /* yoksay */ } },
      jump: () => tone(300, 640, 0.12),
      jump2: () => tone(520, 980, 0.12, 'square', 0.04),
      land: (p) => tone(150, 70, 0.08, 'triangle', 0.03 + 0.07 * p),
      coin: () => { tone(880, 880, 0.06, 'square', 0.035); tone(1320, 1320, 0.1, 'square', 0.035, 0.05); },
      gap: () => tone(500, 760, 0.1, 'triangle', 0.06),
      near: () => { tone(660, 990, 0.1, 'triangle', 0.07); tone(990, 1320, 0.12, 'triangle', 0.06, 0.08); },
      combo: () => [523, 659, 784].forEach((f, i) => tone(f, f, 0.1, 'triangle', 0.05, i * 0.06)),
      biome: () => [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.06, i * 0.1)),
      crumble: () => tone(140, 45, 0.22, 'sawtooth', 0.04),
      die: () => { tone(420, 55, 0.55, 'sawtooth', 0.07); tone(210, 40, 0.6, 'square', 0.04, 0.05); },
    };
  }

  /* ------------------------------------------------------------ oyun durumu */
  const audio = makeAudio();
  let best = 0;
  try { best = parseInt(localStorage.getItem('riven_afk_best') || '0', 10) || 0; } catch (_) { /* yoksay */ }

  let R = null;              // tek bir koşunun durumu (sayfa yenilense de korunur)
  let mode = 'ready';        // ready | play | paused | dead
  let gen = null;            // parkur üretici durumu
  let time = 0;              // animasyon saati
  let canvas = null, ctx = null, raf = 0, last = 0, acc = 0, dpr = 1;
  let ui = {};               // DOM düğmeleri
  let view = { cam: 0, A: BIOMES[0], B: BIOMES[1], t: 0 };

  const mult = () => clamp(1 + Math.floor(R.combo / 3), 1, 5);

  function reset() {
    R = {
      px: 0, py: 0, vy: 0, onGround: true, air: false, airUsed: false, coyote: COYOTE, buffer: 0, held: false,
      sf: 1, sfT: 1, kl: false, kr: false, fast: false, fastKey: false, dust: 0,
      score: 0, coins: 0, gaps: 0, near: 0, combo: 0, comboT: 0, bi: 0, bannerT: 3, banner: BIOMES[0].name,
      plats: [], coinList: [], parts: [], pops: [], lastPlat: null,
      squash: 0, run: 0, shake: 0, hidden: false, deadT: 0, reason: '', newBest: false, freeze: 0,
    };
    gen = { x: -320, h: 4, n: 0, mk: 0, bk: 0 };
    addPlat('col', 18, 4);
    R.py = R.plats[0].top;
    R.lastPlat = R.plats[0];
    genAhead();
  }

  /* ------------------------------------------------------------ parkur üretimi */
  function addPlat(kind, w, h, spikes = []) {
    const p = { x: gen.x, w, h, top: H - h * T, kind, spikes, crumbly: false, state: 0, timer: 0, mark: 0, gate: -1 };
    if (kind === 'col' && !spikes.length && w >= 3 && gen.n > 0) {     // 100 m tabelası / biyom kapısı
      const bk = Math.floor(p.x / T / BIOME_LEN), mk = Math.floor(p.x / T / 100);
      if (bk > gen.bk) { gen.bk = bk; gen.mk = mk; p.gate = bk % 4; }
      else if (mk > gen.mk) { gen.mk = mk; p.mark = mk * 100; }
    }
    R.plats.push(p);
    gen.x += w * T; gen.h = h; gen.n++;
    return p;
  }
  function coinArc(x0, x1, yBase, hgt) {
    const n = clamp(Math.round((x1 - x0) / T) + 1, 3, 6);
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      R.coinList.push({ x: x0 + u * (x1 - x0), y: yBase - hgt * Math.sin(Math.PI * u), got: false });
    }
  }
  function coinRow(p) {
    const n = clamp(p.w - 2, 2, 5), x0 = p.x + (p.w * T - (n - 1) * T * 0.8) / 2;
    for (let k = 0; k < n; k++) R.coinList.push({ x: x0 + k * T * 0.8, y: p.top - 46, got: false });
  }
  /* Boşluk genişliği: tek zıplamayla güvenle geçilebilen sınırın içinde kalır; zorlaştıkça sınıra yaklaşır,
     ileride yalnızca çift zıplamayla geçilebilen boşluklar da çıkar. */
  function gapFor(dh, d, ease) {
    const maxG = 0.72 * speedAt(gen.x / T) * AT[dh];
    let g = lerp(2 * T, Math.max(2 * T, maxG), clamp(rnd() * (0.4 + 0.6 * d) * ease, 0, 1));
    if (ease === 1 && d > 0.45 && dh <= 0 && rnd() < 0.22) g = maxG * (1.12 + rnd() * 0.3);
    return clamp(Math.round(g / T) * T, 2 * T, 9 * T);
  }
  function addSegment() {
    const d = clamp(gen.x / T / 1500, 0, 1);
    const r = rnd();
    let type = 'plain';
    if (d > 0.08 && r < 0.12) type = 'crumble';
    else if (d > 0.06 && r < 0.24) type = 'stones';
    else if (r < 0.52) type = 'spikes';
    else if (r < 0.68) type = 'stairs';
    const nh = clamp(gen.h + pick([-2, -1, -1, 0, 0, 1, 1, 2]), 3, 9);
    const g = gapFor(nh - gen.h, d, type === 'stones' || type === 'stairs' || type === 'crumble' ? 0.55 : 1);
    const prev = R.plats[R.plats.length - 1], gx0 = gen.x;
    gen.x += g;
    if (g >= 3 * T && rnd() < 0.4) coinArc(gx0 + 8, gen.x - 8, Math.min(prev.top, H - nh * T) - 40, 55 + rnd() * 20);

    if (type === 'plain') {
      const p = addPlat('col', 4 + ((rnd() * 5) | 0) + (d < 0.3 ? 2 : 0), nh);
      if (rnd() < 0.35) coinRow(p);
    } else if (type === 'spikes') {
      const w = 9 + ((rnd() * 4) | 0), sp = [3 + ((rnd() * 3) | 0)];
      if (d > 0.3 && rnd() < 0.55 && sp[0] + 4 < w - 3) sp.push(sp[0] + 4 + ((rnd() * 2) | 0));
      const p = addPlat('col', w, nh, sp);
      sp.forEach((i) => coinArc(p.x + i * T - 6, p.x + (i + 1) * T + 6, p.top - 52, 38));
    } else if (type === 'stairs') {
      const s = rnd() < 0.5 ? 1 : -1;
      let h = nh;
      for (let k = 0; k < 3; k++) {
        if (k) {
          const nx = clamp(h + s, 3, 9);
          gen.x += gapFor(nx - h, d, 0.5);
          h = nx;
        }
        const p = addPlat('col', 3, h);
        if (k === 1 && rnd() < 0.5) coinRow(p);
      }
    } else if (type === 'crumble') { // kırık taşlar: üstüne basınca yarım saniye sonra çöker, durmadan koş
      let h = nh;
      const n = 4 + ((rnd() * 3) | 0);
      for (let k = 0; k < n; k++) {
        if (k) {
          const nx = clamp(h + pick([-1, 0, 0, 0, 1]), 3, 9);
          gen.x += gapFor(nx - h, d, 0.35);
          h = nx;
        }
        const p = addPlat('slab', 2, h);
        p.crumbly = true;
        if (k % 2 === 1) R.coinList.push({ x: p.x + T, y: p.top - 46, got: false });
      }
    } else { // stones: küçük yüzen taşlar
      let h = nh;
      const n = 3 + ((rnd() * 3) | 0);
      for (let k = 0; k < n; k++) {
        if (k) {
          const nx = clamp(h + pick([-1, 0, 0, 1]), 3, 9);
          gen.x += gapFor(nx - h, d, 0.45);
          h = nx;
        }
        const p = addPlat('slab', 2, h);
        if (rnd() < 0.5) R.coinList.push({ x: p.x + T, y: p.top - 44, got: false });
      }
    }
  }
  function genAhead() {
    while (gen.x < R.px + W + 900) addSegment();
    const cut = R.px - CAM_X - 300;
    while (R.plats.length > 3 && R.plats[0].x + R.plats[0].w * T < cut) R.plats.shift();
    while (R.coinList.length && R.coinList[0].x < cut) R.coinList.shift();
  }

  /* ------------------------------------------------------------ efektler */
  function burst(x, y, n, cols, spd, up = 0) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, s = spd * (0.3 + rnd() * 0.7);
      R.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life: 0.5 + rnd() * 0.4, max: 0.9, size: 2 + rnd() * 3, col: pick(cols), g: 900 });
    }
  }
  const pop = (txt, col = '#fff') => R.pops.push({ x: R.px + PW / 2, y: R.py - PH - 8, txt, col, life: 1 });
  function addCombo(n) {
    const before = mult();
    R.combo += n; R.comboT = 4;
    if (mult() > before) { audio.combo(); pop('x' + mult(), MULT_COL[mult() - 1]); }
  }

  /* ------------------------------------------------------------ oyun akışı */
  function start() {
    reset();
    mode = 'play';
    R.freeze = 0;
    last = 0; acc = 0;
  }
  function pause() { if (mode === 'play') { mode = 'paused'; syncUI(); } }
  function resume() { if (mode === 'paused') { mode = 'play'; R.freeze = 1.5; R.held = false; syncUI(); } }
  function die(reason, liquid) {
    if (mode !== 'play') return;
    mode = 'dead';
    R.deadT = 0; R.reason = reason; R.hidden = !liquid; R.shake = 0.45;
    const sc = Math.floor(R.score);
    R.newBest = sc > best && sc > 0;
    if (R.newBest) { best = sc; try { localStorage.setItem('riven_afk_best', String(best)); } catch (_) { /* yoksay */ } }
    const b = BIOMES[biomeAt(R.px / T)];
    if (liquid) burst(R.px + PW / 2, LIQ_Y, 22, [rgb(b.floorC), rgb(b.floorHiC), '#ffffff'], 260, 320);
    else burst(R.px + PW / 2, R.py - PH / 2, 26, ['#e0ac82', '#2bb5b5', '#3b4fa0', '#6b4423'], 340, 220);
    audio.die();
    syncUI();
  }
  function pressJump() {
    audio.unlock();
    if (mode === 'ready') { start(); return; }
    if (mode === 'paused') { resume(); return; }
    if (mode === 'dead') { if (R.deadT > 0.6) start(); return; }
    R.buffer = BUFFER; R.held = true;
  }
  function tryJump() {
    if (R.onGround || R.coyote > 0) {
      R.vy = -VJ; R.onGround = false; R.air = true; R.coyote = 0; R.airUsed = false;
      R.squash = -0.45; audio.jump();
      burst(R.px + PW / 2, R.py, 6, ['#ffffff', '#d8d8d8'], 90, 40);
    } else if (!R.airUsed) {
      R.vy = -VJ2; R.airUsed = true; R.squash = -0.35; audio.jump2();
      burst(R.px + PW / 2, R.py - 4, 10, ['#9be7ff', '#ffffff'], 140, 20);
    } else return false;
    R.buffer = 0;
    return true;
  }

  function onLand(p, impact) {
    audio.land(clamp(impact / 900, 0, 1));
    R.squash = clamp(impact / 1100, 0.1, 0.55);
    const b = BIOMES[biomeAt(p.x / T)];
    burst(R.px + PW / 2, p.top, 8, [rgb(mix(hex(b.top), [255, 255, 255], 0.3)), b.body], 120, 30);
    if (R.lastPlat && R.lastPlat !== p) {
      const gapPx = p.x - (R.lastPlat.x + R.lastPlat.w * T);
      if (gapPx > 4) {
        const m = mult(), gt = Math.round(gapPx / T);
        const pts = 10 + gt * 4;
        R.gaps++; R.score += pts * m; addCombo(1); audio.gap();
        pop('+' + pts * m, '#9be7ff');
        if (R.px + PW / 2 - p.x < 0.7 * T && gapPx >= 2 * T) {
          R.near++; R.score += 15 * mult(); addCombo(1.5); audio.near();
          R.pops.push({ x: R.px + PW / 2, y: R.py - PH - 34, txt: T_('Yakın!') + ' +' + 15 * mult(), col: '#ffe066', life: 1.2 });
        }
      }
    }
    R.lastPlat = p;
  }

  function stepPhysics(dt) {
    const prevFeet = R.py;
    for (const p of R.plats) {
      if (p.state !== 1) continue;
      p.timer -= dt;
      if (p.timer <= 0) {
        p.state = 2; audio.crumble();
        burst(p.x + p.w * T / 2, p.top + 14, 14, [rgb(hex(BIOMES[biomeAt(p.x / T)].body)), '#d8d8d8', rgb(hex(BIOMES[biomeAt(p.x / T)].top))], 150, 60);
      }
    }
    R.sf += (R.sfT - R.sf) * Math.min(1, dt * 5);
    const speed = speedAt(R.px / T) * R.sf;
    R.px += speed * dt;
    R.score += (speed * dt / T) * mult();
    R.run += speed * dt * 0.045;
    R.coyote = R.onGround ? COYOTE : R.coyote - dt;
    R.buffer -= dt;
    if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 0; }
    if (R.buffer > 0) tryJump();
    if (!R.held && R.vy < -JUMPCUT) R.vy = -JUMPCUT;            // tuşu bırakınca kısa zıplama

    R.vy += GRAV * (R.vy > 0 ? FALLM : 1) * dt;
    R.fast = R.fastKey && !R.onGround;
    if (R.fast) R.vy += 3800 * dt;
    R.vy = Math.min(R.vy, R.fast ? FASTFALL : MAXFALL);
    const impact = R.vy;
    R.py += R.vy * dt;

    // iniş ve duvar çarpması
    R.onGround = false;
    const l = R.px + 4, r = R.px + PW - 4;
    for (const p of R.plats) {
      if (p.state === 2) continue;
      const pl = p.x, pr = p.x + p.w * T;
      if (r <= pl || l >= pr) continue;
      if (R.vy >= 0 && prevFeet <= p.top + 12 && R.py >= p.top) {
        R.py = p.top; R.vy = 0; R.onGround = true;
        if (p.crumbly && p.state === 0) { p.state = 1; p.timer = 0.5; }
        if (R.air) { R.air = false; R.airUsed = false; onLand(p, impact); }
        break;
      }
      if (R.py > p.top + 12 && R.px + PW > pl + 2 && R.px + PW / 2 < pl + 4) { die(T_('Duvara çarptın'), false); return; }
    }
    if (!R.onGround) R.air = true;
    else { R.dust -= dt; if (R.dust <= 0) { R.dust = 0.07; R.parts.push({ x: R.px + 6, y: R.py - 3, vx: -70 - rnd() * 40, vy: -20 - rnd() * 30, life: 0.35, max: 0.35, size: 2 + rnd() * 2, col: 'rgba(255,255,255,.75)', g: 120 }); } }

    // dikenler
    if (R.py < LIQ_Y) {
      for (const p of R.plats) {
        if (!p.spikes.length || R.px + PW < p.x || R.px > p.x + p.w * T) continue;
        for (const i of p.spikes) {
          const sx = p.x + i * T + 9, sw = T - 18, sy = p.top - 22;
          if (R.px + PW - 5 > sx && R.px + 5 < sx + sw && R.py - 2 > sy && R.py - PH + 8 < p.top) { die(T_('Dikene çarptın'), false); return; }
        }
      }
    }

    // altınlar
    const cx = R.px + PW / 2, cy = R.py - PH / 2;
    for (const c of R.coinList) {
      if (c.got || Math.abs(c.x - cx) > 30) continue;
      if (Math.hypot(c.x - cx, c.y - cy) < 26) {
        c.got = true; R.coins++;
        R.score += 10 * mult(); addCombo(0.5); audio.coin();
        burst(c.x, c.y, 6, ['#ffe066', '#fff3a8', '#ffb300'], 110, 40);
      }
    }

    // sıvıya düşme
    if (R.py > LIQ_Y + 6) { die(T_(BIOMES[biomeAt(R.px / T)].dead), true); return; }

    // biyom değişimi
    const bi = (Math.max(0, R.px / T) / BIOME_LEN) | 0;
    if (bi !== R.bi) {
      R.bi = bi;
      R.banner = BIOMES[bi % 4].name; R.bannerT = 3.2;
      R.score += 100; audio.biome(); pop('+100', '#c8ffa8');
    }
    genAhead();
  }

  /* kare başına görsel güncellemeler (fizikten bağımsız) */
  function fx(dt) {
    if (!R) return;
    for (const p of R.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    R.parts = R.parts.filter((p) => p.life > 0);
    for (const p of R.pops) { p.y -= 42 * dt; p.life -= dt; }
    R.pops = R.pops.filter((p) => p.life > 0);
    R.squash += (0 - R.squash) * Math.min(1, dt * 12);
    R.shake = Math.max(0, R.shake - dt);
    if (R.bannerT > 0) R.bannerT -= dt;
    if (mode === 'dead') R.deadT += dt;
  }

  /* ------------------------------------------------------------ çizim */
  function txt(s, x, y, size, color = '#fff', align = 'left', weight = 800) {
    ctx.font = `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawSky(b, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    if (b.sky === 'sun' || b.sky === 'sun2') {
      const r = b.sky === 'sun' ? 34 : 48, x = W * 0.8, y = 96;
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.2);
      g.addColorStop(0, b.sky === 'sun' ? 'rgba(255,248,190,.55)' : 'rgba(255,214,140,.6)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
      ctx.fillStyle = b.sky === 'sun' ? '#fff6b0' : '#fff0c8'; ctx.fillRect(x - r, y - r, r * 2, r * 2);   // blok güneş
      ctx.fillStyle = b.sky === 'sun' ? '#ffe566' : '#ffd070'; ctx.fillRect(x - r + 6, y - r + 6, r * 2 - 12, r * 2 - 12);
      ctx.fillStyle = '#fff6c8'; [[120, 70, 26], [250, 140, 40], [390, 215, 18]].forEach(([dx, dy, rr2]) => { ctx.globalAlpha = a * 0.09; ctx.beginPath(); ctx.arc(x - dx, y + dy, rr2, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = a;
    } else if (b.sky === 'moon') {
      for (let i = 0; i < 60; i++) {
        const x = mod(hash(i, 5) * W - view.cam * 0.02, W), y = hash(i, 6) * H * 0.62;
        ctx.globalAlpha = a * (0.35 + 0.65 * Math.abs(Math.sin(time * (0.8 + hash(i, 7)) + i)));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 2, 2);
      }
      ['#5dffb0', '#8d6bff', '#4dd0ff'].forEach((c, k) => {
        ctx.globalAlpha = a * 0.13; ctx.fillStyle = c; ctx.beginPath();
        for (let x = 0; x <= W; x += 24) { const y = 70 + k * 36 + Math.sin(x * 0.011 + time * 0.4 + k * 2) * 28; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        for (let x = W; x >= 0; x -= 24) ctx.lineTo(x, 130 + k * 36 + Math.sin(x * 0.009 + time * 0.3 + k) * 34);
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e9e6ff'; ctx.fillRect(W * 0.8 - 28, 70, 56, 56);
      ctx.fillStyle = '#c9c4ee'; ctx.fillRect(W * 0.8 - 14, 84, 14, 14); ctx.fillRect(W * 0.8 + 6, 104, 12, 12);
    }
    ctx.restore();
  }
  /* Çok uzaktaki silüetler: dağ, piramit, nether sütunları, End kuleleri */
  function drawFar(b, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a * 0.85; ctx.fillStyle = rgb(b.farColC);
    const base = H - 110;
    for (let i = 0; i < 7; i++) {
      const x = mod(i * 190 + hash(i, 81) * 90 - view.cam * 0.05, W + 380) - 190;
      const w = 130 + hash(i, 82) * 120, hh = 90 + hash(i, 83) * 110;
      if (b.far === 'peaks') {
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w / 2, base - hh); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x + w / 2, base - hh); ctx.lineTo(x + w / 2 + 22, base - hh + 34); ctx.lineTo(x + w / 2 - 22, base - hh + 34); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgb(b.farColC);
      } else if (b.far === 'pyr') {
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w / 2, base - hh * 0.75); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.moveTo(x + w / 2, base - hh * 0.75); ctx.lineTo(x + w, base); ctx.lineTo(x + w / 2, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgb(b.farColC);
      } else if (b.far === 'pillars') {
        const pw = 26 + hash(i, 84) * 22;
        ctx.fillRect(x, base - hh * 1.3, pw, hh * 1.3 + 120);
        ctx.fillStyle = 'rgba(255,120,40,.55)'; ctx.fillRect(x, base - hh * 1.3, pw, 6);
        ctx.fillStyle = rgb(b.farColC);
      } else {
        const pw = 14 + hash(i, 84) * 10;
        ctx.fillRect(x, base - hh * 1.6, pw, hh * 1.6 + 120);
        const iy = base - hh * 1.9 + Math.sin(time * 0.6 + i) * 6;
        ctx.fillRect(x + w * 0.35, iy, w * 0.55, 10); ctx.fillRect(x + w * 0.42, iy + 10, w * 0.4, 8); ctx.fillRect(x + w * 0.52, iy + 18, w * 0.2, 6);
      }
    }
    ctx.restore();
  }
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  /* Orta plan: platformların arkasında, daha yakın parallax ile ağaç / kaktüs / sarkıt / ada siluetleri */
  function drawMid(b, a, bi) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    const dark = mix(b.hillBC, [0, 0, 0], bi === 3 ? 0.2 : 0.38);
    ctx.fillStyle = rgb(dark);
    for (let i = 0; i < 9; i++) {
      const x = mod(i * 150 + hash(i, 101) * 80 - view.cam * 0.3, W + 300) - 150, r = hash(i, 102), base = H - 60;
      if (bi === 0) {
        ctx.fillRect(x + 18, base - 40 - r * 26, 8, 60); ctx.fillRect(x, base - 62 - r * 26, 44, 26); ctx.fillRect(x + 8, base - 82 - r * 26, 28, 22);
      } else if (bi === 1) {
        const hh = 46 + r * 40;
        ctx.fillRect(x + 14, base - hh, 11, hh + 20); ctx.fillRect(x + 4, base - hh * 0.65, 10, 7); ctx.fillRect(x + 4, base - hh * 0.65 - 14, 7, 16);
        ctx.fillRect(x + 25, base - hh * 0.5, 10, 7); ctx.fillRect(x + 28, base - hh * 0.5 - 16, 7, 18);
      } else if (bi === 2) {                     // tavandan sarkıtlar, ucu lav parıltılı
        const len = 40 + r * 90;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 20, len); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,40,.55)'; ctx.fillRect(x + 17, len - 4, 6, 6); ctx.fillStyle = rgb(dark);
      } else {                                   // süzülen küçük adalar
        const y = 150 + r * 180 + Math.sin(time * 0.7 + i) * 7;
        ctx.fillRect(x, y, 70, 10); ctx.fillRect(x + 10, y + 10, 50, 8); ctx.fillRect(x + 24, y + 18, 22, 7);
        ctx.fillStyle = 'rgba(200,150,255,.5)'; ctx.fillRect(x + 30, y - 10, 5, 10); ctx.fillStyle = rgb(dark);
      }
    }
    ctx.restore();
  }
  /* Gün ışığı huzmeleri (çim ve çöl) */
  function drawRays(a) {
    if (a <= 0.01) return;
    ctx.save();
    for (let k = 0; k < 4; k++) {
      ctx.globalAlpha = a * 0.09 * (0.6 + 0.4 * Math.sin(time * 0.7 + k * 1.7));
      ctx.fillStyle = '#fff6c8'; ctx.beginPath();
      ctx.moveTo(W * 0.8 - 14 + k * 10, 90); ctx.lineTo(W * 0.8 + 14 + k * 10, 90);
      ctx.lineTo(W * 0.8 - 160 - k * 170 + 70, H); ctx.lineTo(W * 0.8 - 160 - k * 170 - 70, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  /* Canlılar: kuşlar, hayalet, kayan yıldız */
  function drawLife(a, bi) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    if (bi === 0) {
      ctx.strokeStyle = 'rgba(35,50,70,.75)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const x = mod(i * 260 - time * (38 + i * 6) - view.cam * 0.12, W + 120) - 60, y = 70 + hash(i, 111) * 110 + Math.sin(time * 1.6 + i) * 8, f = Math.sin(time * 9 + i * 2) * 4;
        ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.lineTo(x, y + 3); ctx.lineTo(x + 9, y - f); ctx.stroke();
      }
    } else if (bi === 2) {
      const x = mod(-time * 14 - view.cam * 0.1 + 520, W + 400) - 200, y = 120 + Math.sin(time * 0.5) * 18;
      ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#e6e0dc'; ctx.fillRect(x, y, 64, 64);
      ctx.fillStyle = '#7a1d1d'; ctx.fillRect(x + 12, y + 24, 12, 8); ctx.fillRect(x + 40, y + 24, 12, 8); ctx.fillRect(x + 22, y + 44, 20, 6);
      ctx.fillStyle = '#e6e0dc'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 4 + k * 13, y + 64, 8, 18 + ((k * 7 + (time * 3 | 0)) % 3) * 5);
    } else if (bi === 3) {
      const ph = mod(time, 6) / 1.1;
      if (ph < 1) {
        const sx = W * 0.15 + hash(Math.floor(time / 6), 121) * W * 0.6 + ph * 220, sy = 30 + hash(Math.floor(time / 6), 122) * 90 + ph * 110;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = a * (1 - ph);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 46, sy - 24); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawHills(par, baseY, amp, color, seed) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 24; x += 24) {
      const wx = x + view.cam * par;
      ctx.lineTo(x, baseY - amp * (0.6 * vnoise(wx / 190, seed) + 0.4 * vnoise(wx / 70 + 9, seed + 1)));
    }
    ctx.lineTo(W + 24, H); ctx.closePath(); ctx.fill();
  }
  function drawClouds(col, alpha) {
    ctx.fillStyle = col; ctx.globalAlpha = alpha;
    for (let i = 0; i < 6; i++) {
      const x = mod(hash(i, 11) * (W + 300) - view.cam * 0.08 - time * (4 + hash(i, 12) * 6), W + 300) - 150;
      const y = 36 + hash(i, 13) * 150, w = 60 + hash(i, 14) * 50;
      ctx.fillRect(x, y, w, 16); ctx.fillRect(x + 12, y - 12, w * 0.55, 14); ctx.fillRect(x + w * 0.5, y - 6, w * 0.4, 10);
    }
    ctx.globalAlpha = 1;
  }
  function drawAmbient(kind, a) {
    if (!kind || a <= 0.01) return;
    ctx.save();
    for (let i = 0; i < 34; i++) {
      const r1 = hash(i, 1), r2 = hash(i, 2), r3 = hash(i, 3);
      if (kind === 'sand') {
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#fff0b0';
        ctx.fillRect(mod(r1 * W - (view.cam * 0.6 + time * (120 + r3 * 90)), W), r2 * H * 0.85 + Math.sin(time + i) * 6, 3, 2);
      } else if (kind === 'ember') {
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(time * 3 + i));
        ctx.fillStyle = r3 > 0.5 ? '#ff9a3c' : '#ffd24a';
        const s = 2 + r3 * 2;
        ctx.fillRect(mod(r1 * W - view.cam * 0.4 + Math.sin(time * 1.2 + i) * 20, W), mod(H - (time * (25 + r3 * 45) + r2 * H), H), s, s);
      } else if (kind === 'pollen') {
        if (i > 20) continue;
        const px = mod(r1 * W - view.cam * 0.5 + Math.sin(time * 0.8 + i) * 24, W), py = H * 0.35 + r2 * H * 0.4 + Math.cos(time * 0.6 + i) * 14;
        const gl = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.4 + i * 2));
        ctx.globalAlpha = a * 0.25 * gl; ctx.fillStyle = '#e8ff9a'; ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a * 0.9 * gl; ctx.fillStyle = '#fffbd0'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      } else {
        ctx.globalAlpha = a * (0.3 + 0.5 * Math.abs(Math.sin(time * 0.9 + i)));
        ctx.fillStyle = '#d9b8ff';
        ctx.fillRect(mod(r1 * W - view.cam * 0.2 + Math.sin(time * 0.6 + i) * 30, W), r2 * H * 0.9 + Math.cos(time * 0.5 + i) * 14, 3, 3);
      }
    }
    ctx.restore();
  }
  function drawLiquid(floor, hi) {
    const g = ctx.createLinearGradient(0, LIQ_Y - 90, 0, LIQ_Y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, rgb(mix(hi, floor, 0.4)).replace('rgb', 'rgba').replace(')', ',.22)'));
    ctx.fillStyle = g; ctx.fillRect(0, LIQ_Y - 90, W, 90);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, LIQ_Y + Math.sin((x + view.cam) * 0.03 + time * 2) * 3);
    ctx.lineTo(W + 16, H); ctx.closePath();
    ctx.fillStyle = rgb(floor); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillStyle = rgb(hi);
    for (let k = 0; k < 16; k++) ctx.fillRect(mod(k * 79 + hash(k, 91) * 60 - view.cam * 0.9 + time * 14, W + 40) - 20, LIQ_Y + 12 + hash(k, 92) * 38, 12 + hash(k, 93) * 16, 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgb(hi); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = 0; x <= W + 16; x += 16) { const y = LIQ_Y + Math.sin((x + view.cam) * 0.03 + time * 2) * 3; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }

  /* Dikenler: koyu kenar çizgisi, parlak renk ve tabanda kırmızı uyarı şeridi ile belirgin */
  function drawSpike(kind, x, top) {
    ctx.fillStyle = 'rgba(255,60,40,.38)'; ctx.fillRect(x + 2, top - 5, T - 4, 5);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#140d18';
    const box = (bx, by, bw, bh, col) => { ctx.fillStyle = col; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh); };
    if (kind === 'cactus') {
      box(x + 14, top - 34, 13, 34, '#4fb046'); box(x + 5, top - 22, 9, 7, '#4fb046'); box(x + 5, top - 30, 7, 10, '#4fb046');
      box(x + 27, top - 18, 9, 7, '#4fb046'); box(x + 29, top - 26, 7, 10, '#4fb046');
      ctx.fillStyle = '#9ef08a'; ctx.fillRect(x + 17, top - 32, 4, 30);
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 12 + (k & 1) * 16, top - 8 - k * 7, 3, 2);
    } else {
      const cols = { stone: ['#c4cfdc', '#f6f9fd'], fire: ['#e03a1c', '#ffc04d'], crystal: ['#8c4ce6', '#e8d2ff'] }[kind];
      for (let k = 0; k < 2; k++) {
        const bx = x + 3 + k * 17, tipY = top - 34 + k * 3;
        ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx + 10, tipY); ctx.lineTo(bx + 20, top); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(bx + 10, tipY + 2); ctx.lineTo(bx + 18, top - 1); ctx.lineTo(bx + 12, top - 1); ctx.closePath(); ctx.fill();
      }
    }
  }
  /* Biyoma göre küçük süsler. Yalnızca görsel; çarpışması yok. Dikenli karolara konmaz. */
  function drawDecor(p, bi, sx) {
    const ti = Math.floor(p.x / T), y = p.top, bigOk = p.kind === 'col' && !p.spikes.length && p.w >= 5;
    for (let i = 0; i < p.w; i++) {
      if (p.spikes.includes(i)) continue;
      const r = hash(ti + i, 41), c = hash(ti + i, 42), x = sx + i * T;
      const big = bigOk && i >= 1 && i <= p.w - 2 && i % 3 === 1 && r < 0.3;
      if (!big && r > 0.22) continue;
      if (bi === 0) {
        if (big) { // ağaç
          ctx.fillStyle = '#6b4423'; ctx.fillRect(x + 16, y - 56, 8, 56);
          ctx.fillStyle = '#85582f'; ctx.fillRect(x + 16, y - 56, 3, 56);
          ctx.fillStyle = '#3f9a3a'; ctx.fillRect(x - 6, y - 86, 52, 24);
          ctx.fillStyle = '#52b84a'; ctx.fillRect(x + 2, y - 108, 36, 26);
          ctx.fillStyle = '#7bd668'; ctx.fillRect(x + 6, y - 108, 14, 6); ctx.fillRect(x - 2, y - 86, 12, 5);
        } else { // çiçek
          ctx.fillStyle = '#3f9a3a'; ctx.fillRect(x + 18, y - 9, 3, 9);
          ctx.fillStyle = c < 0.33 ? '#ff5a5a' : c < 0.66 ? '#ffd23f' : '#7aa8ff'; ctx.fillRect(x + 15, y - 15, 9, 7);
          ctx.fillStyle = '#fff3a8'; ctx.fillRect(x + 18, y - 13, 3, 3);
        }
      } else if (bi === 1) {
        if (big) { // palmiye
          ctx.fillStyle = '#b58a4a'; ctx.fillRect(x + 17, y - 48, 6, 48);
          ctx.fillStyle = '#d3a762'; ctx.fillRect(x + 17, y - 48, 2, 48);
          ctx.fillStyle = '#4fa84a'; ctx.fillRect(x + 2, y - 58, 36, 6); ctx.fillRect(x + 9, y - 66, 22, 8);
          ctx.fillStyle = '#3b8a38'; ctx.fillRect(x - 4, y - 54, 8, 8); ctx.fillRect(x + 36, y - 54, 8, 8);
        } else { // kaya
          ctx.fillStyle = '#b79a5a'; ctx.fillRect(x + 9, y - 10, 22, 10);
          ctx.fillStyle = '#cfb273'; ctx.fillRect(x + 12, y - 14, 14, 5);
        }
      } else if (bi === 2) {
        if (big) { // kızıl mantar
          ctx.fillStyle = '#7a2a2a'; ctx.fillRect(x + 16, y - 44, 8, 44);
          ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 2, y - 60, 36, 16);
          ctx.fillStyle = '#ff7a59'; ctx.fillRect(x + 8, y - 56, 6, 5); ctx.fillRect(x + 24, y - 54, 6, 5);
        } else { // parlayan kor taşı
          ctx.fillStyle = '#4a1515'; ctx.fillRect(x + 10, y - 9, 20, 9);
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 4 + i);
          ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 14, y - 6, 4, 3); ctx.fillRect(x + 22, y - 8, 3, 3);
          ctx.globalAlpha = 1;
        }
      } else if (big) { // kuyruk bitkisi
        ctx.fillStyle = '#7e57c2'; ctx.fillRect(x + 18, y - 62, 4, 62); ctx.fillRect(x + 10, y - 40, 12, 4);
        ctx.fillStyle = '#b388ff'; ctx.fillRect(x + 12, y - 76, 16, 14);
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 2 + i);
        ctx.fillStyle = '#f0e0ff'; ctx.fillRect(x + 16, y - 72, 8, 6);
        ctx.globalAlpha = 1;
      } else { // küçük kristal
        ctx.fillStyle = '#9b6fe0'; ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 20, y - 16); ctx.lineTo(x + 26, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d9b8ff'; ctx.beginPath(); ctx.moveTo(x + 20, y - 16); ctx.lineTo(x + 26, y); ctx.lineTo(x + 22, y); ctx.closePath(); ctx.fill();
      }
    }
  }
  /* 100 m tabelası */
  function drawSign(x, y, meters) {
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x + 18, y - 30, 5, 30);
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 8, y - 56, 58, 26);
    ctx.fillStyle = '#a8703f'; ctx.fillRect(x - 8, y - 56, 58, 4);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 8, y - 34, 58, 4);
    txt(meters + ' m', x + 21, y - 36, 15, '#fff6d0', 'center');
  }
  /* Biyom kapısı: girdiğin biyomun renginde parlayan taş çerçeve */
  function drawGate(x, y, bi) {
    const b = BIOMES[bi], glow = rgb(b.floorHiC);
    ctx.globalAlpha = 0.22 + 0.1 * Math.sin(time * 2.4);
    ctx.fillStyle = glow; ctx.fillRect(x + 20, y - 128, 80, 128);
    ctx.globalAlpha = 1;
    for (let k = 0; k < 7; k++) {
      const sy = y - 10 - mod(time * (20 + hash(k, 61) * 28) + hash(k, 62) * 120, 118);
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 24 + hash(k, 63) * 68 + Math.sin(time * 2 + k) * 4, sy, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#241b36'; ctx.fillRect(x, y - 150, 20, 150); ctx.fillRect(x + 100, y - 150, 20, 150); ctx.fillRect(x, y - 150, 120, 22);
    ctx.fillStyle = '#3b2d57'; ctx.fillRect(x, y - 150, 6, 150); ctx.fillRect(x + 100, y - 150, 6, 150); ctx.fillRect(x, y - 150, 120, 6);
    ctx.fillStyle = glow; ctx.fillRect(x + 8, y - 144, 4, 4); ctx.fillRect(x + 108, y - 144, 4, 4); ctx.fillRect(x + 54, y - 140, 12, 8);
  }
  function drawPlat(p) {
    if (p.state === 2) return;                                        // çöktü
    const sx = Math.round(p.x - view.cam + (p.state === 1 ? (rnd() - 0.5) * 3 : 0)), w = p.w * T;
    if (sx > W || sx + w < 0) return;
    const bi = biomeAt(p.x / T), b = BIOMES[bi], bodyH = p.kind === 'col' ? H - p.top : T, ti = Math.floor(p.x / T);
    if (p.gate >= 0) drawGate(sx + (w - 120) / 2, p.top, p.gate);
    if (p.mark) drawSign(sx + T, p.top, p.mark);
    if (p.gate < 0 && !p.mark) drawDecor(p, bi, sx);
    ctx.fillStyle = b.body; ctx.fillRect(sx, p.top, w, bodyH);
    for (let j = 0; j * T < bodyH; j++) {
      const rh = Math.min(T, bodyH - j * T);
      for (let i = 0; i < p.w; i++) {
        if ((i + j) & 1) { ctx.fillStyle = b.bodyAlt; ctx.fillRect(sx + i * T, p.top + j * T, T, rh); }
        if (hash(ti + i, 50 + j) < 0.16 && rh > 22) {                  // taş benekleri
          ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(sx + i * T + 8 + hash(ti + i, 70 + j) * 16, p.top + j * T + 14, 6, 6);
        }
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(sx, p.top, 3, bodyH); ctx.fillRect(sx + w - 3, p.top, 3, bodyH);
    if (p.kind === 'slab') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx, p.top + bodyH - 6, w, 6); }
    ctx.fillStyle = b.top; ctx.fillRect(sx, p.top, w, 10);
    ctx.fillStyle = b.topHi; ctx.fillRect(sx, p.top, w, 4);
    for (let i = 0; i < p.w; i++) if (hash(ti + i, 21) < 0.35) { ctx.fillStyle = b.topHi; ctx.fillRect(sx + i * T + 10, p.top - 3, 7, 3); ctx.fillRect(sx + i * T + 24, p.top - 2, 4, 2); }
    if (p.crumbly) {                                                  // çatlaklar
      ctx.strokeStyle = p.state === 1 ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(sx + 12, p.top + 10); ctx.lineTo(sx + 22, p.top + 22); ctx.lineTo(sx + 16, p.top + 34);
      ctx.moveTo(sx + w - 18, p.top + 10); ctx.lineTo(sx + w - 28, p.top + 20); ctx.lineTo(sx + w - 20, p.top + 32);
      ctx.stroke();
    }
    if (p.kind === 'col') { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx + 3, p.top + bodyH * 0.55, w - 6, bodyH * 0.45); }
    ctx.fillStyle = b.top; ctx.fillRect(sx - 3, p.top, 3, 16); ctx.fillRect(sx + w, p.top, 3, 16);   // kenar saçağı
    for (let i = 0; i < p.w; i++) if (hash(ti + i, 111) < 0.32) { ctx.fillStyle = b.top; ctx.fillRect(sx + i * T + 12, p.top + 10, 4, 10 + hash(ti + i, 112) * 22); }   // sarkan otlar / damlalar
    for (const i of p.spikes) drawSpike(b.spike, sx + i * T, p.top);
  }

  function drawPlayer() {
    if (R.hidden) return;
    const x = R.px - view.cam, y = R.py, air = !R.onGround, ph = R.run;
    ctx.save();
    ctx.translate(x + PW / 2, y);
    ctx.scale(1 + R.squash * 0.35, 1 - R.squash * 0.35);
    ctx.translate(-PW / 2, 0);
    const sw = air ? 0 : Math.sin(ph) * 8, armA = air ? -5 : -Math.sin(ph) * 7;
    const legY = air ? 4 : 0;
    // arka kol ve bacak
    ctx.fillStyle = '#2f8a8a'; ctx.fillRect(PW / 2 - 3 + armA * 0.6, -31, 7, 14);
    ctx.fillStyle = '#2f3f86'; ctx.fillRect(PW / 2 - 9 - sw, -14, 9, 14 - legY * 0.5);
    ctx.fillStyle = '#20284f'; ctx.fillRect(PW / 2 - 9 - sw, -4, 9, 4);
    // ön bacak
    ctx.fillStyle = '#3b4fa0'; ctx.fillRect(PW / 2 + (air ? 2 : 0) + sw * 0.9, -14, 9, 14 - legY * 0.5);
    ctx.fillStyle = '#20284f'; ctx.fillRect(PW / 2 + (air ? 2 : 0) + sw * 0.9, -4, 9, 4);
    // gövde
    ctx.fillStyle = '#2bb5b5'; ctx.fillRect(2, -31, 20, 17);
    ctx.fillStyle = '#4fd6d6'; ctx.fillRect(2, -31, 20, 4);
    // ön kol
    ctx.fillStyle = '#2bb5b5'; ctx.fillRect(PW / 2 - 3 - armA, -30, 7, 13);
    ctx.fillStyle = '#e0ac82'; ctx.fillRect(PW / 2 - 3 - armA, -19, 7, 4);
    // kafa
    ctx.fillStyle = '#e0ac82'; ctx.fillRect(3, -PH, 18, 14);
    ctx.fillStyle = '#6b4423'; ctx.fillRect(3, -PH, 18, 5); ctx.fillRect(3, -PH + 5, 4, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(14, -PH + 6, 5, 4);
    ctx.fillStyle = '#2a2a55'; ctx.fillRect(17, -PH + 6, 3, 4);
    ctx.restore();
  }

  function drawHUD() {
    const m = mult(), sc = Math.floor(R.score);
    txt(String(sc), 24, 46, 38);
    txt(`${Math.floor(R.px / T)} m   ●  ${R.coins}`, 26, 72, 17, '#e8f3ec', 'left', 700);
    txt(T_('REKOR') + ' ' + Math.max(best, sc), W - 24, 36, 18, '#ffe066', 'right');
    if (R.combo > 0) {
      txt('x' + m, W - 24, 76, 40, MULT_COL[m - 1], 'right');
      const wbar = 110, fillW = wbar * clamp(R.comboT / 4, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W - 24 - wbar, 86, wbar, 8, 4); ctx.fill();
      ctx.fillStyle = MULT_COL[m - 1]; if (fillW > 1) { rr(W - 24 - wbar, 86, fillW, 8, 4); ctx.fill(); }
    }
    {
      const tiles = Math.max(0, R.px / T), idx = biomeAt(tiles), frac = (tiles % BIOME_LEN) / BIOME_LEN, bw = 200, bx = (W - bw) / 2;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(bx, 16, bw, 8, 4); ctx.fill();
      ctx.fillStyle = rgb(BIOMES[(idx + 1) % 4].floorHiC); if (frac > 0.01) { rr(bx, 16, bw * frac, 8, 4); ctx.fill(); }
      txt(T_(BIOMES[idx].name) + '  ›  ' + T_(BIOMES[(idx + 1) % 4].name), W / 2, 42, 13, '#e8f3ec', 'center', 700);
    }
    if (Math.abs(R.sf - 1) > 0.06) txt(T_('Hız') + ' x' + R.sf.toFixed(2), 26, 98, 14, R.sf > 1 ? '#ff9a7a' : '#9be7ff', 'left', 700);
    if (R.bannerT > 0) {
      ctx.save(); ctx.globalAlpha = clamp(R.bannerT, 0, 1) * clamp((3.2 - R.bannerT) * 3, 0, 1);
      txt('— ' + T_(R.banner) + ' —', W / 2, 130, 34, '#ffffff', 'center');
      ctx.restore();
    }
  }
  function panel(w, h) {
    const x = (W - w) / 2, y = (H - h) / 2;
    ctx.fillStyle = 'rgba(8,14,12,.72)'; rr(x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.5; rr(x, y, w, h, 18); ctx.stroke();
    return y;
  }
  function drawOverlay() {
    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    if (mode === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, W, H);
      const y = panel(470, 250);
      txt(T_('AFK PARKURU'), W / 2, y + 62, 40, '#ffffff', 'center');
      txt(T_('Sonsuz parkur • 4 biyom • kombo puanı'), W / 2, y + 94, 16, '#b9d3c4', 'center', 600);
      txt(T_('Boşluk / ↑ : zıpla (havada bir kez daha)'), W / 2, y + 136, 17, '#e8f3ec', 'center', 600);
      txt(T_('← →  yavaşla / hızlan     ↓  hızlı düş'), W / 2, y + 162, 17, '#e8f3ec', 'center', 600);
      ctx.save(); ctx.globalAlpha = pulse;
      txt(T_('Başlamak için Boşluk ya da tıkla'), W / 2, y + 216, 22, '#7dff9a', 'center');
      ctx.restore();
    } else if (mode === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      txt(T_('Duraklatıldı'), W / 2, H / 2 - 6, 44, '#ffffff', 'center');
      ctx.save(); ctx.globalAlpha = pulse;
      txt(T_('Devam etmek için Boşluk ya da tıkla'), W / 2, H / 2 + 36, 20, '#7dff9a', 'center');
      ctx.restore();
    } else if (mode === 'dead') {
      const a = clamp((R.deadT - 0.45) * 2.2, 0, 1);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
      const y = panel(440, 270);
      txt(T_('Oyun bitti'), W / 2, y + 56, 36, '#ff8a7a', 'center');
      txt(R.reason, W / 2, y + 84, 16, '#b9d3c4', 'center', 600);
      txt(String(Math.floor(R.score)), W / 2, y + 140, 52, '#ffffff', 'center');
      txt(R.newBest ? T_('Yeni rekor!') : T_('REKOR') + ' ' + best, W / 2, y + 168, 18, '#ffe066', 'center');
      txt(`${Math.floor(R.px / T)} m  •  ● ${R.coins}  •  ${R.gaps} ${T_('boşluk')}  •  ${R.near} ${T_('yakın')}`, W / 2, y + 196, 14, '#b9d3c4', 'center', 600);
      if (R.deadT > 0.8) { ctx.globalAlpha = a * pulse; txt(T_('Tekrar: Boşluk / R'), W / 2, y + 242, 21, '#7dff9a', 'center'); }
      ctx.restore();
    }
    if (mode === 'play' && R.freeze > 0) txt(String(Math.ceil(R.freeze / 0.5)), W / 2, H / 2 + 14, 80, '#ffffff', 'center');
  }

  function draw() {
    const tiles = Math.max(0, R.px / T), idx = biomeAt(tiles), nxt = (idx + 1) % 4;
    const frac = tiles / BIOME_LEN - Math.floor(tiles / BIOME_LEN);
    const t = frac > 0.93 ? smooth((frac - 0.93) / 0.07) : 0;
    const A = BIOMES[idx], B = BIOMES[nxt];
    view = { cam: R.px - CAM_X, A, B, t };
    const col = (k) => (t ? mix(A[k + 'C'], B[k + 'C'], t) : A[k + 'C']);

    ctx.save();
    if (R.shake > 0) ctx.translate((rnd() - 0.5) * R.shake * 22, (rnd() - 0.5) * R.shake * 22);
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.92);
    sky.addColorStop(0, rgb(col('skyTop'))); sky.addColorStop(1, rgb(col('skyBot')));
    ctx.fillStyle = sky; ctx.fillRect(-30, -30, W + 60, H + 60);
    drawSky(A, 1 - t); drawSky(B, t);
    drawClouds(rgb(col('cloud')), lerp(A.cloudA, B.cloudA, t));
    ctx.save(); ctx.translate(-160, 70); ctx.scale(0.75, 0.75); drawClouds(rgb(col('cloud')), lerp(A.cloudA, B.cloudA, t) * 0.6); ctx.restore();
    drawFar(A, 1 - t); drawFar(B, t);
    const haze = ctx.createLinearGradient(0, H * 0.35, 0, H - 100);
    haze.addColorStop(0, rgba(col('skyBot'), 0)); haze.addColorStop(1, rgba(col('skyBot'), 0.42));
    ctx.fillStyle = haze; ctx.fillRect(0, H * 0.35, W, H);
    const glow = ctx.createLinearGradient(0, H * 0.55, 0, H);
    glow.addColorStop(0, rgba(col('floorHi'), 0)); glow.addColorStop(1, rgba(col('floorHi'), 0.2));
    ctx.fillStyle = glow; ctx.fillRect(0, H * 0.55, W, H);
    drawHills(0.12, H - 150, 120, rgb(col('hillA')), 3);
    drawHills(0.26, H - 85, 90, rgb(col('hillB')), 8);
    drawRays(A.sky === 'sun' || A.sky === 'sun2' ? 1 - t : 0); drawRays(B.sky === 'sun' || B.sky === 'sun2' ? t : 0);
    drawMid(A, 1 - t, idx); drawMid(B, t, nxt);
    drawLife(1 - t, idx); drawLife(t, nxt);
    drawAmbient(A.amb, 1 - t); drawAmbient(B.amb, t);
    drawLiquid(col('floor'), col('floorHi'));

    for (const p of R.plats) drawPlat(p);

    // altınlar
    for (const c of R.coinList) {
      const sx = c.x - view.cam;
      if (c.got || sx < -20 || sx > W + 20) continue;
      const bob = Math.sin(time * 3 + c.x * 0.02) * 3, wid = 3 + Math.abs(Math.cos(time * 4 + c.x * 0.013)) * 6;
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(sx, c.y + bob, 18, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#b8860b'; ctx.fillRect(sx - wid - 1, c.y + bob - 10, wid * 2 + 2, 20);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx - wid, c.y + bob - 9, wid * 2, 18);
      ctx.fillStyle = '#fff3a8'; ctx.fillRect(sx - wid + 1, c.y + bob - 7, Math.max(1, wid - 1), 6);
    }

    const fog = ctx.createLinearGradient(0, LIQ_Y - 70, 0, H);
    fog.addColorStop(0, rgba(col('floorHi'), 0)); fog.addColorStop(1, rgba(col('floorHi'), 0.3));
    ctx.fillStyle = fog; ctx.fillRect(0, LIQ_Y - 70, W, H - LIQ_Y + 70);

    drawPlayer();

    for (const p of R.parts) {
      ctx.globalAlpha = clamp(p.life / 0.4, 0, 1);
      ctx.fillStyle = p.col; ctx.fillRect(p.x - view.cam, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const p of R.pops) {
      ctx.save(); ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      txt(p.txt, p.x - view.cam, p.y, 20, p.col, 'center');
      ctx.restore();
    }
    ctx.restore();

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.02);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.32)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (mode !== 'ready') drawHUD();
    drawOverlay();
  }

  /* ------------------------------------------------------------ tam ekran */
  let wrapEl = null;
  function fit() {          // canvas ekranda büyüyünce çözünürlüğü de büyüt: tam ekranda bulanık olmasın
    if (!canvas || !canvas.clientWidth) return;
    const sc = clamp(canvas.clientWidth * (window.devicePixelRatio || 1) / W, 0.6, 2.5), pw = Math.round(W * sc);
    if (Math.abs(canvas.width - pw) > 2) { canvas.width = pw; canvas.height = Math.round(H * sc); }
    ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
  }
  const isFull = () => !!(wrapEl && (wrapEl.classList.contains('afk-max') || document.fullscreenElement === wrapEl));
  function setFull(on) {
    if (!wrapEl) return;
    if (on) {
      wrapEl.classList.add('afk-max');
      try { const p = wrapEl.requestFullscreen && wrapEl.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* pencere içi tam ekran yeter */ }
    } else {
      wrapEl.classList.remove('afk-max');
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) { /* yoksay */ }
    }
    syncUI();
  }
  const onFsChange = () => { if (wrapEl && !document.fullscreenElement && wrapEl.classList.contains('afk-max') && !wrapEl._soft) { wrapEl.classList.remove('afk-max'); syncUI(); } };

  /* ------------------------------------------------------------ döngü */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts; time += dt;
    fit();
    if (mode === 'play') {
      if (R.freeze > 0) R.freeze -= dt;
      else {
        acc += dt;
        while (acc >= STEP && mode === 'play') { stepPhysics(STEP); acc -= STEP; }
      }
    }
    fx(dt);
    draw();
  }

  /* ------------------------------------------------------------ giriş */
  const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  function onKeyDown(e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      e.preventDefault();
      if (!e.repeat) pressJump();
    } else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); if (R) R.fastKey = true; }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); if (R) { R.kr = true; R.sfT = 1.25; } }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); if (R) { R.kl = true; R.sfT = 0.8; } }
    else if (k === 'f' || k === 'F') { e.preventDefault(); setFull(!isFull()); }
    else if (k === 'Escape' && isFull()) setFull(false);
    else if (k === 'p' || k === 'P' || k === 'Escape') { if (mode === 'play') pause(); else if (mode === 'paused') resume(); }
    else if ((k === 'r' || k === 'R' || k === 'Enter') && (mode === 'dead' || mode === 'paused' || mode === 'ready')) { if (mode !== 'dead' || R.deadT > 0.3) start(); }
    else if (k === 'm' || k === 'M') toggleMute();
  }
  function onKeyUp(e) {
    if (!R) return;
    const k = e.key;
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); R.held = false; }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') R.fastKey = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { R.kr = false; R.sfT = R.kl ? 0.8 : 1; }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { R.kl = false; R.sfT = R.kr ? 1.25 : 1; }
  }
  const onPointerDown = (e) => { e.preventDefault(); pressJump(); };
  const onPointerUp = () => { if (R) R.held = false; };
  const onHide = () => pause();
  const onVis = () => { if (document.hidden) pause(); };

  function toggleMute() { audio.setMuted(!audio.muted); syncUI(); }
  function syncUI() {
    if (!ui.mute) return;
    ui.mute.textContent = T_(audio.muted ? 'Ses: Kapalı' : 'Ses: Açık');
    ui.pause.textContent = T_(mode === 'paused' ? 'Devam' : 'Duraklat');
    ui.pause.disabled = mode !== 'play' && mode !== 'paused';
    if (ui.full) ui.full.textContent = T_(isFull() ? 'Tam ekranı kapat' : 'Tam ekran');
  }

  /* ------------------------------------------------------------ sayfa */
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('blur', onHide);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('fullscreenchange', onFsChange);
    if (wrapEl) setFull(false);
    wrapEl = null;
    if (mode === 'play') mode = 'paused';
    canvas = null; ctx = null;
  }

  function page() {
    stop();
    if (!R) reset();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas = h('canvas', { class: 'afk-canvas', width: Math.round(W * dpr), height: Math.round(H * dpr) });
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.addEventListener('pointerdown', onPointerDown);

    ui.mute = h('button', { class: 'btn small', onclick: (e) => { toggleMute(); e.currentTarget.blur(); } }, 'Ses: Açık');
    ui.pause = h('button', { class: 'btn small', onclick: (e) => { if (mode === 'play') pause(); else resume(); e.currentTarget.blur(); } }, 'Duraklat');
    ui.full = h('button', { class: 'btn small', onclick: (e) => { setFull(!isFull()); e.currentTarget.blur(); } }, 'Tam ekran');
    syncUI();

    const keys = [['Boşluk / ↑ / Tık', 'Zıpla (havada bir kez daha)'], ['↓ / S', 'Hızlı düş'], ['← → / A D', 'Yavaşla / hızlan'],
      ['P', 'Duraklat'], ['R', 'Yeniden başla'], ['F', 'Tam ekran'], ['M', 'Ses']];
    const head = h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'AFK Bölgesi'),
        h('p', { class: 'sub' }, 'Oyun yüklenirken ya da beklerken vakit geçir: sonsuz parkurda en yüksek puanı yap.')),
      h('div', { style: 'display:flex;gap:8px;align-items:center' }, ui.pause, ui.full, ui.mute));
    const wrap = h('div', { class: 'panel afk-wrap' }, canvas);
    wrapEl = wrap;
    const help = h('div', { class: 'afk-keys' },
      keys.map(([k, d]) => h('span', { class: 'afk-key' }, h('kbd', {}, k), d)));

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onHide);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFsChange);
    last = 0; acc = 0;
    raf = requestAnimationFrame(frame);
    return [head, wrap, help];
  }

  return { page, stop };
})();