'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
    Users, Activity, TrendingUp, Calendar,
    Wallet, ClipboardList, Download, RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ExportButtons } from '@/components/ReportExport';
import { DailyAgenda } from './DailyAgenda';
import { QuickPaymentWidget } from './QuickPaymentWidget';
import { PaymentQuickAccess } from '@/features/payments/PaymentQuickAccess';
import { supabase } from '@/lib/supabase';
import { ActivityMonitor } from './ActivityMonitor';
import { CommandCenter } from './CommandCenter';

type DoctorRole = 'admin' | 'doctor' | 'banko' | 'asistan';
type PaymentStatus = 'pending' | 'paid' | 'partial';

interface Treatment {
    id: string;
    patient_id: string;
    tooth_no: string;
    procedure: string;
    cost: number;
    notes: string;
    created_at: string;
    added_by: string;
    payment_status?: PaymentStatus;
    payment_amount?: number;
    payment_note?: string | null;
}

interface Patient {
    id: string;
    doctor_id: string;
    doctor_name: string;
    name: string;
    phone: string;
    anamnez: string;
    updated_at: string;
    created_at?: string;
    assignment_type?: 'queue' | 'preference';
    assignment_date?: string;
}

interface Doctor {
    id: string;
    name: string;
    role: DoctorRole;
    pin: string;
}

interface DashboardProps {
    patients: Patient[];
    treatments: Treatment[];
    doctors: Doctor[];
    currentUser: Doctor;
    loading?: boolean;
    onSelectPatient?: (patientId: string) => void;
}

interface QueueData {
    id: string;
    date: string;
    queue_order: string[];
    current_index: number;
}

const COLORS = ['#0e7490', '#cca43b', '#0f172a', '#64748b']; // Cyan-700, Gold, Slate-900, Slate-500, '#8b5cf6', '#ec4899'];

// Skeleton Components
const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
            <div className="space-y-3 w-full">
                <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
        </div>
    </div>
);

const ChartSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-slate-700 animate-pulse h-full">
        <div className="w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
        <div className="flex items-end gap-4 h-[calc(100%-4rem)] px-4 pb-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
            ))}
        </div>
    </div>
);

