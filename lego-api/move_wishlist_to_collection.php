<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$response = ['success' => false];

$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // Check if set already exists in collection
        $checkStmt = $pdo->prepare("SELECT * FROM collection WHERE user_id = ? AND set_num = ?");
        $checkStmt->execute([$user_id, $set_num]);
        
        if ($checkStmt->fetch()) {
            // Set already exists in collection, just remove from wishlist
            $deleteStmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND set_num = ?");
            $deleteStmt->execute([$user_id, $set_num]);
            $response['message'] = 'Set already in collection';
        } else {
            // Check if the set exists in the wishlist
            $stmt = $pdo->prepare("SELECT * FROM wishlist WHERE user_id = ? AND set_num = ?");
            $stmt->execute([$user_id, $set_num]);
            $existingWishlistSet = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingWishlistSet) {
                // Insert into collection with quantity 1
                $insertStmt = $pdo->prepare("INSERT INTO collection (user_id, set_num, collection_set_quantity) VALUES (?, ?, ?)");
                $insertStmt->execute([$user_id, $set_num, 1]);

                // Remove from wishlist
                $deleteStmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND set_num = ?");
                $deleteStmt->execute([$user_id, $set_num]);
            } else {
                $response['error'] = 'Set not found in wishlist';
                throw new Exception('Set not found in wishlist');
            }
        }

        $pdo->commit();
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