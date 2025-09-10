// src/components/Header.js - Updated
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark, faSearch, faChevronDown } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    const { user, logout, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsMobileMenuOpen(false);
        setShowUserDropdown(false);
    };

    // Check admin status when user changes (runs in background)
    useEffect(() => {
        const checkAdmin = async () => {
            if (user) {
                try {
                    const adminStatus = await checkAdminStatus();
                    setIsAdmin(adminStatus);
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        };

        checkAdmin();
    }, [user, checkAdminStatus]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to the search results page with the query
            navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            setShowSearch(false);
            setIsMobileMenuOpen(false); // Close mobile menu if open
        }
    };

    const collectionUrl = user ? `/collection/${user.user_id}` : "/collection";
    const wishlistUrl = user ? `/wishlist/${user.user_id}` : "/wishlist";

    const isActive = (path) => {
        return location.pathname === path ? 'bg-red-700' : '';
    };

    return (
        <header className="bg-red-600 shadow-md">
            <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <div className="flex justify-between items-center h-14 md:h-16">
                    {/* Logo Section */}
                    <div className="flex-shrink-0 mr-2 md:mr-4">
                        <Link to="/" className="flex items-center">
                            <img 
                                src="/images/mybricklog_logo.png" 
                                alt="MyBrickLog" 
                                className="h-7 md:h-8 lg:h-10 transition-all duration-200" 
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1 lg:space-x-2 xl:space-x-3 flex-1 justify-center max-w-4xl mx-4">

                        <Link 
                            to={collectionUrl} 
                            className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap ${isActive(collectionUrl)}`}
                        >
                            <FontAwesomeIcon icon="folder-open" className="mr-1 lg:mr-2" />
                            <span className="hidden xl:inline">My Collection</span>
                            <span className="xl:hidden">Collection</span>
                        </Link>

                        <Link 
                            to={wishlistUrl} 
                            className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap ${isActive(wishlistUrl)}`}
                        >
                            <FontAwesomeIcon icon="heart" className="mr-1 lg:mr-2" />
                            <span className="hidden xl:inline">My Wishlist</span>
                            <span className="xl:hidden">Wishlist</span>
                        </Link>

                        <Link 
                            to="/themes" 
                            className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap ${isActive('/themes')}`}
                        >
                            <FontAwesomeIcon icon="folder-plus" className="mr-1 lg:mr-2" />
                            <span className="hidden xl:inline">Add Sets</span>
                            <span className="xl:hidden">Add</span>
                        </Link>

                        <Link 
                            to="/price-tool" 
                            className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap ${isActive('/price-tool')}`}
                        >
                            <FontAwesomeIcon icon="dollar-sign" className="mr-1 lg:mr-2" />
                            <span className="hidden xl:inline">Price Tool</span>
                            <span className="xl:hidden">Price</span>
                        </Link>

                        <Link 
                            to="/blog" 
                            className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap ${isActive('/blog')}`}
                        >
                            <FontAwesomeIcon icon="comment-dots" className="mr-1 lg:mr-2" />
                            <span className="hidden xl:inline">Blog</span>
                            <span className="xl:hidden">Blog</span>
                        </Link>

                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap"
                        >
                            <FontAwesomeIcon icon={faSearch} className="mr-1 lg:mr-2" />
                            <span className="hidden lg:inline">Search</span>
                        </button>
                    </div>

                    {/* User Authentication Section */}
                    <div className="hidden md:flex items-center flex-shrink-0">
                        {user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    className="flex items-center px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap"
                                    onMouseEnter={() => setShowUserDropdown(true)}
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                >
                                    <FontAwesomeIcon icon="user" className="mr-1 lg:mr-2" />
                                    <span className="hidden lg:inline">{user.username}</span>
                                    <span className="lg:hidden truncate max-w-20">{user.username.length > 8 ? user.username.substring(0, 8) + '...' : user.username}</span>
                                    <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-xs" />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {showUserDropdown && (
                                    <div 
                                        className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 user-dropdown"
                                        onMouseLeave={() => setShowUserDropdown(false)}
                                    >
                                        <Link 
                                            to="/profile" 
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dropdown-item"
                                            onClick={() => setShowUserDropdown(false)}
                                        >
                                            <FontAwesomeIcon icon="user" className="mr-2 text-gray-500" />
                                            My Account
                                        </Link>
                                        {isAdmin && (
                                            <Link 
                                                to="/admin" 
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dropdown-item"
                                                onClick={() => setShowUserDropdown(false)}
                                            >
                                                <FontAwesomeIcon icon="cog" className="mr-2 text-gray-500" />
                                                Admin Panel
                                            </Link>
                                        )}
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dropdown-item"
                                        >
                                            <FontAwesomeIcon icon="right-from-bracket" className="mr-2 text-gray-500" />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link 
                                to="/login" 
                                className="px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium bg-yellow-400 text-red-700 hover:bg-yellow-300 transition-colors whitespace-nowrap"
                            >
                                <FontAwesomeIcon icon="user" className="mr-1 lg:mr-2" />
                                <span className="hidden lg:inline">Sign In</span>
                                <span className="lg:hidden">Sign In</span>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-red-700 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar - Appears below the header */}
            {showSearch && (
                <div className="bg-red-700 py-2 md:py-3 px-2 sm:px-4 shadow-md">
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex">
                        <input
                            type="text"
                            placeholder="Search sets, themes, or set numbers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2 px-3 md:px-4 text-sm md:text-base rounded-l-md focus:outline-none border-0"
                        />
                        <button 
                            type="submit"
                            className="bg-yellow-400 text-red-700 px-3 md:px-4 rounded-r-md hover:bg-yellow-300 transition-colors flex-shrink-0"
                        >
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-red-700 shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <Link 
                            to="/" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="house" className="mr-3 text-yellow-400" />
                            Home
                        </Link>

                        <Link 
                            to={collectionUrl} 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="folder-open" className="mr-3 text-yellow-400" />
                            My Collection
                        </Link>

                        <Link 
                            to={wishlistUrl} 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="heart" className="mr-3 text-yellow-400" />
                            My Wishlist
                        </Link>

                        <Link 
                            to="/themes" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="folder-plus" className="mr-3 text-yellow-400" />
                            Add Sets
                        </Link>

                        <Link 
                            to="/price-tool" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="dollar-sign" className="mr-3 text-yellow-400" />
                            Price Tool
                        </Link>

                        <Link 
                            to="/blog" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="comment-dots" className="mr-3 text-yellow-400" />
                            Blog
                        </Link>

                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faSearch} className="mr-3 text-yellow-400" />
                            Search
                        </button>

                        {user ? (
                            <>
                                <div className="px-3 py-2 text-base font-medium text-yellow-400 border-t border-red-600 mt-2 pt-3">
                                    <FontAwesomeIcon icon="user" className="mr-3" />
                                    {user.username}
                                </div>
                                <Link 
                                    to="/profile" 
                                    className="block px-6 py-2 rounded-md text-sm font-medium text-white hover:bg-red-600 hover:text-white ml-3"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <FontAwesomeIcon icon="user" className="mr-3 text-yellow-400" />
                                    My Account
                                </Link>
                                {isAdmin && (
                                    <Link 
                                        to="/admin" 
                                        className="block px-6 py-2 rounded-md text-sm font-medium text-white hover:bg-red-600 hover:text-white ml-3"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FontAwesomeIcon icon="cog" className="mr-3 text-yellow-400" />
                                        Admin Panel
                                    </Link>
                                )}
                                <button 
                                    onClick={handleLogout}
                                    className="w-full text-left block px-6 py-2 rounded-md text-sm font-medium text-white hover:bg-red-600 hover:text-white ml-3"
                                >
                                    <FontAwesomeIcon icon="right-from-bracket" className="mr-3 text-yellow-400" />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link 
                                to="/login" 
                                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-500 hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <FontAwesomeIcon icon="user" className="mr-3 text-yellow-400" />
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;