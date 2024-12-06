<?php
ini_set('session.cookie_domain', '.mybricklog.com');
ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', 'On');

session_set_cookie_params([
    'lifetime' => 0, // Session cookie
    'path' => '/',
    'domain' => '.mybricklog.com',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None', // None for cross-site
]);

session_start();
if (isset($_SESSION['test'])) {
    echo 'Session variable test: ' . $_SESSION['test'];
} else {
    echo 'Session variable not set.';
}

if (isset($_SESSION['user_id'])) {
    echo 'Session variable user_id: ' . $_SESSION['user_id'];
} else {
    echo 'Session variable not set.';
}