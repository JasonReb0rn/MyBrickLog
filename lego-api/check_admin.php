<?php
/**
 * Admin authentication check endpoint
 * This endpoint verifies that the current user is both logged in and has admin privileges
 */

// Clear any existing output buffers
ob_start();

// Start session at the very beginning
session_start();

require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

// Clean the buffer to avoid any unwanted output before setting headers
ob_clean();

$response = ['is_admin' => false, 'valid' => false];

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    
    try {
        // Double-check admin status from database for security
        $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE user_id = ? AND verified = 1");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && $user['is_admin'] == 1) {
            $response['valid'] = true;
            $response['is_admin'] = true;
            $response['user_id'] = $user_id;
            
            // Don't log successful admin verification checks - too noisy
            // Only log failed attempts as security events
        } else {
            // Log unauthorized admin access attempt
            $log_action = "Unauthorized admin access attempt by user ID: $user_id";
            insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SECURITY');
        }
    } catch (PDOException $e) {
        error_log("Admin check database error: " . $e->getMessage());
        $response['error'] = 'Database error occurred';
    }
} else {
    // Log admin access attempt without session
    $log_action = "Admin access attempted without valid session";
    insertLog($pdo, null, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SECURITY');
}

echo json_encode($response);

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
