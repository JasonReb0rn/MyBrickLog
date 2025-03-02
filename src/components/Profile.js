import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faTimes, faEdit, faSave, faTwitter, faYoutube } from '@fortawesome/free-solid-svg-icons';

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
        bricklinkStore: 100
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
        // Clear any existing messages
        setError('');
        setSuccess('');

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
        // Clear any existing messages
        setError('');
        setSuccess('');

        if (!validateAllFields()) {
            setError('Please correct the validation errors before saving');
            return;
        }

        try {
            // Create a copy of profileData with normalized bio
            const requestData = {
                ...profileData,
                bio: normalizeLineBreaks(profileData.bio),
                showEmail: Number(profileData.showEmail),  // Explicitly convert to number
                user_id: user.user_id
            };

            console.log('Sending profile data:', requestData); // Debug log

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/update_profile.php`,
                requestData
            );

            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                setIsEditing(false);
                setValidationErrors({});
            } else {
                setError(response.data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setError('Error updating profile');
        }
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center p-10 text-lg text-gray-600">
                Please log in to view your profile.
            </div>
        );
    }

    const toggleEditMode = () => {
        setError('');
        setSuccess('');
        setIsEditing(!isEditing);
    };

    return (
        <div className="max-w-3xl mx-auto px-5 py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
                <button 
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center gap-2"
                    onClick={toggleEditMode}
                >
                    <FontAwesomeIcon icon={isEditing ? faTimes : faEdit} />
                    <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-center">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-center">
                    {success}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative w-36 h-36 mb-4">
                        <img
                            src={
                                previewImage || 
                                (profileData.profilePicture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${profileData.profilePicture}` : '/images/lego_user.png')
                            }
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover border-3 border-blue-500"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/lego_user.png';
                            }}
                        />
                        {isEditing && (
                            <label className="absolute bottom-1 right-1 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors">
                                <FontAwesomeIcon 
                                    icon={faCamera}
                                    className="text-white" 
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    aria-label="Upload profile picture"
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="max-w-xl mx-auto space-y-6">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Username</label>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                            {user.username}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Display Name</label>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={profileData.displayName || ''}
                                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                                    maxLength={LIMITS.displayName}
                                    className={`w-full px-3 py-2 border ${validationErrors.displayName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                                {validationErrors.displayName && (
                                    <div className="mt-1 text-sm text-red-600">{validationErrors.displayName}</div>
                                )}
                                <div className="mt-1 text-xs text-gray-500 text-right">
                                    {(profileData.displayName?.length || 0)}/{LIMITS.displayName}
                                </div>
                            </>
                        ) : (
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                {profileData.displayName || user.username}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Bio</label>
                        {isEditing ? (
                            <>
                                <textarea
                                    value={profileData.bio || ''}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    maxLength={LIMITS.bio}
                                    placeholder="Tell us about yourself... Emojis are welcome! 😊"
                                    className={`w-full px-3 py-2 border ${validationErrors.bio ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y`}
                                />
                                {validationErrors.bio && (
                                    <div className="mt-1 text-sm text-red-600">{validationErrors.bio}</div>
                                )}
                                <div className="mt-1 text-xs text-gray-500 text-right">
                                    {(profileData.bio?.length || 0)}/{LIMITS.bio}
                                </div>
                            </>
                        ) : (
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[60px] whitespace-pre-wrap">
                                {profileData.bio || 'No bio yet'}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Location</label>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={profileData.location || ''}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    maxLength={LIMITS.location}
                                    className={`w-full px-3 py-2 border ${validationErrors.location ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                                {validationErrors.location && (
                                    <div className="mt-1 text-sm text-red-600">{validationErrors.location}</div>
                                )}
                                <div className="mt-1 text-xs text-gray-500 text-right">
                                    {(profileData.location?.length || 0)}/{LIMITS.location}
                                </div>
                            </>
                        ) : (
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                {profileData.location || 'Not specified'}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Favorite Theme</label>
                        {isEditing ? (
                            <select
                                value={profileData.favoriteTheme || ''}
                                onChange={(e) => handleInputChange('favoriteTheme', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a theme</option>
                                {themes.map(theme => (
                                    <option key={theme.id} value={theme.id}>
                                        {theme.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                {themes.find(t => t.id === profileData.favoriteTheme)?.name || 'Not specified'}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-xl font-medium text-gray-800 mb-4">Social Media</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Twitter Handle</label>
                                {isEditing ? (
                                    <>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={profileData.twitterHandle || ''}
                                                onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                                                maxLength={LIMITS.twitterHandle}
                                                placeholder="username"
                                                className={`flex-1 px-3 py-2 border ${validationErrors.twitterHandle ? 'border-red-500' : 'border-gray-300'} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            />
                                        </div>
                                        {validationErrors.twitterHandle && (
                                            <div className="mt-1 text-sm text-red-600">{validationErrors.twitterHandle}</div>
                                        )}
                                        <div className="mt-1 text-xs text-gray-500 text-right">
                                            {(profileData.twitterHandle?.length || 0)}/{LIMITS.twitterHandle}
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                        {profileData.twitterHandle ? (
                                            <a 
                                                href={`https://twitter.com/${profileData.twitterHandle}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                @{profileData.twitterHandle}
                                            </a>
                                        ) : (
                                            'Not linked'
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">YouTube Channel</label>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={profileData.youtubeChannel || ''}
                                            onChange={(e) => handleInputChange('youtubeChannel', e.target.value)}
                                            maxLength={LIMITS.youtubeChannel}
                                            placeholder="Channel URL or ID"
                                            className={`w-full px-3 py-2 border ${validationErrors.youtubeChannel ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        />
                                        {validationErrors.youtubeChannel && (
                                            <div className="mt-1 text-sm text-red-600">{validationErrors.youtubeChannel}</div>
                                        )}
                                        <div className="mt-1 text-xs text-gray-500 text-right">
                                            {(profileData.youtubeChannel?.length || 0)}/{LIMITS.youtubeChannel}
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                        {profileData.youtubeChannel ? (
                                            <a 
                                                href={`https://youtube.com/${profileData.youtubeChannel}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {profileData.youtubeChannel}
                                            </a>
                                        ) : (
                                            'Not linked'
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Bricklink Store</label>
                                {isEditing ? (
                                    <>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">
                                                store.bricklink.com/
                                            </span>
                                            <input
                                                type="text"
                                                value={profileData.bricklinkStore || ''}
                                                onChange={(e) => handleInputChange('bricklinkStore', e.target.value)}
                                                maxLength={LIMITS.bricklinkStore}
                                                placeholder="storename"
                                                className={`flex-1 px-3 py-2 border ${validationErrors.bricklinkStore ? 'border-red-500' : 'border-gray-300'} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            />
                                        </div>
                                        {validationErrors.bricklinkStore && (
                                            <div className="mt-1 text-sm text-red-600">{validationErrors.bricklinkStore}</div>
                                        )}
                                        <div className="mt-1 text-xs text-gray-500 text-right">
                                            {(profileData.bricklinkStore?.length || 0)}/{LIMITS.bricklinkStore}
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                        {profileData.bricklinkStore ? (
                                            <a 
                                                href={`https://store.bricklink.com/${profileData.bricklinkStore}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {profileData.bricklinkStore}
                                            </a>
                                        ) : (
                                            'Not linked'
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Email Visibility</label>
                                {isEditing ? (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={profileData.showEmail}
                                            onChange={(e) => handleInputChange('showEmail', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700">Show email on public profile</span>
                                    </div>
                                ) : (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                        Email visibility: {profileData.showEmail ? 'Public' : 'Private'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <button 
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:bg-green-300 disabled:cursor-not-allowed mt-8"
                            onClick={handleProfileUpdate}
                            disabled={Object.keys(validationErrors).length > 0}
                        >
                            <FontAwesomeIcon icon={faSave} />
                            <span>Save Changes</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;