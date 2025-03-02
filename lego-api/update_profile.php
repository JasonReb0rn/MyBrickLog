<?php
require 'dbh.php';
require 'cors_headers.php';

// Enable error logging
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_log("Update profile endpoint hit");

// Determine environment and set appropriate session parameters
$is_dev = strpos($_SERVER['HTTP_HOST'], 'localhost') !== false;

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $is_dev ? null : '.mybricklog.com',  // null for localhost
    'secure' => !$is_dev,  // false for localhost, true for production
    'httponly' => true,
    'samesite' => 'Strict'
]);

session_start();

$response = ['success' => false];
$raw_data = file_get_contents('php://input');
error_log("Raw input data: " . $raw_data);

$data = json_decode($raw_data, true);
error_log("Decoded data: " . print_r($data, true));

// Debug session
error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'not set'));
error_log("Request user_id: " . ($data['user_id'] ?? 'not set'));

// Verify user is logged in and matches the user_id
if (!isset($_SESSION['user_id']) || !isset($data['user_id']) || 
    $_SESSION['user_id'] != $data['user_id']) {
    error_log("Authorization failed");
    $response['error'] = 'Unauthorized';
    echo json_encode($response);
    exit;
}

if ($data) {
    try {
        $pdo->beginTransaction();
        
        // Validate input
        $display_name = trim($data['displayName'] ?? '');
        $bio = trim($data['bio'] ?? '');
        $location = trim($data['location'] ?? '');
        $favorite_theme = $data['favoriteTheme'] ?? null;
        $twitter_handle = trim($data['twitterHandle'] ?? '');
        $youtube_channel = trim($data['youtubeChannel'] ?? '');
        $bricklink_store = trim($data['bricklinkStore'] ?? '');
        
        // Convert and log show_email value at each stage
        $show_email_raw = $data['showEmail'] ?? false;
        $show_email = filter_var($show_email_raw, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        
        error_log("Show email processing:");
        error_log("Raw value: " . var_export($show_email_raw, true));
        error_log("Converted value: " . var_export($show_email, true));
        
        // Validation checks
        if (strlen($bio) > 1000) {
            $response['error'] = 'Bio must be less than 1000 characters';
            echo json_encode($response);
            exit;
        }
        
        if (strlen($display_name) > 100) {
            $response['error'] = 'Display name must be less than 100 characters';
            echo json_encode($response);
            exit;
        }
        
        if (strlen($location) > 100) {
            $response['error'] = 'Location must be less than 100 characters';
            echo json_encode($response);
            exit;
        }

        // Validate Twitter handle
        if (strlen($twitter_handle) > 50) {
            $response['error'] = 'Twitter handle must be less than 50 characters';
            echo json_encode($response);
            exit;
        }
        
        // Remove @ symbol if present at start of Twitter handle
        if (strlen($twitter_handle) > 0 && $twitter_handle[0] === '@') {
            $twitter_handle = substr($twitter_handle, 1);
        }

        // Validate YouTube channel
        if (strlen($youtube_channel) > 100) {
            $response['error'] = 'YouTube channel must be less than 100 characters';
            echo json_encode($response);
            exit;
        }

        // Validate Bricklink store
        if (strlen($bricklink_store) > 100) {
            $response['error'] = 'Bricklink store must be less than 100 characters';
            echo json_encode($response);
            exit;
        }

        // Validate Bricklink store format
        if ($bricklink_store && !preg_match('/^[a-zA-Z0-9-_]+$/', $bricklink_store)) {
            $response['error'] = 'Bricklink store can only contain letters, numbers, hyphens, and underscores';
            echo json_encode($response);
            exit;
        }
        
        // Verify theme exists if provided
        if ($favorite_theme) {
            $themeStmt = $pdo->prepare("SELECT id FROM themes WHERE id = ?");
            $themeStmt->execute([$favorite_theme]);
            if (!$themeStmt->fetch()) {
                $response['error'] = 'Invalid theme selected';
                echo json_encode($response);
                exit;
            }
        }
        
        // Update profile with new fields
        $query = "
            UPDATE users 
            SET display_name = :display_name,
                bio = :bio,
                location = :location,
                favorite_theme = :favorite_theme,
                twitter_handle = :twitter_handle,
                youtube_channel = :youtube_channel,
                bricklink_store = :bricklink_store,
                show_email = :show_email,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id
        ";
        
        error_log("Query: " . $query);
        
        $stmt = $pdo->prepare($query);
        
        $stmt->bindValue(':display_name', $display_name ?: null);
        $stmt->bindValue(':bio', $bio ?: null);
        $stmt->bindValue(':location', $location ?: null);
        $stmt->bindValue(':favorite_theme', $favorite_theme ?: null);
        $stmt->bindValue(':twitter_handle', $twitter_handle ?: null);
        $stmt->bindValue(':youtube_channel', $youtube_channel ?: null);
        $stmt->bindValue(':bricklink_store', $bricklink_store ?: null);
        $stmt->bindValue(':show_email', $show_email, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $data['user_id'], PDO::PARAM_INT);
        
        error_log("Bound parameters:");
        error_log("display_name: " . var_export($display_name ?: null, true));
        error_log("bio: " . var_export($bio ?: null, true));
        error_log("location: " . var_export($location ?: null, true));
        error_log("favorite_theme: " . var_export($favorite_theme ?: null, true));
        error_log("twitter_handle: " . var_export($twitter_handle ?: null, true));
        error_log("youtube_channel: " . var_export($youtube_channel ?: null, true));
        error_log("bricklink_store: " . var_export($bricklink_store ?: null, true));
        error_log("show_email: " . var_export($show_email, true));
        error_log("user_id: " . var_export($data['user_id'], true));
        
        $result = $stmt->execute();
        
        // Log the result
        error_log("Execute result: " . var_export($result, true));
        error_log("Rows affected: " . $stmt->rowCount());
        
        // Verify the updated values
        $verifyStmt = $pdo->prepare("SELECT * FROM users WHERE user_id = ?");
        $verifyStmt->execute([$data['user_id']]);
        $currentValues = $verifyStmt->fetch(PDO::FETCH_ASSOC);
        error_log("Values in database after update: " . print_r($currentValues, true));
        
        // Log the profile update
        if ($result) {
            try {
                $logStmt = $pdo->prepare("
                    INSERT INTO log 
                    (log_user, log_action, log_useragent) 
                    VALUES 
                    (?, 'Profile updated', ?)
                ");
                
                $logStmt->execute([
                    $data['user_id'],
                    $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
                ]);
            } catch (PDOException $logError) {
                // Just log the error but don't fail the whole operation
                error_log("Error logging profile update: " . $logError->getMessage());
            }
            
            $pdo->commit();
            $response['success'] = true;
            $response['debug'] = [
                'show_email_original' => $show_email_raw,
                'show_email_converted' => $show_email,
                'show_email_final' => $currentValues['show_email'],
                'rows_affected' => $stmt->rowCount()
            ];
        } else {
            $pdo->rollBack();
            error_log("PDO Error Info: " . print_r($stmt->errorInfo(), true));
            $response['error'] = 'Update failed';
        }
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("PDO Exception: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        $response['error'] = 'Database error: ' . $e->getMessage();
    }
} else {
    error_log("No valid data received");
    $response['error'] = 'Invalid data';
}

error_log("Final response: " . json_encode($response));
echo json_encode($response);
?>