import React, { useState } from 'react';

export const ErrorMessage = ({
                                 error,
                                 onDismiss,
                                 className = '',
                                 showDismiss = true
                             }) => {
    const [showDetails, setShowDetails] = useState(false);

    if (!error) return null;

    const handleDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onDismiss) {
            onDismiss();
        }
    };

    // Try to parse error as JSON if it's a detailed error response
    let errorData = null;
    let errorMessage = error;
    
    if (typeof error === 'string') {
        try {
            errorData = JSON.parse(error);
            errorMessage = errorData.message || error;
        } catch (e) {
            // Not JSON, use as-is
            errorMessage = error;
        }
    } else if (typeof error === 'object') {
        errorData = error;
        errorMessage = error.message || 'An error occurred';
    }

    const hasDetailedInfo = errorData && errorData.context;

    return (
        <div className={`flex-shrink-0 mx-4 p-3 bg-red-500 text-white rounded-lg text-sm relative ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                        <strong>Error:</strong>
                        {hasDetailedInfo && (
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                            >
                                {showDetails ? 'Hide Details' : 'Show Details'}
                            </button>
                        )}
                    </div>
                    <div>{errorMessage}</div>
                    
                    {hasDetailedInfo && showDetails && (
                        <div className="mt-3 p-3 bg-red-600 rounded text-xs">
                            <div className="grid grid-cols-1 gap-2">
                                {errorData.context.symbol && (
                                    <div><strong>Symbol:</strong> {errorData.context.symbol}</div>
                                )}
                                {errorData.context.date && (
                                    <div><strong>Date:</strong> {errorData.context.date}</div>
                                )}
                                {errorData.context.requestUrl && (
                                    <div><strong>Request URL:</strong> <span className="font-mono break-all">{errorData.context.requestUrl}</span></div>
                                )}
                                {errorData.context.httpStatusCode && errorData.context.httpStatusCode > 0 && (
                                    <div><strong>HTTP Status:</strong> {errorData.context.httpStatusCode}</div>
                                )}
                                {errorData.context.responseContent && (
                                    <div>
                                        <strong>Server Response:</strong>
                                        <pre className="mt-1 p-2 bg-red-700 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                                            {errorData.context.responseContent}
                                        </pre>
                                    </div>
                                )}
                                {errorData.timestamp && (
                                    <div><strong>Time:</strong> {new Date(errorData.timestamp).toLocaleString()}</div>
                                )}
                            </div>
                        </div>
                    )}
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
