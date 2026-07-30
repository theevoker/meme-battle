@echo off
TITLE Meme Battle - Capacitor Android Setup

echo ===================================================
echo     MEME BATTLE - AUTOMATIC CAPACITOR SETUP
echo ===================================================
echo.
echo Step 1: Installing Capacitor Core, CLI, and Android...
call npm install @capacitor/core @capacitor/cli @capacitor/android

if not exist "capacitor.config.ts" if not exist "capacitor.config.json" (
    echo.
    echo Step 2: Initializing Capacitor Configuration...
    call npx cap init "Meme Battle" "com.memebattle.app" --web-dir "dist"
)

echo.
echo Step 3: Building Web Frontend Assets...
call npm run build

echo.
echo Step 4: Adding Android Platform...
call npx cap add android

echo.
echo Step 5: Syncing Project with Capacitor...
call npx cap sync android

echo.
echo Step 6: Opening Android Studio...
call npx cap open android

echo.
echo ===================================================
echo   Android conversion complete! Android Studio is opening.
echo ===================================================
pause
