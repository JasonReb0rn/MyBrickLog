<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$user_id, $set_num]);

        $pdo->commit();
        
        // Log successful removal from wishlist
        $log_action = "Removed set from wishlist: {$set_num}";
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
        
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
