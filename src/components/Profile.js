// src/components/Profile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faTimes, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        displayName: '',
        bio: '',
        location: '',
        favoriteTheme: '',
        profilePicture: null
    });
    const [themes, setThemes] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            fetchProfileData();
            fetchThemes();
        }
    }, [user]);

    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_profile.php?user_id=${user.user_id}`);
            if (response.data.success) {
                setProfileData(response.data.profile);
                if (response.data.profile.profilePicture) {
                    setPreviewImage(`https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${response.data.profile.profilePicture}`);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchThemes = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_parent_themes.php`);
            setThemes(response.data);
        } catch (error) {
            console.error('Error fetching themes:', error);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size must be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
            
            const formData = new FormData();
            formData.append('profile_picture', file);
            formData.append('user_id', user.user_id);
            
            uploadProfilePicture(formData);
        }
    };

    const uploadProfilePicture = async (formData) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/upload_profile_picture.php`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            
            if (response.data.success) {
                setSuccess('Profile picture updated successfully!');
                setProfileData(prev => ({
                    ...prev,
                    profilePicture: response.data.filename
                }));
            } else {
                setError('Failed to upload profile picture');
            }
        } catch (error) {
            setError('Error uploading profile picture');
            console.error('Error:', error);
        }
    };

    const handleProfileUpdate = async () => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/update_profile.php`, {
                user_id: user.user_id,
                ...profileData
            });

            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                setIsEditing(false);
            } else {
                setError('Failed to update profile');
            }
        } catch (error) {
            setError('Error updating profile');
            console.error('Error:', error);
        }
    };

    if (!user) {
        return <div className="login-prompt">Please log in to view your profile.</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-page-header">
                <h1>My Profile</h1>
                <button 
                    className="edit-button"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <FontAwesomeIcon icon={isEditing ? "times" : "edit"} />
                    {isEditing ? ' Cancel' : ' Edit Profile'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile-content">
                <div className="profile-picture-section">
                    <div className="profile-picture-container">
                        <img
                            src={
                                previewImage || 
                                (profileData.profilePicture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${profileData.profilePicture}` : '/images/lego_user.png')
                            }
                            alt="Profile"
                            className="profile-picture"
                            onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loops
                                e.target.src = '/images/lego_user.png';
                            }}
                        />
                        {isEditing && (
                            <label className="profile-picture-upload">
                                <FontAwesomeIcon 
                                    icon="camera" 
                                    size="lg"
                                    className="camera-icon" 
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                    aria-label="Upload profile picture"
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="profile-details">
                    <div className="profile-field">
                        <label>Username</label>
                        <div className="field-value">{user.username}</div>
                    </div>

                    <div className="profile-field">
                        <label>Display Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={profileData.displayName || ''}
                                onChange={(e) => setProfileData({
                                    ...profileData,
                                    displayName: e.target.value
                                })}
                                maxLength="100"
                            />
                        ) : (
                            <div className="field-value">
                                {profileData.displayName || user.username}
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Bio</label>
                        {isEditing ? (
                            <textarea
                                value={profileData.bio || ''}
                                onChange={(e) => setProfileData({
                                    ...profileData,
                                    bio: e.target.value
                                })}
                                maxLength="1000"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <div className="field-value bio">
                                {profileData.bio || 'No bio yet'}
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Location</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={profileData.location || ''}
                                onChange={(e) => setProfileData({
                                    ...profileData,
                                    location: e.target.value
                                })}
                                maxLength="100"
                            />
                        ) : (
                            <div className="field-value">
                                {profileData.location || 'Not specified'}
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Favorite Theme</label>
                        {isEditing ? (
                            <select
                                value={profileData.favoriteTheme || ''}
                                onChange={(e) => setProfileData({
                                    ...profileData,
                                    favoriteTheme: e.target.value
                                })}
                            >
                                <option value="">Select a theme</option>
                                {themes.map(theme => (
                                    <option key={theme.id} value={theme.id}>
                                        {theme.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="field-value">
                                {themes.find(t => t.id === profileData.favoriteTheme)?.name || 'Not specified'}
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <button 
                            className="save-button"
                            onClick={handleProfileUpdate}
                        >
                            <FontAwesomeIcon icon="save" /> Save Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;