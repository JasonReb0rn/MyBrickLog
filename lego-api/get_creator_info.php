<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    $query = "
        SELECT profile_picture, display_name
        FROM users
        WHERE user_id = 1
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $creator = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($creator) {
        echo json_encode($creator);
    } else {
        echo json_encode(['error' => 'Creator not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>