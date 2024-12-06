// src/components/Sets.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Sets.css';

const Sets = () => {
    const { themeId } = useParams();
    const [sets, setSets] = useState([]);
    const [selectedSets, setSelectedSets] = useState({});

    useEffect(() => {
        axios.get(`https://mybricklog.com:444/get_lego_sets.php?theme_id=${themeId}`)
            .then(response => setSets(response.data))
            .catch(error => console.error('Error fetching data:', error));
    }, [themeId]);

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
        
        axios.post('https://mybricklog.com:444/add_to_collection.php', { sets: setsToAdd })
            .then(response => {
                if (response.data.success) {
                    alert('Sets added to collection!');
                    setSelectedSets({}); // Clear the selection
                } else {
                    alert('Failed to add sets to collection.');
                }
            })
            .catch(error => console.error('Error adding sets to collection:', error));
    };

    return (
        <div>
            <div className="header">Sets</div>
            {Object.keys(selectedSets).filter(setNum => selectedSets[setNum]).length > 0 && (
                <button onClick={addToCollection} className="add-to-collection-button">
                    Add to Collection
                </button>
            )}
            <div className="sets-container">
                {sets.map(set => (
                    <div
                        key={set.set_num}
                        className={`set-card ${selectedSets[set.set_num] ? 'selected' : ''}`}
                        onClick={() => toggleSelectSet(set.set_num)}
                    >
                        <img src={set.img_url} alt={set.name} className="set-image" />
                        <div className="set-name">{set.name}</div>
                        {selectedSets[set.set_num] !== undefined && (
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
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sets;
