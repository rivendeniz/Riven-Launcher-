"""Riven panorama: voxel dunya uretimi + yukseklik-haritasi DDA isin izleyici (numpy)."""
import numpy as np
from PIL import Image

N = 512                 # hucre sayisi (N x N)
CX = CZ = N // 2        # kamera hucresi
WATER = 46              # su seviyesi (blok)
CAM_Y = 84.0            # goz yuksekligi
MAXY = 150.0            # dunyada en yuksek nokta tavani
CLOUD_Y = CAM_Y + 38.0

# malzeme kodlari (zemin ustu)
M_GRASS, M_SAND, M_STONE, M_SNOW, M_WATER, M_DIRT, M_WOOD, M_LEAF, M_LAMP, M_PLANK, M_ROOF = range(11)


def fbm(size, octaves, base, seed, persistence=0.5):
    r = np.random.default_rng(seed)
    out = np.zeros((size, size), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        g = base * (2 ** o)
        a = r.random((g + 1, g + 1)).astype(np.float32)
        im = Image.fromarray(a, mode="F").resize((size, size), Image.BICUBIC)
        out += amp * np.asarray(im); tot += amp; amp *= persistence
    return out / tot


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def build_world(seed=5):
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    dx, dz = xx - CX, yy - CZ
    dist = np.sqrt(dx * dx + dz * dz)
    ang = np.arctan2(dz, dx)

    base = fbm(N, 6, 3, seed)
    ridge = 1.0 - np.abs(fbm(N, 5, 2, seed + 1) * 2 - 1)           # daglik sirtlar
    mount = fbm(N, 4, 2, seed + 2)

    # kamera tepesi (hafif yukselti) + etrafinda goller + uzakta daglar
    hill = 18 * np.exp(-(dist / 22.0) ** 2)
    ring = smoothstep(70, 230, dist)                                # uzaklastikca yukselir
    lake_mask = fbm(N, 3, 2, seed + 3)
    lake = smoothstep(0.47, 0.38, lake_mask) * smoothstep(14, 44, dist) * (1 - smoothstep(110, 200, dist))

    height = 46 + 17 * (base - 0.5) * 2 + hill
    height += ring * (34 * ridge ** 1.5 + 175 * np.clip(mount - 0.34, 0, 1) ** 1.15)
    height += 10 * smoothstep(20, 90, dist) * (fbm(N, 3, 3, seed + 7) - 0.5) * 2
    height -= lake * 20
    height = np.clip(height, 8, 140)
    H = np.floor(height).astype(np.int16)
    G = H.copy()

    mat = np.full((N, N), M_GRASS, np.uint8)
    mat[H <= WATER + 1] = M_SAND
    mat[(H >= 92) & (dist > 60)] = M_STONE
    mat[(H >= 78) & (dist > 70) & (fbm(N, 3, 6, seed + 4) > 0.55)] = M_STONE
    mat[(H >= 108) & (dist > 60)] = M_SNOW

    rr = np.random.default_rng(seed + 9)
    Bc = np.zeros((N, N), np.int16)
    Tc = np.zeros((N, N), np.int16)
    lamp = np.zeros((N, N), bool)

    # agaclar
    forest = fbm(N, 4, 4, seed + 5)
    tries = rr.random((N, N))
    cand = (mat == M_GRASS) & (H > WATER + 2) & (H < 92) & (dist > 12)
    tree_prob = 0.004 + 0.05 * smoothstep(0.5, 0.7, forest)
    cells = np.argwhere(cand & (tries < tree_prob))
    for iz, ix in cells:
        if ix < 4 or iz < 4 or ix > N - 5 or iz > N - 5:
            continue
        g = int(G[iz, ix])
        th = int(rr.integers(5, 8))
        spruce = H[iz, ix] > 70 or rr.random() < 0.35
        # govde
        H[iz, ix] = g + th
        # taj: kare disk
        rad = 2
        for oz in range(-rad, rad + 1):
            for ox in range(-rad, rad + 1):
                if abs(ox) == rad and abs(oz) == rad:
                    continue
                if spruce:
                    r_ = max(abs(ox), abs(oz))
                    bot, top = g + 2 + r_ * 1, g + th + 2 - r_ * 1
                    if r_ == 2:
                        bot, top = g + 3, g + 5
                    if r_ == 1:
                        bot, top = g + 3, g + th + 1
                else:
                    bot, top = g + th - 2, g + th + 1 + (1 if (abs(ox) + abs(oz) <= 1) else 0)
                x2, z2 = ix + ox, iz + oz
                if Tc[z2, x2] == 0 or top > Tc[z2, x2]:
                    if not (ox == 0 and oz == 0 and False):
                        Bc[z2, x2], Tc[z2, x2] = bot, top
        mat[iz, ix] = M_WOOD
    return finish_world(H, G, mat, Bc, Tc, dist, seed)


def cast(W, o, d, tmax=420.0, maxsteps=700):
    """o,d: (n,3) float32. Donus: t, axis(0=x yan,1=ust,2=z yan,3=alt), kind(0 zemin,1 taj), ix, iz, hit(bool)"""
    n = len(o)
    H = W["H"].astype(np.float32); Bc = W["Bc"].astype(np.float32); Tc = W["Tc"].astype(np.float32)
    out_t = np.full(n, np.inf, np.float32)
    out_axis = np.zeros(n, np.int8); out_kind = np.zeros(n, np.int8)
    out_ix = np.zeros(n, np.int32); out_iz = np.zeros(n, np.int32)

    idx = np.arange(n)
    ox, oy, oz = o[:, 0].copy(), o[:, 1].copy(), o[:, 2].copy()
    dx, dy, dz = d[:, 0].copy(), d[:, 1].copy(), d[:, 2].copy()
    # tavana kadar atla / yukari bakanlari erken ele
    with np.errstate(divide="ignore", invalid="ignore"):
        tlim = np.where(dy > 1e-6, (MAXY + 1 - oy) / dy, tmax)
        tlim = np.minimum(tlim, tmax)
        tstart = np.where((oy > MAXY) & (dy < -1e-6), (MAXY - oy) / dy, 0.0)
    keep = (tstart < tlim) & ((oy <= MAXY) | (dy < -1e-6))
    idx, ox, oy, oz, dx, dy, dz, tlim, tstart = (a[keep] for a in (idx, ox, oy, oz, dx, dy, dz, tlim, tstart))
    px = ox + dx * tstart; pz = oz + dz * tstart
    ix = np.floor(px).astype(np.int32); iz = np.floor(pz).astype(np.int32)
    sx = np.where(dx >= 0, 1, -1).astype(np.int32); sz = np.where(dz >= 0, 1, -1).astype(np.int32)
    big = 1e9
    with np.errstate(divide="ignore", invalid="ignore"):
        tdx = np.where(np.abs(dx) > 1e-9, np.abs(1.0 / dx), big).astype(np.float32)
        tdz = np.where(np.abs(dz) > 1e-9, np.abs(1.0 / dz), big).astype(np.float32)
        nx = np.where(dx >= 0, ix + 1 - px, px - ix); nz = np.where(dz >= 0, iz + 1 - pz, pz - iz)
    tx = (tstart + nx * tdx).astype(np.float32); tz = (tstart + nz * tdz).astype(np.float32)
    tcur = tstart.astype(np.float32)
    last = np.ones(len(idx), np.int8)   # baslangic: ustten giris
    for _ in range(maxsteps):
        if len(idx) == 0:
            break
        inb = (ix >= 0) & (ix < N) & (iz >= 0) & (iz < N) & (tcur < tlim)
        if not inb.all():
            idx, ox, oy, oz, dx, dy, dz, tlim, ix, iz, sx, sz, tdx, tdz, tx, tz, tcur, last = (
                a[inb] for a in (idx, ox, oy, oz, dx, dy, dz, tlim, ix, iz, sx, sz, tdx, tdz, tx, tz, tcur, last))
            if len(idx) == 0:
                break
        hc = H[iz, ix]; bc = Bc[iz, ix]; tc = Tc[iz, ix]
        t0 = tcur; t1 = np.minimum(tx, tz)
        y0 = oy + dy * t0; y1 = oy + dy * t1
        hit_t = np.full(len(idx), np.inf, np.float32)
        hit_axis = np.zeros(len(idx), np.int8); hit_kind = np.zeros(len(idx), np.int8)
        # zemin: yan
        side = y0 <= hc
        hit_t = np.where(side, t0, hit_t); hit_axis = np.where(side, last, hit_axis)
        # zemin: ust
        with np.errstate(divide="ignore", invalid="ignore"):
            top = (~side) & (dy < 0) & (y1 <= hc)
            tt = (hc - oy) / dy
        better = top & (tt < hit_t)
        hit_t = np.where(better, tt, hit_t); hit_axis = np.where(better, 1, hit_axis)
        # taj
        has = tc > 0
        if has.any():
            cside = has & (y0 >= bc) & (y0 <= tc)
            better = cside & (t0 < hit_t)
            hit_t = np.where(better, t0, hit_t); hit_axis = np.where(better, last, hit_axis); hit_kind = np.where(better, 1, hit_kind)
            with np.errstate(divide="ignore", invalid="ignore"):
                ctop = has & (y0 > tc) & (dy < 0) & (y1 <= tc)
                tt2 = (tc - oy) / dy
                cbot = has & (y0 < bc) & (dy > 0) & (y1 >= bc)
                tt3 = (bc - oy) / dy
            better = ctop & (tt2 < hit_t)
            hit_t = np.where(better, tt2, hit_t); hit_axis = np.where(better, 1, hit_axis); hit_kind = np.where(better, 1, hit_kind)
            better = cbot & (tt3 < hit_t)
            hit_t = np.where(better, tt3, hit_t); hit_axis = np.where(better, 3, hit_axis); hit_kind = np.where(better, 1, hit_kind)
        hit = np.isfinite(hit_t)
        if hit.any():
            gi = idx[hit]
            out_t[gi] = hit_t[hit]; out_axis[gi] = hit_axis[hit]; out_kind[gi] = hit_kind[hit]
            out_ix[gi] = ix[hit]; out_iz[gi] = iz[hit]
            live = ~hit
            idx, ox, oy, oz, dx, dy, dz, tlim, ix, iz, sx, sz, tdx, tdz, tx, tz, tcur, last = (
                a[live] for a in (idx, ox, oy, oz, dx, dy, dz, tlim, ix, iz, sx, sz, tdx, tdz, tx, tz, tcur, last))
            if len(idx) == 0:
                break
        # ilerle
        stepx = tx < tz
        tcur = np.where(stepx, tx, tz)
        ix = np.where(stepx, ix + sx, ix); iz = np.where(stepx, iz, iz + sz)
        tx = np.where(stepx, tx + tdx, tx); tz = np.where(stepx, tz, tz + tdz)
        last = np.where(stepx, 0, 2).astype(np.int8)
    return out_t, out_axis, out_kind, out_ix, out_iz


FACE_BASIS = None

def face_dirs(face, size, f0=(0.0, 0.0, -1.0)):
    """Minecraft kupharitasi: 0 on, 1 sag, 2 arka, 3 sol, 4 yukari, 5 asagi. Ust = +y. Sag = f x up."""
    f0 = np.array(f0, np.float32); up = np.array([0, 1, 0], np.float32)
    r0 = np.cross(f0, up)
    if face == 0: d, r, u = f0, r0, up
    elif face == 1: d, r, u = r0, -f0, up
    elif face == 2: d, r, u = -f0, -r0, up
    elif face == 3: d, r, u = -r0, f0, up
    elif face == 4: d, r, u = up, r0, -f0
    else: d, r, u = -up, r0, f0
    i = (np.arange(size, dtype=np.float32) + 0.5) / size * 2 - 1
    px, py = np.meshgrid(i, -i)
    v = d[None, None, :] + px[..., None] * r[None, None, :] + py[..., None] * u[None, None, :]
    v /= np.linalg.norm(v, axis=2, keepdims=True)
    return v.reshape(-1, 3).astype(np.float32)


def finish_world(H, G, mat, Bc, Tc, dist, seed):
    floor_ = H.copy()
    wet = H < WATER
    H = np.where(wet, WATER, H).astype(np.int16)
    G = np.where(wet, WATER, G).astype(np.int16)
    tint = fbm(N, 4, 5, seed + 21)
    tint = np.clip((tint - 0.3) / 0.4, 0, 1).astype(np.float32)
    Cm = np.full((N, N), M_LEAF, np.uint8)
    post = np.zeros((N, N), bool); win = np.zeros((N, N), bool); cabin = np.zeros((N, N), bool)
    W = dict(H=H, G=G, mat=mat, Bc=Bc, Tc=Tc, dist=dist, floor=floor_, wet=wet, tint=tint, Cm=Cm,
             post=post, win=win, cabin=cabin)
    place_cabin(W)
    return W


def place_cabin(W):
    H, G, mat, Bc, Tc, Cm = W["H"], W["G"], W["mat"], W["Bc"], W["Tc"], W["Cm"]
    best = None
    for dz in range(-125, -40):
        for dx in range(-110, 110, 1):
            ang = np.degrees(np.arctan2(dx, -dz))
            if abs(ang) > 70: continue
            z0, x0 = CZ + dz, CX + dx
            if np.hypot(dx, dz) < 62 or np.hypot(dx, dz) > 120: continue
            reg = H[z0 - 5:z0 + 6, x0 - 5:x0 + 6]
            if reg.shape != (11, 11) or W["wet"][z0 - 6:z0 + 7, x0 - 6:x0 + 7].any(): continue
            if (mat[z0 - 5:z0 + 6, x0 - 5:x0 + 6] != M_GRASS).any(): continue
            if (Tc[z0 - 5:z0 + 6, x0 - 5:x0 + 6] > 0).any(): continue
            sc = int(reg.max() - reg.min()) * 10 + abs(ang) * 0.12 + abs(np.hypot(dx, dz) - 88) * 0.1
            if best is None or sc < best[0]: best = (sc, z0, x0)
    if best is None:
        return
    _, z0, x0 = best
    g = int(np.round(H[z0 - 4:z0 + 5, x0 - 4:x0 + 5].mean()))
    for oz in range(-5, 6):
        for ox in range(-5, 6):
            H[z0 + oz, x0 + ox] = g; G[z0 + oz, x0 + ox] = g; mat[z0 + oz, x0 + ox] = M_GRASS
    for oz in range(-2, 3):
        for ox in range(-2, 3):
            if max(abs(ox), abs(oz)) == 2:
                H[z0 + oz, x0 + ox] = g + 3; W["cabin"][z0 + oz, x0 + ox] = True
    for (ox, oz) in ((2, 0), (-2, 0), (0, 2), (0, -2)):
        W["win"][z0 + oz, x0 + ox] = True
    for oz in range(-3, 4):
        for ox in range(-3, 4):
            r_ = max(abs(ox), abs(oz))
            Bc[z0 + oz, x0 + ox] = g + 3; Tc[z0 + oz, x0 + ox] = g + 4 + (3 - r_); Cm[z0 + oz, x0 + ox] = M_ROOF
    # kandiller
    for (ox, oz) in ((5, 3), (-5, 3), (4, -5), (-1, 5)):
        zz, xx = z0 + oz, x0 + ox
        if not W["wet"][zz, xx]:
            gg = int(G[zz, xx]); H[zz, xx] = gg + 3; W["post"][zz, xx] = True
    # kamera tepesinde de bir kandil
    zz, xx = CZ - 9, CX + 6
    gg = int(G[zz, xx]); H[zz, xx] = gg + 3; W["post"][zz, xx] = True
    W["cabin_pos"] = (z0, x0, g)
