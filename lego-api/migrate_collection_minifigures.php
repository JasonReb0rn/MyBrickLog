<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$response = ['success' => false];

// Only allow logged in users to migrate their own data
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'User not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    $pdo->beginTransaction();
    
    // Get all collection sets for this user that might need minifigure records
    $collectionStmt = $pdo->prepare("
        SELECT c.set_num, c.collection_set_quantity 
        FROM collection c 
        WHERE c.user_id = ?
    ");
    $collectionStmt->execute([$userId]);
    $collections = $collectionStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $migratedSets = [];
    $skippedSets = [];
    $errorSets = [];
    
    foreach ($collections as $collection) {
        $setNum = $collection['set_num'];
        $setQuantity = $collection['collection_set_quantity'];
        
        try {
            // Check if this set already has any minifigure records
            $existingStmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM collection_minifigs 
                WHERE user_id = ? AND set_num = ?
            ");
            $existingStmt->execute([$userId, $setNum]);
            $existingCount = $existingStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($existingCount > 0) {
                $skippedSets[] = $setNum;
                continue; // Skip sets that already have minifigure records
            }
            
            // Get inventory for this set
            $inventoryStmt = $pdo->prepare("SELECT id FROM inventories WHERE set_num = ?");
            $inventoryStmt->execute([$setNum]);
            $inventory = $inventoryStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$inventory) {
                $skippedSets[] = $setNum;
                continue; // Skip sets without inventory data
            }
            
            // Get minifigures for this set
            $minifigsStmt = $pdo->prepare("
                SELECT im.fig_num, im.quantity 
                FROM inventory_minifigs im 
                WHERE im.inventory_id = ?
            ");
            $minifigsStmt->execute([$inventory['id']]);
            $minifigs = $minifigsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($minifigs)) {
                $skippedSets[] = $setNum;
                continue; // Skip sets with no minifigures
            }
            
            // Create collection_minifigs records
            $createdCount = 0;
            foreach ($minifigs as $minifig) {
                $totalMinifigQuantity = $minifig['quantity'] * $setQuantity;
                
                $insertStmt = $pdo->prepare("
                    INSERT INTO collection_minifigs (user_id, set_num, fig_num, quantity_owned) 
                    VALUES (?, ?, ?, ?)
                ");
                $insertStmt->execute([$userId, $setNum, $minifig['fig_num'], $totalMinifigQuantity]);
                $createdCount++;
            }
            
            $migratedSets[] = [
                'set_num' => $setNum,
                'minifigs_created' => $createdCount
            ];
            
        } catch (PDOException $e) {
            error_log("Error migrating set {$setNum}: " . $e->getMessage());
            $errorSets[] = [
                'set_num' => $setNum,
                'error' => $e->getMessage()
            ];
        }
    }
    
    $pdo->commit();
    
    $response['success'] = true;
    $response['migrated_sets'] = $migratedSets;
    $response['skipped_sets'] = $skippedSets;
    $response['error_sets'] = $errorSets;
    $response['total_collections'] = count($collections);
    $response['migrated_count'] = count($migratedSets);
    $response['skipped_count'] = count($skippedSets);
    $response['error_count'] = count($errorSets);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log('Error in migrate_collection_minifigures.php: ' . $e->getMessage());
    $response['error'] = 'Error migrating collection minifigures';
}

echo json_encode($response);
?> 