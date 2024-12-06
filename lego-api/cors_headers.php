<?php
$allowed_origins = explode(',', $_ENV['MBL_CORS_ORIGIN']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
   header("Access-Control-Allow-Origin: $origin");
} else {
   header("Access-Control-Allow-Origin: " . $allowed_origins[0]); 
}

header('Content-Type: application/json');
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
   http_response_code(200);
   exit();
}