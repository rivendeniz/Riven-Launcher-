"""Riven panorama: gok + su + arazi golgelendirme (gunduz / gece)."""
import numpy as np
from PIL import Image
import world as w
from world import *

F32 = np.float32
def nrm(v): v = np.asarray(v, F32); return v / np.linalg.norm(v)
def lerp(a, b, t): return a + (b - a) * t
def sstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def hash3(a, b, c=0, seed=0):
    with np.errstate(over="ignore"):
        x = (a.astype(np.uint32) * np.uint32(374761393) + b.astype(np.uint32) * np.uint32(668265263)
             + (np.asarray(c).astype(np.uint32) if np.ndim(c) else np.uint32(c)) * np.uint32(2246822519) + np.uint32(seed * 3266489917 % (2**32)))
        x = (x ^ (x >> np.uint32(13))) * np.uint32(1274126177)
        x = x ^ (x >> np.uint32(16))
        x = x * np.uint32(2654435761)
        x = x ^ (x >> np.uint32(15))
    return (x & np.uint32(0xFFFFFF)).astype(F32) / F32(16777216.0)

SUN = nrm([-0.50, 0.58, -0.64])
MOON = nrm([0.46, 0.50, -0.70])
THEMES = {
    "day": dict(L=SUN, light=np.array([1.0, 0.92, 0.76], F32) * 1.45,
                amb_sky=np.array([0.52, 0.66, 0.95], F32) * 0.62, amb_gnd=np.array([0.34, 0.33, 0.24], F32) * 0.55,
                fog=np.array([0.72, 0.85, 0.98], F32), fogd=330.0, exposure=1.0),
    "night": dict(L=MOON, light=np.array([0.40, 0.55, 1.0], F32) * 0.60,
                  amb_sky=np.array([0.16, 0.25, 0.48], F32) * 0.95, amb_gnd=np.array([0.06, 0.09, 0.15], F32) * 0.9,
                  fog=np.array([0.07, 0.13, 0.26], F32), fogd=300.0, exposure=1.0),
}

# --- gok -----------------------------------------------------------------
_r = np.random.default_rng(3)
_cloud = w.fbm(64, 4, 4, 21)                      # bulut maskesi (hucre basina)
_tab = _r.random(512).astype(F32)
def noise1d(x):
    x = np.asarray(x, F32) % 512.0
    i = np.floor(x).astype(np.int32); f = x - i
    f = f * f * (3 - 2 * f)
    return _tab[i % 512] * (1 - f) + _tab[(i + 1) % 512] * f

def sun_plane(d, S):
    up = np.array([0, 1, 0], F32)
    sr = nrm(np.cross(S, up)); su = np.cross(sr, S)
    dp = d @ S
    with np.errstate(divide="ignore", invalid="ignore"):
        a = (d @ sr) / dp; b = (d @ su) / dp
    return dp, a, b

