import React from 'react';
import { themes } from '../../chartConfig';

export const ChartContainer = ({ children, theme = 'dark', className = '' }) => {
    const colors = themes[theme];

    return (
        <div
            className={`flex flex-col h-full p-2 md:p-4 ${className}`}
            style={{ backgroundColor: colors.background, minHeight: 0 }}
        >
            {children}
        </div>
    );
};
