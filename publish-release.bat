@echo off
:: ─── Nightcord — Publier une nouvelle release sur GitHub ─────────────────────
:: Usage : publish-release.bat 1.18.1 "Description des changements"
:: Necessite : gh (GitHub CLI) — https://cli.github.com
::             pnpm, node, dotnet SDK (ou .NET Framework 4.x)

setlocal EnableDelayedExpansion

set VERSION=%~1
set NOTES=%~2

if "%VERSION%"=="" (
    echo [ERREUR] Usage: publish-release.bat VERSION "Notes de version"
    echo Exemple : publish-release.bat 1.18.1 "Correction bug audio"
    pause
    exit /b 1
)

if "%NOTES%"=="" set NOTES=Nightcord %VERSION%

:: Chemins de sortie
set DIST_DIR=dist\desktop
set OUT_DIR=release\installer
set DIST_ZIP=%OUT_DIR%\nightcord-dist.zip
set INSTALLER_EXE=%OUT_DIR%\Nightcord-Installer.exe
set VERSION_JSON=%OUT_DIR%\version.json
set DESKTOP_ASAR=dist\desktop.asar

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║    NIGHTCORD — Publication release v%VERSION%
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: ── 1. Mise à jour des versions dans les fichiers ─────────────────────────────
echo  [1/8] Mise a jour de la version vers %VERSION%...

powershell -NoProfile -Command "(Get-Content 'package.json') -replace '\"version\": \"[^\"]+\"', '\"version\": \"%VERSION%\"' ^| Set-Content 'package.json'"

powershell -NoProfile -Command "(Get-Content 'src\plugins\nightcordUpdater\index.tsx') -replace 'const CURRENT_VERSION = \"[^\"]+\"', 'const CURRENT_VERSION = \"%VERSION%\"' ^| Set-Content 'src\plugins\nightcordUpdater\index.tsx'" 2>nul

echo  [1/8] Version mise a jour.

:: ── 2. Envoi du code source sur GitHub ────────────────────────────────────────
echo.
echo  [2/8] Committer et pusher le code source...
git add .
git diff --quiet --cached
if errorlevel 1 (
    git commit -m "build: release v%VERSION%"
) else (
    echo  Aucun changement a committer.
)
git push
if errorlevel 1 (
    echo  [ERREUR] Impossible de push sur GitHub. Verifiez vos identifiants/droits d'acces.
    pause
    exit /b 1
)
echo  [2/8] Code source synchronise avec GitHub.

:: ── 3. Build JS (avec obfuscation automatique) ────────────────────────────────
echo.
echo  [3/8] Build + obfuscation en cours...
echo        (Les fichiers JS seront obfusques automatiquement)

taskkill /F /IM Discord.exe /T >nul 2>&1
taskkill /F /IM node.exe    /T >nul 2>&1
timeout /t 2 /nobreak >nul

call pnpm build
if errorlevel 1 (
    echo  [ERREUR] pnpm build a echoue.
    pause
    exit /b 1
)
echo  [3/8] Build + obfuscation termines !

:: ── 4. Preparer les assets supplementaires ──────────────────────────────────
echo.
echo  [4/8] Copie des assets (ffmpeg, node, modules...) vers %DIST_DIR%...

node scripts\build\collect-assets.mjs

echo  [4/8] Assets copies.

:: ── 5. Compiler Nightcord-Installer.exe ──────────────────────────────────────
echo.
echo  [5/8] Compilation de Nightcord-Installer.exe...

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "build-installer.ps1"
if errorlevel 1 (
    echo  [ERREUR] Compilation de l'installeur echouee.
    pause
    exit /b 1
)

if not exist "%INSTALLER_EXE%" (
    echo  [ERREUR] Nightcord-Installer.exe introuvable apres compilation.
    pause
    exit /b 1
)

for %%F in ("%INSTALLER_EXE%") do echo  [5/8] Nightcord-Installer.exe cree (%%~zF octets)

