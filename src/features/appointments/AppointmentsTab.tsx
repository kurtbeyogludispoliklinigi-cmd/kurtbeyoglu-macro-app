import React, { useState } from 'react';
import { Doctor, Patient } from '@/lib/types';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { AppointmentList } from '@/components/AppointmentList';
import { AppointmentModal } from '@/components/AppointmentModal';
import { hasPermission } from '@/lib/permissions';

interface AppointmentsTabProps {
    currentUser: Doctor;
    patients: Patient[];
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    toast: (options: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void;
}

export function AppointmentsTab({ currentUser, patients, selectedDate, onDateChange, toast }: AppointmentsTabProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingApt, setEditingApt] = useState<Appointment | null>(null);

    const {
        appointments,
        loading,
        addAppointment,
        updateAppointment,
        deleteAppointment
    } = useAppointments({
        doctorId: hasPermission.viewAllPatients(currentUser.role) ? undefined : currentUser.id,
        date: selectedDate
    });

    const handleSave = async (data: Parameters<typeof addAppointment>[0]) => {
        if (editingApt) {
            const result = await updateAppointment(editingApt.id, data);
            if (result.success) {
                toast({ type: 'success', message: 'Randevu güncellendi!' });
                setEditingApt(null);
            } else {
                toast({ type: 'error', message: result.error || 'Hata oluştu' });
            }
            return result;
        } else {
            const result = await addAppointment(data);
            if (result.success) {
                toast({ type: 'success', message: 'Randevu oluşturuldu!' });
            } else {
                toast({ type: 'error', message: result.error || 'Hata oluştu' });
            }
            return result;
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteAppointment(id);
        if (result.success) {
            toast({ type: 'success', message: 'Randevu silindi.' });
        } else {
            toast({ type: 'error', message: result.error || 'Hata oluştu' });
        }
    };

    const handleStatusChange = async (id: string, status: Appointment['status']) => {
        const result = await updateAppointment(id, { status });
        if (result.success) {
            toast({ type: 'success', message: 'Durum güncellendi!' });
        }
    };

    return (
        <>
            <AppointmentList
                appointments={appointments}
                onEdit={(apt) => { setEditingApt(apt); setShowModal(true); }}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAddNew={() => { setEditingApt(null); setShowModal(true); }}
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                loading={loading}
            />
            <AppointmentModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingApt(null); }}
                onSave={handleSave}
                patients={patients}
                doctorId={currentUser.id}
                existingAppointment={editingApt ? {
                    id: editingApt.id,
                    patient_id: editingApt.patient_id,
                    appointment_date: editingApt.appointment_date,
                    duration_minutes: editingApt.duration_minutes,
                    notes: editingApt.notes,
                    status: editingApt.status,
                } : undefined}
            />
        </>
    );
}
