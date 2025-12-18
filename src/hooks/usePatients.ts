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

    return {
        patients,
        setPatients, // Exposed for optimistic updates if needed
        loading,
        error,
        refreshPatients: fetchPatients
    };
}
