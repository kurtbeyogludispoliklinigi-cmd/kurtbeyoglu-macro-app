import React, { createContext, useContext, ReactNode } from 'react';
import { Treatment } from '@/lib/types';
import { useTreatments as useTreatmentsHook } from '@/hooks/useTreatments';
import { useAuth } from '@/features/auth';
import { usePatientContext } from '@/features/patients';

interface TreatmentContextType {
    treatments: Treatment[];
    loading: boolean;
    error: any;
    refreshTreatments: () => Promise<void>;
    deleteTreatment: (id: string) => Promise<{ error: any }>;
    updateTreatment: (id: string, updates: Partial<Treatment>) => Promise<{ error: any }>;
    setTreatments: React.Dispatch<React.SetStateAction<Treatment[]>>;
}

const TreatmentContext = createContext<TreatmentContextType | null>(null);

export function TreatmentProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const treatmentState = useTreatmentsHook(currentUser, patients);

    return (
        <TreatmentContext.Provider value={treatmentState}>
            {children}
        </TreatmentContext.Provider>
    );
}

export function useTreatmentContext() {
    const context = useContext(TreatmentContext);
    if (!context) {
        throw new Error('useTreatmentContext must be used within a TreatmentProvider');
    }
    return context;
}
