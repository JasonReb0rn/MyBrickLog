<?php

require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

session_start();

// Log the logout before destroying the session
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $log_action = "User logged out";
    insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'AUTHENTICATION');
}

session_unset();
session_destroy();

echo json_encode(['success' => true]);
?>
