@echo off
REM ---- Changer la taille du curseur Windows (Accessibilité) ----
REM Taille du curseur :
REM 1 = Petit, 2 = Moyen, 3 = Grand, 4 = Très grand

set CURSOR_SIZE=4

REM Modifier la valeur de registre
REG ADD "HKCU\Control Panel\Cursors" /v "CursorBaseSize" /t REG_DWORD /d %CURSOR_SIZE% /f

REM Forcer la réinitialisation du curseur
RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters

echo Taille du curseur modifiée à %CURSOR_SIZE%.
pause
