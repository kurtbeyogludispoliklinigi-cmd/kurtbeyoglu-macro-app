import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Doctor } from '@/lib/types';
import { useAppointments } from '@/hooks/useAppointments';
import { hasPermission } from '@/lib/permissions';

interface DailyAgendaProps {
    currentUser: Doctor;
}

export function DailyAgenda({ currentUser }: DailyAgendaProps) {
    const today = new Date();

    // Admin/Banko sees all, Doctor sees their own
    const doctorId = hasPermission.viewAllPatients(currentUser.role) ? undefined : currentUser.id;

    const { appointments, loading, error } = useAppointments({
        doctorId,
        date: today
    });

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-indigo-500" size={20} />
                    <h3 className="font-bold text-gray-800 dark:text-white">Günlük Ajanda</h3>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col items-center justify-center text-red-500 gap-2">
                <AlertCircle size={24} />
                <p>Randevular yüklenemedi</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                </div>
                <span className="text-sm text-slate-500 font-medium">
                    {format(today, 'd MMMM EEEE', { locale: tr })}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[300px] max-h-[400px]">
                {appointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[200px]">
                        <Calendar size={32} className="opacity-20" />
                        <p>Bugün için planlanmış randevu yok.</p>
                    </div>
                ) : (
                    appointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="group p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors flex items-start gap-3"
                        >
                            <div className="flex flex-col items-center min-w-[3.5rem] bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                    {format(new Date(apt.appointment_date), 'HH:mm')}
                                </span>
                                <span className="text-[10px] text-indigo-400 dark:text-indigo-300/70 font-medium">
                                    {apt.duration_minutes} dk
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                    {apt.patient_name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            apt.status === 'in-progress' ? 'bg-amber-100 text-amber-700 animate-pulse border border-amber-200' :
                                                apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    apt.status === 'no-show' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                        }`}>
                                        {
                                            apt.status === 'completed' ? 'Tamamlandı' :
                                                apt.status === 'in-progress' ? 'Devam Ediyor' :
                                                    apt.status === 'cancelled' ? 'İptal' :
                                                        apt.status === 'no-show' ? 'Gelmedi' : 'Planlı'
                                        }
                                    </span>
                                    {apt.doctor_name && (
                                        <span className="truncate opacity-75">• {apt.doctor_name}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
