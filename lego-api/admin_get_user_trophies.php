<?php
/**
 * Admin endpoint to get user's trophies
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
    
    // Get target user ID from URL parameter
    $targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid user ID is required'
        ]);
        exit;
    }
    
    // Verify user exists
    $userCheckStmt = $pdo->prepare("SELECT username FROM users WHERE user_id = ?");
    $userCheckStmt->execute([$targetUserId]);
    $targetUser = $userCheckStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$targetUser) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'User not found'
        ]);
        exit;
    }
    
    // Get user's trophies
    $sql = "
        SELECT 
            t.id,
            t.name,
            t.description,
            t.image_path,
            t.rarity,
            ut.awarded_at,
            ut.awarded_by
        FROM user_trophies ut
        JOIN trophies t ON ut.trophy_id = t.id
        WHERE ut.user_id = :user_id AND t.is_active = 1
        ORDER BY 
            CASE t.rarity 
                WHEN 'mythical' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'common' THEN 3
            END,
            ut.awarded_at DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':user_id' => $targetUserId]);
    $userTrophies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get all available trophies (for assignment)
    $allTrophiesSql = "
        SELECT 
            t.id,
            t.name,
            t.description,
            t.image_path,
            t.rarity,
            CASE WHEN ut.trophy_id IS NOT NULL THEN 1 ELSE 0 END as user_has_trophy
        FROM trophies t
        LEFT JOIN user_trophies ut ON t.id = ut.trophy_id AND ut.user_id = :user_id
        WHERE t.is_active = 1
        ORDER BY 
            CASE t.rarity 
                WHEN 'mythical' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'common' THEN 3
            END,
            t.name ASC
    ";
    
    $allTrophiesStmt = $pdo->prepare($allTrophiesSql);
    $allTrophiesStmt->execute([':user_id' => $targetUserId]);
    $allTrophies = $allTrophiesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert user_has_trophy to boolean
    foreach ($allTrophies as &$trophy) {
        $trophy['user_has_trophy'] = (bool) $trophy['user_has_trophy'];
    }
    
    echo json_encode([
        'success' => true,
        'user' => [
            'user_id' => $targetUserId,
            'username' => $targetUser['username']
        ],
        'user_trophies' => $userTrophies,
        'all_trophies' => $allTrophies
    ]);
    
} catch (Exception $e) {
    error_log("Admin get user trophies error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch user trophies',
        'message' => 'An error occurred while retrieving user trophies'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
