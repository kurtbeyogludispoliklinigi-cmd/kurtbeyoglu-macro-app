// ===================================
// Kurtbeyoğlu Diş Kliniği - Yetkilendirme
// ===================================

import type { Doctor, DoctorRole, Patient } from './types';

// --- PERMISSION HELPER ---
export const hasPermission = {
    // Doctors only see their own, Admin/Banko/Asistan see all
    viewAllPatients: (role: DoctorRole) =>
        role === 'admin' || role === 'banko' || role === 'asistan',

    // Anamnez: Admin + Doctors + Asistan (Banko cannot see medical history details ideally, or at least not edit)
    editAnamnez: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    // Edit Patient Info: Admin + Asistan + Doctor (Banko creates, but maybe shouldn't edit details?)
    // Prompt says: "hasta verisini düzenlemeyi asistan yapabilsin" -> implies Banko might NOT.
    editPatient: (role: DoctorRole) =>
        role === 'admin' || role === 'asistan' || role === 'doctor',

    // Create Patient: "hasta girişini sadece banko yapabilsin"
    // We'll also allow Admin. Doctor/Asistan shouldn't? Prompt says "sadece banko". 
    // Usually Admin can do everything. I will allow Admin too.
    createPatient: (role: DoctorRole) =>
        role === 'admin' || role === 'banko',

    // Delete: Admin only usually, or maybe Head Doctor.
    deletePatient: (role: DoctorRole) =>
        role === 'admin',

    // Add Treatment: "tedavi girişini asistan yapabilsin"
    // Doctors should probably be able to too. Admin definitely.
    addTreatment: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor' || role === 'asistan',

    // Collect Payment (The act of taking money): "banko ödeme alımını yapabilsin"
    addPayment: (role: DoctorRole) =>
        role === 'admin' || role === 'banko',

    // Set Payment Amount / Edit Financials: "ödemenin ne kadar olacağını asistan girebilsin"
    setPaymentAmount: (role: DoctorRole) =>
        role === 'admin' || role === 'asistan' || role === 'doctor',

    viewDashboard: (role: DoctorRole) =>
        role === 'admin' || role === 'doctor',

    manageUsers: (role: DoctorRole) =>
        role === 'admin',
};

// --- PATIENT PERMISSION CHECK ---
export const canDeletePatient = (user: Doctor | null, patient: Patient): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // Strict delete prevention for others
    return false;
};
