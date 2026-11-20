# -*- coding: utf-8 -*-
"""Riven oyun arayüzü motoru.

Minecraft ana menüsünü, butonlarını, kaydırıcılarını, sekmelerini, ipucu
kutularını, HUD'unu (1.20.2+) ve yükleme ekranı vurgularını tek bir renk
paletinden üretir. Launcher her oyun başlatışında bu paketi seçilen renge göre
yeniden oluşturup instance'ın resourcepacks klasörüne yazar.

Tasarım ilkeleri
  * "Kristal cam": koyu obsidyen paneller, 1 px kristal kenar, alta doğru
    renkli ışık ve çok hafif dither (bantlanmayı önler).
  * Dokuz dilim (nine_slice): köşe yarıçapları 3 px sınırına sığar.
  * Tamamen stdlib: Pillow/numpy gerekmez; tek dosya, hızlı ve taşınabilir.
  * Türkçe: tüm metinler, splash yazıları ve paket açıklaması Türkçe.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import struct
import zipfile
import zlib
from pathlib import Path

UI_VERSION = 51
DEFAULT_ACCENT = "#22c55e"

# (anahtar, görünen ad, renk) - launcher arayüzünde aynı sırayla gösterilir
PRESETS = (
    ("zumrut", "Zümrüt", "#22c55e"),     # varsayılan
    ("okyanus", "Okyanus", "#38bdf8"),
    ("ametist", "Ametist", "#a855f7"),
    ("gul", "Gül", "#fb7185"),
    ("kehribar", "Kehribar", "#f59e0b"),
    ("kizil", "Kızıl", "#ef4444"),
)

# Eski (dokuz dilim öncesi) sürümler için: paket biçimi -> hangi dosyalar
LEGACY_LOGO_MAX_FORMAT = 9     # 1.19.2 ve öncesi iki parçalı logo
SPRITE_MIN_FORMAT = 18         # 1.20.2+ ayrı widget/HUD dokuları
MODERN_BG_MIN_FORMAT = 18      # 1.20.2+ menu_background / ayırıcılar


# --------------------------------------------------------------------- renkler
def _norm_hex(value, fallback=DEFAULT_ACCENT):
    text = str(value or "").strip()
    if len(text) == 7 and text[0] == "#":
        try:
            int(text[1:], 16)
            return text.lower()
        except ValueError:
            pass
    return fallback


def hex_rgb(value):
    value = _norm_hex(value)
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def rgb_hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c[:3])


def mix(c1, c2, t):
    return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(3))


def shade(c, k):
    return tuple(v * k for v in c[:3])


def add(c, v):
    return tuple(v + d for d in c[:3])


def rgba(c, a=255):
    alpha = c[3] if len(c) > 3 else a
    return (int(max(0, min(255, c[0]))), int(max(0, min(255, c[1]))),
            int(max(0, min(255, c[2]))), int(max(0, min(255, alpha))))


def accent_name(value):
    value = _norm_hex(value)
    for _key, name, color in PRESETS:
        if color.lower() == value:
            return name
    return "Özel Renk"


def _seed(*parts):
    return int(hashlib.sha1(("|".join(str(p) for p in parts)).encode("utf-8")).hexdigest()[:8], 16)


# ------------------------------------------------------------------- PNG yazıcı
def _png(w, h, data):
    stride = w * 4
    raw = bytearray((stride + 1) * h)
    for y in range(h):
        o = y * (stride + 1)
        raw[o] = 0                      # filtre: yok
        raw[o + 1:o + 1 + stride] = data[y * stride:(y + 1) * stride]

    def chunk(tag, payload):
        return (struct.pack(">I", len(payload)) + tag + payload
                + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF))

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + chunk(b"IEND", b""))


# ------------------------------------------------------------------ mini canvas
class Img:
    """Küçük RGBA tuval. Tüm kanallar 0-255; alfa harmanlaması yapılır."""

    __slots__ = ("w", "h", "d")

    def __init__(self, w, h, color=None):
        self.w, self.h = int(w), int(h)
        self.d = bytearray(self.w * self.h * 4)
        if color:
            self.fill(color)

    def fill(self, c):
        r, g, b, a = rgba(c)
        row = bytes((r, g, b, a)) * self.w
        for y in range(self.h):
            self.d[y * self.w * 4:(y + 1) * self.w * 4] = row
        return self

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        r, g, b, a = rgba(c)
        if a <= 0:
            return
        i = (y * self.w + x) * 4
        d = self.d
        if a >= 255:
            d[i] = r
            d[i + 1] = g
            d[i + 2] = b
            d[i + 3] = 255
            return
        da = d[i + 3]
        if da == 0:
            d[i], d[i + 1], d[i + 2], d[i + 3] = r, g, b, a
            return
        sa = a / 255.0
        dA = da / 255.0
        oa = sa + dA * (1.0 - sa)
        if oa <= 0:
            return
        for k in range(3):
            d[i + k] = int((c[k] * sa + d[i + k] * dA * (1.0 - sa)) / oa + 0.5)
        d[i + 3] = int(oa * 255.0 + 0.5)

    def alpha(self, x, y):
        if not (0 <= x < self.w and 0 <= y < self.h):
            return 0
        return self.d[(y * self.w + x) * 4 + 3]

    def clear_px(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 4
            self.d[i:i + 4] = b"\x00\x00\x00\x00"

    def bytes(self):
        return _png(self.w, self.h, self.d)

    def paste(self, src, ox, oy):
        for y in range(src.h):
            ty = oy + y
            if not (0 <= ty < self.h):
                continue
            for x in range(src.w):
                tx = ox + x
                if not (0 <= tx < self.w):
                    continue
                i = (y * src.w + x) * 4
                a = src.d[i + 3]
                if a:
                    self.put(tx, ty, (src.d[i], src.d[i + 1], src.d[i + 2], a))
        return self


def _corner_alpha(dx, dy, r):
    """Yuvarlatılmış köşe kapsama oranı (0-1), yarım piksel örneklemeli."""
    if dx >= r or dy >= r:
        return 1.0
    cx = cy = r
    dist = math.hypot(dx + 0.5 - cx, dy + 0.5 - cy)
    return max(0.0, min(1.0, r - dist + 0.5))


def paint(img, x0, y0, x1, y1, color, radius=0):
    """Dikdörtgen/panel boyar; radius>0 ise köşeleri yumuşatır."""
    r, g, b, a = rgba(color)
    for y in range(max(0, y0), min(img.h, y1)):
        for x in range(max(0, x0), min(img.w, x1)):
            aa = 1.0
            if radius:
                dx = min(x - x0, x1 - 1 - x)
                dy = min(y - y0, y1 - 1 - y)
                if dx < radius and dy < radius:
                    aa = _corner_alpha(dx, dy, radius)
            if aa > 0:
                img.put(x, y, (r, g, b, int(a * aa + 0.5)))


def vgrad(img, x0, y0, x1, y1, c0, c1, radius=0):
    """Dikey degrade (bantlanmayı önlemek için alt piksel gürültüsü eklenir)."""
    a0, a1 = c0[3] if len(c0) > 3 else 255, c1[3] if len(c1) > 3 else 255
    span = max(1, y1 - y0 - 1)
    for y in range(max(0, y0), min(img.h, y1)):
        t = (y - y0) / span
        col = mix(c0, c1, t)
        alpha = a0 + (a1 - a0) * t
        for x in range(max(0, x0), min(img.w, x1)):
            aa = 1.0
            if radius:
                dx = min(x - x0, x1 - 1 - x)
                dy = min(y - y0, y1 - 1 - y)
                if dx < radius and dy < radius:
                    aa = _corner_alpha(dx, dy, radius)
            if aa > 0:
                img.put(x, y, (col[0], col[1], col[2], int(alpha * aa + 0.5)))


def hline(img, x0, x1, y, color):
    r, g, b, a = rgba(color)
    for x in range(max(0, x0), min(img.w, x1)):
        img.put(x, y, (r, g, b, a))


def dotted_line(img, x0, x1, y, color, step=3):
    for x in range(x0, x1, step):
        img.put(x, y, color)


# -------------------------------------------------------------------- palet
def palette(mode, accent, glass=62):
    """Mod + vurgu renginden tüm arayüz renklerini türetir."""
    mode = "day" if mode == "day" else "night"
    glass = max(0, min(100, int(glass)))
    a = hex_rgb(accent)
    hi = mix(a, (255, 255, 255), 0.58)
    mid = mix(a, (255, 255, 255), 0.18)
    lo = mix(a, (0, 0, 0), 0.46)
    ink = (5, 8, 12)
    panel_a = int(max(168, min(246, 246 - glass * 0.80)))
    if mode == "day":
        top = mix((54, 66, 84), a, 0.070)
        bot = mix((26, 34, 47), a, 0.040)
    else:
        top = mix((31, 42, 58), a, 0.055)
        bot = mix((13, 19, 30), a, 0.035)
    return {
        "mode": mode, "accent": a, "hi": hi, "mid": mid, "lo": lo, "ink": ink,
        "top": top, "bot": bot, "panel_a": panel_a, "glass": glass,
        "rim": mix(a, (255, 255, 255), 0.30),
        "rim_dim": mix(a, (0, 0, 0), 0.42),
        "ghost": mix((120, 132, 148), (0, 0, 0), 0.25),
        "warm": (255, 246, 232),
        "hud_a": int(max(150, min(232, 232 - glass * 0.55))),
    }


def _panel_base(img, p, radius=3, x0=0, y0=0, x1=None, y1=None, dim=False):
    x1 = img.w if x1 is None else x1
    y1 = img.h if y1 is None else y1
    top, bot = p["top"], p["bot"]
    if dim:
        top, bot = mix(top, p["ghost"], 0.42), mix(bot, p["ghost"], 0.30)
    a = int(p["panel_a"] * (0.80 if dim else 1.0))
    vgrad(img, x0, y0, x1, y1, (*top, a), (*bot, a), radius=radius)


def _rim(img, p, radius=3, color=None, alpha=190, inset=0):
    """1 px kristal kenar çizgisi (yuvarlatılmış)."""
    color = p["rim"] if color is None else color
    r, g, b, _ = rgba(color)
    a = alpha
    x0, y0, x1, y1 = inset, inset, img.w - inset, img.h - inset
    for y in range(y0, y1):
        for x in range(x0, x1):
            edge = x in (x0, x1 - 1) or y in (y0, y1 - 1)
            if not edge:
                continue
            aa = 1.0
            if radius:
                dx = min(x - x0, x1 - 1 - x)
                dy = min(y - y0, y1 - 1 - y)
                if dx < radius and dy < radius:
                    aa = _corner_alpha(dx, dy, radius)
            if aa > 0:
                img.put(x, y, (r, g, b, int(a * aa + 0.5)))


def _inner_light(img, p, a=26):
    """Panelin üst/left iç kenarına ince cam parlaması."""
    r, g, b = p["warm"]
    hline(img, 3, img.w - 3, 1, (r, g, b, a))
    for y in range(2, img.h - 2):
        img.put(1, y, (r, g, b, int(a * 0.40)))


def _accent_footer(img, p, alpha=120, rows=2):
    """Alt kenarda vurgu ışığı; hover'da kalınlaşır."""
    for k in range(rows):
        y = img.h - 2 - k
        a = int(alpha * (1.0 - k * 0.42))
        hline(img, 3, img.w - 3, y, (*p["mid"], a))


