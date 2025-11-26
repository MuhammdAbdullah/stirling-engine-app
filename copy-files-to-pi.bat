@echo off
echo === Copying files to Raspberry Pi ===
echo.
echo You will be asked for password: @Matrix123
echo.

cd /d "E:\Thermo\Striling Engine"

echo Copying source archive...
scp stirling-source.zip abdullah@192.168.1.96:~/
if errorlevel 1 (
    echo ERROR: Failed to copy archive!
    pause
    exit /b 1
)

echo.
echo Copying build script...
scp build-on-pi.sh abdullah@192.168.1.96:~/
if errorlevel 1 (
    echo ERROR: Failed to copy build script!
    pause
    exit /b 1
)

echo.
echo === Files copied successfully! ===
echo.
echo Now SSH into your Pi and run:
echo   ssh abdullah@192.168.1.96
echo   bash build-on-pi.sh
echo.
pause

