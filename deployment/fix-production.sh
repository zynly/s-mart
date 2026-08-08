#!/usr/bin/env bash
# ==============================================================================
# Script Perbaikan 1-Klik Production: Fix Supervisor FATAL & Rentetan 404 Nginx
# ==============================================================================

set -e

echo "🚀 [1/6] Menjalankan Git Pull Terbaru..."
git pull origin main

echo "📦 [2/6] Menginstal & Rebuild Asset Frontend (Vite)..."
pnpm install --frozen-lockfile || npm install
npm run build

echo "🗄️ [3/6] Menjalankan Database Migration & Symlink Storage..."
php artisan migrate --force
php artisan storage:link || true

echo "🧹 [4/6] Membersihkan Cache Application, Route, & Config..."
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache

echo "🔐 [5/6] Memperbaiki Permission Storage & Logs..."
sudo chown -R www-data:www-data storage bootstrap/cache public/images
sudo chmod -R 775 storage bootstrap/cache

echo "🔄 [6/6] Restarting Supervisor Queue Worker & Nginx..."
if command -v supervisorctl &> /dev/null; then
    sudo supervisorctl reread || true
    sudo supervisorctl update || true
    sudo supervisorctl restart all || true
    echo "✅ Supervisor Status:"
    sudo supervisorctl status
fi

if command -v systemctl &> /dev/null; then
    sudo systemctl reload nginx || true
fi

echo "🎉 Perbaikan Server Production Selesai!"
