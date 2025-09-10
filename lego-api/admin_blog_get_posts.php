<?php
/**
 * Admin endpoint to fetch blog posts
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
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $category = isset($_GET['category']) ? intval($_GET['category']) : 0;
    $author = isset($_GET['author']) ? intval($_GET['author']) : 0;
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 50;
    
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $whereClause = "WHERE 1=1";
    $params = [];
    
    if ($status && in_array($status, ['draft', 'published', 'archived'])) {
        $whereClause .= " AND bp.status = :status";
        $params[':status'] = $status;
    }
    
    if ($category > 0) {
        $whereClause .= " AND bp.category_id = :category";
        $params[':category'] = $category;
    }
    
    if ($author > 0) {
        $whereClause .= " AND bp.author_id = :author";
        $params[':author'] = $author;
    }
    
    // Get total count
    $countSql = "
        SELECT COUNT(*) as total
        FROM blog_posts bp
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
            bp.status,
            bp.published_at,
            bp.created_at,
            bp.updated_at,
            bp.view_count,
            u.username as author_username,
            u.user_id as author_id,
            bc.id as category_id,
            bc.name as category_name,
            (SELECT COUNT(*) FROM blog_comments bcom WHERE bcom.post_id = bp.id) as comment_count,
            (SELECT COUNT(DISTINCT viewer_hash) FROM blog_post_views bpv WHERE bpv.post_id = bp.id) as actual_view_count
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.user_id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        $whereClause
        ORDER BY bp.created_at DESC
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
    
    // Format post data
    foreach ($posts as &$post) {
        $post['author'] = [
            'user_id' => $post['author_id'],
            'username' => $post['author_username']
        ];
        
        $post['category'] = [
            'id' => $post['category_id'],
            'name' => $post['category_name']
        ];
        
        $post['comment_count'] = intval($post['comment_count']);
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
        unset($post['category_id'], $post['category_name'], $post['actual_view_count']);
    }
    
    // Get statistics
    $statsSql = "
        SELECT 
            COUNT(*) as total_posts,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_posts,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
            (SELECT COUNT(*) FROM blog_comments) as total_comments,
            (SELECT COUNT(*) FROM blog_comments WHERE status = 'pending') as pending_comments
        FROM blog_posts
    ";
    
    $statsStmt = $pdo->prepare($statsSql);
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Convert to integers
    foreach ($stats as &$stat) {
        $stat = intval($stat);
    }
    
    echo json_encode([
        'success' => true,
        'posts' => $posts,
        'stats' => $stats,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_posts' => intval($totalPosts),
            'posts_per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin blog get posts error: " . $e->getMessage());
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
