'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User, Users, Lock, LogOut, Shield, Plus, Search, Trash2,
  Save, RefreshCcw, Phone, Activity, Clock, Cloud, WifiOff, Edit, LayoutDashboard, Calendar, Menu, X, DollarSign, ArrowLeft, Loader2, Banknote
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AIAssistant from '@/components/AIAssistant';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { useDoctors } from '@/hooks/useDoctors';
import { usePatients } from '@/hooks/usePatients';
import { useTreatments } from '@/hooks/useTreatments';
import { useQueue } from '@/hooks/useQueue';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dashboard } from '@/features/dashboard';
import { VoiceInput } from '@/components/VoiceInput';
import { PatientReportButton } from '@/components/ReportExport';
import { AppointmentsTab } from '@/features/appointments';

import { HelpButton } from '@/components/HelpModal';
import { PatientImageGallery } from '@/components/PatientImageGallery';
import { PaymentModal, PaymentQuickAccess } from '@/features/payments';
import { CommandCenter } from '@/features/dashboard/CommandCenter';
import { LoginForm } from '@/features/auth';
import { DoctorSelectionModal } from '@/features/queue';
import { PatientList, PatientDetail } from '@/features/patients';
import {
  DoctorRole, PaymentStatus, Doctor, Patient, Treatment, TreatmentStatus, QueueData
} from '@/lib/types';
import {
  cn, formatPhoneNumber, sanitizePhoneNumber, isValidPhoneNumber, getLocalDateString, formatCurrency
} from '@/lib/utils';

import { hasPermission, canDeletePatient } from '@/lib/permissions';
import { useActivityLogger } from '@/hooks/useActivityLogger';



