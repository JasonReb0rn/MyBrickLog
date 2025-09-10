<?php
/**
 * Blog endpoint to fetch tags
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
    // Get all tags with usage count
    $sql = "
        SELECT 
            bt.id,
            bt.name,
            bt.slug,
            COUNT(bpt.post_id) as post_count
        FROM blog_tags bt
        LEFT JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        LEFT JOIN blog_posts bp ON bpt.post_id = bp.id AND bp.status = 'published'
        GROUP BY bt.id, bt.name, bt.slug
        HAVING post_count > 0 OR bt.id IN (
            SELECT DISTINCT tag_id FROM blog_post_tags
        )
        ORDER BY post_count DESC, bt.name ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert post_count to integer
    foreach ($tags as &$tag) {
        $tag['post_count'] = intval($tag['post_count']);
    }
    
    echo json_encode([
        'success' => true,
        'tags' => $tags
    ]);
    
} catch (Exception $e) {
    error_log("Blog get tags error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch tags',
        'message' => 'An error occurred while retrieving tags'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
