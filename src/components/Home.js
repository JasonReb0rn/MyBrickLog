import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';
import './Styles.css';
import './Sets.css';

const Home = () => {
    const [popularThemes, setPopularThemes] = useState([]);
    const [userCollections, setUserCollections] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPopularThemes = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_popular_themes.php`);
                setPopularThemes(response.data);
            } catch (error) {
                console.error('Error fetching popular themes:', error);
            }
        };

        const fetchUserCollections = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_random_collections.php`);
                setUserCollections(response.data);
            } catch (error) {
                console.error('Error fetching user collections:', error);
            }
        };

        fetchPopularThemes();
        fetchUserCollections();
    }, []);

    const handleThemeClick = (themeId) => {
        navigate(`/themes/${themeId}`);
    };

    const startCollection = () => {
        navigate('/themes'); // Adjust the route as per your routing structure
    };

    return (
        <div className="home-container">
            <div className="home-header">
                Keep track of your LEGO&copy; collection.
            </div>
            <div className="home-subtext">
                It's time to get organized and take control of your LEGO collection. Our platform helps you catalog, manage, and share your sets with friends.
                <br /><br />
                No more duplicates, no more forgotten favorites!
            </div>
            
            <button onClick={startCollection} className="start-collection-button">
                Start your collection today
            </button>

            <div className="home-footer">
                Not affiliated with the LEGO&copy; Group.
            </div>
            
            <div className="popular-themes-container">
                <div className="theme-header">Popular Themes</div>
                <div className="themes-list-container">
                    {popularThemes.map(theme => (
                        <div key={theme.id} className="theme-card" onClick={() => handleThemeClick(theme.id)}>
                            <img 
                                src={`/images/themes/${theme.id}.png`} 
                                alt={theme.name} 
                                className="theme-image" 
                                loading="lazy"
                            />
                            <div className="theme-name">{theme.name}</div>
                        </div>
                    ))}
                </div>


                <div className="explore-themes-container">
                    <button className="explore-themes-btn">
                        <Link to="/themes" className="explore-themes-link">
                            Explore other themes!
                        </Link>
                    </button>
                </div>

            </div>


            <div className="user-collections-container">
                <div className="user-collections-header">User Collections</div>
                <div className="user-collections-desc">Randomly selected user's collections</div>
                <div className="user-collections-list">
                    {userCollections.map(user => (
                        <div key={user.user_id} className="user-card">
                            <Link to={`/collection/${user.user_id}`} className="user-link">
                                <img 
                                    src="/images/lego_user.png" 
                                    alt="User Collection" 
                                    className="user-image" 
                                />
                                <div className="user-name">{user.username}</div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
};

export default Home;
