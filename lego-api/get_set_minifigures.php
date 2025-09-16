<?php
require 'dbh.php';
require 'cors_headers.php';

session_start();

$setNum = isset($_GET['set_num']) ? trim($_GET['set_num']) : null;
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

if (!$setNum) {
    echo json_encode(['error' => 'Set number is required']);
    exit;
}

try {
    // Get the inventory for this set
    $inventoryStmt = $pdo->prepare("SELECT id FROM inventories WHERE set_num = ?");
    $inventoryStmt->execute([$setNum]);
    $inventory = $inventoryStmt->fetch(PDO::FETCH_ASSOC);
    
    $minifigs = [];
    
    if ($inventory) {
        // Build the main query for minifigures in this set
        $baseQuery = "
            SELECT 
                m.fig_num,
                m.name,
                m.num_parts,
                m.img_url,
                im.quantity as required_quantity
        ";
        
        // Add owned quantity if user is logged in
        if ($userId) {
            $baseQuery .= ",
                COALESCE(cm.quantity_owned, 0) as owned_quantity
            ";
        }
        
        $baseQuery .= "
            FROM inventory_minifigs im
            JOIN minifigs m ON m.fig_num = im.fig_num
        ";
        
        // Add left join for collection minifigs if user is logged in
        if ($userId) {
            $baseQuery .= "
                LEFT JOIN collection_minifigs cm ON cm.fig_num = im.fig_num 
                    AND cm.set_num = ? 
                    AND cm.user_id = ?
            ";
        }
        
        $baseQuery .= "
            WHERE im.inventory_id = ?
            ORDER BY m.name
        ";
        
        $stmt = $pdo->prepare($baseQuery);
        
        if ($userId) {
            $stmt->execute([$setNum, $userId, $inventory['id']]);
        } else {
            $stmt->execute([$inventory['id']]);
        }
        
        $minifigs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // No inventory found - check if this set has any minifigures in the sets table
        $setInfoStmt = $pdo->prepare("
            SELECT s.name, s.year, s.img_url, s.num_parts, t.name as theme_name
            FROM sets s
            LEFT JOIN themes t ON t.id = s.theme_id
            WHERE s.set_num = ?
        ");
        $setInfoStmt->execute([$setNum]);
        $setExists = $setInfoStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$setExists) {
            echo json_encode(['error' => 'Set not found']);
            exit;
        }
        
        // Set exists but no inventory data - return empty minifigs array but not an error
        // This allows the frontend to show the minifigure section even if no data is available
        $minifigs = [];
    }
    
    // Get set information
    $setStmt = $pdo->prepare("
        SELECT s.name, s.year, s.img_url, t.name as theme_name
        FROM sets s
        LEFT JOIN themes t ON t.id = s.theme_id
        WHERE s.set_num = ?
    ");
    $setStmt->execute([$setNum]);
    $setInfo = $setStmt->fetch(PDO::FETCH_ASSOC);
    
    $response = [
        'set_num' => $setNum,
        'set_info' => $setInfo,
        'minifigs' => $minifigs,
        'total_minifigs' => count($minifigs),
        'user_logged_in' => $userId !== null,
        'has_inventory_data' => $inventory !== false
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    error_log('Database error in get_set_minifigures.php: ' . $e->getMessage());
    echo json_encode(['error' => 'An error occurred while fetching minifigure data']);
}
?> 