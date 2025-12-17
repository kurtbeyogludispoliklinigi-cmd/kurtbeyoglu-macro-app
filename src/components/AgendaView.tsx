'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User } from 'lucide-react';
import type { Appointment } from '@/hooks/useAppointments';

interface AgendaViewProps {
    appointments: Appointment[];
    onEdit: (appointment: Appointment) => void;
    onStatusChange: (id: string, status: Appointment['status']) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

export function AgendaView({ appointments, onEdit, onStatusChange }: AgendaViewProps) {

    // Helper to get appointment style
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300';
            case 'cancelled': return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300';
            case 'no-show': return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300';
            default: // scheduled
                // Check if overdue? We handle that in logic, but styling is blue for future
                return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300';
        }
    };

    // Group appointments by hour for easier rendering
    const getAppointmentsForHour = (hour: number) => {
        return appointments.filter(apt => {
            const date = new Date(apt.appointment_date);
            return date.getHours() === hour;
        }).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-900 p-3 border-b dark:border-slate-700 text-center font-medium text-gray-500 text-sm">
                Günlük Akış
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {HOURS.map(hour => {
                    const hourApts = getAppointmentsForHour(hour);
                    const isPast = new Date().getHours() > hour;

                    return (
                        <div key={hour} className="flex group min-h-[80px] border-b border-dashed border-gray-200 dark:border-slate-700 last:border-0 relative">
                            {/* Time Column */}
                            <div className="w-16 p-2 text-right border-r border-gray-100 dark:border-slate-700 font-medium text-gray-400 text-sm sticky left-0 bg-white dark:bg-slate-800 z-10">
                                {String(hour).padStart(2, '0')}:00
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 p-1 relative ml-2 space-y-1">
                                {/* Empty Slot Click Area (Could be used to add new appointment) */}
                                <div className="absolute inset-0 z-0 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors rounded-lg pointer-events-none group-hover:pointer-events-auto" />

                                {hourApts.map(apt => {
                                    const statusStyle = getStatusStyle(apt.status);
                                    // Check for overdue (scheduled but in past)
                                    const isOverdue = apt.status === 'scheduled' && new Date(apt.appointment_date) < new Date();
                                    const finalStyle = isOverdue
                                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900'
                                        : statusStyle;

                                    const timeString = new Date(apt.appointment_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <motion.div
                                            key={apt.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => onEdit(apt)}
                                            className={`relative z-10 p-2 rounded-lg border text-sm cursor-pointer hover:shadow-md transition flex justify-between items-start gap-2 ${finalStyle}`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <span className="opacity-75 font-mono text-xs">{timeString}</span>
                                                    <span className="truncate">{apt.patient_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                                    <User size={10} /> {apt.doctor_name}
                                                    {apt.duration_minutes && <span>• {apt.duration_minutes}dk</span>}
                                                </div>
                                                {apt.notes && (
                                                    <div className="text-[10px] opacity-70 truncate mt-1 italic">
                                                        {apt.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick Status Indicator */}
                                            <div className="flex flex-col gap-1">
                                                {apt.status === 'scheduled' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, 'completed'); }}
                                                        className="p-1 hover:bg-black/10 rounded text-current"
                                                        title="Tamamla"
                                                    >
                                                        ✅
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
