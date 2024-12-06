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

session_start();

$themeId = isset($_GET['theme_id']) ? $_GET['theme_id'] : null;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$pageSize = 100;
$offset = ($page - 1) * $pageSize;
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

try {
    if ($themeId) {
        $baseQuery = '
            SELECT * 
            FROM sets 
            WHERE theme_id = :theme_id ';

        if ($userId !== null) {
            $baseQuery .= '
                AND set_num NOT IN (
                    SELECT set_num 
                    FROM collection 
                    WHERE user_id = :user_id
                )';
        }

        // Get total count
        $countQuery = str_replace('SELECT *', 'SELECT COUNT(*) as total', $baseQuery);
        $stmt = $pdo->prepare($countQuery);
        $stmt->bindValue(':theme_id', $themeId, PDO::PARAM_INT);
        if ($userId !== null) {
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        }
        $stmt->execute();
        $totalCount = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get paginated results
        $query = $baseQuery . ' ORDER BY year DESC LIMIT :page_size OFFSET :offset';
        $stmt = $pdo->prepare($query);
        $stmt->bindValue(':theme_id', $themeId, PDO::PARAM_INT);
        if ($userId !== null) {
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        }
        $stmt->bindValue(':page_size', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'sets' => $sets,
            'total' => $totalCount,
            'hasMore' => ($offset + $pageSize) < $totalCount
        ]);
    }
} catch (PDOException $e) {
    error_log('Error executing SQL query: ' . $e->getMessage());
    echo json_encode(['error' => 'An error occurred while fetching sets.']);
}
?>