import React from 'react';

export const ErrorMessage = ({
                                 error,
                                 onDismiss,
                                 className = '',
                                 showDismiss = true
                             }) => {
    if (!error) return null;

    const handleDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onDismiss) {
            onDismiss();
        }
    };

    return (
        <div className={`flex-shrink-0 mx-4 p-3 bg-red-500 text-white rounded-lg text-sm relative ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 pr-3">
                    <strong>Error:</strong> {error}
                </div>
                {showDismiss && onDismiss && (
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-red-200 hover:text-white transition-colors p-1 -m-1 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
                        aria-label="Dismiss error"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};
