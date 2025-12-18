// ===================================
// Kurtbeyoğlu Diş Kliniği - Tip Tanımları
// ===================================

// --- ROLE & STATUS TYPES ---
export type DoctorRole = 'admin' | 'doctor' | 'banko' | 'asistan';
export type PaymentStatus = 'pending' | 'paid' | 'partial';
export type TreatmentStatus = 'planned' | 'completed' | 'cancelled';

// --- ENTITY INTERFACES ---
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
    created_at?: string;
    assignment_type?: 'queue' | 'preference';
    assignment_date?: string;
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
    status: TreatmentStatus;
    planned_date?: string | null;
    completed_date?: string | null;
    planned_by?: string | null;
}

// --- QUEUE DATA ---
export interface QueueData {
    id: string;
    date: string;
    queue_order: string[];
    current_index: number;
}

// --- FORM TYPES ---
export interface NewPatientForm {
    name: string;
    phone: string;
    anamnez: string;
}

export interface NewDoctorForm {
    name: string;
    pin: string;
    role: DoctorRole;
}

export interface PaymentForm {
    patient_id: string;
    payment_amount: number;
    payment_status: PaymentStatus;
    payment_note: string;
}

// --- FILTER TYPES ---
export type DateFilter = 'all' | 'today' | 'yesterday' | 'week';
export type TreatmentFilter = 'all' | 'planned' | 'completed';
export type ActiveTab = 'patients' | 'dashboard' | 'appointments';
