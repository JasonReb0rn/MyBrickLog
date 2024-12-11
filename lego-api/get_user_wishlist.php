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

    // Get the user's wishlist
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
            pt.id AS parent_theme_id
        FROM wishlist w
        JOIN sets s ON s.set_num = w.set_num
        JOIN themes t ON s.theme_id = t.id
        LEFT JOIN themes pt ON t.parent_id = pt.id
        WHERE w.user_id = :user_id
        ORDER BY 
            COALESCE(pt.name, t.name),
            t.name,
            s.year DESC,
            s.name
    ");

    $setsStmt->execute(['user_id' => $userId]);
    $sets = $setsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Prepare the response
    $response = [
        'profile' => $profile,
        'sets' => $sets
    ];

    // Set cache headers
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