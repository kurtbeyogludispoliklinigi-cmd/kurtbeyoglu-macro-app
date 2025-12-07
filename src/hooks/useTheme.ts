'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeState() {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Get system preference
    const getSystemTheme = useCallback((): 'light' | 'dark' => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }, []);

    // Resolve actual theme
    const resolveTheme = useCallback((t: Theme): 'light' | 'dark' => {
        if (t === 'system') return getSystemTheme();
        return t;
    }, [getSystemTheme]);

    // Initialize from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            setThemeState(stored);
            setResolvedTheme(resolveTheme(stored));
        } else {
            setResolvedTheme(getSystemTheme());
        }
    }, [getSystemTheme, resolveTheme]);

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        if (resolvedTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [resolvedTheme]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            setResolvedTheme(getSystemTheme());
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, getSystemTheme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        setResolvedTheme(resolveTheme(newTheme));
        localStorage.setItem('theme', newTheme);
    }, [resolveTheme]);

    const toggleTheme = useCallback(() => {
        const next = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(next);
    }, [resolvedTheme, setTheme]);

    return { theme, resolvedTheme, setTheme, toggleTheme };
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
