#!/bin/sh
set -e

echo "🚀 Preparing Skillage Mart (S-Mart) Container..."

# Ensure storage & bootstrap cache directories exist
mkdir -p /var/www/storage/framework/cache/data \
         /var/www/storage/framework/sessions \
         /var/www/storage/framework/views \
         /var/www/storage/logs \
         /var/www/storage/app/public \
         /var/www/storage/app/exports \
         /var/www/bootstrap/cache

# Create storage symlink if missing
if [ ! -d "/var/www/public/storage" ]; then
    php artisan storage:link || true
fi

# Clear old stale caches first
php artisan config:clear || true
php artisan route:clear || true

# Run optimization & caching in production
echo "⚡ Optimizing Laravel application cache..."
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

# Run database migrations if RUN_MIGRATIONS env is true
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🗄️ Running database migrations..."
    php artisan migrate --force
fi

# CRITICAL FIX: Ensure www-data owns all generated cache files & storage
# Otherwise worker running as www-data will crash with Permission Denied on root-owned cache files
echo "🔐 Setting permissions for www-data..."
chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

echo "✅ Container initialization complete! Starting Supervisor..."

exec /usr/bin/supervisord -c /etc/supervisord.conf
