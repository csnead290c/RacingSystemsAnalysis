#!/bin/bash
# Production deployment script for RSA

set -e

SERVER="u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com"
PORT="18765"
REMOTE_PATH="/home/customer/www/racingsystemsanalysis.com/public_html"
PASSWORD="Rsa2025!@#"

echo "Building production bundle..."
npm run build

echo "Deploying to production..."

# Deploy backend API files
echo "Uploading API files..."
sshpass -p "$PASSWORD" scp -P $PORT api/parity.php $SERVER:$REMOTE_PATH/api/

# Deploy frontend - delete old assets first to avoid stale files
echo "Cleaning old assets..."
sshpass -p "$PASSWORD" ssh -p $PORT $SERVER "rm -rf $REMOTE_PATH/assets/*"

# Upload all assets
echo "Uploading new assets..."
sshpass -p "$PASSWORD" scp -r -P $PORT dist/assets/* $SERVER:$REMOTE_PATH/assets/

# Upload index.html
echo "Uploading index.html..."
sshpass -p "$PASSWORD" scp -P $PORT dist/index.html $SERVER:$REMOTE_PATH/

# Upload manifest
echo "Uploading manifest..."
sshpass -p "$PASSWORD" scp -P $PORT dist/manifest.webmanifest $SERVER:$REMOTE_PATH/

echo "Deployment complete!"
echo "Please hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R) to clear cache."
