// src/components/About.js
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './about.css';

const About = () => {
    const cryptoWallets = [
        { name: 'Bitcoin (BTC)', address: 'bc1qhclc8003jgk7cjz8f4hqtdw83qc0xmzh4p3sff' },
        { name: 'Ethereum (ETH)', address: '0x0B1e5c79b1C6862b47391Ea13e9a2860f530b6a8' },
        { name: 'Dogecoin (DOGE)', address: 'D5DJSKnAt2FXbjL2bTkZCR9JAP7vz8Py5r' }
    ];

    return (
        <div className="about-container">
            <div className="about-header">About MyBrickLog</div>
            
            <div className="about-content">
                <div className="profile-section">
                    <img 
                        src="../images/lego_user.png" 
                        alt="Creator" 
                        className="profile-image"
                    />
                    <div className="profile-text">
                        <h2>Hi, I'm the Creator!</h2>
                        <p>Thanks for using MyBrickLog! I created this platform to help LEGO® enthusiasts 
                        keep track of their collections and connect with other builders.</p>
                        <p>This website was created with React, PHP and SQL. It's entirely self-hosted from my home server (aka an old dusty PC sat in a corner of the dog room), aside from AWS S3 bucket for storing profile pictures.</p>
                    </div>
                </div>

                <div className="social-section">
                    <h3>Connect With Me</h3>
                    <div className="social-links">
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