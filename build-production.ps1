Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  The STEM Educator - Production Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Scratch editor
Write-Host "[1/4] Building Scratch editor..." -ForegroundColor Yellow
node node_modules/webpack/bin/webpack.js --mode production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Webpack build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Copy build to production/public
Write-Host ""
Write-Host "[2/4] Copying editor build to production/public..." -ForegroundColor Yellow
if (Test-Path "production\public") { Remove-Item -Recurse -Force "production\public" }
Copy-Item -Recurse "build" "production\public"

# Step 3: Copy static assets (logo, extensions, examples)
Write-Host ""
Write-Host "[3/4] Copying static assets..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "static\*" "production\public\"

# Step 4: Install production dependencies
Write-Host ""
Write-Host "[4/4] Installing production dependencies..." -ForegroundColor Yellow
Set-Location "production"
npm install --production
Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To run:  cd production; npm start" -ForegroundColor White
Write-Host "  Share the 'production' folder with your client." -ForegroundColor White
Write-Host ""
