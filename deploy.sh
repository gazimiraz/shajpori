#!/bin/bash
# ── Shajpori Deployment Script ─────────────────────────────────────────────
# Run this on your Hostinger server after uploading the project
# Usage: bash deploy.sh

set -e
PROJECT_DIR="/var/www/shajpori"

echo "▶ Installing dependencies..."
cd $PROJECT_DIR
pnpm install --frozen-lockfile

echo "▶ Generating Prisma client..."
pnpm --filter @shaj/database run generate

echo "▶ Running database migrations..."
cd packages/database
npx prisma migrate deploy
cd $PROJECT_DIR

echo "▶ Building API..."
pnpm --filter @shaj/api build

echo "▶ Building Web..."
pnpm --filter @shaj/web build

echo "▶ Building Admin..."
pnpm --filter @shaj/admin build

echo "▶ Restarting PM2 apps..."
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Deployment complete!"
echo "   Web:   https://shajpori.com"
echo "   Admin: https://admin.shajpori.com"
echo "   API:   https://api.shajpori.com/api/v1"
