<?php
/**
 * Admin endpoint to fetch system logs
 * Requires admin authentication
 */

// Clear any existing output buffers
ob_start();

// Start session at the very beginning
session_start();

require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

// Clean the buffer to avoid any unwanted output before setting headers
ob_clean();

$response = ['success' => false];

// Check if user is logged in and is admin
if (!isset($_SESSION['user_id'])) {
    $response['error'] = 'Not authenticated';
    echo json_encode($response);
    ob_end_flush();
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // Double-check admin status from database for security
    $adminStmt = $pdo->prepare("SELECT is_admin FROM users WHERE user_id = ? AND verified = 1");
    $adminStmt->execute([$user_id]);
    $user = $adminStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['is_admin'] != 1) {
        $response['error'] = 'Admin access required';
        
        // Log unauthorized admin access attempt
        $log_action = "Unauthorized admin logs access attempt by user ID: $user_id";
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SECURITY');
        
        echo json_encode($response);
        ob_end_flush();
        exit;
    }

    // Don't log routine admin logs access - creates duplicate entries
    // Only unauthorized attempts are logged above as security events

    // Get filter parameters
    $limit = isset($_GET['limit']) ? min(intval($_GET['limit']), 1000) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $log_type = isset($_GET['log_type']) ? $_GET['log_type'] : '';
    $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
    $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
    $user_filter = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    // Build the WHERE clause based on filters
    $whereConditions = [];
    $params = [];

    if (!empty($log_type)) {
        $whereConditions[] = "l.log_type = ?";
        $params[] = $log_type;
    }

    if (!empty($date_from)) {
        $whereConditions[] = "DATE(l.log_timestamp) >= ?";
        $params[] = $date_from;
    }

    if (!empty($date_to)) {
        $whereConditions[] = "DATE(l.log_timestamp) <= ?";
        $params[] = $date_to;
    }

    if ($user_filter !== null) {
        $whereConditions[] = "l.log_user = ?";
        $params[] = $user_filter;
    }

    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    // Get total count for pagination
    $countQuery = "
        SELECT COUNT(*) as total_count
        FROM log l
        $whereClause
    ";
    
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total_count'];

    // Get the logs with user information
    $logsQuery = "
        SELECT 
            l.log_id,
            l.log_user,
            l.log_action,
            l.log_type,
            l.log_useragent,
            l.log_ip,
            l.log_timestamp,
            u.username
        FROM log l
        LEFT JOIN users u ON l.log_user = u.user_id
        $whereClause
        ORDER BY l.log_timestamp DESC
        LIMIT ? OFFSET ?
    ";

    // Add limit and offset to params
    $params[] = $limit;
    $params[] = $offset;

    $logsStmt = $pdo->prepare($logsQuery);
    $logsStmt->execute($params);
    $logs = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get statistics for the stats cards
    $statsQuery = "
        SELECT 
            COUNT(*) as total_logs,
            COUNT(CASE WHEN DATE(log_timestamp) = CURDATE() AND log_type = 'AUTHENTICATION' AND log_action LIKE '%successful%' THEN 1 END) as todays_logins,
            COUNT(CASE WHEN log_type = 'SECURITY' OR (log_type = 'AUTHENTICATION' AND log_action LIKE '%Invalid%') THEN 1 END) as failed_logins,
            COUNT(CASE WHEN log_type = 'ADMIN' THEN 1 END) as admin_access
        FROM log
        WHERE log_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ";

    $statsStmt = $pdo->query($statsQuery);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    $response = [
        'success' => true,
        'logs' => $logs,
        'pagination' => [
            'total_count' => intval($totalCount),
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $totalCount
        ],
        'stats' => [
            'total_logs' => intval($stats['total_logs']),
            'todays_logins' => intval($stats['todays_logins']),
            'failed_logins' => intval($stats['failed_logins']),
            'admin_access' => intval($stats['admin_access'])
        ]
    ];

} catch (PDOException $e) {
    error_log("Admin logs database error: " . $e->getMessage());
    $response['error'] = 'Database error occurred';
}

echo json_encode($response);

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
