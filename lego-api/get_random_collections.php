<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    // SQL query to fetch 3 random users who have at least one item in their collection
    $query = "
        SELECT u.user_id, u.username
        FROM users u
        JOIN collection c ON u.user_id = c.user_id
        GROUP BY u.user_id
        HAVING COUNT(c.user_id) > 0
        ORDER BY RAND()
        LIMIT 3
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($users);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
