import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Doctor } from '@/lib/types';
import { useDoctors } from '@/hooks/useDoctors';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { PasswordChangeModal } from './PasswordChangeModal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    currentUser: Doctor | null;
    users: Doctor[];
    loading: boolean;
    login: (userId: string, pin: string) => Promise<boolean>;
    logout: () => Promise<void>;
    showChangePasswordModal: boolean;
    setShowChangePasswordModal: (show: boolean) => void;
    refreshDoctors: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { doctors: users, loading: doctorsLoading, refreshDoctors } = useDoctors();
    const { logActivity } = useActivityLogger();
    const { toast } = useToast();

    const [currentUser, setCurrentUser] = useState<Doctor | null>(null);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const login = async (userId: string, pin: string): Promise<boolean> => {
        const user = users.find((u: Doctor) => u.id === userId);
        if (user && user.pin === pin) {
            setAuthLoading(true);
            try {
                setCurrentUser(user);
                await logActivity(user, 'LOGIN', { role: user.role });

                // Refresh users to ensure we have latest data
                await refreshDoctors();

                return true;
            } catch (error) {
                console.error('Login error:', error);
                return false;
            } finally {
                setAuthLoading(false);
            }
        } else {
            toast({ type: 'error', message: 'Hatalı PIN!' });
            return false;
        }
    };

    const logout = async () => {
        if (currentUser) {
            await logActivity(currentUser, 'LOGOUT');
            setCurrentUser(null);
        }
    };

    const changePassword = async (currentPin: string, newPin: string): Promise<boolean> => {
        if (!currentUser) return false;

        if (currentUser.pin !== currentPin) {
            toast({ type: 'error', message: 'Mevcut PIN hatalı!' });
            return false;
        }

        setAuthLoading(true);
        try {
            const { error: updateError } = await supabase
                .from('doctors')
                .update({ pin: newPin })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            // Log password change
            await supabase.from('password_change_log').insert({
                doctor_id: currentUser.id,
                changed_by: currentUser.name,
                user_agent: navigator.userAgent
            });

            setCurrentUser({ ...currentUser, pin: newPin });
            toast({ type: 'success', message: 'Şifreniz başarıyla değiştirildi!' });
            await refreshDoctors();
            return true;
        } catch (error) {
            console.error('Password change error:', error);
            toast({ type: 'error', message: 'Şifre değiştirme hatası!' });
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    const value = {
        currentUser,
        users,
        loading: doctorsLoading || authLoading,
        login,
        logout,
        showChangePasswordModal,
        setShowChangePasswordModal,
        refreshDoctors
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showChangePasswordModal && currentUser && (
                <PasswordChangeModal
                    isOpen={showChangePasswordModal}
                    onClose={() => setShowChangePasswordModal(false)}
                    onChangePassword={changePassword}
                    loading={authLoading}
                />
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
