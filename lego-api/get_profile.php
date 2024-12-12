<?php
// get_profile.php
require 'dbh.php';
require 'cors_headers.php';

$user_id = $_GET['user_id'] ?? null;
$response = ['success' => false];

if ($user_id) {
    try {
        $stmt = $pdo->prepare("
            SELECT u.username, u.display_name, u.bio, u.location, 
                   u.favorite_theme, u.profile_picture, u.join_date,
                   u.twitter_handle, u.youtube_channel, u.show_email,
                   (SELECT COUNT(*) FROM collection WHERE user_id = u.user_id) as total_sets
            FROM users u
            WHERE u.user_id = ?
        ");
    
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($profile) {
            $response = [
                'success' => true,
                'profile' => [
                    'username' => $profile['username'],
                    'displayName' => $profile['display_name'],
                    'bio' => $profile['bio'],
                    'location' => $profile['location'],
                    'favoriteTheme' => $profile['favorite_theme'],
                    'profilePicture' => $profile['profile_picture'],
                    'joinDate' => $profile['join_date'],
                    'totalSets' => $profile['total_sets'],
                    'twitterHandle' => $profile['twitter_handle'],
                    'youtubeChannel' => $profile['youtube_channel'],
                    'showEmail' => (bool)$profile['show_email']
                ]
            ];
        } else {
            $response['error'] = 'Profile not found';
        }
    } catch (PDOException $e) {
        $response['error'] = 'Database error';
        error_log('Database error: ' . $e->getMessage());
    }
} else {
    $response['error'] = 'User ID is required';
}

echo json_encode($response);
?>