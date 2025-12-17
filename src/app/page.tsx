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
import { PaymentQuickAccess } from '@/components/PaymentQuickAccess';

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

// --- INPUT HELPERS ---
const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const formatPhoneNumber = (value: string) => {
  const digits = sanitizePhoneNumber(value);
  if (!digits) return '';

  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 8);
  const part4 = digits.slice(8, 10);

  return [
    part1 ? `(${part1}${part1.length === 3 ? ')' : ''}` : '',
    part2 ? ` ${part2}` : '',
    part3 ? ` ${part3}` : '',
    part4 ? ` ${part4}` : ''
  ].join('');
};

const isValidPhoneNumber = (value: string) => {
  const digits = sanitizePhoneNumber(value);
  return digits.length === 10 && digits.startsWith('5');
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

  // Queue management for automatic doctor assignment
  interface QueueData {
    id: string;
    date: string;
    queue_order: string[];
    current_index: number;
  }
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [doctorSelectionMethod, setDoctorSelectionMethod] = useState<'manual' | 'queue' | null>(null);
  const [showPaymentQuickAccess, setShowPaymentQuickAccess] = useState(false);

  // Track recent queue assignments for consecutive detection
  const [recentQueueAssignments, setRecentQueueAssignments] = useState<{
    doctorId: string;
    doctorName: string;
    timestamp: number;
  }[]>([]);

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

      // Doctors see only their assigned patients
      // Admin, banko, asistan see all patients
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

  // Duplicate patient check helper
  const checkForDuplicatePatient = async (name: string, phone: string) => {
    const trimmedName = name.trim();
    const trimmedPhone = sanitizePhoneNumber(phone);

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

    const cleanedPhone = sanitizePhoneNumber(newPatient.phone);
    const trimmedName = newPatient.name.trim();

    if (!trimmedName || !isValidPhoneNumber(newPatient.phone)) {
      toast({ type: 'error', message: 'Ad Soyad ve geçerli telefon zorunludur.' });
      return;
    }

    try {
      // DUPLIKASYON KONTROLÜ - Check for duplicate patients
      if (!proceedWithDuplicate) {
        const duplicateCheck = await checkForDuplicatePatient(
          trimmedName,
          cleanedPhone
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

      // Check for consecutive queue assignments
      if (currentUser.role === 'banko' || currentUser.role === 'asistan') {
        if (assignmentType === 'queue' && doctorSelectionMethod === 'queue') {
          // Check last assignments
          const recentSameDoctor = recentQueueAssignments.filter(
            (assignment) =>
              assignment.doctorId === doctorId &&
              Date.now() - assignment.timestamp < 3600000 // Within last hour
          );

          if (recentSameDoctor.length >= 1) {
            // Get current distribution for context
            const today = new Date().toISOString().split('T')[0];
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
      const { data, error } = await supabase.from('patients').insert({
        doctor_id: doctorId,
        doctor_name: doctorName,
        name: trimmedName,
        phone: cleanedPhone,
        anamnez: hasPermission.editAnamnez(currentUser.role) ? newPatient.anamnez : '',
        assignment_type: assignmentType,
        assignment_date: new Date().toISOString().split('T')[0]
      }).select();

      if (error) throw error;

      setNewPatient({ name: '', phone: '', anamnez: '' });
      setSelectedDoctorForPatient('');
      setDoctorSelectionMethod(null);
      setShowAddPatientModal(false);
      if (data && data[0]) setSelectedPatientId(data[0].id);
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

  const openPatientEditor = (patient: Patient) => {
    setEditingPatient({ ...patient, phone: formatPhoneNumber(patient.phone || '') });
    setShowEditPatientModal(true);
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
      if (selectedPatientId === id) setSelectedPatientId(null);
      toast({ type: 'success', message: 'Hasta silindi.' });
      fetchData();
    } catch (error) {
      console.error('Patient delete error:', error);
      toast({ type: 'error', message: 'Hasta silinemedi. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: editingPatient.name.trim(),
          phone: cleanedPhone,
          anamnez: hasPermission.editAnamnez(currentUser.role) ? editingPatient.anamnez : editingPatient.anamnez
        })
        .eq('id', editingPatient.id);

      if (error) throw error;

      setShowEditPatientModal(false);
      setEditingPatient(null);
      toast({ type: 'success', message: 'Hasta bilgileri güncellendi!' });
      fetchData();
    } catch (error) {
      console.error('Edit patient error:', error);
      toast({ type: 'error', message: 'Güncelleme başarısız. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  // Treatment form now handled by TreatmentForm component

  const handleDeleteTreatment = async (id: string) => {
    if (!confirm('Sil?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('treatments').delete().eq('id', id);
      if (error) throw error;
      toast({ type: 'success', message: 'İşlem silindi.' });
      fetchData();
    } catch (error) {
      console.error('Treatment delete error:', error);
      toast({ type: 'error', message: 'İşlem silinemedi. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async (treatmentId: string) => {
    if (!confirm('Bu tedaviyi yapıldı olarak işaretlemek istediğinize emin misiniz?')) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('treatments')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString()
        })
        .eq('id', treatmentId);

      if (error) throw error;

      toast({ type: 'success', message: 'Tedavi tamamlandı olarak işaretlendi!' });
      fetchData();
    } catch (error) {
      console.error('Treatment complete error:', error);
      toast({ type: 'error', message: 'Güncelleme hatası. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !paymentForm.patient_id || paymentForm.payment_amount <= 0) {
      toast({ type: 'error', message: 'Hasta ve tutar gerekli' });
      return;
    }

    setLoading(true);
    try {
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

      if (error) throw error;

      toast({ type: 'success', message: 'Ödeme kaydedildi!' });
      setShowPaymentModal(false);
      setPaymentForm({ patient_id: '', payment_amount: 0, payment_status: 'paid', payment_note: '' });
      await supabase.from('patients').update({ updated_at: new Date().toISOString() }).eq('id', paymentForm.patient_id);
      fetchData();
    } catch (error) {
      console.error('Payment add error:', error);
      toast({ type: 'error', message: 'Ödeme kaydedilemedi. İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPaymentSubmit = async (treatmentId: string, amount: number, method: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) return;

    const currentPaid = treatment.payment_amount || 0;
    const totalPaid = currentPaid + amount;
    const remaining = (treatment.cost || 0) - totalPaid;

    // Status update logic
    // Tolerance for floating point errors could be added, but minimal for now
    const status = remaining <= 0.1 ? 'paid' : 'partial';

    // Determine method label
    const methodLabel = method === 'cash' ? 'Nakit' : method === 'credit_card' ? 'KK' : 'Havale';
    const dateStr = new Date().toLocaleDateString('tr-TR');

    const note = treatment.payment_note
      ? `${treatment.payment_note}\n- ${amount}₺ ${methodLabel} (${dateStr})`
      : `- ${amount}₺ ${methodLabel} (${dateStr})`;

    const updates = {
      payment_amount: totalPaid,
      payment_status: status,
      payment_note: note,
      // payment_date: new Date().toISOString() // Uncomment if column exists
    };

    try {
      const { error } = await supabase.from('treatments').update(updates).eq('id', treatmentId);

      if (error) throw error;

      toast({ type: 'success', message: 'Ödeme alındı' });
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Payment Error:", error);
      toast({ type: 'error', message: 'Ödeme kaydedilemedi. İnternet bağlantınızı kontrol edin.' });
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f172a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0e7490] rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-slate-100">
          {loading && <div className="absolute top-6 right-6"><div className="w-5 h-5 border-2 border-[#0e7490] border-t-transparent rounded-full animate-spin"></div></div>}
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-100 p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-2">Özel Kurtbeyoğlu<br />Ağız ve Diş Sağlığı Polikliniği</h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">Hasta Takip ve Randevu Sistemi</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kullanıcı Seçin</label>
              <div className="relative">
                <select
                  className="w-full p-4 pl-4 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-[#0e7490]/20 focus:border-[#0e7490] outline-none text-slate-900 font-medium appearance-none transition-all shadow-sm"
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
                      className="text-gray-900 font-medium py-2"
                    >
                      {u.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                  <User size={18} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Giriş Şifresi (PIN)</label>
              <input
                type="password"
                className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-[#0e7490]/20 focus:border-[#0e7490] outline-none text-center tracking-[0.5em] text-xl font-bold text-slate-800 shadow-sm transition-all placeholder:tracking-normal placeholder:font-normal"
                placeholder="PIN"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <button disabled={loading} type="submit" className="touch-target w-full bg-[#0e7490] text-white py-4 rounded-xl font-bold hover:bg-[#155e75] transition-all shadow-lg hover:shadow-[#0e7490]/25 disabled:opacity-70 disabled:cursor-not-allowed mt-4 active:scale-[0.98]">
              {loading ? 'Yükleniyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Güvenli ve Modern Diş Hekimliği</p>
          </div>
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
            <h1 className="font-bold text-sm">Özel Kurtbeyoğlu Polikliniği</h1>
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
            <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-white/10 rounded-full transition text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Çıkış Yap">
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
              ) : filteredPatients.length === 0 ? (
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
                            <Phone size={12} /> {formatPhoneNumber(p.phone || '') || 'Tel yok'}
                          </p>
                          {hasPermission.viewAllPatients(currentUser.role) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                Hekim: {p.doctor_name || 'Bilinmiyor'}
                              </span>
                              {p.assignment_type && (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                  p.assignment_type === 'queue'
                                    ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                    : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                )}>
                                  {p.assignment_type === 'queue' ? '🔄 Sıralı' : '⭐ Tercihli'}
                                </span>
                              )}
                              {p.assignment_date && (
                                <span className="text-[10px] bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                  📅 {new Date(p.assignment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
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

      {/* DETAIL PANEL / MAIN CONTENT */}
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
                          if (hasPermission.deletePatient(currentUser.role) && (currentUser.role === 'admin' || p.doctor_id === currentUser.id)) {
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
          <>
            {/* Patient Header */}
            <div className="bg-white p-4 md:p-6 shadow-sm border-b flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                {/* Back button for mobile */}
                {isMobile && (
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="mb-2 inline-flex items-center gap-2 text-teal-700 font-medium md:hidden"
                  >
                    <ArrowLeft size={18} /> Geri
                  </button>
                )}
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  {activePatient.name}
                </h2>
                <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-gray-100 px-2 md:px-3 py-1 rounded-full">
                    <Phone size={14} /> {formatPhoneNumber(activePatient.phone || '') || 'Tel yok'}
                  </span>
                  <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 md:px-3 py-1 rounded-full">
                    <User size={14} /> Sorumlu: {activePatient.doctor_name}
                  </span>
                </div>

                <div className="mt-4">

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

              <div className="mb-6">
                <PatientImageGallery patientId={activePatient.id} currentUser={currentUser} />
              </div>

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

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-w-md md:rounded-xl shadow-2xl p-5 md:p-6 overflow-y-auto"
          >
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
          </motion.div>
        </div>
      )}

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
