import React, { createContext, useContext, ReactNode } from 'react';
import { Patient } from '@/lib/types';
import { usePatients as usePatientsHook } from '@/hooks/usePatients';
import { useAuth } from '@/features/auth';

interface PatientContextType {
    patients: Patient[];
    loading: boolean;
    error: any;
    refreshPatients: () => Promise<void>;
    addPatient: (patientData: Partial<Patient>) => Promise<{ data: Patient | null; error: any }>;
    updatePatient: (id: string, updates: Partial<Patient>) => Promise<{ error: any }>;
    deletePatient: (id: string) => Promise<{ error: any }>;
    checkDuplicate: (name: string, phone: string) => Promise<{ hasDuplicate: boolean; duplicates: Patient[] }>;
    setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
}

const PatientContext = createContext<PatientContextType | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const patientState = usePatientsHook(currentUser);

    return (
        <PatientContext.Provider value={patientState}>
            {children}
        </PatientContext.Provider>
    );
}

export function usePatientContext() {
    const context = useContext(PatientContext);
    if (!context) {
        throw new Error('usePatientContext must be used within a PatientProvider');
    }
    return context;
}
