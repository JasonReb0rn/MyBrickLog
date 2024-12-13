<?php
require 'dbh.php';
require 'cors_headers.php';

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';

$response = ['success' => false, 'message' => ''];

if (!empty($token)) {
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM password_reset_tokens 
            WHERE token = ? 
            AND used = 0 
            AND expires_at > NOW()
        ");
        $stmt->execute([$token]);
        
        if ($stmt->fetch()) {
            $response['success'] = true;
        } else {
            $response['message'] = 'Invalid or expired token';
        }
    } catch (Exception $e) {
        error_log("Token verification error: " . $e->getMessage());
        $response['message'] = 'An error occurred';
    }
} else {
    $response['message'] = 'Invalid input';
}

echo json_encode($response);