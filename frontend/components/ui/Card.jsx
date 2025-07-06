import React from 'react';

export const Card = ({
                         children,
                         className = '',
                         padding = 'md',
                         theme = 'dark'
                     }) => {
    const paddingClasses = {
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6'
    };

    const themeClasses = {
        dark: 'bg-gray-800 border-gray-700',
        light: 'bg-white border-gray-200'
    };

    return (
        <div className={`
      ${themeClasses[theme]}
      ${paddingClasses[padding]}
      rounded-lg border shadow-sm
      ${className}
    `}>
            {children}
        </div>
    );
};
