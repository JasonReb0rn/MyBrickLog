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
    faCircleHalfStroke, 
    faTrash,
    faEnvelope 
} from '@fortawesome/free-solid-svg-icons';
import { 
    faTwitter,
    faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const Collection = () => {
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
        const fetchCollection = async () => {
            if (!userId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_user_collection.php?user_id=${userId}`);
                if (response.data.error) {
                    if (response.data.error === 'User not found.') {
                        setUserExists(false);
                    }
                    console.error('Error fetching user collection:', response.data.error);
                } else {
                    setSets(response.data.sets);
                    setProfileData(response.data.profile);
                }
            } catch (error) {
                console.error('Error fetching user collection:', error);
            }
            setIsLoading(false);
        };

        fetchCollection();
    }, [userId]);

    // Helper functions
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

    const shareCollection = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 5000);
        }).catch(err => {
            console.error('Error copying URL:', err);
        });
    };

    // Collection management functions
    const updateQuantity = async (set_num, newQuantity) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/update_set_quantity.php`, 
                { user_id: Number(userId), set_num, quantity: newQuantity },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSets(sets.map(set => 
                    set.set_num === set_num ? { ...set, quantity: newQuantity } : set
                ));
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    const removeSet = async (set_num) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/remove_set_from_collection.php`,
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

    const toggleCompleteStatus = async (set_num, currentStatus) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/toggle_set_complete_status.php`,
                { user_id: Number(userId), set_num, complete: currentStatus ? 0 : 1 },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSets(sets.map(set => 
                    set.set_num === set_num ? { ...set, complete: currentStatus ? 0 : 1 } : set
                ));
            }
        } catch (error) {
            console.error('Error toggling complete status:', error);
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

    // Calculate statistics
    const totalSets = sets.reduce((acc, set) => acc + Number(set.quantity), 0);
    const totalParts = sets.reduce((acc, set) => acc + (set.num_parts * Number(set.quantity)), 0);
    const totalMinifigures = sets.reduce((acc, set) => acc + (Number(set.num_minifigures) * Number(set.quantity)), 0);

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
    
        // Calculate layout classes
        const FULL_WIDTH_THRESHOLD = 7;
        return themesArray.map((theme, index, array) => {
            // Single theme in collection is always full width
            if (array.length === 1) {
                return { ...theme, isFullWidth: true };
            }
    
            // Themes with many sets are full width
            if (theme.sets.length >= FULL_WIDTH_THRESHOLD) {
                return { ...theme, isFullWidth: true };
            }
    
            // Find nearest full-width themes (replace findLast with reverse().find())
            const previousThemes = array.slice(0, index);
            const prevFullWidth = previousThemes.reverse().find(t => 
                t.sets.length >= FULL_WIDTH_THRESHOLD
            );
            const nextFullWidth = array.slice(index + 1).find(t => 
                t.sets.length >= FULL_WIDTH_THRESHOLD
            );
    
            // If between two full-width themes, make it full width
            if (prevFullWidth && nextFullWidth) {
                return { ...theme, isFullWidth: true };
            }
    
            // Handle potential orphans
            const isOdd = index % 2 === 1;
            const isLast = index === array.length - 1;
            
            // Make it full width if it would be orphaned
            if (isLast && (isOdd || !array[index - 1]?.isFullWidth)) {
                return { ...theme, isFullWidth: true };
            }
    
            // Default to half width
            return { ...theme, isFullWidth: false };
        });
    };

    // Render helper functions
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
                        {(profileData.twitter_handle || profileData.youtube_channel || profileData.email) && (
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

    const renderCollectionStats = () => (
        <div className="stats-container">
            <div className="collection-stats">
                <div className="stats-section">
                    <div className="stats-header">Sets</div>
                    <div className="stats-value">{totalSets}</div>
                </div>
                <div className="stats-section">
                    <div className="stats-header">Parts</div>
                    <div className="stats-value">{totalParts.toLocaleString()}</div>
                </div>
                <div className="stats-section">
                    <div className="stats-header">
                        Minifigures
                        <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="info-icon"
                            data-tooltip-id="tooltip-minifigures"
                        />
                    </div>
                    <div className="stats-value">{totalMinifigures.toLocaleString()}</div>
                    <Tooltip id="tooltip-minifigures" place="bottom" type="dark" effect="solid">
                        <span>Minifigure count data is sourced from a third-party database and may be incomplete.</span>
                    </Tooltip>
                </div>
            </div>
        </div>
    );

    if (!userId) {
        return (
            <div className="content">
                <div className="centered-message">
                    <h2>Create an account and start your collection today!</h2>
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
                <h2>{user && Number(user.user_id) === Number(userId) ? 'My Collection' : `${profileData?.display_name || profileData?.username}'s Collection`}</h2>
                <button onClick={shareCollection} className="share-button">
                    <FontAwesomeIcon 
                        icon={copiedUrl ? "check" : "share"} 
                        className="share-icon" 
                    />
                    {copiedUrl ? 'Link Copied!' : 'Share Collection'}
                </button>
            </div>

            {sets.length > 0 ? (
                <>
                    {renderCollectionStats()}
                    
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
                                                className={`set-card ${
                                                    Number(set.complete) === 0 ? 'incomplete' : ''
                                                } ${selectedSet === set.set_num ? 'selected' : ''}`}
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
                                                        <div className="quantity-controls">
                                                            <button 
                                                                className="quantity-button"
                                                                onClick={() => updateQuantity(set.set_num, Number(set.quantity) - 1)}
                                                                disabled={set.quantity <= 1}
                                                            >-</button>
                                                            <span className="quantity-display">{set.quantity}</span>
                                                            <button 
                                                                className="quantity-button"
                                                                onClick={() => updateQuantity(set.set_num, Number(set.quantity) + 1)}
                                                            >+</button>
                                                        </div>
                                                        <div className="set-action-buttons">
                                                            <button
                                                                className={`status-button ${Number(set.complete) === 1 ? 'complete' : 'incomplete'}`}
                                                                onClick={() => toggleCompleteStatus(set.set_num, set.complete)}
                                                            >
                                                                {Number(set.complete) === 1 ? (
                                                                    <>
                                                                        <FontAwesomeIcon icon={faCircleHalfStroke} />
                                                                        <span className="incomplete-btn-span"> Incomplete</span>
                                                                    </>
                                                                ) : <>
                                                                        <FontAwesomeIcon icon={faCircleHalfStroke} />
                                                                        <span className="complete-btn-span"> Complete</span>
                                                                    </>}
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

                                                {set.quantity > 1 && (
                                                    <div className="quantity-badge">×{set.quantity}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="empty-collection">
                    {user && Number(user.user_id) === Number(userId) ? (
                        <p>You haven't added any sets to your collection yet.</p>
                    ) : (
                        <p>This user hasn't added any sets to their collection yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Collection;