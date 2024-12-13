<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

try {
    // Query that:
    // 1. Gets the latest snapshot date to ensure we're using current popularity data
    // 2. Joins with popular_themes to get collection counts
    // 3. Orders first by theme popularity (collection_count), then by set addition date
    $query = "
        WITH LatestSnapshot AS (
            SELECT MAX(snapshot_date) as latest_date
            FROM popular_themes
        )
        SELECT 
            s.*,
            t.name as theme_name,
            pt.collection_count as theme_popularity
        FROM recent_set_additions r
        JOIN sets s ON s.set_num = r.set_num
        JOIN themes t ON t.id = s.theme_id
        JOIN popular_themes pt 
            ON pt.theme_id = s.theme_id 
            AND pt.snapshot_date = (SELECT latest_date FROM LatestSnapshot)
        ORDER BY 
            pt.collection_count DESC,
            r.added_date DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Include theme_popularity in the response for potential frontend use
    if (empty($sets)) {
        echo json_encode([
            'sets' => [],
            'hasRecentSets' => false
        ]);
    } else {
        echo json_encode([
            'sets' => $sets,
            'hasRecentSets' => true
        ]);
    }
} catch (PDOException $e) {
    error_log('Error executing SQL query: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'An error occurred while fetching recent sets.',
        'hasRecentSets' => false
    ]);
}
?>