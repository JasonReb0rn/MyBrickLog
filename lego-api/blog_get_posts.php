<?php
/**
 * Blog endpoint to fetch blog posts
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
    // Get parameters
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 10;
    $status = isset($_GET['status']) ? $_GET['status'] : 'published';
    
    $offset = ($page - 1) * $limit;
    
    // Base query
    $whereClause = "WHERE bp.status = :status";
    $params = [':status' => $status];
    
    // Add category filter if specified
    if ($category) {
        $whereClause .= " AND bc.slug = :category";
        $params[':category'] = $category;
    }
    
    // Get total count
    $countSql = "
        SELECT COUNT(DISTINCT bp.id) as total
        FROM blog_posts bp
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        $whereClause
    ";
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalPosts = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalPosts / $limit);
    
    // Get posts with related data
    $sql = "
        SELECT 
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.featured_image,
            bp.published_at,
            bp.view_count,
            bp.created_at,
            bp.updated_at,
            u.username as author_username,
            u.user_id as author_id,
            bc.id as category_id,
            bc.name as category_name,
            bc.slug as category_slug,
            (SELECT COUNT(*) FROM blog_comments bcom WHERE bcom.post_id = bp.id AND bcom.status = 'approved') as comment_count,
            (SELECT COUNT(DISTINCT viewer_hash) FROM blog_post_views bpv WHERE bpv.post_id = bp.id) as actual_view_count
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.user_id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        $whereClause
        ORDER BY bp.published_at DESC, bp.created_at DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get tags for each post
    foreach ($posts as &$post) {
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
        
        // Format author data
        $post['author'] = [
            'user_id' => $post['author_id'],
            'username' => $post['author_username']
        ];
        
        // Format category data
        $post['category'] = [
            'id' => $post['category_id'],
            'name' => $post['category_name'],
            'slug' => $post['category_slug']
        ];
        
        // Update view count with actual count from blog_post_views
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
        unset($post['category_id'], $post['category_name'], $post['category_slug'], $post['actual_view_count']);
    }
    
    // Response
    $response = [
        'success' => true,
        'posts' => $posts,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_posts' => intval($totalPosts),
            'posts_per_page' => $limit,
            'has_more' => $page < $totalPages
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Blog get posts error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch blog posts',
        'message' => 'An error occurred while retrieving posts'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
