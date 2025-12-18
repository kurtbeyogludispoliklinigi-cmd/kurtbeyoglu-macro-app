import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Treatment, Patient, Doctor } from '@/lib/types';
import { useToast } from './useToast';

export function useTreatments(currentUser: Doctor | null, patients: Patient[]) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const { toast } = useToast();

    const fetchTreatments = useCallback(async () => {
        if (!currentUser) return;
        if (patients.length === 0) {
            setTreatments([]);
            return;
        }

        setLoading(true);
        try {
            const patientIds = patients.map(p => p.id);

            const { data, error: err } = await supabase
                .from('treatments')
                .select('*')
                .in('patient_id', patientIds)
                .order('created_at', { ascending: false });

            if (err) throw err;

            setTreatments(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching treatments:', err);
            setError(err);
            toast({ type: 'error', message: 'Tedavi geçmişi alınamadı.' });
        } finally {
            setLoading(false);
        }
    }, [currentUser, patients, toast]);

    // Fetch when patients change
    useEffect(() => {
        fetchTreatments();
    }, [fetchTreatments]);

    // Realtime subscription
    // Note: We need to be careful with subscriptions. 
    // If we subscribe to ALL treatments, we might get updates for non-visible patients?
    // Row Level Security (RLS) usually handles this.
    // Assuming RLS is set up properly or we filter.
    // The original page.tsx subscribed to `postgres_changes` on PUBLIC schema (all tables).

    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase.channel('treatments-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'treatments' }, () => {
                // Optimally we would filter strictly, but re-fetching is safer for now.
                fetchTreatments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchTreatments]);

    const deleteTreatment = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('treatments').delete().eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            console.error('Treatment delete error:', err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    const updateTreatment = useCallback(async (id: string, updates: Partial<Treatment>) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('treatments')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            console.error('Treatment update error:', err);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        treatments,
        setTreatments,
        loading,
        error,
        refreshTreatments: fetchTreatments,
        deleteTreatment,
        updateTreatment
    };
}
