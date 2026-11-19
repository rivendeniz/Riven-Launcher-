#!/usr/bin/env python3
# NOT: Yazi tipleri Linux yolunda (Poppins). Gorselleri yeniden uretmek istemezsen dokunma, hazir PNG/BMP dosyalari yeterli.
"""Riven Launcher kurulum sihirbazi gorsellerini uretir.

Kullanim:  python gen_assets.py <logo.png> <cikti_klasoru>
Uretilenler:
  intro_000.png ...   acilis sahnesi kareleri (640x360, 20 fps)
  prog_000.png ...    kurulum ilerleme animasyonu kareleri (840x300)
  wizard.bmp          karsilama / bitis sayfasi gorseli (410x785)
  small.bmp           ust bant ikonu (110x110)
"""
import math, random, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

LOGO = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

FD = "/usr/share/fonts/truetype/google-fonts/"
def font(name, size):
    return ImageFont.truetype(FD + f"Poppins-{name}.ttf", size)

G = (34, 197, 94)       # --g
G2 = (74, 222, 128)     # --g2
G3 = (22, 163, 74)      # --g3
BG0 = (4, 9, 6)
BG1 = (11, 24, 17)

logo_src = Image.open(LOGO).convert("RGBA")

def ease_out_cubic(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_in_out(x): x = min(max(x, 0), 1); return 3 * x * x - 2 * x ** 3
def ease_out_back(x):
    x = min(max(x, 0), 1); c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
def clamp01(x): return min(max(x, 0.0), 1.0)
def seg(t, a, b): return clamp01((t - a) / (b - a))

def radial_bg(w, h, cx, cy, r, c_in, c_out, power=1.0):
    ys, xs = np.mgrid[0:h, 0:w]
    d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / r
    d = np.clip(d, 0, 1) ** power
    a = np.array(c_in, float)[None, None, :]
    b = np.array(c_out, float)[None, None, :]
    return Image.fromarray((a * (1 - d[..., None]) + b * d[..., None]).astype(np.uint8), "RGB")

def glow(layer, radius, strength=1.0):
    """RGBA katmanin bulanik halesi."""
    g = layer.filter(ImageFilter.GaussianBlur(radius))
    if strength != 1.0:
        a = g.getchannel("A").point(lambda v: min(255, int(v * strength)))
        g.putalpha(a)
    return g

def paste_alpha(base, layer, xy=(0, 0), opacity=1.0):
    if opacity < 1.0:
        a = layer.getchannel("A").point(lambda v: int(v * opacity))
        layer = layer.copy(); layer.putalpha(a)
    base.alpha_composite(layer, xy)

def tinted_glow(size, shape_alpha, color, radius, strength):
    lay = Image.new("RGBA", size, color + (0,))
    lay.putalpha(shape_alpha)
    return glow(lay, radius, strength)

def logo_at(px):
    return logo_src.resize((px, px), Image.LANCZOS)

def round_mask(size, r, ss=3):
    w, h = size
    m = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * ss - 1, h * ss - 1], r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

# ---------------------------------------------------------------- parcaciklar
class Particles:
    def __init__(self, n, w, h, seed=7, vmin=14, vmax=46):
        r = random.Random(seed)
        self.items = []
        for _ in range(n):
            self.items.append(dict(
                x=r.uniform(0, w), y=r.uniform(0, h),
                v=r.uniform(vmin, vmax), s=r.uniform(0.8, 2.6),
                ph=r.uniform(0, 6.28), sw=r.uniform(4, 14), f=r.uniform(0.6, 1.8),
                c=r.choice([G, G2, G2, (190, 255, 215)])))
        self.w, self.h = w, h

    def draw(self, size, t, opacity=1.0, ss=2):
        w, h = size
        lay = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for p in self.items:
            y = (p["y"] - p["v"] * t) % self.h
            x = p["x"] + math.sin(t * p["f"] + p["ph"]) * p["sw"]
            tw = 0.55 + 0.45 * math.sin(t * 2.2 * p["f"] + p["ph"])
            # alt ve ust kenarda sonumle
            edge = min(y / 40.0, (self.h - y) / 40.0, 1.0)
            a = int(255 * clamp01(tw * edge) * opacity)
            r = p["s"] * ss
            X, Y = x * ss * w / self.w, y * ss * h / self.h
            d.ellipse([X - r, Y - r, X + r, Y + r], fill=p["c"] + (a,))
        lay = lay.resize((w, h), Image.LANCZOS)
        hal = glow(lay, 3.0, 1.6)
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        out.alpha_composite(hal); out.alpha_composite(lay)
        return out

