@echo off
REM This file explains how to build the Linux version of the app
REM You cannot build Linux packages directly on Windows due to native dependencies

echo.
echo ========================================
echo   Linux Build Instructions
echo ========================================
echo.
echo The app uses native modules (serialport) that cannot be cross-compiled
echo from Windows to Linux. You need to build on a Linux system.
echo.
echo OPTION 1: Use WSL (Windows Subsystem for Linux)
echo ------------------------------------------------
echo 1. Install WSL with Ubuntu (if not already installed):
echo    wsl --install -d Ubuntu
echo.
echo 2. Open WSL and navigate to your project:
echo    cd /mnt/e/Thermo/Striling\ Engine
echo.
echo 3. Install Node.js in WSL (if not already installed):
echo    curl -fsSL https://deb.nodesource.com/setup_18.x ^| sudo -E bash -
echo    sudo apt-get install -y nodejs
echo.
echo 4. Run the build script:
echo    bash build-linux.sh
echo.
echo OPTION 2: Use Docker
echo ------------------------------------------------
echo 1. Create a Docker container with Node.js
echo 2. Mount your project folder
echo 3. Run the build script inside the container
echo.
echo OPTION 3: Build on a Linux Machine
echo ------------------------------------------------
echo 1. Copy your project to a Linux machine
echo 2. Install Node.js and npm
echo 3. Run: bash build-linux.sh
echo.
echo ========================================
echo.
pause


