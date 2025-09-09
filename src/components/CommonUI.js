import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// Loading component with spinner
export const LoadingSpinner = ({ text = "Loading...", size = "lg" }) => {
    const spinnerSize = {
        sm: "h-6 w-6",
        md: "h-8 w-8", 
        lg: "h-12 w-12",
        xl: "h-16 w-16"
    };

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className={`${spinnerSize[size]} simple-spinner`}></div>
            <p className="mt-4 text-gray-600">{text}</p>
        </div>
    );
};

// Error message component
export const ErrorMessage = ({ message = "An error occurred.", onRetry }) => {
    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center my-4">
            <div className="flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-2xl mb-2" />
                <p className="text-red-700 mb-4">{message}</p>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

// Empty state component
export const EmptyState = ({ 
    message = "No items found.", 
    actionText, 
    onAction, 
    icon,
    className = "" 
}) => {
    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-8 text-center ${className}`}>
            {icon && (
                <div className="text-gray-400 text-4xl mb-4">
                    <FontAwesomeIcon icon={icon} />
                </div>
            )}
            <p className="text-gray-600 mb-4">{message}</p>
            {actionText && onAction && (
                <button 
                    onClick={onAction}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
};

// Login/Register CTA component
export const AuthCTA = ({ type = "login" }) => {
    const text = type === "login" 
        ? "Sign in to manage your collection" 
        : "Create an account to start your collection";
    
    const linkText = type === "login" ? "Sign In" : "Register";
    const linkUrl = type === "login" ? "/login" : "/register";
    const secondaryText = type === "login" ? "Don't have an account?" : "Already have an account?";
    const secondaryLink = type === "login" ? "/register" : "/login";
    const secondaryLinkText = type === "login" ? "Register" : "Sign In";

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{text}</h2>
            <a 
                href={linkUrl} 
                className="block w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium mb-4"
            >
                {linkText}
            </a>
            <p className="text-gray-600">
                {secondaryText} <a href={secondaryLink} className="text-blue-600 hover:underline">{secondaryLinkText}</a>
            </p>
        </div>
    );
};

// Export a collection of UI components
const UIComponents = {
    LoadingSpinner,
    ErrorMessage,
    EmptyState,
    AuthCTA
};

export default UIComponents;