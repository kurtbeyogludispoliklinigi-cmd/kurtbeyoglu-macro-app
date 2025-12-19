'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, DollarSign } from 'lucide-react';
import { Doctor, Patient } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    currentUser: Doctor;
    onSuccess: () => void;
    // We pass toast from hook or context if needed, or component can use hook
    toast: (options: { type: 'success' | 'error'; message: string }) => void;
}

export function PaymentModal({
    isOpen,
    onClose,
    patientId,
    currentUser,
    onSuccess,
    toast
}: PaymentModalProps) {
    // Internal state to avoid bloating parent
    const [amount, setAmount] = useState<number>(0);
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const { logActivity } = useActivityLogger();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !patientId || amount <= 0) {
            toast({ type: 'error', message: 'Tutar giriniz' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('treatments').insert({
                patient_id: patientId,
                tooth_no: '', // Boş = ödeme kaydı
                procedure: 'ÖDEME - Tam Ödendi',
                cost: amount,
                notes: note || '',
                added_by: currentUser.name,
                payment_status: 'paid',
                payment_amount: amount,
                payment_note: note
            });

            if (error) throw error;

            toast({ type: 'success', message: 'Ödeme kaydedildi!' });
            setAmount(0);
            setNote('');


            await logActivity(currentUser, 'ADD_PAYMENT', {
                patient_id: patientId,
                amount: amount,
                note: note
            });

            onSuccess(); // Triggers refresh
            onClose();
        } catch (error) {
            console.error('Payment add error:', error);
            toast({ type: 'error', message: 'Ödeme kaydedilemedi.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Banknote size={24} className="text-teal-600" />
                        Ödeme Al
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tutar (TL)
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount || ''}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-lg font-mono"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ödeme Notu (Opsiyonel)
                        </label>
                        <textarea
                            placeholder="Not ekle..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none h-24"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50"
                        >
                            {loading ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
