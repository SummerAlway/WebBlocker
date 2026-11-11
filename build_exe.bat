@echo off
rem Build a single-file Windows exe with PyInstaller.
rem The produced file is dist\WebBlocker.exe and always asks for admin rights.
cd /d "%~dp0"

where python >nul 2>nul
if not %errorlevel%==0 (
    echo Python 3 was not found. Install it from https://www.python.org/downloads/windows/
    pause
    exit /b 1
)

python -m pip install --upgrade pyinstaller
if not %errorlevel%==0 (
    echo Failed to install PyInstaller.
    pause
    exit /b 1
)

python -m PyInstaller ^
    --noconfirm ^
    --clean ^
    --onefile ^
    --windowed ^
    --uac-admin ^
    --add-data "extension;extension" ^
    --name WebBlocker ^
    webblocker.py

if %errorlevel%==0 (
    echo.
    echo Done: %~dp0dist\WebBlocker.exe
) else (
    echo Build failed.
)
pause
