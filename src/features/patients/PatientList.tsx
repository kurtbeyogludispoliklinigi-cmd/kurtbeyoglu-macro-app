import React from 'react';
import { Phone } from 'lucide-react';
import { Patient, Doctor, Treatment } from '@/lib/types';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';

import { getPatientStatus } from './utils';

interface PatientWithTreatments extends Patient {
    treatments?: Treatment[];
}

interface PatientListProps {
    patients: PatientWithTreatments[];
    selectedPatientId: string | null;
    onSelectPatient: (id: string) => void;
    currentUser: Doctor;
}

export function PatientList({
    patients,
    selectedPatientId,
    onSelectPatient,
    currentUser
}: PatientListProps) {
    if (patients.length === 0) {
        return (
            <div className="text-center p-8 text-gray-400">
                <p>Kayıt bulunamadı.</p>
            </div>
        );
    }

    return (
        <ul>
            {patients.map(p => {
                const status = getPatientStatus(p);

                return (
                    <li
                        key={p.id}
                        onClick={() => onSelectPatient(p.id)}
                        className={cn(
                            "p-4 border-b cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 transition relative",
                            selectedPatientId === p.id && 'bg-teal-50 dark:bg-slate-700 border-l-4 border-l-teal-600',
                            // Status Border (if not selected, showing status color)
                            selectedPatientId !== p.id && status === 'debt' && 'border-l-4 border-l-red-500',
                            selectedPatientId !== p.id && status === 'planned' && 'border-l-4 border-l-blue-500',
                            selectedPatientId !== p.id && status === 'active' && 'border-l-4 border-l-transparent'
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</h3>
                                    {/* Mobile Status Badge (Visible on desktop too for clarity) */}
                                    {status === 'debt' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                            Borçlu
                                        </span>
                                    )}
                                    {status === 'planned' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            Planlı
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <Phone size={12} /> {formatPhoneNumber(p.phone || '') || 'Tel yok'}
                                </p>
                                {hasPermission.viewAllPatients(currentUser.role) && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                            Hekim: {p.doctor_name || 'Bilinmiyor'}
                                        </span>
                                        {p.assignment_type && (
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                p.assignment_type === 'queue'
                                                    ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                                    : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                            )}>
                                                {p.assignment_type === 'queue' ? '🔄 Sıralı' : '⭐ Tercihli'}
                                            </span>
                                        )}
                                        {p.assignment_date && (
                                            <span className="text-[10px] bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                📅 {new Date(p.assignment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                {p.updated_at && (
                                    <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full">
                                        {new Date(p.updated_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
