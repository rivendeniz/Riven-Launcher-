'use strict';
/* Dil katmanı: kaynak metinler Türkçe; İngilizce karşılıkları burada. Varsayılan dil Türkçe. */
let LANG = 'tr';
const EN = {
  // gezinme
  'Keşfet (Modrinth / CurseForge)': 'Discover (Modrinth / CurseForge)', 'Konsol': 'Console', 'AFK Bölgesi': 'AFK Zone',
  'Hesap ve Discord': 'Account & Discord', 'Hesap ayarları': 'Account settings', 'Ana sayfa': 'Home',
  'Yeni instance oluştur': 'Create new instance', 'Küçült': 'Collapse', "Tüm instance'ları göster": 'Show all instances',
  '1.21.11 için en iyi FPS modlarını otomatik kur': 'Auto-install the best FPS mods for 1.21.11',
  // durum
  'Hazır': 'Ready', 'Bağlanıyor...': 'Connecting...', 'Bağlantı kesildi': 'Connection lost', 'Oyuncu': 'Player',
  'Çalışıyor': 'Running', 'Hazırlanıyor…': 'Preparing…', 'Meşgul': 'Busy', 'Oyna': 'Play', 'Başlatılıyor…': 'Starting…',
  'Hiç oynanmadı': 'Never played', 'Az önce': 'Just now',
  // ana sayfa
  'Bugün hangi dünyaya dalıyoruz?': 'Which world are we diving into today?', 'Yeni instance': 'New instance',
  "İlk instance'ını oluştur": 'Create your first instance', 'Instance oluştur': 'Create instance',
  "Her instance'ın kendi modları, dünyaları ve ayarları olur. İstediğin kadar kur.": 'Every instance has its own mods, worlds and settings. Create as many as you like.',
  'SON OYNANAN': 'LAST PLAYED', 'BAŞLAMAYA HAZIR': 'READY TO START', 'Aç': 'Open', "INSTANCE'LARIN": 'YOUR INSTANCES',
  'Farklı modlarla ayrı bir dünya': 'A separate world with different mods', 'INSTANCE': 'INSTANCE',
  // instance
  'Sürüm': 'Version', 'Mod': 'Mods', 'Son oyun': 'Last played', 'Geri': 'Back', 'Klasör': 'Folder', 'Ayarlar': 'Settings',
  'Modlar': 'Mods', 'Dünyalar': 'Worlds', 'Saves klasörü': 'Saves folder', "Keşfet'ten ekle": 'Add from Discover',
  'Hazır dünya indir': 'Download a ready-made world', 'Henüz dünya yok': 'No worlds yet', 'Yerel': 'Local',
  "CurseForge'dan hazır macera, parkur ve şehir haritalarını tek tıkla indirebilirsin.": 'Download ready-made adventure, parkour and city maps from CurseForge in one click.',
  "Burada henüz bir şey yok. Modrinth veya CurseForge'dan ekleyebilirsin.": 'Nothing here yet. You can add items from Modrinth or CurseForge.',
  'Detay / Sürüm': 'Details / Version', 'Detay': 'Details', 'Detayları aç': 'Open details', 'Dosya bilgileri': 'File info',
  'Açıklama, bağlantı ve sürüm değiştirme': 'Description, link and version switching',
  'Açıklama, web sitesi bağlantısı ve sürüm değiştirme': 'Description, website link and version switching',
  'Sil': 'Delete', 'Kapat': 'Close', 'Yükleniyor…': 'Loading…', 'Web sitesi': 'Website', 'Kaynak kodu': 'Source code',
  'Bir şeyler ters gitti': 'Something went wrong',
  'Bu dosya açıklama içermiyor ve Modrinth\'te eşleşen bir proje bulunamadı.': 'This file has no description and no matching Modrinth project was found.',
  // modallar
  'Emin misin?': 'Are you sure?', 'Evet': 'Yes', 'Vazgeç': 'Cancel', 'Oluştur': 'Create', 'Kaydet': 'Save',
  'Ad': 'Name', 'Minecraft sürümü': 'Minecraft version', 'Renk': 'Color', 'Fabric (mod destekli)': 'Fabric (mod support)',
  'Forge modları için': 'For Forge mods', 'Bu sürüm için Forge yok': 'No Forge for this version',
  'Fabric 1.14 ve üstü sürümlerde kullanılabilir': 'Fabric is available for 1.14 and above',
  'OptiFine seçeneği 1.14 öncesi sürümler içindir': 'OptiFine is for versions before 1.14',
  'Instance ayarları': 'Instance settings', 'İkon': 'Icon', 'Resim yükle': 'Upload image', 'Yüklenen resmi kaldır': 'Remove uploaded image',
  'Yüklenen resim kaldırıldı': 'Uploaded image removed', 'İkon güncellendi': 'Icon updated',
  'Dosyaları onar ve başlat': 'Repair files and launch', "Instance'ı sil": 'Delete instance', 'Kaydedildi': 'Saved',
  // keşfet
  "Modpack'ler": 'Modpacks', 'Resource Pack': 'Resource Pack', 'Shader': 'Shader', 'İlgili': 'Relevant',
  'En çok indirilen': 'Most downloaded', 'Son güncellenen': 'Recently updated', 'En yeni': 'Newest',
  'Kaydet ve dene': 'Save and test', 'Deneniyor…': 'Testing…', 'CurseForge bağlandı': 'CurseForge connected',
  'Anahtar al (ücretsiz)': 'Get a key (free)', 'Anahtar silindi': 'Key removed', 'Önce anahtarı yapıştır.': 'Paste the key first.',
  'CurseForge API anahtarını yapıştır': 'Paste your CurseForge API key',
  "Bu launcher'a yerleşik bir CurseForge anahtarı tanımlı; ek bir şey yapman gerekmiyor.": 'This launcher has a built-in CurseForge key; nothing else to do.',
  // hesap / görünüm
  'Görünüm ve dil': 'Appearance & language', 'Dil': 'Language', 'Arayüz dilini seç': 'Choose the interface language',
  'Arayüz her zaman koyu kalır. Hazır bir renk seç ya da sağdaki kutudan istediğin rengi bul; arka plan o renge göre ayarlanır.': 'The interface always stays dark. Pick a preset color or choose any color on the right; the background adapts to it.',
  "İstediğin rengi seç": 'Pick any color', 'Yeşil': 'Green', 'Mavi': 'Blue', 'Mor': 'Purple', 'Pembe': 'Pink', 'Turuncu': 'Orange',
  'Çevrimdışı oyuncu': 'Offline player', 'Tek kişilik dünyalar ve çevrimdışı sunucular için. Hesap gerekmez.': 'For singleplayer worlds and offline servers. No account needed.',
  'Oyuncu adı': 'Player name', 'Microsoft hesabı': 'Microsoft account', 'Bağlı': 'Connected',
  // sunucu mesajları
  'Geçersiz renk.': 'Invalid color.', 'Geçersiz tema.': 'Invalid theme.', 'Geçersiz dil.': 'Invalid language.',
  'Geçersiz instance.': 'Invalid instance.', 'Instance bulunamadı.': 'Instance not found.', 'Geçersiz dosya adı.': 'Invalid file name.',
  'Geçersiz içerik türü.': 'Invalid content type.', 'Geçersiz proje.': 'Invalid project.', 'Sürümde dosya yok.': 'No file in this version.',
  'Dosya çok büyük.': 'File is too large.', 'Mojang beklenmeyen bir yanıt verdi.': 'Mojang returned an unexpected response.',
  'Dosya doğrulaması (hash) başarısız, silindi.': 'File verification (hash) failed; file deleted.',
};
const EN_PATTERNS = [
  [/^Merhaba, (.+)$/, (m) => `Hello, ${m[1]}`],
  [/^(\d+) oyun açık$/, (m) => `${m[1]} game${m[1] === '1' ? '' : 's'} running`],
  [/^(\d+) dk önce$/, (m) => `${m[1]} min ago`], [/^(\d+) sa önce$/, (m) => `${m[1]} h ago`],
  [/^(\d+) gün önce$/, (m) => `${m[1]} d ago`],
  [/^(.+) • (.+) • (\d+) mod$/, (m) => `${m[1]} • ${m[2]} • ${m[3]} mods`],
  [/^Son oynanma: (.+)$/, (m) => `Last played: ${m[1]}`],
  [/^Yeni sürüm (.+) indiriliyor\.\.\. %(\d+)$/, (m) => `Downloading new version ${m[1]}... ${m[2]}%`],
  [/^Sürüm (.+) kuruluyor, launcher yeniden açılacak\.\.\.$/, (m) => `Installing version ${m[1]}; the launcher will restart...`],
  [/^Sürüm (.+) hazır, oyun kapanınca güncellenecek\.$/, (m) => `Version ${m[1]} is ready; it will update when the game closes.`],
  [/^Yeni sürüm (.+) mevcut\.$/, (m) => `New version ${m[1]} is available.`],
  [/^"(.+)" silinsin mi\?$/, (m) => `Delete "${m[1]}"?`],
  [/^"(.+)" dünyası kalıcı olarak silinsin mi\? Bu geri alınamaz\.$/, (m) => `Permanently delete the world "${m[1]}"? This cannot be undone.`],
  [/^"(.+)" ve içindeki tüm dünyalar\/modlar kalıcı olarak silinecek\.$/, (m) => `"${m[1]}" and all its worlds/mods will be permanently deleted.`],
  [/^Bu proje (.+) için uyumlu dosya sunmuyor\.$/, (m) => `This project has no compatible file for ${m[1]}.`],
  [/^(.+) 1-(\d+) karakter olmalı\.$/, (m) => `${m[1]} must be 1-${m[2]} characters.`],
  [/^Modrinth hatası \((\d+)\)\.$/, (m) => `Modrinth error (${m[1]}).`],
  [/^Modrinth'e ulaşılamadı: (.+)$/, (m) => `Could not reach Modrinth: ${m[1]}`],
  [/^Mojang'a ulaşılamadı: (.+)$/, (m) => `Could not reach Mojang: ${m[1]}`],
  [/^İndirme başarısız: (.+)$/, (m) => `Download failed: ${m[1]}`],
  [/^"(.+)" adında bir Minecraft hesabı bulunamadı\.$/, (m) => `No Minecraft account named "${m[1]}" was found.`],
];
/* ---- Ek çeviriler (V36): hesap sayfası, keşfet, skin, mesajlar, giriş ekranı ---- */
Object.assign(EN, {
  // hesap: skin kütüphanesi
  'Skin kütüphanem': 'My skin library', 'Hesap skini': 'Account skin', 'Mojang / varsayılan': 'Mojang / default',
  "Skin PNG'sini buraya sürükle": 'Drop your skin PNG here', 'ya da tıklayıp seç • 64×64 veya 64×32': 'or click to choose • 64×64 or 64×32',
  'Premium oyuncu adı': 'Premium player name', 'Adından al': 'Import by name', 'Çevrimdışı mod': 'Offline mode',
  'Sürükle, karakterini döndür': 'Drag to rotate your character', 'Hesabıma uygula': 'Apply to my account',
  'Skin seçildi': 'Skin selected', 'Hesap skinine dönüldü': 'Switched back to account skin', 'Skin eklendi ve seçildi': 'Skin added and selected',
  'Önce kütüphaneden bir skin seç.': 'Pick a skin from the library first.', 'Skin hesabına yüklendi': 'Skin uploaded to your account',
  'Seçili skin Microsoft hesabına yüklenecek. Oyunda ve sunucularda herkes bu skini görür.': 'The selected skin will be uploaded to your Microsoft account. Everyone in game and on servers will see it.',
  "Burada seçtiğin skin launcher'da görünür. Oyunda herkesin görmesi için \"Hesabıma uygula\" ile Mojang hesabına yükle.": 'The skin you pick here is shown in the launcher. To let everyone see it in game, upload it to your Mojang account with "Apply to my account".',
  "Çevrimdışı modda skin yalnızca launcher'da görünür; oyun içi skin için Microsoft hesabıyla giriş yapıp \"Hesabıma uygula\"yı kullanabilirsin.": 'In offline mode the skin only shows in the launcher; for an in-game skin, sign in with a Microsoft account and use "Apply to my account".',
  'Dosya okunamadı': 'Could not read the file', 'Resim açılamadı': 'Could not open the image', 'Dosya seçilmedi': 'No file selected',
  'Skin bir PNG dosyası olmalı.': 'The skin must be a PNG file.', 'Skin yüklendi': 'Skin uploaded', 'Skin sıfırlandı': 'Skin reset',
  'Sıfırla': 'Reset', 'Kendi skin\'ini yükle': 'Upload your own skin', 'Oyunda böyle görünürsün': "This is how you'll look in game",
  // hesap: mod menüsü, CurseForge, giriş
  'Oyun içi mod menüsü': 'In-game mod menu',
  "Oyundayken Sağ Shift tuşuna bas: Riven mod menüsü açılır. FPS, tuş göstergesi, CPS, koordinat, ping, hız, saat, RAM, zırh durumu gibi göstergeleri açıp kapatabilir, renk/arka plan/opaklık/gölge ayarlayabilir ve fareyle sürükleyip istediğin yere koyabilirsin. Ayarlar instance'ın config/riven-hud.json dosyasında saklanır. Sadece Fabric 1.21.11 instance'larında çalışır.":
    "While in game, press Right Shift to open the Riven mod menu. You can toggle HUD elements such as FPS, key display, CPS, coordinates, ping, speed, clock, RAM and armor status, adjust color / background / opacity / shadow, and drag them anywhere you like. Settings are stored in the instance's config/riven-hud.json file. Works only on Fabric 1.21.11 instances.",
  'CurseForge bağlantısı': 'CurseForge connection', 'Bağlı': 'Connected', 'Bağlı değil': 'Not connected',
  "Keşfet sayfasında CurseForge mod ve modpack'lerini arayıp kurabilmek için ücretsiz bir API anahtarı gerekir. Modrinth için anahtar gerekmez.":
    'A free API key is required to search and install CurseForge mods and modpacks on the Discover page. Modrinth needs no key.',
  '•••••••• (kayıtlı; değiştirmek için yeni anahtarı yapıştır)': '•••••••• (saved; paste a new key to replace it)',
  'Kaldır': 'Remove', "CurseForge'u bağla": 'Connect CurseForge',
  'CurseForge, üçüncü taraf launcher\'ların kişisel bir API anahtarı kullanmasını ister. Anahtar ücretsizdir: console.curseforge.com adresinde giriş yap, "API Keys" bölümünden anahtarı kopyalayıp aşağı yapıştır. Anahtar bu bilgisayarda, sistem kimlik deposunda tutulur.':
    'CurseForge requires third-party launchers to use a personal API key. The key is free: sign in at console.curseforge.com, copy the key from the "API Keys" section and paste it below. The key is stored on this computer in the system credential store.',
  'Çıkış yap': 'Sign out', 'Microsoft ile giriş': 'Sign in with Microsoft', 'Microsoft ile giriş yap': 'Sign in with Microsoft',
  'Azure uygulama (Client) ID': 'Azure application (Client) ID',
  'Premium sunuculara girmek için gerekir. Giriş, bir kod yazarak yapılır (adres yapıştırmak yok). Ama Minecraft API\'sini kullanabilmesi için Azure uygulamanın Microsoft tarafından onaylanmış olması gerekir (form: aka.ms/mce-reviewappid). Onay gelene kadar giriş "AzureAppNotPermitted" hatası verir. Çevrimdışı mod buna gerek duymaz.':
    'Required to join premium servers. Sign-in is done by entering a code (no URL pasting). To use the Minecraft API, however, your Azure app must be approved by Microsoft (form: aka.ms/mce-reviewappid). Until approval, sign-in fails with an "AzureAppNotPermitted" error. Offline mode does not need this.',
  'Açılan sayfada bu kodu gir ve Microsoft hesabınla giriş yap:': 'Enter this code on the page that opens and sign in with your Microsoft account:',
  'Kod kopyalandı': 'Code copied', 'Kodu kopyala': 'Copy code', 'Giriş bekleniyor…': 'Waiting for sign-in…',
  "Token'lar ve API anahtarları düz dosyaya yazılmaz, sistem kimlik deposunda tutulur.": 'Tokens and API keys are never written to plain files; they are kept in the system credential store.',
  // arkadaşlar
  'Riven arkadaşların': 'Your Riven friends', 'Minecraft kullanıcı adı': 'Minecraft username', 'Ekle': 'Add',
  "Korsan (çevrimdışı) hesap olarak ekle, Mojang'a bakma": "Add as a cracked (offline) account, skip the Mojang lookup",
  'Korsan / çevrimdışı hesap': 'Cracked / offline account', 'Premium hesap': 'Premium account', 'Korsan hesap': 'Cracked account',
  'Henüz kimseyi eklemedin.': "You haven't added anyone yet.", 'Kaldır ': 'Remove',
  "Oyunda eklediğin kişinin isminin yanında senin ekranında küçük bir Riven rozeti çıkar. Premium da, korsan (çevrimdışı) da olsa eklenebilir: Mojang'da bulunamayan isimler otomatik çevrimdışı hesap olarak eklenir. Rozeti görmek için Minecraft 1.21.11 (Fabric) oynaman yeterli, launcher modu kendisi ekliyor. Rozet kişiye göre senin ekranında yerel olarak çizilir, karşı tarafın da seni görmesi için o da seni kendi listesine eklemeli.":
    "A small Riven badge appears next to the name of anyone you add, on your screen in game. Both premium and cracked (offline) players can be added: names not found on Mojang are automatically added as offline accounts. To see the badge you just need to play Minecraft 1.21.11 (Fabric); the launcher adds the mod itself. The badge is drawn locally on your screen per person, so the other player must add you to their own list to see you too.",
  // discord
  'Discord durumu': 'Discord status', "Discord'a bağlı": 'Connected to Discord', "Discord'da göster": 'Show on Discord',
  'Discord Application ID (sadece rakam)': 'Discord Application ID (digits only)',
  'Instance adını göster (kapalıysa sadece "Minecraft oynuyor")': 'Show instance name (if off, only "Playing Minecraft")',
  'Profilinde "Riven Launcher oynuyor" ve hangi instance\'ta olduğun görünür. Kurulum (bir kere): discord.com/developers/applications → New Application → adı "Riven Launcher" yap → "Application ID"yi kopyalayıp aşağı yapıştır. İstersen Rich Presence → Art Assets bölümüne zip\'teki discord_logo.png dosyasını "riven" adıyla yükle. Discord masaüstü uygulaması açık olmalı.':
    'Your profile shows "Playing Riven Launcher" and which instance you are in. Setup (one time): discord.com/developers/applications → New Application → name it "Riven Launcher" → copy the "Application ID" and paste it below. Optionally, upload discord_logo.png from the zip under Rich Presence → Art Assets with the name "riven". The Discord desktop app must be running.',
  "Kaydedildi, Discord'a bağlanılıyor…": 'Saved, connecting to Discord…',
  // genel
  'Bağlanılıyor…': 'Connecting…', 'Bağlan': 'Connect', 'Arkadaş ekle': 'Add a friend', 'Gönder': 'Send',
  // afk bölgesi
  'Oyun yüklenirken ya da beklerken vakit geçir: sonsuz parkurda en yüksek puanı yap.': 'Kill time while the game loads or while you wait: chase the high score on an endless parkour.',
  'AFK PARKURU': 'AFK PARKOUR', 'Sonsuz parkur • 4 biyom • kombo puanı': 'Endless parkour • 4 biomes • combo score',
  'Boşluk / ↑ : zıpla (havada bir kez daha)': 'Space / ↑ : jump (once more in the air)',
  '← →  yavaşla / hızlan     ↓  hızlı düş': '← →  slow down / speed up     ↓  fast fall',
  'Başlamak için Boşluk ya da tıkla': 'Press Space or click to start', 'Devam etmek için Boşluk ya da tıkla': 'Press Space or click to resume',
  'Duraklatıldı': 'Paused', 'Oyun bitti': 'Game over', 'Yeni rekor!': 'New record!', 'REKOR': 'BEST', 'Tekrar: Boşluk / R': 'Retry: Space / R',
  'boşluk': 'gaps', 'yakın': 'near', 'Yakın!': 'Close!', 'Hız': 'Speed', 'Duvara çarptın': 'You hit a wall', 'Dikene çarptın': 'You hit a spike',
  'Suya düştün': 'You fell in the water', 'Yutan kuma battın': 'You sank into the quicksand', 'Lavda yandın': 'You burned in lava', 'Boşluğa düştün': 'You fell into the void',
  'Çim Ovası': 'Grassland', 'Çöl': 'Desert', 'Nether': 'Nether', 'End': 'The End',
  'Tam ekran': 'Fullscreen', 'Tam ekranı kapat': 'Exit fullscreen', 'F': 'F',
  'Ses: Açık': 'Sound: On', 'Ses: Kapalı': 'Sound: Off', 'Duraklat': 'Pause', 'Devam': 'Resume',
  'Boşluk / ↑ / Tık': 'Space / ↑ / Click', 'Zıpla (havada bir kez daha)': 'Jump (once more in the air)', '↓ / S': '↓ / S', 'Hızlı düş': 'Fast fall',
  '← → / A D': '← → / A D', 'Yavaşla / hızlan': 'Slow down / speed up', 'P': 'P', 'R': 'R', 'Yeniden başla': 'Restart', 'M': 'M', 'Ses': 'Sound',
  // keşfet / kurulum
  'Kurulum özeti': 'Install summary', 'Başlıyor…': 'Starting…', 'Kurulum başarısız': 'Installation failed',
  'Pencereyi kapatabilirsin; kurulum arka planda sürer. Alttaki çubuktan ilerlemeyi izleyebilirsin.': 'You can close this window; the installation continues in the background. Follow the progress in the bar below.',
  'Dosya sayısına göre birkaç dakika sürebilir. Şimdilik yalnızca Fabric paketleri desteklenir.': 'May take a few minutes depending on the file count. Only Fabric packs are supported for now.',
  'Instance adı': 'Instance name', 'Dünyayı kur': 'Install world', 'İndiriliyor… (büyük olabilir)': 'Downloading… (may be large)',
  "Bu dosyanın yazarı üçüncü taraf launcher'dan indirmeye izin vermiyor. Sayfasından indirip instance klasörüne koy:": "This file's author doesn't allow downloads from third-party launchers. Download it from its page and put it in the instance folder:",
  "Bu dosyanın yazarı üçüncü taraf launcher'dan indirmeye izin vermiyor. Sayfasından indirip instance klasörüne koy (eski sürüm silinmedi):": "This file's author doesn't allow downloads from third-party launchers. Download it from its page and put it in the instance folder (the old version was not deleted):",
  "Modrinth'te hazır dünya yok": 'No ready-made worlds on Modrinth', 'Dünyalar (haritalar) yalnızca CurseForge\'da paylaşılıyor.': 'Worlds (maps) are only shared on CurseForge.',
  "CurseForge'a geç": 'Switch to CurseForge', 'Önce ana sayfadan bir instance oluştur.': 'Create an instance from the home page first.',
  'Sonuç bulunamadı.': 'No results found.', 'Bağlantıyı test et': 'Test connection', 'Bağlantı testi': 'Connection test',
  'Sıralama': 'Sort by', 'Tüm sürümler': 'All versions', 'Sürüm filtresi': 'Version filter', 'Instance sürümüne uyanlar': 'Matching the instance version',
  'Daha fazla göster': 'Show more', 'Keşfet': 'Discover', 'Sayfayı aç': 'Open page', 'Klasörü aç': 'Open folder',
  "Hazır modpack'i tek tıkla yeni bir instance olarak kur. Sürüm, modlar ve ayarlar otomatik hazırlanır.": 'Install a ready-made modpack as a new instance in one click. Version, mods and settings are prepared automatically.',
  "Macera, parkur ve şehir haritaları gibi hazır dünyaları indir; seçtiğin instance'a otomatik kurulur.": 'Download ready-made worlds like adventure, parkour and city maps; they are installed into the selected instance automatically.',
  "Seçili instance'ın sürümüne uyumlu olanlar listelenir. Gerekli bağımlılıklar (Fabric API gibi) otomatik kurulur.": "Only items compatible with the selected instance's version are listed. Required dependencies (like Fabric API) are installed automatically.",
  'Hazır dünyalar CurseForge\'dan gelir (Modrinth\'te dünya yok). İndirilen dünya seçili instance\'ın saves klasörüne kurulur; oyunda "Tek Oyunculu" listesinde görünür.':
    'Ready-made worlds come from CurseForge (Modrinth has no worlds). The downloaded world is installed into the selected instance\'s saves folder and appears in the "Singleplayer" list in game.',
  'Bu proje için açıklama yok.': 'There is no description for this project.', 'Bu sürüme geç': 'Switch to this version',
  'Modpack kurulurken Minecraft sürümüne uyan en yeni sürüm otomatik seçilir.': 'When installing a modpack, the newest version matching the Minecraft version is picked automatically.',
  'Sürümleri görmek için bir instance seç.': 'Select an instance to see versions.', 'Açıklama': 'Description', 'Sürüm değiştir': 'Switch version',
  'İndiriliyor…': 'Downloading…', ' (kapalı)': ' (disabled)',
  // FPS BOOST / konsol
  '1.21.11 (Fabric) için en çok önerilen FPS modları "FPS BOOST" adlı ayrı bir instance\'a kuruluyor. Diğer instance\'larına dokunulmaz.': 'The most recommended FPS mods for 1.21.11 (Fabric) are being installed into a separate instance named "FPS BOOST". Your other instances are not touched.',
  "FPS BOOST'u aç": 'Open FPS BOOST', 'Kuruluyor, birkaç dakika sürebilir…': 'Installing, this may take a few minutes…',
  'FPS BOOST hazır!': 'FPS BOOST is ready!', 'FPS BOOST tamamlanamadı': 'FPS BOOST could not be completed', 'Kurulum ve oyun çıktıları burada görünür.': 'Install and game output appears here.',
  // giriş ekranı / özel renk
  'Oyuna başla': 'Start playing', 'Tekrar hoş geldin': 'Welcome back', 'Microsoft hesabınla giriş yapıldı. Karakterin hazır.': 'Signed in with your Microsoft account. Your character is ready.',
  'Adını yaz, karakterin hemen belirsin. Premium bir adsa gerçek skin\'in, değilse varsayılan karakter görünür.': 'Type your name and your character appears instantly. A premium name shows its real skin; otherwise the default character is shown.',
  "Çevrimdışı ad; tek kişilik dünyalar ve korsan/çevrimdışı sunucular içindir.": 'Offline name; for singleplayer worlds and cracked/offline servers.',
  'Geçmek için tıkla': 'Click to skip', 'Kırmızı': 'Red', 'Altın': 'Gold', 'Rengi kaydırarak değiştir': 'Drag to change the color',
  'Özel renk': 'Custom color', 'Büyüt / Geri al': 'Expand / Restore', 'Türkçe': 'Türkçe',
  'Sunucuya bağlanılamadı': 'Could not connect to the server',
});
EN_PATTERNS.push(
  [/^(\d+) dosyanın yazarı launcher'dan indirmeye izin vermiyor\. Sayfalarından elle indirip instance'ın mods klasörüne koy:$/, (m) => `${m[1]} file${m[1] === '1' ? "'s author doesn't" : "s' authors don't"} allow downloads from the launcher. Download them manually from their pages and put them in the instance's mods folder:`],
  [/^Paket \((.+)\) yeni bir instance olarak kurulur: Minecraft sürümü, modlar ve ayarlar otomatik hazırlanır\. Dosya sayısına göre birkaç dakika sürebilir\. Şimdilik yalnızca Fabric paketleri desteklenir\.$/, (m) => `The pack (${m[1]}) is installed as a new instance: Minecraft version, mods and settings are prepared automatically. May take a few minutes depending on the file count. Only Fabric packs are supported for now.`],
  [/^(.+) sayfasını aç$/, (m) => `Open ${m[1]} page`],
  [/^(.+)'te aç$/, (m) => `Open on ${m[1]}`],
  [/^(.+)'da aç$/, (m) => `Open on ${m[1]}`],
  [/^Bu instance (.+), mod kurulamaz\. Resource pack \/ shader seçebilir ya da Fabric \(1\.14\+\) ya da Forge bir instance oluşturabilirsin\.$/, (m) => `This instance is ${m[1]}, so mods can't be installed. You can pick resource packs / shaders, or create a Fabric (1.14+) or Forge instance.`],
  [/^Bu instance (.+), mod kurulamaz\. Fabric bir instance seç\.$/, (m) => `This instance is ${m[1]}, so mods can't be installed. Pick a Fabric instance.`],
  [/^(.+) için uyumlu sürüm bulunamadı\.$/, (m) => `No compatible version found for ${m[1]}.`],
  [/^(.+) sonuç$/, (m) => `${m[1]} results`],
  [/^Sürüm değiştirildi: (.+)$/, (m) => `Version switched: ${m[1]}`],
  [/^Kuruldu: (.+)$/, (m) => `Installed: ${m[1]}`],
  [/^Sürümler( \(\d+\))?$/, (m) => `Versions${m[1] || ''}`],
  [/^Kurulu • (.+?)( \(kapalı\))?$/, (m) => `Installed • ${m[1]}${m[2] ? ' (disabled)' : ''}`],
  [/^"(.+)" skini kütüphaneden silinsin mi\?$/, (m) => `Delete the skin "${m[1]}" from the library?`],
  [/^Giriş yapıldı: (.+)$/, (m) => `Signed in: ${m[1]}`],
  [/^(.+) eklendi \((.+)\)$/, (m) => `${m[1]} added (${m[2] === 'premium' ? 'premium' : 'cracked/offline'})`],
  [/^(.+) zaten listede$/, (m) => `${m[1]} is already on the list`],
  [/^(.+) olarak bağlısın • (.+)$/, (m) => `Connected as ${m[1]} • ${m[2]}`],
);


Object.assign(EN, {
  'Aktif': 'Active', 'Arka planda devam et': 'Continue in background', 'Beyaz': 'White', 'Bilinmeyen hata': 'Unknown error',
  'Elle indirme': 'Manual download', 'Elle indirmen gerekiyor': 'You need to download it manually', 'Galeri': 'Gallery',
  'HATA': 'ERROR', 'Hata ': 'Error ', 'Hedef instance': 'Target instance', 'Kim oynuyor?': "Who's playing?", 'Kur': 'Install',
  'Kur (en yeni)': 'Install (newest)', 'Kurulu': 'Installed', 'Kuruluyor…': 'Installing…',
  'Paket kuruldu': 'Pack installed', 'Paket kuruluyor': 'Installing pack', 'Paketi kur': 'Install pack', 'Riven Tag aktif': 'Riven Tag active',
  'Skin silindi': 'Skin deleted', 'Sunucu adresini yaz.': 'Enter the server address.', 'Tekrar dene': 'Try again', 'Temizle': 'Clear',
  'Test ediliyor…': 'Testing…', 'Turkuaz': 'Cyan', 'Yazar launcher indirmesine izin vermiyor olabilir': 'The author may not allow launcher downloads',
  'Yeni Instance': 'New Instance', 'Zaten kurulu.': 'Already installed.',
});

function tr(text) {
  if (LANG !== 'en' || !text) return text;
  const hit = EN[text];
  if (hit !== undefined) return hit;
  for (const [re, fn] of EN_PATTERNS) { const m = re.exec(text); if (m) return fn(m); }
  return text;
}
function setLang(code, persist) {
  if (code !== 'tr' && code !== 'en') return;
  LANG = code;
  document.documentElement.lang = code;
  if (persist) api('/lang', { method: 'POST', body: { lang: code } }).catch((e) => toast(e.message, 'error'));
  if (typeof route !== 'function' || !document.getElementById('view')) return;
  whoKey = ''; buildStatusbar(); renderStatus(); renderTopbar(); renderRail(); route();
}
