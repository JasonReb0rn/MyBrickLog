<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$response = ['migration_needed' => false, 'sets_needing_migration' => 0];

// Only allow logged in users to check their own migration status
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'User not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // Check how many sets in the user's collection have minifigure inventory data
    // but no collection_minifigs records
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT c.set_num) as sets_needing_migration
        FROM collection c
        WHERE c.user_id = ?
        AND EXISTS (
            -- Set has minifigure inventory data
            SELECT 1 
            FROM inventories i
            JOIN inventory_minifigs im ON i.id = im.inventory_id
            WHERE i.set_num = c.set_num
        )
        AND NOT EXISTS (
            -- But has no collection_minifigs records for this user
            SELECT 1 
            FROM collection_minifigs cm
            WHERE cm.user_id = c.user_id 
            AND cm.set_num = c.set_num
        )
    ");
    
    $stmt->execute([$userId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $setsNeedingMigration = $result['sets_needing_migration'] ?? 0;
    
    // Consider migration needed if 5 or more sets need it
    $response['migration_needed'] = $setsNeedingMigration >= 5;
    $response['sets_needing_migration'] = $setsNeedingMigration;
    
} catch (PDOException $e) {
    error_log('Error checking migration status: ' . $e->getMessage());
    $response['error'] = 'Error checking migration status';
}

echo json_encode($response);
?> 