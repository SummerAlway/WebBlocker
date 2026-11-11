@echo off
rem WebBlocker launcher for Windows
cd /d "%~dp0"

where pyw >nul 2>nul
if %errorlevel%==0 (
    pyw -3 "%~dp0webblocker.py"
    goto :eof
)

where pythonw >nul 2>nul
if %errorlevel%==0 (
    pythonw "%~dp0webblocker.py"
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    python "%~dp0webblocker.py"
    goto :eof
)

echo Python 3 was not found. Please install it from https://www.python.org/downloads/windows/
echo Remember to tick "Add python.exe to PATH" during installation.
pause
