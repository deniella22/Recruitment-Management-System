export type UserRole = 'Super Administrator' | 'Recruitment Staff' | 'Viewer';

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLoginAt?: string;
  hasPin?: boolean;
  pin?: string;
  aliases?: string[];
}

export type AdmissionStatus = 'Pending' | 'Passed' | 'Conditional' | 'Failed';

export * from './constants/provinces';

export interface RecruitmentList {
  id: string;
  userId?: string;              // Account owner ID
  name: string;                // e.g. "Recruitment 2026–2027"
  schoolName: string;          // "Sisters of Mary School"
  branch: string;              // "Biga"
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentListWithStats extends RecruitmentList {
  totalApplicants: number;
  passedApplicants: number;
  conditionalApplicants: number;
  failedApplicants: number;
  pendingApplicants: number;    // preserved for backward compatibility
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
  fatherAge?: number | string;  // Father's Age
  motherName: string;           // Mother's Name
  motherOccupation: string;     // Mother's Occupation / Trabaho / Hanapbuhay
  motherAge?: number | string;  // Mother's Age
  guardianName: string;         // Guardian's Name
  guardianRelation: string;     // Relation to the Guardian
  guardianOccupation?: string;  // Guardian's Occupation
  guardianAge?: number | string; // Guardian's Age

  // E. Contact Information
  cellphoneNumber: string;      // Cellphone Number
  cellphoneOwner: string;       // Cellphone Owner
  messengerAccount: string;     // Messenger Account
  messengerOwner: string;       // Messenger Owner

  // F. PSA / Family Record Information
  documentsSubmitted?: string[];      // Selected submitted documents (Birth Certificate, Good Moral, Certificate of Enrollment, Grade 6 Report Card)
  birthCertificateType?: 'PSA' | 'NSO' | 'Municipal' | string; // Type of birth certificate
  birthCertificatePsa: string;        // Birth Certificate (PSA) - Yes / No / Submitted (backward compatibility)
  religion?: 'Catholic' | 'Non-Catholic' | string; // Religion (Catholic / Non-Catholic)
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

  // I. Health Assessment & Entrance Exam
  healthStatus?: string;        // Health & Medical conditions / assessment
  examScore?: number;           // Entrance Exam score
  additionalNotes: string;      // Additional Notes
  studentSignature: string;     // Student's Signature over Printed Name

  // J. Admission Status ('Passed' | 'Conditional' | 'Failed')
  admissionStatus?: AdmissionStatus | string; // Primary Admission Status (no default for new records)

  // K. Testing Center
  testingCenterProvince: string; // Province
  testingCenterProvinceOther?: string; // Specified province when 'Others' is selected
  testingCenterLocation: string; // Testing Center Location / Venue
  testingCenter?: string; // Testing Center identifier/name

  // Legacy field preserved for backward compatibility
  remarks?: string;

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
  totalConditional: number;
  totalFailed: number;
  totalPending?: number;        // backward compatibility alias
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

