<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    // Get the latest snapshot date and theme IDs
    $query = "
        SELECT pt.theme_id
        FROM popular_themes pt
        WHERE pt.snapshot_date = (
            SELECT MAX(snapshot_date) 
            FROM popular_themes
        )
        ORDER BY pt.collection_count DESC
    ";
    
    $stmt = $pdo->query($query);
    $themeIds = array_map(function($row) {
        return (int)$row['theme_id'];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode($themeIds);
} catch (PDOException $e) {
    error_log('Database query error: ' . $e->getMessage());
    echo json_encode(['error' => 'Database query error']);
}
?>