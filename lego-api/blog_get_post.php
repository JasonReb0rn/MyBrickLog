<?php
/**
 * Blog endpoint to fetch a single blog post
 */

// Clear any existing output buffers
ob_start();

// Start session at the very beginning
session_start();

require 'dbh.php';
require 'cors_headers.php';
require 'view_tracking_utils.php';

// Clean the buffer to avoid any unwanted output before setting headers
ob_clean();

try {
    // Get slug from URL parameter
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
    
    if (empty($slug)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Post slug is required'
        ]);
        exit;
    }
    
    // Get post with related data
    $sql = "
        SELECT 
            bp.id,
            bp.title,
            bp.slug,
            bp.content,
            bp.excerpt,
            bp.featured_image,
            bp.published_at,
            bp.view_count,
            bp.created_at,
            bp.updated_at,
            bp.meta_title,
            bp.meta_description,
            u.username as author_username,
            u.user_id as author_id,
            bc.id as category_id,
            bc.name as category_name,
            bc.slug as category_slug
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.user_id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        WHERE bp.slug = :slug AND bp.status = 'published'
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':slug' => $slug]);
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
    $post['tags'] = $tagStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format author and category data
    $post['author'] = [
        'user_id' => $post['author_id'],
        'username' => $post['author_username']
    ];
    
    $post['category'] = [
        'id' => $post['category_id'],
        'name' => $post['category_name'],
        'slug' => $post['category_slug']
    ];
    
    // Clean up duplicate fields
    unset($post['author_id'], $post['author_username']);
    unset($post['category_id'], $post['category_name'], $post['category_slug']);
    
    // Track view with rate limiting (5 minutes per IP per post)
    $viewTracked = trackPostView($pdo, $post['id']);
    
    // Get actual view count from blog_post_views table
    $viewCountSql = "SELECT COUNT(DISTINCT viewer_hash) as view_count FROM blog_post_views WHERE post_id = :post_id";
    $viewCountStmt = $pdo->prepare($viewCountSql);
    $viewCountStmt->execute([':post_id' => $post['id']]);
    $viewCountResult = $viewCountStmt->fetch(PDO::FETCH_ASSOC);
    $actualViewCount = intval($viewCountResult['view_count']);
    
    // Update the cached view count in blog_posts table
    $updateViewSql = "UPDATE blog_posts SET view_count = :view_count WHERE id = :post_id";
    $updateStmt = $pdo->prepare($updateViewSql);
    $updateStmt->execute([':view_count' => $actualViewCount, ':post_id' => $post['id']]);
    $post['view_count'] = $actualViewCount;
    
    // Get related posts (same category, excluding current post)
    $relatedSql = "
        SELECT 
            bp.id,
            bp.title,
            bp.slug,
            bp.featured_image,
            bp.published_at
        FROM blog_posts bp
        WHERE bp.category_id = :category_id 
        AND bp.id != :post_id 
        AND bp.status = 'published'
        ORDER BY bp.published_at DESC
        LIMIT 4
    ";
    $relatedStmt = $pdo->prepare($relatedSql);
    $relatedStmt->execute([
        ':category_id' => $post['category']['id'],
        ':post_id' => $post['id']
    ]);
    $relatedPosts = $relatedStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'post' => $post,
        'related_posts' => $relatedPosts
    ]);
    
} catch (Exception $e) {
    error_log("Blog get post error: " . $e->getMessage());
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