def _glow(img, p, strength=0.30, tint=None):
    """Alt kenara doğru yoğunlaşan hafif vurgu halesi (hover)."""
    tint = p["mid"] if tint is None else tint
    for y in range(1, img.h - 1):
        vert = 0.30 + 0.70 * ((y - 1) / max(1, img.h - 3)) ** 1.5
        for x in range(1, img.w - 1):
            edge = min(x, img.w - 1 - x, y, img.h - 1 - y)
            k = max(0.0, 1.0 - edge / 6.0) ** 2 * strength * vert
            if k > 0:
                img.put(x, y, (*tint, int(k * 255)))


def _bottom_shadow(img, p, alpha=70, rows=2):
    """Panelin alt iç kenarına derinlik veren gölge."""
    for k in range(rows):
        y = img.h - 3 - k
        hline(img, 2, img.w - 2, y, (*p["ink"], int(alpha * (1.0 - k * 0.45))))


# ------------------------------------------------------------------- dokular
def t_button(p, kind):
    img = Img(200, 20)
    dim = kind == "disabled"
    _panel_base(img, p, 3, dim=dim)
    if kind == "hover":
        vgrad(img, 0, 0, 200, 20, (*p["mid"], 18), (*p["accent"], 30), radius=3)
        _glow(img, p, 0.30)
        _rim(img, p, 3, p["rim"], 215)
        _inner_light(img, p, 54)
        _accent_footer(img, p, 205, 2)
        # köşe kristalleri
        for (x, y) in ((2, 2), (197, 2), (2, 17), (197, 17)):
            img.put(x, y, (*p["hi"], 140))
    elif kind == "disabled":
        _rim(img, p, 3, p["ghost"], 105)
        _inner_light(img, p, 10)
        hline(img, 3, 197, 17, (*p["ghost"], 34))
    else:
        _rim(img, p, 3, p["rim_dim"], 170)
        _inner_light(img, p, 44)
        hline(img, 3, 197, 2, (*p["warm"], 12))        # cam yansıması: ikinci ince parlak satır
        _accent_footer(img, p, 96, 1)
    _bottom_shadow(img, p, 58 if kind == "hover" else (38 if dim else 64), 2)
    return img


