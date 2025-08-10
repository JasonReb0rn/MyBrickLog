import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, faPlus, faTimes, faRefresh, faDollarSign, 
    faShoppingCart, faHeart, faTag, faCalendar, faCube,
    faList, faTh, faTrash, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { LoadingSpinner, ErrorMessage, EmptyState } from './CommonUI';

const PriceTool = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSets, setSelectedSets] = useState(new Set());
    const [priceList, setPriceList] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [priceError, setPriceError] = useState(null);
    const [loadedImages, setLoadedImages] = useState({});
    const [activeView, setActiveView] = useState('grid'); // 'grid' or 'list'
    const [showOnlyWithPrices, setShowOnlyWithPrices] = useState(false);
    
    const navigate = useNavigate();

    // Search for sets
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        setSearchError(null);
        
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/search_sets_with_prices.php?query=${encodeURIComponent(searchQuery.trim())}`
            );
            
            if (response.data.error) {
                setSearchError(response.data.message);
                setSearchResults([]);
            } else {
                setSearchResults(response.data);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Failed to search sets. Please try again.');
            setSearchResults([]);
        }
        
        setIsSearching(false);
    };

    // Add set to price list
    const addToPriceList = (set) => {
        const setNum = set.set_num;
        if (selectedSets.has(setNum)) return;
        
        setSelectedSets(prev => new Set([...prev, setNum]));
        setPriceList(prev => [...prev, set]);
    };

    // Remove set from price list
    const removeFromPriceList = (setNum) => {
        setSelectedSets(prev => {
            const newSet = new Set(prev);
            newSet.delete(setNum);
            return newSet;
        });
        setPriceList(prev => prev.filter(set => set.set_num !== setNum));
    };

    // Refresh price data for selected sets
    const refreshPriceData = async () => {
        if (priceList.length === 0) return;
        
        setIsLoadingPrices(true);
        setPriceError(null);
        
        try {
            const setNums = priceList.map(set => set.set_num).join(',');
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/get_price_data.php?set_nums=${setNums}`
            );
            
            if (response.data.error) {
                setPriceError(response.data.error);
            } else {
                setPriceList(response.data.sets);
            }
        } catch (error) {
            console.error('Price refresh error:', error);
            setPriceError('Failed to refresh price data. Please try again.');
        }
        
        setIsLoadingPrices(false);
    };

    // Clear all selected sets
    const clearPriceList = () => {
        setSelectedSets(new Set());
        setPriceList([]);
    };

    // Handle image loading
    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png';
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    // Format price display
    const formatPrice = (price) => {
        if (!price) return 'N/A';
        return `$${parseFloat(price).toFixed(2)}`;
    };

    // Get price color based on availability
    const getPriceColor = (price) => {
        if (!price) return 'text-gray-400';
        return 'text-green-600 font-semibold';
    };

    // Filter price list based on showOnlyWithPrices
    const getFilteredPriceList = () => {
        if (!showOnlyWithPrices) return priceList;
        return priceList.filter(set => set.prices.has_price_data);
    };

    // Calculate total values
    const calculateTotals = () => {
        const filteredList = getFilteredPriceList();
        return filteredList.reduce((totals, set) => {
            if (set.prices.retail_price) {
                totals.retail += parseFloat(set.prices.retail_price);
            }
            if (set.prices.market_price) {
                totals.market += parseFloat(set.prices.market_price);
            }
            if (set.prices.sealed_value) {
                totals.sealed += parseFloat(set.prices.sealed_value);
            }
            if (set.prices.used_value) {
                totals.used += parseFloat(set.prices.used_value);
            }
            return totals;
        }, { retail: 0, market: 0, sealed: 0, used: 0 });
    };

    // Render search section
    const renderSearchSection = () => (
        <div className="mb-6 md:mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center mb-4">
                    <FontAwesomeIcon icon={faSearch} className="text-blue-600 mr-2 md:mr-3" />
                    Search Sets
                </h2>
                
                <form onSubmit={handleSearch} className="relative max-w-2xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search sets by name or number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-14 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg"
                    />
                    <button 
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSearching ? (
                            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <FontAwesomeIcon icon={faSearch} className="text-xs md:text-sm" />
                        )}
                    </button>
                </form>
            </div>
            
            {/* Search Results */}
            {searchError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <ErrorMessage message={searchError} />
                </div>
            )}
            
            {searchResults.length > 0 && (
                <div className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                        Search Results ({searchResults.length} found)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {searchResults.map(set => (
                            <div
                                key={set.set_num}
                                className={`bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                    selectedSets.has(set.set_num) 
                                        ? 'ring-2 ring-blue-500 border-blue-200' 
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="p-3 md:p-4">
                                    <div className="relative h-24 md:h-32 flex items-center justify-center mb-3">
                                        {!loadedImages[set.set_num] && (
                                            <Skeleton height="100%" width="100%" />
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
                                    
                                    <h4 className="font-medium text-gray-800 mb-2 line-clamp-2 h-8 md:h-10 text-xs md:text-sm leading-tight">
                                        {set.name}
                                    </h4>
                                    
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-600 font-mono truncate flex-1 mr-2">{set.set_num}</span>
                                        <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{set.year}</span>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500 mb-3 truncate">
                                        {set.theme_name} • {parseInt(set.num_parts).toLocaleString()} pieces
                                    </div>
                                    
                                    {/* Price preview - Mobile optimized */}
                                    <div className="text-xs space-y-1 mb-3">
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="flex justify-between">
                                                <span className="truncate">Retail:</span>
                                                <span className={`${getPriceColor(set.prices.retail_price)} ml-1 whitespace-nowrap`}>
                                                    {formatPrice(set.prices.retail_price)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="truncate">Sealed:</span>
                                                <span className={`${getPriceColor(set.prices.sealed_value)} ml-1 whitespace-nowrap`}>
                                                    {formatPrice(set.prices.sealed_value)}
                                                </span>
                                            </div>
                                            {set.prices.market_price && (
                                                <div className="flex justify-between">
                                                    <span className="truncate">Market:</span>
                                                    <span className={`${getPriceColor(set.prices.market_price)} ml-1 whitespace-nowrap`}>
                                                        {formatPrice(set.prices.market_price)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="truncate">Used:</span>
                                                <span className={`${getPriceColor(set.prices.used_value)} ml-1 whitespace-nowrap`}>
                                                    {formatPrice(set.prices.used_value)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => selectedSets.has(set.set_num) 
                                            ? removeFromPriceList(set.set_num)
                                            : addToPriceList(set)
                                        }
                                        className={`w-full py-2.5 md:py-2 px-3 rounded text-xs md:text-sm font-medium focus:outline-none focus:ring-2 transition-colors flex items-center justify-center gap-1.5 md:gap-2 min-h-[40px] touch-manipulation ${
                                            selectedSets.has(set.set_num)
                                                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={selectedSets.has(set.set_num) ? faTimes : faPlus} className="flex-shrink-0" />
                                        <span className="whitespace-nowrap">{selectedSets.has(set.set_num) ? 'Remove' : 'Add to List'}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Render price list header
    const renderPriceListHeader = () => {
        if (priceList.length === 0) return null;
        
        const totals = calculateTotals();
        const filteredList = getFilteredPriceList();
        
        return (
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center">
                            <FontAwesomeIcon icon={faDollarSign} className="text-green-600 mr-2 md:mr-3" />
                            Price List ({filteredList.length} sets)
                        </h2>
                        
                        {filteredList.length > 0 && (
                            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4 mt-3 text-xs md:text-sm text-gray-600">
                                <span className="bg-white px-2 py-1 rounded">
                                    Retail: <span className="font-semibold text-green-600">${totals.retail.toFixed(2)}</span>
                                </span>
                                {totals.market > 0 && (
                                    <span className="bg-white px-2 py-1 rounded">
                                        Market: <span className="font-semibold text-purple-600">${totals.market.toFixed(2)}</span>
                                    </span>
                                )}
                                <span className="bg-white px-2 py-1 rounded">
                                    Sealed: <span className="font-semibold text-green-600">${totals.sealed.toFixed(2)}</span>
                                </span>
                                <span className="bg-white px-2 py-1 rounded">
                                    Used: <span className="font-semibold text-green-600">${totals.used.toFixed(2)}</span>
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile-first controls layout */}
                    <div className="space-y-3">
                        <label className="flex items-center text-xs md:text-sm text-gray-700 bg-white p-2 rounded">
                            <input
                                type="checkbox"
                                checked={showOnlyWithPrices}
                                onChange={(e) => setShowOnlyWithPrices(e.target.checked)}
                                className="mr-2 h-4 w-4"
                            />
                            <span className="flex-1">Only show sets with prices</span>
                        </label>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            {/* View toggle */}
                            <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <button
                                    onClick={() => setActiveView('grid')}
                                    className={`flex-1 px-3 py-2 text-sm touch-manipulation ${
                                        activeView === 'grid' 
                                            ? 'bg-gray-200 text-gray-800' 
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faTh} className="mr-2" />
                                    <span className="hidden sm:inline">Grid</span>
                                </button>
                                <button
                                    onClick={() => setActiveView('list')}
                                    className={`flex-1 px-3 py-2 text-sm touch-manipulation ${
                                        activeView === 'list' 
                                            ? 'bg-gray-200 text-gray-800' 
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faList} className="mr-2" />
                                    <span className="hidden sm:inline">List</span>
                                </button>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex gap-2 sm:gap-3">
                                <button
                                    onClick={refreshPriceData}
                                    disabled={isLoadingPrices}
                                    className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 text-sm touch-manipulation min-h-[40px]"
                                >
                                    <FontAwesomeIcon icon={faRefresh} className={`${isLoadingPrices ? 'animate-spin' : ''} flex-shrink-0`} />
                                    <span className="whitespace-nowrap">Refresh</span>
                                </button>
                                
                                <button
                                    onClick={clearPriceList}
                                    className="flex-1 sm:flex-none px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation min-h-[40px]"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="flex-shrink-0" />
                                    <span className="whitespace-nowrap">Clear All</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render set in grid view
    const renderSetGridView = (set) => (
        <div
            key={set.set_num}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md"
        >
            <div className="p-3 md:p-4">
                <div className="relative h-32 md:h-40 flex items-center justify-center mb-3 md:mb-4">
                    <img
                        src={set.img_url}
                        alt={set.name}
                        className="h-full object-contain"
                        onError={handleImageError}
                    />
                    
                    <button
                        onClick={() => removeFromPriceList(set.set_num)}
                        className="absolute top-1 right-1 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xs md:text-sm" />
                    </button>
                </div>
                
                <h3 className="font-medium text-gray-800 mb-2 line-clamp-2 h-10 md:h-12 text-sm md:text-base leading-tight">
                    {set.name}
                </h3>
                
                <div className="flex justify-between items-center mb-2 md:mb-3">
                    <span className="text-xs md:text-sm text-gray-600 font-mono truncate flex-1 mr-2">{set.set_num}</span>
                    <span className="text-xs md:text-sm font-semibold bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{set.year}</span>
                </div>
                
                <div className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4 truncate">
                    {set.theme_name} • {parseInt(set.num_parts).toLocaleString()} pieces
                </div>
                
                {/* Price information - Mobile optimized */}
                <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center py-0.5 md:py-1">
                        <span className="text-xs md:text-sm text-gray-600 flex items-center">
                            <FontAwesomeIcon icon={faTag} className="mr-1 md:mr-2 text-blue-500 text-xs" />
                            <span className="truncate">Retail:</span>
                        </span>
                        <span className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.retail_price)} whitespace-nowrap ml-1`}>
                            {formatPrice(set.prices.retail_price)}
                        </span>
                    </div>
                    
                    {set.prices.market_price && (
                        <div className="flex justify-between items-center py-0.5 md:py-1">
                            <span className="text-xs md:text-sm text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faDollarSign} className="mr-1 md:mr-2 text-purple-500 text-xs" />
                                <span className="truncate">Market:</span>
                            </span>
                            <span className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.market_price)} whitespace-nowrap ml-1`}>
                                {formatPrice(set.prices.market_price)}
                            </span>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center py-0.5 md:py-1">
                        <span className="text-xs md:text-sm text-gray-600 flex items-center">
                            <FontAwesomeIcon icon={faShoppingCart} className="mr-1 md:mr-2 text-green-500 text-xs" />
                            <span className="truncate">Sealed:</span>
                        </span>
                        <span className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.sealed_value)} whitespace-nowrap ml-1`}>
                            {formatPrice(set.prices.sealed_value)}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-0.5 md:py-1">
                        <span className="text-xs md:text-sm text-gray-600 flex items-center">
                            <FontAwesomeIcon icon={faCube} className="mr-1 md:mr-2 text-orange-500 text-xs" />
                            <span className="truncate">Used:</span>
                        </span>
                        <span className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.used_value)} whitespace-nowrap ml-1`}>
                            {formatPrice(set.prices.used_value)}
                        </span>
                    </div>
                    
                    {/* Used value range if available */}
                    {(set.prices.used_value_range_low || set.prices.used_value_range_high) && (
                        <div className="text-xs text-gray-500 pl-4 md:pl-6">
                            Range: {formatPrice(set.prices.used_value_range_low)} - {formatPrice(set.prices.used_value_range_high)}
                        </div>
                    )}
                    
                    {set.prices.updated_at && (
                        <div className="text-xs text-gray-400 mt-2 flex items-center">
                            <FontAwesomeIcon icon={faCalendar} className="mr-1 flex-shrink-0" />
                            <span className="truncate">Updated: {new Date(set.prices.updated_at).toLocaleDateString()}</span>
                        </div>
                    )}
                    
                    {!set.prices.has_price_data && (
                        <div className="text-xs text-yellow-600 mt-2 flex items-center bg-yellow-50 p-2 rounded">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 flex-shrink-0" />
                            <span>No price data available</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Render set in list view
    const renderSetListView = (set) => (
        <div
            key={set.set_num}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md"
        >
            <div className="flex flex-col sm:flex-row">
                <div className="sm:w-36 md:w-48 p-3 md:p-4 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-200 relative">
                    <img
                        src={set.img_url}
                        alt={set.name}
                        className="h-20 md:h-24 object-contain"
                        onError={handleImageError}
                    />
                    <button
                        onClick={() => removeFromPriceList(set.set_num)}
                        className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-7 md:h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                </div>
                
                <div className="flex-grow p-3 md:p-4">
                    <div className="flex flex-col space-y-3 md:space-y-4">
                        <div className="flex-grow">
                            <h3 className="font-medium text-gray-800 mb-2 text-sm md:text-base leading-tight">
                                {set.name}
                            </h3>
                            
                            {/* Mobile-optimized metadata */}
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                <span className="text-xs md:text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">{set.set_num}</span>
                                <span className="text-xs md:text-sm font-semibold bg-gray-100 px-2 py-1 rounded">{set.year}</span>
                                <span className="text-xs md:text-sm text-gray-500 truncate">{set.theme_name}</span>
                            </div>
                            
                            <div className="text-xs md:text-sm text-gray-500 mb-2">
                                {parseInt(set.num_parts).toLocaleString()} pieces
                            </div>
                            
                            {set.prices.updated_at && (
                                <div className="text-xs text-gray-400 flex items-center">
                                    <FontAwesomeIcon icon={faCalendar} className="mr-1 flex-shrink-0" />
                                    <span className="truncate">Updated: {new Date(set.prices.updated_at).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Mobile-optimized price section */}
                        <div className="w-full">
                            {set.prices.has_price_data ? (
                                <div className="space-y-2">
                                    {/* Mobile: 2x2 grid, Desktop: horizontal */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                        <div className="text-center bg-gray-50 p-2 rounded">
                                            <div className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faTag} className="mr-1 text-blue-500 text-xs" />
                                                <span className="hidden sm:inline">Retail</span>
                                                <span className="sm:hidden">Ret</span>
                                            </div>
                                            <div className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.retail_price)}`}>
                                                {formatPrice(set.prices.retail_price)}
                                            </div>
                                        </div>
                                        
                                        <div className="text-center bg-gray-50 p-2 rounded">
                                            <div className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faShoppingCart} className="mr-1 text-green-500 text-xs" />
                                                <span className="hidden sm:inline">Sealed</span>
                                                <span className="sm:hidden">Seal</span>
                                            </div>
                                            <div className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.sealed_value)}`}>
                                                {formatPrice(set.prices.sealed_value)}
                                            </div>
                                        </div>
                                        
                                        {set.prices.market_price && (
                                            <div className="text-center bg-gray-50 p-2 rounded">
                                                <div className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faDollarSign} className="mr-1 text-purple-500 text-xs" />
                                                    <span className="hidden sm:inline">Market</span>
                                                    <span className="sm:hidden">Mkt</span>
                                                </div>
                                                <div className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.market_price)}`}>
                                                    {formatPrice(set.prices.market_price)}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="text-center bg-gray-50 p-2 rounded">
                                            <div className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCube} className="mr-1 text-orange-500 text-xs" />
                                                <span>Used</span>
                                            </div>
                                            <div className={`text-xs md:text-sm font-semibold ${getPriceColor(set.prices.used_value)}`}>
                                                {formatPrice(set.prices.used_value)}
                                            </div>
                                            {/* Used value range if available */}
                                            {(set.prices.used_value_range_low || set.prices.used_value_range_high) && (
                                                <div className="text-xs text-gray-400 mt-1 leading-tight">
                                                    {formatPrice(set.prices.used_value_range_low)} - {formatPrice(set.prices.used_value_range_high)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-yellow-600 bg-yellow-50 p-3 rounded flex items-center justify-center">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 flex-shrink-0" />
                                    <span className="text-xs md:text-sm">No price data available</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render price list section
    const renderPriceListSection = () => {
        if (priceList.length === 0) {
            return (
                <EmptyState 
                    message="No sets in your price list yet. Search for sets above and add them to get started."
                    icon={faDollarSign}
                    className="py-12"
                />
            );
        }
        
        const filteredList = getFilteredPriceList();
        
        if (filteredList.length === 0 && showOnlyWithPrices) {
            return (
                <EmptyState 
                    message="No sets with price data found. Try unchecking 'Only show sets with prices' to see all sets."
                    icon={faExclamationTriangle}
                    className="py-12"
                />
            );
        }
        
        return (
            <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {renderPriceListHeader()}
                
                {priceError && (
                    <div className="p-4 bg-red-50 border-b border-red-200">
                        <ErrorMessage message={priceError} />
                    </div>
                )}
                
                <div className="p-4 md:p-6">
                    {isLoadingPrices ? (
                        <div className="py-16">
                            <LoadingSpinner text="Refreshing price data..." size="lg" />
                        </div>
                    ) : (
                        <>
                            {activeView === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                                    {filteredList.map(set => renderSetGridView(set))}
                                </div>
                            ) : (
                                <div className="space-y-3 md:space-y-4">
                                    {filteredList.map(set => renderSetListView(set))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 py-4 md:py-8">
            <div className="max-w-7xl mx-auto px-3 md:px-4">
                {/* Page Header */}
                <div className="mb-6 md:mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="relative py-6 md:py-8 px-4 md:px-6 lg:px-10">
                        <div className="relative z-10">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
                                LEGO Price Tool
                            </h1>
                            <p className="text-blue-100 text-sm md:text-base lg:text-lg leading-relaxed">
                                Search for LEGO sets and compare retail, sealed, and used market prices.
                            </p>
                        </div>
                        
                        {/* Decorative elements - hidden on mobile */}
                        <div className="hidden md:block absolute top-4 right-8 w-16 h-16 lg:w-20 lg:h-20 bg-yellow-400 rounded-full opacity-20"></div>
                        <div className="hidden md:block absolute bottom-6 left-10 w-12 h-12 lg:w-16 lg:h-16 bg-blue-400 rounded-lg transform rotate-12 opacity-30"></div>
                    </div>
                </div>

                {/* Search Section */}
                {renderSearchSection()}
                
                {/* Price List Section */}
                {renderPriceListSection()}
            </div>
        </div>
    );
};

export default PriceTool;