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
$_SESSION['test'] = 'This is a test session variable';
echo 'Session variable set.';
