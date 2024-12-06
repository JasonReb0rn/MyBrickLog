// src/components/Profile.js
import React from 'react';
import { useAuth } from './AuthContext';

const Profile = () => {
    const { user } = useAuth();

    if (!user) {
        return <div>Please log in to view your profile.</div>;
    }

    return (
        <div>
            <h1>Profile</h1>
            <p>Username: {user.username}</p>
            <p>User ID: {user.user_id}</p>
        </div>
    );
};

export default Profile;
