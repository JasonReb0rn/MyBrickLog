<?php
include 'dbh.php';
include 'cors_headers.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Get the search query
$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$response = [];

// Log the query for debugging
error_log('Search query: ' . $query);

if ($query !== '') {
    try {
        // More specific query with better search pattern
        $searchPattern = '%' . $query . '%';
        
        // Use a more comprehensive search approach
        $stmt = $pdo->prepare("
            SELECT sets.*, themes.name as theme_name 
            FROM sets 
            LEFT JOIN themes ON sets.theme_id = themes.id
            WHERE sets.name LIKE :query 
            OR sets.set_num LIKE :exact_num 
            OR sets.set_num LIKE :partial_num
            LIMIT 100
        ");
        
        $stmt->execute([
            'query' => $searchPattern,
            'exact_num' => $query,          // Exact match for set number
            'partial_num' => $searchPattern // Partial match for set number
        ]);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response = $results;
        
        // Log the count of results for debugging
        error_log('Search results count: ' . count($results));
    } catch (PDOException $e) {
        error_log('Error executing SQL query: ' . $e->getMessage());
        $response = [
            'error' => true,
            'message' => 'Database error occurred',
            'details' => $e->getMessage()
        ];
    }
} else {
    $response = [
        'error' => true,
        'message' => 'No search query provided'
    ];
}

// Set the content type header
header('Content-Type: application/json');

// Return the JSON response
echo json_encode($response);
?>