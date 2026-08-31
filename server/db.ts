import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { User, StudentRecord, SiblingRecord, AuditLogEntry, SystemSettings, BrandingPreset, ThemePreset, RecruitmentList, RecruitmentListWithStats, PaginatedResult } from '../src/types.js';

export function sanitizeStudentRecord(s: any): StudentRecord {
  const lastName = (s.lastName || s.surname || '').trim();
  const firstName = (s.firstName || '').trim();
  const middleName = (s.middleName || '').trim();
  const birthdate = (s.birthdate || s.birthday || '').trim();
  const birthday = birthdate;
  const surname = lastName;

  // Auto-calculate age if not provided
  let age = s.age !== undefined && s.age !== null && s.age !== '' ? s.age : '';
  if (!age && birthdate) {
    const bDate = new Date(birthdate);
    if (!isNaN(bDate.getTime())) {
      const now = new Date();
      let calculatedAge = now.getFullYear() - bDate.getFullYear();
      const m = now.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge > 0 && calculatedAge < 100) {
        age = calculatedAge;
      }
    }
  }

  const sitioStreet = (s.sitioStreet || '').trim();
  const barangay = (s.barangay || '').trim();
  const municipality = (s.municipality || '').trim();
  const province = (s.province || '').trim();
  const address = (s.address || [sitioStreet, barangay, municipality, province].filter(Boolean).join(', ')).trim();

  const elementarySchool = (s.elementarySchool || s.school || '').trim();
  const schoolAddress = (s.schoolAddress || '').trim();
  const reportCardSy = (s.reportCardSy || s.reportCard || 'SY2025-2026 Submitted').trim();
  const lrn = (s.lrn || '').trim();
  const grading = (s.grading || '').trim();
  const currentGrade = (s.currentGrade || 'Grade 6').trim();
  const oldGraduateRemarks = (s.oldGraduateRemarks || s.othersSpecify || '').trim();

  const fatherName = (s.fatherName || '').trim();
  const fatherOccupation = (s.fatherOccupation || '').trim();
  const motherName = (s.motherName || '').trim();
  const motherOccupation = (s.motherOccupation || '').trim();
  const guardianName = (s.guardianName || '').trim();
  const guardianRelation = (s.guardianRelation || s.guardianRelationship || '').trim();
  const guardianOccupation = (s.guardianOccupation || '').trim();

  const cellphoneNumber = (s.cellphoneNumber || s.contactNumber || '').trim();
  const cellphoneOwner = (s.cellphoneOwner || s.contactOwner || 'Parent/Guardian').trim();
  const messengerAccount = (s.messengerAccount || '').trim();
  const messengerOwner = (s.messengerOwner || 'Applicant/Parent').trim();

  const birthCertificatePsa = (s.birthCertificatePsa || (s.hasPsaBirthCert ? 'Yes' : 'Yes')).trim();
  const psaFatherNameAge = (s.psaFatherNameAge || (fatherName ? `${fatherName}` : '')).trim();
  const fatherReligion = (s.fatherReligion || 'Roman Catholic').trim();
  const psaMotherNameAge = (s.psaMotherNameAge || (motherName ? `${motherName}` : '')).trim();
  const motherReligion = (s.motherReligion || 'Roman Catholic').trim();
  const birthOrder = s.birthOrder !== undefined && s.birthOrder !== null && s.birthOrder !== '' ? s.birthOrder : 1;
  const numberOfChildren = s.numberOfChildren !== undefined && s.numberOfChildren !== null && s.numberOfChildren !== ''
    ? s.numberOfChildren
    : (s.numSiblings ? Number(s.numSiblings) + 1 : 1);
  const baptizedCatholic = (s.baptizedCatholic || 'Yes').trim();
  const denomination = (s.denomination || '').trim();
  const confirmedCatholic = (s.confirmedCatholic || 'Yes').trim();

  let siblings: SiblingRecord[] = [];
  if (Array.isArray(s.siblings) && s.siblings.length > 0) {
    siblings = s.siblings.map((sib: any, idx: number) => ({
      siblingNo: Number(sib.siblingNo) || idx + 1,
      name: (sib.name || '').trim(),
      age: sib.age !== undefined && sib.age !== null ? sib.age : '',
      remarks: (sib.remarks || '').trim(),
    }));
  } else if (s.numSiblings && Number(s.numSiblings) > 0) {
    const count = Math.min(Number(s.numSiblings), 10);
    siblings = Array.from({ length: count }, (_, i) => ({
      siblingNo: i + 1,
      name: '',
      age: '',
      remarks: '',
    }));
  }

  const parishPlace = (s.parishPlace || '').trim();
  const parishPriest = (s.parishPriest || '').trim();

  const remarks = (s.remarks === 'A - PASS' ? 'A - PASS' : 'B - PENDING') as any;
  const additionalNotes = (s.additionalNotes || '').trim();
  const examScore = s.examScore !== undefined && s.examScore !== null ? Number(s.examScore) : 0;
  const healthStatus = (s.healthStatus || 'Normal / Fit for schooling').trim();

  const studentSignature = (s.studentSignature || 'Signed / Confirmed').trim();

  const now = new Date().toISOString();

  return {
    id: s.id || ('std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    userId: s.userId,
    recruitmentListId: s.recruitmentListId ? String(s.recruitmentListId).trim() : undefined,
    idPhotoUrl: s.idPhotoUrl || s.idPhotoData || s.photoUrl || '',
    lastName,
    surname,
    firstName,
    middleName,
    birthdate,
    birthday,
    age,
    gender: s.gender || 'Female',
    sitioStreet,
    barangay,
    municipality,
    province,
    address,
    elementarySchool,
    school: elementarySchool,
    schoolAddress,
    reportCardSy,
    lrn,
    grading,
    currentGrade,
    oldGraduateRemarks,
    fatherName,
    fatherOccupation,
    motherName,
    motherOccupation,
    guardianName,
    guardianRelation,
    guardianOccupation,
    cellphoneNumber,
    cellphoneOwner,
    messengerAccount,
    messengerOwner,
    birthCertificatePsa,
    psaFatherNameAge,
    fatherReligion,
    psaMotherNameAge,
    motherReligion,
    birthOrder,
    numberOfChildren,
    baptizedCatholic,
    denomination,
    confirmedCatholic,
    siblings,
    numSiblings: siblings.length || (s.numSiblings ? Number(s.numSiblings) : 0),
    parishPlace,
    parishPriest,
    remarks,
    additionalNotes,
    examScore,
    healthStatus,
    studentSignature,
    createdAt: s.createdAt || now,
    updatedAt: s.updatedAt || now,
    createdBy: s.createdBy || 'System',
    updatedBy: s.updatedBy || 'System',
  };
}

