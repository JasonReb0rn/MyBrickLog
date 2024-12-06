import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from './AuthContext';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsMobileMenuOpen(false); // Close mobile menu on logout
    };

    const collectionUrl = user ? `/collection/${user.user_id}` : "/collection";
    const wishlistUrl = user ? `/wishlist/${user.user_id}` : "/wishlist";

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="header">
            <div className="header-section logo-container">

                <Link to="/" className="header-logo-link" onClick={closeMobileMenu}>
                    <img src="/images/mybricklog_logo.png" alt="Logo" className="logo" />
                </Link>

            </div>
            <div className="header-section nav-center">
                <button className="mobile-menu-button" onClick={toggleMobileMenu}>
                    <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} />
                </button>
                <ul className={`nav-list ${isMobileMenuOpen ? 'open' : ''}`}>
                    <li className="nav-item">
                        <Link to="/" className="nav-link" onClick={closeMobileMenu}>
                            <FontAwesomeIcon icon="house" style={{ marginRight: '8px' }} />
                            Home
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to={collectionUrl} className="nav-link" onClick={closeMobileMenu}>
                            <FontAwesomeIcon icon="folder-open" style={{ marginRight: '8px' }} />
                            My Collection
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to={wishlistUrl} className="nav-link" onClick={closeMobileMenu}>
                            <FontAwesomeIcon icon="heart" style={{ marginRight: '8px' }} />
                            My Wishlist
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/themes" className="nav-link" onClick={closeMobileMenu}>
                            <FontAwesomeIcon icon="folder-plus" style={{ marginRight: '8px' }} />
                            Add Sets
                        </Link>
                    </li>

                    {user ? (
                        <>
                            <li className="nav-item">
                                <Link to="/profile" className="nav-link" onClick={closeMobileMenu}>
                                    <FontAwesomeIcon icon="user" style={{ marginRight: '8px' }} />
                                    {user.username}
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/" onClick={handleLogout} className="nav-link">
                                    <FontAwesomeIcon icon="right-from-bracket" style={{ marginRight: '8px' }} />
                                    Sign Out
                                </Link>
                            </li>
                        </>
                    ) : (
                        <li className="nav-item">
                            <Link to="/login" className="nav-link" onClick={closeMobileMenu}>
                                <FontAwesomeIcon icon="user" style={{ marginRight: '8px' }} />
                                Sign In
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
            <div className="header-section spacer"></div>
        </nav>
    );
};

export default Header;
