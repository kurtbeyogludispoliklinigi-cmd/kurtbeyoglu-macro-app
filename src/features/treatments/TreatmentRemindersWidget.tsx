import React, { useState, useMemo } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Treatment, Patient, Doctor } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TreatmentRemindersWidgetProps {
    treatments: Treatment[];
    patients: Patient[];
    currentUser: Doctor;
}

type TabType = 'upcoming' | 'overdue';

export function TreatmentRemindersWidget({ treatments, patients, currentUser }: TreatmentRemindersWidgetProps) {
    const [activeTab, setActiveTab] = useState<TabType>('upcoming');

    const reminders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        // Filter for planned treatments that have a date
        const planned = treatments.filter(t =>
            t.status === 'planned' &&
            t.planned_date
        );

        const upcoming: any[] = [];
        const overdue: any[] = [];

        planned.forEach(t => {
            if (!t.planned_date) return;
            const planDate = new Date(t.planned_date);
            // reset time for logic comparison
            const compareDate = new Date(planDate);
            compareDate.setHours(0, 0, 0, 0);

            // Find patient
            const patient = patients.find(p => p.id === t.patient_id);
            if (!patient) return;

            // If current user is a doctor (not admin/banko), filter by their patients
            if (currentUser.role === 'doctor' && patient.doctor_id !== currentUser.id) {
                return;
            }

            const item = {
                ...t,
                patientName: patient.name,
                patientPhone: patient.phone,
                dateObj: planDate
            };

            if (compareDate < today) {
                overdue.push(item);
            } else if (compareDate >= today && compareDate <= nextWeek) {
                upcoming.push(item);
            }
        });

        // Sort by date: Upcoming (soonest first), Overdue (most overdue first - or soonest? let's do oldest overdue at top?)
        // Usually urgency means old overdue first.
        upcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        overdue.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        return { upcoming, overdue };
    }, [treatments, patients, currentUser]);

    const activeList = reminders[activeTab];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Tedavi Hatırlatıcıları
                </h3>
                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            activeTab === 'upcoming'
                                ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                        )}
                    >
                        Yaklaşan ({reminders.upcoming.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            activeTab === 'overdue'
                                ? "bg-white dark:bg-slate-600 text-red-600 dark:text-red-300 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                        )}
                    >
                        Gecikmiş ({reminders.overdue.length})
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {activeList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                        <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">
                            {activeTab === 'upcoming' ? 'Yaklaşan planlı tedavi yok.' : 'Gecikmiş tedavi bulunmuyor.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {activeList.map((item) => (
                            <div
                                key={item.id}
                                className="p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate max-w-[180px]">
                                        {item.patientName}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                                        activeTab === 'overdue'
                                            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                                    )}>
                                        {new Date(item.planned_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="truncate">{item.procedure}</span>
                                </div>
                                {item.notes && (
                                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">
                                        "{item.notes}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
