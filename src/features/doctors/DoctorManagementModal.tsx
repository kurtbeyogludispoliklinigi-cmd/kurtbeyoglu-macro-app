import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth';
import { useToast } from '@/hooks/useToast';
import { DoctorRole } from '@/lib/types';
import { motion } from 'framer-motion';
import { Users, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoctorManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DoctorManagementModal({ isOpen, onClose }: DoctorManagementModalProps) {
    const { users, currentUser, refreshDoctors } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [newDoctor, setNewDoctor] = useState<{ name: string; pin: string; role: DoctorRole }>({ name: '', pin: '', role: 'doctor' });
    const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
    const [passwordChanges, setPasswordChanges] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen && currentUser?.role === 'admin') {
            fetchPasswordChangeHistory();
        }
    }, [isOpen, currentUser]);

    const fetchPasswordChangeHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('password_change_log')
                .select('doctor_id, changed_at')
                .order('changed_at', { ascending: false });

            if (error) throw error;

            // Create a map of doctor_id to most recent change date
            const changeMap: Record<string, string> = {};
            data?.forEach(log => {
                if (!changeMap[log.doctor_id]) {
                    changeMap[log.doctor_id] = log.changed_at;
                }
            });

            setPasswordChanges(changeMap);
        } catch (error) {
            console.error('Failed to fetch password change history:', error);
        }
    };

    const handleSaveDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoctor.name || !newDoctor.pin) return;
        setLoading(true);

        try {
            if (editingDoctorId) {
                const { error } = await supabase.from('doctors').update({
                    name: newDoctor.name,
                    pin: newDoctor.pin,
                    role: newDoctor.role || 'doctor'
                }).eq('id', editingDoctorId);
                if (error) throw error;

                setEditingDoctorId(null);
                setNewDoctor({ name: '', pin: '', role: 'doctor' });
                toast({ type: 'success', message: 'Kullanıcı güncellendi!' });
                await refreshDoctors();
            } else {
                const { error } = await supabase.from('doctors').insert({
                    name: newDoctor.name,
                    role: newDoctor.role || 'doctor',
                    pin: newDoctor.pin
                });
                if (error) throw error;

                setNewDoctor({ name: '', pin: '', role: 'doctor' });
                toast({ type: 'success', message: 'Yeni kullanıcı eklendi!' });
                await refreshDoctors();
            }
        } catch (error) {
            console.error('Doctor save error:', error);
            toast({ type: 'error', message: 'Kullanıcı kaydedilemedi. İnternet bağlantınızı kontrol edin.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDoctor = async (id: string) => {
        if (!confirm('Hekimi sil?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('doctors').delete().eq('id', id);
            if (error) throw error;
            toast({ type: 'success', message: 'Hekim silindi.' });
            await refreshDoctors();
        } catch (error) {
            console.error('Doctor delete error:', error);
            toast({ type: 'error', message: 'Hekim silinemedi. İnternet veya ilişkili kayıtları kontrol edin.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white w-full h-[100dvh] md:h-auto md:max-w-lg md:rounded-xl shadow-2xl p-5 md:p-6 overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-indigo-800">Hekim Yönetimi</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSaveDoctor} className="space-y-4 bg-gray-50 p-4 rounded-lg mb-6 border">
                    <div className="text-sm font-bold text-gray-700 mb-2">{editingDoctorId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad</label>
                            <input type="text" required placeholder="Ad Soyad" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none" value={newDoctor.name} onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">PIN</label>
                            <input type="text" required placeholder="PIN" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none" value={newDoctor.pin} onChange={e => setNewDoctor({ ...newDoctor, pin: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                            <select
                                value={newDoctor.role || 'doctor'}
                                onChange={(e) => setNewDoctor({ ...newDoctor, role: e.target.value as DoctorRole })}
                                className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            >
                                <option value="doctor">HEKİM</option>
                                <option value="banko">BANKO</option>
                                <option value="asistan">ASİSTAN</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm text-base disabled:opacity-50">{loading ? '...' : (editingDoctorId ? 'Güncelle' : 'Ekle')}</button>
                        {editingDoctorId && <button type="button" onClick={() => { setEditingDoctorId(null); setNewDoctor({ name: '', pin: '', role: 'doctor' }); }} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 font-medium text-base">İptal</button>}
                    </div>
                </form>

                <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Users size={16} className="text-gray-500" /> Mevcut Hekimler
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {users.filter(u => u.role !== 'admin').length === 0 && <p className="text-sm text-gray-400 italic">Henüz kayıtlı hekim yok.</p>}
                        {users.filter(u => u.role !== 'admin').map(doctor => (
                            <div key={doctor.id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:shadow-sm transition group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">{doctor.name}</span>
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                                            doctor.role === 'doctor' ? 'bg-teal-100 text-teal-700' :
                                                doctor.role === 'banko' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-purple-100 text-purple-700'
                                        )}>
                                            {doctor.role === 'doctor' ? 'HEKİM' :
                                                doctor.role === 'banko' ? 'BANKO' :
                                                    'ASİSTAN'}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-mono tracking-wider">PIN: {doctor.pin}</span>
                                        <div className="text-xs text-gray-500">
                                            Son şifre değişikliği:{' '}
                                            {passwordChanges[doctor.id]
                                                ? new Date(passwordChanges[doctor.id]).toLocaleString('tr-TR', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'Hiç değiştirilmedi'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition">
                                    <button onClick={() => { setEditingDoctorId(doctor.id); setNewDoctor({ name: doctor.name, pin: doctor.pin, role: doctor.role }); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition" title="Düzenle">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteDoctor(doctor.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition" title="Sil">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
