@echo off
:: Wrapper .bat pour lancer fcord-uninstall.ps1 facilement (double-clic)
title Fcord — Désinstallation
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fcord-uninstall.ps1"
if %errorlevel% neq 0 pause
