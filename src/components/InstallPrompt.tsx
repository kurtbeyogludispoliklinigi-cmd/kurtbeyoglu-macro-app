'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            // Show prompt after a delay
            setTimeout(() => setIsVisible(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsVisible(false);
            setInstallPrompt(null);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
        setIsDismissed(true);
    };

    if (isDismissed || !installPrompt) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-50"
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-start gap-3">
                        <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-xl">
                            <Smartphone size={24} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                Uygulamayı Yükle
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                DentistNote&apos;u ana ekranınıza ekleyerek daha hızlı erişin.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2 px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                            Daha Sonra
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 py-2 px-3 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
                        >
                            <Download size={14} />
                            Yükle
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
