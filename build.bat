@echo off
REM Enable UTF-8 encoding for emojis
chcp 65001 > nul
echo 🌟 VRCNotify Builder V1.0.1 🌟

REM Automatically detect venv path in the current directory
echo 🔍 Searching for a virtual environment...
set VENV_PATH=
for /d %%d in (*) do (
    if exist "%%d\Scripts\activate.bat" (
        set VENV_PATH=%%d
        echo ✅ Virtual environment found: %%d 🎉
        goto :found
    )
)

REM If no venv is found, create one
echo ❌ No virtual environment found. Creating a new one... 🛠️
set VENV_PATH=venv
python -m venv %VENV_PATH%

if errorlevel 1 (
    echo ❌ Failed to create virtual environment. Please check your Python installation. 😢
    pause
    exit /b
)
echo ✅ Virtual environment created successfully! 🎉

:found
REM Activate the virtual environment
echo 🔗 Activating the virtual environment...
call "%VENV_PATH%\Scripts\activate.bat"

REM Install required packages
if exist requirements.txt (
    echo 📦 Installing required packages from requirements.txt...
    pip install -r requirements.txt

    if errorlevel 1 (
        echo ❌ Failed to install packages. Please check your requirements.txt. 😢
        deactivate
        pause
        exit /b
    )
    echo ✅ All packages installed successfully! 🎉
) else (
    echo ⚠️ No requirements.txt found. Skipping package installation.
)

REM Run the eel command
echo 🚀 Building VRCNotify with eel...
python -m eel --onefile --add-data="%VENV_PATH%\Lib\site-packages\pyfiglet;./pyfiglet" --hiddenimport=_ssl --icon=img/icon.ico --noconsole --name=VRCNotify --splash=img/splash.png ./app.py web

if errorlevel 1 (
    echo ❌ Build failed. Please check for errors in your script. 😢
    deactivate
    pause
    exit /b
)

REM Deactivate the virtual environment
echo 🔒 Deactivating the virtual environment...
deactivate

echo 🎉 Build completed successfully! You’re all set! 🎊
pause
