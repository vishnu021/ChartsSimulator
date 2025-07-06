import React from 'react';

export const Button = ({
                           children,
                           variant = 'primary',
                           size = 'md',
                           disabled = false,
                           loading = false,
                           onClick,
                           className = '',
                           ...props
                       }) => {
    const baseClasses = 'rounded font-medium transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    const disabledClasses = disabled || loading ? 'opacity-60 cursor-not-allowed transform-none hover:scale-100' : '';

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${disabledClasses}
        ${className}
      `}
            {...props}
        >
            {loading && <LoadingSpinner size="sm" className="mr-2" />}
            {children}
        </button>
    );
};
