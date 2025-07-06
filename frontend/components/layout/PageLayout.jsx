import React from 'react';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingMessage } from '../ui/LoadingMessage';

export const PageLayout = ({
                               children,
                               theme = 'dark',
                               title,
                               subtitle,
                               controls,
                               error,
                               onErrorDismiss,
                               loading,
                               loadingMessage,
                               stats
                           }) => {
    const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${bgColor}`}>
            {/* Header with controls */}
            {controls && (
                <div className="flex-shrink-0 p-4">
                    {controls}
                </div>
            )}

            {/* Title and subtitle */}
            {(title || subtitle) && (
                <div className="flex-shrink-0 px-4 mb-2">
                    {title && (
                        <h1 className={`text-xl md:text-2xl font-bold ${textColor}`}>
                            {title}
                        </h1>
                    )}
                    {subtitle && (
                        <div className="flex flex-wrap gap-2 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm">
                            {subtitle}
                        </div>
                    )}
                </div>
            )}

            {/* Stats component */}
            {stats && (
                <div className="flex-shrink-0 px-4 mb-2">
                    {stats}
                </div>
            )}

            {/* Error message */}
            <ErrorMessage
                error={error}
                onDismiss={onErrorDismiss}
            />

            {/* Loading message */}
            {loading && (
                <LoadingMessage message={loadingMessage || 'Loading...'} />
            )}

            {/* Main content */}
            {children}
        </div>
    );
};
