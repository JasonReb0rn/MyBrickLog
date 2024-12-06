import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './Themes.css';
import './Styles.css';
import './Sets.css';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SubThemes = () => {
    const [subThemes, setSubThemes] = useState([]);
    const [sets, setSets] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [submittedSets, setSubmittedSets] = useState(false);
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
            setSelectedSets(prevSelectedSets =>
                prevSelectedSets[setNum]
                    ? { ...prevSelectedSets, [setNum]: undefined }
                    : { ...prevSelectedSets, [setNum]: 1 }
            );
        }
    };

    const addToCollection = () => {
        const setsToAdd = Object.entries(selectedSets)
            .filter(([setNum, quantity]) => quantity)
            .map(([setNum, quantity]) => ({ setNum, quantity }));
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_collection.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    setSubmittedSets(true);
                    setSelectedSets({});
                    setSets(prevSets => 
                        prevSets.filter(set => !selectedSets[set.set_num])
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
        <div>
            {subThemes.length > 0 && (
                <button onClick={goBack} className="back-button">Return to themes</button>
            )}
            {subThemes.length > 0 && (
                <>
                    <div className="theme-header">Sub-Themes</div>
                    <div className="themes-list-container">
                        {subThemes.map(theme => (
                            <button key={theme.id} className="theme-button" onClick={() => handleThemeClick(theme.id)}>
                                {theme.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
            {!subThemes.length && (
                <button onClick={goBack} className="back-button">Return to themes</button>
            )}

            <div className="theme-header">{parentThemeName} Sets</div>

            {(Object.keys(selectedSets).filter(setNum => selectedSets[setNum]).length > 0 || submittedSets) && (
                <button onClick={addToCollection} className="add-to-collection-button">
                    {submittedSets ? <FontAwesomeIcon icon="thumbs-up" style={{ marginRight: '8px' }} /> : <FontAwesomeIcon icon="plus" style={{ marginRight: '8px' }} />}
                    {submittedSets ? 'Successfully Added Sets!' : 'Add To Collection'}
                </button>
            )}

            <div className="sets-list-container">
                {sets.map(set => (
                    <div
                        key={set.set_num}
                        className={`set-card ${selectedSets[set.set_num] ? 'selected' : ''}`}
                        onClick={() => toggleSelectSet(set.set_num)}
                    >
                        <div className="set-image-container">
                            {!loadedImages[set.set_num] && (
                                <Skeleton height={100} />
                            )}
                            <img
                                src={set.img_url}
                                alt={set.name}
                                className={`set-image ${loadedImages[set.set_num] ? 'loaded' : 'loading'}`}
                                onError={handleImageError}
                                onLoad={() => handleImageLoad(set.set_num)}
                                style={{ display: loadedImages[set.set_num] ? 'block' : 'none' }}
                            />
                        </div>
                        
                        <div className="set-name">{set.name} ({set.year})</div>
                        <div className="set-num">
                            {selectedSets[set.set_num] !== undefined ? (
                                <div className="quantity-controls">
                                    <button
                                        className="quantity-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuantityChange(set.set_num, Math.max(1, selectedSets[set.set_num] - 1));
                                        }}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="text"
                                        className="quantity-input"
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
                                        className="quantity-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuantityChange(set.set_num, selectedSets[set.set_num] + 1);
                                        }}
                                    >
                                        +
                                    </button>
                                    <button
                                        className="wishlist-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToWishlist();
                                        }}
                                    >
                                        Add to Wishlist
                                    </button>
                                </div>
                            ) : (
                                set.set_num
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="loading">Loading more sets...</div>
                )}
            </div>
        </div>
    );
};

export default SubThemes;