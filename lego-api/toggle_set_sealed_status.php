<?php
include 'dbh.php';
include 'cors_headers.php';

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