def t_text_field(p, focused):
    img = Img(200, 20)
    # içe gömük cam: üst koyu, alt aydınlık
    vgrad(img, 0, 0, 200, 20, (*mix(p["bot"], p["ink"], 0.32), 240),
          (*mix(p["bot"], p["top"], 0.62), 240), radius=3)
    _rim(img, p, 3, p["rim"] if focused else p["rim_dim"], 220 if focused else 115)
    hline(img, 3, 197, 1, (*p["ink"], 165))
    hline(img, 3, 197, 2, (*p["ink"], 70))
    _bottom_shadow(img, p, 42, 1)
    if focused:
        _accent_footer(img, p, 170, 1)
        for (x, y) in ((2, 2), (197, 2), (2, 17), (197, 17)):
            img.put(x, y, (*p["hi"], 110))
    else:
        hline(img, 3, 197, 18, (*p["mid"], 30))
    return img


def t_slider(p, hover):
    img = Img(200, 20)
    vgrad(img, 0, 0, 200, 20, (*mix(p["bot"], p["top"], 0.48), 240),
          (*mix(p["bot"], p["ink"], 0.22), 240))
    _rim(img, p, 0, p["rim"] if hover else p["rim_dim"], 175 if hover else 110)
    hline(img, 1, 199, 1, (*p["ink"], 150))
    hline(img, 1, 199, 18, (*p["mid"], 60 if hover else 34))
    _bottom_shadow(img, p, 46, 1)
    if hover:
        _glow(img, p, 0.20)
    return img


def t_slider_handle(p, hover):
    img = Img(8, 20)
    vgrad(img, 0, 0, 8, 20, (*p["hi"], 255), (*p["accent"], 255), radius=2)
    _rim(img, p, 2, (255, 255, 255), 130 if hover else 95, inset=0)
    hline(img, 2, 6, 2, (255, 255, 255, 180))
    hline(img, 2, 6, 17, (*p["ink"], 80))
    for y in range(5, 16, 3):
        img.put(4, y, (*p["ink"], 80))
        img.put(3, y, (255, 255, 255, 70))
    if hover:
        _glow(img, p, 0.30, (255, 255, 255))
    return img


def _check_mark(img, color=(255, 255, 255, 255)):
    """20x20 kutuda kalın onay işareti: kısa kol + uzun kol."""
    arm1 = ((4, 10), (5, 11), (6, 12), (7, 13))
    arm2 = ((7, 13), (8, 12), (9, 11), (10, 10), (11, 9), (12, 8), (13, 7), (14, 6))
    for pts in (arm1, arm2):
        for (x, y) in pts:
            img.put(x, y, color)
            img.put(x, y + 1, (*color[:3], int(color[3] * 0.70)))


def t_checkbox(p, checked, hover):
    img = Img(20, 20)
    if checked:
        vgrad(img, 1, 1, 19, 19, (*p["mid"], 250), (*p["lo"], 250), radius=4)
        _rim(img, p, 4, (255, 255, 255), 140)
        hline(img, 4, 16, 2, (255, 255, 255, 90))
        _check_mark(img)
        if hover:
            _glow(img, p, 0.24, (255, 255, 255))
    else:
        vgrad(img, 1, 1, 19, 19, (*mix(p["bot"], p["ink"], 0.30), 240),
              (*mix(p["bot"], p["top"], 0.55), 240), radius=4)
        _rim(img, p, 4, p["rim"] if hover else p["rim_dim"], 190 if hover else 120)
        if hover:
            _glow(img, p, 0.18)
    return img


def t_tab(p, selected, hover):
    img = Img(130, 24)
    if selected:
        vgrad(img, 0, 0, 130, 24, (*mix(p["top"], p["mid"], 0.16), 250),
              (*p["bot"], 250), radius=0)
        hline(img, 0, 130, 0, (*p["hi"], 210))
        hline(img, 0, 130, 1, (*p["mid"], 120))
        hline(img, 0, 130, 2, (*p["mid"], 40))
        for x in range(0, 130):
            img.put(x, 3, (*p["ink"], 34))
        for x in range(4, 126):
            img.put(x, 23, (*p["mid"], 150))
        # üst köşeler
        img.put(0, 0, (0, 0, 0, 0))
        img.put(129, 0, (0, 0, 0, 0))
    else:
        vgrad(img, 0, 0, 130, 24, (*mix(p["bot"], p["ink"], 0.45), 232),
              (*mix(p["bot"], p["ink"], 0.72), 232), radius=0)
        hline(img, 0, 130, 0, (*p["rim_dim"], 110 if hover else 72))
        hline(img, 0, 130, 1, (*p["mid"], 30 if hover else 16))
        hline(img, 0, 130, 23, (*p["ink"], 120))
        img.put(0, 0, (0, 0, 0, 0))
        img.put(129, 0, (0, 0, 0, 0))
        if hover:
            hline(img, 0, 130, 2, (*p["mid"], 44))
    return img


def t_popup(p):
    img = Img(236, 34)
    vgrad(img, 0, 0, 236, 34, (*p["top"], 250), (*p["bot"], 250), radius=6)
    _bottom_shadow(img, p, 70, 2)
    _rim(img, p, 6, p["rim"], 120)
    _inner_light(img, p, 32)
    _accent_footer(img, p, 120, 2)
    return img


def t_tooltip_bg(p):
    img = Img(100, 100)
    vgrad(img, 0, 0, 100, 100, (*mix(p["bot"], p["ink"], 0.55), 244),
          (*mix(p["bot"], p["ink"], 0.20), 244), radius=5)
    _rim(img, p, 5, p["rim_dim"], 130)
    hline(img, 6, 94, 1, (*p["warm"], 22))
    return img


def t_tooltip_frame(p):
    img = Img(100, 100)
    # renk, eşya nadirliğine göre oyun tarafından çarpılır -> açık gri bırakılır
    _rim(img, p, 6, (255, 255, 255), 70, inset=1)
    img.clear_px(1, 1)
    return img


