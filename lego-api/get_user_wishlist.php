<?php
require 'dbh.php';
require 'cors_headers.php';

$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if ($userId === null) {
    echo json_encode(['error' => 'Invalid user ID provided.']);
    exit;
}

try {
    // First, get the user's profile information
    $userStmt = $pdo->prepare("
        SELECT 
            u.username,
            u.display_name,
            u.profile_picture,
            u.bio,
            u.location,
            u.favorite_theme,
            u.join_date,
            t.name as favorite_theme_name
        FROM users u
        LEFT JOIN themes t ON u.favorite_theme = t.id
        WHERE u.user_id = :user_id
    ");
    
    $userStmt->execute(['user_id' => $userId]);
    $userData = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData) {
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    // Clean and prepare the profile data
    $profile = [
        'username' => $userData['username'],
        'display_name' => $userData['display_name'],
        'profile_picture' => $userData['profile_picture'],
        'bio' => $userData['bio'],
        'location' => $userData['location'],
        'favorite_theme' => $userData['favorite_theme'],
        'favorite_theme_name' => $userData['favorite_theme_name'],
        'join_date' => $userData['join_date']
    ];

    // First, remove any wishlist items that are already in the collection
    $removeStmt = $pdo->prepare("
        DELETE w FROM wishlist w
        INNER JOIN collection c ON w.set_num = c.set_num AND w.user_id = c.user_id
        WHERE w.user_id = :user_id
    ");
    $removeStmt->execute(['user_id' => $userId]);

    // Then get the remaining wishlist items
    $setsStmt = $pdo->prepare("
        SELECT 
            s.set_num,
            s.name,
            s.year,
            s.num_parts,
            s.img_url,
            s.theme_id,
            t.name AS theme_name,
            pt.name AS parent_theme_name,
            pt.id AS parent_theme_id,
            sp.retail_price,
            sp.sealed_value,
            sp.used_value
        FROM wishlist w
        JOIN sets s ON s.set_num = w.set_num
        JOIN themes t ON s.theme_id = t.id
        LEFT JOIN themes pt ON t.parent_id = pt.id
        LEFT JOIN set_prices sp ON s.set_num = sp.set_num
        WHERE w.user_id = :user_id
        AND NOT EXISTS (
            SELECT 1 FROM collection c 
            WHERE c.set_num = w.set_num 
            AND c.user_id = w.user_id
        )
        ORDER BY 
            COALESCE(pt.name, t.name),
            t.name,
            s.year DESC,
            s.name
    ");

    $setsStmt->execute(['user_id' => $userId]);
    $sets = $setsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get user's trophies
    $trophyStmt = $pdo->prepare("
        SELECT 
            t.id as trophy_id,
            t.name,
            t.description,
            t.image_path,
            t.rarity,
            ut.awarded_at,
            ut.notes,
            u_awarded.username as awarded_by_username
        FROM user_trophies ut
        JOIN trophies t ON ut.trophy_id = t.id
        LEFT JOIN users u_awarded ON ut.awarded_by = u_awarded.user_id
        WHERE ut.user_id = :user_id 
        AND t.is_active = 1
        ORDER BY 
            CASE t.rarity 
                WHEN 'mythical' THEN 1 
                WHEN 'rare' THEN 2 
                WHEN 'common' THEN 3 
            END,
            ut.awarded_at DESC
    ");
    
    $trophyStmt->execute(['user_id' => $userId]);
    $trophies = $trophyStmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'profile' => $profile,
        'sets' => $sets,
        'trophies' => $trophies
    ];

    header('Cache-Control: max-age=300, public');
    header('ETag: "' . md5(json_encode($response)) . '"');

    echo json_encode($response);

} catch (PDOException $e) {
    error_log('Database error in get_user_wishlist.php: ' . $e->getMessage());
    echo json_encode([
        'error' => 'An error occurred while fetching the wishlist.',
    ]);
}
?>