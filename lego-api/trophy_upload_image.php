<?php
/**
 * Trophy image upload endpoint
 * Requires admin authentication
 */

require 'dbh.php';
require 'cors_headers.php';

use Aws\S3\S3Client;

session_start();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Check admin access
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    
    // Check if user has admin privileges
    $adminStmt = $pdo->prepare("SELECT is_admin FROM users WHERE user_id = ? AND verified = 1");
    $adminStmt->execute([$user_id]);
    $user = $adminStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['is_admin'] != 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }

    // Initialize S3 client
    $s3Config = [
        'version' => 'latest',
        'region'  => 'us-east-2',
        'signature_version' => 'v4',
        'credentials' => [
            'key'    => $_ENV['AWS_S3_KEY'] ?? '',
            'secret' => $_ENV['AWS_S3_SECRET'] ?? '',
        ]
    ];

    // Only disable SSL verify in local development
    if (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false) {
        $s3Config['http'] = [
            'verify' => false
        ];
    }

    $s3 = new S3Client($s3Config);

    // Check if file was uploaded
    if (!isset($_FILES['image'])) {
        // Check if the issue is due to size limits
        $upload_max_filesize = ini_get('upload_max_filesize');
        $post_max_size = ini_get('post_max_size');
        
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'No image file uploaded',
            'details' => "This could be due to file size limits. Current limits: upload_max_filesize=$upload_max_filesize, post_max_size=$post_max_size"
        ]);
        exit;
    }

    $file = $_FILES['image'];
    
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error_messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize limit (' . ini_get('upload_max_filesize') . ')',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form MAX_FILE_SIZE limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
        ];
        
        $error_msg = $error_messages[$file['error']] ?? 'Unknown upload error';
        
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $error_msg]);
        exit;
    }
    
    // Validate file
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    $max_size = 10 * 1024 * 1024; // 10MB
    
    if (!in_array($file['type'], $allowed_types)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.']);
        exit;
    }
    
    if ($file['size'] > $max_size) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File too large. Maximum size is 10MB.']);
        exit;
    }

    // Generate filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $timestamp = time();
    $random = bin2hex(random_bytes(8));
    $filename = 'trophy_' . $timestamp . '_' . $random . '.' . $extension;
    
    try {
        // Upload file to S3
        $result = $s3->putObject([
            'Bucket' => 'mybricklog',
            'Key'    => 'trophy-images/' . $filename,
            'Body'   => fopen($file['tmp_name'], 'rb'),
            'ContentType' => $file['type']
        ]);
        
        // Log the action
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
        $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
        
        $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
                   VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
        $logStmt = $pdo->prepare($logSql);
        $logStmt->execute([
            ':user_id' => $user_id,
            ':action' => "Uploaded trophy image: " . $filename,
            ':user_agent' => $userAgent,
            ':ip' => $ipAddress
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Trophy image uploaded successfully',
            'image' => [
                'filename' => $filename,
                'url' => "https://mybricklog.s3.us-east-2.amazonaws.com/trophy-images/" . $filename,
                'original_filename' => $file['name'],
                'file_size' => $file['size'],
                'mime_type' => $file['type']
            ]
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Trophy image upload error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to upload trophy image',
        'message' => 'An error occurred while uploading the image'
    ]);
}
?>
