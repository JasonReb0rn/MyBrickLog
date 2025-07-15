<?php
require 'dbh.php';
require 'cors_headers.php';

// Start or resume the session
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
                
                // Check if this minifig already exists in user's collection for this set
                $existingStmt = $pdo->prepare("
                    SELECT quantity_owned 
                    FROM collection_minifigs 
                    WHERE user_id = ? AND set_num = ? AND fig_num = ?
                ");
                $existingStmt->execute([$userId, $setNum, $minifig['fig_num']]);
                $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existing) {
                    // Update existing record
                    $newQuantity = $existing['quantity_owned'] + $totalMinifigQuantity;
                    $updateStmt = $pdo->prepare("
                        UPDATE collection_minifigs 
                        SET quantity_owned = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE user_id = ? AND set_num = ? AND fig_num = ?
                    ");
                    $updateStmt->execute([$newQuantity, $userId, $setNum, $minifig['fig_num']]);
                } else {
                    // Insert new record
                    $insertStmt = $pdo->prepare("
                        INSERT INTO collection_minifigs (user_id, set_num, fig_num, quantity_owned) 
                        VALUES (?, ?, ?, ?)
                    ");
                    $insertStmt->execute([$userId, $setNum, $minifig['fig_num'], $totalMinifigQuantity]);
                }
            }
        }
    } catch (PDOException $e) {
        error_log('Error creating minifigure records: ' . $e->getMessage());
        throw $e;
    }
}

$data = json_decode(file_get_contents('php://input'), true);
$sets = $data['sets'] ?? [];
$response = ['success' => false];

// Check if the user is logged in
if (isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];

    if (!empty($sets)) {
        try {
            // Begin a transaction
            $pdo->beginTransaction();

            foreach ($sets as $set) {
                $setNum = $set['setNum'];
                $quantity = $set['quantity'];

                // Check if the set already exists in the collection
                $stmt = $pdo->prepare("SELECT collection_set_quantity, complete, sealed FROM collection WHERE user_id = ? AND set_num = ?");
                $stmt->execute([$userId, $setNum]);
                $existingSet = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existingSet) {
                    // If the set exists, update the quantity and assume new sets are complete and sealed
                    $newQuantity = $existingSet['collection_set_quantity'] + $quantity;
                    $newComplete = $existingSet['complete'] + $quantity; // Assume new sets are complete
                    $newSealed = $existingSet['sealed'] + $quantity; // Assume new sets are sealed
                    
                    $updateStmt = $pdo->prepare("UPDATE collection SET collection_set_quantity = ?, complete = ?, sealed = ? WHERE user_id = ? AND set_num = ?");
                    $updateStmt->execute([$newQuantity, $newComplete, $newSealed, $userId, $setNum]);
                    
                    // Create minifigure records for the additional quantity
                    createMinifigureRecords($pdo, $userId, $setNum, $quantity);
                } else {
                    // If the set does not exist, insert a new record
                    // Setting complete=quantity and sealed=quantity (assuming sets are complete and sealed)
                    $insertStmt = $pdo->prepare("INSERT INTO collection (user_id, set_num, collection_set_quantity, complete, sealed) VALUES (?, ?, ?, ?, ?)");
                    $insertStmt->execute([$userId, $setNum, $quantity, $quantity, $quantity]);
                    
                    // Create minifigure records for the new set
                    createMinifigureRecords($pdo, $userId, $setNum, $quantity);
                }
            }

            // Commit the transaction
            $pdo->commit();
            $response['success'] = true;
        } catch (PDOException $e) {
            // Roll back the transaction if something failed
            $pdo->rollBack();
            error_log('Error executing SQL query: ' . $e->getMessage());
            $response['error'] = 'Error adding sets to collection';
        }
    }
} else {
    $response['error'] = 'User not logged in';
}

echo json_encode($response);
?>
