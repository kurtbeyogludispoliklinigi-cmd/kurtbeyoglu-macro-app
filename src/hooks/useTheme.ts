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
            // Defer updates to avoid sync render warning
            setTimeout(() => {
                if (theme !== stored) {
                    setThemeState(stored);
                }
                const resolved = resolveTheme(stored);
                if (resolvedTheme !== resolved) {
                    setResolvedTheme(resolved);
                }
            }, 0);
        } else {
            const sysTheme = getSystemTheme();
            if (resolvedTheme !== sysTheme) {
                // Defer to avoid warning
                setTimeout(() => setResolvedTheme(sysTheme), 0);
            }
        }
    }, [getSystemTheme, resolveTheme]); // Removed theme/resolvedTheme from dependency to avoid cycles, but logic needs to be careful.
    // Actually, if I add theme to dependency, it might loop.
    // Better to just not depend on theme/resolvedTheme inside, but that breaks the 'if' check validity if closure is stale.
    // However, useEffect runs after render, so closure has latest state usually.
    // Let's rely on functional updates or just suppress the warning if checks are good.
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
