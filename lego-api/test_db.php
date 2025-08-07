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

// Get actual connection details from environment
$user = $_ENV['MBL_SQL_USER'] ?? 'root';
$pass = $_ENV['MBL_SQL_PASS'] ?? '';
$db = $_ENV['MBL_SQL_DATABASE'] ?? 'mybricklogdb';
$port = $_ENV['MBL_SQL_PORT'] ?? '3306';
$host = $_ENV['MBL_SQL_HOST'] ?? 'localhost';

echo "=== Testing ACTUAL Environment Configuration ===\n";
echo "Host: $host\n";
echo "Port: $port\n";
echo "Database: $db\n";
echo "User: $user\n";
echo "Password length: " . strlen($pass) . "\n\n";

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
echo "DSN: $dsn\n\n";

try {
    echo "Attempting connection with actual env vars...\n";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10
    ]);
    echo "✅ SUCCESS: Connected to database!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "   Database contains " . count($tables) . " tables\n";
    echo "   Tables: " . implode(', ', $tables) . "\n";
    
    // Try to count users if table exists
    if (in_array('users', $tables)) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        echo "   Users table has {$result['count']} records\n";
    }
    
} catch (PDOException $e) {
    echo "❌ CONNECTION FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";
}

// Test basic network connectivity to the actual host
echo "\n=== Network Test to Actual Host ===\n";
echo "Testing connection to $host:$port\n";
$result = @fsockopen($host, $port, $errno, $errstr, 10);
if ($result) {
    echo "✅ Port $port is open on $host\n";
    fclose($result);
} else {
    echo "❌ Port $port is closed on $host\n";
    echo "Error: $errno - $errstr\n";
}

// Additional tests for external connection
if ($host !== 'localhost' && $host !== '127.0.0.1') {
    echo "\n=== Additional External Connection Tests ===\n";
    
    // Test if we can reach the host at all
    echo "Testing basic connectivity to $host...\n";
    $ping = exec("ping -c 1 -W 3 $host 2>/dev/null", $output, $return_var);
    if ($return_var == 0) {
        echo "✅ Host $host is reachable\n";
    } else {
        echo "❌ Host $host is not reachable\n";
    }
    
    // Test if port is open using different method
    echo "Testing port $port on $host using socket...\n";
    $socket = @socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
    if ($socket) {
        socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, array("sec" => 5, "usec" => 0));
        socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, array("sec" => 5, "usec" => 0));
        $result = @socket_connect($socket, $host, $port);
        if ($result) {
            echo "✅ Socket connection to $host:$port successful\n";
        } else {
            echo "❌ Socket connection to $host:$port failed\n";
        }
        socket_close($socket);
    }
}
?> 