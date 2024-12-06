<?php
require 'dbh.php';
require 'cors_headers.php';

// Log the incoming request
error_log('Received request for get_parent_themes.php');

// List of theme IDs to prioritize
$priorityThemes = [721, 52, 246, 1, 158];

// Convert the list of IDs to a comma-separated string
$priorityThemesStr = implode(',', $priorityThemes);

try {
    $stmt = $pdo->query("
        SELECT * 
        FROM themes 
        WHERE parent_id = 0 
        ORDER BY 
            FIELD(id, $priorityThemesStr) DESC,
            name ASC
    ");
    $parentThemes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($parentThemes);
} catch (PDOException $e) {
    error_log('Database query error: ' . $e->getMessage());
    echo json_encode(['error' => 'Database query error']);
}
