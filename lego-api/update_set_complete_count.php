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
$complete_count = intval($data['complete_count']);

if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) {
    try {
        // First, check if the complete count is valid (not more than quantity)
        $checkStmt = $pdo->prepare("SELECT collection_set_quantity FROM collection WHERE user_id = ? AND set_num = ?");
        $checkStmt->execute([$user_id, $set_num]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            $response['error'] = 'Set not found in collection';
        } else {
            $total_quantity = intval($result['collection_set_quantity']);
            
            // Ensure complete count is not negative and not more than total quantity
            if ($complete_count < 0) {
                $complete_count = 0;
            } elseif ($complete_count > $total_quantity) {
                $complete_count = $total_quantity;
            }
            
            // Update the complete count
            $stmt = $pdo->prepare("UPDATE collection SET complete = ? WHERE user_id = ? AND set_num = ?");
            $stmt->execute([$complete_count, $user_id, $set_num]);
            
            // Log successful complete count update
            $log_action = "Updated complete count for set {$set_num}: {$complete_count}";
            insertLog($pdo, $user_id, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
            
            $response['success'] = true;
            $response['complete_count'] = $complete_count;
        }
    } catch (PDOException $e) {
        error_log('Error updating complete count: ' . $e->getMessage());
        $response['error'] = 'Error updating complete count: ' . $e->getMessage();
    }
} else {
    $response['error'] = 'User not logged in or invalid user';
}

echo json_encode($response);
?>