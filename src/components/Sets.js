// src/components/Sets.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

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
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Sets</h1>
            
            {Object.keys(selectedSets).filter(setNum => selectedSets[setNum]).length > 0 && (
                <button 
                    onClick={addToCollection} 
                    className="mb-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>Add to Collection</span>
                </button>
            )}
            
            <div className="flex flex-wrap justify-center gap-6">
                {sets.map(set => (
                    <div
                        key={set.set_num}
                        className={`w-56 p-4 bg-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg cursor-pointer
                                 ${selectedSets[set.set_num] ? 'ring-2 ring-blue-500 bg-blue-50' : 'border border-gray-200'}`}
                        onClick={() => toggleSelectSet(set.set_num)}
                    >
                        <div className="h-32 flex items-center justify-center mb-4">
                            <img 
                                src={set.img_url} 
                                alt={set.name} 
                                className="h-full object-contain" 
                                onError={(e) => e.target.src = '/images/lego_piece_questionmark.png'}
                            />
                        </div>
                        
                        <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{set.name}</h3>
                        
                        {selectedSets[set.set_num] !== undefined && (
                            <div className="mt-4 flex flex-col gap-3">
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
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sets;