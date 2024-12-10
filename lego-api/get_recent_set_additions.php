<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

try {
    $query = "
        WITH LatestSnapshot AS (
            SELECT MAX(snapshot_date) as latest_date
            FROM popular_themes
        )
        SELECT s.*, t.name as theme_name
        FROM recent_set_additions r
        JOIN sets s ON s.set_num = r.set_num
        JOIN themes t ON t.id = s.theme_id
        JOIN popular_themes pt ON pt.theme_id = s.theme_id
        JOIN LatestSnapshot ls ON pt.snapshot_date = ls.latest_date
        ORDER BY r.added_date DESC
        LIMIT 10
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($sets)) {
        echo json_encode(['sets' => [], 'hasRecentSets' => false]);
    } else {
        echo json_encode(['sets' => $sets, 'hasRecentSets' => true]);
    }
} catch (PDOException $e) {
    error_log('Error executing SQL query: ' . $e->getMessage());
    echo json_encode(['error' => 'An error occurred while fetching recent sets.', 'hasRecentSets' => false]);
}
?>