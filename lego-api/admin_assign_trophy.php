<?php
/**
 * Admin endpoint to assign trophy to user
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

    $admin_user_id = $_SESSION['user_id'];
    
    // Check if user has admin privileges
    $adminStmt = $pdo->prepare("SELECT is_admin FROM users WHERE user_id = ? AND verified = 1");
    $adminStmt->execute([$admin_user_id]);
    $user = $adminStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['is_admin'] != 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        ob_end_flush();
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $targetUserId = isset($input['user_id']) ? intval($input['user_id']) : 0;
    $trophyId = isset($input['trophy_id']) ? intval($input['trophy_id']) : 0;
    
    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid user ID is required']);
        exit;
    }
    
    if ($trophyId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid trophy ID is required']);
        exit;
    }
    
    // Verify user exists
    $userCheckStmt = $pdo->prepare("SELECT username FROM users WHERE user_id = ?");
    $userCheckStmt->execute([$targetUserId]);
    $targetUser = $userCheckStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    // Verify trophy exists
    $trophyCheckStmt = $pdo->prepare("SELECT name FROM trophies WHERE id = ?");
    $trophyCheckStmt->execute([$trophyId]);
    $trophy = $trophyCheckStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$trophy) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Trophy not found']);
        exit;
    }
    
    // Check if user already has this trophy
    $existingStmt = $pdo->prepare("SELECT id FROM user_trophies WHERE user_id = ? AND trophy_id = ?");
    $existingStmt->execute([$targetUserId, $trophyId]);
    
    if ($existingStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User already has this trophy']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // Assign trophy to user
    $assignStmt = $pdo->prepare("
        INSERT INTO user_trophies (user_id, trophy_id, awarded_at, awarded_by)
        VALUES (?, ?, NOW(), ?)
    ");
    $assignStmt->execute([$targetUserId, $trophyId, $admin_user_id]);
    
    $pdo->commit();
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $admin_user_id,
        ':action' => "Assigned trophy '{$trophy['name']}' to user '{$targetUser['username']}'",
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Trophy assigned successfully'
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin assign trophy error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to assign trophy',
        'message' => 'An error occurred while assigning the trophy'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
