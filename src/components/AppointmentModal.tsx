'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
    id: string;
    name: string;
}

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: {
        patient_id: string;
        doctor_id: string;
        appointment_date: string;
        duration_minutes: number;
        notes: string;
        status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    }) => Promise<{ success: boolean; error?: string }>;
    patients: Patient[];
    doctorId: string;
    existingAppointment?: {
        id: string;
        patient_id: string;
        appointment_date: string;
        duration_minutes: number;
        notes: string;
        status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    };
    defaultDate?: Date;
}

export function AppointmentModal({
    isOpen,
    onClose,
    onSave,
    patients,
    doctorId,
    existingAppointment,
    defaultDate,
}: AppointmentModalProps) {
    const [patientId, setPatientId] = useState('');
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(30);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'>('scheduled');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isPastDate = date ? new Date(date).getTime() < Date.now() : false;

    // Reset form when modal opens or existingAppointment changes
    useEffect(() => {
        if (isOpen) {
            if (existingAppointment) {
                setPatientId(existingAppointment.patient_id);
                setDate(new Date(existingAppointment.appointment_date).toISOString().slice(0, 16));
                setDuration(existingAppointment.duration_minutes);
                setNotes(existingAppointment.notes || '');
                setStatus(existingAppointment.status);
            } else {
                // Reset to defaults for new appointment
                setPatientId('');
                if (defaultDate) {
                    // Adjust to local timezone offset manually to ensure correct string input
                    const tzOffset = defaultDate.getTimezoneOffset() * 60000; // offset in milliseconds
                    const localISOTime = (new Date(defaultDate.getTime() - tzOffset)).toISOString().slice(0, 16);
                    setDate(localISOTime);
                } else {
                    setDate('');
                }
                setDuration(30);
                setNotes('');
                setStatus('scheduled');
            }
            setError(null);
        }
    }, [isOpen, existingAppointment, defaultDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !date) {
            setError('Hasta ve tarih seçimi zorunludur.');
            return;
        }

        if (isPastDate) {
            setError('Geçmiş tarih seçilemez.');
            return;
        }

        setLoading(true);
        setError(null);

        const result = await onSave({
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_date: new Date(date).toISOString(),
            duration_minutes: duration,
            notes,
            status,
        });

        setLoading(false);

        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Bir hata oluştu');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-white dark:bg-slate-800 w-full h-[100dvh] md:h-auto md:max-w-md md:rounded-xl rounded-none shadow-2xl p-4 md:p-6 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Calendar size={20} className="text-[#0e7490]" />
                                {existingAppointment ? 'Randevu Düzenle' : 'Yeni Randevu'}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Patient Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <User size={14} /> Hasta
                                </label>
                                <select
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    required
                                    className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-[#0e7490] outline-none"
                                >
                                    <option value="">Hasta Seçin...</option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Calendar size={14} /> Tarih & Saat
                                </label>
                                <input
                                    type="datetime-local"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                                {isPastDate && (
                                    <p className="text-xs text-red-500 mt-1">Geçmiş tarih için kayıt oluşturulamaz.</p>
                                )}
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Clock size={14} /> Süre (dakika)
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value={15}>15 dakika</option>
                                    <option value={30}>30 dakika</option>
                                    <option value={45}>45 dakika</option>
                                    <option value={60}>1 saat</option>
                                    <option value={90}>1.5 saat</option>
                                    <option value={120}>2 saat</option>
                                </select>
                            </div>

                            {/* Status (only for editing) */}
                            {existingAppointment && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Durum
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as typeof status)}
                                        className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    >
                                        <option value="scheduled">Planlandı</option>
                                        <option value="in-progress">Devam Ediyor</option>
                                        <option value="completed">Tamamlandı</option>
                                        <option value="cancelled">İptal</option>
                                        <option value="no-show">Gelmedi</option>
                                    </select>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <FileText size={14} /> Notlar
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Randevu notları..."
                                    rows={3}
                                    className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="touch-target flex-1 py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !patientId || !date || isPastDate}
                                    className="touch-target flex-1 py-3 px-4 bg-[#0e7490] text-white rounded-lg hover:bg-[#155e75] transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '...' : existingAppointment ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
