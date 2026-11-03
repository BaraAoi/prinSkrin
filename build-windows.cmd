@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   prinSkrin - building Windows executable
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Install Node.js 20 or newer from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Installing dependencies, please wait...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :error
) else (
  echo [1/2] Dependencies already installed.
)

echo [2/2] Building installer and portable exe...
call npm run dist:win
if errorlevel 1 goto :error

echo.
echo Done. Files are in the "release" folder:
dir /b release\*.exe
start "" "release"
pause
exit /b 0

:error
echo.
echo [ERROR] Build failed. See messages above.
pause
exit /b 1