def t_scroller(p, background=False):
    img = Img(6, 32)
    if background:
        vgrad(img, 0, 0, 6, 32, (*mix(p["ink"], p["bot"], 0.45), 220),
              (*mix(p["ink"], p["bot"], 0.20), 220))
        _rim(img, p, 0, p["rim_dim"], 90)
    else:
        vgrad(img, 0, 0, 6, 32, (*p["hi"], 245), (*p["mid"], 245))
        _rim(img, p, 0, (255, 255, 255), 90)
        hline(img, 2, 4, 3, (255, 255, 255, 130))
    return img


def t_separator(p):
    img = Img(32, 2)
    hline(img, 0, 32, 0, (*p["mid"], 190))
    hline(img, 0, 32, 1, (*p["ink"], 235))
    for x in range(0, 32, 8):
        img.put(x, 0, (*p["hi"], 120))
    return img


def t_tile(p, alpha=255, inworld=False, legacy=False):
    """Kusursuz döşenen 16x16 menü zemini: obsidyen + ince vurgu dokusu."""
    img = Img(16, 16)
    base = mix(p["ink"], p["bot"], 0.55 if inworld else 0.35)
    if legacy:                       # 1.20.1 ve öncesi oyun %25 parlaklıkla çizer
        base = mix(base, (255, 255, 255), 0.58)
    rng = _seed(p["mode"], p["accent"], inworld, legacy)
    for y in range(16):
        for x in range(16):
            v = ((rng >> ((x * 7 + y * 3) % 23)) & 3) - 1.5
            edge = 1.0 if min(x, y, 15 - x, 15 - y) > 0 else 0.72
            k = 1.0 + v * 0.010
            c = (base[0] * k, base[1] * k, base[2] * k)
            a = int(alpha * edge)
            img.put(x, y, (*c, a))
    # köşe vurguları: döşemede ızgara hissi veren çok soluk artı
    img.put(0, 0, (*p["mid"], 18 if not legacy else 34))
    img.put(0, 1, (*p["mid"], 12 if not legacy else 24))
    img.put(1, 0, (*p["mid"], 12 if not legacy else 24))
    return img


def t_overlay(mode, p):
    """Tam ekran degrade: üst/alt karartma + köşe vinyeti + hafif renk yıkaması."""
    w, h = 256, 128
    img = Img(w, h)
    day = mode == "day"
    top_a = 0.30 if day else 0.46
    bot_a = 0.42 if day else 0.66
    wash = 0.055 if day else 0.075
    for y in range(h):
        t = y / (h - 1)
        ta = max(0.0, 1.0 - t / 0.30) ** 1.7 * top_a
        ba = max(0.0, (t - 0.48) / 0.52) ** 1.5 * bot_a
        for x in range(w):
            u = x / (w - 1)
            side = (abs(u - 0.5) * 2.0) ** 2.4 * (0.20 if day else 0.30)
            a = min(0.92, ta + ba + side * (0.35 + 0.65 * t))
            # renk yıkaması: üstte vurgu, altta mürekkep
            tint = mix(p["ink"], p["accent"], (0.10 + 0.20 * (1 - t)) * wash / 0.075)
            col = mix(p["ink"], tint, 0.55 if t < 0.45 else 0.30)
            img.put(x, y, (*col, int(a * 255)))
    # üstte ince vurgu çizgisi (logo arkasında ferahlık)
    for x in range(w):
        u = x / (w - 1)
        k = (1 - abs(u - 0.5) * 2) ** 3
        img.put(x, 0, (*p["mid"], int(10 + 26 * k)))
    return img


