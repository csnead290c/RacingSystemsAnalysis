#!/bin/bash
# Production deployment script for RSA
# Uses gzip+base64 transfer to ensure file integrity
# Vite config includes timestamps in filenames to bust SiteGround CDN cache

set -e

SERVER="u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com"
PORT="18765"
REMOTE_PATH="/home/customer/www/racingsystemsanalysis.com/public_html"
PASSWORD="Rsa2025!@#"

echo "=== RSA Production Deployment ==="

echo "1. Building production bundle..."
rm -rf dist
npm run build

echo "2. Clearing server assets..."
sshpass -p "$PASSWORD" ssh -p $PORT $SERVER "rm -rf $REMOTE_PATH/assets && mkdir -p $REMOTE_PATH/assets"

echo "3. Uploading assets via gzip+base64..."
cd dist/assets
for file in *.js *.css; do
    echo "  $file..."
    gzip -c "$file" | base64 | sshpass -p "$PASSWORD" ssh -p $PORT $SERVER "base64 -d | gunzip > $REMOTE_PATH/assets/$file"
done
cd ../..

echo "4. Uploading index.html and manifest..."
sshpass -p "$PASSWORD" scp -P $PORT dist/index.html dist/manifest.webmanifest $SERVER:$REMOTE_PATH/

echo "5. Verifying all files..."
ERRORS=0
for file in dist/assets/*.js dist/assets/*.css; do
    fname=$(basename "$file")
    local_size=$(wc -c < "$file" | tr -d ' ')
    remote_size=$(sshpass -p "$PASSWORD" ssh -p $PORT $SERVER "wc -c < $REMOTE_PATH/assets/$fname" | tr -d ' ')
    if [ "$local_size" = "$remote_size" ]; then
        echo "  ✓ $fname: $local_size bytes"
    else
        echo "  ✗ $fname: local=$local_size remote=$remote_size MISMATCH!"
        ERRORS=$((ERRORS + 1))
        exit 1
    fi
done

echo ""
echo "=== Deployment Complete ==="
echo "Please clear browser cache and refresh"
