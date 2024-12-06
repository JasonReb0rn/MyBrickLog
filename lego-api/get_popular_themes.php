<?php
require 'dbh.php';
require 'cors_headers.php';

// List of popular theme IDs
$themeIds = [721, 52, 246, 1, 158];
$themeIdsStr = implode(',', $themeIds);

try {
    $stmt = $pdo->query("
        SELECT id, name
        FROM themes
        WHERE id IN ($themeIdsStr)
    ");
    $popularThemes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($popularThemes);
} catch (PDOException $e) {
    error_log('Database query error: ' . $e->getMessage());
    echo json_encode(['error' => 'Database query error']);
}
?>