# ------------------------------------------------------------------ yazı tipi
G5 = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "B": ("11110", "10001", "10001", "11110", "10001", "10001", "11110"),
    "C": ("01110", "10001", "10000", "10000", "10000", "10001", "01110"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "G": ("01110", "10001", "10000", "10111", "10001", "10001", "01111"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "J": ("00111", "00010", "00010", "00010", "00010", "10010", "01100"),
    "K": ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "Q": ("01110", "10001", "10001", "10001", "10101", "10010", "01101"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "V": ("10001", "10001", "10001", "10001", "10001", "01010", "00100"),
    "W": ("10001", "10001", "10001", "10101", "10101", "11011", "10001"),
    "X": ("10001", "10001", "01010", "00100", "01010", "10001", "10001"),
    "Y": ("10001", "10001", "01010", "00100", "00100", "00100", "00100"),
    "Z": ("11111", "00001", "00010", "00100", "01000", "10000", "11111"),
    "0": ("01110", "10011", "10101", "10101", "10101", "11001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    "3": ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    "4": ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    "5": ("11111", "10000", "11110", "00001", "00001", "10001", "01110"),
    "6": ("00110", "01000", "10000", "11110", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00010", "01100"),
    " ": ("00000",) * 7,
    "·": ("00000", "00000", "00100", "00000", "00100", "00000", "00000"),
}
# Türkçe diyakritikler: taban harf 2 px aşağı, işaret üstte/altında
DIACRITIC = {
    "Ü": ("U", ((1, 0), (3, 0))),
    "Ö": ("O", ((1, 0), (3, 0))),
    "İ": ("I", ((2, 0),)),
    "Ş": ("S", ((2, 8), (1, 9))),
    "Ç": ("C", ((2, 8), (1, 9))),
    "Ğ": ("G", ((1, 0), (2, 0), (3, 0))),
    "I": ("I", ()),
}


def glyph_mask(text, spacing=1, baseline=False):
    """Metni blok maskesine çevirir. Dönen: (hücre listesi, genişlik, yükseklik) — birim: hücre.

    baseline=True: Türkçe diyakritikler için taban 2 px aşağı alınır ve harfler
    aynı taban çizgisinde kalır (Ü/Ş/Ç/Ğ/İ karışık metinlerde kayma olmaz)."""
    cells = []
    x = 0
    for ch in text:
        base, marks = DIACRITIC.get(ch, (ch, ()))
        rows = G5.get(base) or G5.get(" ")
        dy = 2 if baseline else 0
        for ry, row in enumerate(rows):
            for rx, v in enumerate(row):
                if v == "1":
                    cells.append((x + rx, ry + dy))
        for (mx, my) in marks:
            cells.append((x + mx, my))
        x += 5 + spacing
    width = max(1, x - spacing)
    height = 11 if baseline else 7
    return cells, width, height


def draw_text(img, text, x, y, color, scale=1, spacing=1, shadow=None, center=False,
              baseline=False):
    cells, w, h = glyph_mask(text, spacing, baseline)
    w *= scale
    h *= scale
    if center:
        x = x - w // 2
    if shadow:
        for (cx, cy) in cells:
            for yy in range(scale):
                for xx in range(scale):
                    img.put(x + cx * scale + xx + 1, y + cy * scale + yy + 1, shadow)
    for (cx, cy) in cells:
        for yy in range(scale):
            for xx in range(scale):
                img.put(x + cx * scale + xx, y + cy * scale + yy, color)
    return w, h


# --------------------------------------------------------------------- logo
# 7x9 kalın (bold) wordmark fontu: 2 hücrelik vuruşlar, güçlü ve okunaklı.
G7B = {
    "R": ("######.", "##...##", "##...##", "##...##", "######.", "##.##..", "##..##.", "##...##", "##...##"),
    "I": ("#######", "..###..", "..###..", "..###..", "..###..", "..###..", "..###..", "..###..", "#######"),
    "V": ("##...##", "##...##", "##...##", "##...##", "##...##", ".##.##.", ".##.##.", "..###..", "...#..."),
    "E": ("#######", "##.....", "##.....", "##.....", "#####..", "##.....", "##.....", "##.....", "#######"),
    "N": ("##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##", "##...##", "##...##"),
    "L": ("##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "######."),
    "A": (".###...", "##..##.", "##..##.", "######.", "##..##.", "##..##.", "##..##.", "##..##.", "##..##."),
    "U": ("##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", ".######."),
    "C": (".#####.", "##...##", "##.....", "##.....", "##.....", "##.....", "##...##", ".#####.", "......."),
    "H": ("##...##", "##...##", "##...##", "######.", "##...##", "##...##", "##...##", "##...##", "##...##"),
}


def _wordmark_mask(word, gap=3):
    cells = []
    x = 0
    for ch in word:
        rows = G7B.get(ch) or G7B["I"]
        for ry, row in enumerate(rows):
            for rx, v in enumerate(row):
                if v in ("1", "#"):
                    cells.append((x + rx, ry))
        x += 7 + gap
    return cells, max(1, x - gap), 9


def make_logo(p, modern=True, canvas=(256, 64), word="RIVEN"):
    """Kristal voxel wordmark: degrade, pah (bevel), kontur, hale ve alt çizgi."""
    cw, ch = canvas
    img = Img(cw, ch)
    scale = 4
    cells, ww_cells, hh_cells = _wordmark_mask(word)
    ww, hh = ww_cells * scale, hh_cells * scale
    ox = (cw - ww) // 2
    oy = 2 if modern else 1   # alttaki LAUNCHER rozeti 37. satırdan başlar
    # tam çözünürlüklü maske: bloklar arasında dikiş kalmadan kaynaşır
    mask = bytearray(cw * ch)
    for (cx, cy) in cells:
        bx, by = ox + cx * scale, oy + cy * scale
        for yy in range(scale):
            row = (by + yy) * cw
            for xx in range(scale):
                mask[row + bx + xx] = 1

    def at(x, y):
        return 0 <= x < cw and 0 <= y < ch and mask[y * cw + x]

    # köşeleri pahla: dış (dışbükey) köşe pikselleri iki geçişte kaldırılır; ince kollar bozulmaz
    for _pass in range(2):
        _snap = bytes(mask)
        def _s(x, y):
            return 0 <= x < cw and 0 <= y < ch and _snap[y * cw + x]
        for y in range(ch):
            for x in range(cw):
                if not _snap[y * cw + x]:
                    continue
                for sx in (-1, 1):
                    for sy in (-1, 1):
                        if not (_s(x + sx, y) or _s(x + 2 * sx, y) or _s(x, y + sy)
                                or _s(x, y + 2 * sy) or _s(x + sx, y + sy)):
                            mask[y * cw + x] = 0

    # 3 px vurgu halesi + 1 px mürekkep konturu
    for y in range(ch):
        for x in range(cw):
            if at(x, y):
                continue
            best = 99
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    d = abs(dx) + abs(dy)
                    if d <= 3 and at(x + dx, y + dy) and d < best:
                        best = d
            if best > 3 and (at(x - 1, y - 2) or at(x - 2, y - 3) or at(x - 1, y - 3)):
                img.put(x, y, (*p["ink"], 70))     # yumuşak gölge
            if best <= 1:
                img.put(x, y, (*p["ink"], 245))
            elif best <= 3:
                img.put(x, y, (*p["accent"], 26 if best == 3 else 44))

    rng = _seed(p["accent"], p["mode"], "logo")
    block_noise = {}
    for (cx, cy) in cells:
        block_noise[(cx, cy)] = (((rng >> ((cx * 7 + cy * 13) % 29)) & 7) - 3.5) * 0.008
    for y in range(ch):
        for x in range(cw):
            if not mask[y * cw + x]:
                continue
            t = (y - oy) / max(1, hh)
            col = mix(p["hi"], p["accent"], t / 0.52) if t < 0.52 else mix(p["accent"], p["lo"], (t - 0.52) / 0.48)
            # yerel blok kırılması (dikişsiz)
            n = block_noise.get(((x - ox) // scale, (y - oy) // scale), 0.0)
            col = shade(col, 1.0 + n)
            # yalnızca dış konturda pah
            top = not at(x, y - 1)
            left = not at(x - 1, y)
            bottom = not at(x, y + 1)
            right = not at(x + 1, y)
            if top or left:
                col = mix(col, (255, 255, 255), 0.34 if (top and left) else 0.24)
            elif not at(x, y - 2) or not at(x - 2, y):
                col = mix(col, (255, 255, 255), 0.10)          # 2. pah satırı
            if bottom or right:
                col = mix(col, (0, 0, 0), 0.34 if (bottom and right) else 0.22)
            elif not at(x, y + 2) or not at(x + 2, y):
                col = mix(col, (0, 0, 0), 0.10)
            # üst yarıda cam parlaması bandı
            gl = 0.20 - abs(t - 0.20)
            if gl > 0 and not (top or left):
                col = mix(col, (255, 255, 255), min(0.22, gl * 1.1))
            # çapraz cam parlaması
            if (x - y * 2) % 83 < 9:
                col = mix(col, (255, 255, 255), 0.055)
            img.put(x, y, (*col, 255))
    return img


def make_edition(p):
    """RIVEN logosunun altındaki 'LAUNCHER' yazısı. Oyun dokunun yalnızca sol 98x14 bölümünü
    çizer (doku 128x16). Yazı, logodaki kalın 7x9 fontun 12 px yüksekliğe ölçeklenmiş hâlidir
    (RIVEN'ın üçte biri boyunda); 1 px mürekkep konturu ve degrade dolgu içerir."""
    img = Img(128, 16)
    W, H, TH = 98, 14, 12
    cells, sw, sh = _wordmark_mask("LAUNCHER", gap=2)
    src = set(cells)
    cw = (sw * TH) // sh                     # ölçeklenmiş genişlik
    ox, oy = (W - cw) // 2, H - TH - 1 if False else 1
    mask = set()
    for Y in range(TH):
        for X in range(cw):
            if (X * sw // cw, Y * sh // TH) in src:
                mask.add((ox + X, oy + Y))
    for (x, y) in mask:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in mask and 0 <= q[0] < W and 0 <= q[1] < H:
                    img.put(q[0], q[1], (*p["ink"], 235))
    for (x, y) in mask:
        t = (y - oy) / max(1, TH - 1)
        col = mix(p["hi"], p["accent"], t * 1.25) if t < 0.8 else mix(p["accent"], p["lo"], (t - 0.8) / 0.2)
        if (x, y - 1) not in mask:
            col = mix(col, (255, 255, 255), 0.22)
        img.put(x, y, (*col, 255))
    return img


def make_icon(p):
    """128x128 paket simgesi: kristal külçe + RIVEN yazısı."""
    s = 128
    img = Img(s, s)
    for y in range(s):
        t = y / (s - 1)
        img_row = mix(mix((8, 12, 19), p["accent"], 0.10 + 0.10 * (1 - t)),
                      (3, 5, 9), t * 0.55)
        for x in range(s):
            u = x / (s - 1)
            d = math.hypot((u - 0.5) * 1.15, (t - 0.46) * 1.0)
            glow = max(0.0, 1.0 - d / 0.55) ** 2
            c = mix(img_row, p["accent"], glow * 0.30)
            img.put(x, y, (*c, 255))
    # kristal: satır satır elmas
    top, mid, bot = 24, 52, 100
    for y in range(top, bot + 1):
        if y <= mid:
            k = (y - top) / (mid - top)
            half = 6 + 30 * k
        else:
            k = (y - mid) / (bot - mid)
            half = 36 * (1 - k) + 6 * k
        cx = 64
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - (cx - half)) / max(1, (2 * half))
            edge = min(x - (cx - half), (cx + half) - x)
            c = mix(p["hi"], p["lo"], 0.15 + 0.75 * abs(u - 0.5) * 2)
            if edge < 1:
                c = mix(c, (255, 255, 255), 0.45)
            if y in (top, bot) or edge < 1:
                c = mix(c, (255, 255, 255), 0.20)
            img.put(x, y, (*c, 255))
    # parlak kesit
    for i in range(16):
        img.put(50 + i // 2, 44 + i, (255, 255, 255, 120 - i * 6))
    # dış çerçeve
    _rim(img, p, 8, p["rim"], 120)
    # alt marka
    draw_text(img, "RIVEN", 64, 104, (*p["warm"], 245), 2, 1, center=True,
              shadow=(0, 0, 0, 180))
    return img


# ---------------------------------------------------------------- splash yazıları
SPLASH_TR = (
    "Riven ile dünyaya açıl!", "Rengini seç, dünyanı kur!", "Cam gibi bir arayüz!",
    "Zümrüt kadar parlak!", "Bugün ne inşa edeceksin?", "Bir blok, bin hayal!",
    "Keşfetmeye hazır mısın?", "Rotayı sen çiz!", "Hadi bir macera!",
    "Kendi dünyanı yarat!", "Fısss... şaka şaka!", "Sunucuda görüşürüz!",
    "Riven Tag ile arkadaşlarını gör!", "Pikseller de sanattır!",
    "Hep daha yükseğe!", "Türkçe ve gururlu!", "Madenler seni bekliyor!",
    "Elmas bulundu... belki!", "Bu arayüz kristal gibi!", "Işıkları aç, macera başlasın!",
    "Gökyüzü bile kıskanır!", "Her blok bir tuval!", "Dünyanın en iyi launcher'ı?",
    "Efsanevi bir gün!", "Bir kere dene, bırakamazsın!", "Yeni rotalar, yeni dünyalar!",
    "Maceraya hazır mısın?", "Taş, toprak, hayal gücü!", "Gece de güzel, gündüz de!",
)
SPLASH_DAY = ("Günaydın!", "Güneşli bir gün!", "Gün aydınlık, iş başına!",
              "Bugün hava harika!", "Güneş doğdu, macera başladı!")
SPLASH_NIGHT = ("İyi geceler!", "Yıldızlar çıktı!", "Aurora zamanı!",
                "Gece maceraya çıkma vakti!", "Ay ışığında inşaat!")


def splashes(mode):
    extra = SPLASH_DAY if mode == "day" else SPLASH_NIGHT
    return "\n".join(list(extra) + list(SPLASH_TR)) + "\n"


# -------------------------------------------------------------------- paket
def _panorama_files(mode, source_dir):
    src = Path(source_dir) / mode
    out = {}
    for i in range(6):
        path = src / f"panorama_{i}.png"
        if not path.is_file():
            raise FileNotFoundError(f"Panorama bulunamadı: {path}")
        out[f"assets/minecraft/textures/gui/title/background/panorama_{i}.png"] = path.read_bytes()
    return out


def _nine_slice(w, h, border):
    if isinstance(border, (tuple, list)):
        b = {"left": border[0], "top": border[1], "right": border[2], "bottom": border[3]}
    else:
        b = border
    return json.dumps({"gui": {"scaling": {"type": "nine_slice", "width": w, "height": h, "border": b}}},
                      separators=(",", ":")).encode("utf-8")


def _sprite_mcmeta(pf):
    """1.20.2+ dokuz dilim tanımları."""
    return {
        "button": _nine_slice(200, 20, 3),
        "button_highlighted": _nine_slice(200, 20, 3),
        "button_disabled": _nine_slice(200, 20, 3),
        "text_field": _nine_slice(200, 20, 3),
        "text_field_highlighted": _nine_slice(200, 20, 3),
        "slider": _nine_slice(200, 20, 1),
        "slider_highlighted": _nine_slice(200, 20, 1),
        "slider_handle": _nine_slice(8, 20, (2, 2, 2, 3)),
        "slider_handle_highlighted": _nine_slice(8, 20, (2, 2, 2, 3)),
        "tab": _nine_slice(130, 24, (2, 2, 2, 0)),
        "tab_highlighted": _nine_slice(130, 24, (2, 2, 2, 0)),
        "tab_selected": _nine_slice(130, 24, (2, 2, 2, 0)),
        "tab_selected_highlighted": _nine_slice(130, 24, (2, 2, 2, 0)),
        "scroller": _nine_slice(6, 32, 1),
        "scroller_background": _nine_slice(6, 32, 1),
        "popup/background": _nine_slice(236, 34, 6),
        "tooltip/background": _nine_slice(100, 100, 9),
        "tooltip/frame": json.dumps({"gui": {"scaling": {"type": "nine_slice", "width": 100, "height": 100,
                                                          "border": 10, "stretch_inner": True}}},
                                     separators=(",", ":")).encode("utf-8"),
        "container/slot_highlight_back": _nine_slice(24, 24, 4),
        "container/slot_highlight_front": _nine_slice(24, 24, 4),
    }


def build_pack(mode, accent=DEFAULT_ACCENT, glass=62, hud=True, pack_format=75,
               panorama_dir=None, description=None):
    """Paketi bellekte üretir. Dönen: (zip baytları, paket biçimi)."""
    p = palette(mode, accent, glass)
    mode = p["mode"]
    accent = _norm_hex(accent)
    pf = int(pack_format)
    tex = "assets/minecraft/textures/gui/"
    files = {}
    # ---- statik / panorama
    if panorama_dir:
        files.update(_panorama_files(mode, panorama_dir))
    files[tex + "title/background/panorama_overlay.png"] = t_overlay(mode, p).bytes()
    if pf > LEGACY_LOGO_MAX_FORMAT:
        files[tex + "title/minecraft.png"] = make_logo(p, True, (256, 64)).bytes()
    else:
        # 1.19.2 ve öncesi: logo 256x256 dokuda iki parça hâlinde beklenir
        wide = make_logo(p, False, (274, 44))
        legacy = Img(256, 256)
        left = Img(155, 44)
        for y in range(44):
            for x in range(155):
                i = (y * wide.w + x) * 4
                left.put(x, y, (wide.d[i], wide.d[i + 1], wide.d[i + 2], wide.d[i + 3]))
        right = Img(119, 44)
        for y in range(44):
            for x in range(155, 274):
                i = (y * wide.w + x) * 4
                right.put(x - 155, y, (wide.d[i], wide.d[i + 1], wide.d[i + 2], wide.d[i + 3]))
        legacy.paste(left, 0, 0)
        legacy.paste(right, 0, 45)
        files[tex + "title/minecraft.png"] = legacy.bytes()
    files[tex + "title/edition.png"] = make_edition(p).bytes()
    files["assets/minecraft/texts/splashes.txt"] = splashes(mode).encode("utf-8")
    files["pack.png"] = make_icon(p).bytes()

    # ---- menü zemini
    legacy_mode = pf < MODERN_BG_MIN_FORMAT
    files[tex + "options_background.png"] = t_tile(p, 255, False, legacy_mode).bytes()
    if legacy_mode:
        files[tex + "inworld_menu_background.png"] = t_tile(p, 0, True, True).bytes()
    else:
        # oyun içi duraklatma menüsü: tamamen şeffaf (arka plansız)
        files[tex + "menu_background.png"] = t_tile(p, 0, False, False).bytes()
        files[tex + "menu_list_background.png"] = t_tile(p, 0, False, False).bytes()
        files[tex + "inworld_menu_background.png"] = t_tile(p, 0, True, False).bytes()
        files[tex + "inworld_menu_list_background.png"] = t_tile(p, 0, True, False).bytes()
        sep = t_separator(p).bytes()
        for arc in ("header_separator", "footer_separator", "inworld_header_separator",
                    "inworld_footer_separator"):
            files[tex + arc + ".png"] = sep
    if pf >= SPRITE_MIN_FORMAT:
        # ---- widget dokuları
        wmap = {
            "button": t_button(p, "normal"),
            "button_highlighted": t_button(p, "hover"),
            "button_disabled": t_button(p, "disabled"),
            "text_field": t_text_field(p, False),
            "text_field_highlighted": t_text_field(p, True),
            "slider": t_slider(p, False),
            "slider_highlighted": t_slider(p, True),
            "slider_handle": t_slider_handle(p, False),
            "slider_handle_highlighted": t_slider_handle(p, True),
            "checkbox": t_checkbox(p, False, False),
            "checkbox_highlighted": t_checkbox(p, False, True),
            "checkbox_selected": t_checkbox(p, True, False),
            "checkbox_selected_highlighted": t_checkbox(p, True, True),
            "tab": t_tab(p, False, False),
            "tab_highlighted": t_tab(p, False, True),
            "tab_selected": t_tab(p, True, False),
            "tab_selected_highlighted": t_tab(p, True, True),
            "scroller": t_scroller(p, False),
            "scroller_background": t_scroller(p, True),
        }
        meta = _sprite_mcmeta(pf)
        for name, im in wmap.items():
            files[tex + f"sprites/widget/{name}.png"] = im.bytes()
            if name in meta:
                files[tex + f"sprites/widget/{name}.png.mcmeta"] = meta[name]
        files[tex + "sprites/popup/background.png"] = t_popup(p).bytes()
        files[tex + "sprites/popup/background.png.mcmeta"] = meta["popup/background"]
        files[tex + "sprites/tooltip/background.png"] = t_tooltip_bg(p).bytes()
        files[tex + "sprites/tooltip/background.png.mcmeta"] = meta["tooltip/background"]
        files[tex + "sprites/tooltip/frame.png"] = t_tooltip_frame(p).bytes()
        files[tex + "sprites/tooltip/frame.png.mcmeta"] = meta["tooltip/frame"]
        if hud:
            files[tex + "sprites/hud/hotbar.png"] = t_hotbar(p).bytes()
            files[tex + "sprites/hud/hotbar_selection.png"] = t_hotbar_selection(p).bytes()
            files[tex + "sprites/hud/hotbar_offhand_left.png"] = t_offhand(p, True).bytes()
            files[tex + "sprites/hud/hotbar_offhand_right.png"] = t_offhand(p, False).bytes()
            files[tex + "sprites/hud/experience_bar_background.png"] = t_xp_background(p).bytes()
            files[tex + "sprites/hud/experience_bar_progress.png"] = t_xp_progress(p).bytes()
            files[tex + "sprites/hud/crosshair.png"] = t_crosshair(p).bytes()
        if pf >= 34:     # 1.21+: tüm konteynerlerde ortak yuva dokusu
            files[tex + "sprites/container/slot.png"] = t_slot(p).bytes()
            files[tex + "sprites/container/slot_highlight_back.png"] = t_slot_highlight(p, True).bytes()
            files[tex + "sprites/container/slot_highlight_front.png"] = t_slot_highlight(p, False).bytes()
            files[tex + "sprites/container/slot_highlight_back.png.mcmeta"] = meta["container/slot_highlight_back"]
            files[tex + "sprites/container/slot_highlight_front.png.mcmeta"] = meta["container/slot_highlight_front"]

    # ---- pack.mcmeta
    if description is None:
        description = f"§aRiven Arayüzü §7• §f{accent_name(accent)} §7• §fTürkçe"
    meta = {"pack": {"pack_format": pf, "description": description}}
    files["pack.mcmeta"] = json.dumps(meta, ensure_ascii=False).encode("utf-8")

    # ---- zip
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for arc, data in files.items():
            info = zipfile.ZipInfo(arc, (2026, 1, 1, 0, 0, 0))
            if arc.endswith((".mcmeta", ".txt", ".json")):
                zf.writestr(info, data, zipfile.ZIP_DEFLATED)
            else:
                zf.writestr(info, data)
    return buf.getvalue(), pf


# NOT: aşağıdaki HUD parçaları yukarıda kullanıldığı için burada tanımlı.
def t_hotbar(p):
    img = Img(182, 22)
    a = p["hud_a"]
    vgrad(img, 0, 0, 182, 22, (*mix(p["top"], p["ink"], 0.30), a),
          (*mix(p["bot"], p["ink"], 0.30), a), radius=2)
    _rim(img, p, 2, p["rim_dim"], 150)
    hline(img, 2, 180, 1, (*p["warm"], 32))
    for k in range(1, 9):
        x = 1 + 20 * k
        for y in range(2, 20):
            img.put(x, y, (*p["ink"], 130))
            img.put(x + 1, y, (*p["warm"], 10))
    for (x, y) in ((1, 1), (180, 1), (1, 20), (180, 20)):
        img.put(x, y, (*p["hi"], 80))
    if p["mode"] == "day":
        _accent_footer(img, p, 110, 1)
    return img


def t_hotbar_selection(p):
    img = Img(24, 23)
    # dış koyu ayırıcı + 2 px vurgu çerçevesi + iç ışık
    for y in range(23):
        for x in range(24):
            d = min(x, 23 - x, y, 22 - y)
            if d == 0:
                img.put(x, y, (*p["ink"], 200))
            elif d == 1:
                img.put(x, y, (*p["mid"], 245))
            elif d == 2:
                img.put(x, y, (*p["hi"], 235))
            elif d == 3:
                img.put(x, y, (*p["accent"], 60))
    # köşe yuvarlatma
    for (x, y) in ((0, 0), (23, 0), (0, 22), (23, 22)):
        img.put(x, y, (0, 0, 0, 0))
    for (x, y) in ((1, 0), (22, 0), (0, 1), (0, 21), (23, 1), (23, 21), (1, 22), (22, 22)):
        img.put(x, y, (*p["mid"], 120))
    return img


def t_offhand(p, left):
    img = Img(29, 24)
    a = p["hud_a"]
    vgrad(img, 0, 0, 29, 24, (*mix(p["top"], p["ink"], 0.30), a),
          (*mix(p["bot"], p["ink"], 0.30), a), radius=2)
    _rim(img, p, 2, p["rim_dim"], 140)
    hline(img, 0, 29, 1, (*p["warm"], 28))
    # iç slot çerçevesi (4 px kenar)
    sx = 5 if left else 4
    for y in range(2, 22):
        img.put(sx, y, (*p["ink"], 110))
        img.put(sx + 20, y, (*p["ink"], 110))
    for x in range(sx, sx + 21):
        img.put(x, 2, (*p["ink"], 110))
        img.put(x, 21, (*p["ink"], 110))
    return img


def t_xp_background(p):
    img = Img(182, 5)
    vgrad(img, 0, 0, 182, 5, (*mix(p["ink"], p["bot"], 0.55), 235),
          (*mix(p["ink"], p["bot"], 0.25), 235))
    _rim(img, p, 0, p["rim_dim"], 120)
    return img


def t_xp_progress(p):
    img = Img(182, 5)
    vgrad(img, 1, 1, 181, 4, (*p["hi"], 255), (*p["mid"], 255))
    hline(img, 1, 181, 1, (255, 255, 255, 160))
    hline(img, 1, 181, 3, (*p["lo"], 90))
    return img


def t_crosshair(p):
    img = Img(15, 15)
    for i in range(5, 10):
        img.put(7, i, (255, 255, 255, 235))
        img.put(i, 7, (255, 255, 255, 235))
    for (x, y) in ((7, 5), (5, 7), (7, 9), (9, 7)):
        img.put(x, y, (255, 255, 255, 255))
    return img


def t_slot(p):
    img = Img(18, 18)
    vgrad(img, 0, 0, 18, 18, (*mix(p["ink"], p["bot"], 0.35), 210),
          (*mix(p["ink"], p["bot"], 0.15), 210), radius=2)
    _rim(img, p, 2, p["rim_dim"], 90)
    hline(img, 2, 16, 1, (*p["ink"], 120))
    return img


def t_slot_highlight(p, back):
    img = Img(24, 24)
    if back:
        for y in range(24):
            for x in range(24):
                dx = min(x, 23 - x)
                dy = min(y, 23 - y)
                if dx < 4 and dy < 4:
                    aa = _corner_alpha(dx, dy, 4)
                else:
                    aa = 1.0
                img.put(x, y, (*p["accent"], int(48 * aa)))
    else:
        _rim(img, p, 4, p["hi"], 210)
        for y in range(1, 23):
            for x in range(1, 23):
                dx = min(x, 23 - x)
                dy = min(y, 23 - y)
                if max(dx, dy) == 1:
                    img.put(x, y, (*p["accent"], 70))
    return img


# ------------------------------------------------------------------ yardımcılar
def pack_signature(mode, accent, glass, hud):
    """Aynı ayarlarla tekrar üretmemek için kısa imza."""
    raw = f"{UI_VERSION}|{mode}|{_norm_hex(accent)}|{int(glass)}|{1 if hud else 0}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def build_info():
    return {"version": UI_VERSION, "presets": [{"key": k, "name": n, "color": c} for k, n, c in PRESETS],
            "default": DEFAULT_ACCENT}
