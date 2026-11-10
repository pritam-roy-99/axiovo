# One-click Axiovo Personal launcher. Runs the existing local server without a terminal window.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$url = 'http://127.0.0.1:4317/prooflab.html'
try {
  # Do not start a second server instance when Axiovo Personal is already available.
  $alreadyRunning = $false
  try {
    $check = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:4317/api/bootstrap' -TimeoutSec 2
    $alreadyRunning = $check.local -eq $true -and -not [string]::IsNullOrWhiteSpace($check.token)
  } catch { }
  if ($alreadyRunning) {
    Start-Process $url
    return
  }
  Set-Location $root
  & (Join-Path $PSScriptRoot 'start.ps1')
} catch {
  Add-Type -AssemblyName System.Windows.Forms
  $message = "Axiovo Personal could not start.\n\n" + $_.Exception.Message + "\n\nOpen PowerShell and run:\ncd '$root'\npowershell -NoProfile -ExecutionPolicy Bypass -File .\\personal\\start.ps1"
  [void][System.Windows.Forms.MessageBox]::Show($message,'Axiovo Personal startup problem','OK','Error')
  exit 1
}
