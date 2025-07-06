import React from 'react';

export const LoadingSpinner = ({
                                   size = 'md',
                                   color = 'white',
                                   className = ''
                               }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    return (
        <div className={`animate-spin rounded-full border-b-2 border-${color} ${sizeClasses[size]} ${className}`} />
    );
};
