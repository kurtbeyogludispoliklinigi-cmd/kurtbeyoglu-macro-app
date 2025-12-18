import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient, Doctor } from '@/lib/types';
import { useToast } from './useToast';

export function usePatients(currentUser: Doctor | null) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const { toast } = useToast();

    const fetchPatients = useCallback(async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            let query = supabase.from('patients').select('*').order('updated_at', { ascending: false });

            // Role-based access control default (can be overridden by UI filters, 
            // but strict data access usually implies doctors only see theirs? 
            // Current logic in page.tsx:
            // if (activeUser.role === 'doctor') patientQuery.eq('doctor_id', activeUser.id);

            if (currentUser.role === 'doctor') {
                query = query.eq('doctor_id', currentUser.id);
            }

            const { data, error: err } = await query;
            if (err) throw err;

            setPatients(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError(err);
            toast({ type: 'error', message: 'Hasta listesi güncellenemedi.' });
        } finally {
            setLoading(false);
        }
    }, [currentUser, toast]);

    // Initial fetch
    useEffect(() => {
        if (currentUser) {
            fetchPatients();
        } else {
            setPatients([]);
        }
    }, [currentUser, fetchPatients]);

    // Realtime subscription
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase.channel('patients-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                fetchPatients();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchPatients]);

    const checkDuplicate = useCallback(async (name: string, phone: string): Promise<{ hasDuplicate: boolean; duplicates: Patient[] }> => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or(`name.ilike.%${name}%,phone.eq.${phone}`);

        if (error) {
            console.error('Duplicate check error:', error);
            return { hasDuplicate: false, duplicates: [] };
        }

        if (data && data.length > 0) {
            return { hasDuplicate: true, duplicates: data };
        }

        return { hasDuplicate: false, duplicates: [] };
    }, []);

    const addPatient = useCallback(async (patientData: Partial<Patient>) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .insert(patientData)
                .select()
                .single();

            if (error) throw error;

            // Optimistic update or wait for subscription? 
            // Subscription will handle it, but for immediate UI feedback we might want data.
            // setPatients(prev => [data, ...prev]); 
            return { data, error: null };
        } catch (err: any) {
            console.error('Patient add error:', err);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('patients')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            console.error('Patient update error:', err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    const deletePatient = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('patients').delete().eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            console.error('Patient delete error:', err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        patients,
        setPatients,
        loading,
        error,
        refreshPatients: fetchPatients,
        addPatient,
        updatePatient,
        deletePatient,
        checkDuplicate
    };
}
