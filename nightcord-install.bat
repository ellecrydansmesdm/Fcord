@echo off
:: Wrapper .bat pour lancer nightcord-install.ps1 facilement (double-clic)
title Nightcord — Installation
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nightcord-install.ps1"
if %errorlevel% neq 0 pause
