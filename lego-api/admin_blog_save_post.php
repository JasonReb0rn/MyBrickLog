<?php
/**
 * Admin endpoint to save/update blog posts
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
    $title = isset($input['title']) ? trim($input['title']) : '';
    $slug = isset($input['slug']) ? trim($input['slug']) : '';
    $content = isset($input['content']) ? trim($input['content']) : '';
    $excerpt = isset($input['excerpt']) ? trim($input['excerpt']) : '';
    $categoryId = isset($input['category_id']) ? intval($input['category_id']) : 0;
    $featuredImage = isset($input['featured_image']) ? trim($input['featured_image']) : '';
    $status = isset($input['status']) ? $input['status'] : 'draft';
    $metaTitle = isset($input['meta_title']) ? trim($input['meta_title']) : '';
    $metaDescription = isset($input['meta_description']) ? trim($input['meta_description']) : '';
    $tags = isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : [];
    
    // Validation
    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Title is required']);
        exit;
    }
    
    if (empty($content)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Content is required']);
        exit;
    }
    
    if ($categoryId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Category is required']);
        exit;
    }
    
    if (!in_array($status, ['draft', 'published', 'archived'])) {
        $status = 'draft';
    }
    
    // Generate slug if empty
    if (empty($slug)) {
        $slug = generateSlug($title);
    } else {
        $slug = generateSlug($slug);
    }
    
    // Check if slug is unique (excluding current post if editing)
    $slugCheckSql = "SELECT id FROM blog_posts WHERE slug = :slug";
    $slugCheckParams = [':slug' => $slug];
    
    if ($postId > 0) {
        $slugCheckSql .= " AND id != :post_id";
        $slugCheckParams[':post_id'] = $postId;
    }
    
    $slugCheckStmt = $pdo->prepare($slugCheckSql);
    $slugCheckStmt->execute($slugCheckParams);
    
    if ($slugCheckStmt->fetch()) {
        $slug = $slug . '-' . time();
    }
    
    // Verify category exists
    $categoryCheckStmt = $pdo->prepare("SELECT id FROM blog_categories WHERE id = :category_id");
    $categoryCheckStmt->execute([':category_id' => $categoryId]);
    if (!$categoryCheckStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid category']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    if ($postId > 0) {
        // Update existing post
        $updateSql = "
            UPDATE blog_posts SET 
                title = :title,
                slug = :slug,
                content = :content,
                excerpt = :excerpt,
                category_id = :category_id,
                featured_image = :featured_image,
                status = :status,
                meta_title = :meta_title,
                meta_description = :meta_description,
                published_at = :published_at,
                updated_at = NOW()
            WHERE id = :post_id
        ";
        
        $publishedAt = null;
        if ($status === 'published') {
            // Check if it was already published
            $currentStatusStmt = $pdo->prepare("SELECT status, published_at FROM blog_posts WHERE id = :post_id");
            $currentStatusStmt->execute([':post_id' => $postId]);
            $currentPost = $currentStatusStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($currentPost['status'] !== 'published' || $currentPost['published_at'] === null) {
                $publishedAt = date('Y-m-d H:i:s');
            } else {
                $publishedAt = $currentPost['published_at'];
            }
        }
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':title' => $title,
            ':slug' => $slug,
            ':content' => $content,
            ':excerpt' => $excerpt,
            ':category_id' => $categoryId,
            ':featured_image' => $featuredImage,
            ':status' => $status,
            ':meta_title' => $metaTitle,
            ':meta_description' => $metaDescription,
            ':published_at' => $publishedAt,
            ':post_id' => $postId
        ]);
        
        $logAction = "Updated blog post: $title";
        
    } else {
        // Create new post
        $insertSql = "
            INSERT INTO blog_posts (
                title, slug, content, excerpt, author_id, category_id, 
                featured_image, status, meta_title, meta_description, 
                published_at, created_at
            ) VALUES (
                :title, :slug, :content, :excerpt, :author_id, :category_id,
                :featured_image, :status, :meta_title, :meta_description,
                :published_at, NOW()
            )
        ";
        
        $publishedAt = ($status === 'published') ? date('Y-m-d H:i:s') : null;
        
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            ':title' => $title,
            ':slug' => $slug,
            ':content' => $content,
            ':excerpt' => $excerpt,
            ':author_id' => $userId,
            ':category_id' => $categoryId,
            ':featured_image' => $featuredImage,
            ':status' => $status,
            ':meta_title' => $metaTitle,
            ':meta_description' => $metaDescription,
            ':published_at' => $publishedAt
        ]);
        
        $postId = $pdo->lastInsertId();
        $logAction = "Created blog post: $title";
    }
    
    // Handle tags
    // First, remove existing tags
    $deleteTagsSql = "DELETE FROM blog_post_tags WHERE post_id = :post_id";
    $deleteTagsStmt = $pdo->prepare($deleteTagsSql);
    $deleteTagsStmt->execute([':post_id' => $postId]);
    
    // Add new tags
    foreach ($tags as $tagName) {
        if (empty(trim($tagName))) continue;
        
        $tagName = trim($tagName);
        $tagSlug = generateSlug($tagName);
        
        // Check if tag exists
        $tagCheckStmt = $pdo->prepare("SELECT id FROM blog_tags WHERE slug = :slug");
        $tagCheckStmt->execute([':slug' => $tagSlug]);
        $existingTag = $tagCheckStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingTag) {
            $tagId = $existingTag['id'];
        } else {
            // Create new tag
            $createTagStmt = $pdo->prepare("INSERT INTO blog_tags (name, slug) VALUES (:name, :slug)");
            $createTagStmt->execute([':name' => $tagName, ':slug' => $tagSlug]);
            $tagId = $pdo->lastInsertId();
        }
        
        // Link tag to post
        $linkTagStmt = $pdo->prepare("INSERT INTO blog_post_tags (post_id, tag_id) VALUES (:post_id, :tag_id)");
        $linkTagStmt->execute([':post_id' => $postId, ':tag_id' => $tagId]);
    }
    
    $pdo->commit();
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $userId,
        ':action' => $logAction,
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => $postId ? 'Post updated successfully' : 'Post created successfully',
        'post_id' => $postId,
        'slug' => $slug
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin blog save post error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save post',
        'message' => 'An error occurred while saving the post'
    ]);
}

function generateSlug($text) {
    $slug = strtolower($text);
    $slug = preg_replace('/[^\w\s-]/', '', $slug);
    $slug = preg_replace('/[\s_-]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug;
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
