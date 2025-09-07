<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

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

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

$response = ['success' => false];

if (!empty($username) && !empty($password)) {
    // Log the login attempt
    $log_action = "Login attempt for username: '$username'";
    $log_useragent = $_SERVER['HTTP_USER_AGENT'];
    insertLog($pdo, null, $log_action, $log_useragent, null, 'AUTHENTICATION');

    try {
        $stmt = $pdo->prepare("SELECT user_id, password_hash, email, verification_token, verified, is_admin FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            if ($user['verified'] == 0) {
                // User is not verified
                $response['unverified'] = true;
                $response['email'] = $user['email'];
                $response['verification_token'] = $user['verification_token'];
            } else {
                session_start();
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['is_admin'] = $user['is_admin'];
                $response['success'] = true;
                $response['user_id'] = $user['user_id'];
                $response['username'] = $username;
                $response['is_admin'] = $user['is_admin'];

                // Log successful login
                $log_action = "Login successful for username: '$username'";
                $log_useragent = $_SERVER['HTTP_USER_AGENT'];
                $log_result = insertLog($pdo, $user['user_id'], $log_action, $log_useragent, null, 'AUTHENTICATION');
                
                if ($is_dev) {
                    error_log('Successful login log result: ' . ($log_result ? 'SUCCESS' : 'FAILED'));
                }

                if ($is_dev) {
                    error_log('Login successful - Session ID: ' . session_id());
                    error_log('Session user_id set to: ' . $_SESSION['user_id']);
                }
            }
        } else {
            // Log failed login attempt
            $log_action = "Invalid login attempt for username: '$username'";
            $log_useragent = $_SERVER['HTTP_USER_AGENT'];
            insertLog($pdo, null, $log_action, $log_useragent, null, 'SECURITY');
            
            $response['error'] = 'Invalid username or password';
        }
    } catch (PDOException $e) {
        $response['error'] = 'Error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>