@echo off
:: Wrapper .bat pour lancer fcord-install.ps1 facilement (double-clic)
title Fcord — Installation
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fcord-install.ps1"
if %errorlevel% neq 0 pause
