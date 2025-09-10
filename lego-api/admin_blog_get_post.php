<?php
/**
 * Admin endpoint to fetch a single blog post
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
    
    // Get post ID from URL parameter
    $postId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($postId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid post ID is required'
        ]);
        exit;
    }
    
    // Get post with all data (including drafts)
    $sql = "
        SELECT 
            bp.id,
            bp.title,
            bp.slug,
            bp.content,
            bp.excerpt,
            bp.featured_image,
            bp.status,
            bp.published_at,
            bp.created_at,
            bp.updated_at,
            bp.meta_title,
            bp.meta_description,
            bp.view_count,
            bp.category_id,
            (SELECT COUNT(DISTINCT viewer_hash) FROM blog_post_views bpv WHERE bpv.post_id = bp.id) as actual_view_count,
            u.username as author_username,
            u.user_id as author_id,
            bc.name as category_name,
            bc.slug as category_slug
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.user_id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        WHERE bp.id = :post_id
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':post_id' => $postId]);
    $post = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$post) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Post not found'
        ]);
        exit;
    }
    
    // Get tags for the post
    $tagSql = "
        SELECT bt.id, bt.name, bt.slug
        FROM blog_tags bt
        JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = :post_id
        ORDER BY bt.name
    ";
    $tagStmt = $pdo->prepare($tagSql);
    $tagStmt->execute([':post_id' => $post['id']]);
    $tags = $tagStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format post data
    $post['author'] = [
        'user_id' => $post['author_id'],
        'username' => $post['author_username']
    ];
    
    $post['category'] = [
        'id' => $post['category_id'],
        'name' => $post['category_name'],
        'slug' => $post['category_slug']
    ];
    
    $post['tags'] = array_map(function($tag) {
        return intval($tag['id']);
    }, $tags);
    
    $post['tag_objects'] = $tags;
    $actualViewCount = intval($post['actual_view_count']);
    $post['view_count'] = $actualViewCount;
    
    // Update cached view count in blog_posts table if it differs
    if (intval($post['view_count']) !== $actualViewCount) {
        try {
            $updateViewSql = "UPDATE blog_posts SET view_count = :view_count WHERE id = :post_id";
            $updateStmt = $pdo->prepare($updateViewSql);
            $updateStmt->execute([':view_count' => $actualViewCount, ':post_id' => $post['id']]);
        } catch (Exception $e) {
            error_log("Error updating cached view count for post {$post['id']}: " . $e->getMessage());
        }
    }
    
    // Clean up duplicate fields
    unset($post['author_id'], $post['author_username']);
    unset($post['category_name'], $post['category_slug'], $post['actual_view_count']);
    
    echo json_encode([
        'success' => true,
        'post' => $post
    ]);
    
} catch (Exception $e) {
    error_log("Admin blog get post error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch blog post',
        'message' => 'An error occurred while retrieving the post'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
