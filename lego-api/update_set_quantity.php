<?php
include 'dbh.php';
include 'cors_headers.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];
$quantity = $data['quantity'];

// Debugging output
error_log('Session user_id: ' . $_SESSION['user_id']);
error_log('Data user_id: ' . $user_id);

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("UPDATE collection SET collection_set_quantity = ? WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$quantity, $user_id, $set_num]);

        $pdo->commit();
        $response['success'] = true;
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response['error'] = 'Error executing SQL query';
    }
} else {
    $response['error'] = 'User not logged in or invalid user. Session user_id: ' . ($_SESSION['user_id'] ?? 'not set') . ' - Data user_id: ' . $user_id;
}

echo json_encode($response);
?>
