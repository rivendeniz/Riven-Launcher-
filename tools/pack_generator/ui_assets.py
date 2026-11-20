"""Logo, edition seridi, butonlar, overlay, pack ikonu, splashes uretimi."""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import os

F = np.float32
G7 = {
 "R": ["######.", "##...##", "##...##", "######.", "##.##..", "##..##.", "##...##"],
 "I": ["#######", "..###..", "..###..", "..###..", "..###..", "..###..", "#######"],
 "V": ["##...##", "##...##", "##...##", "##...##", ".##.##.", ".##.##.", "..###.."],
 "E": ["#######", "##.....", "##.....", "#####..", "##.....", "##.....", "#######"],
 "N": ["##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##"],
}
G5 = {
 "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
 "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
 "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
 "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
 "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
 "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
 "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
 "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
}
U = 5  # blok boyu (px)

def hexc(h): h = h.lstrip("#"); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], F)
def lerp(a, b, t): return a + (b - a) * t

def word_mask(word="RIVEN", gap=4):
    cols = []
    cells = []
    x = 0
    for ch in word:
        g = G7[ch]
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v == "#": cells.append((x + c * U, r * U))
        x += 7 * U + gap
    W = x - gap; Hh = 7 * U
    return cells, W, Hh

def make_logo(theme, canvas_w, canvas_h=44):
    cells, lw, lh = word_mask()
    ox = (canvas_w - (lw + 4)) // 2; oy = 1
    big = (canvas_w, canvas_h)
    mask = np.zeros((canvas_h, canvas_w), bool)
    face = np.zeros((canvas_h, canvas_w, 3), F)
    rng = np.random.default_rng(4)
    top, bot = (hexc("#b6ffd2"), hexc("#0f9d58")) if theme == "day" else (hexc("#a7ffd0"), hexc("#12b3a0"))
    for (cx, cy) in cells:
        x0, y0 = ox + cx, oy + cy
        for yy in range(U):
            for xx in range(U):
                X, Y = x0 + xx, y0 + yy
                if not (0 <= X < canvas_w and 0 <= Y < canvas_h): continue
                mask[Y, X] = True
                t = np.clip((Y - oy) / lh, 0, 1)
                c = lerp(top, bot, t)
                # blok kabartma: ust-sol aydinlik, alt-sag koyu
                if yy == 0 or xx == 0: c = c * 1.22 + 22
                elif yy == U - 1 or xx == U - 1: c = c * 0.78
                c = c * (1 + (rng.random() - 0.5) * 0.05)
                # capraz parlama seridi
                if 0 <= ((X + Y * 2) % 46) < 5 and yy not in (0, U - 1): c = c * 1.10 + 18
                face[Y, X] = c
    # kenar yumusatma yok (piksel stili); cikinti (extrude)
    out = np.zeros((canvas_h, canvas_w, 4), F)
    depth = 4
    ext = np.zeros_like(mask)
    for k in range(1, depth + 1):
        sh = np.zeros_like(mask); sh[k:, k:] = mask[:-k, :-k]; ext |= sh
    ext &= ~mask
    ext_col = hexc("#0e6b34") if theme == "day" else hexc("#0a5a2c")
    # cikinti derinlige gore koyulasir
    for k in range(depth, 0, -1):
        sh = np.zeros_like(mask); sh[k:, k:] = mask[:-k, :-k]
        sel = sh & ~mask
        out[sel, :3] = ext_col * (1 - 0.10 * (depth - k)); out[sel, 3] = 255
    # kontur
    m2 = mask | ext
    outline = np.zeros_like(m2)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sh = np.roll(np.roll(m2, dy, 0), dx, 1); outline |= sh
    outline &= ~m2
    out[outline, :3] = hexc("#03180d"); out[outline, 3] = 255
    out[mask, :3] = face[mask]; out[mask, 3] = 255
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    if theme == "night":
        glow = Image.new("RGBA", big, (0, 0, 0, 0))
        a = Image.fromarray((m2 * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(5))
        g = Image.new("RGBA", big, (60, 255, 150, 0)); g.putalpha(a.point(lambda v: int(min(255, v * 1.1))))
        glow = Image.alpha_composite(glow, g)
        img = Image.alpha_composite(glow, img)
    else:
        # gunduz: ustte hafif parilti noktalari
        d = ImageDraw.Draw(img)
        for (sx, sy) in ((ox + 10, oy + 6), (ox + 120, oy + 4), (ox + 168, oy + 9)):
            d.point([(sx, sy), (sx - 1, sy), (sx + 1, sy), (sx, sy - 1), (sx, sy + 1)], fill=(255, 255, 255, 255))
    return img

def logo_files(theme):
    modern = Image.new("RGBA", (256, 64), (0, 0, 0, 0))
    modern.paste(make_logo(theme, 256), (0, 0))
    legacy = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    l = make_logo(theme, 274)
    legacy.paste(l.crop((0, 0, 155, 44)), (0, 0))
    legacy.paste(l.crop((155, 0, 274, 44)), (0, 45))
    return modern, legacy

def make_edition(theme):
    im = Image.new("RGBA", (128, 14), (0, 0, 0, 0))
    px = im.load()
    text = "LAUNCHER"; sp = 3; tw = len(text) * 5 + (len(text) - 1) * sp
    w_ = tw + 14; x0 = 128 - w_ - 4
    bg = hexc("#052e16") if theme == "day" else hexc("#04140c")
    ed = hexc("#4ade80")
    for y in range(14):
        for x in range(x0, x0 + w_):
            edge = x in (x0, x0 + w_ - 1) or y in (0, 13)
            corner = (x in (x0, x0 + w_ - 1)) and (y in (0, 13))
            if corner: continue
            px[x, y] = tuple(int(v) for v in (ed if edge else bg)) + (255,)
    tx = x0 + 7
    for i, ch in enumerate(text):
        for r, row in enumerate(G5[ch]):
            for c, v in enumerate(row):
                if v == "#":
                    px[tx + i * (5 + sp) + c, 3 + r] = (240, 255, 245, 255)
    # iki yan elmas
    for (cx_) in (x0 + 3, x0 + w_ - 4):
        for (dx, dy) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            px[cx_ + dx, 7 + dy] = (74, 222, 128, 255)
    return im

def _panel(w_, h_, top, bot, outl, hi, hi_a, acc, acc_a, glow=None):
    """Yuvarlatilmis kose, cam gibi degrade, ic parlama ve alt vurgu cizgisi olan panel."""
    top, bot, outl, hi = hexc(top), hexc(bot), hexc(outl), hexc(hi)
    a = np.zeros((h_, w_, 4), F)
    for y in range(h_):
        a[y, :, :3] = lerp(top, bot, y / max(1, h_ - 1)); a[y, :, 3] = 255
    if glow:   # hover: icten parilti
        g = hexc(glow)
        for y in range(h_):
            for x in range(w_):
                e = min(x, w_ - 1 - x, y, h_ - 1 - y)
                k = max(0, 1 - e / 5.0) ** 2 * 0.55
                a[y, x, :3] = lerp(a[y, x, :3], g, k)
    a[1, 2:-2, :3] = lerp(a[1, 2:-2, :3], hi, hi_a)               # ust ic parlama
    a[2:-2, 1, :3] = lerp(a[2:-2, 1, :3], hi, hi_a * 0.45)
    if acc:
        a[-2, 2:-2, :3] = lerp(a[-2, 2:-2, :3], hexc(acc), acc_a)  # alt vurgu cizgisi
        a[-3, 2:-2, :3] = lerp(a[-3, 2:-2, :3], hexc(acc), acc_a * 0.35)
    a[0, :, :3] = outl; a[-1, :, :3] = outl; a[:, 0, :3] = outl; a[:, -1, :3] = outl
    a[0, 0, 3] = a[0, -1, 3] = a[-1, 0, 3] = a[-1, -1, 3] = 0       # yuvarlak koseler
    for (x, y) in ((1, 0), (0, 1), (w_ - 2, 0), (w_ - 1, 1), (1, h_ - 1), (0, h_ - 2), (w_ - 2, h_ - 1), (w_ - 1, h_ - 2)):
        a[y, x, 3] = 140
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")

# (ust, alt, kontur, parlama, parlama_orani, vurgu, vurgu_orani, ic_isik)
PALETTE = {
 "night": {"normal": ("#25384a", "#121c28", "#03070c", "#8fb6d8", 0.30, "#22c55e", 0.55, None),
           "hover": ("#2c6a5c", "#143a34", "#4ade80", "#d6fff0", 0.55, "#7dffb0", 1.0, "#3fe08a"),
           "disabled": ("#1c242c", "#12171c", "#080b0e", "#4a5560", 0.12, None, 0, None)},
 "day": {"normal": ("#4fd488", "#1c9a55", "#07391f", "#eafff2", 0.60, "#0b5e32", 0.55, None),
         "hover": ("#86f7b4", "#33c06f", "#ffffff", "#ffffff", 0.80, "#0f7a42", 0.7, "#c9ffe0"),
         "disabled": ("#74847a", "#5a675f", "#27302b", "#9aa89f", 0.25, None, 0, None)},
}

def make_button(kind, theme):
    return _panel(200, 20, *PALETTE[theme][kind])

def make_text_field(focused, theme):
    if theme == "night":
        args = ("#05090e", "#0b121a", "#4ade80" if focused else "#2b3d4f", "#6aa0c8", 0.12, "#22c55e" if focused else None, 0.5, None)
    else:
        args = ("#0e3a22", "#14502f", "#ffffff" if focused else "#052716", "#7fe8ab", 0.2, "#4ade80" if focused else None, 0.6, None)
    return _panel(200, 20, *args)

def make_slider_handle(hover, theme):
    k = "hover" if hover else "normal"
    return _panel(8, 20, *PALETTE[theme][k])

def make_tile(theme, alpha=255, seed=7):
    """16x16 menu arkaplani: koyu lacivert/orman yesili, cok hafif doku."""
    rng = np.random.default_rng(seed)
    base = hexc("#0d1722") if theme == "night" else hexc("#0f3d27")
    a = np.zeros((16, 16, 4), F)
    for y in range(16):
        for x in range(16):
            a[y, x, :3] = base * (1 + (rng.random() - 0.5) * 0.16) + (6 if (x + y) % 8 == 0 else 0)
            a[y, x, 3] = alpha
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")

def make_separator(theme):
    a = np.zeros((2, 32, 4), F)
    a[0, :, :3] = hexc("#4ade80") if theme == "night" else hexc("#b6ffd2"); a[0, :, 3] = 230
    a[1, :, :3] = hexc("#03150b"); a[1, :, 3] = 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")

def make_overlay(theme):
    h_ = 128; a = np.zeros((h_, 16, 4), F)
    for y in range(h_):
        t = y / (h_ - 1)
        top_a = max(0, 1 - t / 0.28) ** 1.6 * (0.34 if theme == "day" else 0.46)
        bot_a = max(0, (t - 0.55) / 0.45) ** 1.5 * (0.46 if theme == "day" else 0.58)
        al = min(0.9, top_a + bot_a)
        col = hexc("#06150d") if theme == "day" else hexc("#02060f")
        a[y, :, :3] = col; a[y, :, 3] = al * 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")

def make_icon(theme):
    s = 128
    im = Image.new("RGBA", (s, s))
    px = np.zeros((s, s, 4), F)
    y = np.linspace(0, 1, s)[:, None]
    top, bot = (hexc("#4a90ff"), hexc("#bfe6ff")) if theme == "day" else (hexc("#050a1f"), hexc("#12304a"))
    px[..., :3] = lerp(top, bot, y)[:, None, :] if False else (top + (bot - top) * y)[:, None, :].repeat(s, 1)
    px[..., 3] = 255
    base = Image.fromarray(px.astype(np.uint8), "RGBA")
    cells = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (0, 1), (4, 1), (0, 2), (4, 2)]
    logo = make_logo(theme, 256).crop((30, 0, 226, 44)).resize((196 * 2 // 3, 44 * 2 // 3), Image.NEAREST)
    base.alpha_composite(logo, ((s - logo.width) // 2, 44))
    d = ImageDraw.Draw(base)
    if theme == "day":
        d.rectangle([14, 14, 34, 34], fill=(255, 240, 170, 255))
    else:
        d.rectangle([92, 16, 110, 34], fill=(225, 235, 255, 255))
        rng = np.random.default_rng(2)
        for _ in range(26):
            d.point((int(rng.integers(0, s)), int(rng.integers(0, 40))), fill=(255, 255, 255, 255))
    return base

SPLASH_COMMON = [
 "Riven Launcher ile!", "Yeşil güçtür!", "Bugün ne inşa edeceksin?", "Riven Launcher ♥",
 "Biraz daha madene!", "Elmas bulundu... belki!", "Creeper? Hayır, bu sadece bir yaprak.",
 "Keşfetmeye hazır mısın?", "Rotayı sen çiz!", "Zamanın tadını çıkar!", "Hadi bir macera!",
 "Kendi dünyanı yarat!", "Fısss... şaka şaka!", "Sunucuda görüşürüz!", "Bir blok, bir hayal!",
 "Riven Tag ile arkadaşlarını gör!", "Pikseller de sanattır!", "Hep daha yükseğe!",
]
SPLASH_DAY = ["Günaydın!", "Güneşli bir gün!", "Gün aydınlık, iş başına!", "Bugün hava harika!", "Güneş doğdu!"]
SPLASH_NIGHT = ["İyi geceler!", "Yıldızlar çıktı!", "Aurora zamanı!", "Gece maceraya çıkma vakti!", "Ay ışığında inşaat!"]

def splashes(theme):
    extra = SPLASH_DAY if theme == "day" else SPLASH_NIGHT
    return "\n".join(extra * 3 + SPLASH_COMMON) + "\n"

def write_all(root):
    for theme in ("day", "night"):
        d = os.path.join(root, theme); os.makedirs(d, exist_ok=True)
        modern, legacy = logo_files(theme)
        modern.save(os.path.join(d, "logo_modern.png"), optimize=True)
        legacy.save(os.path.join(d, "logo_legacy.png"), optimize=True)
        make_edition(theme).save(os.path.join(d, "edition.png"), optimize=True)
        for k, n in (("normal", "button"), ("hover", "button_highlighted"), ("disabled", "button_disabled")):
            make_button(k, theme).save(os.path.join(d, n + ".png"), optimize=True)
        make_text_field(False, theme).save(os.path.join(d, "text_field.png"), optimize=True)
        make_text_field(True, theme).save(os.path.join(d, "text_field_highlighted.png"), optimize=True)
        make_button("normal", theme).save(os.path.join(d, "slider.png"), optimize=True)
        make_button("hover", theme).save(os.path.join(d, "slider_highlighted.png"), optimize=True)
        make_slider_handle(False, theme).save(os.path.join(d, "slider_handle.png"), optimize=True)
        make_slider_handle(True, theme).save(os.path.join(d, "slider_handle_highlighted.png"), optimize=True)
        make_tile(theme).save(os.path.join(d, "options_background.png"), optimize=True)
        make_tile(theme, 190, 9).save(os.path.join(d, "inworld_background.png"), optimize=True)
        make_separator(theme).save(os.path.join(d, "separator.png"), optimize=True)
        make_overlay(theme).save(os.path.join(d, "panorama_overlay.png"), optimize=True)
        make_icon(theme).save(os.path.join(d, "pack.png"), optimize=True)
        open(os.path.join(d, "splashes.txt"), "w", encoding="utf-8", newline="\n").write(splashes(theme))

if __name__ == "__main__":
    write_all("/home/claude/work/out")
    # onizleme sayfasi
    prev = Image.new("RGBA", (256 * 2 + 20, 64 * 2 + 60 + 80), (60, 60, 70, 255))
    for i, th in enumerate(("day", "night")):
        m, _ = logo_files(th); prev.alpha_composite(m, (i * 266, 0))
    prev.save("/home/claude/work/logo_prev.png")
