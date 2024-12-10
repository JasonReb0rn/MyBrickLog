<?php

// Try local development path first
$localPath = __DIR__ . '/../vendor/autoload.php';
$containerPath = __DIR__ . '/vendor/autoload.php';

if (file_exists($containerPath)) {
    require $containerPath;
} elseif (file_exists($localPath)) {
    require $localPath;
} else {
    die('Unable to find autoloader');
}

// Only try to load Dotenv if not in Docker environment and if autoload exists
if (!isset($_ENV['MBL_SQL_HOST']) && class_exists('Dotenv\Dotenv')) {
    if (file_exists('../.env')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
        $dotenv->load();
    }
}

$db = 'mybricklogdb';
$host = $_ENV['MBL_SQL_HOST'] ?: 'not found';
$user = $_ENV['MBL_SQL_USER'] ?: 'not found';
$pass = $_ENV['MBL_SQL_PASS'] ?: 'not found';
$port = $_ENV['MBL_SQL_PORT'] ?: 'not found';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8";
try {
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}
?>