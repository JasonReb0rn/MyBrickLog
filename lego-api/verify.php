<?php
include 'dbh.php';
include 'cors_headers.php';

$token = $_GET['token'] ?? '';
$response = ['success' => false];

if (!empty($token)) {
    try {
        $stmt = $pdo->prepare("UPDATE users SET verified = 1 WHERE verification_token = ?");
        if ($stmt->execute([$token])) {
            $response['success'] = true;
        }
    } catch (PDOException $e) {
        $response['error'] = 'Error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>
