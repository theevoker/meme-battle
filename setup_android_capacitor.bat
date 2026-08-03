@echo off
TITLE Meme Battle - Capacitor Android Setup

echo ===================================================
echo     MEME BATTLE - AUTOMATIC CAPACITOR SETUP
echo ===================================================
echo.
echo Target Backend Server: https://meme.gamebywacht.site
set "VITE_SERVER_URL=https://meme.gamebywacht.site"

if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
)

echo.
echo Step 1: Installing Capacitor dependencies...
call npm install @capacitor/core @capacitor/cli @capacitor/android

if not exist "capacitor.config.json" if not exist "capacitor.config.ts" (
    echo.
    echo Step 2: Initializing Capacitor...
    call npx cap init "Meme Battle" "com.memebattle.app" --web-dir "dist"
)

echo.
echo Step 3: Generating templates and building frontend...
call node gen_templates.cjs
call npx vite build

echo.
echo Step 4: Copying meme templates to build folder...
if exist "meme _templates" (
    if not exist "dist\meme_templates" mkdir "dist\meme_templates"
    xcopy "meme _templates" "dist\meme_templates\" /E /I /Y /Q
)

if not exist "android" (
    echo.
    echo Step 5: Adding Android platform...
    call npx cap add android
)

echo.
echo Step 6: Syncing web assets with Android project...
call npx cap sync android

echo.
echo Step 7: Opening Android Studio...
call npx cap open android

echo.
echo ===================================================
echo   Android setup complete! Opening Android Studio...
echo ===================================================
pause
