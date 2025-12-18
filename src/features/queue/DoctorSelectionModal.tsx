import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Doctor, QueueData } from '@/lib/types';

interface DoctorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: Doctor[];
    nextDoctorInQueue: Doctor | null; // Display only
    onConfirm: (method: 'manual' | 'queue', selectedDoctorId?: string) => void;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function DoctorSelectionModal({
    isOpen,
    onClose,
    users,
    nextDoctorInQueue,
    onConfirm
}: DoctorSelectionModalProps) {
    const [method, setMethod] = useState<'manual' | 'queue' | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (method === 'manual') {
            if (!selectedDoctorId) return; // Validation
            onConfirm('manual', selectedDoctorId);
        } else if (method === 'queue') {
            onConfirm('queue');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Hekim Seçimi</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Yeni hasta eklemeden önce hekim seçim yönteminizi belirleyin:
                </p>

                <div className="space-y-4">
                    {/* Option 1: Manual Selection */}
                    <div
                        onClick={() => setMethod('manual')}
                        className={cn(
                            "border-2 rounded-xl p-5 cursor-pointer transition hover:shadow-lg",
                            method === 'manual'
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-200 hover:border-teal-300"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                                method === 'manual'
                                    ? "border-teal-500 bg-teal-500"
                                    : "border-gray-300"
                            )}>
                                {method === 'manual' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-800 mb-2">Hekim Tercihi Var</h4>
                                <p className="text-sm text-gray-600 mb-3">Hasta belirli bir hekimi talep ediyor veya tercih ediyor</p>
                                {method === 'manual' && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Hekim Seçin *</label>
                                        <select
                                            value={selectedDoctorId}
                                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                                            className="w-full p-3 border border-teal-300 rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                                            required
                                        >
                                            <option value="">Hekim Seçiniz...</option>
                                            {users.filter(u => u.role === 'doctor').map(doc => (
                                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Queue Assignment */}
                    <div
                        onClick={() => setMethod('queue')}
                        className={cn(
                            "border-2 rounded-xl p-5 cursor-pointer transition hover:shadow-lg",
                            method === 'queue'
                                ? "border-amber-500 bg-amber-50"
                                : "border-gray-200 hover:border-amber-300"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                                method === 'queue'
                                    ? "border-amber-500 bg-amber-500"
                                    : "border-gray-300"
                            )}>
                                {method === 'queue' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-800 mb-2">Sıradaki Hekime Ata</h4>
                                <p className="text-sm text-gray-600 mb-2">Sistem otomatik olarak günlük sıradaki hekime atama yapar</p>
                                <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg">
                                    <p className="text-sm font-semibold text-amber-800">
                                        📋 Sıradaki Hekim: <span className="text-amber-900">{nextDoctorInQueue?.name || 'Yükleniyor...'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-base transition"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!method || (method === 'manual' && !selectedDoctorId)}
                        className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Devam Et
                    </button>
                </div>
            </div>
        </div>
    );
}
