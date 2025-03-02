import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Home = () => {
    const [popularThemes, setPopularThemes] = useState([]);
    const [userCollections, setUserCollections] = useState([]);
    const [recentSets, setRecentSets] = useState([]);
    const [hasRecentSets, setHasRecentSets] = useState(false);
    const [selectedSets, setSelectedSets] = useState({});
    const [submittedSets, setSubmittedSets] = useState({});
    const [showAllRecentSets, setShowAllRecentSets] = useState(false);
    const [loadedImages, setLoadedImages] = useState({});
    const [loadedThemeImages, setLoadedThemeImages] = useState({});
    const navigate = useNavigate();
    const { user } = useAuth();

    const INITIAL_SETS_TO_SHOW = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [themesResponse, collectionsResponse, recentSetsResponse] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/get_popular_themes.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_random_collections.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_recent_set_additions.php`)
                ]);

                setPopularThemes(themesResponse.data);
                setUserCollections(collectionsResponse.data);
                setRecentSets(recentSetsResponse.data.sets);
                setHasRecentSets(recentSetsResponse.data.hasRecentSets);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const handleThemeClick = (themeId) => {
        navigate(`/themes/${themeId}`);
    };

    const toggleSelectSet = (setNum) => {
        if (user) {
            setSelectedSets(prevSelectedSets =>
                prevSelectedSets[setNum]
                    ? { ...prevSelectedSets, [setNum]: undefined }
                    : { ...prevSelectedSets, [setNum]: 1 }
            );
        }
    };

    const handleQuantityChange = (setNum, quantity) => {
        setSelectedSets(prevSelectedSets => ({
            ...prevSelectedSets,
            [setNum]: quantity
        }));
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
                } else {
                    alert('Failed to add set to collection.');
                }
            })
            .catch(error => console.error('Error adding set to collection:', error));
    };

    const addToWishlist = (setNum) => {
        const setsToAdd = [{ setNum, quantity: selectedSets[setNum] }];
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_wishlist.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    setSelectedSets(prev => {
                        const newSelected = { ...prev };
                        delete newSelected[setNum];
                        return newSelected;
                    });
                } else {
                    alert('Failed to add set to wishlist.');
                }
            })
            .catch(error => console.error('Error adding set to wishlist:', error));
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const handleThemeImageLoad = (themeId) => {
        setLoadedThemeImages(prev => ({ ...prev, [themeId]: true }));
    };

    const displayedSets = showAllRecentSets ? recentSets : recentSets.slice(0, INITIAL_SETS_TO_SHOW);
    const hasMoreSets = recentSets.length > INITIAL_SETS_TO_SHOW;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            {/* Hero Section */}
            <div className="py-12 bg-gradient-to-b from-white to-gray-100 rounded-xl shadow-sm mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                    Keep track of your LEGO&copy; collection.
                </h1>
                <div className="text-lg text-gray-600 max-w-3xl mx-auto mb-12 px-4">
                    <p className="mb-4">
                        It's time to get organized and take control of your LEGO collection. 
                        Our platform helps you catalog, manage, and share your sets with friends.
                    </p>
                    <p>No more duplicates, no more forgotten favorites!</p>
                </div>
                
                <div className="text-sm text-gray-500 mt-8">
                    Not affiliated with the LEGO&copy; Group.
                </div>
            </div>

            {/* Recently Added Sets Section */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Recently Added Sets</h2>
                <p className="text-gray-600 mb-8">
                    Discover the newest LEGO sets, freshly added to our database and ready to join your collection.
                </p>
                
                <div className="flex flex-wrap justify-center gap-6">
                    {displayedSets.map(set => (
                        <div
                            key={set.set_num}
                            className={`w-56 p-4 bg-white rounded-lg shadow-md border ${
                                selectedSets[set.set_num] ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            } transition-all duration-200 hover:shadow-lg ${user ? 'cursor-pointer' : ''}`}
                            onClick={() => user && toggleSelectSet(set.set_num)}
                        >
                            <div className="h-32 flex items-center justify-center mb-4 relative">
                                {!loadedImages[set.set_num] && (
                                    <Skeleton height={100} width={120} />
                                )}
                                <img
                                    src={set.img_url || '/images/lego_piece_questionmark.png'}
                                    alt={set.name}
                                    className={`h-full object-contain ${loadedImages[set.set_num] ? 'opacity-100' : 'opacity-0'}`}
                                    onError={(e) => e.target.src = '/images/lego_piece_questionmark.png'}
                                    onLoad={() => handleImageLoad(set.set_num)}
                                    style={{ transition: 'opacity 0.3s' }}
                                />
                            </div>
                            
                            <h3 className="font-medium text-gray-800 mb-2 h-12 overflow-hidden">
                                {set.name} ({set.year})
                            </h3>
                            
                            <div className="text-sm text-gray-600 mb-2">
                                {selectedSets[set.set_num] !== undefined ? (
                                    <div className="flex flex-col gap-2">
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
                                        <div className="flex flex-col gap-2 mt-2">
                                            <button
                                                className={`py-2 px-3 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                                                    submittedSets[set.set_num] 
                                                        ? 'bg-green-500 hover:bg-green-600' 
                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCollection(set.set_num, selectedSets[set.set_num]);
                                                }}
                                            >
                                                {submittedSets[set.set_num] ? (
                                                    <>
                                                        <FontAwesomeIcon icon="thumbs-up" className="mr-2" />
                                                        Added!
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon="plus" className="mr-2" />
                                                        Add To Collection
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                className="py-2 px-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToWishlist(set.set_num);
                                                }}
                                            >
                                                <FontAwesomeIcon icon="plus" className="mr-2" />
                                                Add to Wishlist
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <span>{set.set_num}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {hasMoreSets && (
                    <button 
                        className="mt-8 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        onClick={() => setShowAllRecentSets(!showAllRecentSets)}
                    >
                        {showAllRecentSets ? (
                            <>
                                Show Less <FontAwesomeIcon icon="chevron-up" className="ml-2" />
                            </>
                        ) : (
                            <>
                                Show More <FontAwesomeIcon icon="chevron-down" className="ml-2" />
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Popular Themes Section */}
            <div className="py-12 bg-gray-100 rounded-xl mb-16">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Popular Themes</h2>
                <p className="text-gray-600 mb-8">
                    See what types of sets other users love having in their collection.
                </p>
                
                <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto px-4 mb-8">
                    {popularThemes.map(theme => (
                        <div 
                            key={theme.id} 
                            className="w-40 bg-white rounded-lg shadow-md hover:shadow-xl transition-transform duration-200 hover:scale-105 cursor-pointer overflow-hidden"
                            onClick={() => handleThemeClick(theme.id)}
                        >
                            <div className="h-36 relative">
                                {!loadedThemeImages[theme.id] && (
                                    <div className="absolute inset-0">
                                        <Skeleton height="100%" />
                                    </div>
                                )}
                                <img 
                                    src={theme.theme_image_url || '/images/lego_piece_questionmark.png'} 
                                    alt={theme.name} 
                                    className={`w-full h-full object-cover ${loadedThemeImages[theme.id] ? 'opacity-100' : 'opacity-0'}`}
                                    onError={(e) => e.target.src = '/images/lego_piece_questionmark.png'}
                                    onLoad={() => handleThemeImageLoad(theme.id)}
                                    style={{ transition: 'opacity 0.3s' }}
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-800">{theme.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {theme.collection_count} sets in collections
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <Link 
                    to="/themes" 
                    className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                >
                    Explore other themes!
                </Link>
            </div>

            {/* User Collections Section */}
            <div className="py-12 bg-gray-50 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">User Collections</h2>
                <p className="text-gray-600 mb-8">Randomly selected user's collections</p>
                
                <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto">
                    {userCollections.map(user => (
                        <Link 
                            key={user.user_id} 
                            to={`/collection/${user.user_id}`} 
                            className="w-40 group"
                        >
                            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                                <div className="aspect-square overflow-hidden relative">
                                    <img 
                                        src={user.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${user.profile_picture}` : '/images/lego_user.png'}
                                        alt={user.username} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                    />
                                </div>
                                <div className="p-4 text-center">
                                    <h3 className="font-medium text-gray-800">{user.username}</h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;