<?php
// Test script to debug trophy endpoint
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

// Simulate admin session for testing
$_SESSION['user_id'] = 1; // Assuming user ID 1 is admin

require 'lego-api/dbh.php';

try {
    echo "Testing database connection...\n";
    
    // Test basic connection
    $testStmt = $pdo->query("SELECT 1");
    echo "Database connection: OK\n";
    
    // Check if trophies table exists
    $tableStmt = $pdo->query("SHOW TABLES LIKE 'trophies'");
    if ($tableStmt->rowCount() > 0) {
        echo "Trophies table: EXISTS\n";
    } else {
        echo "Trophies table: NOT FOUND\n";
        exit;
    }
    
    // Check table structure
    $structureStmt = $pdo->query("DESCRIBE trophies");
    echo "Trophies table structure:\n";
    while ($row = $structureStmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['Field']} ({$row['Type']})\n";
    }
    
    // Count trophies
    $countStmt = $pdo->query("SELECT COUNT(*) as total FROM trophies");
    $count = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    echo "Total trophies in database: $count\n";
    
    // Count active trophies
    $activeCountStmt = $pdo->query("SELECT COUNT(*) as total FROM trophies WHERE is_active = 1");
    $activeCount = $activeCountStmt->fetch(PDO::FETCH_ASSOC)['total'];
    echo "Active trophies in database: $activeCount\n";
    
    // Test the actual query from admin_get_trophies.php
    $sql = "
        SELECT 
            t.id,
            t.name,
            t.description,
            t.image_path,
            t.rarity,
            t.is_active,
            t.created_at,
            t.updated_at,
            (SELECT COUNT(*) FROM user_trophies WHERE trophy_id = t.id) as user_count
        FROM trophies t
        WHERE t.is_active = 1
        ORDER BY 
            CASE t.rarity 
                WHEN 'mythical' THEN 1
                WHEN 'rare' THEN 2
                WHEN 'common' THEN 3
            END,
            t.name ASC
        LIMIT 10 OFFSET 0
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $trophies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Query executed successfully. Found " . count($trophies) . " trophies:\n";
    foreach ($trophies as $trophy) {
        echo "  - ID: {$trophy['id']}, Name: {$trophy['name']}, Rarity: {$trophy['rarity']}\n";
    }
    
    echo "\nTest completed successfully!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
