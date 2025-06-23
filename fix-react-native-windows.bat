@echo off
REM =============================================
REM  React Native Clean & Rebuild Script (Windows)
REM =============================================

REM 1. Remove node_modules and build folders
ECHO Cleaning node_modules and build folders...
IF EXIST node_modules rmdir /s /q node_modules
IF EXIST android\app\build rmdir /s /q android\app\build
IF EXIST android\build rmdir /s /q android\build
IF EXIST ios\build rmdir /s /q ios\build
IF EXIST ios\Pods rmdir /s /q ios\Pods
IF EXIST ios\Podfile.lock del /q ios\Podfile.lock

REM 2. Reinstall dependencies
ECHO Installing npm dependencies...
npm install
IF %ERRORLEVEL% NEQ 0 (
    ECHO npm install failed. Exiting.
    EXIT /B 1
)

REM 3. Run codegen (if available)
ECHO Running react-native codegen (if available)...
where npx >nul 2>nul && npx react-native codegen || ECHO Skipping codegen (not available)

REM 4. Clean Android build
ECHO Cleaning Android build...
cd android
call gradlew clean
cd ..

REM 5. Install iOS pods (if on Mac)
IF EXIST ios\Podfile (
    ECHO Installing iOS pods...
    cd ios
    pod install
    cd ..
) ELSE (
    ECHO Skipping iOS pod install (Podfile not found)
)

ECHO =============================================
ECHO All done! Now try running:
ECHO   npx react-native run-android
ECHO   npx react-native run-ios
ECHO ============================================= 