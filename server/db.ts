import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, StudentRecord, AuditLogEntry, SystemSettings } from '../src/types.js';

interface DbSchema {
  users: (User & { passwordHash: string })[];
  students: StudentRecord[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'system_default_settings',
  schoolName: 'Sisters of Mary School-Girlstown, Inc.',
  subTitle: 'Internal Student Recruitment & Information Management System',
  systemName: 'Male Student Recruitment Management System',
  schoolLocation: 'Adlas, Silang, Cavite, Philippines',
  schoolLogoUrl: '/school_logo.png',
  maxExamScore: 100,
  dashboardBgTheme: 'custom',
  dashboardBgGradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
  dashboardBgImageUrl: '/dashboard_bg.jpg',
  splashBgImageUrl: '/dashboard_bg.jpg',
  academicYear: 'SY 2026-2027 Recruitment',
  updatedAt: new Date().toISOString(),
};

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

function ensureDbExists(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DbSchema = {
      users: [],
      students: [],
      auditLogs: [],
      settings: DEFAULT_SETTINGS,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const db: DbSchema = JSON.parse(data);
    if (!db.users) db.users = [];
    if (!db.students) db.students = [];
    if (!db.auditLogs) db.auditLogs = [];
    if (!db.settings) {
      db.settings = DEFAULT_SETTINGS;
    } else {
      db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
    }
    return db;
  } catch (error) {
    console.error('Error reading DB file, reinitializing:', error);
    const fallbackDb: DbSchema = {
      users: [],
      students: [],
      auditLogs: [],
      settings: DEFAULT_SETTINGS,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackDb, null, 2), 'utf-8');
    return fallbackDb;
  }
}

