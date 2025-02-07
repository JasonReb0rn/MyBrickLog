<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

use Aws\Ses\SesClient;
use Aws\Exception\AwsException;

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

            // Setup AWS SES client
            $config = [
                'version' => 'latest',
                'region'  => 'us-east-1',
                'credentials' => [
                    'key'    => $_ENV['AWS_S3_KEY'],
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
                            'Data' => 'Reset Your MyBrickLog Password',
                            'Charset' => 'UTF-8',
                        ],
                        'Body' => [
                            'Html' => [
                                'Data' => "Click the following link to reset your password: <a href=\"$resetURL\">$resetURL</a><br><br>This link will expire in 1 hour.",
                                'Charset' => 'UTF-8',
                            ],
                            'Text' => [
                                'Data' => "Click the following link to reset your password: $resetURL\n\nThis link will expire in 1 hour.",
                                'Charset' => 'UTF-8',
                            ],
                        ],
                    ],
                ]);

                if (isset($result['MessageId'])) {
                    $mailSent = true;
                    error_log("Password reset email sent successfully");
                }

            } catch (AwsException $e) {
                error_log("AWS SES Error: " . $e->getMessage());
                error_log("AWS Error Code: " . $e->getAwsErrorCode());
                error_log("AWS Error Type: " . $e->getAwsErrorType());
                throw $e;
            }

            // Only commit if email was sent successfully
            if ($mailSent) {
                $pdo->commit();
                error_log("Transaction committed - password reset email sent");
                
                // Log the reset request
                $log_action = "Password reset requested for user ID: " . $user['user_id'];
                insertLog($pdo, $user['user_id'], $log_action, $_SERVER['HTTP_USER_AGENT']);
            } else {
                $pdo->rollBack();
                error_log("Transaction rolled back - email not sent");
                $response['message'] = 'Unable to send password reset email. Please try again later.';
                echo json_encode($response);
                exit;
            }
        }

        // Always return success to prevent email enumeration
        $response['success'] = true;
        $response['message'] = 'If an account exists with this email, you will receive password reset instructions shortly.';

    } catch (Exception $e) {
        error_log("Exception caught during password reset: " . $e->getMessage());
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
            error_log("Transaction rolled back due to exception");
        }
        $response['message'] = 'An error occurred. Please try again later.';
    }
} else {
    $response['message'] = 'Invalid input';
}

echo json_encode($response);