<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    // First, get a random user who has at least one item in their collection
    $userQuery = "
        SELECT u.user_id, u.username, u.profile_picture
        FROM users u
        JOIN collection c ON u.user_id = c.user_id
        GROUP BY u.user_id
        HAVING COUNT(c.user_id) > 0
        ORDER BY RAND()
        LIMIT 1
    ";

    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute();
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['error' => 'No users with collections found']);
        exit;
    }

    // Now get a random set from this user's collection
    $setQuery = "
        SELECT 
            s.set_num, 
            s.name, 
            s.year, 
            s.theme_id, 
            s.num_parts, 
            s.img_url,
            t.name as theme_name,
            c.collection_set_quantity,
            c.complete,
            c.sealed
        FROM collection c
        JOIN sets s ON s.set_num = c.set_num
        JOIN themes t ON t.id = s.theme_id
        WHERE c.user_id = ?
        ORDER BY RAND()
        LIMIT 1
    ";

    $setStmt = $pdo->prepare($setQuery);
    $setStmt->execute([$user['user_id']]);
    $set = $setStmt->fetch(PDO::FETCH_ASSOC);

    if (!$set) {
        echo json_encode(['error' => 'No sets found in user collection']);
        exit;
    }

    // Combine user and set information
    $result = [
        'user' => $user,
        'set' => $set
    ];

    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?> 