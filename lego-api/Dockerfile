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

# Install PHPMailer
RUN composer require phpmailer/phpmailer
RUN composer require vlucas/phpdotenv

# Enable necessary Apache modules
RUN a2enmod rewrite headers

# Enable .htaccess support in the default Apache virtual host
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copy PHP source code to the container
COPY . /var/www/html/
RUN composer install

EXPOSE 80

CMD ["apache2-foreground"]