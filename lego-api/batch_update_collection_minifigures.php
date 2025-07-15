<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'] ?? null;
$set_num = $data['set_num'] ?? null;
$minifigs = $data['minifigs'] ?? [];

// Validate required fields
if (!$user_id || !$set_num || !is_array($minifigs)) {
    echo json_encode(['error' => 'Missing required fields: user_id, set_num, minifigs (array)']);
    exit;
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

        // Get all valid minifigures for this set to validate inputs
        $validMinifigsStmt = $pdo->prepare("
            SELECT im.fig_num, im.quantity as required_quantity
            FROM inventory_minifigs im
            JOIN inventories i ON i.id = im.inventory_id
            WHERE i.set_num = ?
        ");
        $validMinifigsStmt->execute([$set_num]);
        $validMinifigs = $validMinifigsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create a lookup array for valid minifigures
        $validFigNums = [];
        foreach ($validMinifigs as $minifig) {
            $validFigNums[$minifig['fig_num']] = $minifig['required_quantity'];
        }

        $updatedCount = 0;
        $errors = [];

        foreach ($minifigs as $minifigUpdate) {
            $fig_num = $minifigUpdate['fig_num'] ?? null;
            $quantity_owned = isset($minifigUpdate['quantity_owned']) ? intval($minifigUpdate['quantity_owned']) : null;

            // Validate each minifigure entry
            if (!$fig_num || $quantity_owned === null) {
                $errors[] = "Invalid minifigure entry: missing fig_num or quantity_owned";
                continue;
            }

            // Ensure quantity is not negative
            if ($quantity_owned < 0) {
                $quantity_owned = 0;
            }

            // Verify this minifigure belongs to this set
            if (!isset($validFigNums[$fig_num])) {
                $errors[] = "Minifigure {$fig_num} not found in set {$set_num}";
                continue;
            }

            try {
                // Check if record already exists
                $existingStmt = $pdo->prepare("
                    SELECT id 
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

                $updatedCount++;
            } catch (PDOException $e) {
                $errors[] = "Error updating minifigure {$fig_num}: " . $e->getMessage();
                error_log("Error updating minifigure {$fig_num}: " . $e->getMessage());
            }
        }

        $pdo->commit();
        
        $response['success'] = true;
        $response['updated_count'] = $updatedCount;
        $response['total_processed'] = count($minifigs);
        
        if (!empty($errors)) {
            $response['errors'] = $errors;
        }
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error in batch update minifigures: ' . $e->getMessage());
        $response['error'] = 'Error updating minifigure quantities';
    }
} else {
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?> 