<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

session_start();

// Helper function to get minifigures for a set and create collection records
function createMinifigureRecords($pdo, $userId, $setNum, $quantity) {
    try {
        // Get the inventory for this set
        $inventoryStmt = $pdo->prepare("SELECT id FROM inventories WHERE set_num = ?");
        $inventoryStmt->execute([$setNum]);
        $inventory = $inventoryStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($inventory) {
            // Get all minifigures for this inventory
            $minifigsStmt = $pdo->prepare("
                SELECT im.fig_num, im.quantity 
                FROM inventory_minifigs im 
                WHERE im.inventory_id = ?
            ");
            $minifigsStmt->execute([$inventory['id']]);
            $minifigs = $minifigsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Create collection_minifigs records for each minifigure - assume user owns all minifigures
            foreach ($minifigs as $minifig) {
                // Calculate total owned: (minifigs per set) × (number of sets being added)
                $totalMinifigQuantity = $minifig['quantity'] * $quantity;
                
                // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic operation
                $upsertStmt = $pdo->prepare("
                    INSERT INTO collection_minifigs (user_id, set_num, fig_num, quantity_owned) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    quantity_owned = quantity_owned + VALUES(quantity_owned),
                    updated_at = CURRENT_TIMESTAMP
                ");
                $upsertStmt->execute([$userId, $setNum, $minifig['fig_num'], $totalMinifigQuantity]);
            }
        }
    } catch (PDOException $e) {
        error_log('Error creating minifigure records: ' . $e->getMessage());
        throw $e;
    }
}

$response = ['success' => false];

$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // Check if set already exists in collection
        $checkStmt = $pdo->prepare("SELECT collection_set_quantity, complete, sealed FROM collection WHERE user_id = ? AND set_num = ?");
        $checkStmt->execute([$user_id, $set_num]);
        $existingCollection = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingCollection) {
            // Set already exists in collection, update quantities and remove from wishlist
            $newQuantity = $existingCollection['collection_set_quantity'] + 1;
            $newComplete = $existingCollection['complete'] + 1; // Assume new set is complete
            $newSealed = $existingCollection['sealed'] + 1; // Assume new set is sealed
            
            $updateStmt = $pdo->prepare("UPDATE collection SET collection_set_quantity = ?, complete = ?, sealed = ? WHERE user_id = ? AND set_num = ?");
            $updateStmt->execute([$newQuantity, $newComplete, $newSealed, $user_id, $set_num]);
            
            // Create minifigure records for the additional set
            createMinifigureRecords($pdo, $user_id, $set_num, 1);
            
            // Remove from wishlist
            $deleteStmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND set_num = ?");
            $deleteStmt->execute([$user_id, $set_num]);
            
            $response['message'] = 'Set added to existing collection';
        } else {
            // Check if the set exists in the wishlist
            $stmt = $pdo->prepare("SELECT * FROM wishlist WHERE user_id = ? AND set_num = ?");
            $stmt->execute([$user_id, $set_num]);
            $existingWishlistSet = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingWishlistSet) {
                // Insert into collection with quantity 1, complete=1, sealed=1
                $insertStmt = $pdo->prepare("INSERT INTO collection (user_id, set_num, collection_set_quantity, complete, sealed) VALUES (?, ?, ?, ?, ?)");
                $insertStmt->execute([$user_id, $set_num, 1, 1, 1]);

                // Create minifigure records for the new set
                createMinifigureRecords($pdo, $user_id, $set_num, 1);

                // Remove from wishlist
                $deleteStmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND set_num = ?");
                $deleteStmt->execute([$user_id, $set_num]);
            } else {
                $response['error'] = 'Set not found in wishlist';
                throw new Exception('Set not found in wishlist');
            }
        }

        $pdo->commit();
        
        // Log successful move from wishlist to collection
        $log_action = "Moved set from wishlist to collection: {$set_num}";
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
        
        $response['success'] = true;
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response['error'] = 'Error executing SQL query';
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Error: ' . $e->getMessage());
    }
} else {
    error_log('User not logged in or invalid user');
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?>