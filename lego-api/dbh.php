<?php

require '../vendor/autoload.php';
use Dotenv\Dotenv;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
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
    echo 'Connection failed: ' . $e->getMessage();
}
?>