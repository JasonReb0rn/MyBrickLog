<?php
echo "=== Container File Debug ===\n";
echo "Current working directory: " . getcwd() . "\n";
echo "__DIR__: " . __DIR__ . "\n";
echo "\n";

echo "Files in current directory:\n";
$files = scandir('.');
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..') {
        echo "- $file\n";
    }
}

echo "\nFiles in /var/www/html:\n";
if (is_dir('/var/www/html')) {
    $files = scandir('/var/www/html');
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo "- $file\n";
        }
    }
} else {
    echo "/var/www/html does not exist\n";
}

echo "\nChecking specific file:\n";
echo "create_log.php exists in current dir: " . (file_exists('create_log.php') ? 'YES' : 'NO') . "\n";
echo "create_log.php exists in __DIR__: " . (file_exists(__DIR__ . '/create_log.php') ? 'YES' : 'NO') . "\n";
echo "create_log.php exists in /var/www/html: " . (file_exists('/var/www/html/create_log.php') ? 'YES' : 'NO') . "\n";

if (file_exists('create_log.php')) {
    echo "create_log.php file size: " . filesize('create_log.php') . " bytes\n";
    echo "create_log.php permissions: " . decoct(fileperms('create_log.php') & 0777) . "\n";
}
?> 