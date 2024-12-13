import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './about.css';

const About = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [creatorInfo, setCreatorInfo] = useState({
        profile_picture: '',
        display_name: 'Jason'
    });

    const cryptoWallets = [
        { name: 'Bitcoin (BTC)', address: 'bc1qhclc8003jgk7cjz8f4hqtdw83qc0xmzh4p3sff' },
        { name: 'Ethereum (ETH)', address: '0x0B1e5c79b1C6862b47391Ea13e9a2860f530b6a8' },
        { name: 'Dogecoin (DOGE)', address: 'D5DJSKnAt2FXbjL2bTkZCR9JAP7vz8Py5r' }
    ];

    useEffect(() => {
        const fetchCreatorInfo = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_creator_info.php`);
                if (response.data.error) {
                    console.error('Error fetching creator info:', response.data.error);
                } else {
                    setCreatorInfo({
                        profile_picture: response.data.profile_picture || '/images/lego_user.png',
                        display_name: response.data.display_name || 'Jason'
                    });
                }
            } catch (error) {
                console.error('Error fetching creator info:', error);
            }
            setIsLoading(false);
        };

        fetchCreatorInfo();
    }, []);

    return (
        <div className="about-container">
            <div className="about-header">About MyBrickLog</div>
            
            <div className="about-content">
                <div className="profile-section">
                    <img 
                        src={creatorInfo.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${creatorInfo.profile_picture}` : '/images/lego_user.png'}
                        alt="Creator" 
                        className="profile-image"
                    />
                    <div className="profile-text">
                        <h2>Hi, I'm {creatorInfo.display_name}!</h2>
                        <p>Thanks for using MyBrickLog! I created this platform to help LEGO® enthusiasts 
                        keep track of their collections and connect with other builders.</p>
                        <p>This website was created with React, PHP and SQL. It's entirely self-hosted from my home server (aka an old dusty PC sat in a corner of the dog room), aside from AWS S3 bucket for storing profile pictures.</p>
                    </div>
                </div>

                <div className="social-section">
                    <h3>Connect With Me</h3>
                    <div className="about-social-links">
                        <a href="https://github.com/JasonReb0rn" className="social-link">
                            <FontAwesomeIcon icon={['fab', 'github']} />
                            <span>GitHub</span>
                        </a>
                        <a href="https://twitter.com/itsjasonreborn" className="social-link">
                            <FontAwesomeIcon icon={['fab', 'twitter']} />
                            <span>Twitter</span>
                        </a>
                    </div>
                </div>

                <div className="support-section">
                    <h3>Support the Project</h3>
                    <p>If you're enjoying MyBrickLog and would like to support its development or running costs, 
                    you can contribute using any of these cryptocurrency addresses:</p>
                    
                    <div className="crypto-list">
                        {cryptoWallets.map((wallet, index) => (
                            <div key={index} className="crypto-item">
                                <h4>{wallet.name}</h4>
                                <div className="wallet-address">
                                    <code>{wallet.address}</code>
                                    <button 
                                        className="copy-button"
                                        onClick={() => navigator.clipboard.writeText(wallet.address)}
                                    >
                                        <FontAwesomeIcon icon="copy" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="disclaimer">
                    Not affiliated with the LEGO® Group. LEGO® is a trademark of the LEGO Group.
                </div>
            </div>
        </div>
    );
};

export default About;