<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

$response = ['success' => false, 'message' => ''];

if (!empty($email)) {
    try {
        // Start transaction
        $pdo->beginTransaction();

        // Check if email exists
        $stmt = $pdo->prepare("SELECT user_id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Generate reset token
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Insert reset token
            $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['user_id'], $token, $expires]);

            $resetURL = "https://www.mybricklog.com/password-reset/$token";

            // Send email
            $mail = new PHPMailer(true);
            
            $mail->isSMTP();
            $mail->Host       = 'email-smtp.us-east-2.amazonaws.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['AWS_SES_KEY'];
            $mail->Password   = $_ENV['AWS_SES_SECRET'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('no-reply@mybricklog.com', 'MyBrickLog');
            $mail->addAddress($email, $user['username']);

            $mail->isHTML(true);
            $mail->Subject = 'Password Reset Request';
            $mail->Body    = "Click the following link to reset your password: <a href=\"$resetURL\">$resetURL</a><br><br>This link will expire in 1 hour.";
            $mail->AltBody = "Click the following link to reset your password: $resetURL\n\nThis link will expire in 1 hour.";

            $mail->send();
            
            $pdo->commit();
            $response['success'] = true;
            
            // Log the reset request
            $log_action = "Password reset requested for user ID: " . $user['user_id'];
            insertLog($pdo, $user['user_id'], $log_action, $_SERVER['HTTP_USER_AGENT']);
        }

        // Always return success to prevent email enumeration
        $response['success'] = true;
        $response['message'] = 'If an account exists with this email, you will receive password reset instructions shortly.';

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Password reset request error: " . $e->getMessage());
        $response['message'] = 'An error occurred. Please try again later.';
    }
} else {
    $response['message'] = 'Invalid input';
}

echo json_encode($response);