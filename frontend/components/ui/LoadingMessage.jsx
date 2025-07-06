import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export const LoadingMessage = ({
                                   message,
                                   className = '',
                                   spinnerSize = 'sm'
                               }) => (
    <div className={`flex-shrink-0 mx-4 p-3 bg-blue-500 text-white rounded-lg text-sm ${className}`}>
        <div className="flex items-center gap-2">
            <LoadingSpinner size={spinnerSize} />
            {message}
        </div>
    </div>
);
