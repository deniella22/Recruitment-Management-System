import React, { useState, useEffect } from 'react';
import {
  User,
  StudentRecord,
  DashboardStats,
  SystemSettings,
} from './types';
import {
  fetchAuthStatus,
  fetchDashboardStats,
  fetchStudents,
  deleteStudent,
  downloadExcelReport,
  exportStudentsToExcel,
  exportStudentsToPdf,
  exportSchoolsSummaryPdf,
} from './lib/api';
import { AdminRegistrationModal } from './components/AdminRegistrationModal';
import { LoginForm } from './components/LoginForm';
import { SplashScreen } from './components/common/SplashScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { StudentListView } from './components/StudentListView';
import { StudentProfileView } from './components/StudentProfileView';
import { StudentFormModal } from './components/StudentFormModal';
import { ReportsView } from './components/ReportsView';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogsView } from './components/AuditLogsView';
import { SettingsView } from './components/SettingsView';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

const getInitialSettings = (): SystemSettings => {
  try {
    const cached = localStorage.getItem('sms_system_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.schoolName) return parsed;
    }
  } catch (e) {
    // Ignore cache error
  }
  return {
    schoolName: 'Sisters of Mary School-Girlstown, Inc.',
    subTitle: 'Internal Student Recruitment & Information Management System',
    systemName: 'MALE STUDENT RECRUITMENT MANAGEMENT SYSTEM',
    schoolLocation: 'ADLAS, SILANG, CAVITE, PHILIPPINES',
    schoolLogoUrl: '/school_logo.png',
    maxExamScore: 100,
    dashboardBgTheme: 'custom',
    dashboardBgGradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
    dashboardBgImageUrl: '/dashboard_bg.jpg',
    splashBgImageUrl: '/dashboard_bg.jpg',
    academicYear: 'SY 2026-2027 Recruitment',
  };
};

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(getInitialSettings);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Student Records Data
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('fullName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [modalInitialMode, setModalInitialMode] = useState<'selection' | 'ocr' | 'form'>('selection');
  const [studentToEdit, setStudentToEdit] = useState<StudentRecord | null>(null);

  // Delete Confirmation Modal
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Auth & System Check
  const checkAuth = async () => {
    try {
      setAuthError(null);
      const status = await fetchAuthStatus();
      setHasUsers(status.hasUsers);
      setCurrentUser(status.currentUser);
      if (status.settings) {
        setSystemSettings(status.settings);
        try {
          localStorage.setItem('sms_system_settings', JSON.stringify(status.settings));
        } catch (e) {
          // Ignore storage error
        }
      }
    } catch (err: any) {
      console.error('Failed to initialize auth status:', err);
      setAuthError(err?.message || 'Failed to initialize system connection.');
    } finally {
      setAuthInitialized(true);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Load Students and Dashboard Stats
  const loadStudentData = async () => {
    if (!currentUser) return;
    try {
      setLoadingStudents(true);
      const [statsData, studentsData] = await Promise.all([
        fetchDashboardStats(),
        fetchStudents({
          search: searchQuery,
          status: statusFilter,
          sortBy,
          sortOrder,
        }),
      ]);
      setDashboardStats(statsData);
      setStudents(studentsData);
    } catch (err: any) {
      console.error('Failed to load student records:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadStudentData();
    }
  }, [currentUser, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleAuthSuccess = (user: User, token: string) => {
    localStorage.setItem('sms_auth_token', token);
    setCurrentUser(user);
    setHasUsers(true);
    showToast(`Welcome back, ${user.fullName}! Logged in as ${user.role}.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('sms_auth_token');
    setCurrentUser(null);
    setSelectedStudentForProfile(null);
    setActiveTab('dashboard');
    showToast('Signed out of system successfully.');
  };

  const handleOpenAddStudent = (mode: 'selection' | 'ocr' | 'form' = 'selection') => {
    setStudentToEdit(null);
    setModalInitialMode(mode);
    setIsFormModalOpen(true);
  };

  const handleEditStudent = (student: StudentRecord) => {
    setStudentToEdit(student);
    setIsFormModalOpen(true);
  };

  const handleViewStudentProfile = (student: StudentRecord) => {
    setSelectedStudentForProfile(student);
    setActiveTab('profile');
  };

  const handleSaveStudentSuccess = (savedStudent: StudentRecord) => {
    setIsFormModalOpen(false);
    setStudentToEdit(null);
    if (selectedStudentForProfile && selectedStudentForProfile.id === savedStudent.id) {
      setSelectedStudentForProfile(savedStudent);
    }
    loadStudentData();
    showToast(
      `Student record for ${savedStudent.surname}, ${savedStudent.firstName} saved successfully.`
    );
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      await deleteStudent(studentToDelete.id);
      showToast(`Student record for ${studentToDelete.surname}, ${studentToDelete.firstName} deleted.`);
      setStudentToDelete(null);
      if (selectedStudentForProfile?.id === studentToDelete.id) {
        setSelectedStudentForProfile(null);
        setActiveTab('students');
      }
      loadStudentData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete student record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = async (customListOrAll?: boolean | StudentRecord[], filterName?: string) => {
    try {
      showToast('Generating official Excel spreadsheet (.xlsx)...');
      let targetStudents: StudentRecord[] = students;
      let label = filterName;

      if (typeof customListOrAll === 'boolean') {
        if (customListOrAll) {
          // Export all from database
          targetStudents = await fetchStudents();
          label = 'All_Records';
        } else {
          // Export currently filtered/searched list
          targetStudents = students;
          label = statusFilter !== 'ALL' ? statusFilter : 'Filtered_List';
        }
      } else if (Array.isArray(customListOrAll)) {
        targetStudents = customListOrAll;
      }

      await exportStudentsToExcel(targetStudents, systemSettings, {
        statusFilter: label,
      });
      showToast(`Excel export completed! (${targetStudents.length} records exported)`);
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      showToast('Export failed. Trying server-side download...', 'error');
      downloadExcelReport();
    }
  };

  const handleExportPdf = async (customListOrAll?: boolean | StudentRecord[], filterName?: string) => {
    try {
      showToast('Generating official PDF document (.pdf)...');
      let targetStudents: StudentRecord[] = students;
      let label = filterName;

      if (typeof customListOrAll === 'boolean') {
        if (customListOrAll) {
          targetStudents = await fetchStudents();
          label = 'All_Records';
        } else {
          targetStudents = students;
          label = statusFilter !== 'ALL' ? statusFilter : 'Filtered_List';
        }
      } else if (Array.isArray(customListOrAll)) {
        targetStudents = customListOrAll;
      }

      await exportStudentsToPdf(targetStudents, systemSettings, {
        statusFilter: label,
      });
      showToast(`PDF report generated successfully! (${targetStudents.length} records)`);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      showToast('Failed to generate PDF document: ' + (err.message || ''), 'error');
    }
  };

  const handleExportSchools = async (type: 'excel' | 'pdf') => {
    try {
      const targetList = await fetchStudents();
      if (type === 'pdf') {
        showToast('Generating Feeder Schools PDF summary...');
        await exportSchoolsSummaryPdf(targetList, systemSettings);
        showToast('Feeder Schools PDF report downloaded!');
      } else {
        showToast('Generating Feeder Schools Excel summary...');
        await exportStudentsToExcel(targetList, systemSettings, { title: 'Feeder Schools Summary' });
        showToast('Feeder Schools Excel report downloaded!');
      }
    } catch (err: any) {
      showToast('Failed to export schools report: ' + (err.message || ''), 'error');
    }
  };

  const handleNavigateToStudentsWithFilter = (status?: string) => {
    if (status) setStatusFilter(status);
    setActiveTab('students');
  };

  // --- RENDER FLOWS ---

  // 1. Splash Screen
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => setShowSplash(false)}
        schoolName={systemSettings.schoolName}
        logoSrc={systemSettings.schoolLogoUrl || '/school_logo.png'}
        subTitle={systemSettings.subTitle}
        systemName={systemSettings.systemName}
        schoolLocation={systemSettings.schoolLocation}
        splashBgImageUrl={systemSettings.splashBgImageUrl || systemSettings.dashboardBgImageUrl || '/dashboard_bg.jpg'}
      />
    );
  }

  // 2. Auth Initialization Loading
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#1E3A8A]">
            {systemSettings.schoolName || 'Sisters of Mary School-Girlstown, Inc.'}
          </p>
          <p className="text-[11px] text-gray-500">Initializing System...</p>
        </div>
      </div>
    );
  }

  // 3. Auth Initialization Error Screen
  if (authError && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900">Unable to load the application</h2>
          <p className="text-xs text-gray-600 leading-relaxed">{authError}</p>
          <button
            onClick={() => {
              setAuthInitialized(false);
              checkAuth();
            }}
            className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // 1. First-time system launch: No administrator exists -> AdminRegistrationModal
  if (!hasUsers) {
    return <AdminRegistrationModal onSuccess={handleAuthSuccess} systemSettings={systemSettings} />;
  }

  // 2. Not logged in -> LoginForm
  if (!currentUser) {
    return (
      <LoginForm
        onSuccess={handleAuthSuccess}
        onResetAccounts={() => {
          setCurrentUser(null);
          setHasUsers(false);
          localStorage.removeItem('sms_auth_token');
        }}
        systemSettings={systemSettings}
      />
    );
  }

  // 3. Logged in -> Main Application Interface
  return (
    <div className="min-h-screen bg-gray-100/70 flex font-sans text-gray-900 antialiased">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-[#1E3A8A] text-white border-[#172554]'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'profile') setSelectedStudentForProfile(null);
          setActiveTab(tab);
        }}
        onOpenAddStudent={handleOpenAddStudent}
        onExportExcel={handleExportExcel}
        userRole={currentUser.role}
        systemSettings={systemSettings}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          onLogout={handleLogout}
          systemSettings={systemSettings}
        />

        <main className="p-6 flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              onOpenAddStudent={handleOpenAddStudent}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onNavigateToStudents={handleNavigateToStudentsWithFilter}
              onViewStudentProfile={handleViewStudentProfile}
              loading={loadingStudents}
              systemSettings={systemSettings}
            />
          )}

          {activeTab === 'students' && (
            <StudentListView
              students={students}
              onViewStudent={handleViewStudentProfile}
              onEditStudent={handleEditStudent}
              onDeleteStudent={(s) => setStudentToDelete(s)}
              onOpenAddStudent={handleOpenAddStudent}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              userRole={currentUser.role}
            />
          )}

          {activeTab === 'profile' && selectedStudentForProfile && (
            <StudentProfileView
              student={selectedStudentForProfile}
              onBack={() => setActiveTab('students')}
              onEdit={(s) => handleEditStudent(s)}
              userRole={currentUser.role}
              systemSettings={systemSettings}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              students={students}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportSchoolsSummary={handleExportSchools}
              onViewStudentProfile={handleViewStudentProfile}
              systemSettings={systemSettings}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'Super Administrator' && (
            <UserManagementView />
          )}

          {activeTab === 'audit' && <AuditLogsView />}

          {activeTab === 'settings' && (
            <SettingsView
              userRole={currentUser.role}
              onSettingsUpdated={(newSettings) => {
                setSystemSettings(newSettings);
                try {
                  localStorage.setItem('sms_system_settings', JSON.stringify(newSettings));
                } catch (e) {
                  // Ignore storage error
                }
              }}
              onAccountsResetNeeded={() => {
                setCurrentUser(null);
                setHasUsers(false);
                localStorage.removeItem('sms_auth_token');
                localStorage.removeItem('sms_last_account');
                showToast('Accounts reset successfully. Setup your new permanent administrator account.');
              }}
              onAccountDeleted={() => {
                setCurrentUser(null);
                localStorage.removeItem('sms_auth_token');
                localStorage.removeItem('sms_last_account');
                showToast('Your account and associated student records have been permanently deleted.');
                checkAuth();
              }}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Student Form Modal */}
      {isFormModalOpen && (
        <StudentFormModal
          studentToEdit={studentToEdit}
          initialMode={modalInitialMode}
          maxExamScore={systemSettings.maxExamScore}
          onClose={() => {
            setIsFormModalOpen(false);
            setStudentToEdit(null);
          }}
          onSuccess={handleSaveStudentSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-center animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Confirm Record Deletion</h3>
            <p className="text-xs text-gray-600 mt-2 font-medium leading-relaxed bg-red-50/50 p-3 rounded-xl border border-red-100">
              Are you sure you want to delete this student record? This action cannot be undone.
            </p>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-left border border-gray-200/80 space-y-1">
              <p><strong className="text-gray-700">Student:</strong> {studentToDelete.surname}, {studentToDelete.firstName}</p>
              <p><strong className="text-gray-700">LRN:</strong> {studentToDelete.lrn}</p>
              <p><strong className="text-gray-700">School:</strong> {studentToDelete.elementarySchool || 'N/A'}</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
