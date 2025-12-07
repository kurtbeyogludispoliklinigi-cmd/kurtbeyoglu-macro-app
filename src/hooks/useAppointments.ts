'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Appointment {
    id: string;
    patient_id: string;
    doctor_id: string;
    appointment_date: string;
    duration_minutes: number;
    notes: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
    created_at: string;
    updated_at: string;
    // Joined fields
    patient_name?: string;
    doctor_name?: string;
}

interface UseAppointmentsOptions {
    doctorId?: string;
    date?: Date;
}

export function useAppointments(options?: UseAppointmentsOptions) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('appointments')
                .select(`
          *,
          patients:patient_id(name),
          doctors:doctor_id(name)
        `)
                .order('appointment_date', { ascending: true });

            // Filter by doctor if provided
            if (options?.doctorId) {
                query = query.eq('doctor_id', options.doctorId);
            }

            // Filter by date if provided
            if (options?.date) {
                const startOfDay = new Date(options.date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(options.date);
                endOfDay.setHours(23, 59, 59, 999);

                query = query
                    .gte('appointment_date', startOfDay.toISOString())
                    .lte('appointment_date', endOfDay.toISOString());
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Transform data to include patient and doctor names
            const transformed = (data || []).map((apt: Record<string, unknown>) => ({
                ...apt,
                patient_name: (apt.patients as { name: string } | null)?.name || 'Bilinmiyor',
                doctor_name: (apt.doctors as { name: string } | null)?.name || 'Bilinmiyor',
            }));

            setAppointments(transformed as Appointment[]);
        } catch (err) {
            console.error('Fetch appointments error:', err);
            setError(err instanceof Error ? err.message : 'Randevular yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [options?.doctorId, options?.date]);

    const addAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'patient_name' | 'doctor_name'>) => {
        setLoading(true);
        try {
            const { error: insertError } = await supabase
                .from('appointments')
                .insert(appointment);

            if (insertError) throw insertError;
            await fetchAppointments();
            return { success: true };
        } catch (err) {
            console.error('Add appointment error:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Randevu eklenemedi' };
        } finally {
            setLoading(false);
        }
    };

    const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
        setLoading(true);
        try {
            const { error: updateError } = await supabase
                .from('appointments')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchAppointments();
            return { success: true };
        } catch (err) {
            console.error('Update appointment error:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Randevu güncellenemedi' };
        } finally {
            setLoading(false);
        }
    };

    const deleteAppointment = async (id: string) => {
        setLoading(true);
        try {
            const { error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            await fetchAppointments();
            return { success: true };
        } catch (err) {
            console.error('Delete appointment error:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Randevu silinemedi' };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    return {
        appointments,
        loading,
        error,
        refresh: fetchAppointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
    };
}
