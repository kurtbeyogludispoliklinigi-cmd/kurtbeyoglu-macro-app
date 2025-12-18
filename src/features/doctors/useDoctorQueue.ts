'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/utils';
import type { Doctor, QueueData } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

interface UseDoctorQueueProps {
    users: Doctor[];
    currentUser: Doctor | null;
}

interface UseDoctorQueueReturn {
    queueData: QueueData | null;
    initializeQueue: () => Promise<QueueData | null>;
    getNextDoctor: () => Promise<string | null>;
    getNextDoctorInQueue: () => Doctor | null;
    isLoading: boolean;
}

export function useDoctorQueue({ users, currentUser }: UseDoctorQueueProps): UseDoctorQueueReturn {
    const { toast } = useToast();
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const initializeQueue = useCallback(async (): Promise<QueueData | null> => {
        try {
            setIsLoading(true);
            const today = getLocalDateString();

            // Check if today's queue already exists
            const { data: existingQueue, error: fetchError } = await supabase
                .from('doctor_queue')
                .select('*')
                .eq('date', today)
                .single();

            if (existingQueue) {
                setQueueData(existingQueue);
                return existingQueue;
            }

            // Create new queue for today with randomized doctor order
            // Exclude specific doctors from queue (Dt. Barış ve Dt. Salih)
            const doctors = users.filter(u =>
                u.role === 'doctor' &&
                u.name !== 'Dt. Barış' &&
                u.name !== 'Dt. Salih'
            );

            if (doctors.length === 0) {
                toast({ type: 'error', message: 'Sıraya eklenebilecek hekim bulunamadı!' });
                return null;
            }

            // Randomize doctor order
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
            console.error('Queue initialization error:', error);
            toast({ type: 'error', message: 'Sıra sistemi başlatılamadı.' });
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [users, toast]);

    const getNextDoctor = useCallback(async (): Promise<string | null> => {
        let queue = queueData;

        if (!queue) {
            queue = await initializeQueue();
            if (!queue) return null;
        }

        if (!queue.queue_order || queue.queue_order.length === 0) {
            queue = await initializeQueue();
            if (!queue) return null;
        }

        // Get the doctor at current index
        const doctorId = queue.queue_order[queue.current_index];

        // Calculate next index (wrap around)
        const nextIndex = (queue.current_index + 1) % queue.queue_order.length;

        // Update the queue index in the database
        const { error } = await supabase
            .from('doctor_queue')
            .update({ current_index: nextIndex })
            .eq('id', queue.id);

        if (error) {
            console.error('Queue update error:', error);
            toast({ type: 'error', message: 'Sıra güncellenemedi.' });
            return doctorId; // Return the doctor anyway
        }

        // Update local state
        setQueueData({ ...queue, current_index: nextIndex });

        return doctorId;
    }, [queueData, initializeQueue, toast]);

    const getNextDoctorInQueue = useCallback((): Doctor | null => {
        if (!queueData || queueData.queue_order.length === 0) return null;
        const doctorId = queueData.queue_order[queueData.current_index];
        return users.find(u => u.id === doctorId) || null;
    }, [queueData, users]);

    // Initialize queue when component mounts or when users change
    useEffect(() => {
        if (currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
            initializeQueue();
        }
    }, [currentUser, initializeQueue]);

    return {
        queueData,
        initializeQueue,
        getNextDoctor,
        getNextDoctorInQueue,
        isLoading
    };
}
