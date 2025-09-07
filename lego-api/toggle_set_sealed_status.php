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
$sealed = $data['sealed'];

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $stmt = $pdo->prepare("UPDATE collection SET sealed = ? WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$sealed, $user_id, $set_num]);

        // Log the toggle action
        $log_action = "Toggled sealed status for set {$set_num}: " . ($sealed ? 'sealed' : 'not sealed');
        insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');

        $response['success'] = true;
    } catch (PDOException $e) {
        error_log('Error updating sealed status: ' . $e->getMessage());
        $response['error'] = 'Error updating sealed status';
    }
} else {
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?>