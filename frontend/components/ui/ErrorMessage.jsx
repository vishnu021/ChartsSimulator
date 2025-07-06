import React from 'react';

export const ErrorMessage = ({
                                 error,
                                 onDismiss,
                                 className = '',
                                 showDismiss = true
                             }) => {
    if (!error) return null;

    return (
        <div className={`flex-shrink-0 mx-4 p-3 bg-red-500 text-white rounded-lg text-sm ${className}`}>
            <strong>Error:</strong> {error}
            {showDismiss && onDismiss && (
                <button
                    onClick={onDismiss}
                    className="ml-3 text-red-200 hover:text-white"
                >
                    ✕
                </button>
            )}
        </div>
    );
};