def sky(d, o, theme, clouds=True):
    n = len(d); y = d[:, 1]
    T = THEMES[theme]; L = T["L"]
    t = np.clip(y, 0, 1)
    if theme == "day":
        hz = np.array([0.80, 0.90, 1.00], F32); zn = np.array([0.20, 0.45, 0.93], F32)
        col = lerp(hz, zn, (t ** 0.50)[:, None])
        dp = d @ L
        glow = np.exp((dp - 1) * 7.0)[:, None] * np.array([1.0, 0.80, 0.50], F32) * 0.30 + \
               np.exp((dp - 1) * 60.0)[:, None] * np.array([1.0, 0.85, 0.55], F32) * 0.45
        col = col + glow
        # gunes (kare)
        dpp, a, b = sun_plane(d, L)
        s = np.tan(np.radians(4.2))
        m = (dpp > 0) * sstep(s + 0.004, s - 0.004, np.maximum(np.abs(a), np.abs(b)))
        col = lerp(col, np.array([1.6, 1.45, 1.1], F32), np.clip(m, 0, 1)[:, None])
        if clouds:
            col = add_clouds(col, d, o, theme)
    else:
        hz = np.array([0.09, 0.17, 0.30], F32); zn = np.array([0.010, 0.020, 0.075], F32)
        col = lerp(hz, zn, (t ** 0.45)[:, None])
        col += np.array([0.03, 0.17, 0.16], F32) * ((1 - t) ** 6)[:, None] * 0.6
        # yildizlar
        m = np.argmax(np.abs(d), 1); ax = np.abs(d)[np.arange(n), m]
        u = np.where(m == 0, d[:, 2], d[:, 0]) / ax; v = np.where(m == 1, d[:, 2], d[:, 1]) / ax
        G = 150.0
        cu, cv = np.floor((u + 1) * G).astype(np.int32), np.floor((v + 1) * G).astype(np.int32)
        sg = np.sign(d[np.arange(n), m]).astype(np.int32) + 2
        hs = hash3(cu, cv, m * 7 + sg, 11)
        star = hs > 0.9935
        fu, fv = (u + 1) * G - cu, (v + 1) * G - cv
        inside = (np.abs(fu - 0.5) < 0.30) & (np.abs(fv - 0.5) < 0.30)
        br = 0.35 + 0.9 * hash3(cu, cv, m * 7 + sg, 5) ** 2
        tint = lerp(np.array([0.75, 0.85, 1.0], F32), np.array([1.0, 0.92, 0.75], F32), hash3(cu, cv, 3, 9)[:, None])
        st = (star & inside & (y > -0.05))[:, None] * br[:, None] * tint
        col = col + st * (0.4 + 0.6 * np.clip(y * 4, 0, 1))[:, None]
        # ay (kare, kraterli)
        dpp, a, b = sun_plane(d, L)
        s = np.tan(np.radians(3.6))
        inside = np.maximum(np.abs(a), np.abs(b)) < s
        m = (dpp > 0) * sstep(s + 0.003, s - 0.003, np.maximum(np.abs(a), np.abs(b)))
        ia = np.floor((np.nan_to_num(a) / s + 1) * 4).astype(np.int32); ib = np.floor((np.nan_to_num(b) / s + 1) * 4).astype(np.int32)
        crater = hash3(np.where(inside, ia, 0), np.where(inside, ib, 0), 1, 4)
        mc = np.array([0.88, 0.93, 1.05], F32) * (0.78 + 0.28 * crater)[:, None]
        col = lerp(col, mc, np.clip(m, 0, 1)[:, None])
        dp = d @ L
        col += np.exp((dp - 1) * 9.0)[:, None] * np.array([0.30, 0.42, 0.75], F32) * 0.45
        col += np.exp((dp - 1) * 90.0)[:, None] * np.array([0.5, 0.65, 1.0], F32) * 0.45
        # aurora (Riven yesili)
        phi = np.arctan2(d[:, 0], -d[:, 2]); el = np.arcsin(np.clip(y, -1, 1))
        e0 = 0.30 + 0.10 * np.sin(2 * phi + 1.3) + 0.05 * np.sin(5 * phi + 0.4)
        wid = 0.07 + 0.04 * noise1d(phi * 10)
        curtain = np.exp(-(((el - e0) / wid) ** 2))
        ray = noise1d(phi * 140) ** 1.5
        slow = noise1d(phi * 9 + 40)
        wgt = (0.5 + 0.5 * np.cos(phi - 2.35)) ** 1.2
        inten = curtain * (0.25 + 0.95 * ray) * (0.35 + 0.9 * slow) * wgt * (y > 0.02)
        hue = np.clip((el - e0) / 0.25 + 0.4, 0, 1)[:, None]
        acol = lerp(np.array([0.10, 1.0, 0.45], F32), np.array([0.45, 0.35, 0.95], F32), hue)
        col += acol * inten[:, None] * 0.85
        if clouds:
            col = add_clouds(col, d, o, theme)
    return col

def add_clouds(col, d, o, theme):
    y = d[:, 1]
    ok = y > 0.012
    t = np.where(ok, (CLOUD_Y - o[:, 1]) / np.maximum(y, 1e-4), 1e9)
    px = o[:, 0] + d[:, 0] * t; pz = o[:, 2] + d[:, 2] * t
    cs = 14.0
    cx = np.floor(px / cs).astype(np.int32); cz = np.floor(pz / cs).astype(np.int32)
    m = _cloud[cz % 64, cx % 64]
    dens = sstep(0.53, 0.58, m) if theme == "day" else sstep(0.58, 0.62, m)
    sub = hash3(cx, cz, 0, 2)
    fade = 1 - sstep(500, 1500, t)
    alpha = dens * ok * fade
    if theme == "day":
        shade = 0.90 + 0.10 * sub
        cc = np.array([0.96, 0.97, 1.0], F32) * shade[:, None]
        edge = (1 - sstep(0.50, 0.65, m))[:, None] * 0.10
        cc = cc - edge * np.array([0.25, 0.2, 0.1], F32)
        # alt taraf biraz gri-mavi
        cc = lerp(cc, np.array([0.80, 0.85, 0.95], F32), 0.35)
        alpha = alpha * 0.96
    else:
        cc = np.array([0.07, 0.10, 0.20], F32) * (0.8 + 0.5 * sub)[:, None]
        alpha = alpha * 0.55
    return lerp(col, cc, alpha[:, None])

