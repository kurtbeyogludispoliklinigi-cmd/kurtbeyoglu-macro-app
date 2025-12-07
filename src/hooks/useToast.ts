'use client';

import { useState, useCallback, createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    toast: (options: Omit<Toast, 'id'>) => void;
    dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export function useToastState() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback(({ type, message, duration = 3000 }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, type, message, duration };

        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, toast, dismiss };
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
