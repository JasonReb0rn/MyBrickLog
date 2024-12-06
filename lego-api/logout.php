<?php
session_start();
session_unset();
session_destroy();

use Dotenv\Dotenv;
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}
require 'cors_headers.php';

echo json_encode(['success' => true]);
?>
