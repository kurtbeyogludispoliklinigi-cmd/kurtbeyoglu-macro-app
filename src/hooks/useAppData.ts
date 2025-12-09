
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// Define simplified interfaces to avoid circular dependency issues if types are not shared
// Ideally these should be in a types.ts file, but keeping it simple for this extraction
export type DoctorRole = 'admin' | 'doctor' | 'banko' | 'asistan';
export type PaymentStatus = 'pending' | 'paid' | 'partial';

export interface Doctor {
    id: string;
    name: string;
    role: DoctorRole;
    pin: string;
}

export interface Patient {
    id: string;
    doctor_id: string;
    doctor_name: string;
    name: string;
    phone: string;
    anamnez: string;
    updated_at: string;
    treatments?: Treatment[];
}

export interface Treatment {
    id: string;
    patient_id: string;
    tooth_no: string;
    procedure: string;
    cost: number;
    notes: string;
    created_at: string;
    added_by: string;
    payment_status?: PaymentStatus;
    payment_amount?: number;
    payment_note?: string | null;
}

export function useAppData() {
    const [users, setUsers] = useState<Doctor[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]);

    const [currentUser, setCurrentUser] = useState<Doctor | null>(null);
    const [loginPin, setLoginPin] = useState('');
    const [selectedLoginUser, setSelectedLoginUser] = useState('');

    const [loading, setLoading] = useState(false);
    const [dbError, setDbError] = useState(false);

    // Data Fetching Logic (Centralized)
    const fetchData = async (overrideUser?: Doctor) => {
        const activeUser = overrideUser || currentUser;

        // Only fetch patient/treatment data if a user is logged in
        if (!activeUser) return;

        setLoading(true);
        try {
            // 1. Fetch Doctors (Always needed for login screen, but good to refresh)
            const { data: doctorsData, error: docError } = await supabase.from('doctors').select('*');
            if (docError) throw docError;
            setUsers(doctorsData || []);

            // 2. Fetch Patients (Filtered by Doctor ID for Privacy)
            let patientQuery = supabase
                .from('patients')
                .select('*')
                .order('updated_at', { ascending: false });

            // Only HEKİM (doctor) role sees filtered patients
            // ADMIN, BANKO, ASISTAN see all patients
            if (activeUser.role === 'doctor') {
                patientQuery = patientQuery.eq('doctor_id', activeUser.id);
            }

            const { data: patientsData, error: patError } = await patientQuery;
            if (patError) throw patError;

            const fetchedPatients = patientsData || [];
            setPatients(fetchedPatients);

            // 3. Fetch Treatments (Only for the visible patients)
            if (fetchedPatients.length > 0) {
                const patientIds = fetchedPatients.map(p => p.id);
                const { data: treatmentsData, error: treatError } = await supabase
                    .from('treatments')
                    .select('*')
                    .in('patient_id', patientIds)
                    .order('created_at', { ascending: false });

                if (treatError) throw treatError;
                setTreatments(treatmentsData || []);
            } else {
                setTreatments([]);
            }

            setDbError(false);
        } catch (error) {
            console.error("Fetch Error:", error);
            setDbError(true);
        } finally {
            setLoading(false);
        }
    };

    // Initial Doctor Fetch
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const { data } = await supabase.from('doctors').select('*');
                if (data) setUsers(data);
            } catch (e) { console.error(e); setDbError(true); }
        };
        fetchDoctors();

        // Listen for changes
        const channel = supabase.channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                if (currentUser) fetchData(currentUser);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser]); // Depend on currentUser to refresh listener context if needed

    return {
        users, setUsers,
        patients, setPatients,
        treatments, setTreatments,
        currentUser, setCurrentUser,
        loginPin, setLoginPin,
        selectedLoginUser, setSelectedLoginUser,
        loading, setLoading,
        dbError, setDbError,
        fetchData
    };
}