# --- yuzey rengi ------------------------------------------------------------
PAL = {
    M_GRASS: np.array([0.27, 0.56, 0.17], F32), M_SAND: np.array([0.86, 0.78, 0.52], F32),
    M_STONE: np.array([0.46, 0.47, 0.50], F32), M_SNOW: np.array([0.95, 0.97, 1.0], F32),
    M_DIRT: np.array([0.43, 0.30, 0.19], F32), M_WOOD: np.array([0.36, 0.25, 0.14], F32),
    M_LEAF: np.array([0.10, 0.34, 0.12], F32), M_PLANK: np.array([0.62, 0.46, 0.27], F32),
    M_ROOF: np.array([0.45, 0.16, 0.14], F32), M_LAMP: np.array([1.0, 0.78, 0.40], F32),
}
NORMALS = {0: None, 1: (0, 1, 0), 3: (0, -1, 0)}

def surface(W, p, d, axis, kind, ix, iz, t, theme):
    """Albedo, emissive, normal, derinlik bilgisi."""
    n = len(p)
    H = W["H"][iz, ix].astype(F32); G = W["G"][iz, ix].astype(F32)
    mat = W["mat"][iz, ix]; wet = W["wet"][iz, ix]
    nx = np.zeros((n, 3), F32)
    nx[axis == 1, 1] = 1; nx[axis == 3, 1] = -1
    sgnx = -np.sign(d[:, 0]); sgnz = -np.sign(d[:, 2])
    nx[axis == 0, 0] = sgnx[axis == 0]; nx[axis == 2, 2] = sgnz[axis == 2]
    # texel gurultusu
    fadeN = 1 - sstep(25, 140, t)
    tu = np.where(axis == 0, p[:, 2], p[:, 0]); tv = np.where((axis == 1) | (axis == 3), p[:, 2], p[:, 1])
    ti = np.floor(tu * 16).astype(np.int32); tj = np.floor(tv * 16).astype(np.int32)
    tex = hash3(ti, tj, axis.astype(np.int32) + 3 * kind, 17) - 0.5
    lvl = np.floor(p[:, 1] - np.where(axis == 3, -1e-3, 1e-3)).astype(np.int32)
    blk = hash3(ix, iz, lvl, 29) - 0.5
    albedo = np.zeros((n, 3), F32); emis = np.zeros((n, 3), F32)
    tint = W["tint"][iz, ix][:, None]

    # --- zemin (kind 0)
    k0 = kind == 0
    depth = (H - 1 - lvl)
    top = axis == 1
    fy = p[:, 1] - np.floor(p[:, 1] - 1e-3)
    m_eff = np.where(wet, M_SAND, mat)
    base = np.zeros(n, np.uint8)
    # ust yuz: malzeme kendisi
    base = np.where(top, m_eff, base)
    # yan yuz: derinlige gore
    topblock = (depth <= 0)
    grass_side = np.where(fy > 0.75, M_GRASS, M_DIRT)
    side_m = np.where(m_eff == M_GRASS, np.where(topblock, grass_side, np.where(depth <= 3, M_DIRT, M_STONE)),
             np.where(m_eff == M_SAND, np.where(depth <= 3, M_SAND, M_STONE),
             np.where(m_eff == M_SNOW, np.where(topblock, M_SNOW, M_STONE), M_STONE)))
    # govde / yapi (G ustundeki bloklar)
    above = (lvl >= G)
    wood_side = np.where(W["cabin"][iz, ix], M_PLANK, M_WOOD)
    side_m = np.where(above, wood_side, side_m)
    base = np.where(top, np.where(W["post"][iz, ix] | (mat == M_WOOD), np.where(W["post"][iz, ix], M_LAMP, M_WOOD), m_eff), side_m)
    base = np.where(W["cabin"][iz, ix] & top, M_PLANK, base)
    base = base.astype(np.uint8)
    # kandil/lamba yan yuzlerinin ust blogu
    post = W["post"][iz, ix]
    base = np.where(post & (~top) & (lvl >= H - 1), M_LAMP, base)
    # pencereler
    win = W["win"][iz, ix] & (~top) & (lvl == G + 1) & (axis != 1)
    for m_, c in PAL.items():
        sel = k0 & (base == m_)
        if sel.any():
            albedo[sel] = c
    # canopy (kind 1)
    k1 = kind == 1
    if k1.any():
        cm = W["Cm"][iz, ix]
        leaf = k1 & (cm == M_LEAF); roof = k1 & (cm == M_ROOF)
        albedo[leaf] = PAL[M_LEAF] * (1.0 + 0.0 * tint[leaf]); albedo[roof] = PAL[M_ROOF]
    # buyuk olcekli degisim
    g_sel = k0 & (base == M_GRASS)
    albedo[g_sel] = lerp(np.array([0.22, 0.50, 0.14], F32), np.array([0.42, 0.68, 0.22], F32), tint[g_sel])
    st = k0 & (base == M_STONE)
    albedo[st] *= (0.82 + 0.35 * tint[st])
    # gurultu
    amp = 0.22 * fadeN
    albedo *= (1 + (tex * amp + blk * 0.10 * (0.4 + 0.6 * fadeN)))[:, None]
    # cicekler
    fl = g_sel & top & (hash3(ti, tj, 77, 3) > 0.9965) & (fadeN > 0.2)
    if fl.any():
        pick = hash3(ix[fl], iz[fl], 5, 8)
        albedo[fl] = np.where((pick < 0.5)[:, None], np.array([0.95, 0.9, 0.3], F32), np.array([0.9, 0.3, 0.4], F32))
    # yapraklar: delikler
    if k1.any():
        hole = k1 & (hash3(ti, tj, 55, 6) > 0.86) & (fadeN > 0.1)
        albedo[hole] *= 0.45
    # emissive
    lamp = (base == M_LAMP) & k0
    emis[lamp] = np.array([1.0, 0.72, 0.32], F32) * (2.2 if theme == "night" else 0.45)
    if win.any():
        emis[win] = np.array([1.0, 0.70, 0.30], F32) * (2.0 if theme == "night" else 0.0)
        albedo[win] = np.array([0.35, 0.50, 0.65], F32) if theme == "day" else np.array([1.0, 0.7, 0.3], F32)
    return albedo, emis, nx