:: ── 6. Créer nightcord-dist.zip ──────────────────────────────────────────────
echo.
echo  [6/8] Creation de nightcord-dist.zip...

if not exist "%DIST_DIR%\patcher.js" (
    echo  [ERREUR] dist\desktop\patcher.js introuvable.
    pause
    exit /b 1
)

if exist "%DIST_ZIP%" del /F /Q "%DIST_ZIP%"

:: Nettoyer les fichiers inutiles avant compression
del /s /q "%DIST_DIR%\*.map" >nul 2>&1
del /s /q "%DIST_DIR%\*.LEGAL.txt" >nul 2>&1

:: Verifier que @babel est present avant de zipper
node scripts\build\verify-dist.mjs
if errorlevel 1 (
    echo  [ERREUR] Verification du dist echouee - @babel manquant ou incomplet.
    pause
    exit /b 1
)

:: Compresser avec .NET ZipFile directement (plus fiable que Compress-Archive pour node_modules)
powershell -NoProfile -Command "Add-Type -Assembly System.IO.Compression.FileSystem; $src = (Resolve-Path '%DIST_DIR%').Path; $dst = (Join-Path (Resolve-Path 'release\installer').Path 'nightcord-dist.zip'); [System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst, [System.IO.Compression.CompressionLevel]::Optimal, $false)"

if not exist "%DIST_ZIP%" (
    echo  [ERREUR] Impossible de creer nightcord-dist.zip
    pause
    exit /b 1
)

for %%F in ("%DIST_ZIP%") do echo  [6/8] nightcord-dist.zip cree (%%~zF octets)

:: ── 7. Mettre à jour version.json ─────────────────────────────────────────────
echo.
echo  [7/8] Mise a jour de version.json...

for /f "usebackq" %%d in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"`) do set ISO_DATE=%%d

(
    echo {
    echo   "version": "%VERSION%",
    echo   "releaseDate": "%ISO_DATE%",
    echo   "installerUrl": "https://github.com/nightcordoff/nightcord/releases/latest/download/Nightcord-Installer.exe",
    echo   "distUrl": "https://github.com/nightcordoff/nightcord/releases/latest/download/nightcord-dist.zip",
    echo   "downloadUrl": "https://github.com/nightcordoff/nightcord/releases/latest/download/desktop.asar",
    echo   "changelog": "%NOTES%"
    echo }
) > "%VERSION_JSON%"

echo  [7/8] version.json mis a jour.

:: ── 8. Publier sur GitHub Releases ────────────────────────────────────────────
echo.
echo  [8/8] Publication de la release v%VERSION% sur GitHub...

where gh >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] GitHub CLI non installe — https://cli.github.com
    pause
    exit /b 1
)

gh release create "v%VERSION%" ^
    "%INSTALLER_EXE%#Nightcord-Installer.exe" ^
    "%DIST_ZIP%#nightcord-dist.zip" ^
    "%DESKTOP_ASAR%#desktop.asar" ^
    "%VERSION_JSON%#version.json" ^
    --repo nightcordoff/nightcord ^
    --title "Nightcord v%VERSION%" ^
    --notes "%NOTES%" ^
    --latest

if errorlevel 1 (
    echo  [ERREUR] Echec de la publication GitHub.
    pause
    exit /b 1
)

:: ── Done ───────────────────────────────────────────────────────────────────────
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║  Nightcord v%VERSION% publie avec succes !
echo  ║
echo  ║  Fichiers publies sur GitHub :
echo  ║    Nightcord-Installer.exe    — installeur .exe avec GUI
echo  ║    nightcord-dist.zip         — JS obfusques (pour l'injec.)
echo  ║    version.json               — metadonnees de version
echo  ║
echo  ║  Les utilisateurs telechargeront Nightcord-Installer.exe
echo  ║  et le lanceront pour choisir leur Discord cible.
echo  ║  Aucun code source visible — tout est obfusque.
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.
pause
