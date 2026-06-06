# build-installer.ps1 — Build Nightcord-Installer.exe (Electron + electron-builder)
# Usage: .\build-installer.ps1

$ErrorActionPreference = "Stop"
$Root      = $PSScriptRoot
$SrcDir    = Join-Path $Root "installer-src"
$OutDir    = Join-Path $Root "release\installer"
$OutExe    = Join-Path $OutDir "Nightcord-Installer.exe"

Write-Host ""
Write-Host "  [Nightcord] Building Electron installer..." -ForegroundColor Cyan

# ── Prerequis ───────────────────────────────────────────────────────────────
$nodeOk = $null
try { $nodeOk = & node --version 2>$null } catch {}
if (-not $nodeOk) {
    Write-Host "  [ERREUR] Node.js introuvable. Installez-le depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js : $nodeOk" -ForegroundColor DarkGray

# ── Dossier de sortie ────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# ── Installer les dependances si besoin ──────────────────────────────────────
$nodeModules = Join-Path $SrcDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "  [1/3] npm install --legacy-peer-deps..." -ForegroundColor DarkGray
    Push-Location $SrcDir
    & npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERREUR] npm install a echoue." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "  [1/3] Dependances installees." -ForegroundColor Green
} else {
    Write-Host "  [1/3] node_modules present, installation ignoree." -ForegroundColor DarkGray
}

# ── Compilation webpack ──────────────────────────────────────────────────────
Write-Host "  [2/3] electron-webpack (compilation)..." -ForegroundColor DarkGray
Push-Location $SrcDir
$previousNodeOptions = $env:NODE_OPTIONS
if ([string]::IsNullOrWhiteSpace($previousNodeOptions)) {
    $env:NODE_OPTIONS = "--openssl-legacy-provider"
} else {
    $env:NODE_OPTIONS = "--openssl-legacy-provider $previousNodeOptions"
}
& npm run compile
$compileExitCode = $LASTEXITCODE
$env:NODE_OPTIONS = $previousNodeOptions
if ($compileExitCode -ne 0) {
    Write-Host "  [ERREUR] Compilation webpack echouee." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  [2/3] Webpack OK." -ForegroundColor Green

# ── Packaging electron-builder ───────────────────────────────────────────────
Write-Host "  [3/3] electron-builder --win (packaging)..." -ForegroundColor DarkGray
Push-Location $SrcDir
& npx electron-builder --win -p never
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERREUR] electron-builder a echoue." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  [3/3] Packaging OK." -ForegroundColor Green

# ── Verification ─────────────────────────────────────────────────────────────
if (Test-Path $OutExe) {
    $size = [math]::Round((Get-Item $OutExe).Length / 1KB, 0)
    Write-Host ""
    Write-Host "  OK  Nightcord-Installer.exe compile ($size KB)" -ForegroundColor Green
    Write-Host "    -> $OutExe" -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "  [ERREUR] Nightcord-Installer.exe introuvable apres compilation." -ForegroundColor Red
    exit 1
}