def light(W, p, nx, albedo, emis, theme, shadows=True):
    T = THEMES[theme]; L = T["L"]
    ndl = np.clip(nx @ L, 0, 1)
    sh = np.ones(len(p), F32)
    if shadows:
        cand = np.nonzero(ndl > 0.01)[0]
        if len(cand):
            o2 = p[cand] + nx[cand] * 0.03
            dL = np.tile(L, (len(cand), 1))
            tt, *_ = w.cast(W, o2, dL, tmax=120.0, maxsteps=150)
            sh[cand] = np.where(np.isfinite(tt), 0.0, 1.0)
    hemi = 0.5 + 0.5 * nx[:, 1]
    amb = lerp(T["amb_gnd"], T["amb_sky"], hemi[:, None])
    # kenar aydinlik (dogal AO taklidi): yan yuzlerde alt kisim koyu
    ao = 1.0 - 0.18 * (nx[:, 1] < 0.5) * (1 - np.clip((p[:, 1] - np.floor(p[:, 1])), 0, 1)) * 0
    col = albedo * (amb * ao[:, None] + T["light"] * (ndl * sh)[:, None]) + emis
    return col

def fog_color(d, theme):
    T = THEMES[theme]; base = T["fog"]
    y = np.clip(d[:, 1], 0, 1)
    if theme == "day":
        c = base[None, :] * (1 - 0.0 * y[:, None])
        dp = d @ T["L"]
        c = c + np.exp((dp - 1) * 5.0)[:, None] * np.array([0.35, 0.22, 0.05], F32)
        return lerp(c, np.array([0.55, 0.72, 0.97], F32), (y ** 0.6 * 0.6)[:, None])
    c = base[None, :] + np.array([0.0, 0.05, 0.05], F32) * (1 - y[:, None])
    return lerp(c, np.array([0.02, 0.04, 0.13], F32), (y ** 0.6 * 0.6)[:, None])

def terrain_color(W, o, d, theme, t, axis, kind, ix, iz, shadows=True, allow_water=True, sky_for_miss=True, clouds=True, water_depth=True):
    """Bir demet isin icin renk. t=inf ise gok."""
    n = len(d)
    col = np.zeros((n, 3), F32)
    hit = np.isfinite(t)
    # gok
    if (~hit).any():
        col[~hit] = sky(d[~hit], o[~hit], theme, clouds=clouds)
    if hit.any():
        hi = np.nonzero(hit)[0]
        oh, dh, th = o[hi], d[hi], t[hi]
        ax, kd, hx, hz = axis[hi], kind[hi], ix[hi], iz[hi]
        p = oh + dh * th[:, None]
        # su mu?
        isw = (ax == 1) & (kd == 0) & W["wet"][hz, hx] & allow_water
        c = np.zeros((len(hi), 3), F32)
        land = ~isw
        if land.any():
            alb, em, nxl = surface(W, p[land], dh[land], ax[land], kd[land], hx[land], hz[land], th[land], theme)
            c[land] = light(W, p[land], nxl, alb, em, theme, shadows)
        if isw.any():
            c[isw] = water(W, p[isw], dh[isw], th[isw], hx[isw], hz[isw], theme)
        # sis
        T = THEMES[theme]
        fc = fog_color(dh, theme)
        f = 1 - np.exp(-((th / T["fogd"]) ** 1.7) * 1.4)
        c = lerp(c, fc, np.clip(f, 0, 1)[:, None])
        col[hi] = c
    return col

