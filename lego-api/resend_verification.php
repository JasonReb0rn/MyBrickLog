<?php
require 'dbh.php';
require 'cors_headers.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$verificationToken = $data['verificationToken'] ?? '';

$response = ['success' => false];

if (!empty($email) && !empty($verificationToken)) {
    $verificationURL = "https://www.mybricklog.com/verify/$verificationToken"; // Update with your website URL

    // Send verification email
    $mail = new PHPMailer(true);
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'email-smtp.us-east-2.amazonaws.com'; // Set the SMTP server to send through
        $mail->SMTPAuth   = true;
        $mail->SMTPSecure = 'tls'; // Enable TLS encryption
        $mail->Username   = $_ENV['AWS_SES_KEY']; // SMTP username
        $mail->Password   = $_ENV['AWS_SES_SECRET']; // SMTP password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('no-reply@mybricklog.com', 'MyBrickLog');
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Verify your account';
        $mail->Body    = "Click the following link to verify your account: <a href=\"$verificationURL\">$verificationURL</a>";
        $mail->AltBody = "Click the following link to verify your account: $verificationURL";

        $mail->send();
        $response['success'] = true;
    } catch (Exception $e) {
        $response['error'] = 'Mailer Error: ' . $mail->ErrorInfo;
    }
}

echo json_encode($response);
?>
