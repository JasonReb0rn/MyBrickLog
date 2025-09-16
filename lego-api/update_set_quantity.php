<?php
include 'dbh.php';
include 'cors_headers.php';
require 'create_log.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];
$quantity = intval($data['quantity']);

// Debugging output
error_log('Session user_id: ' . $_SESSION['user_id']);
error_log('Data user_id: ' . $user_id);

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // First, get the current complete and sealed counts and old quantity
        $checkStmt = $pdo->prepare("SELECT complete, sealed, collection_set_quantity FROM collection WHERE user_id = ? AND set_num = ?");
        $checkStmt->execute([$user_id, $set_num]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            throw new Exception('Set not found in collection');
        }
        
        $old_quantity = intval($result['collection_set_quantity']);
        $complete_count = intval($result['complete']);
        $sealed_count = intval($result['sealed']);
        
        // If new quantity is less than current complete or sealed counts,
        // adjust them down to match the new quantity
        if ($quantity < $complete_count) {
            $complete_count = $quantity;
        }
        
        if ($quantity < $sealed_count) {
            $sealed_count = $quantity;
        }
        
        // Update quantity and adjusted counts
        $stmt = $pdo->prepare("UPDATE collection SET 
                              collection_set_quantity = ?,
                              complete = ?,
                              sealed = ?
                              WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$quantity, $complete_count, $sealed_count, $user_id, $set_num]);

        // Only update minifigure quantities if the set quantity actually changed
        if ($old_quantity != $quantity) {
            // Get inventory for this set to calculate per-set minifig quantities
            $inventoryStmt = $pdo->prepare("SELECT id FROM inventories WHERE set_num = ?");
            $inventoryStmt->execute([$set_num]);
            $inventory = $inventoryStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($inventory) {
                // Get all minifigures for this inventory with their per-set quantities
                $minifigsStmt = $pdo->prepare("
                    SELECT im.fig_num, im.quantity as per_set_quantity
                    FROM inventory_minifigs im 
                    WHERE im.inventory_id = ?
                ");
                $minifigsStmt->execute([$inventory['id']]);
                $minifigs = $minifigsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if ($quantity > $old_quantity) {
                    // Adding sets - add the minifigure complement for each new set
                    $sets_added = $quantity - $old_quantity;
                    
                    foreach ($minifigs as $minifig) {
                        $minifigs_to_add = $minifig['per_set_quantity'] * $sets_added;
                        
                        // Add to existing quantity using INSERT ... ON DUPLICATE KEY UPDATE
                        $upsertMinifigStmt = $pdo->prepare("
                            INSERT INTO collection_minifigs (user_id, set_num, fig_num, quantity_owned) 
                            VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                            quantity_owned = quantity_owned + VALUES(quantity_owned),
                            updated_at = CURRENT_TIMESTAMP
                        ");
                        $upsertMinifigStmt->execute([$user_id, $set_num, $minifig['fig_num'], $minifigs_to_add]);
                    }
                } else if ($quantity < $old_quantity) {
                    // Removing sets - scale down proportionally
                    $ratio = $quantity > 0 ? ($quantity / $old_quantity) : 0;
                    
                    foreach ($minifigs as $minifig) {
                        if ($ratio > 0) {
                            // Scale existing quantities proportionally
                            $updateMinifigStmt = $pdo->prepare("
                                UPDATE collection_minifigs 
                                SET quantity_owned = ROUND(quantity_owned * ?), updated_at = CURRENT_TIMESTAMP 
                                WHERE user_id = ? AND set_num = ? AND fig_num = ?
                            ");
                            $updateMinifigStmt->execute([$ratio, $user_id, $set_num, $minifig['fig_num']]);
                        } else {
                            // If quantity is 0, remove all minifigure records
                            $deleteMinifigStmt = $pdo->prepare("
                                DELETE FROM collection_minifigs 
                                WHERE user_id = ? AND set_num = ? AND fig_num = ?
                            ");
                            $deleteMinifigStmt->execute([$user_id, $set_num, $minifig['fig_num']]);
                        }
                    }
                }
            }
        }

        $pdo->commit();
        
        // Log successful quantity update
        $log_action = "Updated set quantity for {$set_num}: {$old_quantity} -> {$quantity} (complete: {$complete_count}, sealed: {$sealed_count})";
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
        
        $response['success'] = true;
        $response['quantity'] = $quantity;
        $response['complete_count'] = $complete_count;
        $response['sealed_count'] = $sealed_count;
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response['error'] = 'Error executing SQL query: ' . $e->getMessage();
    }
} else {
    $response['error'] = 'User not logged in or invalid user. Session user_id: ' . ($_SESSION['user_id'] ?? 'not set') . ' - Data user_id: ' . $user_id;
}

echo json_encode($response);
?>