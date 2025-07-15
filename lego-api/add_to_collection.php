<?php
require 'dbh.php';
require 'cors_headers.php';

// Start or resume the session
session_start();

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
                $stmt = $pdo->prepare("SELECT collection_set_quantity FROM collection WHERE user_id = ? AND set_num = ?");
                $stmt->execute([$userId, $setNum]);
                $existingSet = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existingSet) {
                    // If the set exists, update the quantity
                    $newQuantity = $existingSet['collection_set_quantity'] + $quantity;
                    $updateStmt = $pdo->prepare("UPDATE collection SET collection_set_quantity = ? WHERE user_id = ? AND set_num = ?");
                    $updateStmt->execute([$newQuantity, $userId, $setNum]);
                } else {
                    // If the set does not exist, insert a new record
                    // Setting complete=1 (true) and sealed=0 by default (assuming sets are complete but opened)
                    $insertStmt = $pdo->prepare("INSERT INTO collection (user_id, set_num, collection_set_quantity, complete, sealed) VALUES (?, ?, ?, 1, 0)");
                    $insertStmt->execute([$userId, $setNum, $quantity]);
                }
            }

            // Commit the transaction
            $pdo->commit();
            $response['success'] = true;
        } catch (PDOException $e) {
            // Roll back the transaction if something failed
            $pdo->rollBack();
            error_log('Error executing SQL query: ' . $e->getMessage());
        }
    }
} else {
    $response['error'] = 'User not logged in';
}

echo json_encode($response);
?>
