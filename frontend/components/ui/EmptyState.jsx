import React from 'react';

export const EmptyState = ({
                               icon,
                               title,
                               description,
                               action,
                               theme = 'dark'
                           }) => {
    const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

    return (
        <div className={`flex-1 flex items-center justify-center ${textColor}`}>
            <div className="text-center p-4">
                <div className="text-4xl mb-4">{icon}</div>
                <p className="text-lg md:text-xl mb-2">{title}</p>
                <p className="text-sm md:text-base">{description}</p>
                {action && (
                    <div className="mt-4">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
};
