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
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'Sisters of Mary School-Girlstown, Inc.',
  subTitle: 'Internal Student Recruitment & Information Management System',
  schoolLogoUrl: '/school_logo.png',
  maxExamScore: 100,
  dashboardBgTheme: 'custom',
  dashboardBgGradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
  dashboardBgImageUrl: '/dashboard_bg.jpg',
  academicYear: 'SY 2026-2027 Recruitment',
};

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
    const existing = db.users.find((u) => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existing) {
      throw new Error('Username already exists');
    }

    const passwordHash = bcrypt.hashSync(userData.password, 10);
    const newUser: User & { passwordHash: string } = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      fullName: userData.fullName,
      email: userData.email,
      username: userData.username,
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

    if (updates.fullName) db.users[userIdx].fullName = updates.fullName;
    if (updates.email) db.users[userIdx].email = updates.email;
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

  // STUDENTS
  getStudents(): StudentRecord[] {
    const db = ensureDbExists();
    return db.students;
  },

  getStudentById(id: string): StudentRecord | undefined {
    const db = ensureDbExists();
    return db.students.find((s) => s.id === id);
  },

  getStudentByLrn(lrn: string): StudentRecord | undefined {
    const db = ensureDbExists();
    return db.students.find((s) => s.lrn.trim() === lrn.trim());
  },

  createStudent(
    studentData: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>,
    operatorName: string
  ): StudentRecord {
    const db = ensureDbExists();

    // Check duplicate LRN
    const existing = db.students.find((s) => s.lrn.trim() === studentData.lrn.trim());
    if (existing) {
      throw new Error("This LRN already exists. Please verify the student's information.");
    }

    const now = new Date().toISOString();
    const newStudent: StudentRecord = {
      ...studentData,
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      lrn: studentData.lrn.trim(),
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
    operatorName: string
  ): StudentRecord {
    const db = ensureDbExists();
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error('Student record not found');
    }

    // If LRN is being changed, check if new LRN exists on ANOTHER record
    if (updates.lrn && updates.lrn.trim() !== db.students[idx].lrn.trim()) {
      const duplicate = db.students.find(
        (s) => s.id !== id && s.lrn.trim() === updates.lrn?.trim()
      );
      if (duplicate) {
        throw new Error("This LRN already exists. Please verify the student's information.");
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

  deleteStudent(id: string): boolean {
    const db = ensureDbExists();
    const initialLen = db.students.length;
    db.students = db.students.filter((s) => s.id !== id);
    if (db.students.length !== initialLen) {
      saveDb(db);
      return true;
    }
    return false;
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
    return db.settings || DEFAULT_SETTINGS;
  },

  updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const db = ensureDbExists();

    // Auto-persist uploaded base64 logo to public/school_logo.png
    if (newSettings.schoolLogoUrl && newSettings.schoolLogoUrl.startsWith('data:image')) {
      try {
        const base64Data = newSettings.schoolLogoUrl.replace(/^data:image\/\w+;base64,/, '');
        const publicLogoPath = path.join(process.cwd(), 'public', 'school_logo.png');
        fs.writeFileSync(publicLogoPath, Buffer.from(base64Data, 'base64'));
      } catch (err) {
        console.error('Failed to sync public school_logo.png:', err);
      }
    }

    // Auto-persist uploaded base64 background to public/dashboard_bg.jpg
    if (newSettings.dashboardBgImageUrl && newSettings.dashboardBgImageUrl.startsWith('data:image')) {
      try {
        const base64Data = newSettings.dashboardBgImageUrl.replace(/^data:image\/\w+;base64,/, '');
        const publicBgPath = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
        fs.writeFileSync(publicBgPath, Buffer.from(base64Data, 'base64'));
      } catch (err) {
        console.error('Failed to sync public dashboard_bg.jpg:', err);
      }
    }

    db.settings = { ...db.settings, ...newSettings };
    saveDb(db);
    return db.settings;
  },
};
