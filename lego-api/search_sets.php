<?php
include 'dbh.php';
include 'cors_headers.php';

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$response = [];

if ($query !== '') {
    try {
        $stmt = $pdo->prepare('SELECT * FROM sets WHERE name LIKE :query OR set_num LIKE :query');
        $stmt->execute(['query' => '%' . $query . '%']);
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log('Error executing SQL query: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>
