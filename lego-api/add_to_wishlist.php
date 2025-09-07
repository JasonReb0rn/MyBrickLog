<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

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

                // Check if the set already exists in the wishlist
                $stmt = $pdo->prepare("SELECT * FROM wishlist WHERE user_id = ? AND set_num = ?");
                $stmt->execute([$userId, $setNum]);
                $existingSet = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$existingSet) {
                    // If the set does not exist, insert a new record
                    $insertStmt = $pdo->prepare("INSERT INTO wishlist (user_id, set_num) VALUES (?, ?)");
                    $insertStmt->execute([$userId, $setNum]);
                }
            }

            // Commit the transaction
            $pdo->commit();
            
            // Log successful addition to wishlist
            $setCount = count($sets);
            $setNums = array_column($sets, 'setNum');
            $log_action = "Added {$setCount} set(s) to wishlist: " . implode(', ', $setNums);
            insertLog($pdo, $userId, $log_action, $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'COLLECTION');
            
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

