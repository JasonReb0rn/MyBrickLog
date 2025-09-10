<?php
/**
 * Utility functions for blog post view tracking
 */

/**
 * Track a post view with rate limiting
 * Only allows one view per IP per post every 5 minutes
 */
function trackPostView($pdo, $postId) {
    try {
        // Get visitor information
        $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        // Create viewer hash (MD5 of IP + User Agent for anonymization)
        $viewerHash = md5($ipAddress . $userAgent);
        
        // Current timestamp
        $currentTime = time();
        $fiveMinutesAgo = $currentTime - (5 * 60); // 5 minutes in seconds
        
        // Check if this viewer has viewed this post in the last 5 minutes
        $checkSql = "
            SELECT id, viewed_at 
            FROM blog_post_views 
            WHERE post_id = :post_id AND viewer_hash = :viewer_hash
        ";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([
            ':post_id' => $postId,
            ':viewer_hash' => $viewerHash
        ]);
        $existingView = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingView) {
            // Check if enough time has passed since last view
            if ($existingView['viewed_at'] > $fiveMinutesAgo) {
                // Too recent, don't count this view
                return false;
            }
            
            // Update existing record with new timestamp
            $updateSql = "
                UPDATE blog_post_views 
                SET viewed_at = :viewed_at, ip_address = :ip_address, user_agent = :user_agent
                WHERE post_id = :post_id AND viewer_hash = :viewer_hash
            ";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                ':viewed_at' => $currentTime,
                ':ip_address' => substr($ipAddress, 0, 45), // Truncate to fit column
                ':user_agent' => substr($userAgent, 0, 255), // Truncate to fit column
                ':post_id' => $postId,
                ':viewer_hash' => $viewerHash
            ]);
        } else {
            // Insert new view record
            $insertSql = "
                INSERT INTO blog_post_views (post_id, viewer_hash, ip_address, user_agent, viewed_at)
                VALUES (:post_id, :viewer_hash, :ip_address, :user_agent, :viewed_at)
            ";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                ':post_id' => $postId,
                ':viewer_hash' => $viewerHash,
                ':ip_address' => substr($ipAddress, 0, 45), // Truncate to fit column
                ':user_agent' => substr($userAgent, 0, 255), // Truncate to fit column
                ':viewed_at' => $currentTime
            ]);
        }
        
        // Clean up old view records (older than 30 days) to keep table manageable
        $thirtyDaysAgo = $currentTime - (30 * 24 * 60 * 60);
        $cleanupSql = "DELETE FROM blog_post_views WHERE viewed_at < :thirty_days_ago";
        $cleanupStmt = $pdo->prepare($cleanupSql);
        $cleanupStmt->execute([':thirty_days_ago' => $thirtyDaysAgo]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error tracking post view: " . $e->getMessage());
        return false;
    }
}

/**
 * Get the actual view count for a post from the blog_post_views table
 */
function getActualViewCount($pdo, $postId) {
    try {
        $sql = "SELECT COUNT(DISTINCT viewer_hash) as view_count FROM blog_post_views WHERE post_id = :post_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':post_id' => $postId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return intval($result['view_count']);
    } catch (Exception $e) {
        error_log("Error getting actual view count: " . $e->getMessage());
        return 0;
    }
}

/**
 * Update the cached view count in the blog_posts table
 */
function updateCachedViewCount($pdo, $postId, $actualCount) {
    try {
        $sql = "UPDATE blog_posts SET view_count = :view_count WHERE id = :post_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':view_count' => $actualCount, ':post_id' => $postId]);
        return true;
    } catch (Exception $e) {
        error_log("Error updating cached view count: " . $e->getMessage());
        return false;
    }
}
?>
