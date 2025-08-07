<?php
// Simple database connection test
echo "=== Database Connection Test ===\n";

// Print all environment variables
echo "Environment Variables:\n";
foreach ($_ENV as $key => $value) {
    if (strpos($key, 'MBL_SQL') !== false || strpos($key, 'MYSQL') !== false) {
        echo "$key = $value\n";
    }
}
echo "\n";

// Test different host variations
$hosts_to_try = [
    'mybricklog-db',
    'mysql',
    'database',
    'mybricklog-db-production',
    'localhost',
    '127.0.0.1'
];

$user = $_ENV['MBL_SQL_USER'] ?? 'root';
$pass = $_ENV['MBL_SQL_PASS'] ?? '';
$db = $_ENV['MBL_SQL_DATABASE'] ?? 'mybricklogdb';
$port = $_ENV['MBL_SQL_PORT'] ?? '3306';

foreach ($hosts_to_try as $host) {
    echo "Testing host: $host\n";
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        echo "✅ SUCCESS: Connected to $host\n";
        
        // Test a simple query
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        echo "   Users table has {$result['count']} records\n";
        
        break; // Stop on first success
    } catch (PDOException $e) {
        echo "❌ FAILED: $host - " . $e->getMessage() . "\n";
    }
    echo "\n";
}

// Test basic network connectivity
echo "=== Network Tests ===\n";
foreach ($hosts_to_try as $host) {
    $result = @fsockopen($host, 3306, $errno, $errstr, 5);
    if ($result) {
        echo "✅ Port 3306 open on $host\n";
        fclose($result);
    } else {
        echo "❌ Port 3306 closed on $host ($errno: $errstr)\n";
    }
}
?> 