function saveDb(db: DbSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
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
    return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserByUsernameOrEmail(identifier: string): (User & { passwordHash: string }) | undefined {
    const db = ensureDbExists();
    const cleanId = identifier.trim().toLowerCase();
    return db.users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );
  },

  checkUserExists(email: string, username: string): { exists: boolean; matchedField?: 'email' | 'username'; existingUser?: User } {
    const db = ensureDbExists();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const match = db.users.find(
      (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );

    if (match) {
      const { passwordHash: _, ...cleanMatch } = match;
      const matchedField = match.username.toLowerCase() === cleanUsername ? 'username' : 'email';
      return { exists: true, matchedField, existingUser: cleanMatch };
    }
    return { exists: false };
  },

  getUserById(id: string): User | undefined {
    const db = ensureDbExists();
    const user = db.users.find((u) => u.id === id);
    if (!user) return undefined;
    const { passwordHash, ...userClean } = user;
    return userClean;
  },

  createUser(userData: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    role: User['role'];
  }): User {
    const db = ensureDbExists();
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanUsername = userData.username.trim().toLowerCase();

    const existing = db.users.find(
      (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        throw new Error('Username already exists');
      }
      throw new Error('Email address already exists');
    }

    const passwordHash = bcrypt.hashSync(userData.password, 10);
    const newUser: User & { passwordHash: string } = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      fullName: userData.fullName.trim(),
      email: userData.email.trim(),
      username: userData.username.trim(),
      passwordHash,
      role: userData.role,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);

    const { passwordHash: _, ...cleanUser } = newUser;
    return cleanUser;
  },

  updateUser(id: string, updates: Partial<User> & { password?: string }): User {
    const db = ensureDbExists();
    const userIdx = db.users.findIndex((u) => u.id === id);
    if (userIdx === -1) {
      throw new Error('User not found');
    }

    if (updates.fullName) db.users[userIdx].fullName = updates.fullName.trim();
    if (updates.email) db.users[userIdx].email = updates.email.trim();
    if (updates.role) db.users[userIdx].role = updates.role;
    if (updates.status) db.users[userIdx].status = updates.status;
    if (updates.password) {
      db.users[userIdx].passwordHash = bcrypt.hashSync(updates.password, 10);
    }

    saveDb(db);
    const { passwordHash, ...cleanUser } = db.users[userIdx];
    return cleanUser;
  },

  deleteUser(id: string): boolean {
    const db = ensureDbExists();
    const initialLen = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);
    if (db.users.length !== initialLen) {
      saveDb(db);
      return true;
    }
    return false;
  },

  deleteUserAccount(userId: string): { success: boolean; deletedStudentsCount: number } {
    const db = ensureDbExists();
    const initialUsersCount = db.users.length;
    db.users = db.users.filter((u) => u.id !== userId);

    const initialStudentsCount = db.students.length;
    // Remove all student records owned by this user
    db.students = db.students.filter((s) => s.userId !== userId);
    const deletedStudentsCount = initialStudentsCount - db.students.length;

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

  // STUDENTS (Account-based isolation)
  getStudents(userId?: string): StudentRecord[] {
    const db = ensureDbExists();
    if (!userId) return db.students;
    return db.students.filter((s) => !s.userId || s.userId === userId);
  },

  getStudentById(id: string, userId?: string): StudentRecord | undefined {
    const db = ensureDbExists();
    return db.students.find((s) => s.id === id && (!userId || !s.userId || s.userId === userId));
  },

  getStudentByLrn(lrn: string, userId?: string): StudentRecord | undefined {
    const db = ensureDbExists();
    const cleanLrn = lrn.trim();
    return db.students.find((s) => s.lrn.trim() === cleanLrn && (!userId || !s.userId || s.userId === userId));
  },

  createStudent(
    studentData: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'> & { userId?: string },
    operatorName: string
  ): StudentRecord {
    const db = ensureDbExists();

    // Check duplicate LRN within user's owned records
    const cleanLrn = studentData.lrn.trim();
    if (cleanLrn) {
      const existing = db.students.find(
        (s) => s.lrn.trim() === cleanLrn && (!studentData.userId || !s.userId || s.userId === studentData.userId)
      );
      if (existing) {
        throw new Error(`This LRN (${cleanLrn}) already exists for student: ${existing.surname}, ${existing.firstName}.`);
      }
    }

    const now = new Date().toISOString();
    const newStudent: StudentRecord = {
      ...studentData,
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: studentData.userId,
      lrn: cleanLrn,
      createdAt: now,
      updatedAt: now,
      createdBy: operatorName,
      updatedBy: operatorName,
    };

    db.students.push(newStudent);
    saveDb(db);

    return newStudent;
  },

  updateStudent(
    id: string,
    updates: Partial<Omit<StudentRecord, 'id' | 'createdAt' | 'createdBy'>>,
    operatorName: string,
    userId?: string
  ): StudentRecord {
    const db = ensureDbExists();
    const idx = db.students.findIndex((s) => s.id === id && (!userId || !s.userId || s.userId === userId));
    if (idx === -1) {
      throw new Error('Student record not found');
    }

    // If LRN is being changed, check if new LRN exists on ANOTHER record belonging to this user
    if (updates.lrn && updates.lrn.trim() !== db.students[idx].lrn.trim()) {
      const cleanLrn = updates.lrn.trim();
      const duplicate = db.students.find(
        (s) => s.id !== id && s.lrn.trim() === cleanLrn && (!userId || !s.userId || s.userId === userId)
      );
      if (duplicate) {
        throw new Error(`This LRN (${cleanLrn}) already exists for student: ${duplicate.surname}, ${duplicate.firstName}.`);
      }
    }

    const updated: StudentRecord = {
      ...db.students[idx],
      ...updates,
      lrn: updates.lrn ? updates.lrn.trim() : db.students[idx].lrn,
      updatedAt: new Date().toISOString(),
      updatedBy: operatorName,
    };

    db.students[idx] = updated;
    saveDb(db);

    return updated;
  },

  deleteStudent(id: string, userId?: string): boolean {
    const db = ensureDbExists();
    const initialLen = db.students.length;
    db.students = db.students.filter((s) => !(s.id === id && (!userId || !s.userId || s.userId === userId)));
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
    excludeId?: string
  ): {
    duplicateStatus: 'EXACT' | 'POSSIBLE' | 'NONE';
    existingRecord?: StudentRecord;
    matchedFields?: string[];
    matchReason?: string;
    message: string;
  } {
    const db = ensureDbExists();
    const userStudents = db.students.filter(
      (s) => (!userId || !s.userId || s.userId === userId) && (!excludeId || s.id !== excludeId)
    );

    const norm = (str?: string) =>
      (str || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();

    const normLrn = (candidate.lrn || '').trim().replace(/[^0-9]/g, '');
    const candSurname = norm(candidate.surname);
    const candFirst = norm(candidate.firstName);
    const candBirth = (candidate.birthday || '').trim();
    const candSchool = norm(candidate.elementarySchool);
    const candAddress = norm(candidate.address);

    for (const existing of userStudents) {
      const exLrn = existing.lrn.trim().replace(/[^0-9]/g, '');
      const exSurname = norm(existing.surname);
      const exFirst = norm(existing.firstName);
      const exBirth = (existing.birthday || '').trim();
      const exSchool = norm(existing.elementarySchool);
      const exAddress = norm(existing.address);

      // 1. EXACT DUPLICATE: Same LRN (at least 6 digits)
      if (normLrn && exLrn && normLrn.length >= 6 && normLrn === exLrn) {
        return {
          duplicateStatus: 'EXACT',
          existingRecord: existing,
          matchedFields: ['lrn'],
          matchReason: `Exact LRN Match: ${existing.lrn}`,
          message: `Exact duplicate found: Student "${existing.surname}, ${existing.firstName}" already has the same LRN (${existing.lrn}) in your records.`,
        };
      }

      // 2. EXACT DUPLICATE: Same Surname + First Name + Birthday
      if (candSurname && candFirst && candBirth && exSurname && exFirst && exBirth) {
        if (candSurname === exSurname && candFirst === exFirst && candBirth === exBirth) {
          return {
            duplicateStatus: 'EXACT',
            existingRecord: existing,
            matchedFields: ['surname', 'firstName', 'birthday'],
            matchReason: 'Exact Name and Birthday Match',
            message: `Exact duplicate found: Student "${existing.surname}, ${existing.firstName}" (DOB: ${existing.birthday}) is already registered in your account.`,
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
            message: `Exact duplicate found: Student "${existing.surname}, ${existing.firstName}" from "${existing.address}" is already registered.`,
          };
        }
      }

      // 4. POSSIBLE DUPLICATE: Same Surname + First Name (different or missing birthday)
      if (candSurname && candFirst && exSurname && exFirst) {
        if (candSurname === exSurname && candFirst === exFirst) {
          return {
            duplicateStatus: 'POSSIBLE',
            existingRecord: existing,
            matchedFields: ['surname', 'firstName'],
            matchReason: 'Matching Full Name with different birthday or school',
            message: `Possible duplicate found: A student named "${existing.surname}, ${existing.firstName}" already exists (LRN: ${existing.lrn}, School: ${existing.elementarySchool || 'N/A'}). Please verify if this is the same student.`,
          };
        }
      }

      // 5. POSSIBLE DUPLICATE: Same Surname + Birthday + School (e.g. twins or same student with minor first name typo)
      if (candSurname && candBirth && candSchool && exSurname && exBirth && exSchool && candSchool.length > 5) {
        if (candSurname === exSurname && candBirth === exBirth && candSchool === exSchool) {
          return {
            duplicateStatus: 'POSSIBLE',
            existingRecord: existing,
            matchedFields: ['surname', 'birthday', 'elementarySchool'],
            matchReason: 'Matching Surname, Birthday, and Elementary School',
            message: `Possible duplicate found: Another student with surname "${existing.surname}", birthday "${existing.birthday}", and school "${existing.elementarySchool}" was found (Record: ${existing.firstName} ${existing.surname}).`,
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
  resetUsers(): void {
    const db = ensureDbExists();
    db.users = [];
    saveDb(db);
  },

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
    mimeTypeOverride?: string
  ): { logoUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Logo image data is required');
    }

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/png');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `logo_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // Clean up older logo files in uploads directory
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          if (file.startsWith('logo_') && file !== filename) {
            fs.unlinkSync(path.join(UPLOADS_DIR, file));
          }
        }
      } catch (cleanupErr) {
        console.warn('Old logo cleanup warning:', cleanupErr);
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
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        schoolLogoUrl: logoUrl,
        schoolLogoData: base64Data,
        schoolLogoMime: mimeType,
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { logoUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const logoUrl = dataString.trim();
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        schoolLogoUrl: logoUrl,
        updatedAt: new Date().toISOString(),
      };
      if (logoUrl === '/school_logo.png') {
        delete db.settings.schoolLogoData;
        delete db.settings.schoolLogoMime;
      }
      saveDb(db);
      return { logoUrl, settings: db.settings };
    }
  },

  saveBackground(
    dataString: string,
    mimeTypeOverride?: string
  ): { backgroundUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Background image data is required');
    }

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/jpeg');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `bg_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // Clean up older background files in uploads directory
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          if (file.startsWith('bg_') && file !== filename) {
            fs.unlinkSync(path.join(UPLOADS_DIR, file));
          }
        }
      } catch (cleanupErr) {
        console.warn('Old background cleanup warning:', cleanupErr);
      }

      // Extra fallback sync to public and dist folders
      try {
        const publicBg = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
        fs.writeFileSync(publicBg, Buffer.from(base64Data, 'base64'));
        const distBg = path.join(process.cwd(), 'dist', 'dashboard_bg.jpg');
        if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
          fs.writeFileSync(distBg, Buffer.from(base64Data, 'base64'));
        }
      } catch (syncErr) {
        // Non-critical fallback
      }

      const backgroundUrl = `/api/uploads/${filename}`;
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        dashboardBgImageUrl: backgroundUrl,
        dashboardBgImageData: base64Data,
        dashboardBgImageMime: mimeType,
        dashboardBgTheme: 'custom',
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { backgroundUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const backgroundUrl = dataString.trim();
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        dashboardBgImageUrl: backgroundUrl,
        updatedAt: new Date().toISOString(),
      };
      if (backgroundUrl === '/dashboard_bg.jpg') {
        delete db.settings.dashboardBgImageData;
        delete db.settings.dashboardBgImageMime;
      }
      saveDb(db);
      return { backgroundUrl, settings: db.settings };
    }
  },

  getLogoStream(): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();
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
        const logoFile = files.find((f) => f.startsWith('logo_'));
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
      const publicPath = path.join(process.cwd(), 'public', 'school_logo.png');
      if (fs.existsSync(publicPath)) {
        return {
          data: fs.readFileSync(publicPath),
          mime: 'image/png',
        };
      }
    } catch (e) {
      // No fallback
    }

    return null;
  },

  getBackgroundStream(): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();
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
        const bgFile = files.find((f) => f.startsWith('bg_'));
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
      const publicPath = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
      if (fs.existsSync(publicPath)) {
        return {
          data: fs.readFileSync(publicPath),
          mime: 'image/jpeg',
        };
      }
    } catch (e) {
      // No fallback
    }

    return null;
  },

  saveSplashBackground(
    dataString: string,
    mimeTypeOverride?: string
  ): { splashBackgroundUrl: string; settings: SystemSettings } {
    const db = ensureDbExists();
    ensureUploadsDir();

    if (!dataString) {
      throw new Error('Splash background image data is required');
    }

    if (dataString.startsWith('data:image') || dataString.length > 500) {
      const { base64Data, mimeType, ext } = parseBase64Image(dataString, mimeTypeOverride || 'image/jpeg');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `splash_${timestamp}_${randomSuffix}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      // Write physical file to uploads directory
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // Clean up older splash files in uploads directory
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          if (file.startsWith('splash_') && file !== filename) {
            fs.unlinkSync(path.join(UPLOADS_DIR, file));
          }
        }
      } catch (cleanupErr) {
        console.warn('Old splash background cleanup warning:', cleanupErr);
      }

      const splashBackgroundUrl = `/api/uploads/${filename}`;
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        splashBgImageUrl: splashBackgroundUrl,
        splashBgImageData: base64Data,
        splashBgImageMime: mimeType,
        updatedAt: new Date().toISOString(),
      };
      saveDb(db);

      return { splashBackgroundUrl, settings: db.settings };
    } else {
      // Direct URL passed
      const splashBackgroundUrl = dataString.trim();
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        splashBgImageUrl: splashBackgroundUrl,
        updatedAt: new Date().toISOString(),
      };
      if (splashBackgroundUrl === '/dashboard_bg.jpg' || splashBackgroundUrl === '/school_logo.png') {
        delete db.settings.splashBgImageData;
        delete db.settings.splashBgImageMime;
      }
      saveDb(db);
      return { splashBackgroundUrl, settings: db.settings };
    }
  },

  getSplashBackgroundStream(): { data: Buffer; mime: string } | null {
    const db = ensureDbExists();
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
        const splashFile = files.find((f) => f.startsWith('splash_'));
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

    // Fallback to general dashboard background
    const bgStream = this.getBackgroundStream();
    if (bgStream) return bgStream;

    // Fallback to public
    try {
      const publicPath = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
      if (fs.existsSync(publicPath)) {
        return {
          data: fs.readFileSync(publicPath),
          mime: 'image/jpeg',
        };
      }
    } catch (e) {
      // No fallback
    }

    return null;
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
