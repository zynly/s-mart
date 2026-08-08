# ==============================================================================
# STAGE 1: Build PHP Dependencies (Composer)
# ==============================================================================
FROM php:8.4-fpm-alpine AS php-builder
WORKDIR /app

# Install system dependencies & PHP extensions required for Composer
RUN apk add --no-cache \
    git \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zlib-dev \
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
RUN composer dump-autoload --optimize --no-dev --ignore-platform-reqs

# ==============================================================================
# STAGE 2: Build Frontend Assets (Vite + React + TypeScript)
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Install pnpm 9 matching lockfileVersion 9.0
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Copy vendor directory from php-builder so Vite can import vendor/tightenco/ziggy
COPY --from=php-builder /app/vendor /app/vendor

RUN pnpm run build

# ==============================================================================
# STAGE 3: Final Production Image (Nginx + PHP-FPM + Supervisor)
# ==============================================================================
FROM php:8.4-fpm-alpine AS production
WORKDIR /var/www

# Install runtime packages & temporary build dependencies for PHP extensions
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
    oniguruma \
    zlib \
 && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libzip-dev \
    zlib-dev \
    icu-dev \
    postgresql-dev \
    oniguruma-dev \
    linux-headers \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
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
    opcache \
 && apk del .build-deps

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
