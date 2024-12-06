// src/components/Themes.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Themes.css';
import './Styles.css';

const Themes = () => {
    const [parentThemes, setParentThemes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const priorityThemes = [721, 52, 246, 1, 158];

    useEffect(() => {
        axios.defaults.withCredentials = true;
        axios.get(`${process.env.REACT_APP_API_URL}/get_parent_themes.php`)
            .then(response => setParentThemes(response.data))
            .catch(error => console.error('Error fetching parent themes:', error));
    }, []);

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

    const addToCollection = () => {
        const setsToAdd = Object.entries(selectedSets)
            .filter(([setNum, quantity]) => quantity)
            .map(([setNum, quantity]) => ({ setNum, quantity }));
    
        axios.post(`${process.env.REACT_APP_API_URL}/add_to_collection.php`, { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    alert('Sets added to collection!');
                    setSelectedSets({}); // Clear the selection
                    
                    // Remove added sets from searchResults
                    setSearchResults(prevResults => 
                        prevResults.filter(set => !selectedSets[set.set_num])
                    );
                } else {
                    alert('Failed to add sets to collection.');
                }
            })
            .catch(error => console.error('Error adding sets to collection:', error));
    };
    

    const handleImageError = (e) => {
        e.target.src = '/images/lego_piece_questionmark.png'; // Set fallback image path
    };

    const clearSearchResults = () => {
        setSearchResults([]);
        setSearchQuery('');
    };

    return (
        <div className="content">
            
            {searchResults.length === 0 && (
              <div className="theme-header">
                Select Theme
              </div>
            )}

            <form onSubmit={handleSearchSubmit}>
                <div className="search-container">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search by set name or number"
                        className="search-bar"
                    />
                    <button type="submit" className="search-button"><FontAwesomeIcon icon="magnifying-glass" style={{ marginRight: '8px' }} />Search</button>
                </div>
            </form>
            {searchResults.length === 0 ? (
                <div className="themes-list-container">
                    {parentThemes.map(theme => (
                        <button
                            key={theme.id}
                            className={`theme-button ${priorityThemes.includes(Number(theme.id)) ? 'highlighted' : ''}`}
                            onClick={() => handleThemeClick(theme.id)}
                        >
                            {theme.name}
                            {priorityThemes.includes(Number(theme.id)) && (
                                <FontAwesomeIcon icon="fire" style={{ marginLeft: '8px' }} />
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <button onClick={clearSearchResults} className="back-button">Return to Themes</button>
                    <div className="theme-header">Search Results</div>
                    <div className="sets-container">
                        {searchResults.map(set => (
                            <div
                                key={set.set_num}
                                className={`set-card ${selectedSets[set.set_num] ? 'selected' : ''}`}
                                onClick={() => toggleSelectSet(set.set_num)}
                            >
                                <img 
                                    src={set.img_url} 
                                    alt={set.name} 
                                    className="set-image" 
                                    onError={handleImageError}
                                    loading="lazy"
                                />
                                <div className="set-name">{set.name}</div>
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
                                        </div>
                                    ) : (
                                        set.set_num
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(selectedSets).filter(setNum => selectedSets[setNum]).length > 0 && (
                        <button onClick={addToCollection} className="add-to-collection-button">
                            Add to Collection
                        </button>
                    )}
                </>
            )}
            {isLoading && (
                <div className="loading">Loading...</div>
            )}
        </div>
    );
};

export default Themes;