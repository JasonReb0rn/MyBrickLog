<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

use Aws\Ses\SesClient;
use Aws\Exception\AwsException;

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$recaptchaToken = $data['recaptcha_token'] ?? '';

$response = ['success' => false, 'message' => ''];

// Verify ReCAPTCHA token
function verifyRecaptcha($token) {
    $secret = $_ENV['RECAPTCHA_SECRET_KEY'] ?? '';
    
    if (empty($secret) || empty($token)) {
        return false;
    }
    
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
    
    if ($result === false) {
        return false;
    }
    
    $responseData = json_decode($result);
    
    if (!$responseData) {
        return false;
    }
    
    return $responseData->success && ($responseData->score ?? 1) >= 0.5;
}

// Validate input parameters
if (empty($username)) {
    $response['message'] = 'Username is required.';
    echo json_encode($response);
    exit;
}

if (empty($email)) {
    $response['message'] = 'Email is required.';
    echo json_encode($response);
    exit;
}

if (empty($password)) {
    $response['message'] = 'Password is required.';
    echo json_encode($response);
    exit;
}

if (empty($recaptchaToken)) {
    $response['message'] = 'ReCAPTCHA verification is required.';
    echo json_encode($response);
    exit;
}

// Verify ReCAPTCHA first
if (!verifyRecaptcha($recaptchaToken)) {
    $response['message'] = 'ReCAPTCHA verification failed. Please try again.';
    echo json_encode($response);
    exit;
}

try {
    // Start transaction
    $pdo->beginTransaction();

    // Check if username already exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        $pdo->rollBack();
        $response['message'] = 'Username is already in use.';
        echo json_encode($response);
        exit;
    }

    // Check if email already exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        $pdo->rollBack();
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

    // Setup AWS SES client
    $config = [
        'version' => 'latest',
        'region' => 'us-east-1',
        'credentials' => [
            'key' => $_ENV['AWS_S3_KEY'],
            'secret' => $_ENV['AWS_S3_SECRET'],
        ]
    ];

    // For local development with SSL verification
    if ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['REMOTE_ADDR'] === '127.0.0.1') {
        $config['http'] = [
            'verify' => false
        ];
    }

    // Attempt to send email
    $mailSent = false;
    try {
        $client = SesClient::factory($config);
        $result = $client->sendEmail([
            'Source' => 'no-reply@mybricklog.com',
            'Destination' => [
                'ToAddresses' => [$email],
            ],
            'Message' => [
                'Subject' => [
                    'Data' => 'Verify your MyBrickLog account',
                    'Charset' => 'UTF-8',
                ],
                'Body' => [
                    'Html' => [
                        'Data' => "Click the following link to verify your account: <a href=\"$verificationURL\">$verificationURL</a>",
                        'Charset' => 'UTF-8',
                    ],
                    'Text' => [
                        'Data' => "Click the following link to verify your account: $verificationURL",
                        'Charset' => 'UTF-8',
                    ],
                ],
            ],
        ]);

        if (isset($result['MessageId'])) {
            $mailSent = true;
        }
        
    } catch (AwsException $e) {
        throw $e;
    }

    // Only commit if email was sent successfully
    if ($mailSent) {
        $pdo->commit();
        $response['success'] = true;
        $response['message'] = 'Registration successful! Please check your email to verify your account.';

        // Log successful registration
        $log_action = "Registration successful for username: '$username', email: '$email'";
        $log_useragent = $_SERVER['HTTP_USER_AGENT'];
        insertLog($pdo, null, $log_action, $log_useragent, null, 'AUTHENTICATION');
    } else {
        $pdo->rollBack();
        $response['message'] = 'Registration failed: Unable to send verification email. Please try again later.';
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = 'Registration failed: Unable to send verification email. Please try again later.';
    
    // Log the error
    $log_action = "Registration failed for username: '$username', email: '$email'. Error: " . $e->getMessage();
    $log_useragent = $_SERVER['HTTP_USER_AGENT'];
    insertLog($pdo, null, $log_action, $log_useragent, null, 'AUTHENTICATION');
}

echo json_encode($response);
?>