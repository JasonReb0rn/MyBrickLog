import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Themes = () => {
    const [parentThemes, setParentThemes] = useState([]);
    const [popularThemeIds, setPopularThemeIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [submittedSets, setSubmittedSets] = useState({});
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
        })
        .catch(error => {
            console.error('Error fetching themes:', error);
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
            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/search_sets.php?query=${searchQuery}`);
                setSearchResults(response.data);
            } catch (error) {
                console.error('Error fetching search results:', error);
            }
            setIsLoading(false);
        }
    };

    const handleQuantityChange = (setNum, quantity) => {
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

    const addToCollection = (setNum, quantity) => {
        const setToAdd = [{ setNum, quantity }];
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_collection.php`, { sets: setToAdd })
            .then(response => {
                if (response.data.success) {
                    setSubmittedSets(prev => ({ ...prev, [setNum]: true }));
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
                    alert('Failed to add set to collection.');
                }
            })
            .catch(error => console.error('Error adding set to collection:', error));
    };
    

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png'; // Set fallback image path
    };

    const clearSearchResults = () => {
        setSearchResults([]);
        setSearchQuery('');
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            
            {searchResults.length === 0 && (
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">
                Select Theme
              </h2>
            )}

            <form onSubmit={handleSearchSubmit} className="mb-8">
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-3xl mx-auto">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search by set name or number"
                        className="flex-grow py-2 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon="magnifying-glass" />
                        <span>Search</span>
                    </button>
                </div>
            </form>

            {searchResults.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {getSortedThemes().map(theme => (
                        <button
                            key={theme.id}
                            className={`w-44 py-3 px-4 bg-white rounded-lg shadow-md border transition-all duration-200 hover:shadow-lg hover:scale-105
                                      ${popularThemeIds.includes(Number(theme.id)) 
                                        ? 'border-red-600 font-medium' 
                                        : 'border-gray-200'}`}
                            onClick={() => handleThemeClick(theme.id)}
                        >   
                            <span className="flex items-center justify-center">
                                {theme.name}
                                {popularThemeIds.includes(Number(theme.id)) && (
                                    <FontAwesomeIcon icon="fire" className="ml-2 text-red-600" />
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <button 
                        onClick={clearSearchResults} 
                        className="mb-8 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <FontAwesomeIcon icon="arrow-left" />
                        <span>Return to Themes</span>
                    </button>
                    
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Search Results</h2>
                    
                    <div className="flex flex-wrap justify-center gap-6">
                        {searchResults.map(set => (
                            <div
                                key={set.set_num}
                                className={`w-56 p-4 bg-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg relative
                                         ${selectedSets[set.set_num] ? 'ring-2 ring-blue-500 bg-blue-50' : 'border border-gray-200'}`}
                                onClick={() => toggleSelectSet(set.set_num)}
                            >
                                <div className="h-32 flex items-center justify-center mb-4 relative">
                                    <img 
                                        src={set.img_url} 
                                        alt={set.name} 
                                        className="h-full object-contain" 
                                        onError={handleImageError}
                                        loading="lazy"
                                    />
                                </div>
                                
                                <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{set.name} ({set.year})</h3>
                                
                                <div className="text-sm text-gray-600">
                                    {selectedSets[set.set_num] !== undefined ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuantityChange(set.set_num, Math.max(1, selectedSets[set.set_num] - 1));
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="text"
                                                    className="w-12 h-8 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                    value={selectedSets[set.set_num]}
                                                    onChange={(e) => {
                                                        const quantity = parseInt(e.target.value, 10);
                                                        if (!isNaN(quantity) && quantity > 0) {
                                                            handleQuantityChange(set.set_num, quantity);
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuantityChange(set.set_num, selectedSets[set.set_num] + 1);
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                className={`py-2 px-3 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center gap-2
                                                          ${submittedSets[set.set_num] 
                                                            ? 'bg-green-500 hover:bg-green-600' 
                                                            : 'bg-blue-500 hover:bg-blue-600'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCollection(set.set_num, selectedSets[set.set_num]);
                                                }}
                                            >
                                                {submittedSets[set.set_num] ? (
                                                    <>
                                                        <FontAwesomeIcon icon="thumbs-up" />
                                                        Added!
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon="plus" />
                                                        Add To Collection
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="block text-center">{set.set_num}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {isLoading && (
                <div className="text-center py-8">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            )}
        </div>
    );
};

export default Themes;