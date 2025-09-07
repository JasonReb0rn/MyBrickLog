<?php
if (isset($pdo)) {
    return;
}

// Load Composer autoloader
$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php'
];

$autoloaderFound = false;
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        require $path;
        $autoloaderFound = true;
        break;
    }
}

if (!$autoloaderFound) {
    die('Unable to find Composer autoloader');
}

// Load environment variables from .env if not in production
if (class_exists('Dotenv\Dotenv') && file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

// Database configuration
$db = $_ENV['MBL_SQL_DATABASE'] ?? $_ENV['MBL_SQL_DB'] ?? 'mybricklogdb';
$host = $_ENV['MBL_SQL_HOST'] ?? 'localhost';
$user = $_ENV['MBL_SQL_USER'] ?? $_ENV['MBL_SQL_USERNAME'] ?? 'root';
$pass = $_ENV['MBL_SQL_PASS'] ?? $_ENV['MBL_SQL_PASSWORD'] ?? '';
$port = $_ENV['MBL_SQL_PORT'] ?? '3306';

// Debug logging - this will help us troubleshoot
error_log("=== DATABASE CONNECTION DEBUG ===");
error_log("Host: " . $host);
error_log("Port: " . $port);
error_log("Database: " . $db);
error_log("User: " . $user);
error_log("Password length: " . strlen($pass));
error_log("All ENV vars: " . print_r($_ENV, true));

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
error_log("DSN: " . $dsn);

try {
    error_log("Attempting PDO connection...");
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
        PDO::ATTR_AUTOCOMMIT => true
    ]);
    error_log("Database connection successful!");
} catch (PDOException $e) {
    error_log("PDO Exception: " . $e->getMessage());
    error_log("PDO Error Code: " . $e->getCode());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'debug' => [
            'host' => $host,
            'port' => $port,
            'database' => $db,
            'user' => $user,
            'message' => $e->getMessage()
        ]
    ]);
    exit();
}
?>