<?php
/**
 * Logging functionality for user actions
 */

function insertLog($pdo, $user_id, $action, $useragent) {
    try {
        // Truncate user agent to fit database column (45 characters)
        $truncated_useragent = substr($useragent, 0, 45);
        
        $stmt = $pdo->prepare("INSERT INTO log (log_user, log_action, log_useragent) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $action, $truncated_useragent]);
        return true;
    } catch (PDOException $e) {
        error_log("Failed to insert log: " . $e->getMessage());
        return false;
    }
}
?>