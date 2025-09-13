<?php
/**
 * Admin endpoint to fetch trophies
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
    $rarity = isset($_GET['rarity']) ? $_GET['rarity'] : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 50;
    
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $whereClause = "WHERE 1=1";
    $params = [];
    
    if ($rarity && in_array($rarity, ['common', 'rare', 'mythical'])) {
        $whereClause .= " AND t.rarity = :rarity";
        $params[':rarity'] = $rarity;
    }
    
    if ($search) {
        $whereClause .= " AND (t.name LIKE :search OR t.description LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    // Get total count
    $countSql = "
        SELECT COUNT(*) as total
        FROM trophies t
        $whereClause
        AND t.is_active = 1
    ";
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalTrophies = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalTrophies / $limit);
    
    // Get trophies with user counts
    $sql = "
        SELECT 
            t.id,
            t.name,
            t.description,
            t.image_path,
            t.rarity,
            t.is_active,
            t.created_at,
            t.updated_at,
            (SELECT COUNT(*) FROM user_trophies WHERE trophy_id = t.id) as user_count
        FROM trophies t
        $whereClause
        AND t.is_active = 1
        ORDER BY 
            CASE t.rarity 
                WHEN 'mythical' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'common' THEN 3
            END,
            t.name ASC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $trophies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format trophy data
    foreach ($trophies as &$trophy) {
        $trophy['user_count'] = intval($trophy['user_count']);
    }
    
    // Get statistics
    $statsSql = "
        SELECT 
            COUNT(*) as total_trophies,
            SUM(CASE WHEN rarity = 'common' THEN 1 ELSE 0 END) as common_trophies,
            SUM(CASE WHEN rarity = 'rare' THEN 1 ELSE 0 END) as rare_trophies,
            SUM(CASE WHEN rarity = 'mythical' THEN 1 ELSE 0 END) as mythical_trophies,
            (SELECT COUNT(*) FROM user_trophies) as total_awards
        FROM trophies
        WHERE is_active = 1
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
        'trophies' => $trophies,
        'stats' => $stats,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_trophies' => intval($totalTrophies),
            'trophies_per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Admin get trophies error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch trophies',
        'message' => 'An error occurred while retrieving trophies'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
