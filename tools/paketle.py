# -*- coding: utf-8 -*-
"""Linux ve Mobil paketlerini uretir (yalnizca standart kutuphane).
Kullanim:  python tools/paketle.py [linux|mobil|hepsi]      Cikti: cikti/"""
import sys, tarfile, zipfile, io
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "cikti"
KOD = ["riven.py", "riven_ui.py", "riven.ico"]
KLASOR = ["web", "mods", "riven_pack"]
ATLA = ("__pycache__", ".pyc")


def dosyalar():
    for k in KOD:
        yield ROOT / k
    for d in KLASOR:
        for f in sorted((ROOT / d).rglob("*")):
            if f.is_file() and not any(a in str(f) for a in ATLA):
                yield f


def metin(p):   # .sh/.txt dosyalarinda LF zorunlu
    return p.read_bytes().replace(b"\r\n", b"\n")


def ekler(hedef):
    pk = ROOT / "tools" / "paket"
    if hedef == "linux":
        return [("requirements-linux.txt", (ROOT / "requirements-linux.txt"), 0o644),
                ("kur.sh", pk / "kur.sh", 0o755), ("OKU.txt", pk / "OKU_Linux.txt", 0o644)]
    return [("requirements-mobil.txt", (ROOT / "requirements-mobil.txt"), 0o644),
            ("kur_termux.sh", pk / "kur_termux.sh", 0o755), ("OKU.txt", pk / "OKU_Mobil.txt", 0o644)]


def uret(hedef):
    OUT.mkdir(exist_ok=True)
    kok = "RivenLauncher-Linux" if hedef == "linux" else "RivenLauncher-Mobil"
    girdiler = [(f"{kok}/{f.relative_to(ROOT).as_posix()}", f.read_bytes(), 0o644) for f in dosyalar()]
    girdiler += [(f"{kok}/{ad}", metin(p) if p.suffix in (".sh", ".txt") else p.read_bytes(), mod)
                 for ad, p, mod in ekler(hedef)]
    if hedef == "linux":
        yol = OUT / "RivenLauncher-Linux.tar.gz"
        with tarfile.open(yol, "w:gz") as tf:
            for ad, veri, mod in girdiler:
                ti = tarfile.TarInfo(ad)
                ti.size, ti.mode = len(veri), mod
                tf.addfile(ti, io.BytesIO(veri))
    else:   # telefon dosya yoneticileri zip'i dogrudan acar
        yol = OUT / "RivenLauncher-Mobil.zip"
        with zipfile.ZipFile(yol, "w", zipfile.ZIP_DEFLATED) as zf:
            for ad, veri, _ in girdiler:
                zf.writestr(ad, veri)
    print(f"Hazir: {yol}  ({yol.stat().st_size // 1024} KB)")


def hazirla_apk():
    """Android projesine uygulama kodunu ve web dosyalarini kopyalar (derleme GitHub Actions'ta)."""
    import shutil
    app = ROOT / "android" / "app" / "src" / "main"
    (app / "python").mkdir(parents=True, exist_ok=True)
    for k in ("riven.py", "riven_ui.py"):
        shutil.copy2(ROOT / k, app / "python" / k)
    shutil.copy2(ROOT / "tools" / "paket" / "android_main.py", app / "python" / "android_main.py")
    assets = app / "assets"
    shutil.rmtree(assets, ignore_errors=True)
    assets.mkdir(parents=True)
    for d in KLASOR:
        shutil.copytree(ROOT / d, assets / d, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.copy2(ROOT / "riven.ico", assets / "riven.ico")
    mip = app / "res" / "mipmap-xxxhdpi"
    mip.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "web" / "favicon-512.png", mip / "ic_launcher.png")
    print("Android projesi hazir: android/  ->  gradle -p android assembleDebug")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].lower() == "apk":
        hazirla_apk()
        sys.exit(0)
    h = (sys.argv[1] if len(sys.argv) > 1 else "hepsi").lower()
    for t in (("linux", "mobil") if h == "hepsi" else (h,)):
        if t not in ("linux", "mobil"):
            sys.exit("Kullanim: python tools/paketle.py [linux|mobil|hepsi]")
        uret(t)
