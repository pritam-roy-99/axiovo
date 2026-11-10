# Installs Axiovo Personal desktop and Start Menu shortcuts for the current Windows user.
# Does not request administrator privileges or install a background service.
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Run this installer on Windows 11.' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$homeDir = Join-Path $env:LOCALAPPDATA 'AxiovoPersonal'
New-Item -ItemType Directory -Path $homeDir -Force | Out-Null
$ico = Join-Path $homeDir 'axiovo-personal.ico'
# Draw the Axiovo desktop icon locally using Windows graphics. No external assets.
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(64,64)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$navy=[System.Drawing.Color]::FromArgb(12,41,68)
$cyan=[System.Drawing.Color]::FromArgb(83,209,227)
$graphics.Clear($navy)
$ring=New-Object System.Drawing.Pen($cyan,3.5)
$graphics.DrawEllipse($ring,9,9,46,46)
$font=New-Object System.Drawing.Font('Segoe UI',34,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$white=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$fmt=New-Object System.Drawing.StringFormat
$fmt.Alignment=[System.Drawing.StringAlignment]::Center
$fmt.LineAlignment=[System.Drawing.StringAlignment]::Center
$graphics.DrawString('A',$font,$white,[System.Drawing.RectangleF]::new(0,1,64,61),$fmt)
$icon=[System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream=[System.IO.File]::Create($ico)
try { $icon.Save($stream) } finally { $stream.Dispose();$graphics.Dispose();$bitmap.Dispose();$ring.Dispose();$font.Dispose();$white.Dispose();$fmt.Dispose();$icon.Dispose() }
# Windows account policies can block Start Menu writes even when Desktop is writable.
# Install the Desktop shortcut independently; Start Menu entries are best-effort.
$desktop=[Environment]::GetFolderPath('Desktop')
$menu=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
$powerShell=(Join-Path $PSHOME 'powershell.exe')
$wsh=New-Object -ComObject WScript.Shell
function New-AxiovoShortcut {
  param([string]$Folder,[string]$Name,[string]$Script,[string]$Description,[switch]$Hidden)
  $shortcut=$wsh.CreateShortcut((Join-Path $Folder ($Name+'.lnk')))
  $shortcut.TargetPath=$powerShell
  $visibility = if ($Hidden) { '-WindowStyle Hidden ' } else { '' }
  $shortcut.Arguments='-NoProfile -ExecutionPolicy Bypass '+$visibility+'-File "'+(Join-Path $PSScriptRoot $Script)+'"'
  $shortcut.WorkingDirectory=$root
  $shortcut.IconLocation=$ico+',0'
  $shortcut.Description=$Description
  $shortcut.Save()
}
$desktopOK=$false
try {
  New-AxiovoShortcut -Folder $desktop -Name 'Axiovo Personal' -Script 'launch.ps1' -Description 'Open your private Axiovo research homepage' -Hidden
  $desktopOK=$true
  Write-Host ('Axiovo Personal desktop shortcut created at: '+$desktop) -ForegroundColor Green
} catch {
  Write-Warning ('Cannot save shortcut on your Desktop: '+$_.Exception.Message)
}
$menuOK=$false
try {
  New-AxiovoShortcut -Folder $menu -Name 'Axiovo Personal' -Script 'launch.ps1' -Description 'Open your private Axiovo research homepage' -Hidden
  New-AxiovoShortcut -Folder $menu -Name 'Stop Axiovo Personal' -Script 'stop.ps1' -Description 'Stop the private Axiovo local server'
  $menuOK=$true
  Write-Host 'Start Menu shortcuts created.' -ForegroundColor Green
} catch {
  Write-Warning 'Windows denied Start Menu shortcut access. The desktop shortcut can still be used.'
  Write-Host 'To stop the app without the Start Menu entry, run: powershell -NoProfile -ExecutionPolicy Bypass -File .\personal\stop.ps1'
}
if (-not $desktopOK -and -not $menuOK) {
  throw 'Neither the Desktop nor Start Menu is writable. Ask your Windows administrator to permit shortcuts, or use personal\launch.ps1 directly.'
}
Write-Host 'Double-click Axiovo Personal to open the local Axiovo homepage.' -ForegroundColor Green
