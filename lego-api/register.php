<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$response = ['success' => false, 'message' => ''];

if (!empty($username) && !empty($email) && !empty($password)) {
    try {
        // Check if username already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() > 0) {
            $response['message'] = 'Username is already in use.';
            echo json_encode($response);
            exit;
        }

        // Check if email already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            $response['message'] = 'Email is already associated with an account.';
            echo json_encode($response);
            exit;
        }

        // Proceed with registration
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $verificationToken = bin2hex(random_bytes(16));
        $verificationURL = "https://www.mybricklog.com/verify/$verificationToken";

        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, verification_token) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$username, $email, $hashedPassword, $verificationToken])) {
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = 'email-smtp.us-east-2.amazonaws.com'; // Set the SMTP server to send through
                $mail->SMTPAuth   = true;
                $mail->Username   = $_ENV['AWS_SES_KEY']; // SMTP username
                $mail->Password   = $_ENV['AWS_SES_SECRET']; // SMTP password
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = 587;
                

                $mail->setFrom('no-reply@mybricklog.com', 'MyBrickLog');
                $mail->addAddress($email, $username);

                $mail->isHTML(true);
                $mail->Subject = 'Verify your account';
                $mail->Body    = "Click the following link to verify your account: <a href=\"$verificationURL\">$verificationURL</a>";
                $mail->AltBody = "Click the following link to verify your account: $verificationURL";

                $mail->send();
                $response['success'] = true;
            } catch (Exception $e) {
                $response['message'] = 'Mailer Error: ' . $mail->ErrorInfo;
            }
        }

        // Log the user login action
        $log_action = "User has registered an account with username: '$username' and password: '$password'";
        $log_useragent = $_SERVER['HTTP_USER_AGENT'];
        insertLog($pdo, null, $log_action, $log_useragent);

    } catch (PDOException $e) {
        $response['message'] = 'Database Error: ' . $e->getMessage();
    }
} else {
    $response['message'] = 'Invalid input';
}

echo json_encode($response);
?>
