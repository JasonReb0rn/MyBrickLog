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
$recaptchaToken = $data['recaptcha_token'] ?? '';

$response = ['success' => false, 'message' => ''];

// Debug PDO transaction support
error_log("PDO driver: " . print_r($pdo->getAttribute(PDO::ATTR_DRIVER_NAME), true));
error_log("Transaction support: " . print_r(method_exists($pdo, 'beginTransaction'), true));

// Verify ReCAPTCHA token
function verifyRecaptcha($token) {
    $secret = $_ENV['RECAPTCHA_SECRET_KEY'];
    $verifyURL = 'https://www.google.com/recaptcha/api/siteverify';

    $data = [
        'secret' => $secret,
        'response' => $token
    ];

    $options = [
        'http' => [
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];

    $context = stream_context_create($options);
    $result = file_get_contents($verifyURL, false, $context);
    $responseData = json_decode($result);

    return $responseData->success && $responseData->score >= 0.5;
}

if (!empty($username) && !empty($email) && !empty($password) && !empty($recaptchaToken)) {
    // Verify ReCAPTCHA first
    if (!verifyRecaptcha($recaptchaToken)) {
        error_log("ReCAPTCHA verification failed");
        $response['message'] = 'ReCAPTCHA verification failed. Please try again.';
        echo json_encode($response);
        exit;
    }

    try {
        error_log("Starting registration process for username: $username");
        
        // Start transaction
        $pdo->beginTransaction();
        error_log("Transaction started");

        // Check if username already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() > 0) {
            $pdo->rollBack();
            error_log("Username exists - rolled back");
            $response['message'] = 'Username is already in use.';
            echo json_encode($response);
            exit;
        }

        // Check if email already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            $pdo->rollBack();
            error_log("Email exists - rolled back");
            $response['message'] = 'Email is already associated with an account.';
            echo json_encode($response);
            exit;
        }

        // Prepare user data
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $verificationToken = bin2hex(random_bytes(16));
        $verificationURL = "https://www.mybricklog.com/verify/$verificationToken";

        // Insert the user
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, verification_token) VALUES (?, ?, ?, ?)");
        $stmt->execute([$username, $email, $hashedPassword, $verificationToken]);
        error_log("User inserted into database");

        // Attempt to send email
        $mailSent = false;
        $mail = new PHPMailer(true);
        try {
            // Enable detailed debug output
            $mail->SMTPDebug = 3;  // Enable verbose debug output
            $mail->Debugoutput = function($str, $level) {
                error_log("PHPMailer [$level] : $str");
            };

            // Log configuration before setting up SMTP
            error_log("PHPMailer Configuration:");
            error_log("Host: email-smtp.us-east-2.amazonaws.com");
            error_log("Port: 587");
            error_log("Username length: " . strlen($_ENV['AWS_SES_KEY']));
            error_log("Password length: " . strlen($_ENV['AWS_SES_SECRET']));

            $mail->isSMTP();
            $mail->Host       = 'email-smtp.us-east-2.amazonaws.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['AWS_SES_KEY'];
            $mail->Password   = $_ENV['AWS_SES_SECRET'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            // Log successful SMTP setup
            error_log("SMTP configuration complete");

            $mail->setFrom('no-reply@mybricklog.com', 'MyBrickLog');
            $mail->addAddress($email, $username);

            $mail->isHTML(true);
            $mail->Subject = 'Verify your account';
            $mail->Body    = "Click the following link to verify your account: <a href=\"$verificationURL\">$verificationURL</a>";
            $mail->AltBody = "Click the following link to verify your account: $verificationURL";

            // Log before sending
            error_log("Attempting to send email...");
            
            $mail->send();
            $mailSent = true;
            error_log("Verification email sent successfully");
            
        } catch (Exception $e) {
            error_log("Detailed PHPMailer Error: " . $e->getMessage());
            error_log("Full PHPMailer Error Info: " . print_r($mail->ErrorInfo, true));
            error_log("SMTP Status: " . $mail->getSMTPInstance()->getError()['error']);
            error_log("Failed to send verification email");
            throw $e;
        }

        // Only commit if email was sent successfully
        if ($mailSent) {
            $pdo->commit();
            error_log("Transaction committed - registration successful");
            $response['success'] = true;
            $response['message'] = 'Registration successful! Please check your email to verify your account.';

            // Log successful registration
            $log_action = "User registration successful for username: '$username'";
            $log_useragent = $_SERVER['HTTP_USER_AGENT'];
            insertLog($pdo, null, $log_action, $log_useragent);
        } else {
            $pdo->rollBack();
            error_log("Transaction rolled back - email not sent");
            $response['message'] = 'Registration failed: Unable to send verification email. Please try again later.';
        }

    } catch (Exception $e) {
        error_log("Exception caught during registration: " . $e->getMessage());
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
            error_log("Transaction rolled back due to exception");
        }
        $response['message'] = 'Registration failed: Unable to send verification email. Please try again later.';
        
        // Log the error
        $log_action = "Registration failed for username: '$username'. Error: " . $e->getMessage();
        $log_useragent = $_SERVER['HTTP_USER_AGENT'];
        insertLog($pdo, null, $log_action, $log_useragent);
    }
} else {
    error_log("Invalid registration input received");
    $response['message'] = 'Invalid input';
}

echo json_encode($response);
?>