#!/bin/bash
# Hostinger build script
set -e

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install pnpm to user home (avoids read-only system path)
export npm_config_prefix="$HOME/.npm-global"
mkdir -p "$HOME/.npm-global/bin"
npm install -g pnpm@8.15.4

PNPM="$HOME/.npm-global/bin/pnpm"
echo "pnpm version: $($PNPM --version)"

# Remove npm-created node_modules to avoid conflicts
rm -rf node_modules

# Install all workspace dependencies
$PNPM install --no-frozen-lockfile

# Generate Prisma client
$PNPM --filter @shaj/database run generate

# Build web app only
$PNPM --filter @shaj/web build

echo "Build complete!"
