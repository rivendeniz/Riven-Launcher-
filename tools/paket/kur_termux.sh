#!/data/data/com.termux/files/usr/bin/sh
# Riven Launcher - Mobil (Termux) kurulumu. Arayuz ve tum yonetim islevleri calisir; Minecraft BASLATILAMAZ.
# Calistir:  sh kur_termux.sh
set -e
cd "$(dirname "$0")"
DIR="$(pwd)"
echo "[1/2] Paketler kuruluyor..."
pkg install -y python
pip install -r "$DIR/requirements-mobil.txt"
echo "[2/2] Baslatici olusturuluyor..."
cat > "$PREFIX/bin/riven" <<LAUNCH
#!$PREFIX/bin/sh
exec python "$DIR/riven.py" --mobil "\$@"
LAUNCH
chmod +x "$PREFIX/bin/riven"
echo
echo "HAZIR! Termux'ta 'riven' yaz, sonra tarayicida http://127.0.0.1:8780 ac."
echo "(termux-api kuruluysa tarayici kendiliginden acilir: pkg install termux-api)"