interface DbSchema {
  users: (User & { passwordHash: string })[];
  recruitmentLists: RecruitmentList[];
  students: StudentRecord[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');
const DB_TMP_FILE = path.join(DATA_DIR, 'db.tmp.json');

export const DEFAULT_LOGO_PRESETS: BrandingPreset[] = [
  {
    id: 'default-blue-logo',
    name: 'Official Blue Circular Emblem',
    url: '/school-logo.png',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-vector-emblem',
    name: 'Vector Emblem',
    url: '/school_logo.svg',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_DASHBOARD_BG_PRESETS: BrandingPreset[] = [
  {
    id: 'default-campus-grounds',
    name: 'School Campus Grounds',
    url: '/school-campus-background.jpg',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-sunset-campus',
    name: 'Campus Sunset Panorama',
    url: '/school-sunset-background.jpg',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_SPLASH_BG_PRESETS: BrandingPreset[] = [
  {
    id: 'default-sunset-splash',
    name: 'School Sunset Panorama',
    url: '/school-sunset-background.jpg',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-campus-splash',
    name: 'School Campus Grounds',
    url: '/school-campus-background.jpg',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'royal-blue',
    name: 'Institutional Royal Blue',
    gradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
    colorBadge: 'bg-[#1E3A8A]',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'navy-gold',
    name: 'Navy & Amber Gold',
    gradient: 'from-[#0F172A] via-[#1E3A8A] to-[#D97706]',
    colorBadge: 'bg-[#0F172A]',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emerald',
    name: 'Academic Emerald',
    gradient: 'from-[#064E3B] via-[#047857] to-[#022c22]',
    colorBadge: 'bg-[#064E3B]',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'burgundy',
    name: 'Classic Burgundy',
    gradient: 'from-[#691B23] via-[#881337] to-[#4c0519]',
    colorBadge: 'bg-[#691B23]',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'slate',
    name: 'Slate Tech',
    gradient: 'from-[#1e293b] via-[#334155] to-[#0f172a]',
    colorBadge: 'bg-[#334155]',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'system_default_settings',
  setupCompleted: false,
  schoolName: 'Sisters of Mary School – Talisay, Cebu',
  subTitle: 'Internal Student Recruitment & Information Management System',
  systemName: 'Student Recruitment Management System',
  schoolLocation: 'Talisay, Cebu, Philippines',
  schoolLogoUrl: '/school-logo.png',
  maxExamScore: 100,
  dashboardBgTheme: 'custom',
  dashboardBgGradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
  dashboardBgImageUrl: '/school-campus-background.jpg',
  splashBgImageUrl: '/school-sunset-background.jpg',
  academicYear: 'SY 2026-2027 Recruitment',
  logoPresets: DEFAULT_LOGO_PRESETS,
  dashboardBgPresets: DEFAULT_DASHBOARD_BG_PRESETS,
  splashBgPresets: DEFAULT_SPLASH_BG_PRESETS,
  customThemePresets: DEFAULT_THEME_PRESETS,
  updatedAt: new Date().toISOString(),
};

// In-memory cache for ultra-fast, consistent, race-free state
let inMemoryDb: DbSchema | null = null;

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function parseBase64Image(dataString: string, fallbackMime = 'image/png'): { base64Data: string; mimeType: string; ext: string } {
  let mimeType = fallbackMime;
  let base64Data = dataString;

  const mimeMatch = dataString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
    base64Data = dataString.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, '');
  }

  let ext = '.png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
  else if (mimeType.includes('webp')) ext = '.webp';
  else if (mimeType.includes('svg')) ext = '.svg';
  else if (mimeType.includes('gif')) ext = '.gif';

  return { base64Data, mimeType, ext };
}

function validateAndSanitizeDb(raw: any): DbSchema {
  const rawUsers: (User & { passwordHash: string })[] = Array.isArray(raw?.users) ? raw.users : [];
  const rawRecruitmentLists: RecruitmentList[] = Array.isArray(raw?.recruitmentLists) ? raw.recruitmentLists : [];
  const rawStudents: StudentRecord[] = Array.isArray(raw?.students) ? raw.students : [];
  const rawLogs: AuditLogEntry[] = Array.isArray(raw?.auditLogs) ? raw.auditLogs : [];

  // Deduplicate and sanitize users strictly by id and normalized username
  const seenUserIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const cleanUsers: (User & { passwordHash: string; pinHash?: string })[] = [];
  const idRemap = new Map<string, string>(); // oldDuplicateId -> primaryId

  for (const u of rawUsers) {
    if (!u || !u.id) continue;
    const cleanId = u.id.trim();
    const cleanUsername = (u.username || '').trim().toLowerCase();

    // Check if duplicate of an already processed user
    const existing = cleanUsers.find(
      (existingUser) =>
        existingUser.id === cleanId ||
        (cleanUsername && existingUser.username.toLowerCase() === cleanUsername)
    );

    if (existing) {
      // Map duplicate user ID to the primary user ID
      idRemap.set(cleanId, existing.id);
      // If the duplicate had newer login date or information, preserve it
      if (u.lastLoginAt && (!existing.lastLoginAt || new Date(u.lastLoginAt) > new Date(existing.lastLoginAt))) {
        existing.lastLoginAt = u.lastLoginAt;
      }
      if (u.role === 'Super Administrator' && existing.role !== 'Super Administrator') {
        existing.role = 'Super Administrator';
      }
      continue;
    }

    seenUserIds.add(cleanId);
    if (cleanUsername) seenUsernames.add(cleanUsername);

    cleanUsers.push({
      ...u,
      id: cleanId,
      fullName: (u.fullName || '').trim(),
      username: (u.username || '').trim(),
      role: u.role || 'Recruitment Staff',
      status: u.status || 'Active',
      hasPin: !!((u as any).pinHash || (u as any).pin),
      createdAt: u.createdAt || new Date().toISOString(),
    });
  }

  // Remap recruitment lists and students if any duplicate IDs were merged
  const cleanRecruitmentLists: RecruitmentList[] = rawRecruitmentLists
    .filter((r) => r && r.id && r.name)
    .map((r) => {
      const cleanUserId = r.userId && idRemap.has(r.userId) ? idRemap.get(r.userId)! : r.userId;
      return {
        id: r.id.trim(),
        userId: cleanUserId,
        name: r.name.trim(),
        schoolName: (r.schoolName || 'Sisters of Mary School').trim(),
        branch: (r.branch || 'Talisay, Cebu').trim(),
        archived: Boolean(r.archived),
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };
    });

  const cleanStudents = rawStudents.map((s) => {
    let cleanUserId = s.userId;
    if (s.userId && idRemap.has(s.userId)) {
      cleanUserId = idRemap.get(s.userId)!;
    }
    return sanitizeStudentRecord({
      ...s,
      userId: cleanUserId,
      recruitmentListId: s.recruitmentListId ? s.recruitmentListId.trim() : undefined,
    });
  });

  const cleanLogs = rawLogs.map((log) => {
    if (log.userId && idRemap.has(log.userId)) {
      return { ...log, userId: idRemap.get(log.userId)! };
    }
    return log;
  });

  const rawSettings = raw?.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const isSetupCompleted = cleanUsers.length > 0 || Boolean(rawSettings.setupCompleted);
  const superAdmin = cleanUsers.find((u) => u.role === 'Super Administrator') || cleanUsers[0];

  // Sanitize Logo Presets
  const rawLogos: BrandingPreset[] = Array.isArray(rawSettings.logoPresets) ? rawSettings.logoPresets : [];
  const mergedLogos = [...DEFAULT_LOGO_PRESETS];
  for (const l of rawLogos) {
    if (!l || !l.url) continue;
    if (!mergedLogos.some((m) => m.id === l.id || m.url === l.url)) {
      mergedLogos.push({
        id: l.id || 'logo_' + Math.random().toString(36).substring(2, 8),
        name: (l.name || 'Custom Logo').trim(),
        url: l.url.trim(),
        data: l.data,
        mime: l.mime,
        isDefault: Boolean(l.isDefault),
        createdAt: l.createdAt || new Date().toISOString(),
      });
    }
  }

  // Sanitize Dashboard Background Presets
  const rawDashboardBgs: BrandingPreset[] = Array.isArray(rawSettings.dashboardBgPresets) ? rawSettings.dashboardBgPresets : [];
  const mergedDashboardBgs = [...DEFAULT_DASHBOARD_BG_PRESETS];
  for (const bg of rawDashboardBgs) {
    if (!bg || !bg.url) continue;
    if (!mergedDashboardBgs.some((m) => m.id === bg.id || m.url === bg.url)) {
      mergedDashboardBgs.push({
        id: bg.id || 'dbg_' + Math.random().toString(36).substring(2, 8),
        name: (bg.name || 'Custom Dashboard BG').trim(),
        url: bg.url.trim(),
        data: bg.data,
        mime: bg.mime,
        isDefault: Boolean(bg.isDefault),
        createdAt: bg.createdAt || new Date().toISOString(),
      });
    }
  }

  // Sanitize Splash Background Presets
  const rawSplashBgs: BrandingPreset[] = Array.isArray(rawSettings.splashBgPresets) ? rawSettings.splashBgPresets : [];
  const mergedSplashBgs = [...DEFAULT_SPLASH_BG_PRESETS];
  for (const sbg of rawSplashBgs) {
    if (!sbg || !sbg.url) continue;
    if (!mergedSplashBgs.some((m) => m.id === sbg.id || m.url === sbg.url)) {
      mergedSplashBgs.push({
        id: sbg.id || 'sbg_' + Math.random().toString(36).substring(2, 8),
        name: (sbg.name || 'Custom Splash BG').trim(),
        url: sbg.url.trim(),
        data: sbg.data,
        mime: sbg.mime,
        isDefault: Boolean(sbg.isDefault),
        createdAt: sbg.createdAt || new Date().toISOString(),
      });
    }
  }

  // Sanitize Custom Theme Presets
  const rawThemes: ThemePreset[] = Array.isArray(rawSettings.customThemePresets) ? rawSettings.customThemePresets : [];
  const mergedThemes = [...DEFAULT_THEME_PRESETS];
  for (const t of rawThemes) {
    if (!t || !t.gradient) continue;
    if (!mergedThemes.some((m) => m.id === t.id || m.gradient === t.gradient)) {
      mergedThemes.push({
        id: t.id || 'theme_' + Math.random().toString(36).substring(2, 8),
        name: (t.name || 'Custom Theme').trim(),
        gradient: t.gradient.trim(),
        colorBadge: t.colorBadge || 'bg-[#1E3A8A]',
        isDefault: Boolean(t.isDefault),
        createdAt: t.createdAt || new Date().toISOString(),
      });
    }
  }

  return {
    users: cleanUsers,
    recruitmentLists: cleanRecruitmentLists,
    students: cleanStudents,
    auditLogs: cleanLogs,
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      logoPresets: mergedLogos,
      dashboardBgPresets: mergedDashboardBgs,
      splashBgPresets: mergedSplashBgs,
      customThemePresets: mergedThemes,
      setupCompleted: isSetupCompleted,
      ...(superAdmin ? { administratorUserId: superAdmin.id } : {}),
    },
  };
}

function loadDbFromDisk(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Try reading primary DB_FILE
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content);
        const valid = validateAndSanitizeDb(parsed);
        // Successful read -> keep memory copy & backup
        inMemoryDb = valid;
        try {
          fs.writeFileSync(DB_BACKUP_FILE, JSON.stringify(valid, null, 2), 'utf-8');
        } catch (bErr) {
          // Backup write warning
        }
        return valid;
      }
    } catch (err) {
      console.error('[DB] Error reading primary db.json, attempting backup restoration:', err);
    }
  }

  // 2. Try recovering from DB_BACKUP_FILE if primary failed
  if (fs.existsSync(DB_BACKUP_FILE)) {
    try {
      const backupContent = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
      if (backupContent && backupContent.trim().length > 0) {
        const parsedBackup = JSON.parse(backupContent);
        const validBackup = validateAndSanitizeDb(parsedBackup);
        console.warn('[DB] Restored database state from db.backup.json successfully.');
        inMemoryDb = validBackup;
        // Save back to primary DB_FILE
        fs.writeFileSync(DB_FILE, JSON.stringify(validBackup, null, 2), 'utf-8');
        return validBackup;
      }
    } catch (backupErr) {
      console.error('[DB] Backup restoration also failed:', backupErr);
    }
  }

