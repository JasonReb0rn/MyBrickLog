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
    faBox,
    faUserCircle,
    faGift,
    faPiggyBank,
    faCheckCircle,
    faPlus,
    faTimes,
    faExclamationTriangle,
    faSync
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

// New component for set status management
const SetStatusModal = ({ isOpen, onClose, set, onUpdateQuantity, onUpdateComplete, onUpdateSealed, setSets }) => {    // Hooks remain unchanged
    const { user } = useAuth();
    const [quantity, setQuantity] = useState(set ? Number(set.quantity) : 0);
    const [completeCount, setCompleteCount] = useState(set ? Number(set.complete) : 0);
    const [sealedCount, setSealedCount] = useState(set ? Number(set.sealed) : 0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    
    // New minifigure-related state
    const [minifigs, setMinifigs] = useState([]);
    const [loadingMinifigs, setLoadingMinifigs] = useState(false);
    const [showMinifigs, setShowMinifigs] = useState(false);
    const [updatingMinifigs, setUpdatingMinifigs] = useState({});

    useEffect(() => {
        if (set) {
            setQuantity(Number(set.quantity));
            setCompleteCount(Number(set.complete));
            setSealedCount(Number(set.sealed));
            setError('');
            
            // Fetch minifigures for this set
            fetchMinifigures();
        }
    }, [set]);

    // Function to fetch minifigures for the current set
    const fetchMinifigures = async () => {
        if (!set) return;
        
        setLoadingMinifigs(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_set_minifigures.php?set_num=${set.set_num}`, {
                withCredentials: true
            });
            
            if (response.data.error) {
                console.error('Error fetching minifigures:', response.data.error);
                setMinifigs([]);
            } else {
                setMinifigs(response.data.minifigs || []);
            }
        } catch (error) {
            console.error('Error fetching minifigures:', error);
            setMinifigs([]);
        }
        setLoadingMinifigs(false);
    };

    // Function to update individual minifigure quantity
    const updateMinifigQuantity = async (figNum, newQuantity) => {
        setUpdatingMinifigs(prev => ({ ...prev, [figNum]: true }));
        
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/update_collection_minifigure.php`, {
                user_id: Number(user.user_id),
                set_num: set.set_num,
                fig_num: figNum,
                quantity_owned: newQuantity
            }, {
                withCredentials: true
            });
            
            if (response.data.success) {
                // Update the local minifigs state
                setMinifigs(prev => prev.map(minifig => 
                    minifig.fig_num === figNum 
                        ? { ...minifig, owned_quantity: newQuantity }
                        : minifig
                ));
            } else {
                setError('Failed to update minifigure quantity');
            }
        } catch (error) {
            console.error('Error updating minifigure:', error);
            setError('Failed to update minifigure quantity');
        }
        
        setUpdatingMinifigs(prev => ({ ...prev, [figNum]: false }));
    };
    
    if (!isOpen || !set) return null;

    const validateAndUpdate = () => {
        // Validation logic
        if (completeCount > quantity) {
            setError('Complete count cannot exceed total quantity');
            return;
        }
        
        if (sealedCount > quantity) {
            setError('Sealed count cannot exceed total quantity');
            return;
        }
    
        // Assume sealed sets are always complete
        let adjustedCompleteCount = completeCount;
        if (sealedCount > completeCount) {
            adjustedCompleteCount = sealedCount;
            setCompleteCount(sealedCount);
        }
    
        setIsUpdating(true);
        setError('');
    
        // Create a single set of updates to apply after all API calls complete
        const updatedSet = {
            ...set,
            quantity: quantity.toString(),
            complete: adjustedCompleteCount.toString(),
            sealed: sealedCount.toString()
        };
    
        // Update quantity first
        onUpdateQuantity(set.set_num, quantity)
            .then(() => onUpdateComplete(set.set_num, adjustedCompleteCount))
            .then(() => onUpdateSealed(set.set_num, sealedCount))
            .then(() => {
                // This is now properly using the setSets function from props
                setSets(prevSets => prevSets.map(s => 
                    s.set_num === set.set_num ? updatedSet : s
                ));
                setIsUpdating(false);
                onClose();
            })
            .catch(err => {
                setError('Failed to update. Please try again.');
                setIsUpdating(false);
                console.error('Error updating set status:', err);
            });
    };

    const increaseQuantity = () => {
        setQuantity(prev => prev + 1);

        // Automatically increase complete count as well, assuming new sets are complete by default
        setCompleteCount(prev => prev + 1);

        // Note: We DON'T automatically increase sealed count as new sets could be either sealed or opened
    };

    const decreaseQuantity = () => {
        if (quantity <= 1) return;
        
        const newQuantity = quantity - 1;
        setQuantity(newQuantity);
        
        // Adjust complete and sealed counts if they exceed the new quantity
        if (completeCount > newQuantity) {
            setCompleteCount(newQuantity);
        }
        
        if (sealedCount > newQuantity) {
            setSealedCount(newQuantity);
        }
    };

    const increaseComplete = () => {
        if (completeCount >= quantity) return;
        setCompleteCount(prev => prev + 1);
    };

    const decreaseComplete = () => {
        if (completeCount <= 0) return;
        
        const newCompleteCount = completeCount - 1;
        setCompleteCount(newCompleteCount);
        
        // Ensure sealed count doesn't exceed complete count
        // (assuming you can't have sealed sets that are incomplete)
        if (sealedCount > newCompleteCount) {
            setSealedCount(newCompleteCount);
        }
    };

    const increaseSealed = () => {
        if (sealedCount >= quantity) return;
        
        const newSealedCount = sealedCount + 1;
        setSealedCount(newSealedCount);
        
        // Sealed sets are always complete
        if (newSealedCount > completeCount) {
            setCompleteCount(newSealedCount);
        }
    };

    const decreaseSealed = () => {
        if (sealedCount <= 0) return;
        setSealedCount(prev => prev - 1);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Enhanced header with set image */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Update Set Status</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                
                <div className="mb-6 flex items-start">
                    {/* Add small set image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-3">
                        <img 
                            src={set.img_url} 
                            alt={set.name} 
                            className="w-full h-full object-contain"
                            onError={e => e.target.src = '/images/lego_piece_questionmark.png'}
                        />
                    </div>
                    <div>
                        <h3 className="font-medium text-lg mb-1 text-gray-800">{set.name}</h3>
                        <p className="text-sm text-gray-600">Set #{set.set_num}</p>
                    </div>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                        {error}
                    </div>
                )}
                
                <div className="space-y-6">
                    {/* Quantity Control - enhanced styling */}
                    <div className="border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-medium text-gray-800">Quantity</span>
                            <span className="text-sm text-gray-500">How many of this set do you own?</span>
                        </div>
                        <div className="flex items-center justify-center bg-gray-50 p-3 rounded-lg">
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                                onClick={decreaseQuantity}
                                disabled={quantity <= 1}
                            >
                                <FontAwesomeIcon icon={faPlus} className="transform rotate-45" />
                            </button>
                            <span className="mx-6 text-2xl font-bold">{quantity}</span>
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center"
                                onClick={increaseQuantity}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Complete Status Control - enhanced styling */}
                    <div className="border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-medium text-gray-800">Complete Sets</span>
                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                                <span className="text-blue-700 font-medium">{completeCount}</span>
                                <span className="text-gray-500">of</span>
                                <span className="text-blue-700 font-medium">{quantity}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center bg-gray-50 p-3 rounded-lg">
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                                onClick={decreaseComplete}
                                disabled={completeCount <= 0}
                            >
                                <FontAwesomeIcon icon={faPlus} className="transform rotate-45" />
                            </button>
                            <div className="mx-4 flex flex-col items-center">
                                <span className="text-2xl font-bold">{completeCount}</span>
                                <div className="flex gap-2 mt-1">
                                    <button 
                                        className="text-xs bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
                                        onClick={() => setCompleteCount(0)}
                                        disabled={completeCount === 0}
                                    >
                                        None
                                    </button>
                                    <button 
                                        className="text-xs bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
                                        onClick={() => setCompleteCount(quantity)}
                                        disabled={completeCount === quantity}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                                onClick={increaseComplete}
                                disabled={completeCount >= quantity}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 text-center">
                            <p>Sets with all pieces and instructions</p>
                        </div>
                    </div>
                    
                    {/* Sealed Status Control - enhanced styling */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-medium text-gray-800">Sealed Sets</span>
                            <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                                <span className="text-green-700 font-medium">{sealedCount}</span>
                                <span className="text-gray-500">of</span>
                                <span className="text-green-700 font-medium">{quantity}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center bg-gray-50 p-3 rounded-lg">
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                                onClick={decreaseSealed}
                                disabled={sealedCount <= 0}
                            >
                                <FontAwesomeIcon icon={faPlus} className="transform rotate-45" />
                            </button>
                            <div className="mx-4 flex flex-col items-center">
                                <span className="text-2xl font-bold">{sealedCount}</span>
                                <div className="flex gap-2 mt-1">
                                    <button 
                                        className="text-xs bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
                                        onClick={() => setSealedCount(0)}
                                        disabled={sealedCount === 0}
                                    >
                                        None
                                    </button>
                                    <button 
                                        className="text-xs bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
                                        onClick={() => {
                                            setSealedCount(quantity);
                                            setCompleteCount(quantity); // Sealed sets are complete
                                        }}
                                        disabled={sealedCount === quantity}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>
                            <button 
                                className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                                onClick={increaseSealed}
                                disabled={sealedCount >= quantity}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 text-center">
                            <p>Sets in unopened, original packaging</p>
                            {sealedCount > completeCount && (
                                <p className="text-amber-600 mt-1">Note: Sealed sets will be counted as complete</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Minifigure Management Section */}
                    {minifigs.length > 0 && (
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">Minifigures</span>
                                    <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                                        {minifigs.length} figures
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowMinifigs(!showMinifigs)}
                                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                                >
                                    <FontAwesomeIcon icon={showMinifigs ? faChevronUp : faChevronDown} />
                                    <span>{showMinifigs ? 'Hide' : 'Show'} Details</span>
                                </button>
                            </div>
                            
                            {loadingMinifigs ? (
                                <div className="text-center py-8">
                                    <FontAwesomeIcon icon={faSync} className="animate-spin text-gray-400 text-xl mb-2" />
                                    <p className="text-gray-500">Loading minifigures...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Minifigure Summary */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <div className="text-sm text-green-600 font-medium">Complete</div>
                                            <div className="text-lg font-bold text-green-800">
                                                {minifigs.filter(m => (m.owned_quantity || 0) >= (m.required_quantity * quantity)).length}
                                                <span className="text-sm font-normal"> / {minifigs.length}</span>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 p-3 rounded-lg">
                                            <div className="text-sm text-amber-600 font-medium">Missing</div>
                                            <div className="text-lg font-bold text-amber-800">
                                                {minifigs.filter(m => (m.owned_quantity || 0) < (m.required_quantity * quantity)).length}
                                                <span className="text-sm font-normal"> figures</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Detailed Minifigure List */}
                                    {showMinifigs && (
                                        <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                                            {minifigs.map(minifig => {
                                                const requiredTotal = minifig.required_quantity * quantity;
                                                const owned = minifig.owned_quantity || 0;
                                                const isComplete = owned >= requiredTotal;
                                                const isUpdating = updatingMinifigs[minifig.fig_num];
                                                
                                                return (
                                                    <div key={minifig.fig_num} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                                        <div className="flex items-center gap-3">
                                                            {/* Minifigure Image */}
                                                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                                <img 
                                                                    src={minifig.img_url} 
                                                                    alt={minifig.name}
                                                                    className="w-full h-full object-contain"
                                                                    onError={e => e.target.src = '/images/lego_piece_questionmark.png'}
                                                                />
                                                            </div>
                                                            
                                                            {/* Minifigure Info */}
                                                            <div className="flex-grow min-w-0">
                                                                <h4 className="font-medium text-gray-800 truncate text-sm">{minifig.name}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                                        isComplete 
                                                                            ? 'bg-green-50 text-green-700' 
                                                                            : 'bg-amber-50 text-amber-700'
                                                                    }`}>
                                                                        {owned} / {requiredTotal} owned
                                                                    </span>
                                                                    {isComplete && (
                                                                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xs" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Quantity Controls */}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    className="w-7 h-7 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 transition-colors flex items-center justify-center text-sm"
                                                                    onClick={() => updateMinifigQuantity(minifig.fig_num, Math.max(0, owned - 1))}
                                                                    disabled={isUpdating || owned <= 0}
                                                                >
                                                                    −
                                                                </button>
                                                                <div className="w-8 text-center text-sm font-medium">
                                                                    {isUpdating ? (
                                                                        <FontAwesomeIcon icon={faSync} className="animate-spin text-gray-400" />
                                                                    ) : (
                                                                        owned
                                                                    )}
                                                                </div>
                                                                <button
                                                                    className="w-7 h-7 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 transition-colors flex items-center justify-center text-sm"
                                                                    onClick={() => updateMinifigQuantity(minifig.fig_num, owned + 1)}
                                                                    disabled={isUpdating}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                    <button 
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm" 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm flex items-center"
                        onClick={validateAndUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <>
                                <FontAwesomeIcon icon={faSync} className="mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update'
                        )}
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
    const [statusModal, setStatusModal] = useState({
        isOpen: false,
        set: null
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('theme');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [filterOptions, setFilterOptions] = useState({
        complete: 'all',
        sealed: 'all',
        decade: 'all'
    });
    // New state for tracking pending updates
    const [pendingUpdates, setPendingUpdates] = useState({});
    
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
        updateComplete: 'update_set_complete_count.php',
        updateSealed: 'update_set_sealed_count.php'
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
                results = results.filter(set => {
                    const completeCount = Number(set.complete);
                    const totalCount = Number(set.quantity);
                    
                    if (filterOptions.complete === 'complete') {
                        return completeCount === totalCount; // All copies are complete
                    } else if (filterOptions.complete === 'incomplete') {
                        return completeCount < totalCount; // At least one copy is incomplete
                    } else if (filterOptions.complete === 'mixed') {
                        return completeCount > 0 && completeCount < totalCount; // Some complete, some not
                    }
                    return true;
                });
            }
            
            // Apply sealed filter
            if (!isWishlist && filterOptions.sealed !== 'all') {
                results = results.filter(set => {
                    const sealedCount = Number(set.sealed);
                    const totalCount = Number(set.quantity);
                    
                    if (filterOptions.sealed === 'sealed') {
                        return sealedCount === totalCount; // All copies are sealed
                    } else if (filterOptions.sealed === 'opened') {
                        return sealedCount < totalCount; // At least one copy is opened
                    } else if (filterOptions.sealed === 'mixed') {
                        return sealedCount > 0 && sealedCount < totalCount; // Some sealed, some not
                    }
                    return true;
                });
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
    
    // Helper function to find original set data for reversion
    const getOriginalSet = (set_num) => {
        return sets.find(set => set.set_num === set_num);
    };

    // Modified to handle optimistic updates
    const updateQuantity = async (set_num, newQuantity) => {
        if (isWishlist) return Promise.reject("Cannot update quantity for wishlist items");
        
        // Set pending update flag
        setPendingUpdates(prev => ({
            ...prev,
            [set_num]: {
                ...prev[set_num],
                quantity: true
            }
        }));
        
        // Store current state for potential rollback
        const originalSet = { ...getOriginalSet(set_num) };
        
        // Optimistic update with proper constraints
        setSets(prevSets => prevSets.map(set => {
            if (set.set_num === set_num) {
                // Create a new set object with updated values
                const updatedSet = { ...set, quantity: newQuantity };
                
                // Adjust complete and sealed counts if they now exceed the new quantity
                if (Number(set.complete) > newQuantity) {
                    updatedSet.complete = newQuantity.toString();
                }
                
                if (Number(set.sealed) > newQuantity) {
                    updatedSet.sealed = newQuantity.toString();
                }
                
                return updatedSet;
            }
            return set;
        }));
        
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.updateQuantity}`,
                { user_id: Number(userId), set_num, quantity: newQuantity },
                { withCredentials: true }
            );
            
            if (response.data.success) {
                // Update with server confirmed values - convert all values to strings to match API format
                setSets(prevSets => prevSets.map(set => 
                    set.set_num === set_num ? { 
                        ...set, 
                        quantity: response.data.quantity.toString(),
                        complete: response.data.complete_count.toString(),
                        sealed: response.data.sealed_count.toString()
                    } : set
                ));
                return Promise.resolve();
            } else {
                throw new Error(response.data.error || "Failed to update quantity");
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            
            // Revert to original data
            setSets(prev => prev.map(set => 
                set.set_num === set_num ? originalSet : set
            ));
            
            return Promise.reject(error);
        } finally {
            // Clear pending update flag
            setPendingUpdates(prev => ({
                ...prev,
                [set_num]: {
                    ...prev[set_num],
                    quantity: false
                }
            }));
        }
    };

    const updateCompleteCount = async (set_num, newCount) => {
        if (isWishlist) return Promise.reject("Cannot update complete count for wishlist items");
    
        // Set pending update flag
        setPendingUpdates(prev => ({
            ...prev,
            [set_num]: {
                ...prev[set_num],
                complete: true
            }
        }));
        
        // Store current state for potential rollback
        const originalSet = { ...getOriginalSet(set_num) };
        
        // Optimistic update - ensure consistent string/number handling
        setSets(prevSets => prevSets.map(set => 
            set.set_num === set_num ? { ...set, complete: newCount.toString() } : set
        ));
    
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.updateComplete}`,
                { user_id: Number(userId), set_num, complete_count: newCount },
                { withCredentials: true }
            );
            
            if (response.data.success) {
                // Update with server confirmed values
                setSets(prevSets => prevSets.map(set => 
                    set.set_num === set_num ? { 
                        ...set, 
                        complete: response.data.complete_count.toString() 
                    } : set
                ));
                return Promise.resolve();
            } else {
                throw new Error(response.data.error || "Failed to update complete count");
            }
        } catch (error) {
            console.error('Error updating complete count:', error);
            
            // Revert to original data
            setSets(prev => prev.map(set => 
                set.set_num === set_num ? originalSet : set
            ));
            
            return Promise.reject(error);
        } finally {
            // Clear pending update flag
            setPendingUpdates(prev => ({
                ...prev,
                [set_num]: {
                    ...prev[set_num],
                    complete: false
                }
            }));
        }
    };

    const updateSealedCount = async (set_num, newCount) => {
        if (isWishlist) return Promise.reject("Cannot update sealed count for wishlist items");
    
        // Set pending update flag
        setPendingUpdates(prev => ({
            ...prev,
            [set_num]: {
                ...prev[set_num],
                sealed: true
            }
        }));
        
        // Store current state for potential rollback
        const originalSet = { ...getOriginalSet(set_num) };
        
        // Optimistic update - ensure consistent string/number handling
        setSets(prevSets => prevSets.map(set => 
            set.set_num === set_num ? { ...set, sealed: newCount.toString() } : set
        ));
    
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/${endpoints.updateSealed}`,
                { user_id: Number(userId), set_num, sealed_count: newCount },
                { withCredentials: true }
            );
            
            if (response.data.success) {
                // Update with server confirmed values
                setSets(prevSets => prevSets.map(set => 
                    set.set_num === set_num ? { 
                        ...set, 
                        sealed: response.data.sealed_count.toString() 
                    } : set
                ));
                return Promise.resolve();
            } else {
                throw new Error(response.data.error || "Failed to update sealed count");
            }
        } catch (error) {
            console.error('Error updating sealed count:', error);
            
            // Revert to original data
            setSets(prev => prev.map(set => 
                set.set_num === set_num ? originalSet : set
            ));
            
            return Promise.reject(error);
        } finally {
            // Clear pending update flag
            setPendingUpdates(prev => ({
                ...prev,
                [set_num]: {
                    ...prev[set_num],
                    sealed: false
                }
            }));
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
    
    // New method to open the status modal
    const openStatusModal = (set) => {
        setStatusModal({
            isOpen: true,
            set: set
        });
    };

    const closeStatusModal = () => {
        setStatusModal({
            isOpen: false,
            set: null
        });
    };

    const toggleSelectSet = (set_num) => {
        if (isOwner) {
            if (selectedSet === set_num) {
                setSelectedSet(null);
            } else {
                setSelectedSet(set_num);
            }
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
            sealed: 'all',
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

    const renderSetCard = (set) => (
        <div
            key={set.set_num}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md
                      ${!isWishlist && Number(set.complete) < Number(set.quantity) ? 'border-amber-400' : 'border-gray-200'} 
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
                <div className="p-4 pt-0 bg-gray-50/50">
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
                            <>
                                <div className={`text-xs rounded-full px-2 py-1 flex items-center ${
                                    Number(set.complete) === Number(set.quantity) 
                                    ? 'bg-green-50 text-green-700' 
                                    : Number(set.complete) > 0 
                                      ? 'bg-blue-50 text-blue-700' 
                                      : 'bg-amber-50 text-amber-700'
                                }`}>
                                    <FontAwesomeIcon 
                                        icon={
                                            Number(set.complete) === Number(set.quantity) 
                                            ? faCheckCircle 
                                            : faCircleHalfStroke
                                        } 
                                        className="mr-1" 
                                        size="xs" 
                                    />
                                    <span>
                                        {Number(set.complete) === Number(set.quantity) 
                                            ? 'Complete' 
                                            : Number(set.complete) > 0 
                                              ? `${set.complete}/${set.quantity} Complete`
                                              : 'Incomplete'
                                        }
                                    </span>
                                </div>
                                
                                <div className={`text-xs rounded-full px-2 py-1 flex items-center ${
                                    Number(set.sealed) === Number(set.quantity) 
                                    ? 'bg-green-50 text-green-700' 
                                    : Number(set.sealed) > 0 
                                      ? 'bg-blue-50 text-blue-700' 
                                      : 'bg-gray-50 text-gray-700'
                                }`}>
                                    <FontAwesomeIcon 
                                        icon={
                                            Number(set.sealed) > 0 
                                            ? faBox 
                                            : faBoxOpen
                                        } 
                                        className="mr-1" 
                                        size="xs" 
                                    />
                                    <span>
                                        {Number(set.sealed) === Number(set.quantity) 
                                            ? 'Sealed' 
                                            : Number(set.sealed) > 0 
                                              ? `${set.sealed}/${set.quantity} Sealed`
                                              : 'Opened'
                                        }
                                    </span>
                                </div>
                            </>
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
    
        // For wishlist items, show move to collection button
        if (isWishlist) {
            return (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-col gap-2">
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
        }
    
        // For collection items, show buttons including Update Status
        return (
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col gap-2">
                    <button
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            openStatusModal(set);
                        }}
                    >
                        <FontAwesomeIcon icon={faCube} className="mr-2" />
                        <span>Update Status</span>
                    </button>
                    
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
        const completeCount = sets.reduce((acc, set) => acc + Number(set.complete), 0);
        const sealedCount = sets.reduce((acc, set) => acc + Number(set.sealed), 0);
        
        // Updated collection value calculation
        const totalValue = sets.reduce((acc, set) => {
            const sealedCount = Number(set.sealed) || 0;
            const completeCount = Number(set.complete) || 0;
            const nonSealedCompleteCount = completeCount - sealedCount;
            const incompleteCount = Number(set.quantity) - completeCount;
            
            // Get the different prices, defaulting to 0 if not available
            const sealedValue = parseFloat(set.sealed_value) || 0;
            const usedValue = parseFloat(set.used_value) || 0;
            const retailPrice = parseFloat(set.retail_price) || 0;
            
            // Calculate value for each type of set
            let setValue = 0;
            
            // For sealed sets, use sealed_value if available, otherwise retail_price
            if (sealedCount > 0) {
                setValue += sealedCount * (sealedValue > 0 ? sealedValue : retailPrice);
            }
            
            // For complete but not sealed sets, use used_value if available, otherwise retail_price
            if (nonSealedCompleteCount > 0) {
                setValue += nonSealedCompleteCount * (usedValue > 0 ? usedValue : retailPrice);
            }
            
            // For incomplete sets, use used_value if available, otherwise retail_price
            if (incompleteCount > 0) {
                setValue += incompleteCount * (usedValue > 0 ? usedValue : retailPrice);
            }
            
            return acc + setValue;
        }, 0);
        
        // Determine number of columns based on whether prices are shown
        const gridCols = showPrices ? 
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : 
            "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3";
        
        return (
            <div className={`grid ${gridCols} gap-4 mb-8`}>
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
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                            <FontAwesomeIcon icon={faBox} />
                        </div>
                        <div>
                            <h3 className="text-gray-500 font-medium text-sm">Collection Status</h3>
                            <p className="text-sm font-medium text-gray-800">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md mr-1">{completeCount} complete</span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">{sealedCount} sealed</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Out of {totalSets} total sets</p>
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
            <div className="flex flex-col gap-4 sm:gap-6">
                {/* Full width themes */}
                {fullWidthThemes.map(theme => (
                    <div 
                        key={theme.theme_id} 
                        className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        <div 
                            className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex justify-between items-center cursor-pointer"
                            onClick={() => toggleCollapse(theme.theme_id)}
                        >
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faCube} className="mr-2 sm:mr-3 text-yellow-400" />
                                <h3 className="text-base sm:text-lg font-semibold">{theme.theme_name}</h3>
                                <span className="ml-2 sm:ml-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {theme.sets.length} {theme.sets.length === 1 ? 'set' : 'sets'}
                                </span>
                            </div>
                            <FontAwesomeIcon 
                                icon={collapsedThemes[theme.theme_id] ? faChevronDown : faChevronUp} 
                                className="transition-transform duration-200"
                            />
                        </div>
                        
                        {!collapsedThemes[theme.theme_id] && (
                            <div className="p-3 sm:p-4 md:p-6">
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-4">
                                    {theme.sets.map(set => renderSetCard(set))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Half width themes in pairs */}
                {rows.map((row, index) => (
                    <div key={`row-${index}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {row.map(theme => (
                            <div 
                                key={theme.theme_id} 
                                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div 
                                    className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleCollapse(theme.theme_id)}
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faCube} className="mr-2 sm:mr-3 text-yellow-400" />
                                        <h3 className="text-base sm:text-lg font-semibold">{theme.theme_name}</h3>
                                        <span className="ml-2 sm:ml-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {theme.sets.length} {theme.sets.length === 1 ? 'set' : 'sets'}
                                        </span>
                                    </div>
                                    <FontAwesomeIcon 
                                        icon={collapsedThemes[theme.theme_id] ? faChevronDown : faChevronUp} 
                                        className="transition-transform duration-200"
                                    />
                                </div>
                                
                                {!collapsedThemes[theme.theme_id] && (
                                    <div className="p-3 sm:p-4 md:p-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {sets.map(set => renderSetCard(set))}
            </div>
        );
    };

    const renderEmptyState = () => {
        if (searchQuery || filterOptions.complete !== 'all' || filterOptions.sealed !== 'all' || filterOptions.decade !== 'all') {
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
        <div className="w-full mx-auto px-2 sm:px-4 py-4 sm:py-8">
            <div className="max-w-7xl mx-auto">
                <ConfirmationDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={handleCancelRemove}
                    onConfirm={handleConfirmRemove}
                    set={confirmDialog.set}
                    isWishlist={isWishlist}
                />

                <SetStatusModal
                    isOpen={statusModal.isOpen}
                    onClose={closeStatusModal}
                    set={statusModal.set}
                    onUpdateQuantity={updateQuantity}
                    onUpdateComplete={updateCompleteCount}
                    onUpdateSealed={updateSealedCount}
                    setSets={setSets}
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
                                <FontAwesomeIcon icon={faFilter} className={filterOptions.complete !== 'all' || filterOptions.sealed !== 'all' || filterOptions.decade !== 'all' || searchQuery ? 'text-red-600' : 'text-gray-600'} />
                                <span>Filters</span>
                                {(filterOptions.complete !== 'all' || filterOptions.sealed !== 'all' || filterOptions.decade !== 'all' || searchQuery) && (
                                    <span className="w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center">
                                        {(filterOptions.complete !== 'all' ? 1 : 0) + 
                                        (filterOptions.sealed !== 'all' ? 1 : 0) + 
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
                                        <>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Completion Status</label>
                                                <select
                                                    value={filterOptions.complete}
                                                    onChange={(e) => setFilterOptions({...filterOptions, complete: e.target.value})}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                >
                                                    <option value="all">All Sets</option>
                                                    <option value="complete">Only Complete Sets</option>
                                                    <option value="incomplete">Has Incomplete Sets</option>
                                                    <option value="mixed">Mixed (Some Complete, Some Not)</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Package Status</label>
                                                <select
                                                    value={filterOptions.sealed}
                                                    onChange={(e) => setFilterOptions({...filterOptions, sealed: e.target.value})}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                >
                                                    <option value="all">All Sets</option>
                                                    <option value="sealed">Only Sealed Sets</option>
                                                    <option value="opened">Has Opened Sets</option>
                                                    <option value="mixed">Mixed (Some Sealed, Some Opened)</option>
                                                </select>
                                            </div>
                                        </>
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
                        
                        {(searchQuery || filterOptions.complete !== 'all' || filterOptions.sealed !== 'all' || filterOptions.decade !== 'all') && (
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
                <div className="max-w-7xl mx-auto mb-4 sm:mb-8">
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