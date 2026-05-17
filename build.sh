#!/bin/bash
# Hostinger build script for Next.js monorepo
set -e

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install pnpm compatible with current Node version
npm install -g pnpm@8.15.4

echo "pnpm version: $(pnpm --version)"

# Install dependencies (skip lockfile check for CI)
pnpm install --no-frozen-lockfile

# Generate Prisma client
pnpm --filter @shaj/database run generate

# Build web app only
pnpm --filter @shaj/web build

echo "Build complete!"
