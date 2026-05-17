#!/bin/bash
# Hostinger build script - bypasses corepack
set -e

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Disable corepack so it doesn't intercept pnpm calls
corepack disable 2>/dev/null || true
export COREPACK_ENABLE_STRICT=0

# Install pnpm 8.x via npm (compatible with Node 20)
npm install -g pnpm@8.15.4

# Use direct path to bypass any corepack shim
PNPM="$(npm config get prefix)/bin/pnpm"
echo "pnpm path: $PNPM"
echo "pnpm version: $($PNPM --version)"

# Remove npm-created node_modules to avoid conflicts with pnpm
rm -rf node_modules

# Install all workspace dependencies with pnpm
$PNPM install --no-frozen-lockfile

# Generate Prisma client
$PNPM --filter @shaj/database run generate

# Build web app only
$PNPM --filter @shaj/web build

echo "Build complete!"
