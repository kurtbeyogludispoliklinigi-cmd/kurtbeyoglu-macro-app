'use client';

import { useState } from 'react';
import {
    Calendar, Clock, User, Trash2, Edit, CheckCircle, XCircle,
    AlertCircle, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appointment } from '@/hooks/useAppointments';

interface AppointmentListProps {
    appointments: Appointment[];
    onEdit: (appointment: Appointment) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: Appointment['status']) => void;
    onAddNew: () => void;
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    loading?: boolean;
}

const statusConfig = {
    scheduled: { label: 'Planlandı', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    'no-show': { label: 'Gelmedi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertCircle },
};

export function AppointmentList({
    appointments,
    onEdit,
    onDelete,
    onStatusChange,
    onAddNew,
    selectedDate,
    onDateChange,
    loading,
}: AppointmentListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const goToPreviousDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        onDateChange(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        onDateChange(next);
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header with Date Navigation */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Calendar size={20} className="text-teal-500" />
                        Randevular
                    </h2>
                    <button
                        onClick={onAddNew}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
                    >
                        <Plus size={16} /> Yeni
                    </button>
                </div>

                {/* Date Selector */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 rounded-lg p-2">
                    <button
                        onClick={goToPreviousDay}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
                    >
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>

                    <div className="text-center">
                        <button
                            onClick={goToToday}
                            className={`text-sm font-medium ${isToday(selectedDate)
                                    ? 'text-teal-600 dark:text-teal-400'
                                    : 'text-gray-800 dark:text-gray-200 hover:text-teal-600'
                                }`}
                        >
                            {isToday(selectedDate) ? 'Bugün' : formatDate(selectedDate)}
                        </button>
                    </div>

                    <button
                        onClick={goToNextDay}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
                    >
                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Appointment List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Bu gün için randevu yok.</p>
                        <button
                            onClick={onAddNew}
                            className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-sm"
                        >
                            + Randevu Ekle
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {appointments.map((apt) => {
                            const status = statusConfig[apt.status];
                            const StatusIcon = status.icon;
                            const isExpanded = expandedId === apt.id;

                            return (
                                <motion.div
                                    key={apt.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-slate-700 rounded-xl border dark:border-slate-600 shadow-sm overflow-hidden"
                                >
                                    {/* Main Row */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600/50 transition"
                                        onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Time */}
                                            <div className="text-center min-w-[60px]">
                                                <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                                                    {formatTime(apt.appointment_date)}
                                                </div>
                                                <div className="text-xs text-gray-400">{apt.duration_minutes} dk</div>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-px h-10 bg-gray-200 dark:bg-slate-500" />

                                            {/* Patient Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                    {apt.patient_name}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <User size={12} /> {apt.doctor_name}
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                <StatusIcon size={12} />
                                                {status.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t dark:border-slate-600"
                                            >
                                                <div className="p-4 bg-gray-50 dark:bg-slate-600/30 space-y-3">
                                                    {apt.notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            <strong>Not:</strong> {apt.notes}
                                                        </p>
                                                    )}

                                                    {/* Quick Status Change */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {(['scheduled', 'completed', 'cancelled', 'no-show'] as const).map((s) => (
                                                            <button
                                                                key={s}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onStatusChange(apt.id, s);
                                                                }}
                                                                className={`px-2 py-1 text-xs rounded-full transition ${apt.status === s
                                                                        ? statusConfig[s].color + ' ring-2 ring-offset-1 ring-current'
                                                                        : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                                                    }`}
                                                            >
                                                                {statusConfig[s].label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEdit(apt);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border dark:border-slate-500 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition"
                                                        >
                                                            <Edit size={14} /> Düzenle
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Randevuyu silmek istediğinize emin misiniz?')) {
                                                                    onDelete(apt.id);
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                                        >
                                                            <Trash2 size={14} /> Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
