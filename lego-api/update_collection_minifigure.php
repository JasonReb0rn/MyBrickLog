<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'] ?? null;
$set_num = $data['set_num'] ?? null;
$fig_num = $data['fig_num'] ?? null;
$quantity_owned = isset($data['quantity_owned']) ? intval($data['quantity_owned']) : null;

// Validate required fields
if (!$user_id || !$set_num || !$fig_num || $quantity_owned === null) {
    echo json_encode(['error' => 'Missing required fields: user_id, set_num, fig_num, quantity_owned']);
    exit;
}

// Ensure quantity is not negative
if ($quantity_owned < 0) {
    $quantity_owned = 0;
}

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // Verify the user owns this set
        $setCheckStmt = $pdo->prepare("SELECT id FROM collection WHERE user_id = ? AND set_num = ?");
        $setCheckStmt->execute([$user_id, $set_num]);
        
        if (!$setCheckStmt->fetch()) {
            $response['error'] = 'Set not found in user collection';
            echo json_encode($response);
            exit;
        }

        // Verify the minifigure exists in this set
        $minifigCheckStmt = $pdo->prepare("
            SELECT im.quantity as required_quantity
            FROM inventory_minifigs im
            JOIN inventories i ON i.id = im.inventory_id
            WHERE i.set_num = ? AND im.fig_num = ?
        ");
        $minifigCheckStmt->execute([$set_num, $fig_num]);
        $minifigInfo = $minifigCheckStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$minifigInfo) {
            $response['error'] = 'Minifigure not found in this set';
            echo json_encode($response);
            exit;
        }

        // Check if record already exists
        $existingStmt = $pdo->prepare("
            SELECT id, quantity_owned 
            FROM collection_minifigs 
            WHERE user_id = ? AND set_num = ? AND fig_num = ?
        ");
        $existingStmt->execute([$user_id, $set_num, $fig_num]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            if ($quantity_owned > 0) {
                // Update existing record
                $updateStmt = $pdo->prepare("
                    UPDATE collection_minifigs 
                    SET quantity_owned = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE user_id = ? AND set_num = ? AND fig_num = ?
                ");
                $updateStmt->execute([$quantity_owned, $user_id, $set_num, $fig_num]);
            } else {
                // Remove record if quantity is 0
                $deleteStmt = $pdo->prepare("
                    DELETE FROM collection_minifigs 
                    WHERE user_id = ? AND set_num = ? AND fig_num = ?
                ");
                $deleteStmt->execute([$user_id, $set_num, $fig_num]);
            }
        } else if ($quantity_owned > 0) {
            // Insert new record
            $insertStmt = $pdo->prepare("
                INSERT INTO collection_minifigs (user_id, set_num, fig_num, quantity_owned) 
                VALUES (?, ?, ?, ?)
            ");
            $insertStmt->execute([$user_id, $set_num, $fig_num, $quantity_owned]);
        }

        $pdo->commit();
        
        // Log successful minifigure update
        $log_action = "Updated minifigure {$fig_num} quantity for set {$set_num}: {$quantity_owned}";
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
        
        $response['success'] = true;
        $response['quantity_owned'] = $quantity_owned;
        $response['required_quantity'] = $minifigInfo['required_quantity'];
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error updating minifigure: ' . $e->getMessage());
        $response['error'] = 'Error updating minifigure quantity';
    }
} else {
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?> 