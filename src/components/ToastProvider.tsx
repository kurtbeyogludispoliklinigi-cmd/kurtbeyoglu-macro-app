'use client';

import { ReactNode } from 'react';
import { ToastContext, useToastState } from '@/hooks/useToast';
import { ToastContainer } from './Toast';

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const { toasts, toast, dismiss } = useToastState();

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}
