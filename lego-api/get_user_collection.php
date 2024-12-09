<?php
require 'dbh.php';
require 'cors_headers.php';

$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if ($userId !== null) {
    try {
        // Check if user exists
        $userStmt = $pdo->prepare("SELECT username FROM users WHERE user_id = :user_id");
        $userStmt->execute(['user_id' => $userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $stmt = $pdo->prepare("
                SELECT s.set_num, s.name, s.year, s.num_parts, s.img_url, s.theme_id, t.name AS theme_name, c.collection_set_quantity as quantity, c.complete,
                    COALESCE((
                        SELECT SUM(im.quantity)
                        FROM inventory_minifigs im
                        JOIN inventories i ON im.inventory_id = i.id
                        WHERE i.set_num = s.set_num
                    ), 0) AS num_minifigures
                FROM collection c
                JOIN sets s ON s.set_num = c.set_num
                JOIN themes t ON s.theme_id = t.id
                WHERE c.user_id = :user_id
            ");
            $stmt->execute(['user_id' => $userId]);
            $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response = [
                'username' => $user['username'],
                'sets' => $sets
            ];
            echo json_encode($response);
        } else {
            echo json_encode(['error' => 'User not found.']);
        }
    } catch (PDOException $e) {
        error_log('Error fetching user collection: ' . $e->getMessage());
        echo json_encode(['error' => 'An error occurred while fetching the collection.']);
    }
} else {
    echo json_encode(['error' => 'Invalid user ID.']);
}
?>
