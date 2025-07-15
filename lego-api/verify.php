<?php
include 'dbh.php';
include 'cors_headers.php';

$token = $_GET['token'] ?? '';
$response = ['success' => false];

if (!empty($token)) {
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Check if token exists and user is not already verified
        $stmt = $pdo->prepare("SELECT user_id, verified FROM users WHERE verification_token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            if ($user['verified'] == 1) {
                // User is already verified
                $pdo->rollBack();
                $response['success'] = true;
                $response['message'] = 'Account is already verified';
            } else {
                // Update user as verified and clear the verification token
                $stmt = $pdo->prepare("UPDATE users SET verified = 1, verification_token = NULL WHERE verification_token = ?");
                if ($stmt->execute([$token])) {
                    $pdo->commit();
                    $response['success'] = true;
                    $response['message'] = 'Account successfully verified';
                } else {
                    $pdo->rollBack();
                    $response['error'] = 'Failed to verify account';
                }
            }
        } else {
            // Invalid token
            $pdo->rollBack();
            $response['error'] = 'Invalid verification token';
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $response['error'] = 'Error: ' . $e->getMessage();
    }
} else {
    $response['error'] = 'No verification token provided';
}

echo json_encode($response);
?>