# ---------------------------------------------------------------- ACILIS SAHNESI
IW, IH, FPS, SECS = 640, 360, 20, 5.0
NFR = int(FPS * SECS)
TAG = "Riven Launcher ile özgürlüğe hazır mısın?"
SEGS = [("Riven Launcher ile ", (232, 243, 236)), ("özgürlüğe", G2), (" hazır mısın?", (232, 243, 236))]

def char_colors(text):
    cols = []
    for s, c in SEGS:
        cols += [c] * len(s)
    assert len(cols) == len(text)
    return cols

TAGCOL = char_colors(TAG)
f_tag = font("Medium", 21)
f_tag_b = font("Bold", 21)
f_title = font("Bold", 38)
f_sub = font("Medium", 13)
f_hint = font("Regular", 11)

bg_intro = radial_bg(IW, IH, IW / 2, 130, 430, (16, 40, 27), BG0, 0.9).convert("RGBA")
logo_big = logo_at(136)
logo_mask = logo_big.getchannel("A")
part_intro = Particles(46, IW, IH, seed=11)
CX, CY = IW // 2, 126

def spaced_text_layer(text, fnt, spacing, color, size, y, alphas, rises, ss=2):
    """Harf araligi acik, harf harf belirip yukari kayan yazi (ortalanmis)."""
    w, h = size
    widths = [fnt.getlength(ch) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = (w - total) / 2
    lay = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    big = ImageFont.truetype(fnt.path, fnt.size * ss)
    for i, ch in enumerate(text):
        a = int(255 * alphas[i])
        if a > 0:
            d.text(((x) * ss, (y + rises[i]) * ss), ch, font=big, fill=color + (a,), anchor="ls")
        x += widths[i] + spacing
    return lay.resize((w, h), Image.LANCZOS)

def intro_frame(i):
    t = i / FPS
    img = bg_intro.copy()

    # arka isik nabzi
    pulse = 0.5 + 0.5 * math.sin(t * 2.4)
    halo = Image.new("RGBA", (IW, IH), (0, 0, 0, 0))
    hs = seg(t, 0.15, 1.1)
    rr = int(150 + 18 * pulse)
    ImageDraw.Draw(halo).ellipse([CX - rr, CY - rr, CX + rr, CY + rr], fill=G + (int(70 * hs),))
    halo = halo.filter(ImageFilter.GaussianBlur(46))
    img.alpha_composite(halo)

    # parcaciklar
    img.alpha_composite(part_intro.draw((IW, IH), t, opacity=clamp01(t / 0.6)))

    # sok dalgasi
    st = seg(t, 0.35, 1.45)
    if 0 < st < 1:
        rad = 50 + 250 * ease_out_cubic(st)
        ring = Image.new("RGBA", (IW * 2, IH * 2), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse([(CX - rad) * 2, (CY - rad) * 2, (CX + rad) * 2, (CY + rad) * 2],
                                     outline=G2 + (int(200 * (1 - st) ** 1.6),), width=4)
        ring = ring.resize((IW, IH), Image.LANCZOS)
        img.alpha_composite(glow(ring, 2.5, 1.2)); img.alpha_composite(ring)

    # logo
    lt = seg(t, 0.25, 1.05)
    if lt > 0:
        sc = 0.35 + 0.65 * ease_out_back(lt)
        px = max(8, int(136 * sc))
        lg = logo_big.resize((px, px), Image.LANCZOS)
        float_y = math.sin(t * 2.0) * 2.5 * seg(t, 1.0, 1.4)
        gx, gy = CX - px // 2, int(CY - px // 2 + float_y)
        gl = tinted_glow((px + 160, px + 160), Image.new("L", (px + 160, px + 160), 0), G, 1, 1)
        # logo halesi
        m = Image.new("L", (px + 160, px + 160), 0)
        m.paste(lg.getchannel("A").point(lambda v: int(v * 0.9)), (80, 80))
        gl = tinted_glow((px + 160, px + 160), m, G2, 22, 1.1 + 0.4 * pulse)
        paste_alpha(img, gl, (gx - 80, gy - 80), ease_out_cubic(lt))
        paste_alpha(img, lg, (gx, gy), ease_out_cubic(lt * 1.4))
        # parlama cizgisi (logo uzerinden gecen isik)
        sh = seg(t, 1.0, 1.6)
        if 0 < sh < 1:
            sx = int(gx - 30 + (px + 60) * ease_in_out(sh))
            band = Image.new("RGBA", (px, px), (0, 0, 0, 0))
            bd = ImageDraw.Draw(band)
            for k in range(-26, 27):
                a = int(95 * (1 - abs(k) / 26) ** 2)
                bd.line([(sx - gx + k + 18, 0), (sx - gx + k - 18, px)], fill=(255, 255, 255, a), width=2)
            band.putalpha(ImageChops.multiply(band.getchannel("A"), lg.getchannel("A")))
            img.alpha_composite(band, (gx, gy))

    # donen yay + ince halka
    at = seg(t, 0.4, 1.9)
    if at > 0:
        R = 92
        ss = 3
        lay = Image.new("RGBA", (IW * ss, IH * ss), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        base_a = int(46 * ease_out_cubic(at))
        d.ellipse([(CX - R) * ss, (CY - R) * ss, (CX + R) * ss, (CY + R) * ss], outline=G + (base_a,), width=ss * 2)
        head = -90 + 360 * 2 * ease_in_out(at)
        span = 120 * (1 - at) + 40
        n = 36
        for k in range(n):
            f = k / n
            a0 = head - span * f
            a1 = head - span * (f + 1 / n) - 1
            col = G2 + (int(255 * (1 - f) * (1 - 0.6 * seg(t, 1.6, 2.2))),)
            d.arc([(CX - R) * ss, (CY - R) * ss, (CX + R) * ss, (CY + R) * ss], a1, a0, fill=col, width=ss * 3)
        lay = lay.resize((IW, IH), Image.LANCZOS)
        img.alpha_composite(glow(lay, 3, 1.4)); img.alpha_composite(lay)

    # RIVEN LAUNCHER basligi
    word = "RIVEN"
    tt = seg(t, 1.25, 2.1)
    alphas, rises = [], []
    for k in range(len(word)):
        u = clamp01((tt - k * 0.11) / 0.45)
        alphas.append(ease_out_cubic(u)); rises.append((1 - ease_out_cubic(u)) * 16)
    title = spaced_text_layer(word, f_title, 10, (240, 250, 244), (IW, IH), 238, alphas, rises)
    img.alpha_composite(glow(title, 6, 0.7)); img.alpha_composite(title)
    st2 = seg(t, 1.9, 2.5)
    if st2 > 0:
        s = "L A U N C H E R"
        sl = spaced_text_layer("LAUNCHER", f_sub, 7, G2, (IW, IH), 259,
                               [ease_out_cubic(st2)] * 8, [(1 - ease_out_cubic(st2)) * 6] * 8)
        img.alpha_composite(sl)
        # ince cizgiler
        ln = Image.new("RGBA", (IW, IH), (0, 0, 0, 0))
        dl = ImageDraw.Draw(ln)
        wlen = int(70 * ease_out_cubic(st2))
        dl.line([(CX - 96 - wlen, 254), (CX - 96, 254)], fill=G + (int(150 * st2),), width=1)
        dl.line([(CX + 96, 254), (CX + 96 + wlen, 254)], fill=G + (int(150 * st2),), width=1)
        img.alpha_composite(ln)

    # yazan yazi (daktilo)
    ty = seg(t, 2.35, 4.25)
    n_ch = int(round(len(TAG) * ty))
    if t >= 2.3:
        lay = Image.new("RGBA", (IW * 2, IH * 2), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        full_w = f_tag.getlength(TAG)
        x0 = (IW - full_w) / 2
        big = ImageFont.truetype(f_tag.path, 42)
        bigb = ImageFont.truetype(f_tag_b.path, 42)
        yb = 316
        for k in range(n_ch):
            ch = TAG[k]
            xx = x0 + f_tag.getlength(TAG[:k])
            fnt = bigb if TAGCOL[k] == G2 else big
            d.text((xx * 2, yb * 2), ch, font=fnt, fill=TAGCOL[k] + (255,), anchor="ls")
        # imlec
        blink = (int(t * 2.2) % 2 == 0) or ty < 1
        if t < 4.75 and blink:
            cx = x0 + f_tag.getlength(TAG[:n_ch]) + 3
            d.rounded_rectangle([cx * 2, (yb - 21) * 2, (cx + 2.4) * 2, (yb + 5) * 2], 2, fill=G2 + (255,))
        lay = lay.resize((IW, IH), Image.LANCZOS)
        img.alpha_composite(glow(lay, 5, 0.55)); img.alpha_composite(lay)

    # atla ipucu
    hint = Image.new("RGBA", (IW, IH), (0, 0, 0, 0))
    ImageDraw.Draw(hint).text((IW - 14, IH - 12), "atlamak için tıkla", font=f_hint,
                              fill=(143, 168, 154, int(150 * seg(t, 0.8, 1.4))), anchor="rs")
    img.alpha_composite(hint)

    # kenar cercevesi (ince parlak)
    fr = Image.new("RGBA", (IW, IH), (0, 0, 0, 0))
    ImageDraw.Draw(fr).rounded_rectangle([0, 0, IW - 1, IH - 1], 22, outline=G + (110,), width=1)
    img.alpha_composite(fr)

    # giris ve cikis solmasi
    fin = ease_out_cubic(t / 0.45)
    fout = 1 - seg(t, 4.65, 5.0)
    k = min(fin, fout)
    base = Image.new("RGBA", (IW, IH), BG0 + (255,))
    img = Image.blend(base, img, k)
    return img.convert("RGB")

# ---------------------------------------------------------------- KURULUM ILERLEME
PW, PH = 840, 300
NP = 41
part_prog = Particles(34, PW, PH, seed=5, vmin=10, vmax=30)
panel_mask = round_mask((PW, PH), 26)
f_pct = font("Bold", 74)
f_pct_s = font("Medium", 26)
f_ttl = font("Bold", 24)
f_msg = font("Regular", 17)
f_stage = font("Medium", 13)
logo_p = logo_at(184)

STAGES = [
    (0, "Dünyalar hazırlanıyor…"),
    (18, "Dosyalar yerleştiriliyor…"),
    (45, "Motor ve modlar ayarlanıyor…"),
    (72, "Son dokunuşlar yapılıyor…"),
    (97, "Kurulum tamamlandı."),
]
def stage_msg(p):
    m = STAGES[0][1]
    for th, s in STAGES:
        if p >= th: m = s
    return m

def prog_frame(i):
    p = i * 100 / (NP - 1)       # yuzde
    f = p / 100
    t = i * 0.12                 # parcacik zamani
    img = radial_bg(PW, PH, 230, 130, 520, (18, 44, 30), BG0, 0.85).convert("RGBA")
    img.alpha_composite(part_prog.draw((PW, PH), t))

    # logo: hayalet -> renkli (alttan yukari dolma)
    LX, LY, LS = 52, (PH - 184) // 2 - 4, 184
    a = logo_p.getchannel("A")
    gray = ImageChops.multiply(Image.merge("RGBA", (logo_p.convert("L"),) * 3 + (a,)),
                               Image.new("RGBA", (LS, LS), (255, 255, 255, 255)))
    ghost = Image.merge("RGBA", tuple(gray.getchannel(k).point(lambda v: int(v * 0.30)) for k in range(3)) + (a.point(lambda v: int(v * 0.85)),))
    # hale (ilerledikce guclenir)
    m = Image.new("L", (LS + 160, LS + 160), 0)
    m.paste(a, (80, 80))
    gl = tinted_glow((LS + 160, LS + 160), m, G2, 26, 0.25 + 0.95 * f)
    img.alpha_composite(gl, (LX - 80, LY - 80))
    img.alpha_composite(ghost, (LX, LY))
    fill_h = int(LS * f)
    if fill_h > 0:
        full = logo_p.copy()
        mask = Image.new("L", (LS, LS), 0)
        ImageDraw.Draw(mask).rectangle([0, LS - fill_h, LS, LS], fill=255)
        full.putalpha(ImageChops.multiply(full.getchannel("A"), mask))
        img.alpha_composite(full, (LX, LY))
        # tarama cizgisi
        if f < 0.995:
            yy = LY + LS - fill_h
            sc = Image.new("RGBA", (LS + 120, 60), (0, 0, 0, 0))
            ImageDraw.Draw(sc).rounded_rectangle([60, 28, 60 + LS, 31], 2, fill=(200, 255, 220, 255))
            sc = glow(sc, 6, 1.6)
            ImageDraw.Draw(sc).rounded_rectangle([60, 28, 60 + LS, 31], 2, fill=(220, 255, 235, 255))
            sclm = Image.new("L", sc.size, 0)
            sclm.paste(a.point(lambda v: 255 if v > 8 else 0).filter(ImageFilter.MaxFilter(15)), (60, 30 - 30 + 0))
            # sadece logonun yaninda gorunsun diye yatay kirp
            sc2 = sc.crop((0, 0, LS + 120, 60))
            img.alpha_composite(sc2, (LX - 60, yy - 30))

    # yuzde
    TX = 300
    d = ImageDraw.Draw(img)
    pct = f"{int(round(p))}"
    wnum = f_pct.getlength(pct)
    num_layer = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    dn = ImageDraw.Draw(num_layer)
    dn.text((TX, 118), pct, font=f_pct, fill=(240, 250, 244, 255), anchor="ls")
    dn.text((TX + wnum + 6, 118), "%", font=f_pct_s, fill=G2 + (255,), anchor="ls")
    img.alpha_composite(glow(num_layer, 10, 0.55)); img.alpha_composite(num_layer)

    d = ImageDraw.Draw(img)
    d.text((TX, 160), "Riven Launcher kuruluyor", font=f_ttl, fill=(232, 243, 236, 255), anchor="ls")
    d.text((TX, 192), stage_msg(p), font=f_msg, fill=G2 + (255,), anchor="ls")

    # ince ilerleme cubugu
    bx0, bx1, by = TX, PW - 52, 226
    ss = 3
    bar = Image.new("RGBA", (PW * ss, PH * ss), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle([bx0 * ss, by * ss, bx1 * ss, (by + 8) * ss], 4 * ss, fill=(255, 255, 255, 26))
    fx = bx0 + (bx1 - bx0) * f
    if f > 0:
        # gradyan dolgu
        grad = Image.new("RGBA", (PW * ss, PH * ss), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        x_end = int(fx * ss)
        for x in range(bx0 * ss, max(x_end, bx0 * ss + 1), 2):
            u = (x - bx0 * ss) / max(1, (bx1 - bx0) * ss)
            col = tuple(int(G3[c] + (G2[c] - G3[c]) * u) for c in range(3))
            gd.line([(x, by * ss), (x, (by + 8) * ss)], fill=col + (255,), width=2)
        pill = Image.new("L", (PW * ss, PH * ss), 0)
        ImageDraw.Draw(pill).rounded_rectangle([bx0 * ss, by * ss, max(fx * ss, bx0 * ss + 8 * ss), (by + 8) * ss], 4 * ss, fill=255)
        grad.putalpha(ImageChops.multiply(grad.getchannel("A"), pill))
        bar.alpha_composite(grad)
    bar = bar.resize((PW, PH), Image.LANCZOS)
    if f > 0:
        gh = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
        ImageDraw.Draw(gh).rounded_rectangle([bx0, by + 1, max(fx, bx0 + 8), by + 7], 3, fill=G + (170,))
        img.alpha_composite(glow(gh, 7, 1.3))
    img.alpha_composite(bar)
    if 0 < f < 1:
        hd = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
        ImageDraw.Draw(hd).ellipse([fx - 5, by + 4 - 5, fx + 5, by + 4 + 5], fill=(230, 255, 240, 255))
        img.alpha_composite(glow(hd, 6, 1.8)); img.alpha_composite(hd)

    # alt yazi
    d = ImageDraw.Draw(img)
    d.text((TX, 262), "Bu işlem birkaç saniye sürer, ekranı kapatma.", font=f_stage, fill=(143, 168, 154, 255), anchor="ls")

    # panel ince cerceve
    fr = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    ImageDraw.Draw(fr).rounded_rectangle([0, 0, PW - 1, PH - 1], 26, outline=G + (90,), width=2)
    img.alpha_composite(fr)

    # yuvarlak kose disini beyaza boya (sayfa arka plani)
    out = Image.new("RGB", (PW, PH), BG0)   # kosegen disi = kurulum sahnesi rengi
    out.paste(img.convert("RGB"), (0, 0), panel_mask)
    return out

# ---------------------------------------------------------------- SIHIRBAZ GORSELI
WW, WH = 410, 785
def wizard_image():
    S = 1
    img = radial_bg(WW, WH, WW * 0.5, 230, 560, (20, 52, 35), BG0, 0.9).convert("RGBA")
    # ince izgara / kup deseni
    pat = Image.new("RGBA", (WW, WH), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pat)
    hexw = 46
    hh = hexw * math.sqrt(3) / 2
    for row in range(-1, int(WH / hh) + 2):
        for col in range(-1, int(WW / (hexw * 1.5)) + 2):
            cx = col * hexw * 1.5
            cy = row * hh + (hh / 2 if col % 2 else 0)
            pts = [(cx + hexw / 2 * math.cos(math.radians(60 * k)), cy + hexw / 2 * math.sin(math.radians(60 * k))) for k in range(6)]
            fade = clamp01(1 - abs(cy - 560) / 520) * 0.9
            pd.polygon(pts, outline=G + (int(26 * fade),))
    img.alpha_composite(pat)
    img.alpha_composite(Particles(60, WW, WH, seed=3).draw((WW, WH), 2.0))
    # logo + hale
    LS = 250
    lg = logo_at(LS)
    LX, LY = (WW - LS) // 2, 120
    m = Image.new("L", (LS + 200, LS + 200), 0); m.paste(lg.getchannel("A"), (100, 100))
    img.alpha_composite(tinted_glow((LS + 200, LS + 200), m, G2, 34, 1.4), (LX - 100, LY - 100))
    img.alpha_composite(lg, (LX, LY))
    # yansima zemini
    refl = lg.transpose(Image.FLIP_TOP_BOTTOM)
    ra = Image.new("L", refl.size, 0)
    ImageDraw.Draw(ra).rectangle([0, 0, LS, LS], fill=0)
    grad = np.linspace(46, 0, LS).astype(np.uint8)[:, None].repeat(LS, 1)
    refl.putalpha(ImageChops.multiply(refl.getchannel("A"), Image.fromarray(grad)))
    img.alpha_composite(refl.filter(ImageFilter.GaussianBlur(1.5)), (LX, LY + LS + 6))

    # yazilar
    lay = Image.new("RGBA", (WW * 2, WH * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    def center(txt, fnt_path, size, y, fill, spacing=0):
        fnt = ImageFont.truetype(fnt_path, size * 2)
        widths = [fnt.getlength(c) for c in txt]
        total = sum(widths) + spacing * 2 * (len(txt) - 1)
        x = (WW * 2 - total) / 2
        for c, w in zip(txt, widths):
            d.text((x, y * 2), c, font=fnt, fill=fill, anchor="ls"); x += w + spacing * 2
    center("RIVEN", FD + "Poppins-Bold.ttf", 44, 560, (240, 250, 244, 255), 8)
    center("L A U N C H E R", FD + "Poppins-Medium.ttf", 14, 590, G2 + (255,), 2)
    center("ÖZGÜRLÜĞE", FD + "Poppins-Light.ttf", 26, 690, (232, 243, 236, 255), 4)
    center("HAZIR MISIN?", FD + "Poppins-Bold.ttf", 26, 726, G2 + (255,), 4)
    lay = lay.resize((WW, WH), Image.LANCZOS)
    img.alpha_composite(glow(lay, 6, 0.5)); img.alpha_composite(lay)
    ln = Image.new("RGBA", (WW, WH), (0, 0, 0, 0))
    ImageDraw.Draw(ln).line([(WW // 2 - 28, 640), (WW // 2 + 28, 640)], fill=G + (200,), width=2)
    img.alpha_composite(ln)
    # alt sinir isigi
    return img.convert("RGB")

def small_image():
    S = 110
    img = Image.new("RGB", (S, S), (255, 255, 255))
    lg = logo_at(96)
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    m = Image.new("L", (S, S), 0); m.paste(lg.getchannel("A"), (7, 9))
    sh = tinted_glow((S, S), m, G, 5, 0.5)
    base = img.convert("RGBA"); base.alpha_composite(sh); base.alpha_composite(lg, (7, 7))
    return base.convert("RGB")

if __name__ == "__main__":
    only = sys.argv[3] if len(sys.argv) > 3 else "all"
    if only in ("all", "intro"):
        for i in range(NFR):
            intro_frame(i).save(os.path.join(OUT, f"intro_{i:03d}.png"), optimize=True)
        print("intro", NFR)
    if only in ("all", "prog"):
        for i in range(NP):
            prog_frame(i).save(os.path.join(OUT, f"prog_{i:03d}.png"), optimize=True)
        print("prog", NP)
    if only in ("all", "wiz"):
        wizard_image().save(os.path.join(OUT, "wizard.bmp"))
        small_image().save(os.path.join(OUT, "small.bmp"))
        print("wizard")
