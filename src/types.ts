export type UserRole = 'Super Administrator' | 'Recruitment Staff' | 'Viewer';

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLoginAt?: string;
}

export type AdmissionStatus = 'A - PASS' | 'B - PENDING';

export interface RecruitmentList {
  id: string;
  userId?: string;              // Account owner ID
  name: string;                // e.g. "Recruitment 2026–2027"
  schoolName: string;          // "Sisters of Mary School"
  branch: string;              // "Talisay, Cebu"
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentListWithStats extends RecruitmentList {
  totalApplicants: number;
  passedApplicants: number;
  pendingApplicants: number;
  lastUpdated: string;
}

export interface StudentRecord {
  id: string;
  userId?: string;              // Account owner ID
  recruitmentListId?: string;   // Associated recruitment year list
  lrn: string;                  // Learner Reference Number (Unique string)
  surname: string;              // SN
  middleName: string;           // MN
  firstName: string;            // FN
  birthday: string;             // YYYY-MM-DD
  address: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  numSiblings: number;
  fatherOccupation: string;
  motherOccupation: string;
  guardianOccupation: string;
  examScore: number;
  elementarySchool: string;
  remarks: AdmissionStatus;     // A - PASS or B - PENDING
  healthStatus: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type DuplicateStatus = 'EXACT' | 'POSSIBLE' | 'NONE';

export interface DuplicateCheckResult {
  duplicateStatus: DuplicateStatus;
  existingRecord?: StudentRecord;
  matchedFields?: string[];
  matchReason?: string;
  message: string;
}

export interface SavedAccountInfo {
  id: string;
  fullName: string;
  username: string;
  email: string;
  lastLoginAt?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  id?: string;
  setupCompleted?: boolean;
  administratorUserId?: string;
  schoolName: string;
  subTitle?: string;
  systemName?: string;
  schoolLocation?: string;
  schoolLogoUrl?: string;
  schoolLogoData?: string;
  schoolLogoMime?: string;
  maxExamScore: number;
  dashboardBgTheme?: 'royal-blue' | 'navy-gold' | 'emerald' | 'burgundy' | 'slate' | 'custom';
  dashboardBgGradient?: string;
  dashboardBgImageUrl?: string;
  dashboardBgImageData?: string;
  dashboardBgImageMime?: string;
  splashBgImageUrl?: string;
  splashBgImageData?: string;
  splashBgImageMime?: string;
  academicYear?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalPass: number;
  totalPending: number;
  recentStudents: StudentRecord[];
  elementarySchoolsCount: number;
  averageExamScore: number;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_DETECTED';

export interface OCRCorrectionRecord {
  field: string;
  fieldLabel: string;
  originalValue: string;
  correctedValue: string;
  confidence: ConfidenceLevel;
  reason: string;
  applied: boolean;
}

export interface OCRScanResult {
  extractedData: Partial<StudentRecord>;
  originalOcrData?: Partial<StudentRecord>;
  corrections?: OCRCorrectionRecord[];
  fieldConfidence?: Record<string, ConfidenceLevel>;
  formTitleDetected?: string;
  detectedNotes?: string;
  uncertainFields?: string[];
  rawSummary?: string;
}
