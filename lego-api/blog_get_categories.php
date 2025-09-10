<?php
/**
 * Blog endpoint to fetch categories
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
    // Get categories with post counts
    $sql = "
        SELECT 
            bc.id,
            bc.name,
            bc.slug,
            bc.description,
            COUNT(bp.id) as post_count
        FROM blog_categories bc
        LEFT JOIN blog_posts bp ON bc.id = bp.category_id AND bp.status = 'published'
        GROUP BY bc.id, bc.name, bc.slug, bc.description
        ORDER BY bc.name ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert post_count to integer
    foreach ($categories as &$category) {
        $category['post_count'] = intval($category['post_count']);
        $category['count'] = $category['post_count']; // Alias for compatibility
    }
    
    echo json_encode([
        'success' => true,
        'categories' => $categories
    ]);
    
} catch (Exception $e) {
    error_log("Blog get categories error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch categories',
        'message' => 'An error occurred while retrieving categories'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
