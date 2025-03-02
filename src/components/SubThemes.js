import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SubThemes = () => {
    const [subThemes, setSubThemes] = useState([]);
    const [sets, setSets] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [submittedSets, setSubmittedSets] = useState({});
    const [submittedWishlist, setSubmittedWishlist] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { themeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [parentThemeName, setParentThemeName] = useState('');
    const [loadedImages, setLoadedImages] = useState({});

    useEffect(() => {
        const fetchSubThemes = async () => {
            try {
                axios.defaults.withCredentials = true;
                const subThemesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get_sub_themes.php?parent_id=${themeId}`);
                setSubThemes(subThemesResponse.data);
                if (subThemesResponse.data.length > 0) {
                    setParentThemeName(subThemesResponse.data[0].parent_theme_name);
                }
            } catch (error) {
                console.error('Error fetching sub-themes:', error);
            }
        };

        fetchSubThemes();
        setSets([]); 
        setPage(1);
        setHasMore(true);
    }, [themeId]);

    useEffect(() => {
        const fetchSets = async () => {
            if (!hasMore) return;
            
            setIsLoading(true);
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
                console.error('Error:', error);
                setHasMore(false);
            }
            setIsLoading(false);
        };
     
        fetchSets();
     }, [page, themeId, hasMore]);

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop 
                >= document.documentElement.offsetHeight - 100 
                && !isLoading 
                && hasMore
            ) {
                setPage(prevPage => prevPage + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoading, hasMore]);

    useEffect(() => {
        if (submittedSets) {
            setTimeout(() => setSubmittedSets(false), 5000);
        }
    }, [submittedSets]);

    useEffect(() => {
        if (submittedWishlist) {
            setTimeout(() => setSubmittedWishlist(false), 5000);
        }
    }, [submittedWishlist]);

    const handleThemeClick = (subThemeId) => {
        navigate(`/themes/${subThemeId}`);
    };

    const handleQuantityChange = (setNum, quantity) => {
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
        }
    };

    const addToCollection = (setNum = null) => {
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
                        newSubmittedSets[set.setNum] = true;
                    });
                    setSubmittedSets(prev => ({ ...prev, ...newSubmittedSets }));
    
                    // Clear selected sets
                    setSelectedSets({});
    
                    // Remove added sets from the display
                    setSets(prevSets => 
                        prevSets.filter(set => !setsToAdd.some(addedSet => 
                            addedSet.setNum === set.set_num
                        ))
                    );
                } else {
                    alert('Failed to add sets to collection.');
                }
            })
            .catch(error => console.error('Error adding sets to collection:', error));
    };

    const addToWishlist = () => {
        const setsToAdd = Object.entries(selectedSets)
            .filter(([setNum, quantity]) => quantity)
            .map(([setNum, quantity]) => ({ setNum, quantity }));
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_wishlist.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    setSubmittedWishlist(true);
                    setSelectedSets({});
                } else {
                    alert('Failed to add sets to wishlist.');
                }
            })
            .catch(error => console.error('Error adding sets to wishlist:', error));
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

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <button 
                        onClick={goBack} 
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <FontAwesomeIcon icon="arrow-left" />
                        <span>Back to Themes</span>
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{parentThemeName}</h1>
                </div>
    
                {subThemes.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sub-Themes</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {subThemes.map(theme => (
                                <button 
                                    key={theme.id} 
                                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                    onClick={() => handleThemeClick(theme.id)}
                                >
                                    <span className="text-gray-800 font-medium">{theme.name}</span>
                                    <FontAwesomeIcon icon="chevron-right" className="text-gray-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-gray-50 border-b border-gray-200 gap-4">
                        <h2 className="text-xl font-semibold text-gray-800">Sets</h2>
                        {Object.keys(selectedSets).length > 0 && (
                            <div className="flex flex-wrap items-center gap-3">
                                <button 
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                    onClick={() => addToCollection()}
                                >
                                    <FontAwesomeIcon icon="plus" />
                                    <span>Add Selected to Collection</span>
                                </button>
                                <button 
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors flex items-center gap-2"
                                    onClick={addToWishlist}
                                >
                                    <FontAwesomeIcon icon="star" />
                                    <span>Add Selected to Wishlist</span>
                                </button>
                                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                                    {Object.keys(selectedSets).length} selected
                                </span>
                            </div>
                        )}
                    </div>
    
                    <div className="p-6 flex flex-wrap justify-center gap-6">
                        {sets.map(set => (
                            <div
                                key={set.set_num}
                                className={`w-56 p-4 bg-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg relative
                                        ${selectedSets[set.set_num] ? 'ring-2 ring-blue-500 bg-blue-50' : 'border border-gray-200'} 
                                        ${user ? 'cursor-pointer' : ''}`}
                                onClick={() => user && toggleSelectSet(set.set_num)}
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
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    className={`py-2 px-3 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center gap-2
                                                              ${submittedSets[set.set_num] 
                                                                ? 'bg-green-500 hover:bg-green-600' 
                                                                : 'bg-blue-500 hover:bg-blue-600'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCollection(set.set_num);
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
                                                <button
                                                    className="py-2 px-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 flex items-center justify-center gap-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToWishlist();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="plus" />
                                                    Add to Wishlist
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="block text-center">{set.set_num}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
    
                    {isLoading && (
                        <div className="text-center py-8">
                            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                            <p className="mt-4 text-gray-600">Loading more sets...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubThemes;