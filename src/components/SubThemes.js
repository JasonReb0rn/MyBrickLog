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
        <div className="content">
            <div className="theme-navigation-section">
                <div className="theme-header-container">
                    <button onClick={goBack} className="navigation-button">
                        <FontAwesomeIcon icon="arrow-left" className="button-icon" />
                        Back to Themes
                    </button>
                    <h1 className="theme-subtheme-title">{parentThemeName}</h1>
                </div>
    
                {subThemes.length > 0 && (
                    <div className="subthemes-section">
                        <h2 className="section-header">Sub-Themes</h2>
                        <div className="subthemes-grid">
                            {subThemes.map(theme => (
                                <button 
                                    key={theme.id} 
                                    className="subtheme-button"
                                    onClick={() => handleThemeClick(theme.id)}
                                >
                                    <span className="subtheme-name">{theme.name}</span>
                                    <FontAwesomeIcon icon="chevron-right" className="chevron-icon" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                <div className="sets-section">
                    <div className="sets-header">
                        <h2 className="theme-subtheme-title">Sets</h2>
                        {Object.keys(selectedSets).length > 0 && (
                            <div className="selected-actions">
                                <button 
                                    className="collection-action-button"
                                    onClick={() => addToCollection()}
                                >
                                    <FontAwesomeIcon icon="plus" className="button-icon" />
                                    Add Selected to Collection
                                </button>
                                <button 
                                    className="wishlist-action-button"
                                    onClick={addToWishlist}
                                >
                                    <FontAwesomeIcon icon="star" className="button-icon" />
                                    Add Selected to Wishlist
                                </button>
                                <span className="selected-count">
                                    {Object.keys(selectedSets).length} selected
                                </span>
                            </div>
                        )}
                    </div>
    
                    <div className="sets-grid">
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
                                            <div className="button-container">
                                                <button
                                                    className="add-to-collection-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCollection(set.set_num, selectedSets[set.set_num]);
                                                    }}
                                                >
                                                    {submittedSets[set.set_num] ? (
                                                        <>
                                                            <FontAwesomeIcon icon="thumbs-up" style={{ marginRight: '8px' }} />
                                                            Added!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FontAwesomeIcon icon="plus" style={{ marginRight: '8px' }} />
                                                            Add To Collection
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    className="wishlist-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToWishlist();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="plus" style={{ marginRight: '8px' }} />
                                                    Add to Wishlist
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        set.set_num
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
    
                    {isLoading && (
                        <div className="loading-indicator">
                            <Skeleton count={3} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubThemes;