'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '@/hooks/useToast';

interface ToastProps {
    toast: ToastType;
    onDismiss: (id: string) => void;
}

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
};

export function Toast({ toast, onDismiss }: ToastProps) {
    const Icon = icons[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${colors[toast.type]}`}
        >
            <Icon size={20} className={iconColors[toast.type]} />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 hover:bg-black/5 rounded-full transition"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
}

interface ToastContainerProps {
    toasts: ToastType[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            <AnimatePresence mode="sync">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast toast={toast} onDismiss={onDismiss} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