def water(W, p, d, t, ix, iz, theme):
    n = len(p)
    T = THEMES[theme]
    depth = np.clip(WATER - W["floor"][iz, ix].astype(F32), 0, 30)
    x, z = p[:, 0], p[:, 2]
    qx = np.floor(x * 3).astype(np.int32); qz = np.floor(z * 3).astype(np.int32)
    r1 = hash3(qx, qz, 1, 31) - 0.5; r2 = hash3(qx, qz, 2, 32) - 0.5
    fadeW = 1 - sstep(40, 200, t)
    px_ = (0.045 * r1 + 0.03 * np.sin(0.9 * x + 1.7 * z) + 0.02 * np.sin(0.35 * x - 0.6 * z)) * (0.3 + 0.7 * fadeW)
    pz_ = (0.045 * r2 + 0.03 * np.sin(1.3 * z - 0.8 * x) + 0.02 * np.sin(0.5 * z + 0.4 * x)) * (0.3 + 0.7 * fadeW)
    nn = np.stack([px_, np.ones(n, F32), pz_], 1); nn /= np.linalg.norm(nn, axis=1, keepdims=True)
    cosv = np.clip(-(d * nn).sum(1), 0.02, 1)
    r = d - 2 * (d * nn).sum(1)[:, None] * nn
    r[:, 1] = np.maximum(r[:, 1], 0.012); r /= np.linalg.norm(r, axis=1, keepdims=True)
    o2 = p + np.array([0, 0.04, 0], F32)
    tt, ax, kd, rx, rz = w.cast(W, o2, r, tmax=330.0, maxsteps=380)
    refl = terrain_color(W, o2, r, theme, tt, ax, kd, rx, rz, shadows=False, allow_water=False, clouds=True)
    # taban rengi
    if theme == "day":
        shallow = np.array([0.22, 0.68, 0.66], F32); deep = np.array([0.04, 0.24, 0.46], F32)
        lit = np.array([0.95, 0.95, 0.95], F32)
    else:
        shallow = np.array([0.03, 0.12, 0.16], F32); deep = np.array([0.008, 0.03, 0.09], F32)
        lit = np.array([0.8, 0.9, 1.0], F32)
    k = sstep(0, 16, depth)[:, None]
    body = lerp(shallow, deep, k)
    tex = (hash3(qx, qz, 9, 33) - 0.5) * 0.10 * fadeW
    body = body * (1 + tex[:, None])
    F = 0.06 + 0.94 * (1 - cosv) ** 4
    F = np.clip(F * 1.25, 0.10, 1.0)
    return lerp(body, refl, F[:, None])

# --- yuz render -------------------------------------------------------------
def tonemap(c, theme):
    c = np.maximum(c, 0)
    c = c / (1 + 0.16 * c) * 1.12
    # hafif doygunluk
    l = (c * np.array([0.3, 0.59, 0.11], F32)).sum(1, keepdims=True)
    c = lerp(l, c, 1.12 if theme == "day" else 1.18)
    return np.clip(c, 0, 1)

def render_face(W, face, size, theme, chunk=131072, ss=1):
    S = size * ss
    d = w.face_dirs(face, S)
    o0 = np.array([CX + 0.5, CAM_Y, CZ + 0.5], F32)
    out = np.zeros((len(d), 3), F32)
    for a in range(0, len(d), chunk):
        dd = d[a:a + chunk]
        o = np.tile(o0, (len(dd), 1))
        tt, ax, kd, ix, iz = w.cast(W, o, dd)
        out[a:a + chunk] = terrain_color(W, o, dd, theme, tt, ax, kd, ix, iz)
    out = tonemap(out, theme).reshape(S, S, 3)
    if ss > 1:
        out = out.reshape(size, ss, size, ss, 3).mean((1, 3))
    return (out * 255 + 0.5).astype(np.uint8)
