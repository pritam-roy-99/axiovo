# Stop only the Axiovo Personal Node server that was launched from this checkout.
$ErrorActionPreference='Stop'
$server=(Join-Path $PSScriptRoot 'server.mjs')
$matches=Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
  $_.CommandLine -and $_.CommandLine.Contains($server)
}
foreach($process in $matches){
  Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
}
Write-Host ('Stopped '+@($matches).Count+' Axiovo Personal local server process(es).')
