'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User, Users, Lock, LogOut, Shield, Plus, Search, Trash2,
  Save, RefreshCcw, Phone, Activity, Clock, Cloud, WifiOff, Edit, LayoutDashboard, Calendar, Menu, X, DollarSign
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AIAssistant from '@/components/AIAssistant';
import { useToast } from '@/hooks/useToast';
import { ThemeToggle } from '@/components/ThemeToggle';
import Dashboard from '@/components/Dashboard';
import { VoiceInput } from '@/components/VoiceInput';
import { PatientReportButton } from '@/components/ReportExport';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { AppointmentModal } from '@/components/AppointmentModal';
import { AppointmentList } from '@/components/AppointmentList';
import { TreatmentForm } from '@/components/TreatmentForm';
import { HelpButton } from '@/components/HelpModal';
import { PatientImageGallery } from '@/components/PatientImageGallery';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
type DoctorRole = 'admin' | 'doctor' | 'banko' | 'asistan';
type PaymentStatus = 'pending' | 'paid' | 'partial';

interface Doctor {
  id: string;
  name: string;
  role: DoctorRole;
  pin: string;
}

interface Patient {
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

type TreatmentStatus = 'planned' | 'completed' | 'cancelled';

interface Treatment {
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
  // Treatment planning fields
  status: TreatmentStatus;
  planned_date?: string | null;
  completed_date?: string | null;
  planned_by?: string | null;
}

// --- PERMISSION HELPER ---
const hasPermission = {
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

export default function Home() {
  const { toast } = useToast();

  // Appointments - moved here but will be used conditionally
  const [appointmentDate, setAppointmentDate] = useState(new Date());

  // --- STATE ---
  const [users, setUsers] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [currentUser, setCurrentUser] = useState<Doctor | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [selectedLoginUser, setSelectedLoginUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Selection
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState<'all' | 'planned' | 'completed'>('all');

  // Modals
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDoctorSelectionModal, setShowDoctorSelectionModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Duplicate detection state
  const [duplicatePatients, setDuplicatePatients] = useState<Patient[]>([]);
  const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);

  // Password change form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [passwordChanges, setPasswordChanges] = useState<Record<string, string>>({});

  // View Toggle
  const [activeTab, setActiveTab] = useState<'patients' | 'dashboard' | 'appointments'>('patients');

  // Mobile sidebar toggle - default closed on mobile
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Forms
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', anamnez: '' });
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [newDoctor, setNewDoctor] = useState<{ name: string; pin: string; role: DoctorRole }>({ name: '', pin: '', role: 'doctor' });
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    payment_amount: 0,
    payment_status: 'paid' as PaymentStatus,
    payment_note: ''
  });

  // Doctor selection for patient creation (BANKO/ASISTAN)
  const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState('');

  // Queue management for automatic doctor assignment
  interface QueueData {
    id: string;
    date: string;
    queue_order: string[];
    current_index: number;
  }
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [doctorSelectionMethod, setDoctorSelectionMethod] = useState<'manual' | 'queue' | null>(null);

