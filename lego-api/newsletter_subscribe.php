<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

$response = ['success' => false, 'message' => ''];

// Validate email
if (empty($email)) {
    $response['message'] = 'Email address is required.';
    echo json_encode($response);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Please enter a valid email address.';
    echo json_encode($response);
    exit;
}

// Check email length
if (strlen($email) > 255) {
    $response['message'] = 'Email address is too long.';
    echo json_encode($response);
    exit;
}

try {
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id, status FROM newsletter_subscriptions WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        if ($existing['status'] === 'active') {
            $response['message'] = 'You are already subscribed to our newsletter!';
        } else {
            // Reactivate subscription
            $updateStmt = $pdo->prepare("UPDATE newsletter_subscriptions SET status = 'active', subscribed_at = CURRENT_TIMESTAMP WHERE email = ?");
            $updateStmt->execute([$email]);
            
            $response['success'] = true;
            $response['message'] = 'Welcome back! Your newsletter subscription has been reactivated.';
            
            // Log reactivation
            insertLog($pdo, null, "Newsletter subscription reactivated: $email", $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SYSTEM');
        }
    } else {
        // Create new subscription
        $unsubscribeToken = bin2hex(random_bytes(32));
        $confirmationToken = bin2hex(random_bytes(32));
        
        $insertStmt = $pdo->prepare("
            INSERT INTO newsletter_subscriptions (email, ip_address, user_agent, unsubscribe_token, confirmation_token) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $insertStmt->execute([
            $email,
            getRealClientIP(),
            substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255),
            $unsubscribeToken,
            $confirmationToken
        ]);
        
        $response['success'] = true;
        $response['message'] = 'Thank you for subscribing! You\'ll receive updates about new LEGO® sets and features.';
        
        // Log successful subscription
        insertLog($pdo, null, "Newsletter subscription: $email", $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SYSTEM');
        
        // TODO: In the future, you could send a confirmation email here
        // For now, we'll just mark as confirmed automatically
        $confirmStmt = $pdo->prepare("UPDATE newsletter_subscriptions SET confirmed = 1 WHERE email = ?");
        $confirmStmt->execute([$email]);
    }
    
} catch (PDOException $e) {
    error_log("Newsletter subscription error: " . $e->getMessage());
    $response['message'] = 'An error occurred while processing your subscription. Please try again later.';
    
    // Log the error
    insertLog($pdo, null, "Newsletter subscription failed for $email: " . $e->getMessage(), $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', null, 'SYSTEM');
}

echo json_encode($response);
?>
