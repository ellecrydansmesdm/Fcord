@echo off
title Nightcord Installer - Build
cd /d "%~dp0"

echo.
echo  ================================
echo   Nightcord Installer - Build
echo  ================================
echo.

:: Verifie que node est disponible
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Node.js introuvable. Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

:: Cree le dossier de sortie si besoin
if not exist "release\installer" mkdir "release\installer"

:: Entre dans le dossier installer-src
cd installer-src

:: Installe les dependances si node_modules absent
if not exist "node_modules" (
    echo  [1/3] Installation des dependances npm...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo  [ERREUR] npm install a echoue.
        cd ..
        pause
        exit /b 1
    )
    echo  [1/3] Dependances installees.
) else (
    echo  [1/3] Dependances deja presentes, on passe.
)

:: Compile avec electron-webpack
echo.
echo  [2/3] Compilation webpack (electron-webpack)...
call npm run compile
if errorlevel 1 (
    echo  [ERREUR] Compilation webpack echouee.
    cd ..
    pause
    exit /b 1
)
echo  [2/3] Compilation webpack reussie.

:: Build electron-builder -> Nightcord-Installer.exe dans ../release/installer/
echo.
echo  [3/3] Packaging electron-builder...
call npx electron-builder --win -p never
if errorlevel 1 (
    echo  [ERREUR] electron-builder a echoue.
    cd ..
    pause
    exit /b 1
)

cd ..

:: Verification
if not exist "release\installer\Nightcord-Installer.exe" (
    echo.
    echo  [ERREUR] Nightcord-Installer.exe introuvable apres build.
    pause
    exit /b 1
)

for %%F in ("release\installer\Nightcord-Installer.exe") do (
    echo.
    echo  [OK] Build reussi ^!
    echo  Fichier : release\installer\Nightcord-Installer.exe  (%%~zF octets^)
    echo.
)

:: Ouvre le dossier de sortie
explorer release\installer

pause
