<?php
/**
 * Blog endpoint to fetch comments
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
    // Get post ID from URL parameter
    $postId = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
    
    if ($postId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid post ID is required'
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
            'error' => 'Post not found'
        ]);
        exit;
    }
    
    // Get top-level comments (parent_id IS NULL)
    $sql = "
        SELECT 
            bc.id,
            bc.content,
            bc.created_at,
            bc.updated_at,
            bc.status,
            u.username as author_username,
            u.user_id as author_id
        FROM blog_comments bc
        JOIN users u ON bc.author_id = u.user_id
        WHERE bc.post_id = :post_id 
        AND bc.parent_id IS NULL 
        AND bc.status = 'approved'
        ORDER BY bc.created_at ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':post_id' => $postId]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get replies for each comment
    foreach ($comments as &$comment) {
        $repliesSql = "
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
            WHERE bc.parent_id = :comment_id 
            AND bc.status = 'approved'
            ORDER BY bc.created_at ASC
        ";
        
        $repliesStmt = $pdo->prepare($repliesSql);
        $repliesStmt->execute([':comment_id' => $comment['id']]);
        $replies = $repliesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format replies
        foreach ($replies as &$reply) {
            $reply['author'] = [
                'user_id' => $reply['author_id'],
                'username' => $reply['author_username']
            ];
            unset($reply['author_id'], $reply['author_username']);
        }
        
        $comment['replies'] = $replies;
        
        // Format comment author
        $comment['author'] = [
            'user_id' => $comment['author_id'],
            'username' => $comment['author_username']
        ];
        unset($comment['author_id'], $comment['author_username']);
    }
    
    echo json_encode([
        'success' => true,
        'comments' => $comments
    ]);
    
} catch (Exception $e) {
    error_log("Blog get comments error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch comments',
        'message' => 'An error occurred while retrieving comments'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
