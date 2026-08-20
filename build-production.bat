@echo off
echo ============================================
echo  The STEM Educator - Production Build
echo ============================================
echo.

echo [1/4] Building Scratch editor...
call node node_modules/webpack/bin/webpack.js --mode production
if errorlevel 1 (
    echo ERROR: Webpack build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Copying editor build to production/public...
if exist "production\public" rmdir /s /q "production\public"
xcopy "build" "production\public\" /E /I /Q /Y

echo.
echo [3/4] Copying static assets...
xcopy "static" "production\public\" /E /I /Q /Y

echo.
echo [4/4] Installing production dependencies...
cd production
call npm install --production
cd ..

echo.
echo ============================================
echo  BUILD COMPLETE!
echo ============================================
echo.
echo  To run: cd production ^& npm start
echo  Share the "production" folder with your client.
echo.
pause
