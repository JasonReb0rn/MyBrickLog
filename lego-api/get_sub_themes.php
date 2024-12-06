<?php
require 'dbh.php';
require 'cors_headers.php';

$parentId = $_GET['parent_id'] ?? null;

if ($parentId !== null) {
    $stmt = $pdo->prepare('
        SELECT subThemes.*, parentThemes.name as parent_theme_name
        FROM themes subThemes
        JOIN themes parentThemes ON subThemes.parent_id = parentThemes.id
        WHERE subThemes.parent_id = :parent_id
    ');
    $stmt->execute(['parent_id' => $parentId]);
    $subThemes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($subThemes);
} else {
    echo json_encode([]);
}
?>

