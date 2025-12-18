import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { QueueData, Doctor } from '@/lib/types';
import { useToast } from './useToast';
import { getLocalDateString } from '@/lib/utils';

export function useQueue(currentUser: Doctor | null, doctors: Doctor[]) {
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchQueue = useCallback(async () => {
        if (!currentUser) return;

        // Only banko/asistan/admin usually care about queue, but let's fetch for all if they have access
        // Or strictly follow page.tsx logic: banko/asistan initiate it.

        const today = getLocalDateString();

        try {
            const { data, error } = await supabase
                .from('doctor_queue')
                .select('*')
                .eq('date', today)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error('Error fetching queue:', error);
            }

            if (data) {
                setQueueData(data);
            } else {
                setQueueData(null);
            }
        } catch (err) {
            console.error('Queue fetch exception:', err);
        }
    }, [currentUser]);

    const initializeQueue = async (): Promise<QueueData | null> => {
        if (!currentUser || doctors.length === 0) return null;

        // Double check if exists (race condition)
        const today = getLocalDateString();

        try {
            const { data: existingQueue } = await supabase
                .from('doctor_queue')
                .select('*')
                .eq('date', today)
                .single();

            if (existingQueue) {
                setQueueData(existingQueue);
                return existingQueue;
            }

            // Create new
            const shuffled = [...doctors].sort(() => Math.random() - 0.5);
            const queueOrder = shuffled.map(d => d.id);

            const { data: newQueue, error: createError } = await supabase
                .from('doctor_queue')
                .insert({
                    date: today,
                    queue_order: queueOrder,
                    current_index: 0
                })
                .select()
                .single();

            if (createError) throw createError;

            setQueueData(newQueue);
            return newQueue;

        } catch (error) {
            console.error('Queue init error:', error);
            toast({ type: 'error', message: 'Sıra sistemi başlatılamadı.' });
            return null;
        }
    };

    const getNextDoctor = async (): Promise<string | null> => {
        let queue = queueData;

        // If no queue locally, try init or fetch
        if (!queue) {
            queue = await initializeQueue();
            if (!queue) return null;
        }

        if (!queue.queue_order || queue.queue_order.length === 0) {
            // Re-init if empty order? That's weird but safety check
            queue = await initializeQueue();
            if (!queue) return null;
        }

        // Ensure queue is valid type (TS)
        if (!queue) return null;

        const doctorId = queue.queue_order[queue.current_index];
        const nextIndex = (queue.current_index + 1) % queue.queue_order.length;

        // Persist update
        const { error } = await supabase
            .from('doctor_queue')
            .update({ current_index: nextIndex })
            .eq('id', queue.id);

        if (error) {
            console.error('Queue update error:', error);
            toast({ type: 'error', message: 'Sıra güncellenemedi.' });
            return doctorId; // Return anyway, optimistic
        }

        // Optimistic local update (or wait for subscription?)
        // Optimistic is faster
        setQueueData({ ...queue, current_index: nextIndex });

        return doctorId;
    };

    const getNextDoctorInQueue = (): Doctor | null => {
        if (!queueData || !queueData.queue_order || queueData.queue_order.length === 0) return null;
        const doctorId = queueData.queue_order[queueData.current_index];
        return doctors.find(u => u.id === doctorId) || null;
    };

    // Subscriptions
    useEffect(() => {
        if (!currentUser) return;

        fetchQueue();

        const channel = supabase.channel('queue-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_queue' }, (payload) => {
                // We could just fetchQueue, or carefully update local state
                fetchQueue();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchQueue]);

    // Auto-initialize for banko/asistan if missing
    // This logic was in page.tsx useEffect. We can keep it there or here.
    // If we put it here, it runs whenever hooks are used.
    // Ideally, useQueue is called in page.tsx.

    return {
        queueData,
        loading,
        initializeQueue,
        getNextDoctor,
        getNextDoctorInQueue
    };
}
