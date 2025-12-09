'use client';

import { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
    Users, Activity, TrendingUp, Calendar,
    Wallet, ClipboardList, Download
} from 'lucide-react';
import { ExportButtons } from './ReportExport';

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
}

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard({ patients, treatments, doctors, currentUser }: DashboardProps) {
    // Filter data based on role
    // ADMIN, BANKO, ASISTAN see all patients
    // HEKİM (doctor) sees only own patients
    const filteredPatients = useMemo(() => {
        if (currentUser.role === 'admin' || currentUser.role === 'banko' || currentUser.role === 'asistan') {
            return patients;
        }
        return patients.filter(p => p.doctor_id === currentUser.id);
    }, [patients, currentUser]);

    const filteredTreatments = useMemo(() => {
        const patientIds = new Set(filteredPatients.map(p => p.id));
        return treatments.filter(t => patientIds.has(t.patient_id));
    }, [treatments, filteredPatients]);

    // Calculate statistics
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const monthlyTreatments = filteredTreatments.filter(t => {
            const date = new Date(t.created_at);
            return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        const totalRevenue = filteredTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
        const monthlyRevenue = monthlyTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);

        return {
            totalPatients: filteredPatients.length,
            totalTreatments: filteredTreatments.length,
            monthlyTreatments: monthlyTreatments.length,
            totalRevenue,
            monthlyRevenue,
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

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Toplam Hasta"
                    value={stats.totalPatients}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={ClipboardList}
                    label="Toplam İşlem"
                    value={stats.totalTreatments}
                    color="bg-teal-500"
                />
                <StatCard
                    icon={Calendar}
                    label="Bu Ay İşlem"
                    value={stats.monthlyTreatments}
                    color="bg-purple-500"
                />
                <StatCard
                    icon={Wallet}
                    label="Toplam Ciro"
                    value={`${stats.totalRevenue.toLocaleString('tr-TR')} ₺`}
                    color="bg-emerald-500"
                />
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-teal-500" />
                    Aylık Gelir Grafiği
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
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
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-purple-500" />
                        En Çok Yapılan İşlemler
                    </h3>
                    {procedureData.length > 0 ? (
                        <div className="h-48">
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-indigo-500" />
                            Hekim Performansı
                        </h3>
                        {doctorPerformance.length > 0 ? (
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={doctorPerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis type="number" stroke="#6b7280" />
                                        <YAxis dataKey="name" type="category" stroke="#6b7280" width={80} />
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

            {/* Monthly Revenue Card */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Download size={20} className="text-gray-500" />
                    Rapor İndir
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Tüm verileri PDF veya CSV formatında indirin.
                </p>
                <ExportButtons treatments={filteredTreatments} patients={filteredPatients} type="income" />
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
                <div className={`${color} p-2 rounded-lg text-white`}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                </div>
            </div>
        </div>
    );
}
