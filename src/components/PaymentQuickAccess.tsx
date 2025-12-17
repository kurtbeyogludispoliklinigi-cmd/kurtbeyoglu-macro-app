'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, CreditCard, Banknote, Building2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types reuse
interface Treatment {
    id: string;
    patient_id: string;
    procedure: string;
    cost: number;
    payment_status?: 'pending' | 'paid' | 'partial';
    payment_amount?: number;
    payment_note?: string | null;
    created_at: string;
}

interface Patient {
    id: string;
    name: string;
}

interface PaymentQuickAccessProps {
    isOpen: boolean;
    onClose: () => void;
    treatments: Treatment[];
    patients: Patient[];
    onPaymentSubmit: (treatmentId: string, amount: number, method: string) => Promise<void>;
}

export function PaymentQuickAccess({
    isOpen,
    onClose,
    treatments,
    patients,
    onPaymentSubmit
}: PaymentQuickAccessProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash'); // cash, credit_card, bank_transfer
    const [loading, setLoading] = useState(false);

    // Filter pending treatments
    const pendingTreatments = useMemo(() => {
        return treatments.filter(t => {
            const isPending = t.payment_status !== 'paid';
            const patient = patients.find(p => p.id === t.patient_id);
            const matchesSearch = searchTerm === '' ||
                (patient && patient.name.toLowerCase().includes(searchTerm.toLowerCase()));

            return isPending && matchesSearch;
        }).map(t => {
            const patient = patients.find(p => p.id === t.patient_id);
            return { ...t, patientName: patient?.name || 'Bilinmiyor' };
        });
    }, [treatments, patients, searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTreatmentId) return;

        setLoading(true);
        try {
            await onPaymentSubmit(selectedTreatmentId, Number(amount), method);
            setSelectedTreatmentId(null);
            setAmount('');
        } catch (error) {
            console.error(error);
            alert('Ödeme alınırken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Banknote className="text-teal-600" />
                            Hızlı Ödeme Ekranı
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Bekleyen ödemeleri görüntüleyin ve tahsilat yapın.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Hasta adı ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/50">
                    {pendingTreatments.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Bekleyen ödeme bulunamadı.</p>
                        </div>
                    ) : (
                        pendingTreatments.map(t => {
                            const remaining = (t.cost || 0) - (t.payment_amount || 0);
                            const isSelected = selectedTreatmentId === t.id;

                            return (
                                <div key={t.id} className={`bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600 shadow-sm overflow-hidden transition-all ${isSelected ? 'ring-2 ring-teal-500' : ''}`}>
                                    <div
                                        className="p-4 cursor-pointer flex justify-between items-center"
                                        onClick={() => {
                                            if (isSelected) setSelectedTreatmentId(null);
                                            else {
                                                setSelectedTreatmentId(t.id);
                                                setAmount(remaining.toString());
                                            }
                                        }}
                                    >
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{t.patientName}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.procedure}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                                                {remaining.toLocaleString('tr-TR')} ₺
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Toplam: {t.cost} ₺
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t dark:border-slate-600 bg-teal-50/50 dark:bg-slate-600/30"
                                            >
                                                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Tahsil Edilecek Tutar</label>
                                                        <input
                                                            type="number"
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            max={remaining}
                                                            className="w-full p-2 border rounded-lg"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Ödeme Yöntemi</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setMethod('cash')}
                                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${method === 'cash' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600'}`}
                                                            >
                                                                <Banknote size={16} /> Nakit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setMethod('credit_card')}
                                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${method === 'credit_card' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600'}`}
                                                            >
                                                                <CreditCard size={16} /> Kredi Kartı
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setMethod('transfer')}
                                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${method === 'transfer' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600'}`}
                                                            >
                                                                <Building2 size={16} /> Havale
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-teal-600/20 disabled:opacity-50"
                                                    >
                                                        {loading ? 'İşleniyor...' : 'Ödemeyi Onayla'}
                                                    </button>
                                                </form>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
}
