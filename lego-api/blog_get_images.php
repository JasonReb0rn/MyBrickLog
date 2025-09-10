<?php
/**
 * Blog endpoint to fetch uploaded images
 * Requires admin authentication
 */

// Clear any existing output buffers
ob_start();

// Start session at the very beginning
session_start();

require 'dbh.php';
require 'cors_headers.php';

// Clean the buffer to avoid any unwanted output before setting headers
ob_clean();

try {
    // Check admin access
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        ob_end_flush();
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
        ob_end_flush();
        exit;
    }
    
    // Get parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 20;
    
    $offset = ($page - 1) * $limit;
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM blog_images";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute();
    $totalImages = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalImages / $limit);
    
    // Get images with uploader info
    $sql = "
        SELECT 
            bi.id,
            bi.filename,
            bi.original_filename,
            bi.file_path,
            bi.file_size,
            bi.mime_type,
            bi.alt_text,
            bi.created_at,
            u.username as uploader_username,
            u.user_id as uploader_id
        FROM blog_images bi
        LEFT JOIN users u ON bi.uploaded_by = u.user_id
        ORDER BY bi.created_at DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format image data
    foreach ($images as &$image) {
        $image['url'] = "https://mybricklog.s3.us-east-2.amazonaws.com/" . $image['file_path'];
        $image['uploader'] = [
            'user_id' => $image['uploader_id'],
            'username' => $image['uploader_username']
        ];
        $image['file_size_formatted'] = formatBytes($image['file_size']);
        
        // Clean up duplicate fields
        unset($image['uploader_id'], $image['uploader_username']);
    }
    
    echo json_encode([
        'success' => true,
        'images' => $images,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_images' => intval($totalImages),
            'images_per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Blog get images error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch images',
        'message' => 'An error occurred while retrieving images'
    ]);
}

function formatBytes($size, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $size >= 1024 && $i < count($units) - 1; $i++) {
        $size /= 1024;
    }
    
    return round($size, $precision) . ' ' . $units[$i];
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
