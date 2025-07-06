import React from 'react';

export const StatsBar = ({ stats, theme = 'dark' }) => {
    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    return (
        <div className={`${bgColor} rounded-lg p-3`}>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                        <div className="text-xs text-gray-400">{stat.label}</div>
                        <div className={`font-bold ${stat.color || textColor}`}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
