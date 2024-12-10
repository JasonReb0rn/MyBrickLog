# backend Dockerfile
FROM php:7.4-apache

# Install necessary PHP extensions and tools
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install mysqli pdo pdo_mysql zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy PHP source code to the container FIRST
COPY . /var/www/html/

# Set working directory
WORKDIR /var/www/html

# Install dependencies in the correct location
RUN composer install

# Enable necessary Apache modules
RUN a2enmod rewrite headers

# Enable .htaccess support in the default Apache virtual host
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

EXPOSE 80

CMD ["apache2-foreground"]