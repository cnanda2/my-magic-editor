#!/usr/bin/env bash
# Create versioned zip for distribution (excludes node_modules, logs, secrets)
# Usage: bash scripts/create-zip.sh       # uses VERSION file
#        bash scripts/create-zip.sh 1.2.0
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VER="${1:-$(cat "$ROOT/VERSION" 2>/dev/null | tr -d ' \r\n')}"
if [ -z "$VER" ]; then VER="1.1.0"; fi
OUTDIR="$ROOT/releases"
NAME="StemEducatorApp-v${VER}.zip"
OUT="$OUTDIR/$NAME"

mkdir -p "$OUTDIR"
rm -f "$OUT"

echo "Creating $OUT (v$VER)..."
cd "$ROOT"

# Use zip with excludes. If zip not found, fallback to tar.gz
if command -v zip >/dev/null 2>&1; then
  zip -r -q "$OUT" \
    setup.bat \
    Setup.ps1 \
    setup.js \
    start.bat \
    start.js \
    package.json \
    README.txt \
    CHANGELOG.md \
    VERSION \
    backend/package.json \
    backend/package-lock.json \
    backend/.env.example \
    backend/src \
    backend/firmware \
    frontend/package.json \
    frontend/dist \
    build \
    docs \
    installer \
    scripts \
    -x "*/node_modules/*" "*/.DS_Store" "*/backend/node_modules/*" "*/frontend/node_modules/*" \
       "backend/.env" "backend/logs/*" "backend/*.log" "*.log" \
       "backend/temp_sketches/*" "backend/uploads/*" \
       "installer/Output/*" "releases/*" ".git/*" ".vscode/*" "*.zip"

  echo "Zip created:"
  ls -lh "$OUT"
  echo "Contents:"
  unzip -l "$OUT" | head -80
else
  TAR="$OUTDIR/StemEducatorApp-v${VER}.tar.gz"
  tar -czf "$TAR" --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='backend/.env' \
    setup.bat Setup.ps1 setup.js start.bat start.js package.json README.txt CHANGELOG.md VERSION \
    backend/src backend/firmware backend/package.json backend/.env.example \
    frontend/dist frontend/package.json build docs installer scripts
  echo "Tar created: $TAR"
  ls -lh "$TAR"
fi
