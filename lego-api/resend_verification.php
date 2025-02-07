<?php
require 'dbh.php';
require 'cors_headers.php';

use Aws\Ses\SesClient;
use Aws\Exception\AwsException;

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$verificationToken = $data['verificationToken'] ?? '';

$response = ['success' => false];

if (!empty($email) && !empty($verificationToken)) {
    $verificationURL = "https://www.mybricklog.com/verify/$verificationToken";

    $config = [
        'version' => 'latest',
        'region'  => 'us-east-1',
        'credentials' => [
            'key'    => $_ENV['AWS_S3_KEY'],
            'secret' => $_ENV['AWS_S3_SECRET'],
        ]
    ];

    if ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['REMOTE_ADDR'] === '127.0.0.1') {
        $config['http'] = ['verify' => false];
    }

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
            $response['success'] = true;
            error_log("Verification email resent successfully");
        }
    } catch (AwsException $e) {
        error_log("AWS SES Error: " . $e->getMessage());
        $response['error'] = 'Failed to send verification email';
    }
}

echo json_encode($response);