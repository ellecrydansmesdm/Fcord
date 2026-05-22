@echo off
:: Wrapper .bat pour lancer nightcord-uninstall.ps1 facilement (double-clic)
title Nightcord — Désinstallation
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nightcord-uninstall.ps1"
if %errorlevel% neq 0 pause
