<?php

// Clear any existing output buffers
ob_start();

// Start session at the very beginning
session_start();

require 'dbh.php';
require 'cors_headers.php';

// Clean the buffer to avoid any unwanted output before setting headers
ob_clean();

$response = ['valid' => false];

if (isset($_SESSION['user_id'])) {
    $response['valid'] = true;
    $response['user_id'] = $_SESSION['user_id'];
}

echo json_encode($response);

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
