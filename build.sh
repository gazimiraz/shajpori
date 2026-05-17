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

# Install ALL dependencies including devDependencies (prisma CLI, etc.)
# NODE_ENV=production skips devDeps - we need devDeps for the build
NODE_ENV=development $PNPM install --no-frozen-lockfile

# Generate Prisma client
$PNPM --filter @shaj/database run generate

# Build web app only
NODE_ENV=production $PNPM --filter @shaj/web build

echo "Build complete!"
