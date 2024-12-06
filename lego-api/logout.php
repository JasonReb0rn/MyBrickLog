<?php

require 'dbh.php';
require 'cors_headers.php';

session_start();
session_unset();
session_destroy();

echo json_encode(['success' => true]);
?>
