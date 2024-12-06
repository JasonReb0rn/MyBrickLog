<?php
require 'dbh.php';
require 'cors_headers.php';
require 'create_log.php';

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

$response = ['success' => false];

if (!empty($username) && !empty($password)) {

    // Log the user login action
    $log_action = "User attempted login with username: '$username' and password: '$password'";
    $log_useragent = $_SERVER['HTTP_USER_AGENT'];
    insertLog($pdo, null, $log_action, $log_useragent);

    try {
        $stmt = $pdo->prepare("SELECT user_id, password_hash, email, verification_token, verified FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            if ($user['verified'] == 0) {
                // User is not verified
                $response['unverified'] = true;
                $response['email'] = $user['email'];
                $response['verification_token'] = $user['verification_token'];
            } else {
                // Set session cookie parameters before starting the session
                session_set_cookie_params([
                    'lifetime' => 0,
                    'path' => '/',
                    'domain' => '.mybricklog.com',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Strict',
                ]);
                session_start();
                $_SESSION['user_id'] = $user['user_id'];
                $response['success'] = true;
                $response['user_id'] = $user['user_id'];
                $response['username'] = $username;

                // Log the user login action
                $log_action = "User login success with username: '$username'";
                $log_useragent = $_SERVER['HTTP_USER_AGENT'];
                insertLog($pdo, $user['user_id'], $log_action, $log_useragent);
            }
        } else {
            $response['error'] = 'Invalid username or password';
        }
    } catch (PDOException $e) {
        $response['error'] = 'Error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>
