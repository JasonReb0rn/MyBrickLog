<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    // Get the latest snapshot date
    $stmt = $pdo->query("SELECT MAX(snapshot_date) as latest_date FROM popular_themes");
    $latestDate = $stmt->fetch(PDO::FETCH_ASSOC)['latest_date'];

    // Get popular themes with a representative set image
    $query = "
        WITH ThemeSetImages AS (
            SELECT 
                s.theme_id,
                s.img_url,
                s.year,
                ROW_NUMBER() OVER (PARTITION BY s.theme_id ORDER BY s.year DESC) as rn
            FROM sets s
            WHERE s.img_url IS NOT NULL
        )
        SELECT 
            t.id,
            t.name,
            pt.collection_count,
            tsi.img_url as theme_image_url
        FROM popular_themes pt
        JOIN themes t ON t.id = pt.theme_id
        LEFT JOIN ThemeSetImages tsi ON tsi.theme_id = t.id AND tsi.rn = 1
        WHERE pt.snapshot_date = :latest_date
        ORDER BY pt.collection_count DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute(['latest_date' => $latestDate]);
    $popularThemes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($popularThemes);
} catch (PDOException $e) {
    error_log('Database query error: ' . $e->getMessage());
    echo json_encode(['error' => 'Database query error']);
}
?>