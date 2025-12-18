// ===================================
// Kurtbeyoğlu Diş Kliniği - Yetkilendirme
// ===================================

import type { Doctor, DoctorRole, Patient } from './types';

// --- PERMISSION HELPER ---
export const hasPermission = {
    viewAllPatients: (role: DoctorRole) =>
        role === 'admin' || role === 'banko' || role === 'asistan',

    editAnamnez: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    editPatient: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    deletePatient: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    addTreatment: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    addPayment: (role: DoctorRole) =>
        role === 'admin' || role === 'banko',

    viewDashboard: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor',

    manageUsers: (role: DoctorRole) =>
        role === 'admin',
};

// --- PATIENT PERMISSION CHECK ---
export const canDeletePatient = (user: Doctor | null, patient: Patient): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'banko' || user.role === 'asistan') return true;
    if (user.role === 'doctor') return patient.doctor_id === user.id;
    return false;
};
