<?php
require 'dbh.php';
require 'cors_headers.php';

// Determine environment and set appropriate session parameters
$is_dev = strpos($_SERVER['HTTP_HOST'], 'localhost') !== false;

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $is_dev ? null : '.mybricklog.com',
    'secure' => !$is_dev,
    'httponly' => true,
    'samesite' => 'Strict'
]);

session_start();

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
        
        // Set path relative to project root
        $project_root = dirname(dirname(__FILE__)); // Go up one level from lego-api
        $upload_dir = $project_root . '/public/images/users/';
        $upload_path = $upload_dir . $filename;
        
        // Debug logging in development
        if ($is_dev) {
            error_log('Project root: ' . $project_root);
            error_log('Upload directory: ' . $upload_dir);
            error_log('Full upload path: ' . $upload_path);
        }
        
        // Ensure upload directory exists
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0755, true);
            if ($is_dev) {
                error_log('Created directory: ' . $upload_dir);
            }
        }
        
        // Move file and update database
        if (move_uploaded_file($file['tmp_name'], $upload_path)) {
            try {
                // Delete old profile picture if exists
                $stmt = $pdo->prepare("SELECT profile_picture FROM users WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $old_picture = $stmt->fetchColumn();
                
                if ($old_picture) {
                    $old_file = $upload_dir . $old_picture;
                    if (file_exists($old_file)) {
                        unlink($old_file);
                    }
                }
                
                // Update database with new filename
                $stmt = $pdo->prepare("UPDATE users SET profile_picture = ? WHERE user_id = ?");
                $stmt->execute([$filename, $user_id]);
                
                $response['success'] = true;
                $response['filename'] = $filename;
            } catch (PDOException $e) {
                $response['error'] = 'Database error';
                error_log('Database error: ' . $e->getMessage());
                // Clean up uploaded file if database update fails
                unlink($upload_path);
            }
        } else {
            $response['error'] = 'Failed to save file';
            error_log('Failed to move uploaded file to: ' . $upload_path);
        }
    }
} else {
    $response['error'] = 'No file uploaded';
}

echo json_encode($response);
?>