// src/components/Themes.js - Updated with Theme Images
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage, EmptyState } from './CommonUI';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Themes = () => {
    const [parentThemes, setParentThemes] = useState([]);
    const [popularThemeIds, setPopularThemeIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [submittedSets, setSubmittedSets] = useState({});
    const [loadedImages, setLoadedImages] = useState({});
    const [loadedThemeImages, setLoadedThemeImages] = useState({});
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.defaults.withCredentials = true;
        
        // Fetch both parent themes and popular theme IDs
        Promise.all([
            axios.get(`${process.env.REACT_APP_API_URL}/get_parent_themes.php`),
            axios.get(`${process.env.REACT_APP_API_URL}/get_popular_theme_ids.php`)
        ])
        .then(([parentThemesResponse, popularThemesResponse]) => {
            setParentThemes(parentThemesResponse.data);
            setPopularThemeIds(popularThemesResponse.data);
            setIsLoading(false);
        })
        .catch(error => {
            console.error('Error fetching themes:', error);
            setError('Unable to load themes. Please try again later.');
            setIsLoading(false);
        });
    }, []);

    // Function to sort themes with popular ones first
    const getSortedThemes = () => {
        // Create a copy of the themes array to sort
        const sortedThemes = [...parentThemes];
        
        // Sort the themes array
        sortedThemes.sort((a, b) => {
            const aIsPopular = popularThemeIds.includes(Number(a.id));
            const bIsPopular = popularThemeIds.includes(Number(b.id));
            
            if (aIsPopular && !bIsPopular) return -1;
            if (!aIsPopular && bIsPopular) return 1;
            
            // If both are popular, sort by their order in popularThemeIds
            if (aIsPopular && bIsPopular) {
                return popularThemeIds.indexOf(Number(a.id)) - popularThemeIds.indexOf(Number(b.id));
            }
            
            // If neither is popular, maintain alphabetical order
            return a.name.localeCompare(b.name);
        });
        
        return sortedThemes;
    };

    const handleThemeClick = (themeId) => {
        navigate(`/themes/${themeId}`);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (searchQuery.trim() !== '') {
            // Option 1: Search within Themes component
            setIsSearching(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/search_sets.php?query=${encodeURIComponent(searchQuery)}`);
                setSearchResults(response.data);
            } catch (error) {
                console.error('Error fetching search results:', error);
                setError('An error occurred while searching. Please try again.');
            }
            setIsSearching(false);
            
            // Uncomment this and comment out the above code if you prefer to
            // redirect to the dedicated SearchResults page instead
            // navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleQuantityChange = (setNum, quantity, e) => {
        e.stopPropagation();
        setSelectedSets(prevSelectedSets => ({
            ...prevSelectedSets,
            [setNum]: quantity
        }));
    };

    const toggleSelectSet = (setNum) => {
        setSelectedSets(prevSelectedSets =>
            prevSelectedSets[setNum]
                ? { ...prevSelectedSets, [setNum]: undefined }
                : { ...prevSelectedSets, [setNum]: 1 }
        );
    };

    const addToCollection = (setNum, quantity, e) => {
        e.stopPropagation();
        const setToAdd = [{ setNum, quantity }];
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_collection.php`, { sets: setToAdd })
            .then(response => {
                if (response.data.success) {
                    setSubmittedSets(prev => ({ ...prev, [setNum]: true }));
                    
                    // Set a timeout to reset the submitted state after 2 seconds
                    setTimeout(() => {
                        setSubmittedSets(prev => {
                            const newState = { ...prev };
                            delete newState[setNum];
                            return newState;
                        });
                    }, 2000);
                    
                    setSelectedSets(prev => {
                        const newSelected = { ...prev };
                        delete newSelected[setNum];
                        return newSelected;
                    });
                    
                    // Remove the added set from search results
                    setSearchResults(prevResults => 
                        prevResults.filter(set => set.set_num !== setNum)
                    );
                } else {
                    setError('Failed to add set to collection.');
                }
            })
            .catch(error => {
                console.error('Error adding set to collection:', error);
                setError('An error occurred while adding to collection.');
            });
    };
    
    const addToWishlist = (setNum, quantity, e) => {
        e.stopPropagation();
        const setToAdd = [{ setNum, quantity }];
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_wishlist.php`, { sets: setToAdd })
            .then(response => {
                if (response.data.success) {
                    setSubmittedSets(prev => ({ ...prev, [setNum]: 'wishlist' }));
                    
                    // Set a timeout to reset the submitted state after 2 seconds
                    setTimeout(() => {
                        setSubmittedSets(prev => {
                            const newState = { ...prev };
                            delete newState[setNum];
                            return newState;
                        });
                    }, 2000);
                    
                    setSelectedSets(prev => {
                        const newSelected = { ...prev };
                        delete newSelected[setNum];
                        return newSelected;
                    });
                } else {
                    setError('Failed to add set to wishlist.');
                }
            })
            .catch(error => {
                console.error('Error adding set to wishlist:', error);
                setError('An error occurred while adding to wishlist.');
            });
    };

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png'; // Set fallback image path
    };
    
    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const handleThemeImageLoad = (themeId) => {
        setLoadedThemeImages(prev => ({ ...prev, [themeId]: true }));
    };

    const handleThemeImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png';
    };

    const clearSearchResults = () => {
        setSearchResults([]);
        setSearchQuery('');
    };

    // Group themes by first letter for better organization
    const getThemesByLetter = () => {
        const themes = getSortedThemes();
        const groupedThemes = {};
        
        // First pass: group popular themes separately
        const popularThemes = themes.filter(theme => popularThemeIds.includes(Number(theme.id)));
        
        // Second pass: group remaining themes by first letter
        const regularThemes = themes.filter(theme => !popularThemeIds.includes(Number(theme.id)));
        
        regularThemes.forEach(theme => {
            const firstLetter = theme.name.charAt(0).toUpperCase();
            if (!groupedThemes[firstLetter]) {
                groupedThemes[firstLetter] = [];
            }
            groupedThemes[firstLetter].push(theme);
        });
        
        // Sort the groups alphabetically
        const sortedGroups = Object.keys(groupedThemes).sort();
        
        return { popularThemes, groupedThemes, sortedGroups };
    };

    const renderThemesList = () => {
        const { popularThemes, groupedThemes, sortedGroups } = getThemesByLetter();
        
        return (
            <div className="space-y-10">
                {/* Popular Themes Section */}
                {popularThemes.length > 0 && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                            <FontAwesomeIcon icon="fire" className="text-red-600 mr-2" />
                            Popular Themes
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {popularThemes.map(theme => (
                                <button
                                    key={theme.id}
                                    className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-red-200 transition-all duration-200 hover:shadow-md hover:scale-105 hover:border-red-400 group"
                                    onClick={() => handleThemeClick(theme.id)}
                                >
                                    <div className="h-24 w-full flex items-center justify-center mb-3 overflow-hidden">
                                        {!loadedThemeImages[theme.id] && (
                                            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                                <FontAwesomeIcon icon="cube" className="text-red-600 text-lg" />
                                            </div>
                                        )}
                                        <img
                                            src={`https://mybricklog.s3.us-east-2.amazonaws.com/themes/${theme.id}.png`}
                                            alt={`${theme.name} theme`}
                                            className={`object-contain max-h-24 max-w-full ${loadedThemeImages[theme.id] ? 'opacity-100' : 'opacity-0'}`}
                                            onError={handleThemeImageError}
                                            onLoad={() => handleThemeImageLoad(theme.id)}
                                            style={{ transition: 'opacity 0.3s' }}
                                        />
                                    </div>
                                    <span className="text-center font-medium text-gray-800 group-hover:text-red-600 transition-colors">
                                        {theme.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* All Themes Section - Grouped by letter */}
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                        <FontAwesomeIcon icon="cubes" className="text-gray-600 mr-2" />
                        All Themes
                    </h3>
                    
                    {/* Alphabet Navigation */}
                    <div className="mb-6 border-b border-gray-200 pb-4">
                        <div className="flex flex-wrap justify-center gap-2">
                            {sortedGroups.map(letter => (
                                <a
                                    key={letter}
                                    href={`#section-${letter}`}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-medium transition-colors"
                                >
                                    {letter}
                                </a>
                            ))}
                        </div>
                    </div>
                    
                    {/* Theme Groups */}
                    <div className="space-y-8">
                        {sortedGroups.map(letter => (
                            <div key={letter} id={`section-${letter}`}>
                                <h4 className="text-lg font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2 pl-2 bg-gray-50 rounded-lg">
                                    {letter}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {groupedThemes[letter].map(theme => (
                                        <button
                                            key={theme.id}
                                            className="text-left py-2 px-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all"
                                            onClick={() => handleThemeClick(theme.id)}
                                        >
                                            <span className="block truncate">{theme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderSearchResults = () => {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">
                        <FontAwesomeIcon icon="search" className="text-gray-600 mr-2" />
                        Search Results
                    </h3>
                    <button 
                        onClick={clearSearchResults}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <FontAwesomeIcon icon="arrow-left" />
                        <span>Back to Themes</span>
                    </button>
                </div>
                
                {searchResults.length === 0 ? (
                    <EmptyState 
                        message="No sets found matching your search."
                        actionText="Try Another Search"
                        onAction={() => setSearchQuery('')}
                        icon="search"
                        className="py-12"
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {searchResults.map(set => (
                            <div
                                key={set.set_num}
                                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md
                                          ${selectedSets[set.set_num] ? 'ring-2 ring-red-500 ring-opacity-50 border-red-200' : 'border-gray-200'}`}
                                onClick={() => toggleSelectSet(set.set_num)}
                            >
                                <div className="p-4">
                                    <div className="h-36 flex items-center justify-center mb-4 relative">
                                        {!loadedImages[set.set_num] && (
                                            <Skeleton height={120} width="100%" />
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
                                    
                                    <h3 className="font-medium text-gray-800 mb-2 line-clamp-2 h-12">
                                        {set.name}
                                    </h3>
                                    
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm text-gray-600 font-mono">{set.set_num}</span>
                                        <span className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded">{set.year}</span>
                                    </div>
                                    
                                    {selectedSets[set.set_num] !== undefined ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-center gap-2 bg-gray-100 p-2 rounded">
                                                <button
                                                    className="w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    onClick={(e) => handleQuantityChange(set.set_num, Math.max(1, selectedSets[set.set_num] - 1), e)}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="text"
                                                    className="w-12 h-8 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    value={selectedSets[set.set_num]}
                                                    onChange={(e) => {
                                                        const quantity = parseInt(e.target.value, 10);
                                                        if (!isNaN(quantity) && quantity > 0) {
                                                            handleQuantityChange(set.set_num, quantity, e);
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    className="w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    onClick={(e) => handleQuantityChange(set.set_num, selectedSets[set.set_num] + 1, e)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    className={`py-2 px-3 rounded text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2
                                                              ${submittedSets[set.set_num] === true 
                                                                ? 'bg-green-600 hover:bg-green-700' 
                                                                : 'bg-red-600 hover:bg-red-700'}`}
                                                    onClick={(e) => addToCollection(set.set_num, selectedSets[set.set_num], e)}
                                                >
                                                    {submittedSets[set.set_num] === true ? (
                                                        <>
                                                            <FontAwesomeIcon icon="check" />
                                                            Added!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FontAwesomeIcon icon="plus" />
                                                            Add To Collection
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    className={`py-2 px-3 rounded text-sm font-medium focus:outline-none focus:ring-2 flex items-center justify-center gap-2
                                                              ${submittedSets[set.set_num] === 'wishlist' 
                                                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                                                : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'}`}
                                                    onClick={(e) => addToWishlist(set.set_num, selectedSets[set.set_num], e)}
                                                >
                                                    {submittedSets[set.set_num] === 'wishlist' ? (
                                                        <>
                                                            <FontAwesomeIcon icon="check" />
                                                            Added to Wishlist!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FontAwesomeIcon icon="heart" />
                                                            Add to Wishlist
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelectSet(set.set_num);
                                            }}
                                            className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FontAwesomeIcon icon="plus" />
                                            Add Set
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Hero Banner */}
            <div className="mb-8 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-lg overflow-hidden">
                <div className="relative py-10 px-6 md:px-10">
                    <div className="relative z-10 max-w-3xl mx-auto text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Explore LEGO® Themes
                        </h1>
                        <p className="text-red-100 text-lg mb-8 max-w-2xl mx-auto">
                            Browse by theme to find your favorite sets or search for specific models to add to your collection.
                        </p>
                        
                        {/* Search Form */}
                        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Search by set name or number..."
                                    className="w-full py-3 px-5 pr-12 rounded-full border-none shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800"
                                />
                                <button 
                                    type="submit" 
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <FontAwesomeIcon icon="magnifying-glass" />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'url(/images/lego_pattern_bg.png)', backgroundSize: '200px' }}></div>
                    <div className="absolute top-4 right-8 w-20 h-20 bg-yellow-400 rounded-full opacity-30"></div>
                    <div className="absolute bottom-6 left-10 w-16 h-16 bg-red-500 rounded-lg transform rotate-12 opacity-40"></div>
                </div>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className="mb-6">
                    <ErrorMessage 
                        message={error} 
                        onRetry={() => setError(null)} 
                    />
                </div>
            )}
            
            {/* Loading State */}
            {(isLoading || isSearching) ? (
                <div className="py-12">
                    <LoadingSpinner 
                        text={isSearching ? "Searching for sets..." : "Loading themes..."} 
                        size="lg" 
                    />
                </div>
            ) : (
                /* Main Content */
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
                    {searchResults.length > 0 ? renderSearchResults() : renderThemesList()}
                </div>
            )}
        </div>
    );
};

export default Themes;