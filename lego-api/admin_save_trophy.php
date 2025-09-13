<?php
/**
 * Admin endpoint to save/update trophies
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
    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $imagePath = isset($input['image_url']) ? trim($input['image_url']) : '';
    $rarity = isset($input['rarity']) ? $input['rarity'] : 'common';
    
    // Validation
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Trophy name is required']);
        exit;
    }
    
    if (empty($description)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Trophy description is required']);
        exit;
    }
    
    if (!in_array($rarity, ['common', 'rare', 'mythical'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid rarity. Must be common, rare, or mythical']);
        exit;
    }
    
    if (strlen($name) > 100) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Trophy name must be less than 100 characters']);
        exit;
    }
    
    if (strlen($description) > 500) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Trophy description must be less than 500 characters']);
        exit;
    }
    
    // Check if trophy name is unique (excluding current trophy if editing)
    $nameCheckSql = "SELECT id FROM trophies WHERE name = :name";
    $nameCheckParams = [':name' => $name];
    
    if ($trophyId > 0) {
        $nameCheckSql .= " AND id != :trophy_id";
        $nameCheckParams[':trophy_id'] = $trophyId;
    }
    
    $nameCheckStmt = $pdo->prepare($nameCheckSql);
    $nameCheckStmt->execute($nameCheckParams);
    
    if ($nameCheckStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Trophy name already exists']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    if ($trophyId > 0) {
        // Update existing trophy
        $updateSql = "
            UPDATE trophies SET 
                name = :name,
                description = :description,
                image_path = :image_path,
                rarity = :rarity,
                updated_at = NOW()
            WHERE id = :trophy_id
        ";
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':image_path' => $imagePath ?: null,
            ':rarity' => $rarity,
            ':trophy_id' => $trophyId
        ]);
        
        $logAction = "Updated trophy: $name";
        
    } else {
        // Create new trophy
        $insertSql = "
            INSERT INTO trophies (name, description, image_path, rarity, created_at)
            VALUES (:name, :description, :image_path, :rarity, NOW())
        ";
        
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':image_path' => $imagePath ?: null,
            ':rarity' => $rarity
        ]);
        
        $trophyId = $pdo->lastInsertId();
        $logAction = "Created trophy: $name";
    }
    
    $pdo->commit();
    
    // Log the action
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 45);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    
    $logSql = "INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) 
               VALUES (:user_id, :action, 'ADMIN', :user_agent, :ip)";
    $logStmt = $pdo->prepare($logSql);
    $logStmt->execute([
        ':user_id' => $user_id,
        ':action' => $logAction,
        ':user_agent' => $userAgent,
        ':ip' => $ipAddress
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => $trophyId ? 'Trophy updated successfully' : 'Trophy created successfully',
        'trophy_id' => $trophyId
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Admin save trophy error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save trophy',
        'message' => 'An error occurred while saving the trophy'
    ]);
}

// Flush the output buffer and turn off output buffering
ob_end_flush();
?>
