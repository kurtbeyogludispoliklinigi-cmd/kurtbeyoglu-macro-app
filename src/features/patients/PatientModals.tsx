'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { VoiceInput } from '@/components/VoiceInput';
import type { Doctor, Patient, NewPatientForm } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';

// --- ADD PATIENT MODAL ---
interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    newPatient: NewPatientForm;
    setNewPatient: React.Dispatch<React.SetStateAction<NewPatientForm>>;
    currentUser: Doctor;
    users: Doctor[];
    selectedDoctorForPatient: string;
    loading: boolean;
    canSave: boolean;
}

export function AddPatientModal({
    isOpen,
    onClose,
    onSubmit,
    newPatient,
    setNewPatient,
    currentUser,
    users,
    selectedDoctorForPatient,
    loading,
    canSave
}: AddPatientModalProps) {
    if (!isOpen) return null;

    const needsDoctorSelection = currentUser.role === 'banko' || currentUser.role === 'asistan';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white w-full h-[100dvh] md:h-auto md:max-w-md md:rounded-xl shadow-2xl p-5 md:p-6 overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800">Yeni Hasta Kartı</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                        <input
                            type="text"
                            required
                            placeholder="Ad Soyad"
                            className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none"
                            value={newPatient.name}
                            onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                            type="tel"
                            placeholder="(5XX) XXX XX XX"
                            required
                            className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none"
                            value={newPatient.phone}
                            onChange={e => setNewPatient({ ...newPatient, phone: formatPhoneNumber(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500 mt-1">Sadece 5 ile başlayan 10 haneli numara kabul edilir.</p>
                    </div>

                    {needsDoctorSelection && selectedDoctorForPatient && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seçilen Hekim</label>
                            <div className="w-full p-3 border border-teal-200 bg-teal-50 rounded-lg text-base font-semibold text-teal-800">
                                {users.find(u => u.id === selectedDoctorForPatient)?.name || 'Bilinmiyor'}
                            </div>
                        </div>
                    )}

                    {hasPermission.editAnamnez(currentUser.role) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Anamnez</label>
                            <div className="relative">
                                <textarea
                                    placeholder="Anamnez..."
                                    className="w-full p-3 pr-12 border border-red-200 bg-red-50 rounded-lg text-base focus:ring-2 focus:ring-red-300 outline-none"
                                    rows={3}
                                    value={newPatient.anamnez}
                                    onChange={e => setNewPatient({ ...newPatient, anamnez: e.target.value })}
                                />
                                <div className="absolute right-2 bottom-2">
                                    <VoiceInput onTranscript={(text: string) => setNewPatient(p => ({ ...p, anamnez: p.anamnez + ' ' + text }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !canSave || (needsDoctorSelection && !selectedDoctorForPatient)}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Kaydediyor...' : 'Kaydet'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// --- EDIT PATIENT MODAL ---
interface EditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    editingPatient: Patient | null;
    setEditingPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
    loading: boolean;
    canSave: boolean;
}

export function EditPatientModal({
    isOpen,
    onClose,
    onSubmit,
    editingPatient,
    setEditingPatient,
    loading,
    canSave
}: EditPatientModalProps) {
    if (!isOpen || !editingPatient) return null;

    const handleClose = () => {
        setEditingPatient(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800">Hasta Bilgilerini Düzenle</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                        <input
                            type="text"
                            required
                            placeholder="Ad Soyad"
                            className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none"
                            value={editingPatient.name}
                            onChange={e => setEditingPatient({ ...editingPatient, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                            type="tel"
                            placeholder="(5XX) XXX XX XX"
                            required
                            className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none"
                            value={editingPatient.phone || ''}
                            onChange={e => setEditingPatient({ ...editingPatient, phone: formatPhoneNumber(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500 mt-1">Numara eksikse kaydetme butonu kapanır.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Anamnez</label>
                        <div className="relative">
                            <textarea
                                placeholder="Anamnez..."
                                className="w-full p-3 pr-12 border border-red-200 bg-red-50 rounded-lg text-base focus:ring-2 focus:ring-red-300 outline-none"
                                rows={3}
                                value={editingPatient.anamnez || ''}
                                onChange={e => setEditingPatient({ ...editingPatient, anamnez: e.target.value })}
                            />
                            <div className="absolute right-2 bottom-2">
                                <VoiceInput onTranscript={(text: string) => setEditingPatient(p => p ? { ...p, anamnez: (p.anamnez || '') + ' ' + text } : p)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50 text-base"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !canSave}
                            className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Kaydediliyor...' : 'Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- DUPLICATE WARNING MODAL ---
interface DuplicateWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicatePatients: Patient[];
    onSelectPatient: (patient: Patient) => void;
    onProceedAnyway: () => void;
}

export function DuplicateWarningModal({
    isOpen,
    onClose,
    duplicatePatients,
    onSelectPatient,
    onProceedAnyway
}: DuplicateWarningModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-orange-600 mb-4">
                    ⚠️ Benzer Hasta Kaydı Bulundu
                </h3>

                <p className="text-gray-700 mb-4">
                    Sistemde benzer hasta(lar) mevcut:
                </p>

                <div className="space-y-2 mb-6">
                    {duplicatePatients.map(p => (
                        <div key={p.id} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
                            <div className="font-semibold text-gray-800">{p.name}</div>
                            <div className="text-sm text-gray-600">
                                📞 {p.phone || 'Tel yok'} | 👨‍⚕️ {p.doctor_name}
                            </div>
                            <button
                                onClick={() => onSelectPatient(p)}
                                className="mt-2 text-sm text-teal-600 hover:underline font-medium"
                            >
                                Bu hastayı seç →
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onProceedAnyway}
                        className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600"
                    >
                        Yine de Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}
