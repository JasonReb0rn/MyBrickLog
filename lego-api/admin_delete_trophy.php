<?php
/**
 * Admin endpoint to delete trophies
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
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $trophyId = isset($input['id']) ? intval($input['id']) : 0;
    
    if ($trophyId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid trophy ID is required']);
        exit;
    }
    
    // Get trophy info for logging
    $trophyInfoStmt = $pdo->prepare("SELECT name FROM trophies WHERE id = :trophy_id");
    $trophyInfoStmt->execute([':trophy_id' => $trophyId]);
    $trophyInfo = $trophyInfoStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$trophyInfo) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Trophy not found']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // Delete user trophy assignments first (foreign key constraint)
    $deleteUserTrophiesStmt = $pdo->prepare("DELETE FROM user_trophies WHERE trophy_id = :trophy_id");
    $deleteUserTrophiesStmt->execute([':trophy_id' => $trophyId]);
    
    // Delete the trophy
    $deleteTrophyStmt = $pdo->prepare("DELETE FROM trophies WHERE id = :trophy_id");
    $deleteTrophyStmt->execute([':trophy_id' => $trophyId]);
    
    $pdo->commit();
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $user_id,
        ':action' => "Deleted trophy: " . $trophyInfo['name'],
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Trophy deleted successfully'
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin delete trophy error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to delete trophy',
        'message' => 'An error occurred while deleting the trophy'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
