'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/features/auth';
import { PatientProvider, usePatientContext } from '@/features/patients';
import { TreatmentProvider, useTreatmentContext } from '@/features/treatments';
import { getPatientStatus } from '@/features/patients/utils';
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
import { PatientList, PatientDetail, PatientCreationProvider, usePatientCreation, DuplicateWarningModal } from '@/features/patients'; // DuplicateWarningModal imported for type safety if needed? Actually handled in Context. 
import { DoctorManagementModal } from '@/features/doctors';
import {
  DoctorRole, PaymentStatus, Doctor, Patient, Treatment, TreatmentStatus, QueueData
} from '@/lib/types';
import {
  cn, formatPhoneNumber, sanitizePhoneNumber, isValidPhoneNumber, getLocalDateString, formatCurrency
} from '@/lib/utils';

import { hasPermission, canDeletePatient } from '@/lib/permissions';
import { useActivityLogger } from '@/hooks/useActivityLogger';



export default function Home() {
  return (
    <AuthProvider>
      <PatientProvider>
        <TreatmentProvider>
          <PatientCreationProvider>
            <DentalClinicApp />
          </PatientCreationProvider>
        </TreatmentProvider>
      </PatientProvider>
    </AuthProvider>
  );
}

function DentalClinicApp() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  // Appointments - moved here but will be used conditionally
  const [appointmentDate, setAppointmentDate] = useState(new Date());

  // --- STATE ---
  // Auth & Doctors from Context
  const {
    currentUser,
    users,
    loading: authLoading,
    login,
    logout,
    refreshDoctors,
    showChangePasswordModal,
    setShowChangePasswordModal
  } = useAuth();


  // Dependent Hooks
  // Note: users is passed to useQueue, but useDoctors was returning it as 'doctors'.
  // We renamed it to 'users' in destructuring above.

  const { patients, setPatients, refreshPatients, addPatient, updatePatient, deletePatient, checkDuplicate } = usePatientContext();
  const { treatments, setTreatments, refreshTreatments, deleteTreatment, updateTreatment } = useTreatmentContext();



  const [loading, setLoading] = useState(false); // General loading (data fetching)
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

  // View Toggle
  const [activeTab, setActiveTab] = useState<'patients' | 'dashboard' | 'appointments'>('patients');

  // Mobile sidebar toggle - default closed on mobile
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // usePatientCreation
  const { openCreateModal } = usePatientCreation();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Forms
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Doctor Management State handled in DoctorManagementModal
  const [showDoctorManagement, setShowDoctorManagement] = useState(false);

  // Edit Patient Validation
  const canSaveEditedPatient = useMemo(
    () => editingPatient ? editingPatient.name.trim().length > 0 && isValidPhoneNumber(editingPatient.phone || '') : false,
    [editingPatient?.name, editingPatient?.phone]
  );

  // Payment form state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    payment_amount: 0,
    payment_status: 'paid' as PaymentStatus,
    payment_note: ''
  });

  // Helper Hooks
  // Queue logic moved to PatientCreationContext (mostly) but re-used here? 
  // page.tsx initializes queue for dashboard or general usage?
  // It seems queueData is only for patient assignment. 
  // We keep useQueue here if needed for Dashboard? Dashboard uses its own logic or props? 
  // Dashboard takes 'doctors' prop. 

  // Cleaned up unused state
  const [showPaymentQuickAccess, setShowPaymentQuickAccess] = useState(false);

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

  // handleLogin and handleLogout are now provided by AuthProvider


  // handleChangePassword is fully handled by AuthProvider and PasswordChangeModal component in the provider.



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
        loading={authLoading}
        onLogin={login}
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
            <button onClick={logout} className="p-2 hover:bg-white/20 rounded-full transition">
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
              <img src="/logo.png" alt="Kurtbeyoğlu Diş Kliniği" className="h-10 w-auto rounded-lg bg-white p-1 object-contain" />
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
            <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Çıkış Yap">
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
              <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-full transition" title="Çıkış Yap">
                <LogOut size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Button */}
        {hasPermission.manageUsers(currentUser.role) && (
          <div className="p-2 bg-indigo-50 border-b">
            <button onClick={() => setShowDoctorManagement(true)} className="flex items-center justify-center gap-2 w-full p-2 bg-white border border-indigo-200 rounded hover:bg-indigo-100 text-indigo-700 font-medium text-sm transition">
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
                onClick={openCreateModal}
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
                onClick={openCreateModal}
                className="touch-target mt-3 w-full bg-[#0e7490] text-white py-3 rounded-xl font-bold hover:bg-[#155e75] transition flex justify-center items-center gap-2 shadow-lg active:scale-[0.98]"
              >
                <Plus size={18} /> YENİ HASTA EKLE
              </button>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="text-center p-8 text-gray-400">Kayıt bulunamadı.</div>
            ) : (
              <ul className="divide-y">
                {filteredPatients.map(p => {
                  // Mobile Status Logic (Shared)
                  const status = getPatientStatus(p);

                  return (
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
                          selectedPatientId === p.id && 'bg-teal-50',
                          // Status Borders
                          selectedPatientId !== p.id && status === 'debt' && 'border-l-4 border-l-red-500',
                          selectedPatientId !== p.id && status === 'planned' && 'border-l-4 border-l-blue-500',
                          selectedPatientId !== p.id && status === 'active' && 'border-l-4 border-l-transparent'
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-800">{p.name}</h3>
                              {status === 'debt' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                  Borçlu
                                </span>
                              )}
                              {status === 'planned' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Planlı
                                </span>
                              )}
                            </div>
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
                  );
                })}
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
      {/* Password Change Modal is now handled globally by AuthProvider */}

      {/* Duplicate Patient Warning Modal */}


      <DoctorManagementModal
        isOpen={showDoctorManagement}
        onClose={() => setShowDoctorManagement(false)}
      />

      {/* Mobile Floating Action Button (FAB) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40 group">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-20 animate-ping group-hover:opacity-40"></span>
        <button
          onClick={openCreateModal}
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


