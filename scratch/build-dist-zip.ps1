$ErrorActionPreference = "Stop"

$Root = "c:\Users\f\Desktop\fcord"
$Staging = Join-Path $Root "fcord-dist-staging"
$DestZip = Join-Path $Root "installer-src\assets\fcord-dist.zip"

Write-Host "1. Installing client dependencies (pnpm install)..." -ForegroundColor Cyan
Push-Location $Root
& pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "pnpm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "1b. Building Fcord client files (pnpm build)..." -ForegroundColor Cyan
& pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "pnpm build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "2. Creating staging directory..." -ForegroundColor Cyan
if (Test-Path $Staging) { Remove-Item $Staging -Recurse -Force }
New-Item -ItemType Directory -Path $Staging -Force | Out-Null

Write-Host "3. Copying compiled files..." -ForegroundColor Cyan
if (Test-Path "$Root\dist\desktop") {
    Copy-Item "$Root\dist\desktop\*" "$Staging\" -Recurse -Force
} else {
    Copy-Item "$Root\dist\*" "$Staging\" -Recurse -Force
}

Write-Host "4. Copying entry-point files..." -ForegroundColor Cyan
foreach ($f in @("fcord-index.js", "fcord-preload.js")) {
    $fpath = Join-Path $Root $f
    if (Test-Path $fpath) {
        Copy-Item $fpath "$Staging\" -Force
    }
}

Write-Host "5. Creating fcord-dist.zip at $DestZip..." -ForegroundColor Cyan
if (Test-Path $DestZip) { Remove-Item $DestZip -Force }
Compress-Archive -Path "$Staging\*" -DestinationPath $DestZip -Force

# Clean up staging
Remove-Item $Staging -Recurse -Force

Write-Host "Success: fcord-dist.zip successfully bundled into installer assets!" -ForegroundColor Green
