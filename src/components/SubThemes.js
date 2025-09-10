import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark, faSearch } from '@fortawesome/free-solid-svg-icons';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { LoadingSpinner, ErrorMessage, EmptyState } from './CommonUI';
import Modal from './Modal';

const SubThemes = () => {
    const [subThemes, setSubThemes] = useState([]);
    const [sets, setSets] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [submittedSets, setSubmittedSets] = useState({});
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [parentThemeName, setParentThemeName] = useState('');
    const [parentThemeImage, setParentThemeImage] = useState('');
    const [loadedImages, setLoadedImages] = useState({});
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({});
    const [filterOptions, setFilterOptions] = useState({
        decade: 'all',
        pieces: 'all',
        year: 'all',
        sort: 'year_desc'
    });
    const [showFilters, setShowFilters] = useState(false);
    const [filteredSets, setFilteredSets] = useState([]);
    const [activeView, setActiveView] = useState('grid'); // 'grid' or 'list'
    const [searchQuery, setSearchQuery] = useState('');
    
    const { themeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Fetch sub-themes data
    useEffect(() => {
        const fetchSubThemes = async () => {
            setIsLoading(true);
            try {
                axios.defaults.withCredentials = true;
                const subThemesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get_sub_themes.php?parent_id=${themeId}`);
                setSubThemes(subThemesResponse.data);
                
                if (subThemesResponse.data.length > 0) {
                    setParentThemeName(subThemesResponse.data[0].parent_theme_name);
                    
                    // Try to get theme image if available
                    if (subThemesResponse.data[0].parent_theme_image) {
                        setParentThemeImage(subThemesResponse.data[0].parent_theme_image);
                    }
                }
                
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching sub-themes:', error);
                setError('Failed to load theme data. Please try again later.');
                setIsLoading(false);
            }
        };

        fetchSubThemes();
        setSets([]); 
        setPage(1);
        setHasMore(true);
        setFilterOptions({
            decade: 'all',
            pieces: 'all',
            year: 'all',
            sort: 'year_desc'
        });
    }, [themeId]);

    // Fetch sets data with pagination
    useEffect(() => {
        const fetchSets = async () => {
            if (!hasMore) return;
            
            setIsLoadingMore(true);
            try {
                const timestamp = new Date().getTime();
                const response = await axios.get(
                    `${process.env.REACT_APP_API_URL}/get_lego_sets.php?theme_id=${themeId}&page=${page}&_=${timestamp}`
                );
                
                setSets(prevSets => {
                    if (!response.data.sets) return prevSets;
                    
                    const existingSetNums = new Set(prevSets.map(set => set.set_num));
                    const newSets = response.data.sets.filter(set => !existingSetNums.has(set.set_num));
                    
                    setHasMore(response.data.hasMore);
                    return [...prevSets, ...newSets];
                });
            } catch (error) {
                console.error('Error fetching sets:', error);
                setError('Failed to load sets. Please try again later.');
                setHasMore(false);
            }
            setIsLoadingMore(false);
        };
     
        fetchSets();
    }, [page, themeId, hasMore]);

    // Apply filters to sets
    useEffect(() => {
        let results = [...sets];
        
        // Apply decade filter
        if (filterOptions.decade !== 'all') {
            const decade = parseInt(filterOptions.decade);
            results = results.filter(set => {
                const year = parseInt(set.year);
                return year >= decade && year < decade + 10;
            });
        }
        
        // Apply pieces filter
        if (filterOptions.pieces !== 'all') {
            const [min, max] = filterOptions.pieces.split('-').map(Number);
            results = results.filter(set => {
                const pieces = parseInt(set.num_parts);
                if (max) {
                    return pieces >= min && pieces <= max;
                } else {
                    return pieces >= min;
                }
            });
        }
        
        // Apply year filter
        if (filterOptions.year !== 'all') {
            const year = parseInt(filterOptions.year);
            results = results.filter(set => parseInt(set.year) === year);
        }
        
        // Apply sorting
        const [sortField, sortDirection] = filterOptions.sort.split('_');
        
        results.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortField) {
                case 'name':
                    valueA = a.name;
                    valueB = b.name;
                    return sortDirection === 'asc' ? 
                        valueA.localeCompare(valueB) : 
                        valueB.localeCompare(valueA);
                    
                case 'pieces':
                    valueA = parseInt(a.num_parts);
                    valueB = parseInt(b.num_parts);
                    break;
                    
                case 'year':
                default:
                    valueA = parseInt(a.year);
                    valueB = parseInt(b.year);
                    break;
            }
            
            if (sortDirection === 'asc') {
                return valueA - valueB;
            } else {
                return valueB - valueA;
            }
        });
        
        setFilteredSets(results);
    }, [sets, filterOptions]);

    // Handle infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop 
                >= document.documentElement.offsetHeight - 500 
                && !isLoadingMore 
                && hasMore
            ) {
                setPage(prevPage => prevPage + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoadingMore, hasMore]);

    // Auto-hide feedback messages after a delay
    useEffect(() => {
        const timeoutIds = [];
        
        Object.keys(submittedSets).forEach(setNum => {
            const timeoutId = setTimeout(() => {
                setSubmittedSets(prev => {
                    const newSubmitted = { ...prev };
                    delete newSubmitted[setNum];
                    return newSubmitted;
                });
            }, 3000);
            
            timeoutIds.push(timeoutId);
        });
        
        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
        };
    }, [submittedSets]);

    const handleThemeClick = (subThemeId) => {
        navigate(`/themes/${subThemeId}`);
    };

    const handleQuantityChange = (setNum, quantity, e) => {
        if (e) e.stopPropagation();
        
        setSelectedSets(prevSelectedSets => ({
            ...prevSelectedSets,
            [setNum]: quantity
        }));
    };

    const toggleSelectSet = (setNum) => {
        if (user) {
            setSelectedSets(prevSelectedSets => {
                const newSelectedSets = { ...prevSelectedSets };
                if (newSelectedSets[setNum]) {
                    delete newSelectedSets[setNum];  // Remove the set completely
                } else {
                    newSelectedSets[setNum] = 1;  // Add the set with quantity 1
                }
                return newSelectedSets;
            });
        } else {
            // Show login modal
            setModalContent({
                title: 'Sign In Required',
                message: 'You need to be signed in to add sets to your collection.',
                confirmText: 'Sign In',
                onConfirm: () => navigate('/login')
            });
            setIsModalOpen(true);
        }
    };

    const addToCollection = (setNum = null, e) => {
        if (e) e.stopPropagation();
        
        // If setNum is provided, add single set, otherwise add all selected sets
        const setsToAdd = setNum 
            ? [{ setNum, quantity: selectedSets[setNum] }]
            : Object.entries(selectedSets).map(([setNum, quantity]) => ({ 
                setNum, 
                quantity 
            }));
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_collection.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    // Update submitted state for all added sets
                    const newSubmittedSets = {};
                    setsToAdd.forEach(set => {
                        newSubmittedSets[set.setNum] = 'collection';
                    });
                    setSubmittedSets(prev => ({ ...prev, ...newSubmittedSets }));
    
                    // Clear selected sets
                    if (!setNum) {
                        setSelectedSets({});
                    } else {
                        setSelectedSets(prev => {
                            const newSelected = { ...prev };
                            delete newSelected[setNum];
                            return newSelected;
                        });
                    }
                } else {
                    setError('Failed to add sets to collection.');
                }
            })
            .catch(error => {
                console.error('Error adding sets to collection:', error);
                setError('An error occurred while adding to collection.');
            });
    };

    const addToWishlist = (setNum = null, e) => {
        if (e) e.stopPropagation();
        
        // If setNum is provided, add single set, otherwise add all selected sets
        const setsToAdd = setNum 
            ? [{ setNum, quantity: selectedSets[setNum] }]
            : Object.entries(selectedSets).map(([setNum, quantity]) => ({ 
                setNum, 
                quantity 
            }));
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_wishlist.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    // Update submitted state for all added sets
                    const newSubmittedSets = {};
                    setsToAdd.forEach(set => {
                        newSubmittedSets[set.setNum] = 'wishlist';
                    });
                    setSubmittedSets(prev => ({ ...prev, ...newSubmittedSets }));
    
                    // Clear selected sets
                    if (!setNum) {
                        setSelectedSets({});
                    } else {
                        setSelectedSets(prev => {
                            const newSelected = { ...prev };
                            delete newSelected[setNum];
                            return newSelected;
                        });
                    }
                } else {
                    setError('Failed to add sets to wishlist.');
                }
            })
            .catch(error => {
                console.error('Error adding sets to wishlist:', error);
                setError('An error occurred while adding to wishlist.');
            });
    };

    const goBack = () => {
        navigate('/themes');
    };

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png';
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const toggleFilters = () => {
        setShowFilters(prev => !prev);
    };

    const handleFilterChange = (name, value) => {
        setFilterOptions(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetFilters = () => {
        setFilterOptions({
            decade: 'all',
            pieces: 'all',
            year: 'all',
            sort: 'year_desc'
        });
        setSearchQuery('');
    };

    // Get unique years from sets for the year filter
    const getYearOptions = () => {
        if (sets.length === 0) return [];
        const years = new Set(sets.map(set => set.year));
        return Array.from(years).sort((a, b) => b - a); // Sort descending
    };

    // Get decades from sets for the decade filter
    const getDecadeOptions = () => {
        if (sets.length === 0) return [];
        const years = sets.map(set => parseInt(set.year));
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        const startDecade = Math.floor(minYear / 10) * 10;
        const endDecade = Math.floor(maxYear / 10) * 10;
        
        const decades = [];
        for (let decade = startDecade; decade <= endDecade; decade += 10) {
            decades.push(decade);
        }
        
        return decades.sort((a, b) => b - a); // Sort descending
    };

    const getSelectedSetCount = () => {
        return Object.keys(selectedSets).length;
    };

    const clearSelectedSets = () => {
        setSelectedSets({});
    };
    
    const toggleView = (view) => {
        setActiveView(view);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };
    
    // Updated handleSearch to redirect to search results page
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to the search results page with the query
            navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

    const renderThemeHeader = () => {
        return (
            <div className="mb-8 bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg overflow-hidden">
                <div className="relative py-8 px-6 md:px-10">
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start md:justify-between gap-6">
                        <div className="md:max-w-2xl">
                            <div className="mb-4 flex items-center">
                                <button 
                                    onClick={goBack} 
                                    className="mr-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                                >
                                    <FontAwesomeIcon icon="arrow-left" />
                                </button>
                                <h1 className="text-3xl md:text-4xl font-bold text-white">
                                    {parentThemeName}
                                </h1>
                            </div>
                            
                            <p className="text-red-100 mb-4 text-lg">
                                Explore {parentThemeName} sets and sub-themes to add to your collection.
                            </p>
                            
                            <div className="flex flex-wrap gap-3">
                                <div className="inline-flex items-center px-3 py-1 bg-red-500/50 text-white rounded-full text-sm">
                                    <FontAwesomeIcon icon="cubes" className="mr-2" /> 
                                    <span>{sets.length} Sets</span>
                                </div>
                                
                                {subThemes.length > 0 && (
                                    <div className="inline-flex items-center px-3 py-1 bg-red-500/50 text-white rounded-full text-sm">
                                        <FontAwesomeIcon icon="folder" className="mr-2" /> 
                                        <span>{subThemes.length} Sub-themes</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {parentThemeImage && (
                            <div className="hidden md:block w-36 h-36 bg-white rounded-xl p-2 shadow-lg transform rotate-3">
                                <img 
                                    src={parentThemeImage} 
                                    alt={parentThemeName} 
                                    className="w-full h-full object-contain"
                                    onError={handleImageError}
                                />
                            </div>
                        )}
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'url(/images/lego_pattern_bg.png)', backgroundSize: '200px' }}></div>
                    <div className="absolute top-4 right-8 w-20 h-20 bg-yellow-400 rounded-full opacity-20"></div>
                    <div className="absolute bottom-6 left-10 w-16 h-16 bg-red-400 rounded-lg transform rotate-12 opacity-30"></div>
                </div>
            </div>
        );
    };

    const renderSearchAndFilters = () => {
        const yearOptions = getYearOptions();
        const decadeOptions = getDecadeOptions();
        
        return (
            <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-2xl">
                            <form onSubmit={handleSearch} className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FontAwesomeIcon icon="search" className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search sets by name or number..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button 
                                    type="submit"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-white"
                                >
                                    <FontAwesomeIcon icon="search" />
                                </button>
                            </form>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={toggleFilters}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                    showFilters || Object.values(filterOptions).some(value => value !== 'all' && value !== 'year_desc')
                                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <FontAwesomeIcon icon="filter" />
                                <span className="font-medium">Filters</span>
                                {(filterOptions.decade !== 'all' || filterOptions.pieces !== 'all' || filterOptions.year !== 'all' || filterOptions.sort !== 'year_desc') && (
                                    <span className="ml-1 w-5 h-5 bg-white text-red-600 rounded-full text-xs flex items-center justify-center font-bold">
                                        {(filterOptions.decade !== 'all' ? 1 : 0) + 
                                         (filterOptions.pieces !== 'all' ? 1 : 0) + 
                                         (filterOptions.year !== 'all' ? 1 : 0) +
                                         (filterOptions.sort !== 'year_desc' ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                            
                            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleView('grid')}
                                    className={`px-3 py-2 ${activeView === 'grid' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <FontAwesomeIcon icon="th" />
                                </button>
                                <button
                                    onClick={() => toggleView('list')}
                                    className={`px-3 py-2 ${activeView === 'list' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <FontAwesomeIcon icon="list" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {showFilters && (
                    <div className="p-4 md:p-6 border-b border-gray-200 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1 font-medium">Sort By</label>
                                <select
                                    value={filterOptions.sort}
                                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="year_desc">Newest First</option>
                                    <option value="year_asc">Oldest First</option>
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="name_desc">Name (Z-A)</option>
                                    <option value="pieces_desc">Most Pieces</option>
                                    <option value="pieces_asc">Fewest Pieces</option>
                                </select>
                            </div>
                            
                            {decadeOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1 font-medium">Decade</label>
                                    <select
                                        value={filterOptions.decade}
                                        onChange={(e) => handleFilterChange('decade', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="all">All Decades</option>
                                        {decadeOptions.map(decade => (
                                            <option key={decade} value={decade}>{decade}s</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {yearOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1 font-medium">Year</label>
                                    <select
                                        value={filterOptions.year}
                                        onChange={(e) => handleFilterChange('year', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="all">All Years</option>
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm text-gray-600 mb-1 font-medium">Piece Count</label>
                                <select
                                    value={filterOptions.pieces}
                                    onChange={(e) => handleFilterChange('pieces', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="all">Any Number</option>
                                    <option value="1-100">Small (1-100)</option>
                                    <option value="101-500">Medium (101-500)</option>
                                    <option value="501-1000">Large (501-1000)</option>
                                    <option value="1001-2000">X-Large (1001-2000)</option>
                                    <option value="2001-">Huge (2001+)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">{filteredSets.length}</span> sets found
                            </div>
                            
                            <button
                                onClick={resetFilters}
                                className="px-4 py-1 text-red-600 hover:text-red-700 text-sm font-medium focus:outline-none"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
                
                {getSelectedSetCount() > 0 && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mr-3">
                                    <FontAwesomeIcon icon="shopping-basket" />
                                </div>
                                <span className="text-gray-800 font-medium">
                                    {getSelectedSetCount()} {getSelectedSetCount() === 1 ? 'set' : 'sets'} selected
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                                    onClick={(e) => addToCollection(null, e)}
                                >
                                    <FontAwesomeIcon icon="plus" />
                                    <span>Add to Collection</span>
                                </button>
                                
                                <button 
                                    className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                    onClick={(e) => addToWishlist(null, e)}
                                >
                                    <FontAwesomeIcon icon="heart" />
                                    <span>Add to Wishlist</span>
                                </button>
                                
                                <button 
                                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                    onClick={clearSelectedSets}
                                >
                                    <FontAwesomeIcon icon="times" />
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSubThemes = () => {
        if (subThemes.length === 0) return null;
        
        return (
            <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <FontAwesomeIcon icon="folder-open" className="text-red-600 mr-3" />
                        Sub-Themes
                    </h2>
                </div>
                
                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {subThemes.map(theme => (
                            <button 
                                key={theme.id} 
                                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-red-200 hover:bg-red-50/30 group"
                                onClick={() => handleThemeClick(theme.id)}
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
                                    <FontAwesomeIcon icon="cubes" className="text-gray-600 group-hover:text-red-600 transition-colors" />
                                </div>
                                <span className="text-center font-medium text-gray-800 group-hover:text-red-600 transition-colors">
                                    {theme.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderSetCardGrid = (set) => {
        const isSubmitted = submittedSets[set.set_num];
        const isSelected = selectedSets[set.set_num] !== undefined;
        
        return (
            <div
                key={set.set_num}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md
                          ${isSelected ? 'ring-2 ring-red-500 border-red-200' : 'border-gray-200'}`}
                onClick={() => toggleSelectSet(set.set_num)}
            >
                <div className="p-4">
                    <div className="relative h-40 flex items-center justify-center mb-4">
                        {!loadedImages[set.set_num] && (
                            <Skeleton height={150} width="100%" />
                        )}
                        <img
                            src={set.img_url}
                            alt={set.name}
                            className={`h-full object-contain ${loadedImages[set.set_num] ? 'opacity-100' : 'opacity-0'}`}
                            onError={handleImageError}
                            onLoad={() => handleImageLoad(set.set_num)}
                            style={{ transition: 'opacity 0.3s' }}
                        />
                        
                        {/* Indicator for sets added to collection or wishlist */}
                        {isSubmitted && (
                            <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md ${
                                isSubmitted === 'collection' ? 'bg-green-600' : 'bg-yellow-500'
                            }`}>
                                <FontAwesomeIcon icon="check" />
                            </div>
                        )}
                    </div>
                    
                    <h3 className="font-medium text-gray-800 mb-2 line-clamp-2 h-12">
                        {set.name}
                    </h3>
                    
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-600 font-mono">{set.set_num}</span>
                        <span className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded">{set.year}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        <div className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-1 flex items-center">
                            <FontAwesomeIcon icon="puzzle-piece" className="mr-1" />
                            <span>{parseInt(set.num_parts).toLocaleString()}</span>
                        </div>
                        
                        {set.minifigs > 0 && (
                            <div className="text-xs bg-yellow-50 text-yellow-700 rounded-full px-2 py-1 flex items-center">
                                <FontAwesomeIcon icon="user" className="mr-1" />
                                <span>{set.minifigs}</span>
                            </div>
                        )}
                    </div>
                    
                    {isSelected ? (
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
                                    className="py-2 px-3 rounded text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
                                    onClick={(e) => addToCollection(set.set_num, e)}
                                >
                                    <FontAwesomeIcon icon="plus" />
                                    <span>Add To Collection</span>
                                </button>
                                <button
                                    className="py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center justify-center gap-2"
                                    onClick={(e) => addToWishlist(set.set_num, e)}
                                >
                                    <FontAwesomeIcon icon="heart" />
                                    <span>Add to Wishlist</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon="plus" />
                            <span>Add Set</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSetCardList = (set) => {
        const isSubmitted = submittedSets[set.set_num];
        const isSelected = selectedSets[set.set_num] !== undefined;
        
        return (
            <div
                key={set.set_num}
                className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md
                          ${isSelected ? 'ring-2 ring-red-500 border-red-200' : 'border-gray-200'}`}
                onClick={() => toggleSelectSet(set.set_num)}
            >
                <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 p-4 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-200">
                        {!loadedImages[set.set_num] ? (
                            <Skeleton height={100} width={100} />
                        ) : (
                            <img
                                src={set.img_url}
                                alt={set.name}
                                className="h-24 object-contain"
                                onError={handleImageError}
                            />
                        )}
                    </div>
                    
                    <div className="flex-grow p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-gray-800 line-clamp-1">
                                    {set.name}
                                </h3>
                                
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-600 font-mono">{set.set_num}</span>
                                    <span className="text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded">{set.year}</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <div className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-1 flex items-center">
                                        <FontAwesomeIcon icon="puzzle-piece" className="mr-1" />
                                        <span>{parseInt(set.num_parts).toLocaleString()}</span>
                                    </div>
                                    
                                    {set.minifigs > 0 && (
                                        <div className="text-xs bg-yellow-50 text-yellow-700 rounded-full px-2 py-1 flex items-center">
                                            <FontAwesomeIcon icon="user" className="mr-1" />
                                            <span>{set.minifigs}</span>
                                        </div>
                                    )}
                                    
                                    {isSubmitted && (
                                        <div className={`text-xs rounded-full px-2 py-1 flex items-center ${
                                            isSubmitted === 'collection' 
                                                ? 'bg-green-50 text-green-700' 
                                                : 'bg-yellow-50 text-yellow-700'
                                        }`}>
                                            <FontAwesomeIcon icon="check" className="mr-1" />
                                            <span>
                                                {isSubmitted === 'collection' ? 'Added to Collection' : 'Added to Wishlist'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {isSelected ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded">
                                        <button
                                            className="w-7 h-7 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            onClick={(e) => handleQuantityChange(set.set_num, Math.max(1, selectedSets[set.set_num] - 1), e)}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="text"
                                            className="w-10 h-7 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                            className="w-7 h-7 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            onClick={(e) => handleQuantityChange(set.set_num, selectedSets[set.set_num] + 1, e)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    
                                    <button
                                        className="py-1.5 px-3 rounded text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700"
                                        onClick={(e) => addToCollection(set.set_num, e)}
                                    >
                                        <FontAwesomeIcon icon="plus" size="sm" />
                                        <span>Collection</span>
                                    </button>
                                    
                                    <button
                                        className="py-1.5 px-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center justify-center gap-1"
                                        onClick={(e) => addToWishlist(set.set_num, e)}
                                    >
                                        <FontAwesomeIcon icon="heart" size="sm" />
                                        <span>Wishlist</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors flex items-center justify-center gap-1 self-end md:self-auto"
                                >
                                    <FontAwesomeIcon icon="plus" size="sm" />
                                    <span>Add Set</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSets = () => {
        if (isLoading) {
            return (
                <div className="py-16">
                    <LoadingSpinner text="Loading sets..." size="lg" />
                </div>
            );
        }
        
        if (error) {
            return (
                <ErrorMessage 
                    message={error} 
                    onRetry={() => setError(null)} 
                />
            );
        }
        
        if (filteredSets.length === 0) {
            return (
                <EmptyState 
                    message={
                        Object.values(filterOptions).some(value => value !== 'all' && value !== 'year_desc')
                            ? "No sets found matching your filters."
                            : "No sets found for this theme."
                    }
                    actionText={Object.values(filterOptions).some(value => value !== 'all' && value !== 'year_desc') ? "Reset Filters" : null}
                    onAction={resetFilters}
                    icon="search"
                    className="py-12"
                />
            );
        }
        
        return (
            <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <FontAwesomeIcon icon="cube" className="text-red-600 mr-3" />
                        Sets ({filteredSets.length} shown)
                    </h2>
                </div>
                
                <div className="p-4 md:p-6">
                    {activeView === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredSets.map(set => renderSetCardGrid(set))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredSets.map(set => renderSetCardList(set))}
                        </div>
                    )}
                    
                    {isLoadingMore && (
                        <div className="text-center py-8">
                            <div className="inline-block h-8 w-8 simple-spinner mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">Loading more sets...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Theme Header */}
                {renderThemeHeader()}
                
                {/* Modal for login prompts or confirmations */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={modalContent.onConfirm}
                    title={modalContent.title}
                    confirmText={modalContent.confirmText || "Confirm"}
                >
                    {modalContent.message}
                </Modal>
                
                {/* Subthemes Section - Only show if there are subthemes */}
                {!isLoading && renderSubThemes()}
                
                {/* Search and Filters */}
                {!isLoading && sets.length > 0 && renderSearchAndFilters()}
                
                {/* Sets Grid/List */}
                {renderSets()}
            </div>
        </div>
    );
};

export default SubThemes;