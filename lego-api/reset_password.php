<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$password = $data['password'] ?? '';

$response = ['success' => false, 'message' => ''];

if (!empty($token) && !empty($password)) {
   try {
       // Log the attempt (in its own transaction)
       $log_action = "Password reset attempted with token: $token";
       insertLog($pdo, null, $log_action, $_SERVER['HTTP_USER_AGENT']);

       // Start transaction for password reset
       $pdo->beginTransaction();
       
       // Get valid token
       $stmt = $pdo->prepare("
           SELECT t.*, u.user_id, u.username, u.email 
           FROM password_reset_tokens t
           JOIN users u ON t.user_id = u.user_id
           WHERE t.token = ? 
           AND t.used = 0 
           AND t.expires_at > NOW()
       ");
       $stmt->execute([$token]);
       $resetData = $stmt->fetch(PDO::FETCH_ASSOC);
       
       if ($resetData) {
           // Update password
           $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
           $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
           $stmt->execute([$hashedPassword, $resetData['user_id']]);

           // Mark token as used
           $stmt = $pdo->prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = ?");
           $stmt->execute([$token]);

           // Complete the main transaction first
           $pdo->commit();
           
           // Log the successful password reset (in its own transaction)
           $log_action = "Password reset completed for user ID: " . $resetData['user_id'];
           insertLog($pdo, $resetData['user_id'], $log_action, $_SERVER['HTTP_USER_AGENT']);

           $response['success'] = true;
           $response['message'] = 'Password successfully reset';
       } else {
           $pdo->rollBack();
           
           // Log the invalid token attempt (in its own transaction)
           $log_action = "Invalid or expired password reset token used: $token";
           insertLog($pdo, null, $log_action, $_SERVER['HTTP_USER_AGENT']);
           
           $response['message'] = 'Invalid or expired password reset link';
       }
   } catch (Exception $e) {
       if ($pdo->inTransaction()) {
           $pdo->rollBack();
       }
       error_log("Password reset error: " . $e->getMessage());
       
       // Log the error (in its own transaction)
       $log_action = "Password reset error occurred: " . $e->getMessage();
       insertLog($pdo, null, $log_action, $_SERVER['HTTP_USER_AGENT']);
       
       $response['message'] = 'An error occurred while resetting your password. Please try again.';
   }
} else {
   $response['message'] = 'Invalid input provided';
   
   // Log the invalid input (in its own transaction)
   $log_action = "Password reset attempted with invalid input";
   insertLog($pdo, null, $log_action, $_SERVER['HTTP_USER_AGENT']);
}

echo json_encode($response);
?>