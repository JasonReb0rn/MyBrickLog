import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
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
    faStore,
    faDollarSign,
    faEyeSlash,
    faEye
} from '@fortawesome/free-solid-svg-icons';
import { 
    faTwitter,
    faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, set, isWishlist }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-md w-11/12 p-6" onClick={e => e.stopPropagation()}>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Remove Set</h2>
                </div>
                <div className="mb-6">
                    <p className="text-gray-600">
                        Are you sure you want to remove "{set?.name}" from your {isWishlist ? 'wishlist' : 'collection'}?
                        {!isWishlist && ' This action will also remove all quantity and completion status data.'}
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <button 
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors" 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors" 
                        onClick={onConfirm}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

const PriceToggle = ({ showPrices, onToggle }) => (
    <button 
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-300"
        data-tooltip-id="price-toggle-tooltip"
    >
        <FontAwesomeIcon icon={showPrices ? faEyeSlash : faEye} />
        <FontAwesomeIcon icon={faDollarSign} className="text-green-600" />
        <span>{showPrices ? 'Hide' : 'Show'} Prices</span>
        <Tooltip id="price-toggle-tooltip" place="bottom" className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg">
            <span>{showPrices ? 'Hide' : 'Show'} set prices</span>
        </Tooltip>
    </button>
);

const UserSetsView = () => {
    const [profileData, setProfileData] = useState(null);
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [userExists, setUserExists] = useState(true);
    const [loadedImages, setLoadedImages] = useState({});
    const [collapsedThemes, setCollapsedThemes] = useState({});
    const [showPrices, setShowPrices] = useState(() => {
        const stored = localStorage.getItem('showPrices');
        return stored !== null ? JSON.parse(stored) : false;
    });
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
        localStorage.setItem('showPrices', JSON.stringify(showPrices));
    }, [showPrices]);

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
            <div className="bg-white rounded-lg shadow-md border border-gray-200 max-w-6xl mx-auto mb-8">
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="flex-shrink-0">
                        <div className="w-28 h-28 relative">
                            <img 
                                src={profileData.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${profileData.profile_picture}` : '/images/lego_user.png'}
                                alt={displayName}
                                className="w-full h-full object-cover rounded-full border-4 border-yellow-400"
                                onError={(e) => handleImageError(e, 'profile')}
                            />
                        </div>
                    </div>
                    
                    <div className="flex-grow text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">{displayName}</h1>
                        
                        {profileData.location && (
                            <div className="text-gray-600 mb-2 flex items-center justify-center md:justify-start gap-2">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-500" /> 
                                <span>{profileData.location}</span>
                            </div>
                        )}
                        
                        {profileData.favorite_theme_name && (
                            <div className="text-gray-600 mb-2 flex items-center justify-center md:justify-start gap-2">
                                <FontAwesomeIcon icon={faCube} className="text-gray-500" /> 
                                <span>Favorite Theme: {profileData.favorite_theme_name}</span>
                            </div>
                        )}
                        
                        {profileData.bio && (
                            <p className="text-gray-700 mt-4 whitespace-pre-line">{profileData.bio}</p>
                        )}
                    </div>
                    
                    <div className="md:ml-auto md:pl-6 md:border-l md:border-gray-200 w-full md:w-auto">
                        {(profileData.twitter_handle || profileData.youtube_channel || profileData.email || profileData.bricklink_store) && (
                            <div className="flex flex-col gap-3">
                                {profileData.twitter_handle && (
                                    <a 
                                        href={`https://twitter.com/${profileData.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faTwitter} className="text-blue-400" />
                                        <span>@{profileData.twitter_handle}</span>
                                    </a>
                                )}
                                
                                {profileData.youtube_channel && (
                                    <a 
                                        href={`https://youtube.com/${profileData.youtube_channel}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faYoutube} className="text-red-500" />
                                        <span>{profileData.youtube_channel}</span>
                                    </a>
                                )}
                                
                                {profileData.bricklink_store && (
                                    <a 
                                        href={`https://store.bricklink.com/${profileData.bricklink_store}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-600 hover:text-amber-500 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faStore} className="text-amber-500" />
                                        <span>{profileData.bricklink_store}</span>
                                    </a>
                                )}
                                
                                {profileData.email && (
                                    <a 
                                        href={`mailto:${profileData.email}`}
                                        className="flex items-center gap-2 text-gray-600 hover:text-purple-500 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faEnvelope} className="text-purple-500" />
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

    const renderSetCard = (set) => (
        <div
            key={set.set_num}
            className={`w-56 p-4 bg-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg relative
                       ${!isWishlist && Number(set.complete) === 0 ? 'border-2 border-amber-400' : 'border border-gray-200'} 
                       ${selectedSet === set.set_num ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                       ${showPrices ? 'sm:w-72' : ''}`}
            onClick={() => toggleSelectSet(set.set_num)}
        >
            <div className="h-32 flex items-center justify-center mb-4 relative">
                {!loadedImages[set.set_num] && (
                    <Skeleton height={100} width={120} />
                )}
                <img
                    src={set.img_url}
                    alt={set.name}
                    className={`h-full object-contain ${loadedImages[set.set_num] ? 'opacity-100' : 'opacity-0'}`}
                    onError={handleImageError}
                    onLoad={() => handleImageLoad(set.set_num)}
                    style={{ transition: 'opacity 0.3s' }}
                />
            </div>

            <div className="flex flex-col h-full">
                <div className={`flex ${showPrices ? 'flex-row gap-4' : 'flex-col'}`}>
                    <div className="flex-grow">
                        <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{set.name}</h3>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>({set.year})</span>
                            <span>{set.set_num}</span>
                        </div>
                    </div>

                    {showPrices && (
                        <div className={`${showPrices ? 'border-l border-gray-200 pl-4 opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-4'} transition-all duration-300`}>
                            {set.retail_price && (
                                <div className="mb-2">
                                    <span className="block text-xs text-gray-500">Retail</span>
                                    <span className="text-gray-600 font-medium">
                                        ${Number(set.retail_price).toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {set.sealed_value && (
                                <div className="mb-2">
                                    <span className="block text-xs text-gray-500">Sealed</span>
                                    <span className="text-green-600 font-medium">
                                        ${Number(set.sealed_value).toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {set.used_value && (
                                <div className="mb-2">
                                    <span className="block text-xs text-gray-500">Used</span>
                                    <span className="text-blue-600 font-medium">
                                        ${Number(set.used_value).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {renderSetActions(set)}
            </div>
    
            {!isWishlist && set.quantity > 1 && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-gray-800 h-6 w-6 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">
                    ×{set.quantity}
                </div>
            )}
        </div>
    );

    const renderSetActions = (set) => {
        if (!user || Number(user.user_id) !== Number(userId) || selectedSet !== set.set_num) {
            return null;
        }

        return (
            <div className="mt-4 pt-4 border-t border-gray-200">
                {!isWishlist && (
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <button 
                            className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(set.set_num, Number(set.quantity) - 1);
                            }}
                            disabled={set.quantity <= 1}
                        >
                            -
                        </button>
                        <span className="w-8 text-center font-medium">{set.quantity}</span>
                        <button 
                            className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(set.set_num, Number(set.quantity) + 1);
                            }}
                        >
                            +
                        </button>
                    </div>
                )}
                
                <div className={`flex ${showPrices ? 'flex-row' : 'flex-col'} gap-2`}>
                    {isWishlist ? (
                        <button
                            className="flex-1 py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-md font-medium transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                moveToCollection(set.set_num);
                            }}
                        >
                            Move to Collection
                        </button>
                    ) : (
                        <button
                            className={`flex-1 py-2 px-3 rounded-md font-medium text-white transition-colors flex items-center justify-center gap-2
                                      ${Number(set.complete) === 1 ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-800' : 'bg-blue-500 hover:bg-blue-600'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCompleteStatus(set.set_num, Number(set.complete));
                            }}
                        >
                            <FontAwesomeIcon icon={faCircleHalfStroke} />
                            <span>
                                {Number(set.complete) === 1 ? 'Incomplete' : 'Complete'}
                            </span>
                        </button>
                    )}
                    
                    <button
                        className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                        onClick={(e) => handleRemoveClick(set, e)}
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Remove</span>
                    </button>
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
            <div className="max-w-6xl mx-auto mb-8">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row p-6 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    <div className="flex-1 text-center p-3">
                        <div className="text-gray-600 text-sm mb-1">Sets</div>
                        <div className="text-2xl font-bold text-gray-800">{totalSets}</div>
                    </div>
                    
                    <div className="flex-1 text-center p-3">
                        <div className="text-gray-600 text-sm mb-1">Parts</div>
                        <div className="text-2xl font-bold text-gray-800">{totalParts.toLocaleString()}</div>
                    </div>
                    
                    <div className="flex-1 text-center p-3 relative">
                        <div className="text-gray-600 text-sm mb-1 flex items-center justify-center gap-1">
                            Minifigures
                            <FontAwesomeIcon
                                icon={faInfoCircle}
                                className="text-gray-400 cursor-help"
                                data-tooltip-id="tooltip-minifigures"
                            />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">{totalMinifigures.toLocaleString()}</div>
                        <Tooltip id="tooltip-minifigures" place="bottom" className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg">
                            <span>Minifigure count data is sourced from a third-party database and may be incomplete.</span>
                        </Tooltip>
                    </div>
                </div>
            </div>
        );
    };

    if (!userId) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Create an account and start your {isWishlist ? 'wishlist' : 'collection'} today!</h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">Register</Link>
                        <Link to="/login" className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors">Log In</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        );
    }

    if (!userExists) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded">
                    User not found.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={handleCancelRemove}
                onConfirm={handleConfirmRemove}
                set={confirmDialog.set}
                isWishlist={isWishlist}
            />

            {renderProfileSection()}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">
                    {user && Number(user.user_id) === Number(userId) 
                        ? `My ${isWishlist ? 'Wishlist' : 'Collection'}`
                        : `${profileData?.display_name || profileData?.username}'s ${isWishlist ? 'Wishlist' : 'Collection'}`
                    }
                </h2>
                
                <div className="flex flex-wrap items-center gap-4">
                    <PriceToggle 
                        showPrices={showPrices} 
                        onToggle={() => setShowPrices(!showPrices)} 
                    />
                    
                    {!isWishlist && profileData?.has_wishlist && (
                        <Link 
                            to={`/wishlist/${userId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg transition-colors"
                        >
                            <FontAwesomeIcon icon="gift" />
                            <span>View {user && Number(user.user_id) === Number(userId) ? 'My' : `${profileData?.display_name || profileData?.username}'s`} Wishlist</span>
                        </Link>
                    )}
                    
                    <button 
                        onClick={shareUrl} 
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg transition-colors"
                    >
                        <FontAwesomeIcon icon={copiedUrl ? "check" : "share"} />
                        <span>{copiedUrl ? 'Link Copied!' : `Share ${isWishlist ? 'Wishlist' : 'Collection'}`}</span>
                    </button>
                </div>
            </div>

            {sets.length > 0 ? (
                <>
                    {renderCollectionStats()}
                    
                    <div className="flex flex-wrap gap-8">
                        {groupAndSortThemes(sets, profileData?.favorite_theme).map(theme => (
                            <div 
                                key={theme.theme_id} 
                                className={`${theme.isFullWidth ? 'w-full' : 'w-full lg:w-[calc(50%-1rem)]'} bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden`}
                            >
                                <div 
                                    className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleCollapse(theme.theme_id)}
                                >
                                    <h3 className="text-lg font-semibold text-gray-800">{theme.theme_name}</h3>
                                    <FontAwesomeIcon 
                                        icon={collapsedThemes[theme.theme_id] ? "chevron-right" : "chevron-down"} 
                                        className={`text-gray-500 transition-transform duration-200 ${collapsedThemes[theme.theme_id] ? '' : 'transform rotate-0'}`}
                                    />
                                </div>
                                
                                {!collapsedThemes[theme.theme_id] && (
                                    <div className="p-6 flex flex-wrap justify-center gap-6">
                                        {theme.sets.map(set => renderSetCard(set))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
                    {user && Number(user.user_id) === Number(userId) ? (
                        <p className="text-gray-600">You haven't added any sets to your {isWishlist ? 'wishlist' : 'collection'} yet.</p>
                    ) : (
                        <p className="text-gray-600">This user hasn't added any sets to their {isWishlist ? 'wishlist' : 'collection'} yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserSetsView;