<?php
/**
 * Logging functionality for user actions
 */

/**
 * Get the real client IP address, accounting for Cloudflare proxy
 */
function getRealClientIP() {
    // Cloudflare headers (in order of preference)
    $headers = [
        'CF-Connecting-IP',     // Cloudflare's header for the original client IP
        'HTTP_CF_CONNECTING_IP', // Alternative Cloudflare header format
        'HTTP_X_FORWARDED_FOR', // Standard forwarded header (may contain multiple IPs)
        'HTTP_X_REAL_IP',       // Alternative real IP header
        'HTTP_CLIENT_IP',       // Client IP header
        'REMOTE_ADDR'           // Fallback to direct connection IP
    ];
    
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];
            
            // For X-Forwarded-For, take the first IP (original client)
            if ($header === 'HTTP_X_FORWARDED_FOR') {
                $ips = explode(',', $ip);
                $ip = trim($ips[0]);
            }
            
            // Validate IP address
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            } elseif (filter_var($ip, FILTER_VALIDATE_IP)) {
                // Accept private/reserved IPs if no public IP is found
                return $ip;
            }
        }
    }
    
    // Fallback to REMOTE_ADDR if nothing else works
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function insertLog($pdo, $user_id, $action, $useragent, $ip = null, $log_type = 'SYSTEM') {
    try {
        // Truncate user agent to fit database column (45 characters)
        $truncated_useragent = substr($useragent, 0, 45);
        
        // Get IP if not provided
        if ($ip === null) {
            $ip = getRealClientIP();
        }
        
        // Truncate IP to fit database column (45 characters - should be plenty for IPv6)
        $truncated_ip = substr($ip, 0, 45);
        
        // Validate log_type against allowed enum values
        $allowed_types = ['AUTHENTICATION', 'ADMIN', 'USER_MANAGEMENT', 'COLLECTION', 'SYSTEM', 'SECURITY'];
        if (!in_array($log_type, $allowed_types)) {
            $log_type = 'SYSTEM'; // Default fallback
        }
        
        // Always use a separate transaction for logging to avoid conflicts
        $inTransaction = $pdo->inTransaction();
        $startedTransaction = false;
        
        if (!$inTransaction) {
            $pdo->beginTransaction();
            $startedTransaction = true;
        }
        
        $stmt = $pdo->prepare("INSERT INTO log (log_user, log_action, log_type, log_useragent, log_ip) VALUES (?, ?, ?, ?, ?)");
        $result = $stmt->execute([$user_id, $action, $log_type, $truncated_useragent, $truncated_ip]);
        
        // Only commit if we started the transaction
        if ($startedTransaction) {
            if ($result) {
                $pdo->commit();
                error_log("Log successfully inserted and committed: " . $action);
            } else {
                $pdo->rollBack();
                error_log("Log insert failed, transaction rolled back: " . $action);
            }
        } else {
            error_log("Log inserted within existing transaction: " . $action . " (result: " . ($result ? 'success' : 'failed') . ")");
        }
        
        return $result;
    } catch (PDOException $e) {
        error_log("Failed to insert log: " . $e->getMessage());
        error_log("Log details - User ID: " . ($user_id ?? 'NULL') . ", Action: " . $action . ", Type: " . $log_type . ", User Agent: " . $truncated_useragent . ", IP: " . ($truncated_ip ?? 'unknown'));
        
        // Rollback if we started the transaction and we're still in one
        if ($startedTransaction && $pdo->inTransaction()) {
            try {
                $pdo->rollBack();
                error_log("Rolled back failed log transaction");
            } catch (PDOException $rollbackError) {
                error_log("Failed to rollback log transaction: " . $rollbackError->getMessage());
            }
        }
        
        return false;
    }
}
?>