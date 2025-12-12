'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Safari/iOS detection
function isSafariIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    return isIOS || isSafari;
}

// Check if already installed as PWA
function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
}

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isSafari, setIsSafari] = useState(false);

    useEffect(() => {
        // Check if already dismissed or in standalone mode
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed || isStandalone()) {
            setIsDismissed(true);
            return;
        }

        // Check for Safari/iOS
        const safariCheck = isSafariIOS();
        setIsSafari(safariCheck);

        if (safariCheck) {
            // Show Safari banner after delay
            setTimeout(() => setIsVisible(true), 3000);
            return;
        }

        // Chrome/Android: Listen for beforeinstallprompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
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

    // Don't render if dismissed, or if not Safari and no install prompt
    if (isDismissed || (!isSafari && !installPrompt)) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-24 right-6 w-72 md:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4 z-40"
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
                                Ana Ekrana Ekle
                            </h3>
                            {isSafari ? (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-2">
                                    <p>Uygulamayı yüklemek için:</p>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
                                        <Share size={16} className="text-blue-500 flex-shrink-0" />
                                        <span>1. Paylaş butonuna tıklayın</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg">
                                        <PlusSquare size={16} className="text-blue-500 flex-shrink-0" />
                                        <span>2. &quot;Ana Ekrana Ekle&quot; seçin</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Özel Kurtbeyoğlu App uygulamasını ana ekranınıza ekleyerek daha hızlı erişin.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2 px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                            {isSafari ? 'Anladım' : 'Daha Sonra'}
                        </button>
                        {!isSafari && (
                            <button
                                onClick={handleInstall}
                                className="flex-1 py-2 px-3 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
                            >
                                <Download size={14} />
                                Yükle
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
