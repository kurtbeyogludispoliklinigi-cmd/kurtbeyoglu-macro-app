'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Doctor, QueueData } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DoctorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    users: Doctor[];
    queueData: QueueData | null;
    getNextDoctorInQueue: () => Doctor | null;
    doctorSelectionMethod: 'manual' | 'queue' | null;
    setDoctorSelectionMethod: (method: 'manual' | 'queue' | null) => void;
    selectedDoctorForPatient: string;
    setSelectedDoctorForPatient: (doctorId: string) => void;
}

export function DoctorSelectionModal({
    isOpen,
    onClose,
    onConfirm,
    users,
    queueData,
    getNextDoctorInQueue,
    doctorSelectionMethod,
    setDoctorSelectionMethod,
    selectedDoctorForPatient,
    setSelectedDoctorForPatient
}: DoctorSelectionModalProps) {
    if (!isOpen) return null;

    const doctors = users.filter(u => u.role === 'doctor');
    const nextDoctor = getNextDoctorInQueue();

    const handleClose = () => {
        setDoctorSelectionMethod(null);
        setSelectedDoctorForPatient('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            >
                <h3 className="text-xl font-bold text-gray-800 mb-4">Hekim Seçimi</h3>
                <p className="text-gray-600 mb-6">
                    Yeni hastayı hangi hekime atamak istiyorsunuz?
                </p>

                <div className="space-y-4">
                    {/* Manual Selection Option */}
                    <div
                        className={cn(
                            "border-2 rounded-xl p-4 cursor-pointer transition-all",
                            doctorSelectionMethod === 'manual'
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setDoctorSelectionMethod('manual')}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                                doctorSelectionMethod === 'manual'
                                    ? "border-teal-500 bg-teal-500"
                                    : "border-gray-300"
                            )}>
                                {doctorSelectionMethod === 'manual' && (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-800 mb-2">
                                    Elle Seç (Tercih)
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Hasta bir hekim tercih ettiyse buradan seçin
                                </p>
                                {doctorSelectionMethod === 'manual' && (
                                    <select
                                        value={selectedDoctorForPatient}
                                        onChange={(e) => setSelectedDoctorForPatient(e.target.value)}
                                        className="w-full p-3 border border-teal-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Hekim Seçin...</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Queue Option */}
                    <div
                        className={cn(
                            "border-2 rounded-xl p-4 cursor-pointer transition-all",
                            doctorSelectionMethod === 'queue'
                                ? "border-amber-500 bg-amber-50"
                                : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setDoctorSelectionMethod('queue')}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                                doctorSelectionMethod === 'queue'
                                    ? "border-amber-500 bg-amber-500"
                                    : "border-gray-300"
                            )}>
                                {doctorSelectionMethod === 'queue' && (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-800 mb-2">
                                    Sıradaki Hekime Ata
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                    Sistem otomatik olarak günlük sıradaki hekime atama yapar
                                </p>
                                {queueData && (
                                    <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg">
                                        <p className="text-sm font-semibold text-amber-800">
                                            📋 Sıradaki Hekim:{' '}
                                            <span className="text-amber-900">
                                                {nextDoctor?.name || 'Yükleniyor...'}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-base transition"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!doctorSelectionMethod || (doctorSelectionMethod === 'manual' && !selectedDoctorForPatient)}
                        className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Devam Et
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
