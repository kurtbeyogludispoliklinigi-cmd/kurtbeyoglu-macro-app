'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, CreditCard, Banknote, Building2, CheckCircle, User, ArrowLeft, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

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
    patientName?: string; // Enhanced locally
}

interface Patient {
    id: string;
    name: string;
    phone?: string;
}

interface PaymentQuickAccessProps {
    isOpen: boolean;
    onClose: () => void;
    treatments: Treatment[];
    patients: Patient[];
    onSuccess: () => void; // Trigger refresh
}

export function PaymentQuickAccess({
    isOpen,
    onClose,
    treatments,
    patients,
    onSuccess
}: PaymentQuickAccessProps) {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [method, setMethod] = useState('cash'); // cash, credit_card, bank_transfer
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'debt' | 'general'>('debt');

    // 1. Search Patients
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return [];
        return patients
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
    }, [patients, searchTerm]);

    const activePatient = useMemo(() =>
        patients.find(p => p.id === selectedPatientId),
        [patients, selectedPatientId]);

    // 2. Get Pending Treatments for Selected Patient
    const patientPendingTreatments = useMemo(() => {
        if (!selectedPatientId) return [];
        return treatments.filter(t =>
            t.patient_id === selectedPatientId &&
            t.payment_status !== 'paid'
        );
    }, [treatments, selectedPatientId]);

    // Handle Paying off a specific treatment (Debt)
    const handleDebtPayment = async (treatmentId: string, paymentAmount: number, paymentMethod: string) => {
        const treatment = treatments.find(t => t.id === treatmentId);
        if (!treatment) return;

        const currentPaid = treatment.payment_amount || 0;
        const totalPaid = currentPaid + paymentAmount;
        const remaining = (treatment.cost || 0) - totalPaid;

        // Status update logic
        const status = remaining <= 0.1 ? 'paid' : 'partial';

        // Determine method label
        const methodLabel = paymentMethod === 'cash' ? 'Nakit' : paymentMethod === 'credit_card' ? 'KK' : 'Havale';
        const dateStr = new Date().toLocaleDateString('tr-TR');

        const newNote = treatment.payment_note
            ? `${treatment.payment_note}\n- ${paymentAmount}₺ ${methodLabel} (${dateStr})`
            : `- ${paymentAmount}₺ ${methodLabel} (${dateStr})`;

        const updates = {
            payment_amount: totalPaid,
            payment_status: status,
            payment_note: newNote,
        };

        const { error } = await supabase.from('treatments').update(updates).eq('id', treatmentId);
        if (error) throw error;
    };

    // Handle General Payment (New Credit)
    const handleGeneralPayment = async (amount: number, paymentMethod: string, note: string) => {
        if (!activePatient) return;

        const methodLabel = paymentMethod === 'cash' ? 'Nakit' : paymentMethod === 'credit_card' ? 'KK' : 'Havale';
        const fullNote = `GENEL ÖDEME: ${amount}₺ ${methodLabel} - ${note}`;

        const { error } = await supabase.from('treatments').insert({
            patient_id: activePatient.id,
            tooth_no: '',
            procedure: 'ÖDEME - Genel',
            cost: amount,
            notes: fullNote,
            added_by: 'Sistem', // Or current user if passed
            payment_status: 'paid',
            payment_amount: amount,
            payment_note: fullNote
        });

        if (error) throw error;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (numAmount <= 0) {
            toast({ type: 'error', message: 'Geçersiz tutar.' });
            return;
        }

        setLoading(true);
        try {
            if (activeTab === 'debt' && selectedTreatmentId) {
                await handleDebtPayment(selectedTreatmentId, numAmount, method);
                toast({ type: 'success', message: 'Borç tahsilatı kaydedildi.' });
            } else if (activeTab === 'general') {
                await handleGeneralPayment(numAmount, method, note);
                toast({ type: 'success', message: 'Genel ödeme kaydedildi.' });
            }

            // Reset logic
            setAmount('');
            setNote('');
            setSelectedTreatmentId(null);
            onSuccess(); // Refresh data

            // If debt payment completed and no more debts, maybe switch tabs? 
            // For now, keep user on patient view
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: 'Ödeme işleminde hata oluştu.' });
        } finally {
            setLoading(false);
        }
    };

    const resetSelection = () => {
        setSelectedPatientId(null);
        setSelectedTreatmentId(null);
        setSearchTerm('');
        setAmount('');
        setActiveTab('debt');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] h-[600px]"
            >
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        {selectedPatientId ? (
                            <button onClick={resetSelection} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full">
                                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        ) : (
                            <Banknote className="text-teal-600" size={24} />
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                {activePatient ? activePatient.name : 'Hızlı Ödeme Ekranı'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activePatient ? 'Ödeme veya tahsilat işlemi' : 'Ödeme almak için hasta seçin'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {!selectedPatientId ? (
                        // SEARCH VIEW
                        <div className="p-6 h-full flex flex-col">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Hasta adı ile ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-lg"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {searchTerm && filteredPatients.length === 0 && (
                                    <div className="text-center text-gray-500 mt-10">Kayıt bulunamadı.</div>
                                )}
                                {filteredPatients.map(patient => (
                                    <button
                                        key={patient.id}
                                        onClick={() => {
                                            setSelectedPatientId(patient.id);
                                            // Default to 'debt' if they have pending treatments, else 'general'
                                            const hasDebt = treatments.some(t => t.patient_id === patient.id && t.payment_status !== 'paid');
                                            setActiveTab(hasDebt ? 'debt' : 'general');
                                        }}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{patient.name}</h4>
                                            {patient.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{patient.phone}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // PAYMENT ACTION VIEW
                        <div className="flex h-full">
                            {/* Left Sidebar: Tabs */}
                            <div className="w-1/3 bg-gray-50 dark:bg-slate-800/50 border-r dark:border-slate-700 p-4 space-y-2">
                                <button
                                    onClick={() => setActiveTab('debt')}
                                    className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition ${activeTab === 'debt' ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Banknote size={18} />
                                    <span>Borç Ödeme</span>
                                    {patientPendingTreatments.length > 0 && (
                                        <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                            {patientPendingTreatments.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('general');
                                        setSelectedTreatmentId(null);
                                        setAmount('');
                                    }}
                                    className={`w-full text-left p-3 rounded-lg flex items-center gap-2 transition ${activeTab === 'general' ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Plus size={18} />
                                    <span>Genel Ödeme</span>
                                </button>
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {activeTab === 'debt' ? (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Bekleyen Ödemeler</h3>
                                        {patientPendingTreatments.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed">
                                                <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                                                <p>Bekleyen borç bulunmuyor.</p>
                                                <button onClick={() => setActiveTab('general')} className="text-teal-600 text-sm mt-2 hover:underline">
                                                    Genel ödeme al
                                                </button>
                                            </div>
                                        ) : (
                                            patientPendingTreatments.map(t => {
                                                const remaining = (t.cost || 0) - (t.payment_amount || 0);
                                                const isSelected = selectedTreatmentId === t.id;
                                                return (
                                                    <div key={t.id}
                                                        onClick={() => {
                                                            setSelectedTreatmentId(t.id);
                                                            setAmount(remaining.toString());
                                                        }}
                                                        className={`p-4 rounded-xl border cursor-pointer transition ${isSelected ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10 ring-1 ring-teal-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-gray-800 dark:text-gray-200">{t.procedure}</p>
                                                                <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString('tr-TR')}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-red-500">{remaining.toLocaleString('tr-TR')} ₺</p>
                                                                <p className="text-xs text-gray-400">Toplam: {t.cost} ₺</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Genel Ödeme (Kredi)</h3>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                                Bu işlem hastaya yeni bir ödeme kaydı ekler. Yapılan işlemle doğrudan eşleşmez, bakiye olarak görünür.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama / Not</label>
                                            <input
                                                type="text"
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Örn: Ön ödeme, Kapora vb."
                                                className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Payment Form Wrapper (Common) */}
                                {(selectedTreatmentId || activeTab === 'general') && (
                                    <motion.form
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onSubmit={handleSubmit}
                                        className="mt-6 pt-6 border-t dark:border-slate-700 space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {activeTab === 'debt' ? 'Ödenecek Tutar' : 'Tahsilat Tutarı'}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-3 text-gray-500 font-bold">₺</span>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full pl-8 p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 text-lg font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            {(['cash', 'credit_card', 'transfer'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setMethod(m)}
                                                    className={`py-2 px-1 rounded-lg text-sm font-medium border flex flex-col items-center gap-1 ${method === m ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    {m === 'cash' && <Banknote size={16} />}
                                                    {m === 'credit_card' && <CreditCard size={16} />}
                                                    {m === 'transfer' && <Building2 size={16} />}
                                                    <span>{m === 'cash' ? 'Nakit' : m === 'credit_card' ? 'Kredi Kartı' : 'Havale'}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || !amount}
                                            className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
                                        >
                                            {loading ? 'İşleniyor...' : 'Ödemeyi Onayla'}
                                        </button>
                                    </motion.form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
