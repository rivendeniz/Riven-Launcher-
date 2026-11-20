"""Riven oyun temasi gorsellerini yeniden uretir (numpy + Pillow gerekir; launcher'in kendisi icin gerekmez).
Kullanim:  python tools/pack_generator/build_all.py   ->  riven_pack/day ve riven_pack/night klasorlerini yazar.
Panorama yuzu basina ~1 dk surer (1024px, 2x supersampling)."""
import sys, time
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
OUT = HERE.parent.parent / "riven_pack"
from PIL import Image
import world as w, render as r, ui_assets as ui

SIZE, SS = 1024, 2
ui.write_all(str(OUT))
W = w.build_world()
for theme in ("day", "night"):
    for f in range(6):
        t = time.time()
        Image.fromarray(r.render_face(W, f, SIZE, theme, ss=SS)).save(OUT / theme / f"panorama_{f}.png", optimize=True)
        print(theme, f, round(time.time() - t, 1), "sn", flush=True)