  // --- FETCHING ---
  // --- FETCHING ---
  const fetchData = async (overrideUser?: Doctor) => {
    // Use the passed user or current user, but if neither, do not fetch sensitive data
    const activeUser = overrideUser || currentUser;
    if (!supabase || !activeUser) return;

    setLoading(true);
    try {
      // 1. Doctors (Public/All needed for login selection, maybe restrict later if strict privacy needed, but names are usually public)
      // Actually, we need doctors list for the login screen BEFORE we have a user. 
      // So we separate initial fetch (Doctors) from sensitive fetch (Patients/Treatments).

      // 2. Patients & Treatments (Private)
      let patientQuery = supabase.from('patients').select('*').order('updated_at', { ascending: false });
      let treatmentQuery = supabase.from('treatments').select('*').order('created_at', { ascending: false });

      // If NOT admin, filter strictly
      if (activeUser.role === 'doctor') {
        patientQuery = patientQuery.eq('doctor_id', activeUser.id);
        // For treatments, we need to filter by patient IDs effectively or if treatments table has doctor_id (it doesn't seem to, it has added_by name).
        // Best approach: Fetch patients first, then fetch treatments for those patients.
        // OR: Modify treatments schema to include doctor_id. 
        // Current Schema: treatments has patient_id.
        // We will fetch treatments after patients.
      }

      const { data: patientsData, error: patError } = await patientQuery;
      if (patError) throw patError;
      setPatients(patientsData || []);

      if (patientsData && patientsData.length > 0) {
        const patientIds = patientsData.map(p => p.id);
        // Supabase 'in' query for treatments
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
      toast({ type: 'error', message: 'Veri çekme hatası.' });
      setDbError(true);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch for doctor list ONLY
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase.from('doctors').select('*');
        if (error) throw error;
        setUsers(data || []);
      } catch (e) {
        console.error(e);
        setDbError(true);
      }
    };
    fetchDoctors();

    // Listen for changes
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (currentUser) fetchData(currentUser); // Refresh if logged in
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]); // Re-subscribe if user changes? No, just keep channel open.


  // --- FILTERING ---
  const patientsWithTreatments = useMemo(() => {
    return patients.map((p: Patient) => ({
      ...p,
      treatments: treatments.filter((t: Treatment) => t.patient_id === p.id)
    }));
  }, [patients, treatments]);

  const filteredPatients = useMemo(() => {
    let list = patientsWithTreatments;
    // Only doctors (hekim) see filtered patients, others (admin, banko, asistan) see all
    if (currentUser && !hasPermission.viewAllPatients(currentUser.role)) {
      list = list.filter((p: Patient) => p.doctor_id === currentUser.id);
    }
    return list.filter((p: Patient) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm))
    );
  }, [patientsWithTreatments, searchTerm, currentUser]);

  const activePatient = patientsWithTreatments.find((p: Patient) => p.id === selectedPatientId);

  // --- QUEUE MANAGEMENT ---
  const initializeQueue = async (): Promise<QueueData | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if today's queue already exists
      const { data: existingQueue, error: fetchError } = await supabase
        .from('doctor_queue')
        .select('*')
        .eq('date', today)
        .single();

      if (existingQueue) {
        setQueueData(existingQueue);
        return existingQueue;
      }

      // Create new queue for today with randomized doctor order
      // Exclude specific doctors from queue (Dt. Barış ve Dt. Salih)
      const doctors = users.filter(u =>
        u.role === 'doctor' &&
        u.name !== 'Dt. Barış' &&
        u.name !== 'Dt. Salih'
      );
      if (doctors.length === 0) {
        toast({ type: 'error', message: 'Sıraya eklenebilecek hekim bulunamadı!' });
        return null;
      }

      // Randomize doctor order
      const shuffled = [...doctors].sort(() => Math.random() - 0.5);
      const queueOrder = shuffled.map(d => d.id);

      const { data: newQueue, error: createError } = await supabase
        .from('doctor_queue')
        .insert({
          date: today,
          queue_order: queueOrder,
          current_index: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      setQueueData(newQueue);
      return newQueue;
    } catch (error) {
      console.error('Queue initialization error:', error);
      toast({ type: 'error', message: 'Sıra sistemi başlatılamadı.' });
      return null;
    }
  };

  const getNextDoctor = async (): Promise<string | null> => {
    let queue = queueData;

    if (!queue) {
      queue = await initializeQueue();
      if (!queue) return null;
    }

    // Get the doctor at current index
    const doctorId = queue.queue_order[queue.current_index];

    // Calculate next index (wrap around)
    const nextIndex = (queue.current_index + 1) % queue.queue_order.length;

    // Update the queue index in the database
    const { error } = await supabase
      .from('doctor_queue')
      .update({ current_index: nextIndex })
      .eq('id', queue.id);

    if (error) {
      console.error('Queue update error:', error);
      toast({ type: 'error', message: 'Sıra güncellenemedi.' });
      return doctorId; // Return the doctor anyway
    }

    // Update local state
    setQueueData({ ...queue, current_index: nextIndex });

    return doctorId;
  };

  const getNextDoctorInQueue = (): Doctor | null => {
    if (!queueData || queueData.queue_order.length === 0) return null;
    const doctorId = queueData.queue_order[queueData.current_index];
    return users.find(u => u.id === doctorId) || null;
  };

  // Initialize queue when component mounts or when users change
  useEffect(() => {
    if (currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
      initializeQueue();
    }
  }, [currentUser, users]);

  // Fetch password change history when admin modal opens
  useEffect(() => {
    if (showAddUserModal && currentUser?.role === 'admin') {
      fetchPasswordChangeHistory();
    }
  }, [showAddUserModal]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u: Doctor) => u.id === selectedLoginUser);
    if (user && user.pin === loginPin) {
      setCurrentUser(user);
      setLoginPin('');
      // Trigger fetch for this user
      fetchData(user);
    } else {
      toast({ type: 'error', message: 'Hatalı PIN!' });
    }
  };

  const fetchPasswordChangeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('password_change_log')
        .select('doctor_id, changed_at')
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Create a map of doctor_id to most recent change date
      const changeMap: Record<string, string> = {};
      data?.forEach(log => {
        if (!changeMap[log.doctor_id]) {
          changeMap[log.doctor_id] = log.changed_at;
        }
      });

      setPasswordChanges(changeMap);
    } catch (error) {
      console.error('Failed to fetch password change history:', error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validation
    if (currentUser.pin !== currentPin) {
      toast({ type: 'error', message: 'Mevcut PIN hatalı!' });
      return;
    }

    if (newPin.length < 4) {
      toast({ type: 'error', message: 'Yeni PIN en az 4 haneli olmalıdır!' });
      return;
    }

    if (newPin !== confirmPin) {
      toast({ type: 'error', message: 'Yeni PIN eşleşmiyor!' });
      return;
    }

    if (newPin === currentPin) {
      toast({ type: 'error', message: 'Yeni PIN eskisiyle aynı olamaz!' });
      return;
    }

    setLoading(true);

    try {
      // Update password in doctors table
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ pin: newPin })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Log the password change
      const { error: logError } = await supabase
        .from('password_change_log')
        .insert({
          doctor_id: currentUser.id,
          changed_by: currentUser.name,
          ip_address: null, // Can be added with IP detection library if needed
          user_agent: navigator.userAgent
        });

      if (logError) console.warn('Password change log failed:', logError);

      // Update local state
      setCurrentUser({ ...currentUser, pin: newPin });

      // Reset form
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setShowChangePasswordModal(false);

      toast({ type: 'success', message: 'Şifreniz başarıyla değiştirildi!' });

      // Refresh users list
      fetchData();
    } catch (error) {
      console.error('Password change error:', error);
      toast({ type: 'error', message: 'Şifre değiştirme hatası!' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.pin) return;
    setLoading(true);

    if (editingDoctorId) {
      const { error } = await supabase.from('doctors').update({
        name: newDoctor.name,
        pin: newDoctor.pin,
        role: newDoctor.role || 'doctor'
      }).eq('id', editingDoctorId);
      if (error) toast({ type: 'error', message: 'Kullanıcı güncellenemedi. Lütfen tekrar deneyin.' });
      else {
        setEditingDoctorId(null);
        setNewDoctor({ name: '', pin: '', role: 'doctor' });
        toast({ type: 'success', message: 'Kullanıcı güncellendi!' });
        const { data } = await supabase.from('doctors').select('*');
        if (data) setUsers(data);
      }
    } else {
      const { error } = await supabase.from('doctors').insert({
        name: newDoctor.name,
        role: newDoctor.role || 'doctor',
        pin: newDoctor.pin
      });
      if (error) toast({ type: 'error', message: 'Yeni kullanıcı eklenemedi. PIN zaten kullanımda olabilir.' });
      else {
        setNewDoctor({ name: '', pin: '', role: 'doctor' });
        toast({ type: 'success', message: 'Yeni kullanıcı eklendi!' });
        // Refresh doctors list manually since fetchData(currentUser) might not fetch doctors
        const { data } = await supabase.from('doctors').select('*');
        if (data) setUsers(data);
      }
    }
    setLoading(false);
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Hekimi sil?')) return;
    setLoading(true);
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) toast({ type: 'error', message: 'Hekim silinemedi. Önce ilişkili kayıtları silin.' });
    else {
      toast({ type: 'success', message: 'Hekim silindi.' });
      fetchData();
    }
    setLoading(false);
  };

  // Duplicate patient check helper
  const checkForDuplicatePatient = async (name: string, phone: string) => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Check for exact phone match
    if (trimmedPhone) {
      const { data: phoneMatches } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', trimmedPhone);

      if (phoneMatches && phoneMatches.length > 0) {
        return { hasDuplicate: true, duplicates: phoneMatches };
      }
    }

    // Check for similar names
    if (trimmedName) {
      const { data: nameMatches } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', `%${trimmedName}%`);

      if (nameMatches && nameMatches.length > 0) {
        return { hasDuplicate: true, duplicates: nameMatches };
      }
    }

    return { hasDuplicate: false, duplicates: [] };
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // DUPLIKASYON KONTROLÜ - Check for duplicate patients
    if (!proceedWithDuplicate) {
      const duplicateCheck = await checkForDuplicatePatient(
        newPatient.name,
        newPatient.phone
      );

      if (duplicateCheck.hasDuplicate) {
        setDuplicatePatients(duplicateCheck.duplicates);
        setShowDuplicateWarning(true);
        return;
      }
    }

    // Hekim ID belirleme
    let doctorId = currentUser.id;
    let doctorName = currentUser.name;
    let assignmentType: 'queue' | 'preference' = 'preference'; // Default to preference

    if (currentUser.role === 'banko' || currentUser.role === 'asistan') {
      // Check if doctor was selected via the selection modal
      if (!selectedDoctorForPatient) {
        toast({ type: 'error', message: 'Lütfen hekim seçin' });
        return;
      }
      doctorId = selectedDoctorForPatient;
      const selectedDoc = users.find(u => u.id === selectedDoctorForPatient);
      doctorName = selectedDoc?.name || '';

      // Determine assignment type based on selection method
      if (doctorSelectionMethod === 'queue') {
        assignmentType = 'queue';
      } else {
        assignmentType = 'preference';
      }
    }

    setLoading(true);
    const { data, error } = await supabase.from('patients').insert({
      doctor_id: doctorId,
      doctor_name: doctorName,
      name: newPatient.name,
      phone: newPatient.phone,
      anamnez: hasPermission.editAnamnez(currentUser.role) ? newPatient.anamnez : '',
      assignment_type: assignmentType,
      assignment_date: new Date().toISOString().split('T')[0]
    }).select();

    if (error) toast({ type: 'error', message: 'Hasta eklenemedi. Lütfen tüm bilgileri kontrol edin.' });
    else {
      setNewPatient({ name: '', phone: '', anamnez: '' });
      setSelectedDoctorForPatient('');
      setDoctorSelectionMethod(null);
      setShowAddPatientModal(false);
      if (data && data[0]) setSelectedPatientId(data[0].id);
      toast({ type: 'success', message: 'Yeni hasta eklendi!' });
      fetchData();
    }
    setLoading(false);

    // Reset duplicate flags
    setProceedWithDuplicate(false);
    setDuplicatePatients([]);
  };

  const handleDoctorSelectionConfirm = async () => {
    if (doctorSelectionMethod === 'queue') {
      // Get next doctor from queue
      const nextDoctorId = await getNextDoctor();
      if (nextDoctorId) {
        setSelectedDoctorForPatient(nextDoctorId);
        setShowDoctorSelectionModal(false);
        setShowAddPatientModal(true);
      }
    } else if (doctorSelectionMethod === 'manual') {
      // User will select from dropdown in the patient modal
      if (!selectedDoctorForPatient) {
        toast({ type: 'error', message: 'Lütfen bir hekim seçin' });
        return;
      }
      setShowDoctorSelectionModal(false);
      setShowAddPatientModal(true);
    }
  };

  const handleNewPatientClick = () => {
    // For banko/asistan, show doctor selection modal first
    if (currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
      setShowDoctorSelectionModal(true);
    } else {
      setShowAddPatientModal(true);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return;
    setLoading(true);
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) toast({ type: 'error', message: error.message });
    else {
      if (selectedPatientId === id) setSelectedPatientId(null);
      toast({ type: 'success', message: 'Hasta silindi.' });
      fetchData();
    }
    setLoading(false);
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingPatient) return;

    setLoading(true);
    const { error } = await supabase
      .from('patients')
      .update({
        name: editingPatient.name,
        phone: editingPatient.phone,
        anamnez: hasPermission.editAnamnez(currentUser.role) ? editingPatient.anamnez : editingPatient.anamnez
      })
      .eq('id', editingPatient.id);

    if (error) {
      toast({ type: 'error', message: error.message });
    } else {
      setShowEditPatientModal(false);
      setEditingPatient(null);
      toast({ type: 'success', message: 'Hasta bilgileri güncellendi!' });
      fetchData();
    }
    setLoading(false);
  };

  // Treatment form now handled by TreatmentForm component

  const handleDeleteTreatment = async (id: string) => {
    if (!confirm('Sil?')) return;
    setLoading(true);
    const { error } = await supabase.from('treatments').delete().eq('id', id);
    if (error) toast({ type: 'error', message: error.message });
    else {
      toast({ type: 'success', message: 'İşlem silindi.' });
      fetchData();
    }
    setLoading(false);
  };

  const handleMarkAsCompleted = async (treatmentId: string) => {
    if (!confirm('Bu tedaviyi yapıldı olarak işaretlemek istediğinize emin misiniz?')) return;

    setLoading(true);

    const { error } = await supabase
      .from('treatments')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString()
      })
      .eq('id', treatmentId);

    if (error) {
      toast({ type: 'error', message: 'Güncelleme hatası: ' + error.message });
    } else {
      toast({ type: 'success', message: 'Tedavi tamamlandı olarak işaretlendi!' });
      fetchData();
    }

    setLoading(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !paymentForm.patient_id || paymentForm.payment_amount <= 0) {
      toast({ type: 'error', message: 'Hasta ve tutar gerekli' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('treatments').insert({
      patient_id: paymentForm.patient_id,
      tooth_no: '', // Boş = ödeme kaydı
      procedure: `ÖDEME - ${paymentForm.payment_status === 'paid' ? 'Tam Ödendi' : 'Kısmi Ödeme'}`,
      cost: paymentForm.payment_amount,
      notes: paymentForm.payment_note || '',
      added_by: currentUser.name,
      payment_status: 'paid',
      payment_amount: paymentForm.payment_amount,
      payment_note: paymentForm.payment_note
    });

    if (error) {
      toast({ type: 'error', message: error.message });
    } else {
      toast({ type: 'success', message: 'Ödeme kaydedildi!' });
      setShowPaymentModal(false);
      setPaymentForm({ patient_id: '', payment_amount: 0, payment_status: 'paid', payment_note: '' });
      await supabase.from('patients').update({ updated_at: new Date().toISOString() }).eq('id', paymentForm.patient_id);
      fetchData();
    }
    setLoading(false);
  };


  // --- RENDER ---

  // 1. Error State
  if (dbError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 bg-gray-100 text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg">
          <Cloud className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Supabase Bağlantı Hatası</h2>
          <p className="text-gray-600 mb-4">Lütfen .env.local dosyasındaki ayarları kontrol edin.</p>
        </div>
      </div>
    );
  }

  // 2. Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm relative">
          {loading && <div className="absolute top-4 right-4"><div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>}
          <div className="text-center mb-8">
            <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cloud size={32} className="text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Kurtbeyoğlu Ağız ve Diş Sağlığı Polikliniği</h1>
            <p className="text-gray-500 text-sm">Modern Diş Kliniği Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Seçin</label>
              <select
                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 font-medium"
                value={selectedLoginUser}
                onChange={(e) => setSelectedLoginUser(e.target.value)}
                required
                disabled={loading}
              >
                <option value="" className="text-gray-400">Seçiniz...</option>
                {users.map(u => (
                  <option
                    key={u.id}
                    value={u.id}
                    className="text-gray-900 font-normal py-2"
                  >
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Şifresi (PIN)</label>
              <input
                type="password"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest text-lg"
                placeholder="****"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <button disabled={loading} type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition shadow-lg disabled:opacity-50">
              {loading ? 'Yükleniyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Main Screen
  return (
    <div className="flex h-screen overflow-hidden text-gray-800 bg-gray-50">

      {/* Mobile Header Bar (only visible on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm">
        <div className={cn("p-4 text-white flex justify-between items-center",
          currentUser.role === 'admin' ? 'bg-indigo-600' :
            currentUser.role === 'doctor' ? 'bg-teal-600' :
              currentUser.role === 'banko' ? 'bg-amber-600' :
                'bg-purple-600'
        )}>
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            {showMobileSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-sm">Kurtbeyoğlu Diş Kliniği</h1>
            <p className="text-xs opacity-80">{currentUser.name}</p>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-white/20 rounded-full transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <HelpButton userRole={currentUser.role} />

      {/* SIDEBAR */}
      <div className={cn(
        "bg-white border-r flex flex-col shadow-lg relative h-full transition-transform duration-300",
        "md:w-1/3 lg:w-1/4 md:relative md:translate-x-0",
        "fixed top-0 left-0 bottom-0 w-[85%] max-w-sm z-40",
        showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {loading && <div className="absolute top-0 left-0 w-full h-1 bg-teal-100"><div className="h-full bg-teal-500 animate-pulse w-1/2"></div></div>}

        {/* Header - Desktop only */}
        <div className={cn("hidden md:flex p-4 text-white justify-between items-center shadow-md",
          currentUser.role === 'admin' ? 'bg-indigo-600' :
            currentUser.role === 'doctor' ? 'bg-teal-600' :
              currentUser.role === 'banko' ? 'bg-amber-600' :
                'bg-purple-600'
        )}>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              {currentUser.role === 'admin' ? <Shield size={18} /> :
                currentUser.role === 'doctor' ? <Activity size={18} /> :
                  currentUser.role === 'banko' ? <User size={18} /> :
                    <Users size={18} />}
              {currentUser.name}
            </h1>
            <p className="text-xs text-white opacity-80 flex items-center gap-1">
              <Cloud size={10} /> Kurtbeyoğlu Diş Kliniği
            </p>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <button onClick={() => fetchData()} className="p-2 hover:bg-white/20 rounded-full transition" title="Yenile">
              <RefreshCcw size={18} />
            </button>
            <button onClick={() => setShowChangePasswordModal(true)} className="p-2 hover:bg-white/20 rounded-full transition" title="Şifremi Değiştir">
              <Lock size={18} />
            </button>
            <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-white/20 rounded-full transition" title="Çıkış Yap">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Header Inside Sidebar */}
        <div className="md:hidden p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">{currentUser.name}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {currentUser.role === 'admin' ? <Shield size={12} /> :
                  currentUser.role === 'doctor' ? <Activity size={12} /> :
                    currentUser.role === 'banko' ? <User size={12} /> :
                      <Users size={12} />}
                {currentUser.role === 'admin' ? 'ADMIN' :
                  currentUser.role === 'doctor' ? 'HEKİM' :
                    currentUser.role === 'banko' ? 'BANKO' :
                      'ASİSTAN'}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => fetchData()} className="p-2 hover:bg-gray-100 rounded-full transition" title="Yenile">
                <RefreshCcw size={18} className="text-gray-600" />
              </button>
              <button onClick={() => setShowChangePasswordModal(true)} className="p-2 hover:bg-gray-100 rounded-full transition" title="Şifremi Değiştir">
                <Lock size={18} className="text-gray-600" />
              </button>
              <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition" title="Çıkış Yap">
                <LogOut size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Button */}
        {hasPermission.manageUsers(currentUser.role) && (
          <div className="p-2 bg-indigo-50 border-b">
            <button onClick={() => setShowAddUserModal(true)} className="flex items-center justify-center gap-2 w-full p-2 bg-white border border-indigo-200 rounded hover:bg-indigo-100 text-indigo-700 font-medium text-sm transition">
              <Users size={16} /> Hekim Yönetimi
            </button>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="p-2 bg-gray-100 dark:bg-slate-700 border-b flex gap-1">
          <button
            onClick={() => setActiveTab('patients')}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 transition",
              activeTab === 'patients'
                ? "bg-white dark:bg-slate-800 shadow text-teal-600"
                : "text-gray-500 hover:bg-white/50"
            )}
          >
            <Users size={14} /> Hastalar
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 transition",
              activeTab === 'appointments'
                ? "bg-white dark:bg-slate-800 shadow text-teal-600"
                : "text-gray-500 hover:bg-white/50"
            )}
          >
            <Calendar size={14} /> Randevular
          </button>
          {/* Dashboard tab - SADECE ADMIN ve HEKİM için */}
          {hasPermission.viewDashboard(currentUser.role) && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 transition",
                activeTab === 'dashboard'
                  ? "bg-white dark:bg-slate-800 shadow text-teal-600"
                  : "text-gray-500 hover:bg-white/50"
              )}
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
          )}
        </div>

        {/* Search & Add Patient */}
        {activeTab === 'patients' && (
          <div className="p-4 border-b space-y-3 bg-gray-50 dark:bg-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={hasPermission.viewAllPatients(currentUser.role) ? "Tüm hastalarda ara..." : "Kendi hastalarında ara..."}
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleNewPatientClick}
              className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition flex justify-center items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> Yeni Hasta Ekle
            </button>
          </div>
        )}

        {/* Patient List or Appointments */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'appointments' ? (
            <AppointmentsTab
              currentUser={currentUser}
              patients={patients}
              selectedDate={appointmentDate}
              onDateChange={setAppointmentDate}
              toast={toast}
            />
          ) : (
            <>
              {filteredPatients.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  <p>Kayıt bulunamadı.</p>
                </div>
              ) : (
                <ul>
                  {filteredPatients.map(p => (
                    <li
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={cn("p-4 border-b cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 transition relative", selectedPatientId === p.id && 'bg-teal-50 dark:bg-slate-700 border-l-4 border-l-teal-600')}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Phone size={12} /> {p.phone || 'Tel yok'}
                          </p>
                          {hasPermission.viewAllPatients(currentUser.role) && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                              Hekim: {p.doctor_name || 'Bilinmiyor'}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {p.updated_at && (
                            <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full">
                              {new Date(p.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* DETAIL PANEL */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0">
        {activeTab === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
            <Dashboard
              patients={patients}
              treatments={treatments}
              doctors={users}
              currentUser={currentUser}
            />
          </div>
        ) : activePatient ? (
          <>
            {/* Patient Header */}
            <div className="bg-white p-4 md:p-6 shadow-sm border-b flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  {activePatient.name}
                </h2>
                <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-gray-100 px-2 md:px-3 py-1 rounded-full">
                    <Phone size={14} /> {activePatient.phone}
                  </span>
                  <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 md:px-3 py-1 rounded-full">
                    <User size={14} /> Sorumlu: {activePatient.doctor_name}
                  </span>
                </div>

                <div className="mt-4">
                  <PatientImageGallery patientId={activePatient.id} currentUser={currentUser} />
                </div>

                {activePatient.anamnez && (
                  <div className="mt-3 p-2 md:p-3 bg-red-50 text-red-700 text-xs md:text-sm rounded-lg border border-red-100">
                    <strong>⚠️ Anamnez:</strong> {activePatient.anamnez}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                <PatientReportButton patient={activePatient} treatments={activePatient.treatments || []} />
                {((currentUser.role === 'admin' || currentUser.role === 'banko' || currentUser.role === 'asistan') ||
                  (currentUser.role === 'doctor' && activePatient.doctor_id === currentUser.id)) && (
                    <button
                      onClick={() => {
                        setEditingPatient(activePatient);
                        setShowEditPatientModal(true);
                      }}
                      className="text-gray-400 hover:text-blue-500 transition p-2"
                      title="Hasta Bilgilerini Düzenle"
                    >
                      <Edit size={20} />
                    </button>
                  )}
                {hasPermission.deletePatient(currentUser.role) &&
                  (currentUser.role === 'admin' || activePatient.doctor_id === currentUser.id) && (
                    <button
                      onClick={() => handleDeletePatient(activePatient.id)}
                      className="text-gray-400 hover:text-red-500 transition p-2"
                      title="Hastayı Sil"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">

              {(hasPermission.addTreatment(currentUser.role) &&
                ((currentUser.role === 'admin' || currentUser.role === 'asistan') ||
                  (currentUser.role === 'doctor' && activePatient.doctor_id === currentUser.id))) && (
                  <TreatmentForm
                    currentUser={currentUser}
                    selectedPatientId={selectedPatientId}
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
                    onClick={() => {
                      setPaymentForm({ ...paymentForm, patient_id: activePatient.id });
                      setShowPaymentModal(true);
                    }}
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
                    ? activePatient?.treatments?.length || 0
                    : activePatient?.treatments?.filter(t => t.status === key).length || 0;

                  return (
                    <button
                      key={key}
                      onClick={() => setTreatmentFilter(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${treatmentFilter === key
                          ? 'bg-teal-600 text-white shadow'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {icon} {label} ({count})
                    </button>
                  );
                })}
              </div>

              <h3 className="text-lg font-semibold text-gray-700 mb-4 px-1">Tedavi Geçmişi</h3>
              {!activePatient.treatments || activePatient.treatments.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                  <p className="text-gray-400">Henüz işlem kaydı yok.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activePatient.treatments
                    .filter(t => treatmentFilter === 'all' || t.status === treatmentFilter)
                    .map((t) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition relative group ${t.status === 'planned'
                            ? 'bg-blue-50 border-blue-200'
                            : t.status === 'completed'
                              ? 'bg-white'
                              : 'bg-gray-50 border-gray-300'
                          }`}
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
                          {/* Mark as Completed Button (for planned treatments) */}
                          {t.status === 'planned' && hasPermission.addTreatment(currentUser.role) && (
                            <button
                              onClick={() => handleMarkAsCompleted(t.id)}
                              className="bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-700 font-medium"
                              title="Yapıldı Olarak İşaretle"
                            >
                              ✓ Yapıldı
                            </button>
                          )}

                          {/* Delete Button */}
                          {(hasPermission.addTreatment(currentUser.role) &&
                            ((currentUser.role === 'admin' || currentUser.role === 'asistan') ||
                              (currentUser.role === 'doctor' && activePatient.doctor_id === currentUser.id))) && (
                              <button
                                onClick={() => handleDeleteTreatment(t.id)}
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
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User size={48} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-medium text-gray-600">Hasta Seçilmedi</h2>
            <p className="mt-2">İşlem yapmak için soldan bir hasta seçin.</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Doctor Selection Modal (for BANKO/ASISTAN) */}
      {showDoctorSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Hekim Seçimi</h3>
              <button
                onClick={() => {
                  setShowDoctorSelectionModal(false);
                  setDoctorSelectionMethod(null);
                  setSelectedDoctorForPatient('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Yeni hasta eklemeden önce hekim seçim yönteminizi belirleyin:
            </p>

            <div className="space-y-4">
              {/* Option 1: Manual Selection */}
              <div
                onClick={() => setDoctorSelectionMethod('manual')}
                className={cn(
                  "border-2 rounded-xl p-5 cursor-pointer transition hover:shadow-lg",
                  doctorSelectionMethod === 'manual'
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                    doctorSelectionMethod === 'manual'
                      ? "border-teal-500 bg-teal-500"
                      : "border-gray-300"
                  )}>
                    {doctorSelectionMethod === 'manual' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800 mb-2">
                      Hekim Tercihi Var
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Hasta belirli bir hekimi talep ediyor veya tercih ediyor
                    </p>
                    {doctorSelectionMethod === 'manual' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hekim Seçin *
                        </label>
                        <select
                          value={selectedDoctorForPatient}
                          onChange={(e) => setSelectedDoctorForPatient(e.target.value)}
                          className="w-full p-3 border border-teal-300 rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                          required
                        >
                          <option value="">Hekim Seçiniz...</option>
                          {users.filter(u => u.role === 'doctor').map(doc => (
                            <option key={doc.id} value={doc.id}>{doc.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Queue Assignment */}
              <div
                onClick={() => setDoctorSelectionMethod('queue')}
                className={cn(
                  "border-2 rounded-xl p-5 cursor-pointer transition hover:shadow-lg",
                  doctorSelectionMethod === 'queue'
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-amber-300"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                    doctorSelectionMethod === 'queue'
                      ? "border-amber-500 bg-amber-500"
                      : "border-gray-300"
                  )}>
                    {doctorSelectionMethod === 'queue' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800 mb-2">
                      Sıradaki Hekime Ata
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Sistem otomatik olarak günlük sıradaki hekime atama yapar
                    </p>
                    {queueData && (
                      <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg">
                        <p className="text-sm font-semibold text-amber-800">
                          📋 Sıradaki Hekim:{' '}
                          <span className="text-amber-900">
                            {getNextDoctorInQueue()?.name || 'Yükleniyor...'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowDoctorSelectionModal(false);
                  setDoctorSelectionMethod(null);
                  setSelectedDoctorForPatient('');
                }}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-base transition"
              >
                İptal
              </button>
              <button
                onClick={handleDoctorSelectionConfirm}
                disabled={!doctorSelectionMethod || (doctorSelectionMethod === 'manual' && !selectedDoctorForPatient)}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Yeni Hasta Kartı</h3>
              <button onClick={() => setShowAddPatientModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                <input type="text" required placeholder="Ad Soyad" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" placeholder="Telefon" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} />
              </div>
              {(currentUser.role === 'banko' || currentUser.role === 'asistan') && selectedDoctorForPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seçilen Hekim</label>
                  <div className="w-full p-3 border border-teal-200 bg-teal-50 rounded-lg text-base font-semibold text-teal-800">
                    {users.find(u => u.id === selectedDoctorForPatient)?.name || 'Bilinmiyor'}
                  </div>
                </div>
              )}
              {hasPermission.editAnamnez(currentUser.role) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anamnez</label>
                  <textarea placeholder="Anamnez..." className="w-full p-3 border border-red-200 bg-red-50 rounded-lg text-base focus:ring-2 focus:ring-red-300 outline-none" rows={3} value={newPatient.anamnez} onChange={e => setNewPatient({ ...newPatient, anamnez: e.target.value })}></textarea>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50">{loading ? 'Kaydediyor...' : 'Kaydet'}</button>
            </form>
          </div>
        </div>
      )}

      {showEditPatientModal && editingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Hasta Bilgilerini Düzenle</h3>
              <button onClick={() => { setShowEditPatientModal(false); setEditingPatient(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleEditPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input type="text" required placeholder="Ad Soyad" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={editingPatient.name} onChange={e => setEditingPatient({ ...editingPatient, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" placeholder="Telefon" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={editingPatient.phone || ''} onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anamnez</label>
                <textarea placeholder="Anamnez..." className="w-full p-3 border border-red-200 bg-red-50 rounded-lg text-base focus:ring-2 focus:ring-red-300 outline-none" rows={3} value={editingPatient.anamnez || ''} onChange={e => setEditingPatient({ ...editingPatient, anamnez: e.target.value })}></textarea>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowEditPatientModal(false); setEditingPatient(null); }} className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50 text-base">İptal</button>
                <button type="submit" disabled={loading} className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50">{loading ? 'Kaydediliyor...' : 'Güncelle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-amber-800">Ödeme Ekle</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta *</label>
                <select
                  value={paymentForm.patient_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, patient_id: e.target.value })}
                  className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                >
                  <option value="">Hasta Seçin</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: Number(e.target.value) })}
                  className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum *</label>
                <select
                  value={paymentForm.payment_status}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value as PaymentStatus })}
                  className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="paid">Tam Ödendi</option>
                  <option value="partial">Kısmi Ödeme</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
                <textarea
                  value={paymentForm.payment_note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_note: e.target.value })}
                  className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                  rows={3}
                  placeholder="Ödeme notu (isteğe bağlı)"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50 text-base"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-bold hover:bg-amber-700 text-base disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Lock size={20} className="text-teal-600" />
                Şifre Değiştir
              </h3>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mevcut PIN
                </label>
                <input
                  type="password"
                  placeholder="****"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                  required
                  maxLength={6}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni PIN
                </label>
                <input
                  type="password"
                  placeholder="****"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                  required
                  minLength={4}
                  maxLength={6}
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">En az 4 haneli olmalıdır</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni PIN (Tekrar)
                </label>
                <input
                  type="password"
                  placeholder="****"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-center tracking-widest"
                  required
                  minLength={4}
                  maxLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPin('');
                    setNewPin('');
                    setConfirmPin('');
                  }}
                  className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Değiştir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Patient Warning Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-orange-600 mb-4">
              ⚠️ Benzer Hasta Kaydı Bulundu
            </h3>

            <p className="text-gray-700 mb-4">
              Sistemde benzer hasta(lar) mevcut:
            </p>

            <div className="space-y-2 mb-6">
              {duplicatePatients.map(p => (
                <div key={p.id} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-sm text-gray-600">
                    📞 {p.phone || 'Tel yok'} | 👨‍⚕️ {p.doctor_name}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setShowDuplicateWarning(false);
                      setShowAddPatientModal(false);
                      setDuplicatePatients([]);
                      toast({ type: 'info', message: 'Mevcut hasta seçildi' });
                    }}
                    className="mt-2 text-sm text-teal-600 hover:underline font-medium"
                  >
                    Bu hastayı seç →
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setProceedWithDuplicate(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  setProceedWithDuplicate(true);
                  setShowDuplicateWarning(false);
                  // Re-trigger form submission after a brief delay
                  setTimeout(() => {
                    const form = document.querySelector('form[data-patient-form]');
                    if (form) {
                      const event = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(event);
                    }
                  }, 100);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition"
              >
                Yine de Yeni Hasta Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-indigo-800">Hekim Yönetimi</h3>
              <button onClick={() => { setShowAddUserModal(false); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4 bg-gray-50 p-4 rounded-lg mb-6 border">
              <div className="text-sm font-bold text-gray-700 mb-2">{editingDoctorId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad</label>
                  <input type="text" required placeholder="Ad Soyad" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none" value={newDoctor.name} onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">PIN</label>
                  <input type="text" required placeholder="PIN" className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none" value={newDoctor.pin} onChange={e => setNewDoctor({ ...newDoctor, pin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                  <select
                    value={newDoctor.role || 'doctor'}
                    onChange={(e) => setNewDoctor({ ...newDoctor, role: e.target.value as DoctorRole })}
                    className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="doctor">HEKİM</option>
                    <option value="banko">BANKO</option>
                    <option value="asistan">ASİSTAN</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm text-base disabled:opacity-50">{loading ? '...' : (editingDoctorId ? 'Güncelle' : 'Ekle')}</button>
                {editingDoctorId && <button type="button" onClick={() => { setEditingDoctorId(null); setNewDoctor({ name: '', pin: '', role: 'doctor' }); }} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 font-medium text-base">İptal</button>}
              </div>
            </form>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} className="text-gray-500" /> Mevcut Hekimler
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {users.filter(u => u.role !== 'admin').length === 0 && <p className="text-sm text-gray-400 italic">Henüz kayıtlı hekim yok.</p>}
                {users.filter(u => u.role !== 'admin').map(doctor => (
                  <div key={doctor.id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:shadow-sm transition group">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{doctor.name}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          doctor.role === 'doctor' ? 'bg-teal-100 text-teal-700' :
                            doctor.role === 'banko' ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                        )}>
                          {doctor.role === 'doctor' ? 'HEKİM' :
                            doctor.role === 'banko' ? 'BANKO' :
                              'ASİSTAN'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-400 font-mono tracking-wider">PIN: {doctor.pin}</span>
                        <div className="text-xs text-gray-500">
                          Son şifre değişikliği:{' '}
                          {passwordChanges[doctor.id]
                            ? new Date(passwordChanges[doctor.id]).toLocaleString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : 'Hiç değiştirilmedi'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition">
                      <button onClick={() => { setEditingDoctorId(doctor.id); setNewDoctor({ name: doctor.name, pin: doctor.pin, role: doctor.role }); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition" title="Düzenle">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteDoctor(doctor.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AIAssistant />

      {/* Yardım Sistemi */}

    </div>
  );
}

// Appointments Tab Component
interface AppointmentsTabProps {
  currentUser: Doctor;
  patients: Patient[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  toast: (options: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void;
}

function AppointmentsTab({ currentUser, patients, selectedDate, onDateChange, toast }: AppointmentsTabProps) {
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