export default function Dashboard({ patients, treatments, doctors, currentUser, loading = false }: DashboardProps) {
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [showQuickPay, setShowQuickPay] = useState(false);

    // Fetch today's queue data
    useEffect(() => {
        if (currentUser.role === 'admin') {
            fetchQueueData();
        }
    }, [currentUser]);

    const fetchQueueData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('doctor_queue')
                .select('*')
                .eq('date', today)
                .single();

            if (!error && data) {
                setQueueData(data);
            }
        } catch (err) {
            console.error('Error fetching queue data:', err);
        }
    };

    const handleResetQueue = async () => {
        if (!confirm('Günlük sırayı sıfırlamak istediğinize emin misiniz? Bu işlem sırayı başa alacaktır.')) {
            return;
        }

        setLoadingQueue(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Delete existing queue for today
            await supabase.from('doctor_queue').delete().eq('date', today);

            // Create new queue with randomized order
            const activeDoctors = doctors.filter(d => d.role === 'doctor');
            const shuffled = [...activeDoctors].sort(() => Math.random() - 0.5);
            const queueOrder = shuffled.map(d => d.id);

            const { data, error } = await supabase
                .from('doctor_queue')
                .insert({
                    date: today,
                    queue_order: queueOrder,
                    current_index: 0
                })
                .select()
                .single();

            if (error) throw error;

            setQueueData(data);
            alert('Sıra başarıyla sıfırlandı!');
        } catch (err) {
            console.error('Error resetting queue:', err);
            alert('Sıra sıfırlanırken hata oluştu.');
        } finally {
            setLoadingQueue(false);
        }
    };

    // Filter data based on role
    // ADMIN, BANKO, ASISTAN see all patients
    // HEKİM (doctor) sees only own patients
    const filteredPatients = useMemo(() => {
        if (currentUser.role === 'admin' || currentUser.role === 'banko' || currentUser.role === 'asistan') {
            return patients;
        }
        return patients.filter(p => p.doctor_id === currentUser.id);
    }, [patients, currentUser]);

    // Helper function to check if date is today
    const isToday = (dateStr: string | undefined): boolean => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Calculate today's doctor distribution statistics
    const todayDoctorStats = useMemo(() => {
        const stats: Record<string, { queue: number; preference: number; total: number; doctorName: string }> = {};

        // Initialize stats for all doctors
        doctors.filter(d => d.role === 'doctor').forEach(doc => {
            stats[doc.id] = { queue: 0, preference: 0, total: 0, doctorName: doc.name };
        });

        // Count patients added today
        patients.forEach(p => {
            if (isToday(p.created_at || p.assignment_date)) {
                if (stats[p.doctor_id]) {
                    stats[p.doctor_id].total++;
                    if (p.assignment_type === 'queue') {
                        stats[p.doctor_id].queue++;
                    } else {
                        stats[p.doctor_id].preference++;
                    }
                }
            }
        });

        return Object.entries(stats).map(([id, data]) => ({
            doctorId: id,
            ...data
        }));
    }, [patients, doctors]);

    const filteredTreatments = useMemo(() => {
        const patientIds = new Set(filteredPatients.map(p => p.id));
        return treatments.filter(t => patientIds.has(t.patient_id));
    }, [treatments, filteredPatients]);

    // Calculate statistics
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const todayStr = now.toDateString();

        // Start of week (Monday)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        if (day !== 1) startOfWeek.setDate(now.getDate() - (day - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const monthlyTreatments = filteredTreatments.filter(t => {
            const date = new Date(t.created_at);
            return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        const weeklyTreatments = filteredTreatments.filter(t => {
            const date = new Date(t.created_at);
            return date >= startOfWeek;
        });

        const todayTreatments = filteredTreatments.filter(t => {
            const date = new Date(t.created_at);
            return date.toDateString() === todayStr;
        });

        const totalRevenue = filteredTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
        const monthlyRevenue = monthlyTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
        const weeklyRevenue = weeklyTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
        const todayRevenue = todayTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);

        const pendingAmount = filteredTreatments.reduce((sum, t) => {
            if (t.payment_status === 'paid') return sum;
            const cost = t.cost || 0;
            const paid = t.payment_amount || 0;
            return sum + (cost - paid);
        }, 0);

        return {
            totalPatients: filteredPatients.length,
            totalTreatments: filteredTreatments.length,
            monthlyTreatments: monthlyTreatments.length,
            totalRevenue,
            monthlyRevenue,
            weeklyRevenue,
            todayRevenue,
            pendingAmount
        };
    }, [filteredPatients, filteredTreatments]);

    // Revenue by month (last 6 months)
    const monthlyData = useMemo(() => {
        const months: Record<string, number> = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = date.toLocaleDateString('tr-TR', { month: 'short' });
            months[key] = 0;
        }

        filteredTreatments.forEach(t => {
            const date = new Date(t.created_at);
            const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
            if (monthsDiff >= 0 && monthsDiff < 6) {
                const key = date.toLocaleDateString('tr-TR', { month: 'short' });
                if (key in months) {
                    months[key] += t.cost || 0;
                }
            }
        });

        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [filteredTreatments]);

    // Procedures breakdown
    const procedureData = useMemo(() => {
        const procedures: Record<string, number> = {};
        filteredTreatments.forEach(t => {
            const proc = t.procedure || 'Diğer';
            procedures[proc] = (procedures[proc] || 0) + 1;
        });

        return Object.entries(procedures)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
    }, [filteredTreatments]);

    // Doctor performance (admin only)
    const doctorPerformance = useMemo(() => {
        if (currentUser.role !== 'admin') return [];

        const performance: Record<string, { name: string; patients: number; revenue: number }> = {};

        doctors.filter(d => d.role !== 'admin').forEach(d => {
            performance[d.id] = { name: d.name, patients: 0, revenue: 0 };
        });

        patients.forEach(p => {
            if (performance[p.doctor_id]) {
                performance[p.doctor_id].patients++;
            }
        });

        treatments.forEach(t => {
            const patient = patients.find(p => p.id === t.patient_id);
            if (patient && performance[patient.doctor_id]) {
                performance[patient.doctor_id].revenue += t.cost || 0;
            }
        });

        return Object.values(performance);
    }, [currentUser, doctors, patients, treatments]);

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
                </div>

                {/* Queue/Admin Table Skeleton */}
                {currentUser.role === 'admin' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 animate-pulse">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded"></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Charts Skeleton */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 h-64 animate-pulse">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
                    <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    {currentUser.role === 'admin' && <ChartSkeleton />}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <StatCard
                    icon={Activity}
                    title="Bugün Ciro"
                    value={`${stats.todayRevenue.toLocaleString('tr-TR')} ₺`}
                    subValue={`${new Date().toLocaleDateString('tr-TR', { weekday: 'long' })}`}
                />
                <StatCard
                    icon={TrendingUp}
                    title="Bu Hafta"
                    value={`${stats.weeklyRevenue.toLocaleString('tr-TR')} ₺`}
                />
                <StatCard
                    icon={Wallet}
                    title="Bu Ay"
                    value={`${stats.monthlyRevenue.toLocaleString('tr-TR')} ₺`}
                />
                <StatCard
                    icon={RotateCcw}
                    title="Bekleyen Alacak"
                    value={`${stats.pendingAmount.toLocaleString('tr-TR')} ₺`}
                    subValue="Tahsil edilecek"
                    color="text-red-500"
                />

                {/* Secondary Stats Row */}
                <StatCard
                    icon={Users}
                    title="Toplam Hasta"
                    value={stats.totalPatients}
                />
                <StatCard
                    icon={ClipboardList}
                    title="Toplam İşlem"
                    value={stats.totalTreatments}
                />
                <StatCard
                    icon={Calendar}
                    title="Bu Ay İşlem"
                    value={stats.monthlyTreatments}
                />
                <StatCard
                    icon={Wallet}
                    title="Toplam Ciro"
                    value={`${stats.totalRevenue.toLocaleString('tr-TR')} ₺`}
                />
            </motion.div>

            {/* Daily Agenda & Quick Actions Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-full">
                    <DailyAgenda currentUser={currentUser} />
                </div>
                <div className="lg:col-span-1 h-full">
                    <QuickPaymentWidget
                        currentUser={currentUser}
                        onOpen={() => setShowQuickPay(true)}
                        totalPending={stats.pendingAmount}
                    />
                </div>
            </div>

            {/* Daily Doctor Distribution - Admin Only */}
            {currentUser.role === 'admin' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Users size={20} className="text-indigo-500" />
                            Bugünün Hekim Dağılımı
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date().toLocaleDateString('tr-TR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-600">
                                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Hekim</th>
                                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Sıradan</th>
                                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Referanslı</th>
                                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Toplam</th>
                                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Dağılım</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayDoctorStats.map((stat, idx) => {
                                    const maxTotal = Math.max(...todayDoctorStats.map(s => s.total), 1);
                                    const queuePercent = stat.total > 0 ? (stat.queue / stat.total) * 100 : 0;
                                    const prefPercent = stat.total > 0 ? (stat.preference / stat.total) * 100 : 0;

                                    return (
                                        <tr key={stat.doctorId} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                    />
                                                    <span className="font-medium text-gray-800 dark:text-gray-100">
                                                        {stat.doctorName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center py-4 px-2">
                                                <span className="inline-flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold px-3 py-1 rounded-full text-sm min-w-[40px]">
                                                    {stat.queue}
                                                </span>
                                            </td>
                                            <td className="text-center py-4 px-2">
                                                <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold px-3 py-1 rounded-full text-sm min-w-[40px]">
                                                    {stat.preference}
                                                </span>
                                            </td>
                                            <td className="text-center py-4 px-2">
                                                <span className="inline-flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold px-4 py-1.5 rounded-full text-base min-w-[50px]">
                                                    {stat.total}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-8 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                                        {stat.total > 0 ? (
                                                            <>
                                                                <div
                                                                    className="absolute left-0 top-0 h-full bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                                                                    style={{ width: `${queuePercent}%` }}
                                                                />
                                                                <div
                                                                    className="absolute top-0 h-full bg-blue-400 dark:bg-blue-500 transition-all duration-300"
                                                                    style={{
                                                                        left: `${queuePercent}%`,
                                                                        width: `${prefPercent}%`
                                                                    }}
                                                                />
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">
                                                                Hasta yok
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[45px] text-right">
                                                        {((stat.total / maxTotal) * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-400 dark:bg-amber-500 rounded"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Sıradan Hasta</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-400 dark:bg-blue-500 rounded"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Referanslı Hasta</span>
                        </div>
                    </div>

                    {/* Queue Status and Reset */}
                    {queueData && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                                        <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Şu An Sırada
                                        </p>
                                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                            {(() => {
                                                const currentDoctorId = queueData.queue_order[queueData.current_index];
                                                const currentDoctor = doctors.find(d => d.id === currentDoctorId);
                                                return currentDoctor ? currentDoctor.name : 'Bilinmiyor';
                                            })()}
                                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                                ({queueData.current_index + 1}/{queueData.queue_order.length})
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetQueue}
                                    disabled={loadingQueue}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw size={16} className={loadingQueue ? 'animate-spin' : ''} />
                                    {loadingQueue ? 'Sıfırlanıyor...' : 'Sırayı Sıfırla'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Monthly Revenue Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-teal-500" />
                    Aylık Gelir Grafiği
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="name"
                                stroke="#9ca3af"
                                tick={{ fill: '#6b7280' }}
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                tick={{ fill: '#6b7280' }}
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ₺`, 'Gelir']}
                                contentStyle={{
                                    backgroundColor: 'var(--card-bg, #fff)',
                                    borderColor: 'var(--card-border, #e5e7eb)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#0d9488"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Procedure Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-purple-500" />
                        En Çok Yapılan İşlemler
                    </h3>
                    {procedureData.length > 0 ? (
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={procedureData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        fill="#8884d8"
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                        labelLine={false}
                                    >
                                        {procedureData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">
                            Henüz işlem kaydı yok
                        </div>
                    )}
                </div>

                {/* Doctor Performance (Admin Only) */}
                {currentUser.role === 'admin' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-indigo-500" />
                            Hekim Performansı
                        </h3>
                        {doctorPerformance.length > 0 ? (
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={doctorPerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            type="number"
                                            stroke="#9ca3af"
                                            tick={{ fill: '#6b7280' }}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            stroke="#9ca3af"
                                            tick={{ fill: '#6b7280' }}
                                            width={80}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                name === 'revenue' ? `${value.toLocaleString('tr-TR')} ₺` : value,
                                                name === 'revenue' ? 'Ciro' : 'Hasta'
                                            ]}
                                            contentStyle={{
                                                backgroundColor: 'var(--card-bg, #fff)',
                                                borderColor: 'var(--card-border, #e5e7eb)',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">
                                Henüz hekim kaydı yok
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Admin Activity Monitor */}
            {currentUser.role === 'admin' && (
                <ActivityMonitor currentUser={currentUser} />
            )}

            {/* Monthly Revenue Card */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl p-4 md:p-6 text-white shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold opacity-90">Bu Ay Toplam Gelir</h3>
                        <p className="text-4xl font-bold mt-2">
                            {stats.monthlyRevenue.toLocaleString('tr-TR')} ₺
                        </p>
                        <p className="text-sm opacity-80 mt-1">
                            {stats.monthlyTreatments} işlem yapıldı
                        </p>
                    </div>
                    <Download size={32} className="opacity-50" />
                </div>
            </div>

            {/* Export Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Download size={20} className="text-gray-500" />
                    Rapor İndir
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Tüm verileri PDF veya CSV formatında indirin.
                </p>
                <ExportButtons treatments={filteredTreatments} patients={filteredPatients} type="income" />
            </div>

            <PaymentQuickAccess
                isOpen={showQuickPay}
                onClose={() => setShowQuickPay(false)}
                treatments={treatments}
                patients={patients}
                onSuccess={() => {
                    setShowQuickPay(false);
                }}
            />

        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subValue?: string;
    color?: string;
}

function StatCard({ icon: Icon, title, value, subValue, color }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0e7490] to-[#cca43b] opacity-80" />
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
                    <h3 className={`text-2xl font-bold mt-1 ${color ? color : 'text-slate-800 dark:text-gray-100'}`}>{value}</h3>
                    {subValue && <p className="text-xs text-[#cca43b] font-medium mt-1">{subValue}</p>}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-[#0e7490]/5 transition-colors">
                    <Icon className="text-[#0e7490]" size={24} />
                </div>
            </div>
        </div>
    );
}
