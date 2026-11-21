# -*- coding: utf-8 -*-
"""APK giris noktasi: Java (MainActivity) cagirir; Riven sunucusunu mobil modda arka planda baslatir."""
import os
import sys
import threading

_started = False


def start(base_dir):
    global _started
    if _started:
        return
    _started = True
    os.environ["RIVEN_MOBIL"] = "1"
    os.environ["RIVEN_ANDROID"] = "1"   # otomatik güncelleme: APK indir, kullanıcı onayıyla kur
    os.environ["RIVEN_BASE"] = base_dir
    sys.argv = ["riven.py", "--mobil"]
    import riven
    threading.Thread(target=riven.main, daemon=True).start()
