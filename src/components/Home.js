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
    const [activeTab, setActiveTab] = useState('recent');
    const [featuredUserSet, setFeaturedUserSet] = useState(null);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [siteStats, setSiteStats] = useState({
        total_sets: 0,
        total_themes: 0,
        total_priced_sets: 0,
        loading: true
    });

    const INITIAL_SETS_TO_SHOW = 8;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [themesResponse, collectionsResponse, recentSetsResponse, statsResponse, featuredUserSetResponse] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/get_popular_themes.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_random_collections.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_recent_set_additions.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_site_statistics.php`),
                    axios.get(`${process.env.REACT_APP_API_URL}/get_random_user_set.php`)
                ]);
    
                setPopularThemes(themesResponse.data);
                setUserCollections(collectionsResponse.data);
                setRecentSets(recentSetsResponse.data.sets);
                setHasRecentSets(recentSetsResponse.data.hasRecentSets);
                
                // Set site statistics
                setSiteStats({
                    total_sets: statsResponse.data.total_sets,
                    total_themes: statsResponse.data.total_themes,
                    total_priced_sets: statsResponse.data.total_priced_sets,
                    loading: false
                });
                
                // Set featured user set
                if (featuredUserSetResponse.data && !featuredUserSetResponse.data.error) {
                    setFeaturedUserSet(featuredUserSetResponse.data);
                }
                setLoadingFeatured(false);
                
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoadingFeatured(false);
                setSiteStats(prevState => ({...prevState, loading: false}));
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
        } else {
            navigate('/login');
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
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white overflow-hidden min-h-[80vh] flex items-center">
                {/* Background Elements */}
                <div className="absolute inset-0">
                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }}></div>
                    {/* Geometric shapes */}
                    <div className="absolute top-20 left-10 w-24 h-24 bg-yellow-400 rounded-3xl opacity-20 transform rotate-12"></div>
                    <div className="absolute top-40 right-20 w-16 h-16 bg-white rounded-2xl opacity-10 transform -rotate-12"></div>
                    <div className="absolute bottom-20 right-1/3 w-12 h-12 bg-red-400 rounded-lg opacity-20 transform rotate-45"></div>
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative z-10 w-full">
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-12 lg:gap-16">
                        {/* Content Section */}
                        <div className="lg:w-3/5 text-center lg:text-left">
                            <div className="mb-6">
                                <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white border-opacity-30">
                                    <FontAwesomeIcon icon="star" className="mr-2 text-yellow-300" />
                                    The Ultimate LEGO® Collection Manager
                                </div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-none">
                                    <span className="block text-white mb-2">Track Your</span>
                                    <span className="block bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                                        LEGO® Collection
                                    </span>
                                </h1>
                                <p className="text-xl md:text-2xl mb-8 text-red-50 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                    Organize, showcase, and discover new sets. Never lose track of your brick collection again with our comprehensive tracking system.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                {user ? (
                                    <>
                                        <Link 
                                            to={`/collection/${user.user_id}`}
                                            className="group px-8 py-4 bg-white text-red-600 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon="folder-open" className="mr-3 group-hover:scale-110 transition-transform" />
                                            My Collection
                                        </Link>
                                        <Link 
                                            to="/themes"
                                            className="group px-8 py-4 bg-gradient-to-r from-yellow-400 to-amber-400 text-red-800 rounded-2xl font-bold text-lg hover:from-yellow-300 hover:to-amber-300 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon="plus" className="mr-3 group-hover:scale-110 transition-transform" />
                                            Add Sets
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link 
                                            to="/register"
                                            className="group px-8 py-4 bg-gradient-to-r from-yellow-400 to-amber-400 text-red-800 rounded-2xl font-bold text-lg hover:from-yellow-300 hover:to-amber-300 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon="user-plus" className="mr-3 group-hover:scale-110 transition-transform" />
                                            Start Free Today
                                        </Link>
                                        <Link 
                                            to="/login"
                                            className="group px-8 py-4 bg-white bg-opacity-20 text-white rounded-2xl font-bold text-lg hover:bg-opacity-30 transition-all duration-300 border-2 border-white border-opacity-30 hover:border-opacity-50 backdrop-blur-sm flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon="user" className="mr-3 group-hover:scale-110 transition-transform" />
                                            Sign In
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* Featured Set Section */}
                        <div className="lg:w-2/5 relative">
                            {loadingFeatured ? (
                                <div className="w-full h-80 lg:h-96 rounded-3xl bg-white bg-opacity-20 backdrop-blur-sm animate-pulse"></div>
                            ) : featuredUserSet ? (
                                <div className="relative group">
                                    {/* Main card */}
                                    <div className="bg-white p-8 rounded-3xl shadow-2xl transform rotate-2 group-hover:rotate-0 transition-all duration-500 hover:scale-105 border-4 border-white">
                                        <div className="text-center">
                                            {/* Featured badge */}
                                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                                                    🌟 Featured Set
                                                </div>
                                            </div>
                                            
                                            <div className="h-48 lg:h-56 w-full flex items-center justify-center mb-6 bg-white rounded-2xl">
                                                <img
                                                    src={featuredUserSet.set.img_url || '/images/lego_piece_questionmark.png'}
                                                    alt={featuredUserSet.set.name}
                                                    className="h-full object-contain"
                                                    onError={(e) => e.target.src = '/images/lego_piece_questionmark.png'}
                                                />
                                            </div>
                                            
                                            <h3 className="text-2xl text-gray-800 font-bold text-center mb-3 line-clamp-2">
                                                {featuredUserSet.set.name}
                                            </h3>
                                            
                                            <div className="flex items-center justify-center gap-4 mb-4">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                                                    #{featuredUserSet.set.set_num}
                                                </span>
                                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                                                    {featuredUserSet.set.year}
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-600 mb-6 text-sm">
                                                from <Link 
                                                    to={`/collection/${featuredUserSet.user.user_id}`}
                                                    className="text-red-600 hover:text-red-800 font-bold underline decoration-2 underline-offset-2"
                                                >
                                                    {featuredUserSet.user.username}'s
                                                </Link> collection
                                            </p>
                                            
                                            <button 
                                                onClick={() => toggleSelectSet(featuredUserSet.set.set_num)}
                                                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                            >
                                                <FontAwesomeIcon icon="plus" className="mr-2" />
                                                Add to My Collection
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Floating decorative elements */}
                                    <div className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl transform rotate-12 opacity-80 shadow-lg"></div>
                                    <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl transform -rotate-12 opacity-70 shadow-lg"></div>
                                    <div className="absolute top-16 -right-4 w-8 h-8 bg-yellow-300 rounded-lg transform rotate-45 opacity-60"></div>
                                </div>
                            ) : (
                                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-8 rounded-3xl border border-white border-opacity-30">
                                    <div className="text-center">
                                        <FontAwesomeIcon icon="cubes" className="text-6xl mb-4 opacity-50" />
                                        <p className="text-white text-lg">No featured set available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Bottom gradient transition */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 via-gray-50/50 to-transparent"></div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Content Selection Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-white rounded-lg p-1 shadow">
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'recent' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setActiveTab('recent')}
                        >
                            <FontAwesomeIcon icon="clock" className="mr-2" />
                            Recent Sets
                        </button>
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'themes' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setActiveTab('themes')}
                        >
                            <FontAwesomeIcon icon="cubes" className="mr-2" />
                            Popular Themes
                        </button>
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'users' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setActiveTab('users')}
                        >
                            <FontAwesomeIcon icon="users" className="mr-2" />
                            User Collections
                        </button>
                    </div>
                </div>

                {/* Recently Added Sets */}
                {activeTab === 'recent' && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                <FontAwesomeIcon icon="clock" className="mr-2 text-red-600" />
                                Recently Added Sets
                            </h2>
                            <Link to="/themes" className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium">
                                View All Sets <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayedSets.map(set => (
                                <div
                                    key={set.set_num}
                                    className={`rounded-lg shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md ${
                                        selectedSets[set.set_num] ? 'border-red-500 ring-2 ring-red-500 ring-opacity-50' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="p-4">
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
                                        
                                        <h3 className="font-medium text-gray-800 mb-1 line-clamp-2 h-12">
                                            {set.name}
                                        </h3>
                                        
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-gray-600">{set.set_num}</span>
                                            <span className="text-sm font-semibold bg-gray-200 px-2 py-1 rounded">{set.year}</span>
                                        </div>
                                        
                                        {selectedSets[set.set_num] !== undefined ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center gap-2 bg-gray-100 p-2 rounded">
                                                    <button
                                                        className="w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(set.set_num, Math.max(1, selectedSets[set.set_num] - 1));
                                                        }}
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
                                                                handleQuantityChange(set.set_num, quantity);
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        className="w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                                        className={`py-2 px-3 rounded text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                                            submittedSets[set.set_num] 
                                                                ? 'bg-green-600 hover:bg-green-700' 
                                                                : 'bg-red-600 hover:bg-red-700'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCollection(set.set_num, selectedSets[set.set_num]);
                                                        }}
                                                    >
                                                        {submittedSets[set.set_num] ? (
                                                            <>
                                                                <FontAwesomeIcon icon="check" className="mr-2" />
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
                                                        className="py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToWishlist(set.set_num);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon="heart" className="mr-2" />
                                                        Add to Wishlist
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => toggleSelectSet(set.set_num)}
                                                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                            >
                                                <FontAwesomeIcon icon="plus" className="mr-2" />
                                                Add Set
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {hasMoreSets && (
                            <div className="text-center mt-8">
                                <button 
                                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                            </div>
                        )}
                    </div>
                )}

                {/* Popular Themes */}
                {activeTab === 'themes' && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                <FontAwesomeIcon icon="cubes" className="mr-2 text-red-600" />
                                Popular Themes
                            </h2>
                            <Link to="/themes" className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium">
                                View All Themes <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {popularThemes.map(theme => (
                                <div 
                                    key={theme.id} 
                                    className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1"
                                    onClick={() => handleThemeClick(theme.id)}
                                >
                                    <div className="h-32 relative">
                                        {!loadedThemeImages[theme.id] && (
                                            <div className="absolute inset-0">
                                                <Skeleton height="100%" />
                                            </div>
                                        )}
                                        <img 
                                            src={`https://mybricklog.s3.us-east-2.amazonaws.com/themes/${theme.id}.png`}
                                            alt={theme.name} 
                                            className={`w-full h-full object-cover ${loadedThemeImages[theme.id] ? 'opacity-100' : 'opacity-0'}`}
                                            onError={(e) => e.target.src = '/images/lego_piece_questionmark.png'}
                                            onLoad={() => handleThemeImageLoad(theme.id)}
                                            style={{ transition: 'opacity 0.3s' }}
                                        />
                                        
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-semibold text-gray-800 truncate">{theme.name}</h3>
                                        <p className="text-xs text-gray-500">
                                            {theme.collection_count} sets in collections
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* User Collections */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                <FontAwesomeIcon icon="users" className="mr-2 text-red-600" />
                                User Collections
                            </h2>
                            {user && (
                                <Link to={`/collection/${user.user_id}`} className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium">
                                    View My Collection <FontAwesomeIcon icon="arrow-right" className="ml-1" />
                                </Link>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {userCollections.map(user => (
                                <Link 
                                    key={user.user_id} 
                                    to={`/collection/${user.user_id}`} 
                                    className="block group"
                                >
                                    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:-translate-y-1">
                                        <div className="aspect-square overflow-hidden">
                                            <img 
                                                src={user.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${user.profile_picture}` : '/images/lego_user.png'}
                                                alt={user.username} 
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                            />
                                        </div>
                                        <div className="p-3 text-center">
                                            <h3 className="font-medium text-gray-800 truncate">{user.username}</h3>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Statistics Banner */}
            <section className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="p-6">
                            {siteStats.loading ? (
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-8 bg-gray-700 animate-pulse rounded mb-2"></div>
                                    <div className="w-32 h-4 bg-gray-700 animate-pulse rounded"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold text-yellow-400 mb-2">{siteStats.total_sets.toLocaleString()}+</div>
                                    <p className="text-gray-300">LEGO® Sets Cataloged</p>
                                </>
                            )}
                        </div>
                        <div className="p-6">
                            {siteStats.loading ? (
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-16 h-8 bg-gray-700 animate-pulse rounded mb-2"></div>
                                    <div className="w-32 h-4 bg-gray-700 animate-pulse rounded"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold text-yellow-400 mb-2">{siteStats.total_themes.toLocaleString()}+</div>
                                    <p className="text-gray-300">Unique Themes</p>
                                </>
                            )}
                        </div>
                        <div className="p-6">
                            {siteStats.loading ? (
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-8 bg-gray-700 animate-pulse rounded mb-2"></div>
                                    <div className="w-32 h-4 bg-gray-700 animate-pulse rounded"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold text-yellow-400 mb-2">{siteStats.total_priced_sets.toLocaleString()}+</div>
                                    <p className="text-gray-300">Sets Priced</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        Why Use <span className="text-red-600">MyBrickLog</span>?
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <FontAwesomeIcon icon="folder-open" size="lg" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">Organize Your Collection</h3>
                            <p className="text-gray-600 text-center">
                                Keep track of all your LEGO® sets in one place. Never forget which sets you own.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <FontAwesomeIcon icon="heart" size="lg" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">Build a Wishlist</h3>
                            <p className="text-gray-600 text-center">
                                Create wishlists of sets you'd love to add to your collection next.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <FontAwesomeIcon icon="users" size="lg" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">Connect with Others</h3>
                            <p className="text-gray-600 text-center">
                                Discover other collectors and see what sets are most popular in the community.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to organize your collection?</h2>
                    <p className="text-xl mb-8">Join thousands of LEGO® enthusiasts and take control of your brick collection today.</p>
                    
                    {!user ? (
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link 
                                to="/register"
                                className="px-8 py-3 bg-yellow-400 text-red-700 rounded-lg font-semibold hover:bg-yellow-300 transition-colors shadow-md text-lg"
                            >
                                <FontAwesomeIcon icon="user-plus" className="mr-2" />
                                Create Free Account
                            </Link>
                            <Link 
                                to="/login"
                                className="px-8 py-3 bg-white bg-opacity-20 text-white rounded-lg font-semibold hover:bg-opacity-30 transition-colors border border-white border-opacity-50 text-lg"
                            >
                                <FontAwesomeIcon icon="user" className="mr-2" />
                                Sign In
                            </Link>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Link 
                                to="/themes"
                                className="px-8 py-3 bg-yellow-400 text-red-700 rounded-lg font-semibold hover:bg-yellow-300 transition-colors shadow-md text-lg"
                            >
                                <FontAwesomeIcon icon="plus" className="mr-2" />
                                Add Sets to Collection
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials 
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        What Builders Are Saying
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow relative">
                            <div className="text-yellow-400 mb-4 flex">
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                            </div>
                            <p className="text-gray-600 mb-4">
                                "Finally, a way to keep track of my massive collection! I used to buy duplicates all the time, but not anymore."
                            </p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold mr-3">
                                    M
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Mark Thompson</h4>
                                    <p className="text-sm text-gray-500">LEGO City collector</p>
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded transform rotate-12"></div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow relative">
                            <div className="text-yellow-400 mb-4 flex">
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                            </div>
                            <p className="text-gray-600 mb-4">
                                "I love being able to showcase my collection and seeing what other builders have. Great community!"
                            </p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold mr-3">
                                    S
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Sarah Johnson</h4>
                                    <p className="text-sm text-gray-500">Star Wars enthusiast</p>
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded transform rotate-12"></div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow relative">
                            <div className="text-yellow-400 mb-4 flex">
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                                <FontAwesomeIcon icon="star" />
                            </div>
                            <p className="text-gray-600 mb-4">
                                "The wishlist feature helps me plan my future purchases. This site has become essential for my LEGO hobby."
                            </p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold mr-3">
                                    J
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">James Rodriguez</h4>
                                    <p className="text-sm text-gray-500">Technic builder</p>
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded transform rotate-12"></div>
                        </div>
                    </div>
                </div>
            </section>*/}

            {/* Newsletter */}
            <section className="py-12 bg-white border-t border-gray-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Stay Updated with LEGO® News</h2>
                    <p className="text-gray-600 mb-6">
                        Subscribe to our newsletter for the latest set releases, features, and community highlights.
                    </p>
                    
                    <form className="flex max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="flex-1 px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded-r-lg hover:bg-red-700 transition-colors"
                        >
                            Subscribe
                        </button>
                    </form>
                    
                    <p className="text-xs text-gray-500 mt-4">
                        We respect your privacy and will never share your information.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Home;