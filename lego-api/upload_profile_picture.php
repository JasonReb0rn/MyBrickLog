<?php
require 'dbh.php';
require 'cors_headers.php';

// Add AWS SDK usage only in this file
use Aws\S3\S3Client;

session_start();

// Initialize S3 client
$s3Config = [
    'version' => 'latest',
    'region'  => 'us-east-2',
    'credentials' => [
        'key'    => $_ENV['AWS_SES_KEY'] ?? '',
        'secret' => $_ENV['AWS_SES_SECRET'] ?? '',
    ]
];

// Only disable SSL verify in local development
if (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false) {
    $s3Config['http'] = [
        'verify' => false
    ];
}

$s3 = new S3Client($s3Config);

$response = ['success' => false];

// Verify user is logged in and matches the user_id
if (!isset($_SESSION['user_id']) || !isset($_POST['user_id']) || 
    $_SESSION['user_id'] != $_POST['user_id']) {
    $response['error'] = 'Unauthorized';
    echo json_encode($response);
    exit;
}

if (isset($_FILES['profile_picture'])) {
    $file = $_FILES['profile_picture'];
    $user_id = $_POST['user_id'];
    
    // Validate file
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    if (!in_array($file['type'], $allowed_types)) {
        $response['error'] = 'Invalid file type. Please upload a JPEG, PNG, or GIF.';
    } elseif ($file['size'] > $max_size) {
        $response['error'] = 'File too large. Maximum size is 5MB.';
    } elseif ($file['error'] !== UPLOAD_ERR_OK) {
        $response['error'] = 'Upload failed. Please try again.';
    } else {
        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'user_' . $user_id . '_' . time() . '.' . $extension;

        try {
            // Delete old profile picture if exists
            $stmt = $pdo->prepare("SELECT profile_picture FROM users WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $old_picture = $stmt->fetchColumn();
            
            if ($old_picture) {
                // Delete old file from S3
                try {
                    $s3->deleteObject([
                        'Bucket' => 'mybricklog',
                        'Key'    => 'profile-pictures/' . $old_picture
                    ]);
                } catch (Exception $e) {
                    // Log error but continue with upload
                    error_log('Failed to delete old S3 file: ' . $e->getMessage());
                }
            }
            
            // Upload new file to S3
            $result = $s3->putObject([
                'Bucket' => 'mybricklog',
                'Key'    => 'profile-pictures/' . $filename,
                'Body'   => fopen($file['tmp_name'], 'rb'),
                'ContentType' => $file['type']
            ]);
            
            // Get the public URL
            $imageUrl = $result['ObjectURL'];
            
            // Update database with new filename
            $stmt = $pdo->prepare("UPDATE users SET profile_picture = ? WHERE user_id = ?");
            $stmt->execute([$filename, $user_id]);
            
            $response['success'] = true;
            $response['filename'] = $filename;
            $response['url'] = $imageUrl;
            
        } catch (Exception $e) {
            $response['error'] = 'Upload failed: ' . $e->getMessage();
            error_log('S3 upload error: ' . $e->getMessage());
        }
    }
} else {
    $response['error'] = 'No file uploaded';
}

echo json_encode($response);
?>