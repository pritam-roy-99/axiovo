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
$desktop=[Environment]::GetFolderPath('Desktop')
$menu=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
$powerShell=(Join-Path $PSHOME 'powershell.exe')
$wsh=New-Object -ComObject WScript.Shell
foreach($folder in @($desktop,$menu)) {
  $shortcut=$wsh.CreateShortcut((Join-Path $folder 'Axiovo Personal.lnk'))
  $shortcut.TargetPath=$powerShell
  $shortcut.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'launch.ps1')+'"'
  $shortcut.WorkingDirectory=$root
  $shortcut.IconLocation=$ico+',0'
  $shortcut.Description='Axiovo Personal: private Windows research assistant, ChatGPT and local Ollama'
  $shortcut.Save()
}
Write-Host 'Axiovo Personal icon added to Desktop and Start Menu.' -ForegroundColor Green
Write-Host 'Double-click Axiovo Personal to open the local research workspace.' -ForegroundColor Green
Write-Host 'Right-click the icon and choose Pin to taskbar if desired.'
