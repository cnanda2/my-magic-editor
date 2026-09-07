; StemEducatorApp - Inno Setup 6 Installer
; Build: install Inno Setup 6 from https://jrsoftware.org/isinfo.php
; then:  iscc installer\StemEducatorApp.iss  ->  installer\Output\StemEducatorApp-Setup.exe
; Or run:  powershell -File installer\Build-SetupExe.ps1

#define MyAppName "StemEducatorApp"
#define MyAppVersion "1.1.1"
#define MyAppPublisher "StemEducatorApp"
#define MyAppURL "https://github.com/stemeducatorapp"
#define MyAppExeName "start.bat"

[Setup]
AppId={{3B9E9A6A-8F2C-4A1E-9C2D-HARDWAREBLOCKS01}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=StemEducatorApp-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\build\favicon.ico
UninstallDisplayIcon={app}\build\favicon.ico
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=no
LicenseFile=..\README.txt
InfoBeforeFile=..\README.txt
ChangesEnvironment=yes
CloseApplications=yes
RestartApplications=no
; Ask to run setup wizard at end
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "firewall"; Description: "Add Windows Firewall rule (allow LAN access)"; GroupDescription: "Network:"; Flags: checkedonce

[Files]
; --- Core app (exclude node_modules - installed by wizard, see setup.js:ensureDeps / start.js guard) ---
Source: "..\setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\setup.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\VERSION"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\*"; DestDir: "{app}\build"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\frontend\package.json"; DestDir: "{app}\frontend"; Flags: ignoreversion
Source: "..\backend\package.json"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\package-lock.json"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\src\*"; DestDir: "{app}\backend\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "uninstall.bat"; DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\build\favicon.ico"; Description: "Start StemEducatorApp Server"
Name: "{group}\Setup Wizard"; Filename: "{app}\setup.bat"; WorkingDir: "{app}"; IconFilename: "{app}\build\favicon.ico"; Description: "Re-run configuration wizard"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\build\favicon.ico"; Tasks: desktopicon

[Run]
; Run the full setup wizard after files are copied. Uses PowerShell version if available, else batch.
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Setup.ps1"""; Description: "Run setup wizard now (recommended)"; Flags: postinstall nowait skipifsilent runascurrentuser
Filename: "{app}\setup.bat"; Description: "Run setup wizard (batch fallback)"; Flags: postinstall nowait skipifsilent unchecked runascurrentuser

[UninstallDelete]
Type: filesandordirs; Name: "{app}\backend\node_modules"
Type: filesandordirs; Name: "{app}\frontend\node_modules"
Type: files; Name: "{app}\setup.log"

[Code]
var
  NodeOk, PsqlOk: Boolean;

function IsNodeInstalled: Boolean;
var
  V, Major: string;
  Code: Integer;
begin
  if Exec('cmd.exe', '/c where node >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, Code) then
    if Code = 0 then
    begin
      // try to get version
      Result := True;
      exit;
    end;
  Result := False;
end;

function InitializeSetup(): Boolean;
begin
  NodeOk := IsNodeInstalled;
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Port: string;
  Code: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Add firewall rule for default port if task selected
    if WizardIsTaskSelected('firewall') then
    begin
      Exec('powershell.exe',
        '-NoProfile -Command "New-NetFirewallRule -DisplayName ''StemEducatorApp'' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -ErrorAction SilentlyContinue | Out-Null"',
        '', SW_HIDE, ewWaitUntilTerminated, Code);
    end;
  end;
end;
