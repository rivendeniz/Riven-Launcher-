; Riven Launcher kurulum sihirbazi (Inno Setup 6.3 veya daha yeni)
;
; Sade kurulum: karsilama, klasor ve hazir sayfalari yok. Tek tikla kurulur, ilerleme cubugu gorunur.
; Sessiz kurulumda (/VERYSILENT - otomatik guncelleme) hicbir pencere acilmaz.
#define AppName "Riven Launcher"
#ifndef AppVersion
  #define AppVersion "1.8.5"
#endif
#define AppExe "RivenLauncher.exe"

[Setup]
AppId={{3F6A9C1E-8B24-4D57-A1E3-5C9D7B2F4E60}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Riven
DefaultDirName={autopf}\Riven Launcher
DefaultGroupName=Riven Launcher
DisableProgramGroupPage=yes
; Onerilen secenekler otomatik: karsilama, klasor ve hazir sayfalari hic gosterilmez
DisableWelcomePage=yes
DisableDirPage=yes
DisableReadyPage=yes
; Yonetici izni gerekmez: varsayilan olarak sadece senin kullanicin icin kurulur
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=installer
OutputBaseFilename=RivenLauncher-Setup
SetupIconFile=riven.ico
UninstallDisplayIcon={app}\{#AppExe}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardImageFile=installer_assets\wizard.bmp
WizardSmallImageFile=installer_assets\small.bmp
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Files]
Source: "dist\RivenLauncher\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Riven Launcher"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\{#AppExe}"; AppUserModelID: "Riven.Launcher"
Name: "{autodesktop}\Riven Launcher"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\{#AppExe}"; AppUserModelID: "Riven.Launcher"

[Run]
Filename: "{sys}\ie4uinit.exe"; Parameters: "-show"; Flags: runhidden skipifdoesntexist
Filename: "{app}\{#AppExe}"; Description: "Riven Launcher'ı şimdi başlat"; Flags: nowait postinstall skipifsilent

; Kaldirirken instance'lar, dunyalar ve modlar (C:\Users\<sen>\.riven) SILINMEZ.
