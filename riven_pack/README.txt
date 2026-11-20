Riven oyun teması (Minecraft ana ekranı resource pack'i)
=========================================================
Launcher her oyun başlatışında, bilgisayarın saatine göre bu klasörden "day" (06:00-17:59) veya
"night" (18:00-05:59) temasını seçer, sürüme uygun pack_format ile RivenUI.zip olarak instance'ın
resourcepacks klasörüne yazar ve ilk kurulumda options.txt'te açar. 1.14 öncesi sürümlere dokunmaz.

Ayar: Ayarlar > Görünüm ve dil > "Oyun ana ekranı teması" (Otomatik / Gündüz / Gece / Kapalı)

Dosyalar (her tema klasöründe): panorama_0..5.png, panorama_overlay.png, logo_modern.png (1.19.3+),
logo_legacy.png (1.14-1.19.2), edition.png, button*.png (1.20.2+), splashes.txt, pack.png
Görselleri yeniden üretmek için: tools/pack_generator/build_all.py

V48: Yeni cam efektli yuvarlak butonlar, yazı kutusu ve kaydırıcı dokuları (1.20.2+), koyu menü zemini ve ayırıcı çizgiler
(1.14+ zemin; 1.20.2+ liste/ayırıcı), zümrüt-turkuaz logo ve düzeltilmiş gece ayı. 1.14-1.20.1'de butonlar oyunun kendi
dokusunda kalır (widgets.png hotbar'ı da içerdiği için dokunulmaz).

V50: Oyun Arayüzü Teması paneli sadeleştirildi (canlı önizleme ve ikinci "ana ekran modu" satırı kaldırıldı; HUD anahtarı düzeltildi).
Vurgu rengi için 6 hazır renk: Zümrüt (varsayılan), Okyanus, Ametist, Gül, Kehribar, Kızıl (+ özel renk). Seçilen renk logo, buton,
sekme, kaydırıcı ve HUD dokularının tamamını boyar. Logonun altındaki "LAUNCHER" rozeti (edition.png) her renkte otomatik üretilir.

V51: İki renk seçeneği ayrıldı. "Görünüm ve dil" bölümündeki renk yalnızca launcher arayüzünü, "Oyun Arayüzü Teması > Vurgu rengi"
yalnızca oyun içi resource pack'i boyar (önceden pack rengi launcher'ı da boyuyordu). Buton dokuları inceltildi/parlatıldı ve
"LAUNCHER" rozeti logodaki kalın 7x9 fontla, konturlu ve degrade dolgulu olarak büyütüldü.
