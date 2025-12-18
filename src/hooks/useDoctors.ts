import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Doctor } from '@/lib/types';
import { useToast } from './useToast';

export function useDoctors() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const { toast } = useToast();

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('doctors').select('*');
            if (error) throw error;
            setDoctors(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching doctors:', err);
            setError(err);
            toast({ type: 'error', message: 'Hekim listesi alınamadı.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();

        // Subscribe to changes
        const channel = supabase.channel('doctors-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
                fetchDoctors();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { doctors, loading, error, refreshDoctors: fetchDoctors, setDoctors };
}
