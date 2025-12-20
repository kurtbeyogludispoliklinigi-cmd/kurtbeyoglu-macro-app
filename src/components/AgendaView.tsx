'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Plus } from 'lucide-react';
import type { Appointment } from '@/hooks/useAppointments';

interface AgendaViewProps {
    appointments: Appointment[];
    onEdit: (appointment: Appointment) => void;
    onStatusChange: (id: string, status: Appointment['status']) => void;
    onAddNew: (date?: Date) => void;
    selectedDate: Date; // Need date to construct full date for new appointments
}

const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 120; // Increased Height for better visibility
const TOTAL_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR;

export function AgendaView({ appointments, onEdit, onStatusChange, onAddNew, selectedDate }: AgendaViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);

    // Calculate position for current time indicator
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            // Only show if today
            if (now.getDate() === selectedDate.getDate() &&
                now.getMonth() === selectedDate.getMonth() &&
                now.getFullYear() === selectedDate.getFullYear()) {

                const hour = now.getHours();
                const minutes = now.getMinutes();

                if (hour >= START_HOUR && hour < END_HOUR) {
                    const pixelsFromStart = (hour - START_HOUR) * PIXELS_PER_HOUR;
                    const minutePixels = (minutes / 60) * PIXELS_PER_HOUR;
                    setCurrentTimeTop(pixelsFromStart + minutePixels);
                } else {
                    setCurrentTimeTop(null);
                }
            } else {
                setCurrentTimeTop(null);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [selectedDate]);

    // Scroll to current time or start of day on mount
    useEffect(() => {
        if (containerRef.current) {
            if (currentTimeTop) {
                containerRef.current.scrollTop = Math.max(0, currentTimeTop - 200); // Center slightly
            } else {
                containerRef.current.scrollTop = 0;
            }
        }
    }, [currentTimeTop]); // Only scroll on initial calculation or significant change? Maybe just on mount/date change.

    const getAppointmentStyle = (apt: Appointment) => {
        const date = new Date(apt.appointment_date);
        const hour = date.getHours();
        const minutes = date.getMinutes();

        // Skip if outside range
        if (hour < START_HOUR || hour >= END_HOUR) return null;

        const startPixels = ((hour - START_HOUR) * PIXELS_PER_HOUR) + ((minutes / 60) * PIXELS_PER_HOUR);
        const heightPixels = (apt.duration_minutes / 60) * PIXELS_PER_HOUR;

        // Status Colors
        let bgColor = 'bg-blue-100 dark:bg-blue-900/40';
        let borderColor = 'border-blue-300 dark:border-blue-700';
        let textColor = 'text-blue-900 dark:text-blue-100';

        switch (apt.status) {
            case 'completed':
                bgColor = 'bg-green-100 dark:bg-green-900/40';
                borderColor = 'border-green-300 dark:border-green-700';
                textColor = 'text-green-900 dark:text-green-100';
                break;
            case 'in-progress':
                bgColor = 'bg-orange-100 dark:bg-orange-900/40';
                borderColor = 'border-orange-300 dark:border-orange-700 animate-pulse';
                textColor = 'text-orange-900 dark:text-orange-100';
                break;
            case 'cancelled':
                bgColor = 'bg-red-100 dark:bg-red-900/40';
                borderColor = 'border-red-300 dark:border-red-700';
                textColor = 'text-red-900 dark:text-red-100';
                break;
            case 'no-show':
                bgColor = 'bg-amber-100 dark:bg-amber-900/40';
                borderColor = 'border-amber-300 dark:border-amber-700';
                textColor = 'text-amber-900 dark:text-amber-100';
                break;
        }

        // Overdue check
        if (apt.status === 'scheduled' && new Date(apt.appointment_date) < new Date()) {
            bgColor = 'bg-gray-100 dark:bg-slate-700';
            borderColor = 'border-gray-300 dark:border-gray-500';
            textColor = 'text-gray-600 dark:text-gray-300';
        }

        return {
            top: `${startPixels}px`,
            height: `${Math.max(heightPixels, 30)}px`, // Minimum 30px height
            position: 'absolute' as const,
            left: '60px', // Space for time labels
            right: '10px',
            className: `${bgColor} border-l-4 ${borderColor} ${textColor} rounded-r-md shadow-sm text-xs p-2 overflow-hidden cursor-pointer hover:shadow-md transition-all`
        };
    };

    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;
        const relativeY = e.clientY - rect.top + scrollTop;

        // Calculate time from pixels
        const totalMinutes = (relativeY / PIXELS_PER_HOUR) * 60;
        const hour = Math.floor(totalMinutes / 60) + START_HOUR;
        const minutes = Math.floor(totalMinutes % 60);

        // Round to nearest 15 mins
        const roundedMinutes = Math.round(minutes / 15) * 15;

        const newDate = new Date(selectedDate);
        newDate.setHours(hour, roundedMinutes, 0, 0);

        onAddNew(newDate);
    };

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-inner relative select-none"
        >
            <div style={{ height: `${TOTAL_HEIGHT}px` }} className="relative min-h-full">
                {/* Background Grid & Click Area */}
                <div
                    className="absolute inset-0 z-0 cursor-crosshair"
                    onClick={handleBackgroundClick}
                >
                    {/* Hour Lines */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                        const hour = START_HOUR + i;
                        return (
                            <div
                                key={hour}
                                style={{ top: `${i * PIXELS_PER_HOUR}px`, height: `${PIXELS_PER_HOUR}px` }}
                                className="border-b border-gray-100 dark:border-slate-700 box-border relative group"
                            >
                                {/* Time Label */}
                                <div className="absolute left-2 top-0 text-xs font-semibold text-gray-400">
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                                {/* Half-hour dashed line */}
                                <div className="absolute top-1/2 left-14 right-0 border-t border-dashed border-gray-50 dark:border-slate-700/50"></div>

                                {/* Hover Hint */}
                                <div className="hidden group-hover:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-50/10 pointer-events-none">
                                    <span className="bg-teal-600 text-white text-[10px] px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                        <Plus size={10} /> Randevu Ekle
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Current Time Indicator */}
                {currentTimeTop !== null && (
                    <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                        style={{ top: `${currentTimeTop}px` }}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                        <div className="text-[10px] bg-red-500 text-white px-1 rounded ml-1 font-bold">
                            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                )}

                {/* Appointments */}
                <AnimatePresence>
                    {appointments.map(apt => {
                        const style = getAppointmentStyle(apt);
                        if (!style) return null;
                        const { className, ...styleProps } = style;

                        return (
                            <motion.div
                                key={apt.id}
                                {...styleProps}
                                className={className}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={(e) => { e.stopPropagation(); onEdit(apt); }}
                            >
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold truncate pr-1">{apt.patient_name}</span>
                                            {/* Status Badge & Actions */}
                                            <div className="flex items-center gap-1">
                                                {apt.status === 'scheduled' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onStatusChange(apt.id, 'in-progress');
                                                            // Also trigger timestamp update in parent if possible or assume onStatusChange handles it
                                                        }}
                                                        className="bg-blue-100 hover:bg-blue-200 p-0.5 rounded text-blue-700 transition"
                                                        title="Başlat"
                                                    >
                                                        ▶
                                                    </button>
                                                )}
                                                {apt.status === 'in-progress' && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] bg-white/50 px-1 rounded animate-pulse">
                                                            ⏱️
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onStatusChange(apt.id, 'completed');
                                                            }}
                                                            className="bg-green-100 hover:bg-green-200 p-0.5 rounded text-green-700 transition font-bold"
                                                            title="Tamamla"
                                                        >
                                                            ✓
                                                        </button>
                                                    </div>
                                                )}
                                                {apt.status === 'completed' && (
                                                    <span className="text-green-600 text-[10px]">✓</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[10px] opacity-90 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(apt.appointment_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            ({apt.duration_minutes}dk)
                                        </div>
                                        {/* Show Actual Duration if completed */}
                                        {apt.status === 'completed' && apt.actual_start_time && apt.actual_end_time && (
                                            <div className="text-[9px] text-green-700 font-semibold">
                                                Gerçek: {Math.round((new Date(apt.actual_end_time).getTime() - new Date(apt.actual_start_time).getTime()) / 60000)}dk
                                            </div>
                                        )}
                                    </div>
                                    {apt.notes && (
                                        <div className="text-[10px] opacity-75 truncate italic border-t border-black/5 pt-0.5 mt-0.5">
                                            {apt.notes}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
