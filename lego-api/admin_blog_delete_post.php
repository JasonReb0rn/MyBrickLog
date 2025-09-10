<?php
/**
 * Admin endpoint to delete blog posts
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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    ob_end_flush();
    exit;
}

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
    
    $userId = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $postId = isset($input['id']) ? intval($input['id']) : 0;
    
    if ($postId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid post ID is required']);
        exit;
    }
    
    // Get post info for logging
    $postInfoStmt = $pdo->prepare("SELECT title FROM blog_posts WHERE id = :post_id");
    $postInfoStmt->execute([':post_id' => $postId]);
    $postInfo = $postInfoStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$postInfo) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Post not found']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // Delete post tags
    $deleteTagsStmt = $pdo->prepare("DELETE FROM blog_post_tags WHERE post_id = :post_id");
    $deleteTagsStmt->execute([':post_id' => $postId]);
    
    // Delete comments (cascade should handle this, but being explicit)
    $deleteCommentsStmt = $pdo->prepare("DELETE FROM blog_comments WHERE post_id = :post_id");
    $deleteCommentsStmt->execute([':post_id' => $postId]);
    
    // Delete the post
    $deletePostStmt = $pdo->prepare("DELETE FROM blog_posts WHERE id = :post_id");
    $deletePostStmt->execute([':post_id' => $postId]);
    
    $pdo->commit();
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $userId,
        ':action' => "Deleted blog post: " . $postInfo['title'],
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Post deleted successfully'
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin blog delete post error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to delete post',
        'message' => 'An error occurred while deleting the post'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
