// ===================================
// Kurtbeyoğlu Diş Kliniği - Utility Fonksiyonlar
// ===================================

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- CLASS HELPER ---
export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// --- PHONE NUMBER HELPERS ---
export const sanitizePhoneNumber = (value: string): string =>
    value.replace(/\D/g, '').slice(0, 10);

export const formatPhoneNumber = (value: string): string => {
    const digits = sanitizePhoneNumber(value);
    if (!digits) return '';

    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 8);
    const part4 = digits.slice(8, 10);

    return [
        part1 ? `(${part1}${part1.length === 3 ? ')' : ''}` : '',
        part2 ? ` ${part2}` : '',
        part3 ? ` ${part3}` : '',
        part4 ? ` ${part4}` : ''
    ].join('');
};

export const isValidPhoneNumber = (value: string): boolean => {
    const digits = sanitizePhoneNumber(value);
    return digits.length === 10 && digits.startsWith('5');
};

// --- DATE HELPERS ---
export const getLocalDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- FORMATTING HELPERS ---
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
};
