import React, { useEffect } from 'react';
import './Footer.css';

const Footer = () => {
    useEffect(() => {
        const year = new Date().getFullYear();
        document.getElementById("current-year").textContent = `© ${year} MyBrickLog`;
    }, []);

    return (
        <footer>
            <div className="footer-container">
                <div className="about-group footer-item">
                    <a className="header-logo-link" href="home.php">
                        <img className="logo" src="/images/mybricklog_logo.png" alt="MyBrickLog logo" />
                    </a>
                    <p>Created by <a href="/collection/1">Jason</a></p>
                    <span><p>Enjoying the site?</p><a href="/about">Consider supporting me!</a></span>
                </div>

                <div className="footer-nav-group footer-item">
                    <h2>Site Navigation</h2>
                    <ul>
                        <li><a href="/collection">My Collection</a></li>
                        <li><a href="/wishlist">My Wishlist</a></li>
                        <li><a href="/themes">Add Sets</a></li>
                    </ul>
                </div>

                
                <div className="legal-group footer-item">
                    <h2>Legal</h2>
                    <ul>
                        <li><a href="/privacy-policy">Privacy Policy</a></li>
                        <li><a href="/terms-of-service">Terms of Service</a></li>
                    </ul>
                </div>
                
            </div>
            <div className="footer-copyright">
                <p id="current-year"></p>
            </div>
        </footer>
    );
};

export default Footer;
