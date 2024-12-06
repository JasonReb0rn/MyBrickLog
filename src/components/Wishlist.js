import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './Themes.css';
import './Collection.css';
import './Styles.css';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Wishlist = () => {
    const [sets, setSets] = useState([]);
    const [username, setUsername] = useState('');
    const [selectedSet, setSelectedSet] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [userExists, setUserExists] = useState(true);
    const { userId } = useParams();
    const { user } = useAuth();
    const [loadedImages, setLoadedImages] = useState({});

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!userId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_user_wishlist.php?user_id=${userId}`);
                if (response.data.error) {
                    if (response.data.error === 'User not found.') {
                        setUserExists(false);
                    }
                    console.error('Error fetching user wishlist:', response.data.error);
                } else {
                    setSets(response.data.sets);
                    setUsername(response.data.username);
                }
            } catch (error) {
                console.error('Error fetching user wishlist:', error);
            }
            setIsLoading(false);
        };
    
        fetchWishlist();
    }, [userId]);

    useEffect(() => {
        if (copiedUrl) {
            setTimeout(() => setCopiedUrl(false), 5000); // Set copiedUrl to false after 5 seconds
        }
    }, [copiedUrl]);

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png'; // Set fallback image path
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const shareWishlist = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedUrl(true); // Set copiedUrl to true after copying the URL
        }).catch(err => {
            console.error('Error copying URL:', err);
        });
    };

    const moveToCollection = async (set_num) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/move_wishlist_to_collection.php`, { user_id: Number(userId), set_num });
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== set_num));
            } else {
                console.error('Error moving set:', response.data.error);
            }
        } catch (error) {
            console.error('Error moving set:', error);
        }
    };

    const removeSet = async (set_num) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/remove_set_from_wishlist.php`, { user_id: Number(userId), set_num });
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== set_num));
            } else {
                console.error('Error removing set:', response.data.error);
            }
        } catch (error) {
            console.error('Error removing set:', error);
        }
    };

    const toggleSelectSet = (set_num) => {
        console.log('user: ', user || 'user is null');
        console.log('userId: ', userId || 'userId is null');
        console.log('user.user_id: ', user?.user_id || 'user.user_id is null');
        
        if (user && Number(user.user_id) === Number(userId)) {
            setSelectedSet(selectedSet === set_num ? null : set_num);
        } else {
            console.warn('User is not logged in or does not have permission to select this set.');
        }
    };

    const [collapsedThemes, setCollapsedThemes] = useState({});

    const toggleCollapse = (themeId) => {
        setCollapsedThemes(prev => ({ ...prev, [themeId]: !prev[themeId] }));
    };

    const groupedSets = sets.reduce((acc, set) => {
        if (!acc[set.theme_id]) {
            acc[set.theme_id] = { theme_name: set.theme_name, sets: [] };
        }
        acc[set.theme_id].sets.push(set);
        return acc;
    }, {});

    const renderErrorMessage = () => {
        if (!userExists && !isLoading) {
            return <div className="error-message">Something went wrong! This user couldn't be found.</div>;
        }
    
        if (userExists && sets.length === 0 && !isLoading) {
            if (user && Number(user.user_id) === Number(userId)) {
                return <div className="error-message">You haven't added any sets to your wishlist yet.</div>;
            } else {
                return <div className="error-message">This user hasn't added any sets to their wishlist yet.</div>;
            }
        }
    
        return null;
    };

    return (
        <div className="content">
            {!userId ? (
                <div className="centered-message">
                    <h2>Create an account and start your wishlist today!</h2>
                    <div className="collection-nouser-links-container">
                        <Link to="/register">
                            <button className="register-button">Register</button>
                        </Link>
                        <Link to="/login">
                            <button className="login-button">Log In</button>
                        </Link>
                    </div>
                </div>
            ) : (
                <>

                    <div>
                        {renderErrorMessage()}
                    </div>
                    

                    {!isLoading && sets.length > 0 && (
                        <>
                            <button onClick={shareWishlist} className="share-button">
                                {copiedUrl ? <FontAwesomeIcon icon="thumbs-up" style={{ marginRight: '8px' }} /> : <FontAwesomeIcon icon="share" style={{ marginRight: '8px' }} />}
                                {copiedUrl ? 'Successfully copied link!' : 'Share Wishlist'}
                            </button>

                            <div className="theme-header">{user && Number(user.user_id) === Number(userId) ? 'My Wishlist' : `${username}'s Wishlist`}</div>

                            <div className="themes-container">
                                {Object.keys(groupedSets).map(themeId => (
                                    <div key={themeId} className="theme-section">
                                        <div className="theme-title" onClick={() => toggleCollapse(themeId)}>
                                            {groupedSets[themeId].theme_name}
                                            <FontAwesomeIcon icon={collapsedThemes[themeId] ? "chevron-right" : "chevron-down"} style={{ marginLeft: '8px' }} />
                                        </div>
                                        {!collapsedThemes[themeId] && (
                                            <div className="sets-container">
                                                {groupedSets[themeId].sets.map(set => (
                                                    <div
                                                        key={set.set_num}
                                                        className={`set-card ${selectedSet === set.set_num ? 'selected' : ''}`}
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




                                                        <div className="set-name">{set.name}</div>
                                                        {user && Number(user.user_id) === Number(userId) && selectedSet === set.set_num ? (
                                                            <div className="set-actions">

                                                                <button className="complete-button" onClick={() => moveToCollection(set.set_num, set.complete)}>
                                                                    Acquired
                                                                </button>

                                                                <button className="remove-button" onClick={() => removeSet(set.set_num)}>Remove</button>
                                                            </div>
                                                        ) : (
                                                            <div className="set-num">{set.set_num}</div>
                                                        )}

                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {isLoading && (
                        <div className="loading">Loading...</div>
                    )}
                </>
            )}
        </div>
    );
};

export default Wishlist;
