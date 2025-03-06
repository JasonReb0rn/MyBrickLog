import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
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
    faEye,
    faFilter,
    faSortDown,
    faSortUp,
    faSearch,
    faPuzzlePiece,
    faChevronDown,
    faChevronUp,
    faShareAlt,
    faBoxOpen,
    faBoxClosed,
    faUserCircle,
    faGift,
    faPiggyBank,
    faCheckCircle,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import { 
    faTwitter,
    faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, set, isWishlist }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-md w-11/12 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                        <FontAwesomeIcon icon={faTrash} />
                    </div>
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
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors" 
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
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
        data-tooltip-id="price-toggle-tooltip"
    >
        <FontAwesomeIcon icon={showPrices ? faEyeSlash : faEye} className="text-gray-600" />
        <FontAwesomeIcon icon={faDollarSign} className="text-green-600" />
        <span className="font-medium">{showPrices ? 'Hide' : 'Show'} Prices</span>
        <Tooltip id="price-toggle-tooltip" place="bottom" className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg">
            <span>{showPrices ? 'Hide' : 'Show'} set market values</span>
        </Tooltip>
    </button>
);

const UserSetsView = () => {
    const [profileData, setProfileData] = useState(null);
    const [sets, setSets] = useState([]);
    const [filteredSets, setFilteredSets] = useState([]);
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
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('theme');
    const [sortDirection, setSortDirection] = useState('asc');
    const [showFilters, setShowFilters] = useState(false);
    const [filterOptions, setFilterOptions] = useState({
        complete: 'all',
        decade: 'all'
    });
    
    const { userId } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isWishlist = location.pathname.includes('/wishlist/');
    const isOwner = user && Number(user.user_id) === Number(userId);

    // Consider sets with more than this threshold to be "large" themes
    const FULL_WIDTH_THRESHOLD = 7;

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
                    setFilteredSets(response.data.sets);
                    setProfileData(response.data.profile);
                }
            } catch (error) {
                console.error(`Error fetching user ${isWishlist ? 'wishlist' : 'collection'}:`, error);
            }
            setIsLoading(false);
        };

        fetchSets();
    }, [userId, isWishlist, endpoints.fetch]);

    useEffect(() => {
        const applyFiltersAndSort = () => {
            let results = [...sets];
            
            // Apply search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                results = results.filter(set => 
                    set.name.toLowerCase().includes(query) || 
                    set.set_num.toLowerCase().includes(query) ||
                    set.theme_name.toLowerCase().includes(query)
                );
            }
            
            // Apply completion filter
            if (!isWishlist && filterOptions.complete !== 'all') {
                results = results.filter(set => 
                    filterOptions.complete === 'complete' ? 
                    Number(set.complete) === 1 : 
                    Number(set.complete) === 0
                );
            }
            
            // Apply decade filter
            if (filterOptions.decade !== 'all') {
                const decade = parseInt(filterOptions.decade);
                results = results.filter(set => {
                    const year = parseInt(set.year);
                    return year >= decade && year < decade + 10;
                });
            }
            
            // Apply sorting
            results.sort((a, b) => {
                let valueA, valueB;
                
                switch (sortOption) {
                    case 'name':
                        valueA = a.name;
                        valueB = b.name;
                        return sortDirection === 'asc' ? 
                            valueA.localeCompare(valueB) : 
                            valueB.localeCompare(valueA);
                    
                    case 'year':
                        valueA = parseInt(a.year);
                        valueB = parseInt(b.year);
                        break;
                        
                    case 'pieces':
                        valueA = a.num_parts;
                        valueB = b.num_parts;
                        break;
                        
                    case 'price':
                        valueA = parseFloat(a.retail_price) || 0;
                        valueB = parseFloat(b.retail_price) || 0;
                        break;
                        
                    case 'value':
                        valueA = parseFloat(a.sealed_value) || 0;
                        valueB = parseFloat(b.sealed_value) || 0;
                        break;
                        
                    case 'theme':
                    default:
                        valueA = a.theme_name;
                        valueB = b.theme_name;
                        
                        // Secondary sort by year within theme
                        if (valueA === valueB) {
                            return sortDirection === 'asc' ? 
                                parseInt(a.year) - parseInt(b.year) : 
                                parseInt(b.year) - parseInt(a.year);
                        }
                        
                        return sortDirection === 'asc' ? 
                            valueA.localeCompare(valueB) : 
                            valueB.localeCompare(valueA);
                }
                
                return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
            });
            
            setFilteredSets(results);
        };
        
        applyFiltersAndSort();
    }, [sets, searchQuery, sortOption, sortDirection, filterOptions, isWishlist]);

    const handleImageError = (e, type = 'set') => {
        e.target.src = type === 'profile' ? '/images/lego_user.png' : '/images/lego_piece_questionmark.png';
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const shareUrl = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2500);
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
        if (isOwner) {
            setSelectedSet(selectedSet === set_num ? null : set_num);
        }
    };

    const toggleCollapse = (themeId) => {
        setCollapsedThemes(prev => ({ ...prev, [themeId]: !prev[themeId] }));
    };

    const handleSortChange = (option) => {
        if (sortOption === option) {
            // Toggle direction if clicking the same option
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new option and default to ascending
            setSortOption(option);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (option) => {
        if (sortOption !== option) return null;
        return sortDirection === 'asc' ? faSortUp : faSortDown;
    };

    const toggleFilters = () => {
        setShowFilters(prev => !prev);
    };

    const resetFilters = () => {
        setSearchQuery('');
        setFilterOptions({
            complete: 'all',
            decade: 'all'
        });
        setSortOption('theme');
        setSortDirection('asc');
    };

    const getDecadeOptions = () => {
        // Find the min and max year from the sets
        if (sets.length === 0) return [];
        
        const years = sets.map(set => parseInt(set.year));
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        // Round down to the decade
        const startDecade = Math.floor(minYear / 10) * 10;
        const endDecade = Math.floor(maxYear / 10) * 10;
        
        const decades = [];
        for (let decade = startDecade; decade <= endDecade; decade += 10) {
            decades.push(decade);
        }
        
        return decades;
    };

    const groupAndSortThemes = (sets, favoriteThemeId) => {
        // Only use for theme view
        if (sortOption !== 'theme') return null;
        
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
    
        // Sort the themes
        themesArray.sort((a, b) => {
            // Favorite theme always comes first
            if (a.theme_id === favoriteThemeId) return -1;
            if (b.theme_id === favoriteThemeId) return 1;
            
            if (sortDirection === 'asc') {
                return a.theme_name.localeCompare(b.theme_name);
            } else {
                return b.theme_name.localeCompare(a.theme_name);
            }
        });
        
        // Determine which themes should be full width
        themesArray.forEach(theme => {
            theme.isFullWidth = theme.sets.length >= FULL_WIDTH_THRESHOLD;
        });
    
        return themesArray;
    };

    const renderProfileSection = () => {
        if (!profileData) return null;
    
        const displayName = profileData.display_name || profileData.username;
        
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 h-32 relative">
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4 w-16 h-16 bg-yellow-400 rounded-full opacity-20"></div>
                    <div className="absolute top-16 right-24 w-8 h-8 bg-red-400 rounded-lg opacity-30 transform rotate-12"></div>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/images/lego_pattern_bg.png)', backgroundSize: '200px' }}></div>
                </div>
                
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-shrink-0 -mt-16 mb-4 md:mb-0 flex justify-center md:justify-start">
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                                <img 
                                    src={profileData.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${profileData.profile_picture}` : '/images/lego_user.png'}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => handleImageError(e, 'profile')}
                                />
                            </div>
                        </div>
                        
                        <div className="flex-grow md:pl-8 text-center md:text-left">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2 mt-4 md:mt-0">{displayName}</h1>
                            
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-3 mb-4">
                                {profileData.location && (
                                    <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-gray-700 text-sm">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 mr-2" /> 
                                        <span>{profileData.location}</span>
                                    </div>
                                )}
                                
                                {profileData.favorite_theme_name && (
                                    <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-gray-700 text-sm">
                                        <FontAwesomeIcon icon={faCube} className="text-blue-500 mr-2" /> 
                                        <span>{profileData.favorite_theme_name}</span>
                                    </div>
                                )}
                            </div>
                            
                            {profileData.bio && (
                                <p className="text-gray-600 mt-4 whitespace-pre-line max-w-3xl">{profileData.bio}</p>
                            )}
                        </div>
                        
                        <div className="mt-6 md:mt-0 md:ml-auto flex flex-col items-center md:items-end">
                            <div className="flex gap-3 mb-4">
                                {profileData.twitter_handle && (
                                    <a 
                                        href={`https://twitter.com/${profileData.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-blue-400 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors"
                                        style={{ margin: '4px' }}
                                    >
                                        <FontAwesomeIcon icon={faTwitter} />
                                    </a>
                                )}
                                
                                {profileData.youtube_channel && (
                                    <a 
                                        href={`https://youtube.com/${profileData.youtube_channel}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faYoutube} />
                                    </a>
                                )}
                                
                                {profileData.bricklink_store && (
                                    <a 
                                        href={`https://store.bricklink.com/${profileData.bricklink_store}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faStore} />
                                    </a>
                                )}
                                
                                {profileData.email && (
                                    <a 
                                        href={`mailto:${profileData.email}`}
                                        className="w-10 h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faEnvelope} />
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {isWishlist ? (
                                    <Link 
                                        to={`/collection/${userId}`}
                                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faBoxOpen} className="mr-2" />
                                        View Collection
                                    </Link>
                                ) : (
                                    profileData?.has_wishlist && (
                                        <Link 
                                            to={`/wishlist/${userId}`}
                                            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                                        >
                                            <FontAwesomeIcon icon={faGift} className="mr-2" />
                                            View Wishlist
                                        </Link>
                                    )
                                )}
                                
                                <button 
                                    onClick={shareUrl} 
                                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <FontAwesomeIcon icon={copiedUrl ? "check" : faShareAlt} className="mr-2" />
                                    {copiedUrl ? 'Copied!' : 'Share'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStatsCards = () => {
        if (isWishlist) return null;

        const totalSets = sets.reduce((acc, set) => acc + Number(set.quantity), 0);
        const totalUniqueModels = sets.length;
        const totalParts = sets.reduce((acc, set) => acc + (set.num_parts * Number(set.quantity)), 0);
        const totalMinifigures = sets.reduce((acc, set) => acc + (Number(set.num_minifigures) * Number(set.quantity)), 0);
        const completeCount = sets.filter(set => Number(set.complete) === 1).length;
        const totalValue = sets.reduce((acc, set) => {
            const value = parseFloat(set.sealed_value) || 0;
            return acc + (value * Number(set.quantity));
        }, 0);
        
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                            <FontAwesomeIcon icon={faBoxOpen} />
                        </div>
                        <div>
                            <h3 className="text-gray-500 font-medium text-sm">Total Sets</h3>
                            <p className="text-2xl font-bold text-gray-800">{totalSets}</p>
                            <p className="text-xs text-gray-500">{totalUniqueModels} unique models</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                            <FontAwesomeIcon icon={faPuzzlePiece} />
                        </div>
                        <div>
                            <h3 className="text-gray-500 font-medium text-sm">Total Pieces</h3>
                            <p className="text-2xl font-bold text-gray-800">{totalParts.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Building bricks</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex">
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mr-4">
                            <FontAwesomeIcon icon={faUserCircle} />
                        </div>
                        <div>
                            <h3 className="text-gray-500 font-medium text-sm">Minifigures</h3>
                            <p className="text-2xl font-bold text-gray-800">{totalMinifigures.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                                Little people
                                <FontAwesomeIcon 
                                    icon={faInfoCircle} 
                                    className="ml-1 text-gray-400 cursor-help"
                                    data-tooltip-id="tooltip-minifigures"
                                />
                                <Tooltip id="tooltip-minifigures" place="bottom" className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg">
                                    <span>Minifigure count data is sourced from a third-party database and may be incomplete.</span>
                                </Tooltip>
                            </p>
                        </div>
                    </div>
                </div>
                
                {showPrices && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
                                <FontAwesomeIcon icon={faPiggyBank} />
                            </div>
                            <div>
                                <h3 className="text-gray-500 font-medium text-sm">Collection Value</h3>
                                <p className="text-2xl font-bold text-gray-800">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                <p className="text-xs text-gray-500">Estimated market value</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSetCard = (set) => (
        <div
            key={set.set_num}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md
                      ${!isWishlist && Number(set.complete) === 0 ? 'border-amber-400' : 'border-gray-200'} 
                      ${selectedSet === set.set_num ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
            onClick={() => toggleSelectSet(set.set_num)}
        >
            <div className="relative">
                <div className="p-2 h-48 flex items-center justify-center relative">
                    {!loadedImages[set.set_num] && (
                        <Skeleton height={180} width="100%" />
                    )}
                    <img
                        src={set.img_url}
                        alt={set.name}
                        className={`h-full object-contain max-w-full ${loadedImages[set.set_num] ? 'opacity-100' : 'opacity-0'}`}
                        onError={handleImageError}
                        onLoad={() => handleImageLoad(set.set_num)}
                        style={{ transition: 'opacity 0.3s' }}
                    />
                    
                    {/* Quantity badge - positioned inside the image container */}
                    {!isWishlist && set.quantity > 1 && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-gray-800 h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">
                            ×{set.quantity}
                        </div>
                    )}
                </div>

                {/* Set details */}
                <div className="p-4 bg-gray-50/50">
                    <h3 className="font-medium text-gray-800 mb-1 line-clamp-2 h-12">
                        {set.name}
                    </h3>
                    
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 font-mono">{set.set_num}</span>
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded-lg">{set.year}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                        <div className="text-xs bg-red-50 text-red-700 rounded-full px-2 py-1 flex items-center">
                            <FontAwesomeIcon icon={faPuzzlePiece} className="mr-1" size="xs" />
                            <span>{set.num_parts.toLocaleString()}</span>
                        </div>
                        
                        {set.num_minifigures > 0 && (
                            <div className="text-xs bg-yellow-50 text-yellow-700 rounded-full px-2 py-1 flex items-center">
                                <FontAwesomeIcon icon={faUserCircle} className="mr-1" size="xs" />
                                <span>{set.num_minifigures}</span>
                            </div>
                        )}
                        
                        {!isWishlist && (
                            <div className={`text-xs rounded-full px-2 py-1 flex items-center ${Number(set.complete) === 1 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                <FontAwesomeIcon icon={Number(set.complete) === 1 ? faCheckCircle : faCircleHalfStroke} className="mr-1" size="xs" />
                                <span>{Number(set.complete) === 1 ? 'Complete' : 'Incomplete'}</span>
                            </div>
                        )}
                    </div>
                    
                    {showPrices && (
                        <div className="border-t border-gray-100 pt-3 mb-3">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                {set.retail_price && (
                                    <div>
                                        <div className="text-xs text-gray-500">Retail</div>
                                        <div className="font-medium">${Number(set.retail_price).toFixed(2)}</div>
                                    </div>
                                )}
                                
                                {set.sealed_value && (
                                    <div>
                                        <div className="text-xs text-gray-500">Sealed</div>
                                        <div className="font-medium text-green-600">${Number(set.sealed_value).toFixed(2)}</div>
                                    </div>
                                )}
                                
                                {set.used_value && (
                                    <div>
                                        <div className="text-xs text-gray-500">Used</div>
                                        <div className="font-medium text-blue-600">${Number(set.used_value).toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {renderSetActions(set)}
                </div>
            </div>
        </div>
    );

    const renderSetActions = (set) => {
        if (!isOwner || selectedSet !== set.set_num) {
            return null;
        }

        return (
            <div className="mt-4 pt-4 border-t border-gray-200">
                {!isWishlist && (
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <button 
                            className="w-8 h-8 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm"
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
                            className="w-8 h-8 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(set.set_num, Number(set.quantity) + 1);
                            }}
                        >
                            +
                        </button>
                    </div>
                )}
                
                <div className="flex flex-col gap-2">
                    {isWishlist ? (
                        <button
                            className="py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                moveToCollection(set.set_num);
                            }}
                        >
                            <FontAwesomeIcon icon={faBoxOpen} className="mr-2" />
                            Move to Collection
                        </button>
                    ) : (
                        <button
                            className={`py-2 px-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center
                                      ${Number(set.complete) === 1 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-400 hover:bg-amber-500 text-gray-800'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCompleteStatus(set.set_num, Number(set.complete));
                            }}
                        >
                            <FontAwesomeIcon icon={Number(set.complete) === 1 ? faCircleHalfStroke : faCheckCircle} className="mr-2" />
                            <span>
                                Mark as {Number(set.complete) === 1 ? 'Incomplete' : 'Complete'}
                            </span>
                        </button>
                    )}
                    
                    <button
                        className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center"
                        onClick={(e) => handleRemoveClick(set, e)}
                    >
                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                        <span>Remove</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderThemeView = (themesData) => {
        if (!themesData) return null;
        
        // Arrange themes to put full-width ones first
        const fullWidthThemes = [];
        const halfWidthThemes = [];
        
        themesData.forEach(theme => {
            if (theme.isFullWidth) {
                fullWidthThemes.push(theme);
            } else {
                halfWidthThemes.push(theme);
            }
        });
        
        // Pair up half-width themes
        const rows = [];
        for (let i = 0; i < halfWidthThemes.length; i += 2) {
            rows.push(halfWidthThemes.slice(i, i + 2));
        }
        
        return (
            <div className="flex flex-col gap-6">
                {/* Full width themes */}
                {fullWidthThemes.map(theme => (
                    <div 
                        key={theme.theme_id} 
                        className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        <div 
                            className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex justify-between items-center cursor-pointer"
                            onClick={() => toggleCollapse(theme.theme_id)}
                        >
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faCube} className="mr-3 text-yellow-400" />
                                <h3 className="text-lg font-semibold">{theme.theme_name}</h3>
                                <span className="ml-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {theme.sets.length} {theme.sets.length === 1 ? 'set' : 'sets'}
                                </span>
                            </div>
                            <FontAwesomeIcon 
                                icon={collapsedThemes[theme.theme_id] ? faChevronDown : faChevronUp} 
                                className="transition-transform duration-200"
                            />
                        </div>
                        
                        {!collapsedThemes[theme.theme_id] && (
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {theme.sets.map(set => renderSetCard(set))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Half width themes in pairs */}
                {rows.map((row, index) => (
                    <div key={`row-${index}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {row.map(theme => (
                            <div 
                                key={theme.theme_id} 
                                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div 
                                    className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleCollapse(theme.theme_id)}
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faCube} className="mr-3 text-yellow-400" />
                                        <h3 className="text-lg font-semibold">{theme.theme_name}</h3>
                                        <span className="ml-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {theme.sets.length} {theme.sets.length === 1 ? 'set' : 'sets'}
                                        </span>
                                    </div>
                                    <FontAwesomeIcon 
                                        icon={collapsedThemes[theme.theme_id] ? faChevronDown : faChevronUp} 
                                        className="transition-transform duration-200"
                                    />
                                </div>
                                
                                {!collapsedThemes[theme.theme_id] && (
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {theme.sets.map(set => renderSetCard(set))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    const renderGridView = (sets) => {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sets.map(set => renderSetCard(set))}
            </div>
        );
    };

    const renderEmptyState = () => {
        if (searchQuery || filterOptions.complete !== 'all' || filterOptions.decade !== 'all') {
            return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No sets found</h3>
                    <p className="text-gray-600 mb-6">Try adjusting your filters or search terms.</p>
                    <button 
                        onClick={resetFilters}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FontAwesomeIcon icon={isWishlist ? faGift : faBoxOpen} className="text-gray-400 text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {isOwner ? 
                        `You haven't added any sets to your ${isWishlist ? 'wishlist' : 'collection'} yet.` : 
                        `This user hasn't added any sets to their ${isWishlist ? 'wishlist' : 'collection'} yet.`}
                </h3>
                
                {isOwner && (
                    <div className="mt-6">
                        <Link 
                            to="/themes" 
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            {`Add Sets to Your ${isWishlist ? 'Wishlist' : 'Collection'}`}
                        </Link>
                    </div>
                )}
            </div>
        );
    };

    if (!userId) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center bg-white rounded-xl shadow-md p-12">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FontAwesomeIcon icon={isWishlist ? faGift : faBoxOpen} className="text-red-600 text-3xl" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                        Start Your LEGO® {isWishlist ? 'Wishlist' : 'Collection'}
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        Join MyBrickLog to keep track of your LEGO® sets, organize your collection, 
                        and connect with other brick enthusiasts.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link 
                            to="/register" 
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-md"
                        >
                            Create an Account
                        </Link>
                        <Link 
                            to="/login" 
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors shadow-md"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <div className="inline-block">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-gray-600">Loading {isWishlist ? 'wishlist' : 'collection'}...</p>
            </div>
        );
    }

    if (!userExists) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <div className="bg-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
                    <p className="font-medium">User not found</p>
                    <p className="text-sm mt-1">The user you're looking for doesn't exist or has been removed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <ConfirmationDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={handleCancelRemove}
                    onConfirm={handleConfirmRemove}
                    set={confirmDialog.set}
                    isWishlist={isWishlist}
                />

                {renderProfileSection()}
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FontAwesomeIcon icon={isWishlist ? faGift : faBoxOpen} className="mr-3 text-red-600" />
                        {isOwner 
                            ? `My ${isWishlist ? 'Wishlist' : 'Collection'}`
                            : `${profileData?.display_name || profileData?.username}'s ${isWishlist ? 'Wishlist' : 'Collection'}`
                        }
                    </h2>
                    
                    {sets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <PriceToggle 
                                showPrices={showPrices} 
                                onToggle={() => setShowPrices(!showPrices)} 
                            />
                            
                            <button
                                onClick={toggleFilters}
                                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm font-medium"
                            >
                                <FontAwesomeIcon icon={faFilter} className={filterOptions.complete !== 'all' || filterOptions.decade !== 'all' || searchQuery ? 'text-red-600' : 'text-gray-600'} />
                                <span>Filters</span>
                                {(filterOptions.complete !== 'all' || filterOptions.decade !== 'all' || searchQuery) && (
                                    <span className="w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center">
                                        {(filterOptions.complete !== 'all' ? 1 : 0) + 
                                        (filterOptions.decade !== 'all' ? 1 : 0) + 
                                        (searchQuery ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Cards for Collection */}
                {sets.length > 0 && renderStatsCards()}
                
                {/* Filters Section */}
                {sets.length > 0 && showFilters && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                            <div className="flex-grow">
                                <h3 className="font-medium text-gray-800 mb-3">Search & Filter</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="relative">
                                        <label className="block text-sm text-gray-600 mb-1">Search</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search sets..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                    </div>
                                    
                                    {!isWishlist && (
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Status</label>
                                            <select
                                                value={filterOptions.complete}
                                                onChange={(e) => setFilterOptions({...filterOptions, complete: e.target.value})}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                            >
                                                <option value="all">All Sets</option>
                                                <option value="complete">Complete Only</option>
                                                <option value="incomplete">Incomplete Only</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Decade</label>
                                        <select
                                            value={filterOptions.decade}
                                            onChange={(e) => setFilterOptions({...filterOptions, decade: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="all">All Decades</option>
                                            {getDecadeOptions().map(decade => (
                                                <option key={decade} value={decade}>{decade}s</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                                <h3 className="font-medium text-gray-800 mb-3">Sort By</h3>
                                
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleSortChange('theme')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                                            sortOption === 'theme' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Theme
                                        {getSortIcon('theme') && (
                                            <FontAwesomeIcon icon={getSortIcon('theme')} className="ml-2" />
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleSortChange('name')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                                            sortOption === 'name' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Name
                                        {getSortIcon('name') && (
                                            <FontAwesomeIcon icon={getSortIcon('name')} className="ml-2" />
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleSortChange('year')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                                            sortOption === 'year' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Year
                                        {getSortIcon('year') && (
                                            <FontAwesomeIcon icon={getSortIcon('year')} className="ml-2" />
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleSortChange('pieces')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                                            sortOption === 'pieces' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Pieces
                                        {getSortIcon('pieces') && (
                                            <FontAwesomeIcon icon={getSortIcon('pieces')} className="ml-2" />
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleSortChange('value')}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                                            sortOption === 'value' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Value
                                        {getSortIcon('value') && (
                                            <FontAwesomeIcon icon={getSortIcon('value')} className="ml-2" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {(searchQuery || filterOptions.complete !== 'all' || filterOptions.decade !== 'all') && (
                            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">{filteredSets.length}</span> set{filteredSets.length === 1 ? '' : 's'} found
                                </div>
                                
                                <button
                                    onClick={resetFilters}
                                    className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content - Full width for set display */}
            {filteredSets.length > 0 ? (
                <div className="max-w-7xl mx-auto mb-8">
                    {/* Show theme view for theme sort, grid view for other sorts */}
                    {sortOption === 'theme' ? 
                        renderThemeView(groupAndSortThemes(filteredSets, profileData?.favorite_theme)) : 
                        renderGridView(filteredSets)
                    }
                </div>
            ) : (
                <div className="max-w-7xl mx-auto">
                    {renderEmptyState()}
                </div>
            )}
        </div>
    );
};

export default UserSetsView;