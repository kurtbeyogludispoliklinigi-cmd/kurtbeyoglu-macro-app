import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { Doctor } from '@/lib/types';
import { ActionType } from '@/hooks/useActivityLogger';

interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    action_type: ActionType;
    details: Record<string, unknown>; // Safer than any
    created_at: string;
}

export function ActivityMonitor({ currentUser }: { currentUser: Doctor }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser.role === 'admin') {
            fetchLogs();
        }
    }, [currentUser]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Fetch last 100 logs
            const { data, error } = await supabase
                .from('user_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const stats = calculateStats(logs);

    if (currentUser.role !== 'admin') return null;

    if (loading) {
        return <div className="p-4 bg-white rounded-xl shadow-sm h-64 flex items-center justify-center">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="text-teal-600" size={24} />
                    <h2 className="text-lg font-bold text-slate-800">Sistem Aktivite Özeti</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-500 text-xs font-semibold uppercase">Bugünkü İşlemler</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalToday}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-500 text-xs font-semibold uppercase">Aktif Kullanıcılar</p>
                        <p className="text-2xl font-bold text-teal-600 mt-1">{stats.activeUsers}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-500 text-xs font-semibold uppercase">Son Giriş</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                            {logs.find(l => l.action_type === 'LOGIN')?.user_name || '-'}
                        </p>
                    </div>
                </div>

                <div className="h-64 w-full mb-8">
                    <h3 className="text-sm font-semibold text-slate-600 mb-4">Kullanıcı İşlem Dağılımı</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.userActions}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f1f5f9' }}
                            />
                            <Bar dataKey="actions" fill="#0e7490" radius={[4, 4, 0, 0]} name="İşlem Sayısı" barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3 ml-1">Son Aktiviteler</h3>
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="text-left py-3 px-4">Kullanıcı</th>
                                    <th className="text-left py-3 px-4">İşlem</th>
                                    <th className="text-left py-3 px-4">Zaman</th>
                                    <th className="text-left py-3 px-4">Detay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.slice(0, 10).map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-slate-700 font-medium flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                                                {log.user_name.charAt(0)}
                                            </div>
                                            {log.user_name}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action_type)}`}>
                                                {translateAction(log.action_type)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-xs">
                                            {new Date(log.created_at).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate">
                                            {JSON.stringify(log.details)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function calculateStats(logs: ActivityLog[]) {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today);
    const activeUsers = new Set(todayLogs.map(l => l.user_name)).size;

    // User Actions Count
    const userMap: Record<string, number> = {};
    logs.forEach(l => {
        userMap[l.user_name] = (userMap[l.user_name] || 0) + 1;
    });
    const userActions = Object.entries(userMap).map(([name, actions]) => ({ name, actions }));

    return {
        totalToday: todayLogs.length,
        activeUsers,
        userActions
    };
}

function getActionColor(action: ActionType) {
    switch (action) {
        case 'LOGIN': return 'bg-green-100 text-green-700';
        case 'LOGOUT': return 'bg-gray-100 text-gray-600';
        case 'CREATE_PATIENT': return 'bg-blue-100 text-blue-700';
        case 'DELETE_PATIENT': return 'bg-red-100 text-red-700';
        case 'CREATE_TREATMENT': return 'bg-purple-100 text-purple-700';
        default: return 'bg-slate-100 text-slate-600';
    }
}

function translateAction(action: ActionType) {
    const map: Record<string, string> = {
        'LOGIN': 'Giriş',
        'LOGOUT': 'Çıkış',
        'CREATE_PATIENT': 'Yeni Hasta',
        'DELETE_PATIENT': 'Hasta Silme',
        'UPDATE_PATIENT': 'Hasta Düzenleme',
        'CREATE_TREATMENT': 'Tedavi Ekleme',
        'COMPLETE_TREATMENT': 'Tedavi Tamamlandı',
        'DELETE_TREATMENT': 'Tedavi Silme',
        'CHANGE_PASSWORD': 'Şifre Değişimi',
        'ADD_PAYMENT': 'Ödeme Ekleme'
    };
    return map[action] || action;
}
