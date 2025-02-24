<?php
include 'dbh.php';
include 'cors_headers.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];
$complete = $data['complete'];

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $stmt = $pdo->prepare("UPDATE collection SET complete = ? WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$complete, $user_id, $set_num]);

        $response['success'] = true;
    } catch (PDOException $e) {
        error_log('Error updating complete status: ' . $e->getMessage());
        $response['error'] = 'Error updating complete status';
    }
} else {
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?>
