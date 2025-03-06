<?php
require 'dbh.php';
require 'cors_headers.php';

try {
    // Begin transaction
    $pdo->beginTransaction();
    
    // Query 1: Count total number of sets
    $setsStmt = $pdo->query("SELECT COUNT(*) as total_sets FROM sets");
    $totalSets = $setsStmt->fetch(PDO::FETCH_ASSOC)['total_sets'];
    
    // Query 2: Count unique themes (both parent and sub-themes)
    $themesStmt = $pdo->query("SELECT COUNT(*) as total_themes FROM themes");
    $totalThemes = $themesStmt->fetch(PDO::FETCH_ASSOC)['total_themes'];
    
    // Query 3: Count sets with prices
    $pricedSetsStmt = $pdo->query("SELECT COUNT(*) as total_priced FROM set_prices WHERE retail_price IS NOT NULL");
    $totalPricedSets = $pricedSetsStmt->fetch(PDO::FETCH_ASSOC)['total_priced'];
    
    // Commit transaction
    $pdo->commit();
    
    // Create response array
    $response = [
        'total_sets' => (int)$totalSets,
        'total_themes' => (int)$totalThemes,
        'total_priced_sets' => (int)$totalPricedSets,
        'timestamp' => time()
    ];
    
    // Set ETag for cache validation
    header('ETag: "' . md5(json_encode($response)) . '"');
    
    // Return JSON response
    echo json_encode($response);
    
} catch (PDOException $e) {
    // Rollback transaction on error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log('Database error in get_site_statistics.php: ' . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'error' => 'An error occurred while fetching site statistics.',
        'timestamp' => time()
    ]);
}
?>