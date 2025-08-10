<?php
require 'dbh.php';
require 'cors_headers.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get set numbers from query parameter (comma-separated)
$setNums = isset($_GET['set_nums']) ? $_GET['set_nums'] : '';

if (empty($setNums)) {
    echo json_encode(['error' => 'No set numbers provided']);
    exit;
}

// Split and clean the set numbers
$setNumsArray = array_map('trim', explode(',', $setNums));
$setNumsArray = array_filter($setNumsArray); // Remove empty values

if (empty($setNumsArray)) {
    echo json_encode(['error' => 'No valid set numbers provided']);
    exit;
}

try {
    // Create placeholders for the IN clause
    $placeholders = str_repeat('?,', count($setNumsArray) - 1) . '?';
    
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
        WHERE s.set_num IN ($placeholders)
        ORDER BY s.year DESC, s.name
    ");
    
    $stmt->execute($setNumsArray);
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
            'year' => intval($row['year']),
            'theme_id' => intval($row['theme_id']),
            'theme_name' => $row['theme_name'],
            'num_parts' => intval($row['num_parts']),
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
    
    echo json_encode([
        'success' => true,
        'sets' => $formattedResults,
        'total_count' => count($formattedResults)
    ]);
    
} catch (PDOException $e) {
    error_log('Database error in get_price_data.php: ' . $e->getMessage());
    echo json_encode([
        'error' => 'An error occurred while fetching price data.',
        'details' => $e->getMessage()
    ]);
}
?>