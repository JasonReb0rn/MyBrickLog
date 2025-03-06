<?php
include 'dbh.php';
include 'cors_headers.php';

session_start();

$response = ['success' => false];

// Get the JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$user_id = $data['user_id'];
$set_num = $data['set_num'];
$quantity = intval($data['quantity']);

// Debugging output
error_log('Session user_id: ' . $_SESSION['user_id']);
error_log('Data user_id: ' . $user_id);

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        $pdo->beginTransaction();

        // First, get the current complete and sealed counts
        $checkStmt = $pdo->prepare("SELECT complete, sealed FROM collection WHERE user_id = ? AND set_num = ?");
        $checkStmt->execute([$user_id, $set_num]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            throw new Exception('Set not found in collection');
        }
        
        $complete_count = intval($result['complete']);
        $sealed_count = intval($result['sealed']);
        
        // If new quantity is less than current complete or sealed counts,
        // adjust them down to match the new quantity
        if ($quantity < $complete_count) {
            $complete_count = $quantity;
        }
        
        if ($quantity < $sealed_count) {
            $sealed_count = $quantity;
        }
        
        // Update quantity and adjusted counts
        $stmt = $pdo->prepare("UPDATE collection SET 
                              collection_set_quantity = ?,
                              complete = ?,
                              sealed = ?
                              WHERE user_id = ? AND set_num = ?");
        $stmt->execute([$quantity, $complete_count, $sealed_count, $user_id, $set_num]);

        $pdo->commit();
        $response['success'] = true;
        $response['quantity'] = $quantity;
        $response['complete_count'] = $complete_count;
        $response['sealed_count'] = $sealed_count;
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response['error'] = 'Error executing SQL query: ' . $e->getMessage();
    }
} else {
    $response['error'] = 'User not logged in or invalid user. Session user_id: ' . ($_SESSION['user_id'] ?? 'not set') . ' - Data user_id: ' . $user_id;
}

echo json_encode($response);
?>