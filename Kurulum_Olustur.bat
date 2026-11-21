@echo off
setlocal
cd /d "%~dp0"
title Riven Launcher - Kurulum Olusturucu
rem Kullanim: Kurulum_Olustur.bat [hepsi ^| exe ^| linux ^| mobil]   (bos birakirsan menu acilir)
set "SECIM=%~1"
if defined SECIM goto :yonlendir

:menu
echo ============================================
echo   Riven Launcher - Kurulum Olusturucu
echo ============================================
echo   1 - Hepsi (Windows + Linux + Mobil)
echo   2 - Windows  (Setup.exe)
echo   3 - Linux    (Minecraft baslatabilir)
echo   4 - Mobil    (Android/Termux - tum islevler, oyun baslatma YOK)
echo   5 - Cikis
echo.
choice /c 12345 /n /m "Seciminiz (1-5): "
if errorlevel 5 exit /b 0
if errorlevel 4 set "SECIM=mobil" & goto :yonlendir
if errorlevel 3 set "SECIM=linux" & goto :yonlendir
if errorlevel 2 set "SECIM=exe" & goto :yonlendir
set "SECIM=hepsi"

:yonlendir
python --version >nul 2>&1
if errorlevel 1 (
  echo Python bulunamadi. https://www.python.org/downloads/ adresinden kur ^(Add to PATH isaretli^).
  pause
  exit /b 1
)
if /i "%SECIM%"=="linux" call :paket linux
if /i "%SECIM%"=="mobil" call :paket mobil
if /i "%SECIM%"=="exe" call :exe
if /i "%SECIM%"=="hepsi" call :paket hepsi
if /i "%SECIM%"=="hepsi" call :exe
if errorlevel 1 goto :hata

echo.
echo ============================================
echo   BITTI
if exist "%~dp0cikti" echo   Linux / Mobil paketleri: %~dp0cikti\
if exist "%~dp0installer\RivenLauncher-Setup.exe" echo   Windows kurulum dosyasi: %~dp0installer\RivenLauncher-Setup.exe
echo ============================================
if exist "%~dp0cikti" explorer "%~dp0cikti"
if /i "%SECIM%"=="exe" explorer "%~dp0installer"
if /i "%SECIM%"=="hepsi" explorer "%~dp0installer"
pause
exit /b 0

rem ---------------------------------------------------------------- Linux / Mobil
:paket
echo.
echo [%1] paketleniyor...
python tools\paketle.py %1
if errorlevel 1 exit /b 1
exit /b 0

rem ---------------------------------------------------------------- Windows Setup.exe
:exe
echo.
echo [Windows 1/4] Gerekli paketler kuruluyor...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt pyinstaller
if errorlevel 1 exit /b 1

echo.
echo [Windows 2/4] RivenLauncher.exe derleniyor (birkac dakika surebilir)...
python -m PyInstaller --noconfirm --clean RivenLauncher.spec
if errorlevel 1 exit /b 1
rem Windows eski ikonu onbellekten gostermesin diye ikon onbellegini yeniler
ie4uinit.exe -show >nul 2>&1

echo.
echo [Windows 3/4] Inno Setup araniyor...
call :findiscc
if defined ISCC goto :derle
echo Inno Setup yok, winget ile kuruluyor (izin penceresi cikabilir)...
winget install --id JRSoftware.InnoSetup -e --silent --accept-package-agreements --accept-source-agreements
call :findiscc
if defined ISCC goto :derle
goto :noinno

:derle
echo.
echo [Windows 4/4] Kurulum sihirbazi olusturuluyor...
"%ISCC%" installer.iss
if errorlevel 1 exit /b 1
echo.
echo Not: Imzasiz oldugu icin Windows SmartScreen uyari verebilir:
echo "Ek bilgi" - "Yine de calistir" de. Kodu kendin derledigin icin guvenli.
exit /b 0

:findiscc
set "ISCC="
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if exist "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
exit /b 0

:noinno
echo.
echo Inno Setup otomatik kurulamadi. Elle kur (ucretsiz, 1 dakika):
echo   https://jrsoftware.org/isdl.php   ^(Inno Setup 6 - stable^)
echo Kurduktan sonra bu dosyayi tekrar calistir.
echo Simdilik kurulumsuz hazir: %~dp0dist\RivenLauncher\RivenLauncher.exe
exit /b 1

:hata
echo.
echo Bir hata olustu, yukaridaki mesaji kontrol et.
pause
exit /b 1
