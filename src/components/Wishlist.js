import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './Collection.css';
import { useAuth } from './AuthContext';
import { Tooltip } from 'react-tooltip';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faInfoCircle, 
    faMapMarkerAlt, 
    faCube, 
    faTrash,
    faEnvelope,
    faStore
} from '@fortawesome/free-solid-svg-icons';
import { 
    faTwitter,
    faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const Wishlist = () => {
    const [profileData, setProfileData] = useState(null);
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [userExists, setUserExists] = useState(true);
    const { userId } = useParams();
    const { user } = useAuth();
    const [loadedImages, setLoadedImages] = useState({});
    const [collapsedThemes, setCollapsedThemes] = useState({});

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!userId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_user_wishlist.php?user_id=${userId}`);
                if (response.data.error) {
                    if (response.data.error === 'User not found.') {
                        setUserExists(false);
                    }
                    console.error('Error fetching user wishlist:', response.data.error);
                } else {
                    setSets(response.data.sets);
                    setProfileData(response.data.profile);
                }
            } catch (error) {
                console.error('Error fetching user wishlist:', error);
            }
            setIsLoading(false);
        };

        fetchWishlist();
    }, [userId]);

    const handleImageError = (e, type = 'set') => {
        if (type === 'profile') {
            e.target.src = '/images/lego_user.png';
        } else {
            e.target.src = '/images/lego_piece_questionmark.png';
        }
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const shareWishlist = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 5000);
        }).catch(err => {
            console.error('Error copying URL:', err);
        });
    };

    const moveToCollection = async (set_num) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/move_wishlist_to_collection.php`,
                { user_id: Number(userId), set_num },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== set_num));
            }
        } catch (error) {
            console.error('Error moving set:', error);
        }
    };

    const removeSet = async (set_num) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/remove_set_from_wishlist.php`,
                { user_id: Number(userId), set_num },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== set_num));
            }
        } catch (error) {
            console.error('Error removing set:', error);
        }
    };

    const toggleSelectSet = (set_num) => {
        if (user && Number(user.user_id) === Number(userId)) {
            setSelectedSet(selectedSet === set_num ? null : set_num);
        }
    };

    const toggleCollapse = (themeId) => {
        setCollapsedThemes(prev => ({ ...prev, [themeId]: !prev[themeId] }));
    };

    const groupAndSortThemes = (sets, favoriteThemeId) => {
        // First group the sets by theme
        const grouped = sets.reduce((acc, set) => {
            if (!acc[set.theme_id]) {
                acc[set.theme_id] = {
                    theme_id: set.theme_id,
                    theme_name: set.theme_name,
                    sets: []
                };
            }
            acc[set.theme_id].sets.push(set);
            return acc;
        }, {});
    
        // Convert to array and calculate layout properties
        const themesArray = Object.values(grouped);
    
        // Sort: favorite theme first, then by number of sets
        themesArray.sort((a, b) => {
            if (a.theme_id === favoriteThemeId) return -1;
            if (b.theme_id === favoriteThemeId) return 1;
            return b.sets.length - a.sets.length;
        });
    
        const FULL_WIDTH_THRESHOLD = 7;
    
        return themesArray.map((theme, index) => {
            // Theme is full width if it has many sets
            if (theme.sets.length >= FULL_WIDTH_THRESHOLD) {
                return { ...theme, isFullWidth: true };
            }
            
            // Otherwise it's half width
            return { ...theme, isFullWidth: false };
        });
    };

    const renderProfileSection = () => {
        if (!profileData) return null;
    
        const displayName = profileData.display_name || profileData.username;
        
        return (
            <div className="collection-profile-section">
                <div className="collection-profile-header">
                    <div className="profile-image-container">
                        <img 
                            src={profileData.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${profileData.profile_picture}` : '/images/lego_user.png'}
                            alt={displayName}
                            className="profile-image"
                            onError={(e) => handleImageError(e, 'profile')}
                        />
                    </div>
                    <div className="profile-info">
                        <h1 className="profile-name">{displayName}</h1>
                        {profileData.location && (
                            <div className="profile-location">
                                <FontAwesomeIcon icon={faMapMarkerAlt} /> {profileData.location}
                            </div>
                        )}
                        {profileData.favorite_theme_name && (
                            <div className="profile-favorite-theme">
                                <FontAwesomeIcon icon={faCube} /> Favorite Theme: {profileData.favorite_theme_name}
                            </div>
                        )}
                        {profileData.bio && (
                            <p className="profile-bio">{profileData.bio}</p>
                        )}
                    </div>
                    <div className="profile-social">
                        {(profileData.twitter_handle || profileData.youtube_channel || profileData.email || profileData.bricklink_store) && (
                            <div className="social-links">
                                {profileData.twitter_handle && (
                                    <a 
                                        href={`https://twitter.com/${profileData.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                    >
                                        <FontAwesomeIcon icon={faTwitter} />
                                        <span>@{profileData.twitter_handle}</span>
                                    </a>
                                )}
                                {profileData.youtube_channel && (
                                    <a 
                                        href={`https://youtube.com/${profileData.youtube_channel}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                    >
                                        <FontAwesomeIcon icon={faYoutube} />
                                        <span>{profileData.youtube_channel}</span>
                                    </a>
                                )}
                                {profileData.bricklink_store && (
                                    <a 
                                        href={`https://store.bricklink.com/${profileData.bricklink_store}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                    >
                                        <FontAwesomeIcon icon={faStore} />
                                        <span>{profileData.bricklink_store}</span>
                                    </a>
                                )}
                                {profileData.email && (
                                    <a 
                                        href={`mailto:${profileData.email}`}
                                        className="social-link"
                                    >
                                        <FontAwesomeIcon icon={faEnvelope} />
                                        <span>{profileData.email}</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!userId) {
        return (
            <div className="content">
                <div className="centered-message">
                    <h2>Create an account and start your wishlist today!</h2>
                    <div className="collection-nouser-links-container">
                        <Link to="/register" className="register-button">Register</Link>
                        <Link to="/login" className="login-button">Log In</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (!userExists) {
        return <div className="error-message">User not found.</div>;
    }

    return (
        <div className="content">
            {renderProfileSection()}
            
            <div className="collection-header">
                <h2>{user && Number(user.user_id) === Number(userId) ? 'My Wishlist' : `${profileData?.display_name || profileData?.username}'s Wishlist`}</h2>
                <button onClick={shareWishlist} className="share-button">
                    <FontAwesomeIcon 
                        icon={copiedUrl ? "check" : "share"} 
                        className="share-icon" 
                    />
                    {copiedUrl ? 'Link Copied!' : 'Share Wishlist'}
                </button>
            </div>

            {sets.length > 0 ? (
                <div className="collection-themes-container">
                    {groupAndSortThemes(sets, profileData?.favorite_theme).map(theme => (
                        <div 
                            key={theme.theme_id} 
                            className={`collection-theme-section ${theme.isFullWidth ? '' : 'half'} ${
                                collapsedThemes[theme.theme_id] ? 'collapsed' : ''
                            }`}
                        >
                            <div className="theme-title" onClick={() => toggleCollapse(theme.theme_id)}>
                                {theme.theme_name}
                                <FontAwesomeIcon 
                                    icon={collapsedThemes[theme.theme_id] ? "chevron-right" : "chevron-down"} 
                                    className="theme-icon"
                                />
                            </div>
                            {!collapsedThemes[theme.theme_id] && (
                                <div className="sets-container">
                                    {theme.sets.map(set => (
                                        <div
                                            key={set.set_num}
                                            className={`set-card ${selectedSet === set.set_num ? 'selected' : ''}`}
                                            onClick={() => toggleSelectSet(set.set_num)}
                                        >
                                            <div className="set-image-container">
                                                {!loadedImages[set.set_num] && <Skeleton height={100} />}
                                                <img
                                                    src={set.img_url}
                                                    alt={set.name}
                                                    className={`set-image collection ${loadedImages[set.set_num] ? 'loaded' : ''}`}
                                                    onError={handleImageError}
                                                    onLoad={() => handleImageLoad(set.set_num)}
                                                    style={{ display: loadedImages[set.set_num] ? 'block' : 'none' }}
                                                />
                                            </div>
                                    
                                            <div className="set-info">
                                                <div className="set-name">{set.name}</div>
                                                <div className="set-details">
                                                    <span className="set-year">({set.year})</span>
                                                    <span className="set-number">{set.set_num}</span>
                                                </div>
                                            </div>
                                    
                                            {user && Number(user.user_id) === Number(userId) && 
                                             selectedSet === set.set_num && (
                                                <div className="set-actions">
                                                    <div className="set-action-buttons">
                                                        <button
                                                            className="status-button complete"
                                                            onClick={() => moveToCollection(set.set_num)}
                                                        >
                                                            Move to Collection
                                                        </button>
                                                        <button
                                                            className="remove-button"
                                                            onClick={() => removeSet(set.set_num)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                            <span className="remove-btn-span"> Remove</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-collection">
                    {user && Number(user.user_id) === Number(userId) ? (
                        <p>You haven't added any sets to your wishlist yet.</p>
                    ) : (
                        <p>This user hasn't added any sets to their wishlist yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Wishlist;