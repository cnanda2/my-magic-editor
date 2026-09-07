; StemEducatorApp 1.7.0 - FULL offline installer (Inno Setup 6)
; Build:  C:\InnoSetup6\ISCC.exe installer\StemEducatorApp-FULL.iss
;     or: powershell -ExecutionPolicy Bypass -File installer\Build-SetupExe.ps1 FULL
;
; FULL = bundles backend node_modules + tools + frontend dist (no npm needed at install).
; - Detects Node >= 18 (bundled check + system check, version parsed)
; - Detects PostgreSQL via PATH, registry, service, and :5432 (no more silent miss)
; - Detects existing install via uninstall registry key, {app} marker, and :3001 listener
; - Basic checks: admin rights, disk space (>= 1 GB free), port 3001 conflict
; - Clean uninstall: stops server, removes firewall rule, wipes {app} + temp/logs/uploads

#define MyAppName "StemEducatorApp"
#define MyAppVersion "1.7.0"
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
UsePreviousAppDir=yes
DirExistsWarning=auto
OutputDir=Output
OutputBaseFilename=StemEducatorApp-Setup-{#MyAppVersion}-FULL
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
SetupLogging=yes
VersionInfoVersion={#MyAppVersion}
UninstallDisplayName={#MyAppName} {#MyAppVersion} (FULL)

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "firewall"; Description: "Add Windows Firewall rule (allow LAN access)"; GroupDescription: "Network:"; Flags: checkedonce

[Dirs]
Name: "{app}\backend\temp_sketches"; Permissions: everyone-modify users-modify
Name: "{app}\backend\logs"; Permissions: everyone-modify users-modify
Name: "{app}\backend\uploads"; Permissions: everyone-modify users-modify
Name: "{app}\backend\node_modules"; Permissions: everyone-modify users-modify

[Files]
; --- Core app (FULL includes node_modules pre-installed - no npm needed) ---
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
Source: "..\backend\firmware\*"; DestDir: "{app}\backend\firmware"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\node_modules\*"; DestDir: "{app}\backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
; --- Hardware deps (FULL) ---
Source: "..\tools\arduino-cli\*"; DestDir: "{app}\tools\arduino-cli"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\tools\find-arduino-port.ps1"; DestDir: "{app}\tools"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\tools\find-arduino-port.cpp"; DestDir: "{app}\tools"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "uninstall.bat"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "scripts\stop-server.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion

[Icons]
; Desktop shortcut is intentionally NOT created here - setup.js already creates a
; correct, OneDrive-aware one on every install/re-run (via the [Run] step below).
; A second one from Inno would use {autodesktop}'s all-users path, landing in a
; different physical folder than setup.js's per-user one -> two icons for one app.
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\build\favicon.ico"; Comment: "Start StemEducatorApp Server"
Name: "{group}\Setup Wizard"; Filename: "{app}\setup.bat"; WorkingDir: "{app}"; IconFilename: "{app}\build\favicon.ico"; Comment: "Re-run configuration wizard"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
; Run the full setup wizard after files are copied - visible and waits, so user sees result
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Setup.ps1"""; Description: "Run setup wizard now (recommended)"; Flags: postinstall waituntilterminated runascurrentuser
Filename: "{app}\setup.bat"; Description: "Run setup wizard (batch fallback)"; Flags: postinstall waituntilterminated unchecked runascurrentuser

[UninstallRun]
; Stop server first (kills node running this app's backend), then remove firewall rule
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\scripts\stop-server.ps1"""; Flags: runhidden; RunOnceId: "StopServer"
Filename: "powershell.exe"; Parameters: "-NoProfile -Command ""Remove-NetFirewallRule -DisplayName 'StemEducatorApp' -ErrorAction SilentlyContinue"""; Flags: runhidden; RunOnceId: "DelFirewall"

[UninstallDelete]
; Inno only removes files it installed - runtime dirs must be listed explicitly for full wipe
Type: filesandordirs; Name: "{app}\backend\logs"
Type: filesandordirs; Name: "{app}\backend\uploads"
Type: filesandordirs; Name: "{app}\backend\temp_sketches"
Type: filesandordirs; Name: "{app}\backend\node_modules"
Type: filesandordirs; Name: "{app}\frontend\node_modules"
Type: filesandordirs; Name: "{app}\frontend\dist"
Type: filesandordirs; Name: "{localappdata}\Temp\StemEducatorApp"
Type: files; Name: "{app}\setup.log"
Type: filesandordirs; Name: "{app}"

[Code]
const
  APP_REG_KEY = 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{3B9E9A6A-8F2C-4A1E-9C2D-HARDWAREBLOCKS01}_is1';

function GetNodeVersion(var Major: Integer): Boolean;
var
  Code: Integer;
  Tmp: AnsiString;
  P1: Integer;
begin
  Result := False;
  Major := 0;
  // node -v -> v22.23.2 ; parse major
  if Exec('cmd.exe', '/c node -v > "' + ExpandConstant('{tmp}\nodever.txt') + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, Code) then
  begin
    if LoadStringFromFile(ExpandConstant('{tmp}\nodever.txt'), Tmp) then
    begin
      Tmp := Trim(Tmp);
      if (Length(Tmp) > 1) and (Tmp[1] = 'v') then Delete(Tmp, 1, 1);
      P1 := Pos('.', Tmp);
      if P1 > 1 then Tmp := Copy(Tmp, 1, P1 - 1);
      Major := StrToIntDef(Trim(Tmp), 0);
      Result := Major > 0;
    end;
  end;
end;

function IsPostgresInstalled(): Boolean;
var
  Names: TArrayOfString;
  I: Integer;
  Code: Integer;
begin
  // 1) psql on PATH
  if Exec('cmd.exe', '/c where psql >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, Code) then
    if Code = 0 then begin Result := True; exit; end;
  // 2) well-known install dirs (v10..v18, both Program Files)
  for I := 10 to 18 do
  begin
    if FileExists(ExpandConstant('{pf}\PostgreSQL\' + IntToStr(I) + '\bin\psql.exe')) then begin Result := True; exit; end;
    if FileExists(ExpandConstant('{pf32}\PostgreSQL\' + IntToStr(I) + '\bin\psql.exe')) then begin Result := True; exit; end;
  end;
  // 3) EDB registry key
  if RegGetSubkeyNames(HKLM, 'SOFTWARE\PostgreSQL\Installations', Names) then
    if GetArrayLength(Names) > 0 then begin Result := True; exit; end;
  if RegGetSubkeyNames(HKLM, 'SOFTWARE\WOW6432Node\PostgreSQL\Installations', Names) then
    if GetArrayLength(Names) > 0 then begin Result := True; exit; end;
  // 4) Windows service present (postgresql-x64-*)
  if Exec('powershell.exe', '-NoProfile -Command "if (Get-Service postgresql* -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"', '', SW_HIDE, ewWaitUntilTerminated, Code) then
    if Code = 0 then begin Result := True; exit; end;
  Result := False;
end;

function IsPortListening(Port: Integer): Boolean;
var
  Code: Integer;
begin
  Result := False;
  if Exec('powershell.exe', '-NoProfile -Command "if (Get-NetTCPConnection -LocalPort ' + IntToStr(Port) + ' -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"', '', SW_HIDE, ewWaitUntilTerminated, Code) then
    Result := (Code = 0);
end;

function GetPrevInstallDir(): String;
begin
  // NOTE: {app} is NOT available in InitializeSetup - resolve from registry or default.
  if RegQueryStringValue(HKLM, APP_REG_KEY, 'InstallLocation', Result) then
    if Result <> '' then exit;
  if RegQueryStringValue(HKCU, APP_REG_KEY, 'InstallLocation', Result) then
    if Result <> '' then exit;
  Result := ExpandConstant('{autopf}\StemEducatorApp');
end;

function IsPreviousInstall(PrevDir: String): Boolean;
var
  Unins: String;
begin
  // 1) uninstall registry entry from a previous Inno install
  if RegQueryStringValue(HKLM, APP_REG_KEY, 'UninstallString', Unins) then begin Result := True; exit; end;
  if RegQueryStringValue(HKCU, APP_REG_KEY, 'UninstallString', Unins) then begin Result := True; exit; end;
  // 2) app marker from earlier install (registry-independent path - never use {app} here)
  if FileExists(PrevDir + '\backend\src\index.js') then begin Result := True; exit; end;
  if FileExists(PrevDir + '\unins000.exe') then begin Result := True; exit; end;
  if FileExists(PrevDir + '\unins001.exe') then begin Result := True; exit; end;
  Result := False;
end;

function HasDiskSpaceGB(Drive: String; NeedGB: Integer): Boolean;
var
  FreeMB, TotalMB: Cardinal;
begin
  Result := True;
  try
    // InMegabytes=True -> values come back in MB; be lenient on failure
    if GetSpaceOnDisk(Drive, True, FreeMB, TotalMB) then
      Result := (FreeMB > Cardinal(NeedGB) * 1024);
  except
    Result := True;
  end;
end;

function InitializeSetup(): Boolean;
var
  Major: Integer;
  NodeFound, PgFound, PrevFound, PortBusy: Boolean;
  Msg, PrevDir: String;
  Res: Integer;
begin
  Result := True;
  PrevDir := GetPrevInstallDir();
  NodeFound := GetNodeVersion(Major);
  PgFound := IsPostgresInstalled();
  PrevFound := IsPreviousInstall(PrevDir);
  PortBusy := IsPortListening(3001);

  // --- basic checks: hard requirements ---
  if not IsAdmin() then
  begin
    MsgBox('StemEducatorApp setup needs Administrator rights.' + #13#10 +
      'Please right-click the installer and choose "Run as administrator".',
      mbError, MB_OK);
    Result := False;
    exit;
  end;

  if not HasDiskSpaceGB(ExpandConstant('{autopf}'), 1) then
  begin
    MsgBox('Not enough free disk space (need at least 1 GB).' + #13#10 +
      'Free some space and run the installer again.',
      mbError, MB_OK);
    Result := False;
    exit;
  end;

  if not NodeFound then
  begin
    MsgBox('Node.js was not found on this machine.' + #13#10#13#10 +
      'Install Node.js 18 LTS or newer from https://nodejs.org, ' +
      'make sure "Add to PATH" is checked, then re-run this installer.',
      mbError, MB_OK);
    Result := False;
    exit;
  end;

  if Major < 18 then
  begin
    MsgBox('Node.js major version ' + IntToStr(Major) + ' is too old.' + #13#10 +
      'StemEducatorApp needs Node.js 18 or newer. Upgrade from https://nodejs.org first.',
      mbError, MB_OK);
    Result := False;
    exit;
  end;

  // --- existing install: warn + offer clean path ---
  if PrevFound or PortBusy then
  begin
    Msg := 'A previous StemEducatorApp install (or a server on port 3001) was detected.' + #13#10#13#10;
    if PortBusy then
      Msg := Msg + '- Port 3001 is already in use (server may still be running).' + #13#10;
    if PrevFound then
      Msg := Msg + '- Previous install found in ' + PrevDir + '.' + #13#10;
    Msg := Msg + #13#10 + 'Recommended: uninstall the old version first (keeps your database), ' +
      'stop any running server, then install fresh.' + #13#10#13#10 +
      'YES = continue anyway (overwrites files)' + #13#10 +
      'NO = stop and uninstall first';
    Res := MsgBox(Msg, mbConfirmation, MB_YESNO);
    if Res = IDNO then begin Result := False; exit; end;
  end;

  // --- postgres: soft requirement with clear guidance ---
  if not PgFound then
  begin
    MsgBox('PostgreSQL was NOT detected (no psql on PATH, no registry entry, no service, nothing on :5432).' + #13#10#13#10 +
      'The app needs PostgreSQL 14+ with a database for logins and data.' + #13#10#13#10 +
      'Options:' + #13#10 +
      '1) Install PostgreSQL now from https://www.postgresql.org/download/ (remember the postgres password),' + #13#10 +
      '   then continue - the setup wizard will create the database.' + #13#10 +
      '2) Continue without it - the wizard will fail at the database step and you must create it manually later.',
      mbInformation, MB_OK);
  end
  else if not IsPortListening(5432) then
  begin
    MsgBox('PostgreSQL looks installed, but nothing is listening on port 5432.' + #13#10#13#10 +
      'Start the service first: Win+R -> services.msc -> postgresql-x64-* -> Start.' + #13#10 +
      'Continuing anyway - the wizard will verify the connection and stop with a clear error if it cannot connect.',
      mbInformation, MB_OK);
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Result := '';
  // Best-effort: stop a server from a previous install so files are not locked
  Exec('powershell.exe',
    '-NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { $_.CommandLine -like ''*StemEducatorApp*'' -or $_.CommandLine -like ''*backend\\src\\index.js*'' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
    '', SW_HIDE, ewWaitUntilTerminated, Code);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
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

function InitializeUninstall(): Boolean;
begin
  if MsgBox('This will stop the server and remove ALL files in:' + #13#10 +
    ExpandConstant('{app}') + #13#10#13#10 +
    'Also removes logs, uploads, temp files and the firewall rule.' + #13#10#13#10 +
    'Your PostgreSQL database is NOT deleted. Remove it in pgAdmin/psql if needed.' + #13#10#13#10 +
    'Continue?', mbConfirmation, MB_YESNO) = IDYES then
    Result := True
  else
    Result := False;
end;
