import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { usePatientContext } from './PatientProvider';
import { useQueue } from '@/hooks/useQueue';
import { useToast } from '@/hooks/useToast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { hasPermission } from '@/lib/permissions';
import { sanitizePhoneNumber, isValidPhoneNumber, getLocalDateString, formatPhoneNumber } from '@/lib/utils';
import { AddPatientModal, DuplicateWarningModal } from './PatientModals';
import { DoctorSelectionModal } from '@/features/queue'; // Assuming exported
import { Patient } from '@/lib/types';

interface PatientCreationContextType {
    openCreateModal: () => void;
    closeCreateModal: () => void;
    isCreationModalOpen: boolean;
}

const PatientCreationContext = createContext<PatientCreationContextType | null>(null);

export function PatientCreationProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, users } = useAuth();
    const { addPatient, checkDuplicate } = usePatientContext();
    const { toast } = useToast();
    const { logActivity } = useActivityLogger();
    const { initializeQueue, getNextDoctor, queueData } = useQueue(currentUser, users);

    // State
    const [showAddPatientModal, setShowAddPatientModal] = useState(false);
    const [showDoctorSelectionModal, setShowDoctorSelectionModal] = useState(false);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [duplicatePatients, setDuplicatePatients] = useState<Patient[]>([]);
    const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);

    const [newPatient, setNewPatient] = useState({ name: '', phone: '', anamnez: '' });
    const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState('');
    const [assignmentMethod, setAssignmentMethod] = useState<'manual' | 'queue' | null>(null);
    const [loading, setLoading] = useState(false);

    // Track consecutive queue assignments (local to this provider now)
    const [recentQueueAssignments, setRecentQueueAssignments] = useState<{
        doctorId: string;
        doctorName: string;
        timestamp: number;
    }[]>([]);

    const canSaveNewPatient = useMemo(
        () => newPatient.name.trim().length > 0 && isValidPhoneNumber(newPatient.phone),
        [newPatient.name, newPatient.phone]
    );

    const openCreateModal = () => {
        if (currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
            initializeQueue(); // Re-init queue when opening
            setShowDoctorSelectionModal(true);
        } else {
            setShowAddPatientModal(true);
        }
    };

    const closeCreateModal = () => {
        setShowAddPatientModal(false);
        setShowDoctorSelectionModal(false);
        setNewPatient({ name: '', phone: '', anamnez: '' });
        setSelectedDoctorForPatient('');
        setAssignmentMethod(null);
    };

    const handleDoctorSelection = async (method: 'manual' | 'queue', doctorId?: string) => {
        setAssignmentMethod(method);
        if (method === 'queue') {
            const nextDoctorId = await getNextDoctor();
            if (nextDoctorId) {
                setSelectedDoctorForPatient(nextDoctorId);
                setShowDoctorSelectionModal(false);
                setShowAddPatientModal(true);
            }
        } else if (method === 'manual') {
            if (!doctorId) {
                toast({ type: 'error', message: 'Lütfen bir hekim seçin' });
                return;
            }
            setSelectedDoctorForPatient(doctorId);
            setShowDoctorSelectionModal(false);
            setShowAddPatientModal(true);
        }
    };

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        const cleanedPhone = sanitizePhoneNumber(newPatient.phone);
        const trimmedName = newPatient.name.trim();

        if (!trimmedName || !isValidPhoneNumber(newPatient.phone)) {
            toast({ type: 'error', message: 'Ad Soyad ve geçerli telefon zorunludur.' });
            return;
        }

        try {
            // DUPLIKASYON KONTROLÜ
            if (!proceedWithDuplicate) {
                const duplicateCheck = await checkDuplicate(trimmedName, cleanedPhone);
                if (duplicateCheck.hasDuplicate) {
                    setDuplicatePatients(duplicateCheck.duplicates);
                    setShowDuplicateWarning(true);
                    return;
                }
            }

            // Hekim ID belirleme
            let doctorId = currentUser.id;
            let doctorName = currentUser.name;
            let assignmentType: 'queue' | 'preference' = 'preference';

            if (currentUser.role === 'banko' || currentUser.role === 'asistan') {
                if (!selectedDoctorForPatient) {
                    toast({ type: 'error', message: 'Lütfen hekim seçin' });
                    return;
                }
                doctorId = selectedDoctorForPatient;
                const selectedDoc = users.find(u => u.id === selectedDoctorForPatient);
                doctorName = selectedDoc?.name || '';

                if (assignmentMethod === 'queue') {
                    assignmentType = 'queue';
                } else {
                    assignmentType = 'preference';
                }
            }

            // Check for consecutive assignments logic
            if (currentUser.role === 'banko' || currentUser.role === 'asistan') {
                if (assignmentType === 'queue' && assignmentMethod === 'queue') {
                    const recentSameDoctor = recentQueueAssignments.filter(
                        (assignment) =>
                            assignment.doctorId === doctorId &&
                            Date.now() - assignment.timestamp < 3600000
                    );

                    if (recentSameDoctor.length >= 1) {
                        toast({
                            type: 'warning',
                            message: `⚠️ Dikkat: ${doctorName} hekime arka arkaya ${recentSameDoctor.length + 1}. hasta ekleniyor!`,
                            duration: 5000
                        });
                    }

                    setRecentQueueAssignments(prev => [
                        ...prev.slice(-4),
                        { doctorId, doctorName, timestamp: Date.now() }
                    ]);
                }
            }

            setLoading(true);
            const { data, error } = await addPatient({
                doctor_id: doctorId,
                doctor_name: doctorName,
                name: trimmedName,
                phone: cleanedPhone,
                anamnez: hasPermission.editAnamnez(currentUser.role) ? newPatient.anamnez : '',
                assignment_type: assignmentType,
                assignment_date: getLocalDateString(),
                created_by: currentUser.id,
                created_by_name: currentUser.name
            });

            if (error) throw error;

            if (data) {
                await logActivity(currentUser, 'CREATE_PATIENT', {
                    patient_id: data.id,
                    name: trimmedName,
                    doctor_name: doctorName
                });
                // We might want to select the patient in the main list, but that state is in page.tsx
                // For now we just add it. If we need to select it, we might need a callback or global selection context.
            }

            closeCreateModal();
            toast({ type: 'success', message: 'Hasta kartı başarıyla kaydedildi.' });

        } catch (error) {
            console.error('Patient add error:', error);
            toast({ type: 'error', message: 'Kayıt yapılamadı.' });
        } finally {
            setLoading(false);
            setProceedWithDuplicate(false);
            setDuplicatePatients([]);
        }
    };

    return (
        <PatientCreationContext.Provider value={{
            openCreateModal,
            closeCreateModal,
            isCreationModalOpen: showAddPatientModal || showDoctorSelectionModal
        }}>
            {children}

            {/* Modals */}
            <DoctorSelectionModal
                isOpen={showDoctorSelectionModal}
                onClose={() => setShowDoctorSelectionModal(false)}
                onConfirm={handleDoctorSelection}
                users={users}
                nextDoctorInQueue={queueData && queueData.queue_order ? users.find(u => u.id === queueData.queue_order[queueData.current_index]) || null : null}
            />

            <AddPatientModal
                isOpen={showAddPatientModal}
                onClose={closeCreateModal}
                onSubmit={handleAddPatient}
                newPatient={newPatient}
                setNewPatient={setNewPatient}
                currentUser={currentUser || {} as any}
                users={users}
                selectedDoctorForPatient={selectedDoctorForPatient}
                loading={loading}
                canSave={canSaveNewPatient}
            />

            <DuplicateWarningModal
                isOpen={showDuplicateWarning}
                onClose={() => { setShowDuplicateWarning(false); setProceedWithDuplicate(false); }}
                duplicatePatients={duplicatePatients}
                onSelectPatient={(p) => {
                    // Logic to select existing patient. 
                    // This needs to update page.tsx selection. 
                    // Maybe we should just close and show toast "Go to patient"?
                    setShowDuplicateWarning(false);
                    toast({ type: 'info', message: 'Mevcut hasta seçildi.' });
                }}
                onProceedAnyway={() => {
                    setProceedWithDuplicate(true);
                    setShowDuplicateWarning(false);
                    // Trigger logic again - we can just call handleAddPatient again, but state upd needs a re-render or effect?
                    // In page.tsx it used setTimeout to re-submit form.
                    // Here we can just call handleAddPatient directly? No, event object needed.
                    // We'll set state and if handleAddPatient checks it...
                    // We need to re-trigger.
                    // Simpler: Just setProceedWithDuplicate(true) and let user click Save again?
                    // Or automate it.
                    setTimeout(() => {
                        const form = document.querySelector('form[data-patient-form]'); // Need to add this attr to AddPatientModal form
                        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }, 100);
                }}
            />
        </PatientCreationContext.Provider>
    );
}

export function usePatientCreation() {
    const context = useContext(PatientCreationContext);
    if (!context) {
        throw new Error('usePatientCreation must be used within a PatientCreationProvider');
    }
    return context;
}