  // 3. If in-memory copy already exists with data, NEVER wipe it
  if (inMemoryDb && inMemoryDb.users && inMemoryDb.users.length > 0) {
    console.warn('[DB] Using existing in-memory database to prevent data loss.');
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    } catch (e) {}
    return inMemoryDb;
  }

  // 4. Initial brand new setup
  console.log('[DB] Initializing new database storage.');
  const initialDb: DbSchema = {
    users: [],
    recruitmentLists: [],
    students: [],
    auditLogs: [],
    settings: DEFAULT_SETTINGS,
  };
  inMemoryDb = initialDb;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    fs.writeFileSync(DB_BACKUP_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (initErr) {
    console.error('[DB] Error writing initial database file:', initErr);
  }
  return initialDb;
}

let pgPool: pg.Pool | null = null;
let pgInitialized = false;
let dbDriverType: 'PostgreSQL' | 'Local Persistent File' = 'Local Persistent File';

function getPgPool(): pg.Pool | null {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_CONNECTION_STRING;
  if (!dbUrl || dbUrl.trim() === '') return null;
  if (!pgPool) {
    const cleanUrl = dbUrl.trim();
    const isLocal = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');
    pgPool = new pg.Pool({
      connectionString: cleanUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pgPool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pgPool;
}

export function getDatabaseStatus(): {
  driver: 'PostgreSQL' | 'Local Persistent File';
  pgConnected: boolean;
  userCount: number;
  studentCount: number;
  recruitmentListCount: number;
} {
  const db = ensureDbExists();
  return {
    driver: dbDriverType,
    pgConnected: pgInitialized,
    userCount: db.users.length,
    studentCount: db.students.length,
    recruitmentListCount: (db.recruitmentLists || []).length,
  };
}

export async function initDatabaseAsync(): Promise<void> {
  // Always load from local disk / backup first for instant readiness
  loadDbFromDisk();

  const pool = getPgPool();
  if (!pool) {
    if (process.env.NODE_ENV === 'production' && !process.env.AIS_SANDBOX) {
      console.warn('======================================================================');
      console.warn('[DB WARNING] Running in PRODUCTION mode without DATABASE_URL!');
      console.warn('Render container filesystems are ephemeral and reset on redeployments.');
      console.warn('To ensure 100% permanent data persistence across restarts and redeploys:');
      console.warn('1. Create a PostgreSQL Database on Render (or Neon/Supabase).');
      console.warn('2. Add the DATABASE_URL environment variable in your Render dashboard.');
      console.warn('======================================================================');
    } else {
      console.log('[DB] Persistence: Using local crash-safe atomic persistent disk storage.');
    }
    dbDriverType = 'Local Persistent File';
    return;
  }

  try {
    console.log('[DB] Connecting to PostgreSQL database for production cloud persistence...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_store (
        key VARCHAR(128) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if cloud copy exists
    const res = await pool.query('SELECT data FROM system_store WHERE key = $1', ['main_db']);
    if (res.rows.length > 0 && res.rows[0].data) {
      const cloudDb = res.rows[0].data;
      const valid = validateAndSanitizeDb(cloudDb);

      // Check if local file has data that needs migration (e.g. if local has records and cloud has 0 users)
      const localCurrent = ensureDbExists();
      if (valid.users.length === 0 && localCurrent.users.length > 0) {
        console.log(`[DB Migration] Migrating ${localCurrent.users.length} user(s) and ${localCurrent.students.length} record(s) from local storage into PostgreSQL...`);
        await pool.query(
          'INSERT INTO system_store (key, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
          ['main_db', JSON.stringify(localCurrent)]
        );
        inMemoryDb = localCurrent;
      } else {
        inMemoryDb = valid;
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(valid, null, 2), 'utf-8');
          fs.writeFileSync(DB_BACKUP_FILE, JSON.stringify(valid, null, 2), 'utf-8');
        } catch (fErr) {}
      }

      pgInitialized = true;
      dbDriverType = 'PostgreSQL';
      console.log(`[DB] Successfully loaded persistent state from PostgreSQL (${inMemoryDb.users.length} users, ${inMemoryDb.students.length} student records, ${(inMemoryDb.recruitmentLists || []).length} lists).`);
    } else {
      // First-time PostgreSQL initialization: migrate all current database state into PostgreSQL
      const current = ensureDbExists();
      await pool.query(
        'INSERT INTO system_store (key, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
        ['main_db', JSON.stringify(current)]
      );
      pgInitialized = true;
      dbDriverType = 'PostgreSQL';
      console.log(`[DB Migration] Initialized PostgreSQL store and migrated current application data (${current.users.length} users, ${current.students.length} student records).`);
    }
  } catch (err: any) {
    console.error('[DB ERROR] Failed to connect to PostgreSQL:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.warn('[DB] Falling back to local file storage temporarily.');
    }
  }
}

function ensureDbExists(): DbSchema {
  if (inMemoryDb) {
    return inMemoryDb;
  }
  return loadDbFromDisk();
}

function saveDb(db: DbSchema): void {
  // Update in-memory copy immediately
  inMemoryDb = db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const jsonString = JSON.stringify(db, null, 2);

  try {
    // 1. Atomic write via temporary file
    fs.writeFileSync(DB_TMP_FILE, jsonString, 'utf-8');
    fs.renameSync(DB_TMP_FILE, DB_FILE);

    // 2. Update persistent backup file
    fs.writeFileSync(DB_BACKUP_FILE, jsonString, 'utf-8');
  } catch (err) {
    console.error('[DB] Critical error saving database file:', err);
    // Direct fallback write
    try {
      fs.writeFileSync(DB_FILE, jsonString, 'utf-8');
    } catch (directErr) {
      console.error('[DB] Fallback direct write failed:', directErr);
    }
  }

  // 3. Persist to PostgreSQL cloud database if connected
  const pool = getPgPool();
  if (pool && pgInitialized) {
    pool.query(
      'INSERT INTO system_store (key, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
      ['main_db', jsonString]
    ).catch((pgErr) => {
      console.error('[DB] PostgreSQL persistent write warning:', pgErr.message);
    });
  }
}

export const dbService = {
  getDb(): DbSchema {
    return ensureDbExists();
  },

  // USERS
  getUsers(): User[] {
    const db = ensureDbExists();
    return db.users.map(({ passwordHash, ...user }) => user);
  },

  getUserByUsername(username: string): (User & { passwordHash: string }) | undefined {
    const db = ensureDbExists();
    const clean = (username || '').trim().toLowerCase();
    if (!clean) return undefined;
    return db.users.find((u) => u.username.toLowerCase() === clean);
  },

  getUserByUsernameOrEmail(identifier: string): (User & { passwordHash: string }) | undefined {
    const db = ensureDbExists();
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId) return undefined;
    return db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.id.toLowerCase() === cleanId
    );
  },

  checkUserExists(username: string): { exists: boolean; matchedField?: 'username'; existingUser?: User } {
    const db = ensureDbExists();
    const cleanUsername = (username || '').trim().toLowerCase();

    const match = db.users.find((u) => {
      const uUser = u.username.toLowerCase();
      return cleanUsername && uUser === cleanUsername;
    });

    if (match) {
      const { passwordHash: _, pinHash: __, ...cleanMatch } = match as any;
      return { exists: true, matchedField: 'username', existingUser: cleanMatch };
    }
    return { exists: false };
  },

  getUserById(id: string): User | undefined {
    const db = ensureDbExists();
    if (!id) return undefined;
    const user = db.users.find((u) => u.id === id);
    if (!user) return undefined;
    const { passwordHash, pinHash, ...userClean } = user as any;
    return userClean;
  },

  createUser(userData: {
    fullName: string;
    username: string;
    password: string;
    pin?: string;
    role: User['role'];
  }): User {
    const db = ensureDbExists();
    const cleanUsername = userData.username.trim().toLowerCase();

    const existing = db.users.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      throw new Error('An account with this username already exists. Please log in to your existing account.');
    }

    const passwordHash = bcrypt.hashSync(userData.password, 10);
    const pin = (userData.pin || '1234').trim();
    const pinHash = bcrypt.hashSync(pin, 10);

    const newUser: User & { passwordHash: string; pinHash?: string } = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      fullName: userData.fullName.trim(),
      username: cleanUsername,
      passwordHash,
      pinHash,
      role: userData.role,
      status: 'Active',
      hasPin: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.settings = {
      ...DEFAULT_SETTINGS,
      ...db.settings,
      setupCompleted: true,
      administratorUserId: newUser.role === 'Super Administrator' ? newUser.id : (db.settings?.administratorUserId || newUser.id),
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);

    console.log(`[DB] Successfully created and persisted account for: ${newUser.fullName} (@${newUser.username}) - Total Users in DB: ${db.users.length}`);

    const { passwordHash: _, pinHash: __, ...cleanUser } = newUser;
    return cleanUser;
  },

  updateUser(id: string, updates: Partial<User> & { password?: string; pin?: string }): User {
    const db = ensureDbExists();
    const userIdx = db.users.findIndex((u) => u.id === id);
    if (userIdx === -1) {
      throw new Error('User not found');
    }

    if (updates.fullName) db.users[userIdx].fullName = updates.fullName.trim();
    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const duplicate = db.users.find((u) => u.id !== id && u.username.toLowerCase() === cleanUsername);
      if (duplicate) {
        throw new Error('An account with this username already exists.');
      }
      db.users[userIdx].username = cleanUsername;
    }
    if (updates.role) db.users[userIdx].role = updates.role;
    if (updates.status) db.users[userIdx].status = updates.status;
    if (updates.password) {
      db.users[userIdx].passwordHash = bcrypt.hashSync(updates.password, 10);
    }
    if (updates.pin) {
      (db.users[userIdx] as any).pinHash = bcrypt.hashSync(updates.pin.trim(), 10);
      db.users[userIdx].hasPin = true;
    }

    saveDb(db);
    const { passwordHash, pinHash, ...cleanUser } = db.users[userIdx] as any;
    return cleanUser;
  },

  verifyPin(inputPin: string, user: { pinHash?: string; pin?: string }): boolean {
    const cleanPin = (inputPin || '').trim();
    if (!cleanPin) return false;
    if (user.pin && user.pin === cleanPin) return true;
    if (user.pinHash) {
      try {
        return bcrypt.compareSync(cleanPin, user.pinHash);
      } catch {
        return false;
      }
    }
    return cleanPin === '1234';
  },

  deleteUser(id: string): boolean {
    const db = ensureDbExists();
    const initialLen = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);
    if (db.users.length !== initialLen) {
      if (db.users.length === 0 && db.settings) {
        db.settings.setupCompleted = false;
        delete db.settings.administratorUserId;
      }
      saveDb(db);
      return true;
    }
    return false;
  },

  resetUsers(): void {
    const db = ensureDbExists();
    db.users = [];
    if (db.settings) {
      db.settings.setupCompleted = false;
      delete db.settings.administratorUserId;
      db.settings.updatedAt = new Date().toISOString();
    }
    saveDb(db);
    console.log('[DB] All user accounts have been reset. Settings and logo preserved.');
  },

  deleteUserAccount(userId: string): { success: boolean; deletedStudentsCount: number } {
    const db = ensureDbExists();
    const initialUsersCount = db.users.length;
    db.users = db.users.filter((u) => u.id !== userId);

    const initialStudentsCount = db.students.length;
    // Remove all student records owned by this user
    db.students = db.students.filter((s) => s.userId !== userId);
    const deletedStudentsCount = initialStudentsCount - db.students.length;

    // Remove recruitment lists owned by this user
    if (db.recruitmentLists) {
      db.recruitmentLists = db.recruitmentLists.filter((r) => r.userId !== userId);
    }

    // Remove audit logs for this user
    db.auditLogs = db.auditLogs.filter((log) => log.userId !== userId);

    saveDb(db);
    return {
      success: db.users.length !== initialUsersCount,
      deletedStudentsCount,
    };
  },

  verifyPassword(password: string, passwordHash: string): boolean {
    return bcrypt.compareSync(password, passwordHash);
  },

  updateLastLogin(userId: string): void {
    const db = ensureDbExists();
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      saveDb(db);
    }
  },

  // RECRUITMENT LISTS (Workspace lists)
  getRecruitmentLists(userId?: string, includeArchived = false): RecruitmentList[] {
    const db = ensureDbExists();
    if (!userId) return [];
    const list = db.recruitmentLists || [];
    return list.filter((r) => r.userId === userId && (includeArchived || !r.archived));
  },

  getRecruitmentListsWithStats(userId?: string, includeArchived = false): RecruitmentListWithStats[] {
    const db = ensureDbExists();
    if (!userId) return [];
    const lists = (db.recruitmentLists || []).filter(
      (r) => r.userId === userId && (includeArchived || !r.archived)
    );
    const userStudents = db.students.filter((s) => s.userId === userId);

    return lists.map((list) => {
      const listStudents = userStudents.filter((s) => s.recruitmentListId === list.id);
      const totalApplicants = listStudents.length;
      const passedApplicants = listStudents.filter((s) => s.remarks === 'A - PASS').length;
      const pendingApplicants = listStudents.filter((s) => s.remarks === 'B - PENDING').length;

      let latestTime = new Date(list.updatedAt || list.createdAt).getTime();
      for (const s of listStudents) {
        const sTime = new Date(s.updatedAt || s.createdAt).getTime();
        if (sTime > latestTime) latestTime = sTime;
      }

      return {
        ...list,
        totalApplicants,
        passedApplicants,
        pendingApplicants,
        lastUpdated: new Date(latestTime).toISOString(),
      };
    });
  },

  getRecruitmentListById(id: string, userId?: string): RecruitmentList | undefined {
    const db = ensureDbExists();
    if (!userId || !id) return undefined;
    const list = db.recruitmentLists || [];
    return list.find((r) => r.id === id && r.userId === userId);
  },

  createRecruitmentList(
    data: { name: string; schoolName?: string; branch?: string; userId?: string },
    operatorName: string
  ): RecruitmentList {
    const db = ensureDbExists();
    if (!db.recruitmentLists) db.recruitmentLists = [];
    if (!data.userId) throw new Error('User ID is required to create a recruitment list');

    const cleanName = (data.name || '').trim();
    if (!cleanName) throw new Error('Recruitment list name is required');

    const cleanSchool = (data.schoolName || 'Sisters of Mary School').trim();
    const cleanBranch = (data.branch || 'Talisay, Cebu').trim();

    const duplicate = db.recruitmentLists.find(
      (r) =>
        r.userId === data.userId &&
        r.name.toLowerCase() === cleanName.toLowerCase() &&
        r.branch.toLowerCase() === cleanBranch.toLowerCase()
    );

    if (duplicate) {
      if (duplicate.archived) {
        duplicate.archived = false;
        duplicate.updatedAt = new Date().toISOString();
        saveDb(db);
        return duplicate;
      }
      throw new Error(`A recruitment list named "${cleanName}" for ${cleanBranch} already exists.`);
    }

    const now = new Date().toISOString();
    const newList: RecruitmentList = {
      id: 'rcl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: data.userId,
      name: cleanName,
      schoolName: cleanSchool,
      branch: cleanBranch,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    db.recruitmentLists.push(newList);
    saveDb(db);
    return newList;
  },

  updateRecruitmentList(
    id: string,
    updates: Partial<RecruitmentList>,
    operatorName: string,
    userId?: string
  ): RecruitmentList {
    const db = ensureDbExists();
    if (!db.recruitmentLists) db.recruitmentLists = [];
    const idx = db.recruitmentLists.findIndex((r) => r.id === id && (!userId || r.userId === userId));
    if (idx === -1) {
      throw new Error('Recruitment list not found');
    }

    if (updates.name) {
      const cleanName = updates.name.trim();
      const existing = db.recruitmentLists.find(
        (r) =>
          r.id !== id &&
          (!userId || r.userId === userId) &&
          r.name.toLowerCase() === cleanName.toLowerCase() &&
          r.branch.toLowerCase() === (updates.branch || db.recruitmentLists[idx].branch).toLowerCase()
      );
      if (existing) {
        throw new Error(`A recruitment list named "${cleanName}" already exists.`);
      }
    }

    const updated: RecruitmentList = {
      ...db.recruitmentLists[idx],
      ...updates,
      name: updates.name ? updates.name.trim() : db.recruitmentLists[idx].name,
      schoolName: updates.schoolName ? updates.schoolName.trim() : db.recruitmentLists[idx].schoolName,
      branch: updates.branch ? updates.branch.trim() : db.recruitmentLists[idx].branch,
      updatedAt: new Date().toISOString(),
    };

    db.recruitmentLists[idx] = updated;
    saveDb(db);
    return updated;
  },

  deleteRecruitmentList(id: string, userId?: string): { success: boolean; deletedStudentsCount: number } {
    const db = ensureDbExists();
    if (!userId || !db.recruitmentLists) return { success: false, deletedStudentsCount: 0 };
    const list = db.recruitmentLists.find((r) => r.id === id && r.userId === userId);
    if (!list) return { success: false, deletedStudentsCount: 0 };

    db.recruitmentLists = db.recruitmentLists.filter((r) => !(r.id === id && r.userId === userId));
    
    const beforeCount = db.students.length;
    db.students = db.students.filter((s) => !(s.recruitmentListId === id && s.userId === userId));
    const deletedStudentsCount = beforeCount - db.students.length;

    saveDb(db);
    return { success: true, deletedStudentsCount };
  },

  // STUDENTS (Account-based & Workspace strict isolation with pagination & fast search)
  getStudents(userId?: string, recruitmentListId?: string): StudentRecord[] {
    const db = ensureDbExists();
    if (!userId) return [];
    let list = db.students.filter((s) => s.userId === userId);
    if (recruitmentListId) {
      list = list.filter((s) => s.recruitmentListId === recruitmentListId);
    }
    return list;
  },

  queryStudents(params: {
    userId?: string;
    recruitmentListId?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): PaginatedResult<StudentRecord> {
    const db = ensureDbExists();
    if (!params.userId) {
      return { data: [], page: 1, limit: 20, totalRecords: 0, totalPages: 0 };
    }

    let records = db.students.filter((s) => s.userId === params.userId);

    if (params.recruitmentListId) {
      records = records.filter((s) => s.recruitmentListId === params.recruitmentListId);
    }

    // Search filter
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      records = records.filter((s) => {
        const full = `${s.lastName || s.surname || ''} ${s.firstName || ''} ${s.middleName || ''}`.toLowerCase();
        const lrn = (s.lrn || '').toLowerCase();
        const school = (s.elementarySchool || s.school || '').toLowerCase();
        const bgy = (s.barangay || '').toLowerCase();
        const mun = (s.municipality || '').toLowerCase();
        const prov = (s.province || '').toLowerCase();
        const addr = (s.address || '').toLowerCase();

        return full.includes(q) ||
          lrn.includes(q) ||
          school.includes(q) ||
          bgy.includes(q) ||
          mun.includes(q) ||
          prov.includes(q) ||
          addr.includes(q);
      });
    }

    // Status filter
    if (params.status && params.status !== 'ALL') {
      records = records.filter((s) => s.remarks === params.status);
    }

    // Sorting
    const sortBy = params.sortBy || 'fullName';
    const order = params.sortOrder === 'desc' ? -1 : 1;

    records.sort((a, b) => {
      let comp = 0;
      switch (sortBy) {
        case 'lrn':
          comp = (a.lrn || '').localeCompare(b.lrn || '');
          break;
        case 'lastName':
        case 'surname':
          comp = (a.lastName || a.surname || '').localeCompare(b.lastName || b.surname || '');
          break;
        case 'birthday':
        case 'birthdate':
          comp = (a.birthdate || a.birthday || '').localeCompare(b.birthdate || b.birthday || '');
          break;
        case 'examScore':
          comp = (a.examScore || 0) - (b.examScore || 0);
          break;
        case 'elementarySchool':
          comp = (a.elementarySchool || '').localeCompare(b.elementarySchool || '');
          break;
        case 'remarks':
          comp = (a.remarks || '').localeCompare(b.remarks || '');
          break;
        case 'createdAt':
          comp = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'fullName':
        default: {
          const nameA = `${a.lastName || a.surname || ''} ${a.firstName || ''}`.toLowerCase();
          const nameB = `${b.lastName || b.surname || ''} ${b.firstName || ''}`.toLowerCase();
          comp = nameA.localeCompare(nameB);
          break;
        }
      }
      return comp * order;
    });

    const totalRecords = records.length;
    const limit = params.limit !== undefined && params.limit > 0 ? params.limit : (records.length || 20);
    const page = Math.max(1, params.page || 1);
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginatedData = records.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      page,
      limit,
      totalRecords,
      totalPages,
    };
  },

  getStudentById(id: string, userId?: string, recruitmentListId?: string): StudentRecord | undefined {
    const db = ensureDbExists();
    if (!userId) return undefined;
    return db.students.find(
      (s) => s.id === id && s.userId === userId && (!recruitmentListId || s.recruitmentListId === recruitmentListId)
    );
  },

  getStudentByLrn(lrn: string, userId?: string, recruitmentListId?: string): StudentRecord | undefined {
    const db = ensureDbExists();
    if (!userId) return undefined;
    const cleanLrn = lrn.trim();
    return db.students.find(
      (s) => s.lrn.trim() === cleanLrn && s.userId === userId && (!recruitmentListId || s.recruitmentListId === recruitmentListId)
    );
  },

  createStudent(
    studentData: Partial<StudentRecord> & { userId?: string },
    operatorName: string
  ): StudentRecord {
    const db = ensureDbExists();

    // Strict duplicate check before creating a record
    const dupCheck = this.checkDuplicate(studentData, studentData.userId, undefined, studentData.recruitmentListId);
    if (dupCheck.duplicateStatus === 'EXACT') {
      throw new Error(dupCheck.message || `Duplicate student record: ${dupCheck.existingRecord?.lastName || dupCheck.existingRecord?.surname}, ${dupCheck.existingRecord?.firstName} (LRN: ${dupCheck.existingRecord?.lrn || 'N/A'}) already exists in this recruitment list.`);
    }

    const sanitized = sanitizeStudentRecord({
      ...studentData,
      createdBy: operatorName,
      updatedBy: operatorName,
    });

    db.students.push(sanitized);
    saveDb(db);

    return sanitized;
  },

  updateStudent(
    id: string,
    updates: Partial<StudentRecord>,
    operatorName: string,
    userId?: string
  ): StudentRecord {
    const db = ensureDbExists();
    const idx = db.students.findIndex((s) => s.id === id && (!userId || s.userId === userId));
    if (idx === -1) {
      throw new Error('Student record not found');
    }

    const currentRecruitmentId = db.students[idx].recruitmentListId;

    // If LRN is being changed, check if new LRN exists on ANOTHER record belonging to this user in the same list
    if (updates.lrn && updates.lrn.trim() !== db.students[idx].lrn.trim()) {
      const cleanLrn = updates.lrn.trim();
      const duplicate = db.students.find(
        (s) =>
          s.id !== id &&
          s.lrn.trim() === cleanLrn &&
          (!userId || s.userId === userId) &&
          (!currentRecruitmentId || s.recruitmentListId === currentRecruitmentId)
      );
      if (duplicate) {
        throw new Error(`This LRN (${cleanLrn}) already exists for student: ${duplicate.lastName || duplicate.surname}, ${duplicate.firstName}.`);
      }
    }

    const merged = {
      ...db.students[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: operatorName,
    };

    const sanitized = sanitizeStudentRecord(merged);
    db.students[idx] = sanitized;
    saveDb(db);

    return sanitized;
  },

  deleteStudent(id: string, userId?: string): boolean {
    const db = ensureDbExists();
    if (!userId) return false;
    const initialLen = db.students.length;
    db.students = db.students.filter((s) => !(s.id === id && s.userId === userId));
    if (db.students.length !== initialLen) {
      saveDb(db);
      return true;
    }
    return false;
  },

  // DUPLICATE DETECTION ENGINE (Normalization & Multi-factor matching)
  checkDuplicate(
    candidate: Partial<StudentRecord>,
    userId?: string,
    excludeId?: string,
    recruitmentListId?: string
  ): {
    duplicateStatus: 'EXACT' | 'POSSIBLE' | 'NONE';
    existingRecord?: StudentRecord;
    matchedFields?: string[];
    matchReason?: string;
    message: string;
  } {
    const db = ensureDbExists();
    const userStudents = db.students.filter(
      (s) =>
        (!userId || s.userId === userId) &&
        (!excludeId || s.id !== excludeId) &&
        (!recruitmentListId || !s.recruitmentListId || s.recruitmentListId === recruitmentListId)
    );

    const norm = (str?: string) =>
      (str || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();

    const normLrn = (candidate.lrn || '').trim().replace(/[^0-9]/g, '');
    const candSurname = norm(candidate.lastName || candidate.surname);
    const candFirst = norm(candidate.firstName);
    const candBirth = (candidate.birthdate || candidate.birthday || '').trim();
    const candSchool = norm(candidate.elementarySchool || candidate.school);
    const candAddress = norm(candidate.address || `${candidate.sitioStreet || ''} ${candidate.barangay || ''} ${candidate.municipality || ''}`);

    for (const existing of userStudents) {
      const exLrn = existing.lrn.trim().replace(/[^0-9]/g, '');
      const exSurname = norm(existing.lastName || existing.surname);
      const exFirst = norm(existing.firstName);
      const exBirth = (existing.birthdate || existing.birthday || '').trim();
      const exSchool = norm(existing.elementarySchool || existing.school);
      const exAddress = norm(existing.address || `${existing.sitioStreet || ''} ${existing.barangay || ''} ${existing.municipality || ''}`);

      // 1. EXACT DUPLICATE: Same LRN (at least 6 digits)
      if (normLrn && exLrn && normLrn.length >= 6 && normLrn === exLrn) {
        return {
          duplicateStatus: 'EXACT',
          existingRecord: existing,
          matchedFields: ['lrn'],
          matchReason: `Exact LRN Match: ${existing.lrn}`,
          message: `Exact duplicate found: Student "${existing.lastName || existing.surname}, ${existing.firstName}" already has the same LRN (${existing.lrn}) in your records.`,
        };
      }

      // 2. EXACT DUPLICATE: Same Surname + First Name + Birthday
      if (candSurname && candFirst && candBirth && exSurname && exFirst && exBirth) {
        if (candSurname === exSurname && candFirst === exFirst && candBirth === exBirth) {
          return {
            duplicateStatus: 'EXACT',
            existingRecord: existing,
            matchedFields: ['surname', 'firstName', 'birthdate'],
            matchReason: 'Exact Name and Birthday Match',
            message: `Exact duplicate found: Student "${existing.lastName || existing.surname}, ${existing.firstName}" (DOB: ${existing.birthdate || existing.birthday}) is already registered in your account.`,
          };
        }
      }

      // 3. EXACT DUPLICATE: Same Surname + First Name + Address (when address is detailed)
      if (candSurname && candFirst && candAddress && exSurname && exFirst && exAddress && candAddress.length > 8) {
        if (candSurname === exSurname && candFirst === exFirst && candAddress === exAddress) {
          return {
            duplicateStatus: 'EXACT',
            existingRecord: existing,
            matchedFields: ['surname', 'firstName', 'address'],
            matchReason: 'Exact Name and Address Match',
            message: `Exact duplicate found: Student "${existing.lastName || existing.surname}, ${existing.firstName}" from "${existing.address}" is already registered.`,
          };
        }
      }

      // 4. EXACT DUPLICATE: Fuzzy Name (OCR minor typo) + Exact Birthday
      if (candSurname && candFirst && candBirth && exSurname && exFirst && exBirth && candBirth === exBirth) {
        const candFull = `${candSurname} ${candFirst}`;
        const exFull = `${exSurname} ${exFirst}`;
        if (candFull.length >= 6 && exFull.length >= 6) {
          let diffCount = 0;
          const maxL = Math.max(candFull.length, exFull.length);
          const minL = Math.min(candFull.length, exFull.length);
          if (Math.abs(candFull.length - exFull.length) <= 2) {
            for (let i = 0; i < minL; i++) {
              if (candFull[i] !== exFull[i]) diffCount++;
            }
            diffCount += maxL - minL;
            if (diffCount <= 2) {
              return {
                duplicateStatus: 'EXACT',
                existingRecord: existing,
                matchedFields: ['surname', 'firstName', 'birthdate'],
                matchReason: `High-confidence Name match with identical Date of Birth (${existing.birthdate || existing.birthday})`,
                message: `Exact duplicate found: Student "${existing.lastName || existing.surname}, ${existing.firstName}" (DOB: ${existing.birthdate || existing.birthday}) already exists in your database.`,
              };
            }
          }
        }
      }

      // 5. POSSIBLE DUPLICATE: Same Surname + First Name (different or missing birthday)
      if (candSurname && candFirst && exSurname && exFirst) {
        if (candSurname === exSurname && candFirst === exFirst) {
          return {
            duplicateStatus: 'POSSIBLE',
            existingRecord: existing,
            matchedFields: ['surname', 'firstName'],
            matchReason: 'Matching Full Name with different birthday or school',
            message: `Possible duplicate found: A student named "${existing.lastName || existing.surname}, ${existing.firstName}" already exists (LRN: ${existing.lrn}, School: ${existing.elementarySchool || 'N/A'}). Please verify if this is the same student.`,
          };
        }
      }

      // 6. POSSIBLE DUPLICATE: Same Surname + Birthday + School
      if (candSurname && candBirth && candSchool && exSurname && exBirth && exSchool && candSchool.length > 5) {
        if (candSurname === exSurname && candBirth === exBirth && candSchool === exSchool) {
          return {
            duplicateStatus: 'POSSIBLE',
            existingRecord: existing,
            matchedFields: ['surname', 'birthdate', 'elementarySchool'],
            matchReason: 'Matching Surname, Birthday, and Elementary School',
            message: `Possible duplicate found: Another student with surname "${existing.lastName || existing.surname}", birthday "${existing.birthdate || existing.birthday}", and school "${existing.elementarySchool}" was found (Record: ${existing.firstName} ${existing.lastName || existing.surname}).`,
          };
        }
      }
    }

    return {
      duplicateStatus: 'NONE',
      message: 'No duplicate records found in your database.',
    };
  },

  // AUDIT LOGS
  addAuditLog(entry: { userId: string; userName: string; action: string; details: string }): AuditLogEntry {
    const db = ensureDbExists();
    const newEntry: AuditLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      details: entry.details,
      timestamp: new Date().toISOString(),
    };

    db.auditLogs.unshift(newEntry);
    // Keep last 500 audit log entries
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    saveDb(db);
    return newEntry;
  },

  getAuditLogs(): AuditLogEntry[] {
    const db = ensureDbExists();
    return db.auditLogs;
  },

  // SETTINGS
  getSettings(): SystemSettings {
    const db = ensureDbExists();
    const settings = db.settings || DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
  },

  saveLogo(
    dataString: string,
    mimeTypeOverride?: string,
    presetName?: string
  ): { logoUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Logo image data is required');
    }

    const currentPresets: BrandingPreset[] = Array.isArray(db.settings.logoPresets)
      ? [...db.settings.logoPresets]
      : [...DEFAULT_LOGO_PRESETS];

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/png');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `logo_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // Clean up older temporary logo files in uploads directory (keep ones in presets)
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        const presetFilenames = new Set(
          currentPresets.map((p) => p.url.replace('/api/uploads/', '').replace('/uploads/', ''))
        );
        for (const file of files) {
          if (file.startsWith('logo_') && file !== filename && !presetFilenames.has(file)) {
            // Keep recent or preset files
          }
        }
      } catch (cleanupErr) {
        console.warn('Logo cleanup warning:', cleanupErr);
      }

      // Extra fallback sync to public and dist folders
      try {
        const publicLogo = path.join(process.cwd(), 'public', 'school_logo.png');
        fs.writeFileSync(publicLogo, Buffer.from(base64Data, 'base64'));
        const distLogo = path.join(process.cwd(), 'dist', 'school_logo.png');
        if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
          fs.writeFileSync(distLogo, Buffer.from(base64Data, 'base64'));
        }
      } catch (syncErr) {
        // Non-critical fallback
      }

      const logoUrl = `/api/uploads/${filename}`;

      // Check if this logo already exists in presets (by url or matching base64 data)
      const existingIdx = currentPresets.findIndex(
        (p) => p.url === logoUrl || (p.data && p.data === base64Data)
      );

      if (existingIdx >= 0) {
        if (presetName && presetName.trim()) {
          currentPresets[existingIdx].name = presetName.trim();
        }
        currentPresets[existingIdx].url = logoUrl;
        currentPresets[existingIdx].data = base64Data;
        currentPresets[existingIdx].mime = mimeType;
      } else {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Logo (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'logo_' + timestamp + '_' + randomSuffix,
          name: autoName,
          url: logoUrl,
          data: base64Data,
          mime: mimeType,
          isDefault: false,
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        schoolLogoUrl: logoUrl,
        schoolLogoData: base64Data,
        schoolLogoMime: mimeType,
        logoPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { logoUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const logoUrl = dataString.trim();

      // Check if already in presets
      const existingIdx = currentPresets.findIndex((p) => p.url === logoUrl);
      if (existingIdx >= 0 && presetName && presetName.trim()) {
        currentPresets[existingIdx].name = presetName.trim();
      } else if (existingIdx === -1 && logoUrl) {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Logo (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'logo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: autoName,
          url: logoUrl,
          isDefault: logoUrl === '/school-logo.png' || logoUrl === '/school_logo.svg',
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        schoolLogoUrl: logoUrl,
        logoPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      if (logoUrl === '/school-logo.png' || logoUrl === '/school_logo.png' || logoUrl === '/school_logo.svg') {
        delete db.settings.schoolLogoData;
        delete db.settings.schoolLogoMime;
      }
      saveDb(db);
      return { logoUrl, settings: db.settings };
    }
  },

  saveBackground(
    dataString: string,
    mimeTypeOverride?: string,
    presetName?: string
  ): { backgroundUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Background image data is required');
    }

    const currentPresets: BrandingPreset[] = Array.isArray(db.settings.dashboardBgPresets)
      ? [...db.settings.dashboardBgPresets]
      : [...DEFAULT_DASHBOARD_BG_PRESETS];

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/jpeg');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `bg_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // Extra fallback sync to public and dist folders
      try {
        const publicBg = path.join(process.cwd(), 'public', 'school-campus-background.jpg');
        fs.writeFileSync(publicBg, Buffer.from(base64Data, 'base64'));
        const publicBgLegacy = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
        fs.writeFileSync(publicBgLegacy, Buffer.from(base64Data, 'base64'));
        const distBg = path.join(process.cwd(), 'dist', 'school-campus-background.jpg');
        if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
          fs.writeFileSync(distBg, Buffer.from(base64Data, 'base64'));
        }
      } catch (syncErr) {
        // Non-critical fallback
      }

      const backgroundUrl = `/api/uploads/${filename}`;

      // Check if already in presets
      const existingIdx = currentPresets.findIndex(
        (p) => p.url === backgroundUrl || (p.data && p.data === base64Data)
      );

      if (existingIdx >= 0) {
        if (presetName && presetName.trim()) {
          currentPresets[existingIdx].name = presetName.trim();
        }
        currentPresets[existingIdx].url = backgroundUrl;
        currentPresets[existingIdx].data = base64Data;
        currentPresets[existingIdx].mime = mimeType;
      } else {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Dashboard BG (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'dbg_' + timestamp + '_' + randomSuffix,
          name: autoName,
          url: backgroundUrl,
          data: base64Data,
          mime: mimeType,
          isDefault: false,
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        dashboardBgImageUrl: backgroundUrl,
        dashboardBgImageData: base64Data,
        dashboardBgImageMime: mimeType,
        dashboardBgTheme: 'custom',
        dashboardBgPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { backgroundUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const backgroundUrl = dataString.trim();

      const existingIdx = currentPresets.findIndex((p) => p.url === backgroundUrl);
      if (existingIdx >= 0 && presetName && presetName.trim()) {
        currentPresets[existingIdx].name = presetName.trim();
      } else if (existingIdx === -1 && backgroundUrl) {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Dashboard BG (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'dbg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: autoName,
          url: backgroundUrl,
          isDefault:
            backgroundUrl === '/school-campus-background.jpg' ||
            backgroundUrl === '/school-sunset-background.jpg' ||
            backgroundUrl === '/dashboard_bg.jpg',
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        dashboardBgImageUrl: backgroundUrl,
        dashboardBgPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      if (backgroundUrl === '/school-campus-background.jpg' || backgroundUrl === '/dashboard_bg.jpg') {
        delete db.settings.dashboardBgImageData;
        delete db.settings.dashboardBgImageMime;
      }
      saveDb(db);
      return { backgroundUrl, settings: db.settings };
    }
  },

  getLogoStream(requestedFilename?: string): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();

    // If a specific preset file is requested
    if (requestedFilename && Array.isArray(db.settings?.logoPresets)) {
      const matchingPreset = db.settings.logoPresets.find(
        (p) => p.url.includes(requestedFilename) && p.data
      );
      if (matchingPreset?.data) {
        try {
          return {
            data: Buffer.from(matchingPreset.data, 'base64'),
            mime: matchingPreset.mime || 'image/png',
          };
        } catch (e) {
          // Fall through
        }
      }
    }

    if (db.settings?.schoolLogoData) {
      try {
        const buf = Buffer.from(db.settings.schoolLogoData, 'base64');
        return {
          data: buf,
          mime: db.settings.schoolLogoMime || 'image/png',
        };
      } catch (e) {
        console.error('Error parsing schoolLogoData from DB:', e);
      }
    }

    // Check uploads dir
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        const logoFile = requestedFilename
          ? files.find((f) => f === requestedFilename)
          : files.find((f) => f.startsWith('logo_'));
        if (logoFile) {
          const filePath = path.join(UPLOADS_DIR, logoFile);
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(logoFile).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
          return { data: buf, mime };
        }
      }
    } catch (e) {
      console.error('Error finding logo file in uploads:', e);
    }

    // Fallback to public
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'school-logo.png'),
        path.join(process.cwd(), 'public', 'school_logo.png'),
        path.join(process.cwd(), 'public', 'school_logo.svg'),
        path.join(process.cwd(), 'public', 'school-logo.jpg'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          return {
            data: fs.readFileSync(p),
            mime: p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          };
        }
      }
    } catch (e) {
      // No fallback
    }

    return null;
  },

  getBackgroundStream(requestedFilename?: string): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();

    if (requestedFilename && Array.isArray(db.settings?.dashboardBgPresets)) {
      const matchingPreset = db.settings.dashboardBgPresets.find(
        (p) => p.url.includes(requestedFilename) && p.data
      );
      if (matchingPreset?.data) {
        try {
          return {
            data: Buffer.from(matchingPreset.data, 'base64'),
            mime: matchingPreset.mime || 'image/jpeg',
          };
        } catch (e) {
          // Fall through
        }
      }
    }

    if (db.settings?.dashboardBgImageData) {
      try {
        const buf = Buffer.from(db.settings.dashboardBgImageData, 'base64');
        return {
          data: buf,
          mime: db.settings.dashboardBgImageMime || 'image/jpeg',
        };
      } catch (e) {
        console.error('Error parsing dashboardBgImageData from DB:', e);
      }
    }

    // Check uploads dir
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        const bgFile = requestedFilename
          ? files.find((f) => f === requestedFilename)
          : files.find((f) => f.startsWith('bg_'));
        if (bgFile) {
          const filePath = path.join(UPLOADS_DIR, bgFile);
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(bgFile).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return { data: buf, mime };
        }
      }
    } catch (e) {
      console.error('Error finding bg file in uploads:', e);
    }

    // Fallback to public
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'school-campus-background.jpg'),
        path.join(process.cwd(), 'public', 'school-sunset-background.jpg'),
        path.join(process.cwd(), 'public', 'dashboard_bg.jpg'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          return {
            data: fs.readFileSync(p),
            mime: 'image/jpeg',
          };
        }
      }
    } catch (e) {
      // No fallback
    }

    return null;
  },

  saveSplashBackground(
    dataString: string,
    mimeTypeOverride?: string,
    presetName?: string
  ): { splashBackgroundUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Splash background image data is required');
    }

    const currentPresets: BrandingPreset[] = Array.isArray(db.settings.splashBgPresets)
      ? [...db.settings.splashBgPresets]
      : [...DEFAULT_SPLASH_BG_PRESETS];

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/jpeg');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `splash_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      const splashBackgroundUrl = `/api/uploads/${filename}`;

      // Check if already in presets
      const existingIdx = currentPresets.findIndex(
        (p) => p.url === splashBackgroundUrl || (p.data && p.data === base64Data)
      );

      if (existingIdx >= 0) {
        if (presetName && presetName.trim()) {
          currentPresets[existingIdx].name = presetName.trim();
        }
        currentPresets[existingIdx].url = splashBackgroundUrl;
        currentPresets[existingIdx].data = base64Data;
        currentPresets[existingIdx].mime = mimeType;
      } else {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Splash BG (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'sbg_' + timestamp + '_' + randomSuffix,
          name: autoName,
          url: splashBackgroundUrl,
          data: base64Data,
          mime: mimeType,
          isDefault: false,
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        splashBgImageUrl: splashBackgroundUrl,
        splashBgImageData: base64Data,
        splashBgImageMime: mimeType,
        splashBgPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { splashBackgroundUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const splashBackgroundUrl = dataString.trim();

      const existingIdx = currentPresets.findIndex((p) => p.url === splashBackgroundUrl);
      if (existingIdx >= 0 && presetName && presetName.trim()) {
        currentPresets[existingIdx].name = presetName.trim();
      } else if (existingIdx === -1 && splashBackgroundUrl) {
        const autoName =
          presetName && presetName.trim()
            ? presetName.trim()
            : `Custom Splash BG (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

        currentPresets.push({
          id: 'sbg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: autoName,
          url: splashBackgroundUrl,
          isDefault:
            splashBackgroundUrl === '/school-sunset-background.jpg' ||
            splashBackgroundUrl === '/school-campus-background.jpg' ||
            splashBackgroundUrl === '/splash_bg.jpg',
          createdAt: new Date().toISOString(),
        });
      }

      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        splashBgImageUrl: splashBackgroundUrl,
        splashBgPresets: currentPresets,
        updatedAt: new Date().toISOString(),
      };
      if (splashBackgroundUrl === '/school-sunset-background.jpg' || splashBackgroundUrl === '/splash_bg.jpg' || splashBackgroundUrl === '/dashboard_bg.jpg') {
        delete db.settings.splashBgImageData;
        delete db.settings.splashBgImageMime;
      }
      saveDb(db);
      return { splashBackgroundUrl, settings: db.settings };
    }
  },

  getSplashBackgroundStream(requestedFilename?: string): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();

    if (requestedFilename && Array.isArray(db.settings?.splashBgPresets)) {
      const matchingPreset = db.settings.splashBgPresets.find(
        (p) => p.url.includes(requestedFilename) && p.data
      );
      if (matchingPreset?.data) {
        try {
          return {
            data: Buffer.from(matchingPreset.data, 'base64'),
            mime: matchingPreset.mime || 'image/jpeg',
          };
        } catch (e) {
          // Fall through
        }
      }
    }

    if (db.settings?.splashBgImageData) {
      try {
        const buf = Buffer.from(db.settings.splashBgImageData, 'base64');
        return {
          data: buf,
          mime: db.settings.splashBgImageMime || 'image/jpeg',
        };
      } catch (e) {
        console.error('Error parsing splashBgImageData from DB:', e);
      }
    }

    // Check uploads dir
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        const splashFile = requestedFilename
          ? files.find((f) => f === requestedFilename)
          : files.find((f) => f.startsWith('splash_'));
        if (splashFile) {
          const filePath = path.join(UPLOADS_DIR, splashFile);
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(splashFile).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return { data: buf, mime };
        }
      }
    } catch (e) {
      console.error('Error finding splash file in uploads:', e);
    }

    // Fallback to public sunset background first
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'school-sunset-background.jpg'),
        path.join(process.cwd(), 'public', 'school-campus-background.jpg'),
        path.join(process.cwd(), 'public', 'splash_bg.jpg'),
        path.join(process.cwd(), 'public', 'dashboard_bg.jpg'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          return {
            data: fs.readFileSync(p),
            mime: 'image/jpeg',
          };
        }
      }
    } catch (e) {
      // No fallback
    }

    return null;
  },

  // PRESET MANAGEMENT METHODS
  addLogoPreset(preset: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    if (!preset.url) throw new Error('Logo preset URL or image data is required.');
    const presets = Array.isArray(db.settings.logoPresets) ? [...db.settings.logoPresets] : [...DEFAULT_LOGO_PRESETS];
    const newPreset: BrandingPreset = {
      id: preset.id || 'logo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: (preset.name || 'Custom Logo Preset').trim(),
      url: preset.url.trim(),
      data: preset.data,
      mime: preset.mime,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    // Deduplicate
    const existingIdx = presets.findIndex((p) => p.url === newPreset.url);
    if (existingIdx >= 0) {
      presets[existingIdx] = { ...presets[existingIdx], ...newPreset };
    } else {
      presets.push(newPreset);
    }
    db.settings.logoPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  updateLogoPreset(id: string, updates: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.logoPresets) ? [...db.settings.logoPresets] : [...DEFAULT_LOGO_PRESETS];
    const targetIdx = presets.findIndex((p) => p.id === id);
    if (targetIdx === -1) throw new Error('Logo preset not found.');
    presets[targetIdx] = {
      ...presets[targetIdx],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.url ? { url: updates.url.trim() } : {}),
    };
    db.settings.logoPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  deleteLogoPreset(id: string): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.logoPresets) ? [...db.settings.logoPresets] : [...DEFAULT_LOGO_PRESETS];
    const target = presets.find((p) => p.id === id);
    if (!target) throw new Error('Logo preset not found.');
    if (target.isDefault) throw new Error('Default built-in presets cannot be deleted.');
    
    // Remove from presets
    db.settings.logoPresets = presets.filter((p) => p.id !== id);

    // If this preset was currently active, revert to default logo
    if (db.settings.schoolLogoUrl === target.url) {
      db.settings.schoolLogoUrl = '/school-logo.png';
      delete db.settings.schoolLogoData;
      delete db.settings.schoolLogoMime;
    }

    // Try deleting uploaded physical file if no other preset or setting uses it
    if (target.url && target.url.startsWith('/api/uploads/')) {
      const filename = path.basename(target.url);
      const isUsedElsewhere =
        db.settings.schoolLogoUrl === target.url ||
        db.settings.dashboardBgImageUrl === target.url ||
        db.settings.splashBgImageUrl === target.url ||
        db.settings.logoPresets.some((p) => p.url === target.url) ||
        (Array.isArray(db.settings.dashboardBgPresets) && db.settings.dashboardBgPresets.some((p) => p.url === target.url)) ||
        (Array.isArray(db.settings.splashBgPresets) && db.settings.splashBgPresets.some((p) => p.url === target.url));
      if (!isUsedElsewhere) {
        try {
          const filePath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn('Could not remove unused file on preset delete:', e);
        }
      }
    }

    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  addDashboardBgPreset(preset: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    if (!preset.url) throw new Error('Background preset URL or image data is required.');
    const presets = Array.isArray(db.settings.dashboardBgPresets) ? [...db.settings.dashboardBgPresets] : [...DEFAULT_DASHBOARD_BG_PRESETS];
    const newPreset: BrandingPreset = {
      id: preset.id || 'dbg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: (preset.name || 'Custom Background Preset').trim(),
      url: preset.url.trim(),
      data: preset.data,
      mime: preset.mime,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    const existingIdx = presets.findIndex((p) => p.url === newPreset.url);
    if (existingIdx >= 0) {
      presets[existingIdx] = { ...presets[existingIdx], ...newPreset };
    } else {
      presets.push(newPreset);
    }
    db.settings.dashboardBgPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  updateDashboardBgPreset(id: string, updates: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.dashboardBgPresets) ? [...db.settings.dashboardBgPresets] : [...DEFAULT_DASHBOARD_BG_PRESETS];
    const targetIdx = presets.findIndex((p) => p.id === id);
    if (targetIdx === -1) throw new Error('Dashboard background preset not found.');
    presets[targetIdx] = {
      ...presets[targetIdx],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.url ? { url: updates.url.trim() } : {}),
    };
    db.settings.dashboardBgPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  deleteDashboardBgPreset(id: string): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.dashboardBgPresets) ? [...db.settings.dashboardBgPresets] : [...DEFAULT_DASHBOARD_BG_PRESETS];
    const target = presets.find((p) => p.id === id);
    if (!target) throw new Error('Dashboard background preset not found.');
    if (target.isDefault) throw new Error('Default built-in presets cannot be deleted.');
    
    db.settings.dashboardBgPresets = presets.filter((p) => p.id !== id);

    // If active, revert to built-in campus background
    if (db.settings.dashboardBgImageUrl === target.url) {
      db.settings.dashboardBgImageUrl = '/school-campus-background.jpg';
      delete db.settings.dashboardBgImageData;
      delete db.settings.dashboardBgImageMime;
    }

    // Clean up physical file if unused
    if (target.url && target.url.startsWith('/api/uploads/')) {
      const filename = path.basename(target.url);
      const isUsedElsewhere =
        db.settings.schoolLogoUrl === target.url ||
        db.settings.dashboardBgImageUrl === target.url ||
        db.settings.splashBgImageUrl === target.url ||
        (Array.isArray(db.settings.logoPresets) && db.settings.logoPresets.some((p) => p.url === target.url)) ||
        db.settings.dashboardBgPresets.some((p) => p.url === target.url) ||
        (Array.isArray(db.settings.splashBgPresets) && db.settings.splashBgPresets.some((p) => p.url === target.url));
      if (!isUsedElsewhere) {
        try {
          const filePath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn('Could not remove unused file on preset delete:', e);
        }
      }
    }

    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  addSplashBgPreset(preset: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    if (!preset.url) throw new Error('Splash preset URL or image data is required.');
    const presets = Array.isArray(db.settings.splashBgPresets) ? [...db.settings.splashBgPresets] : [...DEFAULT_SPLASH_BG_PRESETS];
    const newPreset: BrandingPreset = {
      id: preset.id || 'sbg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: (preset.name || 'Custom Splash Preset').trim(),
      url: preset.url.trim(),
      data: preset.data,
      mime: preset.mime,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    const existingIdx = presets.findIndex((p) => p.url === newPreset.url);
    if (existingIdx >= 0) {
      presets[existingIdx] = { ...presets[existingIdx], ...newPreset };
    } else {
      presets.push(newPreset);
    }
    db.settings.splashBgPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  updateSplashBgPreset(id: string, updates: Partial<BrandingPreset>): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.splashBgPresets) ? [...db.settings.splashBgPresets] : [...DEFAULT_SPLASH_BG_PRESETS];
    const targetIdx = presets.findIndex((p) => p.id === id);
    if (targetIdx === -1) throw new Error('Splash background preset not found.');
    presets[targetIdx] = {
      ...presets[targetIdx],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.url ? { url: updates.url.trim() } : {}),
    };
    db.settings.splashBgPresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  deleteSplashBgPreset(id: string): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.splashBgPresets) ? [...db.settings.splashBgPresets] : [...DEFAULT_SPLASH_BG_PRESETS];
    const target = presets.find((p) => p.id === id);
    if (!target) throw new Error('Splash background preset not found.');
    if (target.isDefault) throw new Error('Default built-in presets cannot be deleted.');
    
    db.settings.splashBgPresets = presets.filter((p) => p.id !== id);

    // If active, revert to default sunset splash background
    if (db.settings.splashBgImageUrl === target.url) {
      db.settings.splashBgImageUrl = '/school-sunset-background.jpg';
      delete db.settings.splashBgImageData;
      delete db.settings.splashBgImageMime;
    }

    // Clean up physical file if unused
    if (target.url && target.url.startsWith('/api/uploads/')) {
      const filename = path.basename(target.url);
      const isUsedElsewhere =
        db.settings.schoolLogoUrl === target.url ||
        db.settings.dashboardBgImageUrl === target.url ||
        db.settings.splashBgImageUrl === target.url ||
        (Array.isArray(db.settings.logoPresets) && db.settings.logoPresets.some((p) => p.url === target.url)) ||
        (Array.isArray(db.settings.dashboardBgPresets) && db.settings.dashboardBgPresets.some((p) => p.url === target.url)) ||
        db.settings.splashBgPresets.some((p) => p.url === target.url);
      if (!isUsedElsewhere) {
        try {
          const filePath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn('Could not remove unused file on preset delete:', e);
        }
      }
    }

    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  addThemePreset(preset: Partial<ThemePreset>): SystemSettings {
    const db = ensureDbExists();
    if (!preset.gradient) throw new Error('Theme gradient class string is required.');
    const presets = Array.isArray(db.settings.customThemePresets) ? [...db.settings.customThemePresets] : [...DEFAULT_THEME_PRESETS];
    const newPreset: ThemePreset = {
      id: preset.id || 'theme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: (preset.name || 'Custom Theme Preset').trim(),
      gradient: preset.gradient.trim(),
      colorBadge: preset.colorBadge || 'bg-[#1E3A8A]',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    const existingIdx = presets.findIndex((p) => p.gradient === newPreset.gradient);
    if (existingIdx >= 0) {
      presets[existingIdx] = { ...presets[existingIdx], ...newPreset };
    } else {
      presets.push(newPreset);
    }
    db.settings.customThemePresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  updateThemePreset(id: string, updates: Partial<ThemePreset>): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.customThemePresets) ? [...db.settings.customThemePresets] : [...DEFAULT_THEME_PRESETS];
    const targetIdx = presets.findIndex((p) => p.id === id);
    if (targetIdx === -1) throw new Error('Theme preset not found.');
    presets[targetIdx] = {
      ...presets[targetIdx],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.gradient ? { gradient: updates.gradient.trim() } : {}),
      ...(updates.colorBadge ? { colorBadge: updates.colorBadge.trim() } : {}),
    };
    db.settings.customThemePresets = presets;
    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  deleteThemePreset(id: string): SystemSettings {
    const db = ensureDbExists();
    const presets = Array.isArray(db.settings.customThemePresets) ? [...db.settings.customThemePresets] : [...DEFAULT_THEME_PRESETS];
    const target = presets.find((p) => p.id === id);
    if (!target) throw new Error('Theme preset not found.');
    if (target.isDefault) throw new Error('Default built-in presets cannot be deleted.');
    
    db.settings.customThemePresets = presets.filter((p) => p.id !== id);

    // If active theme, fallback to default 'royal-blue'
    if (db.settings.dashboardBgTheme === target.id || db.settings.dashboardBgGradient === target.gradient) {
      db.settings.dashboardBgTheme = 'royal-blue';
      db.settings.dashboardBgGradient = 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]';
    }

    db.settings.updatedAt = new Date().toISOString();
    saveDb(db);
    return db.settings;
  },

  updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const db = ensureDbExists();

    // If new base64 logo provided in batch update
    if (newSettings.schoolLogoUrl && (newSettings.schoolLogoUrl.startsWith('data:image') || newSettings.schoolLogoUrl.length > 500)) {
      this.saveLogo(newSettings.schoolLogoUrl);
      delete newSettings.schoolLogoUrl;
    }

    // If new base64 background provided in batch update
    if (newSettings.dashboardBgImageUrl && (newSettings.dashboardBgImageUrl.startsWith('data:image') || newSettings.dashboardBgImageUrl.length > 500)) {
      this.saveBackground(newSettings.dashboardBgImageUrl);
      delete newSettings.dashboardBgImageUrl;
    }

    // If new base64 splash background provided in batch update
    if (newSettings.splashBgImageUrl && (newSettings.splashBgImageUrl.startsWith('data:image') || newSettings.splashBgImageUrl.length > 500)) {
      this.saveSplashBackground(newSettings.splashBgImageUrl);
      delete newSettings.splashBgImageUrl;
    }

    db.settings = {
      ...DEFAULT_SETTINGS,
      ...db.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    return db.settings;
  },
};
