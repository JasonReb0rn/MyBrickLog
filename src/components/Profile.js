import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faTimes, faEdit, faSave, faTwitter, faYoutube } from '@fortawesome/free-solid-svg-icons';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        displayName: '',
        bio: '',
        location: '',
        favoriteTheme: '',
        profilePicture: null,
        twitterHandle: '',
        youtubeChannel: '',
        bricklinkStore: '',
        showEmail: false
    });
    const [validationErrors, setValidationErrors] = useState({});
    const [themes, setThemes] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Character limits based on DB schema
    const LIMITS = {
        displayName: 99,
        bio: 1000,
        location: 50,
        twitterHandle: 50,
        youtubeChannel: 100,
        bricklinkStore: 100 // Add this line
    };

    useEffect(() => {
        if (user) {
            fetchProfileData();
            fetchThemes();
        }
    }, [user]);

    const validateField = (name, value) => {
        const errors = {};
        
        switch (name) {
            case 'displayName':
                if (value && value.length > LIMITS.displayName) {
                    errors[name] = `Display name must be ${LIMITS.displayName} characters or less`;
                }
                if (/[\u{1F300}-\u{1F9FF}]/u.test(value)) {
                    errors[name] = 'Display name cannot contain emojis';
                }
                break;
                
            case 'bio':
                if (value && value.length > LIMITS.bio) {
                    errors[name] = `Bio must be ${LIMITS.bio} characters or less`;
                }
                break;
                
            case 'location':
                if (value && value.length > LIMITS.location) {
                    errors[name] = `Location must be ${LIMITS.location} characters or less`;
                }
                if (/[\u{1F300}-\u{1F9FF}]/u.test(value)) {
                    errors[name] = 'Location cannot contain emojis';
                }
                break;
                
            case 'twitterHandle':
                if (value && value.length > LIMITS.twitterHandle) {
                    errors[name] = `Twitter handle must be ${LIMITS.twitterHandle} characters or less`;
                }
                if (/[\u{1F300}-\u{1F9FF}]/u.test(value)) {
                    errors[name] = 'Twitter handle cannot contain emojis';
                }
                break;
                
            case 'youtubeChannel':
                if (value && value.length > LIMITS.youtubeChannel) {
                    errors[name] = `YouTube channel must be ${LIMITS.youtubeChannel} characters or less`;
                }
                if (/[\u{1F300}-\u{1F9FF}]/u.test(value)) {
                    errors[name] = 'YouTube channel cannot contain emojis';
                }
                break;

            case 'bricklinkStore':
                if (value && value.length > LIMITS.bricklinkStore) {
                    errors[name] = `Bricklink store must be ${LIMITS.bricklinkStore} characters or less`;
                }
                if (/[\u{1F300}-\u{1F9FF}]/u.test(value)) {
                    errors[name] = 'Bricklink store cannot contain emojis';
                }
                // Optional: Add validation for valid store URL format
                if (value && !/^[a-zA-Z0-9-_]+$/.test(value)) {
                    errors[name] = 'Bricklink store can only contain letters, numbers, hyphens, and underscores';
                }
                break;
        }
        
        return errors;
    };

    const handleInputChange = (name, value) => {
        const errors = validateField(name, value);
        
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
        
        setValidationErrors(prev => ({
            ...prev,
            ...errors
        }));
    };

    const validateAllFields = () => {
        const errors = {};
        Object.keys(profileData).forEach(key => {
            if (LIMITS[key]) {
                const fieldErrors = validateField(key, profileData[key]);
                Object.assign(errors, fieldErrors);
            }
        });
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const normalizeLineBreaks = (text) => {
        if (!text) return text;
        
        // First, standardize all types of line breaks to \n
        const standardized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Replace 3 or more line breaks with 2 line breaks
        const normalized = standardized.replace(/\n{3,}/g, '\n\n');
        
        // Trim any leading/trailing whitespace and line breaks
        return normalized.trim();
    };

    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_profile.php?user_id=${user.user_id}`);
            if (response.data.success) {
                setProfileData({
                    ...response.data.profile,
                    twitterHandle: response.data.profile.twitterHandle || '',
                    youtubeChannel: response.data.profile.youtubeChannel || '',
                    bricklinkStore: response.data.profile.bricklinkStore || '',
                    showEmail: response.data.profile.showEmail || false
                });
                if (response.data.profile.profilePicture) {
                    setPreviewImage(`https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${response.data.profile.profilePicture}`);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Failed to load profile data');
        }
    };

    const fetchThemes = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_parent_themes.php`);
            setThemes(response.data);
        } catch (error) {
            console.error('Error fetching themes:', error);
            setError('Failed to load themes');
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
        if (!validateAllFields()) {
            setError('Please correct the validation errors before saving');
            return;
        }

        try {
            // Create a copy of profileData with normalized bio
            const normalizedData = {
                ...profileData,
                bio: normalizeLineBreaks(profileData.bio)
            };

            // Update the state with normalized bio
            setProfileData(normalizedData);

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/update_profile.php`, {
                user_id: user.user_id,
                ...normalizedData
            });

            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                setIsEditing(false);
                setValidationErrors({});
            } else {
                setError(response.data.error || 'Failed to update profile');
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
                    <FontAwesomeIcon icon={isEditing ? faTimes : faEdit} />
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
                                e.target.onerror = null;
                                e.target.src = '/images/lego_user.png';
                            }}
                        />
                        {isEditing && (
                            <label className="profile-picture-upload">
                                <FontAwesomeIcon 
                                    icon={faCamera}
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
                            <>
                                <input
                                    type="text"
                                    value={profileData.displayName || ''}
                                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                                    maxLength={LIMITS.displayName}
                                    className={validationErrors.displayName ? 'error' : ''}
                                />
                                {validationErrors.displayName && (
                                    <div className="validation-error">{validationErrors.displayName}</div>
                                )}
                                <div className="character-count">
                                    {(profileData.displayName?.length || 0)}/{LIMITS.displayName}
                                </div>
                            </>
                        ) : (
                            <div className="field-value">
                                {profileData.displayName || user.username}
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Bio</label>
                        {isEditing ? (
                            <>
                                <textarea
                                    value={profileData.bio || ''}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    maxLength={LIMITS.bio}
                                    placeholder="Tell us about yourself... Emojis are welcome! 😊"
                                    className={validationErrors.bio ? 'error' : ''}
                                />
                                {validationErrors.bio && (
                                    <div className="validation-error">{validationErrors.bio}</div>
                                )}
                                <div className="character-count">
                                    {(profileData.bio?.length || 0)}/{LIMITS.bio}
                                </div>
                            </>
                        ) : (
                            <div className="field-value bio">
                                {profileData.bio || 'No bio yet'}
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Location</label>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={profileData.location || ''}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    maxLength={LIMITS.location}
                                    className={validationErrors.location ? 'error' : ''}
                                />
                                {validationErrors.location && (
                                    <div className="validation-error">{validationErrors.location}</div>
                                )}
                                <div className="character-count">
                                    {(profileData.location?.length || 0)}/{LIMITS.location}
                                </div>
                            </>
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
                                onChange={(e) => handleInputChange('favoriteTheme', e.target.value)}
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

                    <div className="social-media-section">
                        <h3 className="section-title">Social Media</h3>
                        
                        <div className="profile-field">
                            <label>Twitter Handle</label>
                            {isEditing ? (
                                <>
                                    <div className="input-with-prefix">
                                        <span className="input-prefix">@</span>
                                        <input
                                            type="text"
                                            value={profileData.twitterHandle || ''}
                                            onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                                            maxLength={LIMITS.twitterHandle}
                                            placeholder="username"
                                            className={validationErrors.twitterHandle ? 'error' : ''}
                                        />
                                    </div>
                                    {validationErrors.twitterHandle && (
                                        <div className="validation-error">{validationErrors.twitterHandle}</div>
                                    )}
                                    <div className="character-count">
                                        {(profileData.twitterHandle?.length || 0)}/{LIMITS.twitterHandle}
                                    </div>
                                </>
                            ) : (
                                <div className="field-value">
                                    {profileData.twitterHandle ? (
                                        <a href={`https://twitter.com/${profileData.twitterHandle}`} 
                                           target="_blank" 
                                           rel="noopener noreferrer">
                                            @{profileData.twitterHandle}
                                        </a>
                                    ) : (
                                        'Not linked'
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="profile-field">
                            <label>YouTube Channel</label>
                            {isEditing ? (
                                <>
                                <input
                                        type="text"
                                        value={profileData.youtubeChannel || ''}
                                        onChange={(e) => handleInputChange('youtubeChannel', e.target.value)}
                                        maxLength={LIMITS.youtubeChannel}
                                        placeholder="Channel URL or ID"
                                        className={validationErrors.youtubeChannel ? 'error' : ''}
                                    />
                                    {validationErrors.youtubeChannel && (
                                        <div className="validation-error">{validationErrors.youtubeChannel}</div>
                                    )}
                                    <div className="character-count">
                                        {(profileData.youtubeChannel?.length || 0)}/{LIMITS.youtubeChannel}
                                    </div>
                                </>
                            ) : (
                                <div className="field-value">
                                    {profileData.youtubeChannel ? (
                                        <a href={`https://youtube.com/${profileData.youtubeChannel}`} 
                                           target="_blank" 
                                           rel="noopener noreferrer">
                                            {profileData.youtubeChannel}
                                        </a>
                                    ) : (
                                        'Not linked'
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="profile-field">
                            <label>Bricklink Store</label>
                            {isEditing ? (
                                <>
                                    <div className="input-with-prefix">
                                        <span className="input-prefix">store.bricklink.com/</span>
                                        <input
                                            type="text"
                                            value={profileData.bricklinkStore || ''}
                                            onChange={(e) => handleInputChange('bricklinkStore', e.target.value)}
                                            maxLength={LIMITS.bricklinkStore}
                                            placeholder="storename"
                                            className={validationErrors.bricklinkStore ? 'error' : ''}
                                        />
                                    </div>
                                    {validationErrors.bricklinkStore && (
                                        <div className="validation-error">{validationErrors.bricklinkStore}</div>
                                    )}
                                    <div className="character-count">
                                        {(profileData.bricklinkStore?.length || 0)}/{LIMITS.bricklinkStore}
                                    </div>
                                </>
                            ) : (
                                <div className="field-value">
                                    {profileData.bricklinkStore ? (
                                        <a href={`https://store.bricklink.com/${profileData.bricklinkStore}`}
                                           target="_blank"
                                           rel="noopener noreferrer">
                                            {profileData.bricklinkStore}
                                        </a>
                                    ) : (
                                        'Not linked'
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="profile-field">
                            <label className="checkbox-label">
                                {isEditing ? (
                                    <div className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={profileData.showEmail}
                                            onChange={(e) => handleInputChange('showEmail', e.target.checked)}
                                        />
                                        <span>Show email on public profile</span>
                                    </div>
                                ) : (
                                    <div className="field-value">
                                        Email visibility: {profileData.showEmail ? 'Public' : 'Private'}
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {isEditing && (
                        <button 
                            className="save-button"
                            onClick={handleProfileUpdate}
                            disabled={Object.keys(validationErrors).length > 0}
                        >
                            <FontAwesomeIcon icon={faSave} /> Save Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;