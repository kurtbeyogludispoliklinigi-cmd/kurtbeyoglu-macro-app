import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Doctor } from '@/lib/types';

export type ActionType =
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE_PATIENT'
    | 'UPDATE_PATIENT'
    | 'DELETE_PATIENT'
    | 'CREATE_TREATMENT'
    | 'COMPLETE_TREATMENT'
    | 'DELETE_TREATMENT'
    | 'ADD_PAYMENT'
    | 'CHANGE_PASSWORD';

export function useActivityLogger() {

    const logActivity = useCallback(async (
        user: Doctor | null,
        action: ActionType,
        details: Record<string, unknown> = {}
    ) => {
        if (!user) {
            console.warn('Attempted to log activity without user');
            return; // Or log as 'system'/'guest' if needed, but for now strict user tracking
        }

        try {
            const { error } = await supabase.from('user_activity_logs').insert({
                user_id: user.id,
                user_name: user.name,
                action_type: action,
                details
            });

            if (error) {
                console.error('Failed to log activity:', error);
            }
        } catch (err) {
            console.error('Error logging activity:', err);
        }
    }, []);

    return { logActivity };
}
