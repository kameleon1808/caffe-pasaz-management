@echo off
chcp 65001 >nul 2>&1
title Kafic App — Kreiranje instalera

REM ─── Proveri admin prava / Check admin rights ────────────────────────────────
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Potrebna su administratorska prava za kreiranje .exe instalera.
    echo  Pokretanje sa povisenim privilegijama...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d ""%~dp0"" && node scripts/build-installer.js && echo. && pause' -Verb RunAs -Wait"
    exit /b
)

REM ─── Vec imamo admin prava / Already have admin rights ───────────────────────
cd /d "%~dp0"

echo.
echo  ================================================
echo   KAFIC APP - Kreiranje Windows .exe instalera
echo  ================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  GRESKA: Node.js nije instaliran!
    echo.
    echo  Preuzmite i instalirajte Node.js 18+ sa:
    echo  https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

echo  Pokrecem build skript...
echo.

node scripts/build-installer.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Build nije uspeo. Pogledajte poruke iznad.
    echo.
)

pause
