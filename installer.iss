; Riven Launcher kurulum sihirbazi (Inno Setup 6.3 veya daha yeni)
;
; Animasyonlu karsilama: acilis sahnesi + yazan yazi, canli kurulum ilerleme animasyonu.
; Gorseller installer_assets\ klasorunde (installer_assets\gen_assets.py ile yeniden uretilir).
; Sessiz kurulumda (/SILENT, /VERYSILENT - otomatik guncelleme) animasyonlar hic calismaz.
; Acilis sahnesini atlamak icin:  RivenLauncher-Setup.exe /NOINTRO
#define AppName "Riven Launcher"
#ifndef AppVersion
  #define AppVersion "1.5.1"
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
; Sihirbaz biraz buyuk olsun: animasyonlar daha iyi gorunur
WizardSizePercent=120
WizardImageFile=installer_assets\wizard.bmp
WizardSmallImageFile=installer_assets\small.bmp
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "Masaüstü kısayolu oluştur"; GroupDescription: "Ek görevler:"

[Files]
; Animasyon kareleri: sadece kurulum sirasinda gecici klasore acilir, bilgisayara kopyalanmaz
Source: "installer_assets\intro_*.png"; DestDir: "{tmp}"; Flags: dontcopy nocompression
Source: "installer_assets\prog_*.png"; DestDir: "{tmp}"; Flags: dontcopy nocompression
Source: "dist\RivenLauncher\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Riven Launcher"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\{#AppExe}"; AppUserModelID: "Riven.Launcher"
Name: "{autodesktop}\Riven Launcher"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\{#AppExe}"; AppUserModelID: "Riven.Launcher"; Tasks: desktopicon

[Run]
Filename: "{sys}\ie4uinit.exe"; Parameters: "-show"; Flags: runhidden skipifdoesntexist
Filename: "{app}\{#AppExe}"; Description: "Riven Launcher'ı şimdi başlat"; Flags: nowait postinstall skipifsilent

; Kaldirirken instance'lar, dunyalar ve modlar (C:\Users\<sen>\.riven) SILINMEZ.

[Code]
const
  IntroFrames = 100;   // intro_000.png ... intro_099.png
  IntroFps = 20;
  IntroW = 640;
  IntroH = 360;
  ProgFrames = 41;     // prog_000.png ... prog_040.png
  ProgW = 840;
  ProgH = 300;

var
  SplashForm: TForm;
  SplashImg: TBitmapImage;
  SkipIntro: Boolean;
  ProgArt: TBitmapImage;
  LastProg: Integer;
  WelcomeHead, WelcomeBody, FinishHead: String;
  WelcomeTyped, FinishTyped: Boolean;

function WinTickCount: Integer;
  external 'GetTickCount@kernel32.dll stdcall';
function CreateRoundRectRgn(X1, Y1, X2, Y2, X3, Y3: Integer): THandle;
  external 'CreateRoundRectRgn@gdi32.dll stdcall';
function SetWindowRgn(hWnd: HWND; hRgn: THandle; bRedraw: BOOL): Integer;
  external 'SetWindowRgn@user32.dll stdcall';

function HasSwitch(const Name: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
    if CompareText(ParamStr(I), '/' + Name) = 0 then
      Result := True;
end;

function Pad3(N: Integer): String;
begin
  Result := IntToStr(N);
  while Length(Result) < 3 do
    Result := '0' + Result;
end;

// Bir animasyon karesini (png) gecici klasore acip goruntuye yukler
procedure ShowFrame(Img: TBitmapImage; const Prefix: String; N: Integer);
var
  FileName: String;
begin
  FileName := Prefix + Pad3(N) + '.png';
  ExtractTemporaryFile(FileName);
  Img.PngImage.LoadFromFile(ExpandConstant('{tmp}\') + FileName);
end;

// ---------------------------------------------------------------- ACILIS SAHNESI

procedure SplashClick(Sender: TObject);
begin
  SkipIntro := True;
end;

procedure PlayIntro;
var
  T0, Elapsed, Idx, Last: Integer;
begin
  SkipIntro := False;
  SplashForm := TForm.Create(nil);
  try
    SplashForm.BorderStyle := bsNone;
    SplashForm.FormStyle := fsStayOnTop;
    SplashForm.Position := poScreenCenter;
    SplashForm.Color := $060904;
    SplashForm.ClientWidth := ScaleX(IntroW);
    SplashForm.ClientHeight := ScaleY(IntroH);
    SplashForm.OnClick := @SplashClick;

    SplashImg := TBitmapImage.Create(SplashForm);
    SplashImg.Parent := SplashForm;
    SplashImg.SetBounds(0, 0, ScaleX(IntroW), ScaleY(IntroH));
    SplashImg.Stretch := True;
    SplashImg.OnClick := @SplashClick;

    ShowFrame(SplashImg, 'intro_', 0);

    // Yuvarlatilmis koseler
    SetWindowRgn(SplashForm.Handle,
      CreateRoundRectRgn(0, 0, SplashForm.ClientWidth + 1, SplashForm.ClientHeight + 1,
        ScaleX(44), ScaleX(44)), True);

    SplashForm.Show;
    Application.ProcessMessages;

    // Kareyi gecen sureye gore sec: yavas bilgisayarda kare atlar, sure sabit kalir
    T0 := WinTickCount;
    Last := 0;
    while not SkipIntro do
    begin
      Elapsed := WinTickCount - T0;
      Idx := (Elapsed * IntroFps) div 1000;   // en fazla birkac bin ms: tasma yok
      if Idx >= IntroFrames then
        Break;
      if Idx <> Last then
      begin
        ShowFrame(SplashImg, 'intro_', Idx);
        Last := Idx;
      end;
      Application.ProcessMessages;
      Sleep(5);
    end;
    SplashForm.Hide;
  finally
    SplashForm.Free;
    SplashForm := nil;
  end;
end;

// ---------------------------------------------------------------- YAZAN YAZI

procedure StyleHeading(Lbl: TNewStaticText; Size: Integer);
begin
  Lbl.Font.Size := Size;
  Lbl.Font.Style := [fsBold];
  Lbl.Font.Color := $4AA316;   // Riven yesili (BGR)
end;

// Metni harf harf yazar. Sayfa degisirse yarida keser.
procedure TypeInto(Lbl: TNewStaticText; const Txt: String; MsPerChar: Integer; PageID: Integer);
var
  I: Integer;
begin
  for I := 1 to Length(Txt) do
  begin
    if WizardForm.CurPageID <> PageID then
      Break;
    Lbl.Caption := Copy(Txt, 1, I) + '|';
    Application.ProcessMessages;
    Sleep(MsPerChar);
  end;
  Lbl.Caption := Txt;
end;

procedure WizardActivated(Sender: TObject);
begin
  if (WizardForm.CurPageID = wpWelcome) and (not WelcomeTyped) then
  begin
    WelcomeTyped := True;
    WizardForm.WelcomeLabel2.Caption := '';
    TypeInto(WizardForm.WelcomeLabel1, WelcomeHead, 32, wpWelcome);
    TypeInto(WizardForm.WelcomeLabel2, WelcomeBody, 9, wpWelcome);
    WizardForm.WelcomeLabel1.Caption := WelcomeHead;
    WizardForm.WelcomeLabel2.Caption := WelcomeBody;
  end;
end;

// ---------------------------------------------------------------- SIHIRBAZ

procedure InitializeWizard;
begin
  if WizardSilent then
    Exit;

  // Acilis sahnesi
  if not HasSwitch('NOINTRO') then
    PlayIntro;

  WelcomeHead := 'Riven Launcher ile özgürlüğe hazır mısın?';
  WelcomeBody :=
    'Birkaç saniye içinde Riven Launcher bilgisayarına yerleşecek.' + #13#10 + #13#10 +
    '  •  Tek tıkla kurulum' + #13#10 +
    '  •  Sunucu, modlar ve dünyalar hazır' + #13#10 +
    '  •  Güncellemeler otomatik gelir' + #13#10 + #13#10 +
    'Başlamak için İleri''ye tıkla.';
  FinishHead := 'Hazırsın! Özgürlük seni bekliyor.';

  // Karsilama sayfasi: buyuk yesil baslik, altinda aciklama
  StyleHeading(WizardForm.WelcomeLabel1, 17);
  WizardForm.WelcomeLabel1.Caption := WelcomeHead;
  WizardForm.WelcomeLabel1.AdjustHeight;
  WizardForm.WelcomeLabel2.Caption := WelcomeBody;
  WizardForm.WelcomeLabel2.Top := WizardForm.WelcomeLabel1.Top + WizardForm.WelcomeLabel1.Height + ScaleY(16);

  WizardForm.OnActivate := @WizardActivated;
end;

// Kurulum sayfasina canli animasyon paneli ekler
procedure PrepareProgressArt;
var
  W, H, Shift: Integer;
begin
  if ProgArt = nil then
  begin
    ProgArt := TBitmapImage.Create(WizardForm);
    ProgArt.Parent := WizardForm.InstallingPage;
    ProgArt.Stretch := True;
  end;
  W := WizardForm.InstallingPage.ClientWidth;
  H := (W * ProgH) div ProgW;
  ProgArt.SetBounds(0, 0, W, H);

  Shift := H + ScaleY(10) - WizardForm.StatusLabel.Top;
  WizardForm.StatusLabel.Top := WizardForm.StatusLabel.Top + Shift;
  WizardForm.ProgressGauge.Top := WizardForm.ProgressGauge.Top + Shift;
  WizardForm.FileNameLabel.Top := WizardForm.FileNameLabel.Top + Shift;

  LastProg := 0;
  ShowFrame(ProgArt, 'prog_', 0);
end;

procedure CurInstallProgressChanged(CurProgress, MaxProgress: Integer);
var
  Idx: Integer;
begin
  if (ProgArt = nil) or (MaxProgress <= 0) then
    Exit;
  Idx := Trunc(CurProgress / MaxProgress * (ProgFrames - 1));
  if Idx < 0 then Idx := 0;
  if Idx > ProgFrames - 1 then Idx := ProgFrames - 1;
  if Idx <> LastProg then
  begin
    LastProg := Idx;
    ShowFrame(ProgArt, 'prog_', Idx);
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
var
  Delta: Integer;
begin
  if WizardSilent then
    Exit;

  if CurPageID = wpInstalling then
    PrepareProgressArt;

  if (CurPageID = wpFinished) and (not FinishTyped) and (not NeedsRestart) then
  begin
    FinishTyped := True;
    // Bitis sayfasi: basligi buyut, alttaki ogeleri kaydir
    Delta := WizardForm.FinishedHeadingLabel.Height;
    StyleHeading(WizardForm.FinishedHeadingLabel, 17);
    WizardForm.FinishedHeadingLabel.Caption := FinishHead;
    WizardForm.FinishedHeadingLabel.AdjustHeight;
    Delta := WizardForm.FinishedHeadingLabel.Height - Delta;
    if Delta > 0 then
    begin
      WizardForm.FinishedLabel.Top := WizardForm.FinishedLabel.Top + Delta;
      WizardForm.RunList.Top := WizardForm.RunList.Top + Delta;
      if WizardForm.RunList.Height > Delta then
        WizardForm.RunList.Height := WizardForm.RunList.Height - Delta;
    end;
    TypeInto(WizardForm.FinishedHeadingLabel, FinishHead, 32, wpFinished);
  end;
end;
