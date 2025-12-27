import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';

export interface PatientSaveConfirmationData {
    hasTreatments: boolean;
    treatmentNotes: string;
    hasAppointment: boolean;
    appointmentDate: string;
    hasMedication: boolean;
    medicationNotes: string;
    treatmentDoneToday: boolean;
}

interface PatientSaveConfirmationProps {
    onConfirm: (data: PatientSaveConfirmationData) => void;
    onCancel: () => void;
}

export function PatientSaveConfirmation({ onConfirm, onCancel }: PatientSaveConfirmationProps) {
    const [hasTreatments, setHasTreatments] = useState(false);
    const [treatmentNotes, setTreatmentNotes] = useState('');
    const [hasAppointment, setHasAppointment] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [hasMedication, setHasMedication] = useState(false);
    const [medicationNotes, setMedicationNotes] = useState('');
    const [treatmentDoneToday, setTreatmentDoneToday] = useState(false);

    const canSave = (
        (!hasTreatments || treatmentNotes.trim()) &&
        (!hasAppointment || appointmentDate) &&
        (!hasMedication || medicationNotes.trim())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={24} />
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Kaydetmeden Önce</h3>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Lütfen aşağıdaki bilgileri kontrol edin:
                </p>

                <div className="space-y-3">
                    {/* Treatment Plan */}
                    <div className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-r">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasTreatments}
                                onChange={(e) => setHasTreatments(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-800 dark:text-gray-200">Hastaya tedavi planlandı</span>
                        </label>
                        {hasTreatments && (
                            <input
                                type="text"
                                placeholder="Hangi tedaviler? (örn: Kanal tedavisi, Dolgu)"
                                value={treatmentNotes}
                                onChange={(e) => setTreatmentNotes(e.target.value)}
                                className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        )}
                    </div>

                    {/* Appointment */}
                    <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50/50 dark:bg-green-900/20 rounded-r">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasAppointment}
                                onChange={(e) => setHasAppointment(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="font-medium text-gray-800 dark:text-gray-200">Randevu verildi</span>
                        </label>
                        {hasAppointment && (
                            <input
                                type="date"
                                value={appointmentDate}
                                onChange={(e) => setAppointmentDate(e.target.value)}
                                className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        )}
                    </div>

                    {/* Medication */}
                    <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50/50 dark:bg-purple-900/20 rounded-r">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasMedication}
                                onChange={(e) => setHasMedication(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-800 dark:text-gray-200">İlaç yazıldı</span>
                        </label>
                        {hasMedication && (
                            <input
                                type="text"
                                placeholder="Hangi ilaçlar?"
                                value={medicationNotes}
                                onChange={(e) => setMedicationNotes(e.target.value)}
                                className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        )}
                    </div>

                    {/* Treatment Done Today */}
                    <div className="border-l-4 border-teal-500 pl-3 py-2 bg-teal-50/50 dark:bg-teal-900/20 rounded-r">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={treatmentDoneToday}
                                onChange={(e) => setTreatmentDoneToday(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="font-medium text-gray-800 dark:text-gray-200">Tedavi bugün yapıldı</span>
                        </label>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t dark:border-slate-700">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium transition"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onConfirm({
                            hasTreatments,
                            treatmentNotes,
                            hasAppointment,
                            appointmentDate,
                            hasMedication,
                            medicationNotes,
                            treatmentDoneToday
                        })}
                        disabled={!canSave}
                        className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition"
                    >
                        <Check size={18} />
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
