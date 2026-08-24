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

export interface SiblingRecord {
  siblingNo: number;            // 1 to 10
  name: string;                // Name of Sibling
  age: number | string;        // Age
  remarks: string;             // Remarks (e.g. Student, Working, Grade 4)
}

export interface StudentRecord {
  id: string;
  userId?: string;              // Account owner ID
  recruitmentListId?: string;   // Associated recruitment year list

  // A. Basic Personal Information
  idPhotoUrl?: string;          // ID Photo 1x1
  lastName: string;             // Last Name / Surname / Apelyido
  surname?: string;             // SN (Alias for backward compatibility)
  firstName: string;            // First Name / Pangalan
  middleName: string;           // Middle Name / Apelyido ng Ina
  birthdate: string;            // Birthdate / Araw ng Kapanganakan (YYYY-MM-DD)
  birthday?: string;            // Alias for birthdate
  age: number | string;         // Age / Edad Kasalukuyan
  gender: string;               // Gender / Kasarian ('Female' | 'Male' | 'Other')

  // B. Home Address
  sitioStreet: string;          // Sitio/Street
  barangay: string;             // Barangay
  municipality: string;         // Municipality
  province: string;             // Province
  address?: string;             // Consolidated address

  // C. School Information
  elementarySchool: string;     // School / Paaralang Elementarya
  school?: string;              // School alias
  schoolAddress: string;        // Address / Lokasyon of School
  reportCardSy: string;         // Report Card (SY2025-2026)
  lrn: string;                  // LRN (12-digit Learner Reference Number)
  grading: string;              // Grading (e.g. 88% or General Average)
  currentGrade: string;         // Current Grade (e.g. Grade 6)
  oldGraduateRemarks: string;   // Others specify (old graduate)

  // D. Family Information
  fatherName: string;           // Father's Name
  fatherOccupation: string;     // Father's Occupation / Trabaho / Hanapbuhay
  motherName: string;           // Mother's Name
  motherOccupation: string;     // Mother's Occupation / Trabaho / Hanapbuhay
  guardianName: string;         // Guardian's Name
  guardianRelation: string;     // Relation to the Guardian
  guardianOccupation?: string;  // Guardian's Occupation

  // E. Contact Information
  cellphoneNumber: string;      // Cellphone Number
  cellphoneOwner: string;       // Cellphone Owner
  messengerAccount: string;     // Messenger Account
  messengerOwner: string;       // Messenger Owner

  // F. PSA / Family Record Information
  birthCertificatePsa: string;  // Birth Certificate (PSA) - Yes / No / Submitted
  psaFatherNameAge: string;     // Name of Father (Age)
  fatherReligion: string;       // Father's Religion
  psaMotherNameAge: string;     // Name of Mother (Age)
  motherReligion: string;       // Mother's Religion
  birthOrder: number | string;  // Birth order among siblings
  numberOfChildren: number | string; // Number of Children
  baptizedCatholic: string;     // Baptized in Catholic (Yes / No)
  denomination: string;         // If not Catholic, what denomination
  confirmedCatholic: string;    // Confirmed (Yes / No)

  // G. Sibling Information (Rows 1 to 10)
  siblings: SiblingRecord[];
  numSiblings?: number;         // Total siblings helper

  // H. Parish Information
  parishPlace: string;          // Place/Parish
  parishPriest: string;         // Parish Priest Name

  // I. Remarks
  remarks: AdmissionStatus;     // Admission status: 'A - PASS' | 'B - PENDING'
  additionalNotes: string;      // Remarks / Additional Notes
  examScore?: number;           // Exam score
  healthStatus?: string;        // Health & Medical conditions

  // J. Student Signature
  studentSignature: string;     // Student's Signature over Printed Name

  // System audit fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
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

export interface BrandingPreset {
  id: string;
  name: string;
  url: string;
  data?: string;
  mime?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  gradient: string;
  colorBadge: string;
  isDefault?: boolean;
  createdAt?: string;
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
  dashboardBgTheme?: 'royal-blue' | 'navy-gold' | 'emerald' | 'burgundy' | 'slate' | 'custom' | string;
  dashboardBgGradient?: string;
  dashboardBgImageUrl?: string;
  dashboardBgImageData?: string;
  dashboardBgImageMime?: string;
  splashBgImageUrl?: string;
  splashBgImageData?: string;
  splashBgImageMime?: string;
  academicYear?: string;
  updatedAt?: string;

  // Persistent Customization Presets
  logoPresets?: BrandingPreset[];
  dashboardBgPresets?: BrandingPreset[];
  splashBgPresets?: BrandingPreset[];
  customThemePresets?: ThemePreset[];
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

