# Axiovo Personal: run only on the user's Windows 11 laptop.
# Downloads OpenAI's official open-source Sign in with ChatGPT DevKit.
param([switch]$NoUpdate)
$ErrorActionPreference = 'Stop'
# Safe startup synchronization. Private data is stored outside the repo.
function Update-Axiovo {
 param([string]$ProjectRoot)
 if ($NoUpdate) {
  Write-Host 'Automatic Axiovo update skipped (-NoUpdate).' -ForegroundColor Yellow
  return
 }
 if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
  Write-Host 'No Git checkout; using installed files.' -ForegroundColor Yellow
  return
 }
 Push-Location $ProjectRoot
 try {
  $branchName = (& git branch --show-current | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $branchName -ne 'main') {
   Write-Host 'Auto-update skipped: not on main.' -ForegroundColor Yellow
   return
  }
  $changes = (& git status --porcelain --untracked-files=no | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $changes) {
   Write-Host 'Auto-update skipped: tracked local changes found.' -ForegroundColor Yellow
   return
  }
  $remote = (& git remote get-url origin | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $remote -notmatch '^https://github\.com/pritam-roy-99/axiovo(?:\.git)?$') {
   Write-Host 'Auto-update skipped: remote is not the official Axiovo repository.' -ForegroundColor Yellow
   return
  }
  Write-Host 'Checking GitHub for Axiovo updates...' -ForegroundColor Cyan
  & git -c credential.interactive=never pull --ff-only origin main
  if ($LASTEXITCODE -ne 0) {
   Write-Host 'Update unavailable or fast-forward refused. Using installed files.' -ForegroundColor Yellow
   return
  }
  Write-Host 'Axiovo is synchronized with the latest main branch.' -ForegroundColor Green
 } catch {
  Write-Host ('Update unavailable; using installed files: ' + $_.Exception.Message) -ForegroundColor Yellow
 } finally { Pop-Location }
}
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
Update-Axiovo -ProjectRoot $project
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.12+ is required: https://nodejs.org/en/download' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required. Install Node.js 22.12+ from nodejs.org.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required: https://git-scm.com/downloads/win' }
$version = (& node -p "process.versions.node").Trim()
$major = [int]($version.Split('.')[0])
$minor = [int]($version.Split('.')[1])
if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 12)) { throw "Node.js $version is too old. Install Node.js 22.12 or newer." }
$devkit = Join-Path (Split-Path $project -Parent) 'sign-in-with-chatgpt-devkit'
if (-not (Test-Path (Join-Path $devkit 'package.json'))) {
 Write-Host 'Cloning the official OpenAI Sign in with ChatGPT DevKit...' -ForegroundColor Cyan
 & git clone --depth 1 https://github.com/openai/sign-in-with-chatgpt-devkit.git $devkit
 if ($LASTEXITCODE -ne 0) { throw 'Unable to clone the official DevKit.' }
}
Set-Location $devkit
if (-not (Test-Path (Join-Path $devkit 'node_modules'))) {
 Write-Host 'Installing official DevKit dependencies...' -ForegroundColor Cyan
 & npm ci
 if ($LASTEXITCODE -ne 0) { throw 'DevKit npm install failed.' }
}
Write-Host 'Building the official local ChatGPT SDK...' -ForegroundColor Cyan
& npm run build -w @siwc/local
if ($LASTEXITCODE -ne 0) { throw 'Official DevKit build failed.' }
Set-Location $project
$env:AXIOVO_SIWC_DEVKIT = $devkit
Write-Host ''
Write-Host 'Axiovo Personal is restricted to this computer only.' -ForegroundColor Green
Write-Host 'Opening http://127.0.0.1:4317/prooflab.html' -ForegroundColor Green
& node (Join-Path $PSScriptRoot 'server.mjs')
