#!/bin/bash

# RSA Deployment Script
# Usage: ./deploy.sh [production|staging]

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-production}
BUILD_DIR="dist"
API_DIR="api"
PUBLIC_DIR="public"

# Server details
SERVER="u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com"
PORT="18765"
WEBROOT="~/www/racingsystemsanalysis.com/public_html"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Pre-deployment checks
log "Starting deployment to $ENVIRONMENT..."

# Check if we're on main branch for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" != "main" ]]; then
        error "Must be on main branch to deploy to production. Current branch: $CURRENT_BRANCH"
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        error "There are uncommitted changes. Please commit or stash before deploying."
    fi
fi

# Build frontend
log "Building frontend..."
npm run build || error "Build failed"

# Verify critical files exist
if [[ ! -f "$BUILD_DIR/index.html" ]]; then
    error "Build output missing index.html"
fi

if [[ ! -f "$API_DIR/parity.php" ]]; then
    error "API file missing: $API_DIR/parity.php"
fi

if [[ ! -f "$PUBLIC_DIR/.htaccess" ]]; then
    error "Missing .htaccess in public/ directory"
fi

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Prepare deployment package
log "Preparing deployment package..."
cp -r "$BUILD_DIR" "$TEMP_DIR/"
cp -r "$API_DIR" "$TEMP_DIR/"
cp "$PUBLIC_DIR/.htaccess" "$TEMP_DIR/"

# Verify config.php exists and has required keys
if [[ ! -f "$TEMP_DIR/api/config.php" ]]; then
    error "config.php missing from api directory"
fi

# Check for required config keys
log "Checking configuration..."
if ! grep -q "TEMPEST_STATION_IDS" "$TEMP_DIR/api/config.php"; then
    warn "TEMPEST_STATION_IDS not found in config.php"
fi

if ! grep -q "TEMPEST_API_KEY" "$TEMP_DIR/api/config.php"; then
    warn "TEMPEST_API_KEY not found in config.php"
fi

# Deploy to server
log "Deploying to server..."
rsync -avz --delete \
    -e "ssh -p $PORT" \
    "$TEMP_DIR/" \
    "$SERVER:$WEBROOT/" || error "Deployment failed"

# Verify deployment
log "Verifying deployment..."
ssh -p $PORT $SERVER "test -f $WEBROOT/index.html && test -f $WEBROOT/api/parity.php && test -f $WEBROOT/.htaccess" || error "Verification failed"

# Check that the new assets are being served
NEW_HASH=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' "$TEMP_DIR/index.html" | head -1)
if [[ -n "$NEW_HASH" ]]; then
    log "New asset hash: $NEW_HASH"
fi

log "Deployment completed successfully!"

# Show next steps
echo ""
echo "Next steps:"
echo "1. Test the application at https://racingsystemsanalysis.com"
echo "2. Check the Parity Portal and Weather tab"
echo "3. Verify API endpoints are responding correctly"
echo ""
echo "To rollback if needed:"
echo "  ssh -p $PORT $SERVER 'cd $WEBROOT && git checkout HEAD~1 -- .'"
