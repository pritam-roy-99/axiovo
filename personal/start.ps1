# Axiovo Personal: run only on the user's Windows 11 laptop.
# Downloads OpenAI's official open-source Sign in with ChatGPT DevKit.
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
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
Start-Process 'http://127.0.0.1:4317/prooflab.html'
& node (Join-Path $PSScriptRoot 'server.mjs')
