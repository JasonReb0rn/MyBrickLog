import React from 'react';

// Reusable Modal component
const Modal = ({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirm", cancelText = "Cancel", confirmClass = "bg-red-600 hover:bg-red-700" }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4" 
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl" 
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                </div>
                
                <div className="mb-6 text-gray-600">
                    {children}
                </div>
                
                <div className="flex justify-end gap-3">
                    <button 
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors" 
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={`px-4 py-2 text-white rounded-md transition-colors ${confirmClass}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;