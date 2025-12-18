'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface PasswordChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChangePassword: (currentPin: string, newPin: string) => Promise<boolean>;
    loading: boolean;
}

export function PasswordChangeModal({
    isOpen,
    onClose,
    onChangePassword,
    loading
}: PasswordChangeModalProps) {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const handleClose = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPin !== confirmPin) {
            return; // Toast will be shown by parent
        }

        const success = await onChangePassword(currentPin, newPin);
        if (success) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Lock className="text-teal-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Şifre Değiştir</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mevcut PIN
                        </label>
                        <input
                            type="password"
                            placeholder="****"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                            required
                            maxLength={6}
                            autoComplete="current-password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Yeni PIN
                        </label>
                        <input
                            type="password"
                            placeholder="****"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                            required
                            minLength={4}
                            maxLength={6}
                            autoComplete="new-password"
                        />
                        <p className="text-xs text-gray-500 mt-1">En az 4 haneli olmalıdır</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Yeni PIN (Tekrar)
                        </label>
                        <input
                            type="password"
                            placeholder="****"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                            required
                            minLength={4}
                            maxLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || newPin !== confirmPin || newPin.length < 4}
                            className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50"
                        >
                            {loading ? 'Kaydediliyor...' : 'Değiştir'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