export default function Home() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  // Appointments - moved here but will be used conditionally
  const [appointmentDate, setAppointmentDate] = useState(new Date());

  // --- STATE ---
  const { doctors: users, setDoctors: setUsers, refreshDoctors } = useDoctors();


  const [currentUser, setCurrentUser] = useState<Doctor | null>(null);

  // Dependent Hooks
  const { patients, setPatients, refreshPatients, addPatient, updatePatient, deletePatient, checkDuplicate } = usePatients(currentUser);
  const { treatments, setTreatments, refreshTreatments, deleteTreatment, updateTreatment } = useTreatments(currentUser, patients);
  const { queueData, initializeQueue, getNextDoctor, getNextDoctorInQueue } = useQueue(currentUser, users);


  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Pull to Refresh State
  const [pullStart, setPullStart] = useState(0);
  const [pullChange, setPullChange] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Forms
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', anamnez: '' });
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [newDoctor, setNewDoctor] = useState<{ name: string; pin: string; role: DoctorRole }>({ name: '', pin: '', role: 'doctor' });
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const canSaveNewPatient = useMemo(
    () => newPatient.name.trim().length > 0 && isValidPhoneNumber(newPatient.phone),
    [newPatient.name, newPatient.phone]
  );

  const canSaveEditedPatient = useMemo(
    () => editingPatient ? editingPatient.name.trim().length > 0 && isValidPhoneNumber(editingPatient.phone || '') : false,
    [editingPatient?.name, editingPatient?.phone]
  );

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    payment_amount: 0,
    payment_status: 'paid' as PaymentStatus,
    payment_note: ''
  });

  // Doctor selection for patient creation (BANKO/ASISTAN)
  const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState('');


  const [assignmentMethod, setAssignmentMethod] = useState<'manual' | 'queue' | null>(null);
  const [showPaymentQuickAccess, setShowPaymentQuickAccess] = useState(false);

  // Track recent queue assignments for consecutive detection
  const [recentQueueAssignments, setRecentQueueAssignments] = useState<{
    doctorId: string;
    doctorName: string;
    timestamp: number;
  }[]>([]);

  // COMMAND CENTER STATE
  const [showCommandCenter, setShowCommandCenter] = useState(false);

  // --- FETCHING ---
  // Global Keyboard Shortcuts (Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandCenter((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const fetchData = async (overrideUser?: Doctor) => {
    // Use the passed user or current user, but if neither, do not fetch sensitive data
    const activeUser = overrideUser || currentUser;
    if (!supabase || !activeUser) return;

    setLoading(true);
    try {
      // 1. Doctors (Managed by useDoctors)
      await refreshDoctors();
      // 2. Patients (Managed by usePatients)
      await refreshPatients();
      // 3. Treatments (Managed by useTreatments)
      await refreshTreatments();

      setDbError(false);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast({ type: 'error', message: 'Veri çekme hatası.' });
      setDbError(true);
    } finally {
      setLoading(false);
    }
  };



  // Listen for changes
  useEffect(() => {
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (currentUser) fetchData(currentUser); // Refresh if logged in
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);


  // --- FILTERING ---
  const patientsWithTreatments = useMemo(() => {
    return patients.map((p: Patient) => ({
      ...p,
      treatments: treatments.filter((t: Treatment) => t.patient_id === p.id)
    }));
  }, [patients, treatments]);

  const filteredPatients = useMemo(() => {
    let list = patientsWithTreatments;

    // Role-based filtering
    if (currentUser && !hasPermission.viewAllPatients(currentUser.role)) {
      list = list.filter((p: Patient) => p.doctor_id === currentUser.id);
    }

    // Search filtering
    list = list.filter((p: Patient) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && (
        p.phone.includes(searchTerm) ||
        p.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
      ))
    );

    // Date filtering (only for users who can see all patients)
    if (dateFilter !== 'all' && currentUser && hasPermission.viewAllPatients(currentUser.role)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      list = list.filter((p: Patient) => {
        if (!p.assignment_date) return false;
        const assignDate = new Date(p.assignment_date);
        assignDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case 'today':
            return assignDate.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return assignDate.getTime() === yesterday.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return assignDate >= weekAgo;
          default:
            return true;
        }
      });
    }

    return list;
  }, [patientsWithTreatments, searchTerm, currentUser, dateFilter]);

  const activePatient = patientsWithTreatments.find((p: Patient) => p.id === selectedPatientId);

  // Initialize queue when component mounts or when users change
  useEffect(() => {
    if (currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
      initializeQueue();
    }
  }, [currentUser, users, initializeQueue]);

  useEffect(() => {
    if (showDoctorSelectionModal && currentUser && (currentUser.role === 'banko' || currentUser.role === 'asistan')) {
      initializeQueue();
    }
  }, [showDoctorSelectionModal, currentUser]);

  // Clear assignment tracking when switching away from patients tab
  useEffect(() => {
    if (activeTab !== 'patients') {
      setRecentQueueAssignments([]);
    }
  }, [activeTab]);

  // Fetch password change history when admin modal opens
  useEffect(() => {
    if (showAddUserModal && currentUser?.role === 'admin') {
      fetchPasswordChangeHistory();
    }
  }, [showAddUserModal]);

  // --- HANDLERS ---
  // --- PULL TO REFRESH HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      setPullStart(e.targetTouches[0].clientY);
    } else {
      setPullStart(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullStart) return;
    const currentY = e.targetTouches[0].clientY;
    const diff = currentY - pullStart;
    if (diff > 0 && diff < 200) {
      setPullChange(diff);
    }
  };

  const handleTouchEnd = async () => {
    if (!pullStart) return;
    if (pullChange > 80) { // Threshold
      setIsRefreshing(true);
      setPullChange(80); // Snap to loading height
      await fetchData(); // Refresh
      setIsRefreshing(false);
      setPullChange(0);
    } else {
      setPullChange(0);
    }
    setPullStart(0);
  };

  const handleLogin = async (userId: string, pin: string): Promise<boolean> => {
    const user = users.find((u: Doctor) => u.id === userId);
    if (user && user.pin === pin) {
      setCurrentUser(user);
      await logActivity(user, 'LOGIN', { role: user.role });

      // Trigger fetch for this user
      await fetchData(user);
      if (user.role === 'banko' || user.role === 'asistan') {
        await initializeQueue();
      }
      return true;
    } else {
      toast({ type: 'error', message: 'Hatalı PIN!' });
      return false;
    }
  };

  const handleLogout = async () => {
    await logActivity(currentUser, 'LOGOUT');
    setCurrentUser(null);
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

    try {
      if (editingDoctorId) {
        const { error } = await supabase.from('doctors').update({
          name: newDoctor.name,
          pin: newDoctor.pin,
          role: newDoctor.role || 'doctor'
        }).eq('id', editingDoctorId);
        if (error) throw error;

        setEditingDoctorId(null);
        setNewDoctor({ name: '', pin: '', role: 'doctor' });
        toast({ type: 'success', message: 'Kullanıcı güncellendi!' });
        const { data } = await supabase.from('doctors').select('*');
        if (data) setUsers(data);
      } else {
        const { error } = await supabase.from('doctors').insert({
          name: newDoctor.name,
          role: newDoctor.role || 'doctor',
          pin: newDoctor.pin
        });
        if (error) throw error;

        setNewDoctor({ name: '', pin: '', role: 'doctor' });
        toast({ type: 'success', message: 'Yeni kullanıcı eklendi!' });
        // Refresh doctors list manually since fetchData(currentUser) might not fetch doctors
        const { data } = await supabase.from('doctors').select('*');
        if (data) setUsers(data);
      }
    } catch (error) {
      console.error('Doctor save error:', error);
      toast({ type: 'error', message: 'Kullanıcı kaydedilemedi. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Hekimi sil?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('doctors').delete().eq('id', id);
      if (error) throw error;
      toast({ type: 'success', message: 'Hekim silindi.' });
      fetchData();
    } catch (error) {
      console.error('Doctor delete error:', error);
      toast({ type: 'error', message: 'Hekim silinemedi. İnternet veya ilişkili kayıtları kontrol edin.' });
    } finally {
      setLoading(false);
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
      // DUPLIKASYON KONTROLÜ - Check for duplicate patients
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
        if (assignmentMethod === 'queue') {
          assignmentType = 'queue';
        } else {
          assignmentType = 'preference';
        }
      }

      // Check for consecutive queue assignments
      if (currentUser.role === 'banko' || currentUser.role === 'asistan') {
        if (assignmentType === 'queue' && assignmentMethod === 'queue') {
          // Check last assignments
          const recentSameDoctor = recentQueueAssignments.filter(
            (assignment) =>
              assignment.doctorId === doctorId &&
              Date.now() - assignment.timestamp < 3600000 // Within last hour
          );

          if (recentSameDoctor.length >= 1) {
            // Get current distribution for context
            const today = getLocalDateString();
            const todaysPatients = patients.filter(p => p.assignment_date === today);
            const doctorStats: Record<string, number> = {};

            todaysPatients.forEach(p => {
              if (p.assignment_type === 'queue') {
                doctorStats[p.doctor_id] = (doctorStats[p.doctor_id] || 0) + 1;
              }
            });

            const currentDoctorCount = (doctorStats[doctorId] || 0) + recentSameDoctor.length;
            const otherCounts = Object.values(doctorStats).filter((_, idx) =>
              Object.keys(doctorStats)[idx] !== doctorId
            );
            const avgOthers = otherCounts.length > 0
              ? Math.round(otherCounts.reduce((a, b) => a + b, 0) / otherCounts.length)
              : 0;

            toast({
              type: 'warning',
              message: `⚠️ Dikkat: ${doctorName} hekime arka arkaya ${recentSameDoctor.length + 1}. hasta ekleniyor! (Bugün: ${currentDoctorCount + 1}, Diğer hekimler ort: ${avgOthers})`,
              duration: 5000
            });
          }

          // Track this assignment
          setRecentQueueAssignments(prev => [
            ...prev.slice(-4), // Keep last 5 assignments
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
        // Log functionality
        await logActivity(currentUser, 'CREATE_PATIENT', {
          patient_id: data.id || (data[0] && data[0].id),
          name: trimmedName,
          doctor_name: doctorName
        });

        if (Array.isArray(data) && data[0]) setSelectedPatientId(data[0].id);
        else if (!Array.isArray(data) && data.id) setSelectedPatientId(data.id);
      }

      setNewPatient({ name: '', phone: '', anamnez: '' });
      setSelectedDoctorForPatient('');
      setAssignmentMethod(null);
      setShowAddPatientModal(false);

      toast({ type: 'success', message: 'Hasta kartı başarıyla kaydedildi.' });
      fetchData();
    } catch (error) {
      console.error('Patient add error:', error);
      toast({ type: 'error', message: 'Kayıt yapılamadı. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
      // Reset duplicate flags
      setProceedWithDuplicate(false);
      setDuplicatePatients([]);
    }
  };

  const handleDoctorSelection = async (method: 'manual' | 'queue', doctorId?: string) => {
    setAssignmentMethod(method);
    if (method === 'queue') {
      // Get next doctor from queue
      const nextDoctorId = await getNextDoctor();
      if (nextDoctorId) {
        setSelectedDoctorForPatient(nextDoctorId);
        setShowDoctorSelectionModal(false);
        setShowAddPatientModal(true);
      }
    } else if (method === 'manual') {
      // User will select from dropdown in the patient modal
      if (!doctorId) {
        toast({ type: 'error', message: 'Lütfen bir hekim seçin' });
        return;
      }
      setSelectedDoctorForPatient(doctorId);
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

  const openPatientEditor = (patient: Patient) => {
    setEditingPatient({ ...patient, phone: formatPhoneNumber(patient.phone || '') });
    setShowEditPatientModal(true);
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return;
    const { error } = await deletePatient(id);
    if (!error) {
      toast({ type: 'success', message: 'Hasta silindi.' });
      if (selectedPatientId === id) setSelectedPatientId(null);
    } else {
      toast({ type: 'error', message: 'Hasta silinemedi.' });
    }
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingPatient) return;

    const cleanedPhone = sanitizePhoneNumber(editingPatient.phone || '');
    if (!isValidPhoneNumber(editingPatient.phone || '')) {
      toast({ type: 'error', message: 'Geçerli bir telefon numarası girin.' });
      return;
    }

    const { error } = await updatePatient(editingPatient.id, {
      name: editingPatient.name.trim(),
      phone: cleanedPhone,
      anamnez: hasPermission.editAnamnez(currentUser.role) ? editingPatient.anamnez : editingPatient.anamnez
    });

    if (!error) {
      setShowEditPatientModal(false);
      setEditingPatient(null);
      toast({ type: 'success', message: 'Hasta bilgileri güncellendi!' });
    } else {
      toast({ type: 'error', message: 'Güncelleme başarısız.' });
    }
  };

  // Treatment form now handled by TreatmentForm component

  const handleDeleteTreatment = async (id: string) => {
    if (!confirm('Sil?')) return;
    const { error } = await deleteTreatment(id);
    if (!error) {
      toast({ type: 'success', message: 'İşlem silindi.' });
    } else {
      toast({ type: 'error', message: 'İşlem silinemedi.' });
    }
  };

  const handleMarkAsCompleted = async (treatmentId: string) => {
    if (!confirm('Bu tedaviyi yapıldı olarak işaretlemek istediğinize emin misiniz?')) return;
    const { error } = await updateTreatment(treatmentId, {
      status: 'completed',
      completed_date: new Date().toISOString()
    });

    if (!error) {
      toast({ type: 'success', message: 'Tedavi tamamlandı olarak işaretlendi!' });
    }
  };



  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
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
  // 2. Login Screen
  if (!currentUser) {
    return (
      <LoginForm
        users={users}
        loading={loading}
        onLogin={handleLogin}
      />
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
            <h1 className="font-bold text-sm">Özel Kurtbeyoğlu Polikliniği</h1>
            <p className="text-xs opacity-80">{currentUser.name}</p>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition">
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
        "bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-2xl relative h-full transition-transform duration-300",
        "md:w-1/3 lg:w-1/4 md:relative md:translate-x-0",
        "fixed top-0 left-0 bottom-0 w-[85%] max-w-sm z-40",
        showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {loading && <div className="absolute top-0 left-0 w-full h-1 bg-teal-100"><div className="h-full bg-teal-500 animate-pulse w-1/2"></div></div>}

        {/* Header - Desktop only */}
        <div className="hidden md:flex p-6 text-white justify-between items-center shadow-sm bg-[#0f172a]">
          <div>
            <h1 className="font-bold text-lg flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg bg-white p-1 object-contain" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100">{currentUser.name}</span>
                <span className="text-[10px] font-medium text-[#cca43b] uppercase tracking-wide">Özel Kurtbeyoğlu Polikliniği</span>
              </div>
            </h1>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <button onClick={() => fetchData()} className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white" title="Yenile">
              <RefreshCcw size={18} />
            </button>
            <button onClick={() => setShowChangePasswordModal(true)} className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white" title="Şifremi Değiştir">
              <Lock size={18} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Çıkış Yap">
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
        {/* Tab Toggle */}
        <div className="p-4 bg-[#1e293b] border-b border-slate-700 flex gap-2">
          <button
            onClick={() => setActiveTab('patients')}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all",
              activeTab === 'patients'
                ? "bg-[#0e7490] text-white shadow-lg shadow-[#0e7490]/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <Users size={16} /> <span className="uppercase tracking-wide">Hastalar</span>
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all",
              activeTab === 'appointments'
                ? "bg-[#0e7490] text-white shadow-lg shadow-[#0e7490]/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <Calendar size={16} /> <span className="uppercase tracking-wide">Randevular</span>
          </button>
          {/* Dashboard tab - SADECE ADMIN ve HEKİM için */}
          {hasPermission.viewDashboard(currentUser.role) && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all",
                activeTab === 'dashboard'
                  ? "bg-[#0e7490] text-white shadow-lg shadow-[#0e7490]/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <LayoutDashboard size={16} /> <span className="uppercase tracking-wide">Paneller</span>
            </button>
          )}
        </div>

        {/* Search & Add Patient */}
        {activeTab === 'patients' && (
          <div className="p-4 border-b border-slate-700 space-y-3 bg-[#0f172a]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
              <input
                type="text"
                placeholder={hasPermission.viewAllPatients(currentUser.role) ? "Tüm hastalarda ara..." : "Kendi hastalarında ara..."}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e7490] text-slate-200 placeholder:text-slate-500 transition shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* New Patient Button */}
            <div className="flex gap-2">
              <button
                onClick={handleNewPatientClick}
                className="touch-target flex-1 bg-[#cca43b] text-[#0f172a] py-2.5 rounded-xl font-bold hover:bg-[#b59030] transition flex justify-center items-center gap-2 shadow-lg shadow-[#cca43b]/20 active:scale-[0.98] text-sm"
              >
                <Plus size={18} /> YENİ HASTA
              </button>
              {hasPermission.addPayment(currentUser.role) && (
                <button
                  onClick={() => setShowPaymentQuickAccess(true)}
                  className="touch-target flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-bold hover:bg-teal-700 transition flex justify-center items-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.98] text-sm"
                >
                  <Banknote size={18} /> HIZLI ÖDEME
                </button>
              )}
            </div>
          </div>
        )}

        {/* Patient List or Appointments */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull Indicator */}
          <div
            style={{ height: pullChange, opacity: pullChange > 0 ? 1 : 0 }}
            className="flex items-center justify-center overflow-hidden transition-all duration-200 bg-gray-50 dark:bg-slate-800"
          >
            {isRefreshing ? (
              <Loader2 className="animate-spin text-teal-600" size={24} />
            ) : (
              <RefreshCcw
                className="text-gray-400"
                size={24}
                style={{ transform: `rotate(${pullChange * 2}deg)` }}
              />
            )}
          </div>
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
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border-b rounded-lg bg-slate-800/20 dark:bg-slate-700/50 animate-pulse">
                      <div className="space-y-3">
                        <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-600 rounded"></div>
                        <div className="w-1/3 h-3 bg-slate-200 dark:bg-slate-600 rounded"></div>
                        <div className="flex gap-2">
                          <div className="w-16 h-4 bg-slate-200 dark:bg-slate-600 rounded"></div>
                          <div className="w-16 h-4 bg-slate-200 dark:bg-slate-600 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PatientList
                  patients={filteredPatients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  currentUser={currentUser}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* DUPLICATE PATIENT WARNING STATE */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0">
        {activeTab === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
            <Dashboard
              patients={patients}
              treatments={treatments}
              doctors={users}
              currentUser={currentUser}
              loading={loading}
            />
          </div>
        ) : isMobile && activeTab === 'appointments' ? (
          <div className="h-full overflow-y-auto pb-24">
            <AppointmentsTab
              currentUser={currentUser}
              patients={patients}
              selectedDate={appointmentDate}
              onDateChange={setAppointmentDate}
              toast={toast}
            />
          </div>
        ) : isMobile && activeTab === 'patients' && !activePatient ? (
          // Mobile: Full-screen patient list
          <div className="h-full overflow-y-auto pb-24">
            <div className="p-4 bg-white border-b sticky top-16 md:top-0 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder={hasPermission.viewAllPatients(currentUser.role) ? "Tüm hastalarda ara..." : "Kendi hastalarında ara..."}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0e7490] text-slate-800 placeholder:text-slate-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={handleNewPatientClick}
                className="touch-target mt-3 w-full bg-[#0e7490] text-white py-3 rounded-xl font-bold hover:bg-[#155e75] transition flex justify-center items-center gap-2 shadow-lg active:scale-[0.98]"
              >
                <Plus size={18} /> YENİ HASTA EKLE
              </button>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="text-center p-8 text-gray-400">Kayıt bulunamadı.</div>
            ) : (
              <ul className="divide-y">
                {filteredPatients.map(p => (
                  <li key={p.id} className="relative overflow-hidden">
                    {/* Background actions */}
                    <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                      <div className="h-full w-1/2 bg-green-50 flex items-center pl-4 text-green-600">
                        <Edit size={18} />
                      </div>
                      <div className="h-full w-1/2 bg-red-50 flex items-center justify-end pr-4 text-red-600">
                        <Trash2 size={18} />
                      </div>
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -80, right: 80 }}
                      dragElastic={0.2}
                      onDragEnd={(e, info) => {
                        if (info.offset.x > 50) {
                          // Edit
                          if ((currentUser.role === 'admin' || currentUser.role === 'banko' || currentUser.role === 'asistan') ||
                            (currentUser.role === 'doctor' && p.doctor_id === currentUser.id)) {
                            openPatientEditor(p);
                          } else {
                            toast({ type: 'error', message: 'Düzenleme yetkiniz yok.' });
                          }
                        }
                        if (info.offset.x < -50) {
                          // Delete
                          if (canDeletePatient(currentUser, p)) {
                            handleDeletePatient(p.id);
                          } else {
                            toast({ type: 'error', message: 'Silme yetkiniz yok.' });
                          }
                        }
                      }}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setShowMobileSidebar(false);
                      }}
                      className={cn(
                        "relative z-10 p-4 cursor-pointer bg-white hover:bg-teal-50 transition",
                        selectedPatientId === p.id && 'bg-teal-50'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{p.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Phone size={12} /> {formatPhoneNumber(p.phone || '') || 'Tel yok'}
                          </p>
                          {hasPermission.viewAllPatients(currentUser.role) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                Hekim: {p.doctor_name || 'Bilinmiyor'}
                              </span>
                              {p.assignment_type && (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                  p.assignment_type === 'queue'
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-purple-100 text-purple-700"
                                )}>
                                  {p.assignment_type === 'queue' ? '🔄 Sıralı' : '⭐ Tercihli'}
                                </span>
                              )}
                              {p.assignment_date && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  📅 {new Date(p.assignment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {p.updated_at && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                              {new Date(p.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : activePatient ? (
          <PatientDetail
            patient={activePatient}
            currentUser={currentUser}
            isMobile={isMobile}
            onClose={() => setSelectedPatientId(null)}
            onEdit={(p) => {
              setEditingPatient(p);
              setShowEditPatientModal(true);
            }}
            onDelete={handleDeletePatient}
            loading={loading}
            setLoading={setLoading}
            fetchData={fetchData}
            onAddPayment={() => {
              setPaymentForm({ ...paymentForm, patient_id: activePatient.id });
              setShowPaymentModal(true);
            }}
            onMarkTreatmentCompleted={handleMarkAsCompleted}
            onDeleteTreatment={handleDeleteTreatment}
          />
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-sm">
        <div className="flex">
          <button
            onClick={() => { setActiveTab('patients'); setShowMobileSidebar(false); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium",
              activeTab === 'patients' ? 'text-teal-700' : 'text-gray-500'
            )}
          >
            <Users size={20} />
            <span>Hastalar</span>
          </button>
          <button
            onClick={() => { setActiveTab('appointments'); setShowMobileSidebar(false); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium",
              activeTab === 'appointments' ? 'text-teal-700' : 'text-gray-500'
            )}
          >
            <Calendar size={20} />
            <span>Randevu</span>
          </button>
          {hasPermission.viewDashboard(currentUser.role) && (
            <button
              onClick={() => { setActiveTab('dashboard'); setShowMobileSidebar(false); }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium",
                activeTab === 'dashboard' ? 'text-teal-700' : 'text-gray-500'
              )}
            >
              <LayoutDashboard size={20} />
              <span>Paneller</span>
            </button>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Doctor Selection Modal (for BANKO/ASISTAN) */}
      {/* Doctor Selection Modal (for BANKO/ASISTAN) */}
      <DoctorSelectionModal
        isOpen={showDoctorSelectionModal}
        onClose={() => {
          setShowDoctorSelectionModal(false);
          setSelectedDoctorForPatient('');
        }}
        users={users}
        nextDoctorInQueue={getNextDoctorInQueue()}
        onConfirm={handleDoctorSelection}
      />

      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-w-md md:rounded-xl shadow-2xl p-5 md:p-6 overflow-y-auto"
          >
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
                <input type="tel" placeholder="(5XX) XXX XX XX" required className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: formatPhoneNumber(e.target.value) })} />
                <p className="text-xs text-gray-500 mt-1">Sadece 5 ile başlayan 10 haneli numara kabul edilir.</p>
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
              <button type="submit" disabled={loading || !canSaveNewPatient || ((currentUser.role === 'banko' || currentUser.role === 'asistan') && !selectedDoctorForPatient)} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Kaydediyor...' : 'Kaydet'}</button>
            </form>
          </motion.div>
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
                <input type="tel" placeholder="(5XX) XXX XX XX" required className="w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-teal-500 outline-none" value={editingPatient.phone || ''} onChange={e => setEditingPatient({ ...editingPatient, phone: formatPhoneNumber(e.target.value) })} />
                <p className="text-xs text-gray-500 mt-1">Numara eksikse kaydetme butonu kapanır.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anamnez</label>
                <textarea placeholder="Anamnez..." className="w-full p-3 border border-red-200 bg-red-50 rounded-lg text-base focus:ring-2 focus:ring-red-300 outline-none" rows={3} value={editingPatient.anamnez || ''} onChange={e => setEditingPatient({ ...editingPatient, anamnez: e.target.value })}></textarea>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowEditPatientModal(false); setEditingPatient(null); }} className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50 text-base">İptal</button>
                <button type="submit" disabled={loading || !canSaveEditedPatient} className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 text-base disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Kaydediliyor...' : 'Güncelle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        patientId={paymentForm.patient_id}
        currentUser={currentUser}
        onSuccess={fetchData}
        toast={toast}
      />

      <PaymentQuickAccess
        isOpen={showPaymentQuickAccess}
        onClose={() => setShowPaymentQuickAccess(false)}
        treatments={treatments}
        patients={patients}
        onSuccess={fetchData}
      />

      {/* Password Change Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-w-sm md:rounded-xl shadow-2xl p-6 overflow-y-auto"
          >
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
          </motion.div>
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
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-w-lg md:rounded-xl shadow-2xl p-5 md:p-6 overflow-y-auto"
          >
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
          </motion.div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40 group">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-20 animate-ping group-hover:opacity-40"></span>
        <button
          onClick={handleNewPatientClick}
          className="relative inline-flex items-center justify-center w-14 h-14 bg-[#cca43b] text-[#0f172a] rounded-full shadow-2xl hover:scale-110 transition-all duration-300 active:scale-95 border-2 border-[#b59030]"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>

      <AIAssistant />



      <CommandCenter
        isOpen={showCommandCenter}
        onClose={() => setShowCommandCenter(false)}
        currentUserRole={currentUser.role}
        patients={patients}
        onSelectPatient={(patient) => {
          setSelectedPatientId(patient.id);
          setActiveTab('patients');
        }}
      />

      {/* Yardım Sistemi */}

    </div>
  );
}


