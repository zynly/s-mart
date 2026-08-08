# ==============================================================================
# STAGE 1: Build Frontend Assets (Vite + React + TypeScript)
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ==============================================================================
# STAGE 2: Build PHP Dependencies (Composer)
# ==============================================================================
FROM php:8.3-fpm-alpine AS php-builder
WORKDIR /app

# Install system dependencies & PHP extensions required for Composer
RUN apk add --no-cache \
    git \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    oniguruma-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pdo_mysql \
    gd \
    zip \
    bcmath \
    intl \
    mbstring \
    exif

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-scripts --no-autoloader --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ==============================================================================
# STAGE 3: Final Production Image (Nginx + PHP-FPM + Supervisor)
# ==============================================================================
FROM php:8.3-fpm-alpine AS production
WORKDIR /var/www

# Install runtime packages (Nginx, Supervisor, Cron, PHP extensions)
RUN apk add --no-cache \
    nginx \
    supervisor \
    fcgi \
    libpng \
    libjpeg-turbo \
    freetype \
    libzip \
    icu \
    libpq \
    oniguruma

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pdo_mysql \
    gd \
    zip \
    bcmath \
    intl \
    mbstring \
    exif \
    opcache

# Copy OPcache configuration
COPY docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# Copy Nginx & Supervisor configuration
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf

# Copy application files from builders
COPY --chown=www-data:www-data . /var/www
COPY --from=php-builder --chown=www-data:www-data /app/vendor /var/www/vendor
COPY --from=frontend-builder --chown=www-data:www-data /app/public/build /var/www/public/build

# Copy and set entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Configure Laravel schedule cron for www-data
RUN echo "* * * * * cd /var/www && php artisan schedule:run >> /dev/null 2>&1" > /etc/crontabs/www-data

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
