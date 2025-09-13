<?php
require 'dbh.php';
require 'cors_headers.php';

$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if ($userId === null) {
    echo json_encode(['error' => 'Invalid user ID provided.']);
    exit;
}

try {
    // Get user's trophies with trophy details
    $stmt = $pdo->prepare("
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
    
    $stmt->execute(['user_id' => $userId]);
    $trophies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $response = [
        'trophies' => $trophies,
        'total_count' => count($trophies)
    ];

    header('Cache-Control: max-age=300, public');
    header('ETag: "' . md5(json_encode($response)) . '"');

    echo json_encode($response);

} catch (PDOException $e) {
    error_log('Database error in get_user_trophies.php: ' . $e->getMessage());
    echo json_encode([
        'error' => 'An error occurred while fetching trophies.',
    ]);
}
?>
