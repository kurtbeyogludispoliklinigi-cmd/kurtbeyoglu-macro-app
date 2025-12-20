import React, { useState } from 'react';
import {
    ArrowLeft, Phone, User, Edit, Trash2, DollarSign, Clock, Save
} from 'lucide-react';
import { Patient, Doctor, Treatment } from '@/lib/types';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { hasPermission, canDeletePatient } from '@/lib/permissions';
import { PatientReportButton } from '@/components/ReportExport';
import { PatientImageGallery } from '@/components/PatientImageGallery';
import { TreatmentForm } from '@/features/treatments';

import { useToast } from '@/hooks/useToast';
import { PatientTimeline } from './PatientTimeline';
import { LayoutList, GitCommit } from 'lucide-react';
import { usePatientContext } from './PatientProvider';

interface PatientDetailProps {
    patient: Patient;
    currentUser: Doctor;
    isMobile: boolean;
    onClose: () => void;
    onEdit: (patient: Patient) => void;
    onDelete: (patientId: string) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    fetchData: () => void;
    onAddPayment: () => void;
    onMarkTreatmentCompleted: (id: string) => void;
    onDeleteTreatment: (id: string) => void;
}

export function PatientDetail({
    patient,
    currentUser,
    isMobile,
    onClose,
    onEdit,
    onDelete,
    loading,
    setLoading,
    fetchData,
    onAddPayment,
    onMarkTreatmentCompleted,
    onDeleteTreatment
}: PatientDetailProps) {
    const { toast } = useToast();
    const [treatmentFilter, setTreatmentFilter] = useState<'all' | 'planned' | 'completed'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

    // Quick Notes State
    const { updatePatient } = usePatientContext();
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [localNotes, setLocalNotes] = useState(patient.notes || '');

    // Reset local notes if patient changes
    React.useEffect(() => {
        setLocalNotes(patient.notes || '');
    }, [patient.notes]);

    return (
        <>
            <div className="bg-white p-4 md:p-6 shadow-sm border-b flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                    {/* Back button for mobile */}
                    {isMobile && (
                        <button
                            onClick={onClose}
                            className="mb-2 inline-flex items-center gap-2 text-teal-700 font-medium md:hidden"
                        >
                            <ArrowLeft size={18} /> Geri
                        </button>
                    )}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                        {patient.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-600">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 md:px-3 py-1 rounded-full">
                            <Phone size={14} /> {formatPhoneNumber(patient.phone || '') || 'Tel yok'}
                        </span>
                        <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 md:px-3 py-1 rounded-full">
                            <User size={14} /> Sorumlu: {patient.doctor_name}
                        </span>
                    </div>

                    <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <label className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center justify-between mb-2">
                            📌 Hızlı Notlar
                            <button
                                onClick={async () => {
                                    if (!patient.notes && !localNotes && !isEditingNotes) {
                                        setIsEditingNotes(true);
                                        return;
                                    }

                                    if (isEditingNotes) {
                                        // Check if changed
                                        if (localNotes !== patient.notes) {
                                            const { error } = await updatePatient(patient.id, { notes: localNotes });
                                            if (!error) {
                                                toast({ type: 'success', message: 'Not kaydedildi' });
                                                fetchData();
                                                setIsEditingNotes(false);
                                            } else {
                                                toast({ type: 'error', message: 'Hata oluştu' });
                                            }
                                        } else {
                                            setIsEditingNotes(false);
                                        }
                                    } else {
                                        setIsEditingNotes(true);
                                    }
                                }}
                                className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-100 transition"
                                title="Notu Düzenle/Kaydet"
                            >
                                {isEditingNotes ? <Save size={14} /> : <Edit size={14} />}
                            </button>
                        </label>
                        {isEditingNotes ? (
                            <textarea
                                className="w-full text-sm p-2 bg-white border border-amber-200 rounded focus:outline-none focus:border-amber-400 text-gray-700 min-h-[60px]"
                                value={localNotes}
                                onChange={(e) => setLocalNotes(e.target.value)}
                                placeholder="Hasta hakkında özel notlar..."
                                autoFocus
                            />
                        ) : (
                            <p
                                className="text-sm text-gray-700 whitespace-pre-wrap cursor-pointer hover:opacity-80 transition"
                                onClick={() => setIsEditingNotes(true)}
                            >
                                {patient.notes || <span className="text-gray-400 italic">Not eklemek için tıklayın...</span>}
                            </p>
                        )}
                    </div>

                    {patient.anamnez && (
                        <div className="mt-3 p-2 md:p-3 bg-red-50 text-red-700 text-xs md:text-sm rounded-lg border border-red-100">
                            <strong>⚠️ Anamnez:</strong> {patient.anamnez}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                    <PatientReportButton patient={patient} treatments={patient.treatments || []} />
                    {((currentUser.role === 'admin' || currentUser.role === 'banko' || currentUser.role === 'asistan') ||
                        (currentUser.role === 'doctor' && patient.doctor_id === currentUser.id)) && (
                            <button
                                onClick={() => onEdit(patient)}
                                className="text-gray-400 hover:text-blue-500 transition p-2"
                                title="Hasta Bilgilerini Düzenle"
                            >
                                <Edit size={20} />
                            </button>
                        )}
                    {canDeletePatient(currentUser, patient) && (
                        <button
                            onClick={() => onDelete(patient.id)}
                            className="text-gray-400 hover:text-red-500 transition p-2"
                            title="Hastayı Sil"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">

                <div className="mb-6">
                    <PatientImageGallery patientId={patient.id} currentUser={currentUser} />
                </div>

                {(hasPermission.addTreatment(currentUser.role) &&
                    ((currentUser.role === 'admin' || currentUser.role === 'asistan') ||
                        (currentUser.role === 'doctor' && patient.doctor_id === currentUser.id))) && (
                        <TreatmentForm
                            currentUser={currentUser}
                            selectedPatientId={patient.id}
                            onSuccess={() => {
                                toast({ type: 'success', message: 'İşlem kaydedildi!' });
                                fetchData();
                            }}
                            onError={(message) => toast({ type: 'error', message })}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    )}

                {hasPermission.addPayment(currentUser.role) && (
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border mb-6">
                        <button
                            onClick={onAddPayment}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm font-medium"
                        >
                            <DollarSign size={20} />
                            Ödeme Ekle
                        </button>
                    </div>
                )}

                {/* Treatment Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    {[
                        { key: 'all' as const, label: 'Tümü', icon: '📋' },
                        { key: 'planned' as const, label: 'Planlanan', icon: '📅' },
                        { key: 'completed' as const, label: 'Yapılan', icon: '✅' }
                    ].map(({ key, label, icon }) => {
                        const count = key === 'all'
                            ? patient.treatments?.length || 0
                            : patient.treatments?.filter(t => t.status === key).length || 0;

                        return (
                            <button
                                key={key}
                                onClick={() => setTreatmentFilter(key)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition",
                                    treatmentFilter === key
                                        ? "bg-teal-600 text-white shadow"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                {icon} {label} ({count})
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="text-lg font-semibold text-gray-700">Tedavi Geçmişi</h3>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-1.5 rounded-md transition", viewMode === 'list' ? "bg-white shadow text-teal-600" : "text-gray-400 hover:text-gray-600")}
                            title="Liste Görünümü"
                        >
                            <LayoutList size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={cn("p-1.5 rounded-md transition", viewMode === 'timeline' ? "bg-white shadow text-teal-600" : "text-gray-400 hover:text-gray-600")}
                            title="Zaman Çizelgesi"
                        >
                            <GitCommit size={18} />
                        </button>
                    </div>
                </div>

                {/* TIMELINE VIEW */}
                {viewMode === 'timeline' && (
                    <PatientTimeline treatments={patient.treatments?.filter(t => treatmentFilter === 'all' || t.status === treatmentFilter) || []} />
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    !patient.treatments || patient.treatments.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                            <p className="text-gray-400">Henüz işlem kaydı yok.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {patient.treatments
                                .filter(t => treatmentFilter === 'all' || t.status === treatmentFilter)
                                .map((t) => (
                                    <div
                                        key={t.id}
                                        className={cn(
                                            "p-4 rounded-xl border shadow-sm hover:shadow-md transition relative group",
                                            t.status === 'planned' ? "bg-blue-50 border-blue-200" :
                                                t.status === 'completed' ? "bg-white" : "bg-gray-50 border-gray-300"
                                        )}
                                    >
                                        {/* Status Badge */}
                                        <div className="absolute top-3 right-3">
                                            {t.status === 'planned' && (
                                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                                    📅 Planlanan
                                                </span>
                                            )}
                                            {t.status === 'completed' && (
                                                <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full font-medium">
                                                    ✅ Yapıldı
                                                </span>
                                            )}
                                            {t.status === 'cancelled' && (
                                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                                    ✕ İptal
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-start mb-2 pr-24">
                                            <div className="flex gap-3 items-center">
                                                {t.tooth_no && (
                                                    <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-md border border-blue-100">
                                                        #{t.tooth_no}
                                                    </div>
                                                )}
                                                <h4 className="font-bold text-gray-800 text-lg">{t.procedure}</h4>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                                    <Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}
                                                </div>
                                                {t.cost && <div className="text-teal-600 font-bold mt-1">{t.cost} ₺</div>}
                                            </div>
                                        </div>
                                        {t.notes && <p className="text-gray-600 text-sm mt-2 bg-gray-50 p-2 rounded block">{t.notes}</p>}

                                        {t.planned_by && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Planlayan: {t.planned_by}
                                            </p>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                            {t.status === 'planned' && hasPermission.addTreatment(currentUser.role) && (
                                                <button
                                                    onClick={() => onMarkTreatmentCompleted(t.id)}
                                                    className="bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-700 font-medium"
                                                    title="Yapıldı Olarak İşaretle"
                                                >
                                                    ✓ Yapıldı
                                                </button>
                                            )}

                                            {(hasPermission.addTreatment(currentUser.role) &&
                                                ((currentUser.role === 'admin' || currentUser.role === 'asistan') ||
                                                    (currentUser.role === 'doctor' && patient.doctor_id === currentUser.id))) && (
                                                    <button
                                                        onClick={() => onDeleteTreatment(t.id)}
                                                        className="text-gray-300 hover:text-red-500 transition"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ))}
            </div>
        </>
    );
}
