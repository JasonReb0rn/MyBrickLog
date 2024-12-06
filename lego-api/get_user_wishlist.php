<?php
require 'dbh.php';
require 'cors_headers.php';

$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if ($userId !== null) {
    try {
        $stmt = $pdo->prepare("
            SELECT u.username, s.set_num, s.name, s.num_parts, s.img_url, s.theme_id, t.name AS theme_name,
                COALESCE((
                    SELECT SUM(im.quantity)
                    FROM inventory_minifigs im
                    JOIN inventories i ON im.inventory_id = i.id
                    WHERE i.set_num = s.set_num
                ), 0) AS num_minifigures
            FROM users u
            JOIN wishlist w ON u.user_id = w.user_id
            JOIN sets s ON s.set_num = w.set_num
            JOIN themes t ON s.theme_id = t.id
            WHERE u.user_id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);
        $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($sets)) {
            $username = $sets[0]['username'];
            $response = [
                'username' => $username,
                'sets' => $sets
            ];
            echo json_encode($response);
        } else {
            echo json_encode(['error' => 'No sets found in wishlist for this user.']);
        }
    } catch (PDOException $e) {
        error_log('Error fetching user collection: ' . $e->getMessage());
        echo json_encode(['error' => 'An error occurred while fetching the collection.']);
    }
} else {
    echo json_encode(['error' => 'Invalid user ID.']);
}
?>

