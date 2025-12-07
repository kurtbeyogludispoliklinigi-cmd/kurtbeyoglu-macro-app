'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';

export function ThemeToggle() {
    const { resolvedTheme, toggleTheme } = useTheme();

    return (
        <motion.button
            onClick={toggleTheme}
            className="p-2 hover:bg-white/20 rounded-full transition relative"
            title={resolvedTheme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
            whileTap={{ scale: 0.9 }}
        >
            <motion.div
                initial={false}
                animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
                transition={{ duration: 0.3 }}
            >
                {resolvedTheme === 'dark' ? (
                    <Sun size={18} className="text-yellow-300" />
                ) : (
                    <Moon size={18} />
                )}
            </motion.div>
        </motion.button>
    );
}
