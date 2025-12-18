'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
    const isOffline = !useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 animate-pulse">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                <WifiOff size={16} />
                <span>İnternet bağlantısı yok</span>
            </div>
        </div>
    );
}

function subscribe(callback: () => void) {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
}

function getSnapshot() {
    return navigator.onLine;
}

function getServerSnapshot() {
    return true; // Assume online on server
}
