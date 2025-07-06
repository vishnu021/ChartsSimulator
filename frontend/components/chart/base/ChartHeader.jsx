import React from 'react';

export const ChartHeader = ({
                                title,
                                stats = [],
                                onReset,
                                showResetButton = true,
                                theme = 'dark',
                                children
                            }) => {
    const colors = themes[theme];

    return (
        <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-2 md:mb-4 gap-2">
            <div>
                <h1 className="text-xl md:text-2xl font-bold" style={{ color: colors.text.primary }}>
                    {title}
                </h1>
                <div className="flex flex-wrap gap-2 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm">
                    {stats.filter(stat => stat.visible !== false).map((stat, index) => (
                        <span key={index} style={{ color: stat.color }}>
              {stat.label}: {stat.value}
            </span>
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
                {children}
                {showResetButton && onReset && (
                    <button
                        onClick={onReset}
                        className="px-3 py-1 md:px-4 md:py-2 rounded-md transition-all text-sm"
                        style={{
                            backgroundColor: colors.panelBackground,
                            border: `1px solid ${colors.grid}`,
                            color: colors.text.primary
                        }}
                    >
                        Reset View
                    </button>
                )}
            </div>
        </div>
    );
};
