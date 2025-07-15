<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];

// Debugging logs
error_log('Session user_id: ' . $_SESSION['user_id']);
error_log('Request user_id: ' . $user_id);

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // Remove the set from collection
        $stmt = $pdo->prepare("DELETE FROM collection WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$user_id, $set_num]);

        // Remove associated minifigure records
        $minifigStmt = $pdo->prepare("DELETE FROM collection_minifigs WHERE user_id = ? AND set_num = ?");
        $minifigStmt->execute([$user_id, $set_num]);

        $pdo->commit();
        $response['success'] = true;
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response['error'] = 'Error executing SQL query';
    }
} else {
    error_log('User not logged in or invalid user');
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?>
