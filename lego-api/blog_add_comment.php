<?php
/**
 * Blog endpoint to add comments
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
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Authentication required',
            'message' => 'You must be logged in to comment'
        ]);
        ob_end_flush();
        exit;
    }
    
    $userId = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $postId = isset($input['post_id']) ? intval($input['post_id']) : 0;
    $content = isset($input['content']) ? trim($input['content']) : '';
    $parentId = isset($input['parent_id']) ? intval($input['parent_id']) : null;
    
    if ($postId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid post ID is required'
        ]);
        exit;
    }
    
    if (empty($content)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Comment content is required'
        ]);
        exit;
    }
    
    if (strlen($content) > 2000) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Comment is too long (maximum 2000 characters)'
        ]);
        exit;
    }
    
    // Verify post exists and is published
    $postCheckSql = "SELECT id FROM blog_posts WHERE id = :post_id AND status = 'published'";
    $postCheckStmt = $pdo->prepare($postCheckSql);
    $postCheckStmt->execute([':post_id' => $postId]);
    
    if (!$postCheckStmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Post not found or not published'
        ]);
        exit;
    }
    
    // If this is a reply, verify parent comment exists
    if ($parentId !== null) {
        $parentCheckSql = "SELECT id FROM blog_comments WHERE id = :parent_id AND post_id = :post_id";
        $parentCheckStmt = $pdo->prepare($parentCheckSql);
        $parentCheckStmt->execute([':parent_id' => $parentId, ':post_id' => $postId]);
        
        if (!$parentCheckStmt->fetch()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Parent comment not found'
            ]);
            exit;
        }
    }
    
    // Insert comment (auto-approve for now, can add moderation later)
    $insertSql = "
        INSERT INTO blog_comments (post_id, author_id, content, status, parent_id, created_at)
        VALUES (:post_id, :author_id, :content, 'approved', :parent_id, NOW())
    ";
    
    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        ':post_id' => $postId,
        ':author_id' => $userId,
        ':content' => $content,
        ':parent_id' => $parentId
    ]);
    
    $commentId = $pdo->lastInsertId();
    
    // Get the newly created comment with author info
    $getCommentSql = "
        SELECT 
            bc.id,
            bc.content,
            bc.created_at,
            bc.updated_at,
            bc.status,
            bc.parent_id,
            u.username as author_username,
            u.user_id as author_id
        FROM blog_comments bc
        JOIN users u ON bc.author_id = u.user_id
        WHERE bc.id = :comment_id
    ";
    
    $getCommentStmt = $pdo->prepare($getCommentSql);
    $getCommentStmt->execute([':comment_id' => $commentId]);
    $comment = $getCommentStmt->fetch(PDO::FETCH_ASSOC);
    
    // Format comment data
    $comment['author'] = [
        'user_id' => $comment['author_id'],
        'username' => $comment['author_username']
    ];
    unset($comment['author_id'], $comment['author_username']);
    
    // If this is a top-level comment, add empty replies array
    if ($comment['parent_id'] === null) {
        $comment['replies'] = [];
    }
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'USER_MANAGEMENT', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $userId,
        ':action' => "User posted blog comment on post ID $postId",
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Comment posted successfully',
        'comment' => $comment
    ]);
    
} catch (Exception $e) {
    error_log("Blog add comment error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to post comment',
        'message' => 'An error occurred while posting your comment'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
