<?php
/**
 * Admin endpoint to fetch users
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
    $verified = isset($_GET['verified']) ? $_GET['verified'] : '';
    $is_admin = isset($_GET['is_admin']) ? $_GET['is_admin'] : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 50;
    
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $whereClause = "WHERE 1=1";
    $params = [];
    
    if ($verified !== '') {
        $whereClause .= " AND u.verified = :verified";
        $params[':verified'] = intval($verified);
    }
    
    if ($is_admin !== '') {
        $whereClause .= " AND u.is_admin = :is_admin";
        $params[':is_admin'] = intval($is_admin);
    }
    
    if ($search) {
        $whereClause .= " AND (u.username LIKE :search OR u.email LIKE :search OR u.display_name LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    // Get total count
    $countSql = "
        SELECT COUNT(*) as total
        FROM users u
        $whereClause
    ";
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalUsers = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalUsers / $limit);
    
    // Get users with trophy counts
    $sql = "
        SELECT 
            u.user_id,
            u.username,
            u.email,
            u.display_name,
            u.verified,
            u.is_admin,
            u.profile_picture,
            u.join_date,
            u.last_login,
            u.location,
            u.bio,
            (SELECT COUNT(*) FROM collection WHERE user_id = u.user_id) as total_sets,
            (SELECT COUNT(*) FROM user_trophies WHERE user_id = u.user_id) as total_trophies,
            (SELECT COUNT(DISTINCT t.rarity) FROM user_trophies ut JOIN trophies t ON ut.trophy_id = t.id WHERE ut.user_id = u.user_id) as unique_trophy_rarities
        FROM users u
        $whereClause
        ORDER BY u.join_date DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format user data
    foreach ($users as &$user) {
        $user['total_sets'] = intval($user['total_sets']);
        $user['total_trophies'] = intval($user['total_trophies']);
        $user['unique_trophy_rarities'] = intval($user['unique_trophy_rarities']);
        $user['verified'] = intval($user['verified']);
        $user['is_admin'] = intval($user['is_admin']);
        
        // Format profile picture URL if exists
        if ($user['profile_picture']) {
            $user['profile_picture_url'] = "https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/" . $user['profile_picture'];
        } else {
            $user['profile_picture_url'] = null;
        }
    }
    
    // Get statistics
    $statsSql = "
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_users,
            SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users,
            SUM(CASE WHEN join_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_this_week,
            SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_this_month
        FROM users
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
        'users' => $users,
        'stats' => $stats,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_users' => intval($totalUsers),
            'users_per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin get users error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch users',
        'message' => 'An error occurred while retrieving users'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
