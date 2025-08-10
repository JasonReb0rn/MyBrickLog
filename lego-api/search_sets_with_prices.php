<?php
require 'dbh.php';
require 'cors_headers.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Get the search query
$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$response = [];

// Log the query for debugging
error_log('Price tool search query: ' . $query);

if ($query !== '') {
    try {
        // More specific query with price data
        $searchPattern = '%' . $query . '%';
        
        // Search with price information included
        $stmt = $pdo->prepare("
            SELECT 
                s.set_num,
                s.name,
                s.year,
                s.theme_id,
                s.num_parts,
                s.img_url,
                t.name as theme_name,
                sp.retail_price,
                sp.market_price,
                sp.market_price_difference,
                sp.sealed_value,
                sp.used_value,
                sp.used_value_range_low,
                sp.used_value_range_high,
                sp.last_updated as price_updated_at
            FROM sets s
            LEFT JOIN themes t ON s.theme_id = t.id
            LEFT JOIN set_prices sp ON s.set_num = sp.set_num
            WHERE s.name LIKE :query 
            OR s.set_num LIKE :exact_num 
            OR s.set_num LIKE :partial_num
            ORDER BY 
                CASE 
                    WHEN s.set_num = :exact_query THEN 1
                    WHEN s.set_num LIKE :starts_with THEN 2
                    WHEN s.name LIKE :starts_with_name THEN 3
                    ELSE 4
                END,
                s.year DESC,
                s.name
            LIMIT 50
        ");
        
        $stmt->execute([
            'query' => $searchPattern,
            'exact_num' => $query,
            'partial_num' => $searchPattern,
            'exact_query' => $query,
            'starts_with' => $query . '%',
            'starts_with_name' => $query . '%'
        ]);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results
        $formattedResults = array_map(function($row) {
            $hasPriceData = !is_null($row['retail_price']) || 
                           !is_null($row['market_price']) ||
                           !is_null($row['sealed_value']) || 
                           !is_null($row['used_value']);
            
            return [
                'set_num' => $row['set_num'],
                'name' => $row['name'],
                'year' => $row['year'],
                'theme_id' => $row['theme_id'],
                'theme_name' => $row['theme_name'],
                'num_parts' => $row['num_parts'],
                'img_url' => $row['img_url'],
                'prices' => [
                    'retail_price' => $row['retail_price'] ? floatval($row['retail_price']) : null,
                    'market_price' => $row['market_price'] ? floatval($row['market_price']) : null,
                    'market_price_difference' => $row['market_price_difference'] ? floatval($row['market_price_difference']) : null,
                    'sealed_value' => $row['sealed_value'] ? floatval($row['sealed_value']) : null,
                    'used_value' => $row['used_value'] ? floatval($row['used_value']) : null,
                    'used_value_range_low' => $row['used_value_range_low'] ? floatval($row['used_value_range_low']) : null,
                    'used_value_range_high' => $row['used_value_range_high'] ? floatval($row['used_value_range_high']) : null,
                    'has_price_data' => $hasPriceData,
                    'updated_at' => $row['price_updated_at']
                ]
            ];
        }, $results);
        
        $response = $formattedResults;
        
        // Log the count of results for debugging
        error_log('Price tool search results count: ' . count($results));
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