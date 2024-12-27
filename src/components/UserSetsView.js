import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
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
    faEnvelope,
    faStore
} from '@fortawesome/free-solid-svg-icons';
import { 
    faTwitter,
    faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, set, isWishlist }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Remove Set</h2>
                </div>
                <div className="modal-body">
                    <p>
                        Are you sure you want to remove "{set?.name}" from your {isWishlist ? 'wishlist' : 'collection'}?
                        {!isWishlist && ' This action will also remove all quantity and completion status data.'}
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="modal-button cancel" onClick={onClose}>Cancel</button>
                    <button className="modal-button confirm" onClick={onConfirm}>Remove</button>
                </div>
            </div>
        </div>
    );
};

const UserSetsView = () => {
    const [profileData, setProfileData] = useState(null);
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [userExists, setUserExists] = useState(true);
    const [loadedImages, setLoadedImages] = useState({});
    const [collapsedThemes, setCollapsedThemes] = useState({});
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        set: null
    });
    
    const { userId } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const isWishlist = location.pathname.includes('/wishlist/');

    const endpoints = {
        fetch: isWishlist ? 'get_user_wishlist.php' : 'get_user_collection.php',
        remove: isWishlist ? 'remove_set_from_wishlist.php' : 'remove_set_from_collection.php',
        moveToCollection: 'move_wishlist_to_collection.php',
        updateQuantity: 'update_set_quantity.php',
        toggleComplete: 'toggle_set_complete_status.php'
    };

    useEffect(() => {
        const fetchSets = async () => {
            if (!userId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/${endpoints.fetch}?user_id=${userId}`);
                if (response.data.error) {
                    if (response.data.error === 'User not found.') {
                        setUserExists(false);
                    }
                    console.error(`Error fetching user ${isWishlist ? 'wishlist' : 'collection'}:`, response.data.error);
                } else {
                    setSets(response.data.sets);
                    setProfileData(response.data.profile);
                }
            } catch (error) {
                console.error(`Error fetching user ${isWishlist ? 'wishlist' : 'collection'}:`, error);
            }
            setIsLoading(false);
        };

        fetchSets();
    }, [userId, isWishlist, endpoints.fetch]);

    const handleImageError = (e, type = 'set') => {
        e.target.src = type === 'profile' ? '/images/lego_user.png' : '/images/lego_piece_questionmark.png';
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const shareUrl = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 5000);
        });
    };

    const updateQuantity = async (set_num, newQuantity) => {
        if (isWishlist) return;
        
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.updateQuantity}`,
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

    const toggleCompleteStatus = async (set_num, currentStatus) => {
        if (isWishlist) return;

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.toggleComplete}`,
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

    const moveToCollection = async (set_num) => {
        if (!isWishlist) return;

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.moveToCollection}`,
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

    const handleRemoveClick = (set, e) => {
        e.stopPropagation();
        setConfirmDialog({
            isOpen: true,
            set: set
        });
    };

    const handleConfirmRemove = async () => {
        if (!confirmDialog.set) return;

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.remove}`,
                { user_id: Number(userId), set_num: confirmDialog.set.set_num },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== confirmDialog.set.set_num));
            }
        } catch (error) {
            console.error('Error removing set:', error);
        } finally {
            setConfirmDialog({ isOpen: false, set: null });
        }
    };

    const handleCancelRemove = () => {
        setConfirmDialog({ isOpen: false, set: null });
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
    
        const themesArray = Object.values(grouped);
    
        themesArray.sort((a, b) => {
            if (a.theme_id === favoriteThemeId) return -1;
            if (b.theme_id === favoriteThemeId) return 1;
            return b.sets.length - a.sets.length;
        });
    
        const FULL_WIDTH_THRESHOLD = 7;
    
        return themesArray.map(theme => ({
            ...theme,
            isFullWidth: theme.sets.length >= FULL_WIDTH_THRESHOLD
        }));
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

    const renderCollectionStats = () => {
        if (isWishlist) return null;

        const totalSets = sets.reduce((acc, set) => acc + Number(set.quantity), 0);
        const totalParts = sets.reduce((acc, set) => acc + (set.num_parts * Number(set.quantity)), 0);
        const totalMinifigures = sets.reduce((acc, set) => acc + (Number(set.num_minifigures) * Number(set.quantity)), 0);

        return (
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
    };

    const renderSetActions = (set) => {
        if (!user || Number(user.user_id) !== Number(userId) || selectedSet !== set.set_num) {
            return null;
        }

        return (
            <div className="set-actions">
                {!isWishlist && (
                    <div className="quantity-controls">
                        <button 
                            className="quantity-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(set.set_num, Number(set.quantity) - 1);
                            }}
                            disabled={set.quantity <= 1}
                        >-</button>
                        <span className="quantity-display">{set.quantity}</span>
                        <button 
                            className="quantity-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(set.set_num, Number(set.quantity) + 1);
                            }}
                        >+</button>
                    </div>
                )}
                <div className="set-action-buttons">
                    {isWishlist ? (
                        <button
                            className="status-button complete"
                            onClick={(e) => {
                                e.stopPropagation();
                                moveToCollection(set.set_num);
                            }}
                        >
                            Move to Collection
                        </button>
                    ) : (
                        <button
                            className={`status-button ${Number(set.complete) === 1 ? 'complete' : 'incomplete'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCompleteStatus(set.set_num, set.complete);
                            }}
                        >
                            <FontAwesomeIcon icon={faCircleHalfStroke} />
                            <span className={`${Number(set.complete) === 1 ? 'incomplete' : 'complete'}-btn-span`}>
                                {Number(set.complete) === 1 ? ' Incomplete' : ' Complete'}
                            </span>
                        </button>
                    )}
                    <button
                        className="remove-button"
                        onClick={(e) => handleRemoveClick(set, e)}
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        <span className="remove-btn-span"> Remove</span>
                    </button>
                </div>
            </div>
        );
    };

    if (!userId) {
        return (
            <div className="content">
                <div className="centered-message">
                    <h2>Create an account and start your {isWishlist ? 'wishlist' : 'collection'} today!</h2>
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
            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={handleCancelRemove}
                onConfirm={handleConfirmRemove}
                set={confirmDialog.set}
                isWishlist={isWishlist}
            />

            {renderProfileSection()}
            
            <div className="collection-header">
                <h2>
                    {user && Number(user.user_id) === Number(userId) 
                        ? `My ${isWishlist ? 'Wishlist' : 'Collection'}`
                        : `${profileData?.display_name || profileData?.username}'s ${isWishlist ? 'Wishlist' : 'Collection'}`
                    }
                </h2>
                <div className="collection-actions">
                    {!isWishlist && profileData?.has_wishlist && (
                        <button className="wishlist-link-button">
                            <Link 
                                to={`/wishlist/${userId}`} 
                            >
                                <FontAwesomeIcon icon="gift" className="button-icon" />
                                View {user && Number(user.user_id) === Number(userId) ? 'My' : `${profileData?.display_name || profileData?.username}'s`} Wishlist
                            </Link>
                        </button>
                    )}
                    <button onClick={shareUrl} className="share-button">
                        <FontAwesomeIcon 
                            icon={copiedUrl ? "check" : "share"} 
                            className="share-icon" 
                        />
                        {copiedUrl ? 'Link Copied!' : `Share ${isWishlist ? 'Wishlist' : 'Collection'}`}
                    </button>
                </div>
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
                                                    !isWishlist && Number(set.complete) === 0 ? 'incomplete' : ''
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

                                                    {(set.retail_price || set.sealed_value || set.used_value) && (
                                                        <div className="set-prices">
                                                            {set.retail_price && (
                                                                <div className="price-row">
                                                                    <span className="price-label">Retail:</span>
                                                                    <span className="price-value retail">
                                                                        ${Number(set.retail_price).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {set.sealed_value && (
                                                                <div className="price-row">
                                                                    <span className="price-label">Sealed:</span>
                                                                    <span className="price-value sealed">
                                                                        ${Number(set.sealed_value).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {set.used_value && (
                                                                <div className="price-row">
                                                                    <span className="price-label">Used:</span>
                                                                    <span className="price-value used">
                                                                        ${Number(set.used_value).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                </div>

                                                {renderSetActions(set)}

                                                {!isWishlist && set.quantity > 1 && (
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
                        <p>You haven't added any sets to your {isWishlist ? 'wishlist' : 'collection'} yet.</p>
                    ) : (
                        <p>This user hasn't added any sets to their {isWishlist ? 'wishlist' : 'collection'} yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserSetsView;