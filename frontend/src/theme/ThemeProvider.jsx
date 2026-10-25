import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';
const STORAGE_KEY = 'gridbricks-theme';
function initialTheme() {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(initialTheme);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const value = useMemo(() => ({
        theme,
        toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
    }), [theme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
