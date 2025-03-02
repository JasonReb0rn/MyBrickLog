import React, { useEffect } from 'react';

const Footer = () => {
    useEffect(() => {
        const year = new Date().getFullYear();
        document.getElementById("current-year").textContent = `© ${year} MyBrickLog`;
    }, []);

    return (
        <footer className="w-full bg-white border-t border-gray-200 pt-8">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8">
                {/* About Group */}
                <div className="flex flex-col items-center md:items-start">
                    <a href="/" className="mb-4">
                        <img className="h-10" src="/images/mybricklog_logo.png" alt="MyBrickLog logo" />
                    </a>
                    <p className="text-gray-600 text-sm mb-2">Created by <a href="/collection/1" className="text-blue-600 hover:text-blue-800">Jason</a></p>
                    <div className="flex items-center gap-2 text-sm">
                        <p className="text-gray-600">Enjoying the site?</p>
                        <a href="/about" className="text-blue-600 hover:text-blue-800">Consider supporting me!</a>
                    </div>
                </div>

                {/* Navigation Group */}
                <div className="flex flex-col items-center md:items-start">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500 inline-block">Site Navigation</h2>
                    <ul className="flex flex-col gap-3">
                        <li>
                            <a href="/collection" className="text-gray-600 hover:text-blue-600 transition-colors">My Collection</a>
                        </li>
                        <li>
                            <a href="/wishlist" className="text-gray-600 hover:text-blue-600 transition-colors">My Wishlist</a>
                        </li>
                        <li>
                            <a href="/themes" className="text-gray-600 hover:text-blue-600 transition-colors">Add Sets</a>
                        </li>
                    </ul>
                </div>

                {/* Legal Group */}
                <div className="flex flex-col items-center md:items-start">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500 inline-block">Legal</h2>
                    <ul className="flex flex-col gap-3">
                        <li>
                            <a href="/privacy-policy" className="text-gray-600 hover:text-blue-600 transition-colors">Privacy Policy</a>
                        </li>
                        <li>
                            <a href="/terms-of-service" className="text-gray-600 hover:text-blue-600 transition-colors">Terms of Service</a>
                        </li>
                    </ul>
                </div>
            </div>
            
            {/* Copyright */}
            <div className="mt-8 py-4 bg-gray-50 text-center">
                <p id="current-year" className="text-gray-500 text-sm"></p>
            </div>
        </footer>
    );
};

export default Footer;