'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { Doctor } from '@/lib/types';

interface LoginFormProps {
    users: Doctor[];
    loading: boolean;
    onLogin: (userId: string, pin: string) => Promise<boolean>;
}

export function LoginForm({ users, loading, onLogin }: LoginFormProps) {
    const [selectedLoginUser, setSelectedLoginUser] = useState('');
    const [loginPin, setLoginPin] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onLogin(selectedLoginUser, loginPin);
        if (success) {
            setLoginPin('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f172a]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0e7490] rounded-full blur-3xl opacity-10 pointer-events-none" />

            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-slate-100">
                {loading && (
                    <div className="absolute top-6 right-6">
                        <div className="w-5 h-5 border-2 border-[#0e7490] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-100 p-2">
                        <img src="/logo.png" alt="Özel Kurtbeyoğlu Ağız ve Diş Sağlığı Polikliniği" className="h-24 w-auto mx-auto drop-shadow-lg" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-2">
                        Özel Kurtbeyoğlu<br />Ağız ve Diş Sağlığı Polikliniği
                    </h1>
                    <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">
                        Hasta Takip ve Randevu Sistemi
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Kullanıcı Seçin
                        </label>
                        <div className="relative">
                            <select
                                className="w-full p-4 pl-4 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-[#0e7490]/20 focus:border-[#0e7490] outline-none text-slate-900 font-medium appearance-none transition-all shadow-sm"
                                value={selectedLoginUser}
                                onChange={(e) => setSelectedLoginUser(e.target.value)}
                                required
                                disabled={loading}
                            >
                                <option value="" className="text-gray-400">Seçiniz...</option>
                                {users.map(u => (
                                    <option
                                        key={u.id}
                                        value={u.id}
                                        className="text-gray-900 font-medium py-2"
                                    >
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                <User size={18} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Giriş Şifresi (PIN)
                        </label>
                        <input
                            type="password"
                            className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-[#0e7490]/20 focus:border-[#0e7490] outline-none text-center tracking-[0.5em] text-xl font-bold text-slate-900 shadow-sm transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                            placeholder="PIN"
                            value={loginPin}
                            onChange={(e) => setLoginPin(e.target.value)}
                            maxLength={6}
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="touch-target w-full bg-[#0e7490] text-white py-4 rounded-xl font-bold hover:bg-[#155e75] transition-all shadow-lg hover:shadow-[#0e7490]/25 disabled:opacity-70 disabled:cursor-not-allowed mt-4 active:scale-[0.98]"
                    >
                        {loading ? 'Yükleniyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Güvenli ve Modern Diş Hekimliği</p>
                </div>
            </div>
        </div>
    );
}
