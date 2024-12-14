<?php
require 'dbh.php';
require 'cors_headers.php';

// Enable error logging
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_log("Update profile endpoint hit");

session_start();

$response = ['success' => false];
$raw_data = file_get_contents('php://input');
error_log("Raw input data: " . $raw_data);

$data = json_decode($raw_data, true);
error_log("Decoded data: " . print_r($data, true));

// Debug session
error_log("Session user_id: " . $_SESSION['user_id']);
error_log("Request user_id: " . $data['user_id']);

if (!isset($_SESSION['user_id']) || !isset($data['user_id']) || 
    $_SESSION['user_id'] != $data['user_id']) {
    error_log("Authorization failed");
    $response['error'] = 'Unauthorized';
    echo json_encode($response);
    exit;
}

if ($data) {
    try {
        $pdo->beginTransaction();
        
        // Convert and log show_email value at each stage
        $show_email_raw = $data['showEmail'];
        $show_email = filter_var($show_email_raw, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        
        error_log("Show email processing:");
        error_log("Raw value: " . var_export($show_email_raw, true));
        error_log("Converted value: " . var_export($show_email, true));

        // Prepare the query
        $query = "
            UPDATE users 
            SET show_email = :show_email
            WHERE user_id = :user_id
        ";
        
        // Log the query
        error_log("Query: " . $query);
        
        // Prepare and execute just the show_email update first
        $stmt = $pdo->prepare($query);
        $stmt->bindValue(':show_email', $show_email, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $data['user_id'], PDO::PARAM_INT);
        
        error_log("Bound parameters:");
        error_log("show_email: " . var_export($show_email, true));
        error_log("user_id: " . var_export($data['user_id'], true));
        
        $result = $stmt->execute();
        
        // Log the result
        error_log("Execute result: " . var_export($result, true));
        error_log("Rows affected: " . $stmt->rowCount());
        
        // Verify the current value
        $verifyStmt = $pdo->prepare("SELECT show_email FROM users WHERE user_id = ?");
        $verifyStmt->execute([$data['user_id']]);
        $currentValue = $verifyStmt->fetchColumn();
        error_log("Value in database after update: " . var_export($currentValue, true));
        
        if ($result) {
            $pdo->commit();
            $response['success'] = true;
            $response['debug'] = [
                'original_value' => $show_email_raw,
                'converted_value' => $show_email,
                'final_db_value' => $currentValue,
                'rows_affected' => $stmt->rowCount()
            ];
        } else {
            $pdo->rollBack();
            error_log("PDO Error Info: " . print_r($stmt->errorInfo(), true));
            $response['error'] = 'Update failed';
        }
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("PDO Exception: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        $response['error'] = 'Database error: ' . $e->getMessage();
    }
} else {
    error_log("No valid data received");
    $response['error'] = 'Invalid data';
}

error_log("Final response: " . json_encode($response));
echo json_encode($response);
?>