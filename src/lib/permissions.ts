// ===================================
// Kurtbeyoğlu Diş Kliniği - Yetkilendirme
// ===================================

import type { Doctor, DoctorRole, Patient } from './types';

// ===================================
// ROLE-BASED PERMISSIONS (Updated)
// ===================================

export const hasPermission = {
    // VIEW PERMISSIONS
    viewAllPatients: (role: DoctorRole) =>
        role === 'admin' || role === 'banko' || role === 'asistan',

    viewOwnPatientsOnly: (role: DoctorRole) =>
        role === 'doctor',

    viewDashboard: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor',

    viewPatientHistory: (role: DoctorRole) =>
        role === 'admin' || role === 'banko' || role === 'doctor',

    // PATIENT MANAGEMENT
    addPatient: (role: DoctorRole) =>
        role === 'admin' || role === 'banko', // Only banko and admin can add patients

    editPatient: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    editAnamnez: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    deletePatient: (role: DoctorRole) =>
        role === 'admin', // Only admin can delete patients

    // TREATMENT MANAGEMENT
    addTreatment: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    deleteTreatment: (role: DoctorRole) =>
        role === 'admin' || role === 'asistan',

    // PAYMENT MANAGEMENT
    addPayment: (role: DoctorRole) =>
        role === 'admin' || role === 'banko',

    viewPayments: (role: DoctorRole) =>
        role === 'admin' || role === 'banko' || role === 'doctor',

    // USER MANAGEMENT
    manageUsers: (role: DoctorRole) =>
        role === 'admin',

    // NOTES & IMAGES
    addNotes: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    uploadImages: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',
};

// --- PATIENT PERMISSION CHECK ---
// Only admin can delete patients now
export const canDeletePatient = (user: Doctor | null, patient: Patient): boolean => {
    if (!user) return false;
    return user.role === 'admin';
};

// --- PATIENT ACCESS CHECK ---
// Doctors can only see their own patients
export const canAccessPatient = (user: Doctor | null, patient: Patient): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'banko' || user.role === 'asistan') return true;
    if (user.role === 'doctor') return patient.doctor_id === user.id;
    return false;
};
