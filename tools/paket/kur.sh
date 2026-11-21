#!/usr/bin/env bash
# Riven Launcher - Linux kurulumu (Minecraft'i BASLATABILIR)
set -e
cd "$(dirname "$(readlink -f "$0")")"
DIR="$(pwd)"

command -v python3 >/dev/null || { echo "python3 yok. Kur: sudo apt install python3 python3-venv  (Fedora: sudo dnf install python3)"; exit 1; }
python3 -c "import venv, ensurepip" 2>/dev/null || { echo "python3-venv eksik. Kur: sudo apt install python3-venv"; exit 1; }

echo "[1/3] Sanal ortam ve paketler kuruluyor..."
python3 -m venv "$DIR/.venv"
"$DIR/.venv/bin/pip" install --upgrade pip >/dev/null
"$DIR/.venv/bin/pip" install -r "$DIR/requirements-linux.txt"

echo "[2/3] Baslatici olusturuluyor..."
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
cat > "$HOME/.local/bin/riven" <<LAUNCH
#!/usr/bin/env bash
exec "$DIR/.venv/bin/python" "$DIR/riven.py" "\$@"
LAUNCH
chmod +x "$HOME/.local/bin/riven"

echo "[3/3] Uygulama menusu kisayolu ekleniyor..."
ICON="$DIR/web/favicon-512.png"
cat > "$HOME/.local/share/applications/riven-launcher.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Riven Launcher
Comment=Minecraft launcher
Exec=$HOME/.local/bin/riven
Icon=$ICON
Terminal=false
Categories=Game;
DESK

echo
echo "HAZIR! Baslat:  riven   (veya uygulama menusunden 'Riven Launcher')"
echo "Not: Arayuz Chrome/Chromium/Edge uygulama modunda acilir. Yoksa varsayilan tarayici kullanilir."
echo "Java gerekmez: oyun surumune gore otomatik indirilir."
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "Uyari: ~/.local/bin PATH'te degil; 'riven' yerine $HOME/.local/bin/riven yaz.";; esac
