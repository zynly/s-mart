#!/bin/sh
set -e

echo "🚀 Preparing Skillage Mart (S-Mart) Container..."

# Ensure storage & bootstrap cache directories exist and have proper permissions
mkdir -p /var/www/storage/framework/cache/data \
         /var/www/storage/framework/sessions \
         /var/www/storage/framework/views \
         /var/www/storage/logs \
         /var/www/storage/app/public \
         /var/www/storage/app/exports \
         /var/www/bootstrap/cache

chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Create storage symlink if missing
if [ ! -d "/var/www/public/storage" ]; then
    php artisan storage:link || true
fi

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

echo "✅ Container initialization complete! Starting Supervisor..."

exec /usr/bin/supervisord -c /etc/supervisord.conf
