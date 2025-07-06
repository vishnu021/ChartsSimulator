import { useState, useCallback } from 'react';

export const useTheme = (initialTheme = 'dark') => {
    const [theme, setTheme] = useState(initialTheme);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return { theme, toggleTheme };
};
