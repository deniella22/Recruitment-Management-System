import {
  StudentRecord,
  User,
  AuditLogEntry,
  SystemSettings,
  DashboardStats,
  AdmissionStatus,
  OCRScanResult,
  RecruitmentList,
  RecruitmentListWithStats,
} from '../types';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('sms_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchAuthStatus(): Promise<{
  hasUsers: boolean;
  setupCompleted?: boolean;
  currentUser: User | null;
  settings: SystemSettings;
}> {
  const res = await fetch('/api/auth/status', {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch auth status');
  return res.json();
}

// RECRUITMENT LISTS API
export async function fetchRecruitmentLists(includeArchived = false): Promise<RecruitmentListWithStats[]> {
  const res = await fetch(`/api/recruitment-lists?includeArchived=${includeArchived}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch recruitment lists');
  return res.json();
}

export async function fetchRecruitmentListById(id: string): Promise<RecruitmentList> {
  const res = await fetch(`/api/recruitment-lists/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch recruitment list');
  return res.json();
}

export async function createRecruitmentList(data: {
  name: string;
  schoolName?: string;
  branch?: string;
}): Promise<RecruitmentList> {
  const res = await fetch('/api/recruitment-lists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create recruitment list');
  return json;
}

export async function updateRecruitmentList(
  id: string,
  data: Partial<RecruitmentList>
): Promise<RecruitmentList> {
  const res = await fetch(`/api/recruitment-lists/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update recruitment list');
  return json;
}

export async function deleteRecruitmentList(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/recruitment-lists/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete recruitment list');
  return json;
}

export async function registerAccount(data: {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  pin?: string;
}): Promise<{ user: User; token: string; isNewAccount?: boolean }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json.error || 'Failed to create account');
    err.existingAccount = json.existingAccount;
    err.existingUsername = json.existingUsername;
    throw err;
  }
  return json;
}

export async function checkAccountExists(identifier: string): Promise<{
  exists: boolean;
  accountName?: string;
  username?: string;
  message?: string;
}> {
  const res = await fetch('/api/auth/check-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  return res.json();
}

export async function deleteMyAccount(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete account');
  return json;
}

export async function checkStudentDuplicate(
  candidate: Partial<StudentRecord>,
  excludeId?: string,
  recruitmentListId?: string
): Promise<{
  duplicateStatus: 'EXACT' | 'POSSIBLE' | 'NONE';
  existingRecord?: StudentRecord;
  matchedFields?: string[];
  matchReason?: string;
  message: string;
}> {
  const res = await fetch('/api/students/check-duplicate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ...candidate, excludeId, recruitmentListId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to check duplicate status');
  return json;
}

export async function registerInitialAdmin(data: {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  pin?: string;
}): Promise<{ user: User; token: string; isNewAccount?: boolean }> {
  const res = await fetch('/api/auth/register-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create administrator account');
  return json;
}

export async function resetAllUsers(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/reset-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to reset user accounts');
  return json;
}

export async function loginUser(
  username: string,
  password: string,
  pin?: string
): Promise<{ user: User; token: string; isNewAccount?: boolean; isFirstLogin?: boolean }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, identifier: username, password, pin }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json.error || 'Invalid credentials');
    err.accountNotFound = json.accountNotFound;
    err.wrongPassword = json.wrongPassword;
    err.wrongPin = json.wrongPin;
    err.deactivated = json.deactivated;
    err.identifier = json.identifier;
    throw err;
  }
  return json;
}

export async function fetchDashboardStats(recruitmentListId?: string): Promise<DashboardStats> {
  const url = recruitmentListId
    ? `/api/dashboard/stats?recruitmentListId=${encodeURIComponent(recruitmentListId)}`
    : '/api/dashboard/stats';
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchStudents(params?: {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  recruitmentListId?: string;
}): Promise<StudentRecord[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.recruitmentListId) query.set('recruitmentListId', params.recruitmentListId);

  const url = `/api/students${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error('Failed to fetch student records');
  return res.json();
}

export async function fetchStudentById(id: string, recruitmentListId?: string): Promise<StudentRecord> {
  const url = recruitmentListId
    ? `/api/students/${id}?recruitmentListId=${encodeURIComponent(recruitmentListId)}`
    : `/api/students/${id}`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Student record not found');
  return res.json();
}

export async function createStudent(
  studentData: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
): Promise<StudentRecord> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(studentData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add student record');
  return json;
}

export async function updateStudent(
  id: string,
  studentData: Partial<StudentRecord>
): Promise<StudentRecord> {
  const res = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(studentData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update student record');
  return json;
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`/api/students/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete student record');
}

export async function performOCRScan(imageBase64: string, mimeType?: string): Promise<OCRScanResult> {
  const res = await fetch('/api/ocr-scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to extract text from document with OCR');
  return {
    extractedData: json.extractedData || {},
    originalOcrData: json.originalOcrData || json.extractedData || {},
    corrections: json.corrections || [],
    fieldConfidence: json.fieldConfidence || {},
    formTitleDetected: json.formTitleDetected || 'Personal Data Form',
    detectedNotes: json.detectedNotes || '',
    uncertainFields: json.uncertainFields || [],
    rawSummary: json.rawSummary || '',
  };
}

export { exportStudentsToExcel } from './excelExportClient';
export { exportStudentsToPdf, exportStudentProfilePdf, exportSchoolsSummaryPdf } from './pdfExport';

export async function downloadExcelReport(): Promise<void> {
  // Direct client-side generator with fallback to server download
  try {
    const students = await fetchStudents();
    const settings = await fetchSettings().catch(() => undefined);
    const { exportStudentsToExcel } = await import('./excelExportClient');
    await exportStudentsToExcel(students, settings);
  } catch (err) {
    console.error('Client excel export fallback to server:', err);
    const token = localStorage.getItem('sms_auth_token') || '';
    const link = document.createElement('a');
    link.href = `/api/students/export/excel?token=${encodeURIComponent(token)}`;
    link.download = 'Student_Records_Sisters_of_Mary_Girlstown.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const res = await fetch('/api/audit-logs', {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch('/api/settings', {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch system settings');
  return res.json();
}

export async function uploadSystemLogo(
  imageBase64: string,
  mimeType?: string,
  presetName?: string
): Promise<{ success: boolean; logoUrl: string; settings: SystemSettings }> {
  const res = await fetch('/api/settings/logo', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ imageBase64, mimeType, presetName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload and save system logo');
  return json;
}

export async function uploadSystemBackground(
  imageBase64: string,
  mimeType?: string,
  presetName?: string
): Promise<{ success: boolean; backgroundUrl: string; settings: SystemSettings }> {
  const res = await fetch('/api/settings/background', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ imageBase64, mimeType, presetName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload and save dashboard background');
  return json;
}

export async function uploadSplashBackground(
  imageBase64: string,
  mimeType?: string,
  presetName?: string
): Promise<{ success: boolean; splashBackgroundUrl: string; settings: SystemSettings }> {
  const res = await fetch('/api/settings/splash-background', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ imageBase64, mimeType, presetName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload and save splash background');
  return json;
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update system settings');
  return json;
}

// Preset CRUD Helpers
export async function deleteLogoPreset(id: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/logo/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete logo preset');
  return json;
}

export async function renameLogoPreset(id: string, name: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/logo/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update logo preset');
  return json;
}

export async function deleteDashboardBgPreset(id: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/dashboard-bg/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete background preset');
  return json;
}

export async function renameDashboardBgPreset(id: string, name: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/dashboard-bg/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update background preset');
  return json;
}

export async function deleteSplashBgPreset(id: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/splash-bg/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete splash preset');
  return json;
}

export async function renameSplashBgPreset(id: string, name: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/splash-bg/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update splash preset');
  return json;
}

export async function addThemePreset(theme: { name: string; gradient: string; colorBadge?: string }): Promise<SystemSettings> {
  const res = await fetch('/api/settings/presets/theme', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(theme),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create theme preset');
  return json;
}

export async function deleteThemePreset(id: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/theme/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete theme preset');
  return json;
}

export async function renameThemePreset(id: string, name: string, gradient?: string, colorBadge?: string): Promise<SystemSettings> {
  const res = await fetch(`/api/settings/presets/theme/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, gradient, colorBadge }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update theme preset');
  return json;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users', {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(userData: any): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(userData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create user');
  return json;
}

export async function updateUser(id: string, userData: any): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(userData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update user');
  return json;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete user');
}
