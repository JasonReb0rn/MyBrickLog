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
            t.name as favorite_theme_name,
            u.twitter_handle,
            u.youtube_channel,
            u.bricklink_store,
            u.email,
            u.show_email
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

    $wishlistStmt = $pdo->prepare("
        SELECT COUNT(*) as wishlist_count
        FROM wishlist
        WHERE user_id = :user_id
    ");
    
    $wishlistStmt->execute(['user_id' => $userId]);
    $wishlistData = $wishlistStmt->fetch(PDO::FETCH_ASSOC);

    // Clean and prepare the profile data
    $profile = [
        'username' => $userData['username'],
        'display_name' => $userData['display_name'],
        'profile_picture' => $userData['profile_picture'],
        'bio' => $userData['bio'],
        'location' => $userData['location'],
        'favorite_theme' => $userData['favorite_theme'],
        'favorite_theme_name' => $userData['favorite_theme_name'],
        'join_date' => $userData['join_date'],
        'twitter_handle' => $userData['twitter_handle'],
        'youtube_channel' => $userData['youtube_channel'],
        'bricklink_store' => $userData['bricklink_store'],
        'email' => $userData['show_email'] ? $userData['email'] : null,
        'has_wishlist' => $wishlistData['wishlist_count'] > 0
    ];

    // Get the user's collection with detailed information
    $collectionStmt = $pdo->prepare("
        SELECT 
            s.set_num,
            s.name,
            s.year,
            s.num_parts,
            s.img_url,
            s.theme_id,
            t.name AS theme_name,
            c.collection_set_quantity as quantity,
            c.complete,
            c.sealed,
            COALESCE((
                SELECT SUM(im.quantity)
                FROM inventory_minifigs im
                JOIN inventories i ON im.inventory_id = i.id
                WHERE i.set_num = s.set_num
            ), 0) AS num_minifigures,
            -- Get owned minifigures summary
            COALESCE((
                SELECT SUM(cm.quantity_owned)
                FROM collection_minifigs cm
                WHERE cm.user_id = c.user_id AND cm.set_num = c.set_num
            ), 0) AS owned_minifigures,
            -- Calculate expected minifigures (total required for all owned sets)
            COALESCE((
                SELECT SUM(im.quantity) * c.collection_set_quantity
                FROM inventory_minifigs im
                JOIN inventories i ON im.inventory_id = i.id
                WHERE i.set_num = s.set_num
            ), 0) AS expected_minifigures,
            sp.retail_price,
            sp.sealed_value,
            sp.used_value,
            -- Get parent theme information
            pt.name AS parent_theme_name,
            pt.id AS parent_theme_id
        FROM collection c
        JOIN sets s ON s.set_num = c.set_num
        JOIN themes t ON s.theme_id = t.id
        LEFT JOIN themes pt ON t.parent_id = pt.id
        LEFT JOIN set_prices sp ON s.set_num = sp.set_num
        WHERE c.user_id = :user_id
        ORDER BY 
            COALESCE(pt.name, t.name),
            t.name,
            s.year DESC,
            s.name
    ");

    $collectionStmt->execute(['user_id' => $userId]);
    $sets = $collectionStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get collection statistics
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT c.set_num) as unique_sets,
            SUM(c.collection_set_quantity) as total_sets,
            SUM(s.num_parts * c.collection_set_quantity) as total_parts,
            COUNT(DISTINCT s.theme_id) as unique_themes
        FROM collection c
        JOIN sets s ON c.set_num = s.set_num
        WHERE c.user_id = :user_id
    ");

    $statsStmt->execute(['user_id' => $userId]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // Get theme distribution
    $themeStatsStmt = $pdo->prepare("
        SELECT 
            t.id as theme_id,
            t.name as theme_name,
            COUNT(*) as set_count,
            SUM(c.collection_set_quantity) as total_sets
        FROM collection c
        JOIN sets s ON c.set_num = s.set_num
        JOIN themes t ON s.theme_id = t.id
        WHERE c.user_id = :user_id
        GROUP BY t.id, t.name
        ORDER BY total_sets DESC
        LIMIT 5
    ");

    $themeStatsStmt->execute(['user_id' => $userId]);
    $themeStats = $themeStatsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get recent additions
    $recentStmt = $pdo->prepare("
        SELECT 
            s.set_num,
            s.name,
            s.year,
            t.name as theme_name,
            c.collection_set_quantity as quantity
        FROM collection c
        JOIN sets s ON c.set_num = s.set_num
        JOIN themes t ON s.theme_id = t.id
        WHERE c.user_id = :user_id
        ORDER BY c.id DESC
        LIMIT 5
    ");

    $recentStmt->execute(['user_id' => $userId]);
    $recentSets = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // Prepare the complete response
    $response = [
        'profile' => $profile,
        'sets' => $sets,
        'stats' => [
            'collection' => $stats,
            'themes' => $themeStats,
            'recent' => $recentSets
        ]
    ];

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    
    echo json_encode($response);

} catch (PDOException $e) {
    error_log('Database error in get_user_collection.php: ' . $e->getMessage());
    echo json_encode([
        'error' => 'An error occurred while fetching the collection.',
    ]);
}
?>