import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './Themes.css';
import './Collection.css';
import './Styles.css';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tooltip } from 'react-tooltip';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Collection = () => {
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
        const fetchCollection = async () => {
            if (!userId) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_user_collection.php?user_id=${userId}`);
                if (response.data.error) {
                    if (response.data.error === 'User not found.') {
                        setUserExists(false);
                    }
                    console.error('Error fetching user collection:', response.data.error);
                } else {
                    setSets(response.data.sets);
                    setUsername(response.data.username);
                }
            } catch (error) {
                console.error('Error fetching user collection:', error);
            }
            setIsLoading(false);
        };

        fetchCollection();
    }, [userId]);

    useEffect(() => {
        if (copiedUrl) {
            setTimeout(() => setCopiedUrl(false), 5000);
        }
    }, [copiedUrl]);

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png';
    };

    const handleImageLoad = (setNum) => {
        setLoadedImages(prev => ({ ...prev, [setNum]: true }));
    };

    const shareCollection = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedUrl(true);
        }).catch(err => {
            console.error('Error copying URL:', err);
        });
    };

    const updateQuantity = async (set_num, newQuantity) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/update_set_quantity.php`, { user_id: Number(userId), set_num, quantity: newQuantity });
            if (response.data.success) {
                setSets(sets.map(set => (set.set_num === set_num ? { ...set, quantity: newQuantity } : set)));
            } else {
                console.error('Error updating quantity:', response.data.error);
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    const removeSet = async (set_num) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/remove_set_from_collection.php`, { user_id: Number(userId), set_num });
            if (response.data.success) {
                setSets(sets.filter(set => set.set_num !== set_num));
            } else {
                console.error('Error removing set:', response.data.error);
            }
        } catch (error) {
            console.error('Error removing set:', error);
        }
    };

    const toggleCompleteStatus = async (set_num, currentStatus) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/toggle_set_complete_status.php`, { user_id: Number(userId), set_num, complete: currentStatus ? 0 : 1 });
            if (response.data.success) {
                setSets(sets.map(set => (set.set_num === set_num ? { ...set, complete: currentStatus ? 0 : 1 } : set)));
            } else {
                console.error('Error toggling complete status:', response.data.error);
            }
        } catch (error) {
            console.error('Error toggling complete status:', error);
        }
    };

    const toggleSelectSet = (set_num) => {
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
                return <div className="error-message">You haven't added any sets to your collection yet.</div>;
            } else {
                return <div className="error-message">This user hasn't added any sets to their collection yet.</div>;
            }
        }
    
        return null;
    };

    const totalSets = sets.reduce((acc, set) => acc + Number(set.quantity), 0);
    const totalParts = sets.reduce((acc, set) => acc + (set.num_parts * Number(set.quantity)), 0);
    const totalMinifigures = sets.reduce((acc, set) => acc + (Number(set.num_minifigures) * Number(set.quantity)), 0);

    return (
        <div className="content">
            {!userId ? (
                <div className="centered-message">
                    <h2>Create an account and start your collection today!</h2>
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
                            <button onClick={shareCollection} className="share-button">
                                {copiedUrl ? <FontAwesomeIcon icon="thumbs-up" style={{ marginRight: '8px' }} /> : <FontAwesomeIcon icon="share" style={{ marginRight: '8px' }} />}
                                {copiedUrl ? 'Successfully copied link!' : 'Share Collection'}
                            </button>

                            <div className="theme-header">{user && Number(user.user_id) === Number(userId) ? 'My Collection' : `${username}'s Collection`}</div>

                            <div className="stats-container">
                                <div className="collection-stats">
                                    <div className="stats-section">
                                        <div className="stats-header">Number of Sets</div>
                                        <div className="stats-value">{totalSets}</div>
                                    </div>
                                    <div className="stats-section">
                                        <div className="stats-header">Number of Parts</div>
                                        <div className="stats-value">{totalParts}</div>
                                    </div>
                                    <div className="stats-section">
                                        <div className="stats-header">Number of Minifigures</div>
                                        <div className="stats-value">
                                            {totalMinifigures}
                                            
                                            <FontAwesomeIcon
                                                icon={faInfoCircle}
                                                className="info-icon"
                                                style={{ marginLeft: '8px' }}
                                                data-tooltip-id="tooltip-minifigures"
                                            />

                                            <Tooltip id="tooltip-minifigures" place="bottom" type="dark" effect="solid">
                                                <span>Please note that the minifigure count data is sourced from a third-party database, which may be incomplete.<br></br>We strive to supplement missing information, but the data may not always be accurate.</span>
                                            </Tooltip>

                                        </div>
                                    </div>
                                </div>
                            </div>

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
                                                        className={`set-card ${Number(set.complete) === 0 ? 'incomplete' : ''} ${selectedSet === set.set_num ? 'selected' : ''}`}
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
                                                        {user && Number(user.user_id) === Number(userId) && selectedSet === set.set_num ? (
                                                            <div className="set-actions">
                                                                <button className="quantity-button" onClick={() => updateQuantity(set.set_num, Number(set.quantity) - 1)} disabled={set.quantity <= 1}>-</button>
                                                                <span className="quantity-input">{set.quantity}</span>
                                                                <button className="quantity-button" onClick={() => updateQuantity(set.set_num, Number(set.quantity) + 1)}>+</button>

                                                                <div className="button-container collection">
                                                                    <button className={`${Number(set.complete) === 0 ? 'incomplete-button' : 'complete-button'}`} onClick={() => toggleCompleteStatus(set.set_num, set.complete)}>
                                                                        {Number(set.complete) ? 'Incomplete' : 'Complete'}
                                                                    </button>

                                                                    <button className="remove-button" onClick={() => removeSet(set.set_num)}>Remove</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="set-num">{set.set_num}</div>
                                                        )}

                                                        {set.quantity > 1 && (
                                                            <div className="badge">x{set.quantity}</div>
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

export default Collection;
