import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { dbService, initDatabaseAsync, getDatabaseStatus, isDatabaseHealthy } from './server/db.js';
import { generateStudentRecordsExcel } from './server/excelExport.js';
import { applySmartOcrCorrection } from './server/ocrCorrection.js';
import { User, StudentRecord, AdmissionStatus, SystemSettings } from './src/types.js';

async function startServer() {
  await initDatabaseAsync();
  const app = express();
  const PORT = 3000;

  const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static uploads directory serving
  app.use('/api/uploads', express.static(UPLOADS_DIR));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Helper middleware to extract user from header or query token
  const getCurrentUser = (req: express.Request): User | null => {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'] || (typeof req.query.token === 'string' ? req.query.token : undefined);
    if (!authHeader) return null;
    const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    // Format: "Bearer usr_..." or "usr_..."
    const userId = token.replace(/^Bearer\s+/i, '').trim();
    if (!userId) return null;
    const user = dbService.getUserById(userId);
    return user || null;
  };

  // Database availability check middleware for mutation routes
  const requireHealthyDatabase = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isDatabaseHealthy()) {
      return res.status(503).json({
        error: 'Database is currently connecting or unavailable. Please retry in a few seconds.',
        databaseUnavailable: true,
      });
    }
    next();
  };

  // --- API ROUTES ---

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const dbStatus = getDatabaseStatus();
    res.json({
      status: 'ok',
      database: dbStatus,
      healthy: isDatabaseHealthy(),
    });
  });

  // 1. Auth Status & Check
  app.get('/api/auth/status', (req, res) => {
    const users = dbService.getUsers();
    const settings = dbService.getSettings();
    const currentUser = getCurrentUser(req);
    const dbStatus = getDatabaseStatus();
    const isConfigured = users.length > 0 || Boolean(settings.setupCompleted);
    res.json({
      hasUsers: isConfigured,
      setupCompleted: isConfigured,
      currentUser,
      settings,
      database: dbStatus,
    });
  });

  // 1b. Check if Username Exists
  app.post('/api/auth/check-account', (req, res) => {
    const { identifier, username } = req.body;
    const checkUsername = (username || identifier || '').trim();

    const result = dbService.checkUserExists(checkUsername);
    if (result.exists && result.existingUser) {
      return res.json({
        exists: true,
        matchedField: result.matchedField,
        accountName: result.existingUser.fullName,
        username: result.existingUser.username,
        message: 'An account with this username already exists. Please log in to your existing account.',
      });
    }
    return res.json({ exists: false });
  });

  // 2. User Registration (Admin or Staff Account Creation)
  app.post('/api/auth/register', requireHealthyDatabase, async (req, res) => {
    try {
      const { fullName, username, password, confirmPassword, pin, role } = req.body;

      if (!fullName || !username || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (pin && !/^\d{4}$/.test(pin.trim())) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits (0-9).' });
      }

      // Check for existing account first
      const check = dbService.checkUserExists(username);
      if (check.exists && check.existingUser) {
        return res.status(409).json({
          error: 'An account with this username already exists. Please log in to your existing account.',
          existingAccount: true,
          existingUsername: check.existingUser.username,
          matchedField: check.matchedField,
        });
      }

      const users = dbService.getUsers();
      // First user becomes Super Admin, subsequent users get specified role or Recruitment Staff
      const userRole = users.length === 0 ? 'Super Administrator' : (role || 'Recruitment Staff');

      const newUser = await dbService.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        pin: pin ? pin.trim() : '1234',
        role: userRole,
      });

      await dbService.updateLastLogin(newUser.id);
      await dbService.addAuditLog({
        userId: newUser.id,
        userName: newUser.fullName,
        action: 'Account Created',
        details: `Created new account: ${newUser.fullName} (@${newUser.username}) - Role: ${newUser.role}`,
      });

      return res.status(201).json({
        user: newUser,
        token: newUser.id,
        isNewAccount: true,
        message: 'Account created successfully.',
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create account.' });
    }
  });

  // 2a. Initial Admin Creation (First Use Alias)
  app.post('/api/auth/register-admin', requireHealthyDatabase, async (req, res) => {
    try {
      const users = dbService.getUsers();
      if (users.length > 0) {
        return res.status(400).json({ error: 'System already has an administrator account. Please log in or create a staff account.' });
      }

      const { fullName, username, password, confirmPassword, pin } = req.body;

      if (!fullName || !username || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (pin && !/^\d{4}$/.test(pin.trim())) {
        return res.status(400).json({ error: 'Security PIN must be exactly 4 numeric digits.' });
      }

      const newUser = await dbService.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        pin: pin ? pin.trim() : '1234',
        role: 'Super Administrator',
      });

      await dbService.updateLastLogin(newUser.id);
      await dbService.addAuditLog({
        userId: newUser.id,
        userName: newUser.fullName,
        action: 'System Initialized',
        details: `Created initial Super Administrator account: @${newUser.username} (${newUser.fullName})`,
      });

      return res.json({
        user: newUser,
        token: newUser.id,
        isNewAccount: true,
        message: 'Administrator account created successfully.',
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create administrator account.' });
    }
  });

  // 2b. Reset User Accounts (Preserves logo, background, and system settings)
  app.post('/api/auth/reset-users', requireHealthyDatabase, async (req, res) => {
    try {
      await dbService.resetUsers();
      await dbService.addAuditLog({
        userId: 'system',
        userName: 'System Administrator',
        action: 'Account Reset',
        details: 'User accounts were reset. Customized logo, background theme, and school name were preserved.',
      });
      return res.json({
        success: true,
        message: 'All user accounts have been reset. Custom logo and background settings were kept.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to reset user accounts.' });
    }
  });

  // 2c. Delete Current User Account & Associated Student Records
  app.delete('/api/auth/account', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }

    try {
      const result = await dbService.deleteUserAccount(currentUser.id);
      if (result.success) {
        return res.json({
          success: true,
          message: `Account for ${currentUser.fullName} and ${result.deletedStudentsCount} associated student record(s) deleted permanently.`,
        });
      }
      return res.status(500).json({ error: 'Failed to delete account.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete account.' });
    }
  });

  app.post('/api/auth/delete-account', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }

    try {
      const result = await dbService.deleteUserAccount(currentUser.id);
      if (result.success) {
        return res.json({
          success: true,
          message: `Account for ${currentUser.fullName} and ${result.deletedStudentsCount} associated student record(s) deleted permanently.`,
        });
      }
      return res.status(500).json({ error: 'Failed to delete account.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete account.' });
    }
  });

  // 3. User Login (Authenticates with Username, Password, and optional 4-Digit PIN)
  app.post('/api/auth/login', (req, res) => {
    const { username, identifier, password, pin } = req.body;
    const loginId = (identifier || username || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const userWithHash = dbService.getUserByUsernameOrEmail(loginId);
    if (!userWithHash) {
      console.warn(`[AUTH] Login failed: Account "${loginId}" not found in persistent database.`);
      return res.status(401).json({
        error: "We couldn't find an account matching that username.",
        accountNotFound: true,
        identifier: loginId,
        message: "We couldn't find an account matching that username.",
      });
    }

    if (userWithHash.status !== 'Active') {
      return res.status(403).json({
        error: 'Account is deactivated. Please contact an administrator.',
        deactivated: true,
      });
    }

    const isMatch = dbService.verifyPassword(password, userWithHash.passwordHash);
    if (!isMatch) {
      console.warn(`[AUTH] Login failed: Incorrect password for user @${userWithHash.username} (${userWithHash.fullName}).`);
      return res.status(401).json({
        error: 'Incorrect password. Please try again.',
        wrongPassword: true,
        accountExists: true,
        identifier: userWithHash.username,
        message: 'Incorrect password. Please try again.',
      });
    }

    // Check PIN if provided or if user requires PIN
    if (pin !== undefined && pin !== null && String(pin).trim() !== '') {
      const pinMatches = dbService.verifyPin(String(pin).trim(), userWithHash);
      if (!pinMatches) {
        return res.status(401).json({
          error: 'Incorrect 4-Digit Security PIN. Please try again.',
          wrongPin: true,
          accountExists: true,
          identifier: userWithHash.username,
          message: 'Incorrect 4-Digit Security PIN.',
        });
      }
    }

    const isFirstLogin = !userWithHash.lastLoginAt;
    dbService.updateLastLogin(userWithHash.id);
    dbService.addAuditLog({
      userId: userWithHash.id,
      userName: userWithHash.fullName,
      action: 'Login',
      details: `User @${userWithHash.username} (${userWithHash.fullName}) logged in successfully`,
    });

    const { passwordHash, pinHash, ...cleanUser } = userWithHash as any;

    return res.json({
      user: cleanUser,
      token: cleanUser.id,
      isNewAccount: false,
      isFirstLogin,
      message: 'Logged in successfully.',
    });
  });

  // 4. Current User Info
  app.get('/api/auth/me', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({ user });
  });

  // 4b. Recruitment Lists API (Workspace lists)
  app.get('/api/recruitment-lists', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const includeArchived = req.query.includeArchived === 'true';
    const lists = dbService.getRecruitmentListsWithStats(currentUser.id, includeArchived);
    return res.json(lists);
  });

  app.post('/api/recruitment-lists', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { name, schoolName, branch } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Recruitment list name is required.' });
    }

    try {
      const newList = await dbService.createRecruitmentList(
        {
          userId: currentUser.id,
          name: name.trim(),
          schoolName: (schoolName || 'Sisters of Mary School').trim(),
          branch: (branch || 'Talisay, Cebu').trim(),
        },
        currentUser.fullName
      );

      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Recruitment List Created',
        details: `Created new recruitment list: "${newList.name}" for ${newList.branch}`,
      });

      return res.status(201).json(newList);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create recruitment list.' });
    }
  });

  app.get('/api/recruitment-lists/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const list = dbService.getRecruitmentListById(req.params.id, currentUser.id);
    if (!list) {
      return res.status(404).json({ error: 'Recruitment list not found' });
    }
    return res.json(list);
  });

  app.put('/api/recruitment-lists/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { name, schoolName, branch, archived } = req.body;

    try {
      const updated = await dbService.updateRecruitmentList(
        req.params.id,
        {
          ...(name !== undefined && { name: name.trim() }),
          ...(schoolName !== undefined && { schoolName: schoolName.trim() }),
          ...(branch !== undefined && { branch: branch.trim() }),
          ...(archived !== undefined && { archived: Boolean(archived) }),
        },
        currentUser.fullName,
        currentUser.id
      );

      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Recruitment List Updated',
        details: `Updated recruitment list: "${updated.name}" (${updated.branch})${archived !== undefined ? ` - Archived: ${archived}` : ''}`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update recruitment list.' });
    }
  });

  app.delete('/api/recruitment-lists/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (currentUser.role === 'Viewer') {
      return res.status(403).json({ error: 'Viewer role is not authorized to delete recruitment lists.' });
    }

    try {
      const existing = dbService.getRecruitmentListById(req.params.id, currentUser.id);
      const result = await dbService.deleteRecruitmentList(req.params.id, currentUser.id);
      if (result.success) {
        await dbService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          action: 'Recruitment List Deleted',
          details: `Deleted recruitment list "${existing?.name || req.params.id}" and ${result.deletedStudentsCount} associated student records.`,
        });
        return res.json({
          success: true,
          message: `Recruitment list and ${result.deletedStudentsCount} associated records deleted.`,
        });
      }
      return res.status(404).json({ error: 'Recruitment list not found.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete recruitment list.' });
    }
  });

  // 5. Dashboard Statistics (Account & Workspace isolated)
  app.get('/api/dashboard/stats', (req, res) => {
    const currentUser = getCurrentUser(req);
    const recruitmentListId = req.query.recruitmentListId as string | undefined;
    const students = dbService.getStudents(currentUser?.id, recruitmentListId);
    const totalStudents = students.length;
    const totalPass = students.filter((s) => s.remarks === 'A - PASS').length;
    const totalPending = students.filter((s) => s.remarks === 'B - PENDING').length;

    const schoolsSet = new Set(students.map((s) => s.elementarySchool?.trim()).filter(Boolean));
    const totalExamScores = students.reduce((sum, s) => sum + (Number(s.examScore) || 0), 0);
    const averageExamScore = totalStudents > 0 ? Math.round((totalExamScores / totalStudents) * 10) / 10 : 0;

    const recentStudents = [...students]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return res.json({
      totalStudents,
      totalPass,
      totalPending,
      elementarySchoolsCount: schoolsSet.size,
      averageExamScore,
      recentStudents,
    });
  });

  // 6. Get Students (Account & Workspace isolated with optional high-performance pagination)
  app.get('/api/students', (req, res) => {
    const currentUser = getCurrentUser(req);
    const recruitmentListId = req.query.recruitmentListId as string | undefined;
    const { search, status, sortBy, sortOrder, page, limit } = req.query;

    if (page !== undefined && page !== null && page !== '') {
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 25));
      const result = dbService.queryStudents({
        userId: currentUser?.id,
        recruitmentListId,
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
        page: pageNum,
        limit: limitNum,
      });
      return res.json(result);
    }

    let students = dbService.getStudents(currentUser?.id, recruitmentListId);

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          `${s.firstName} ${s.middleName} ${s.surname} ${s.lastName}`.toLowerCase().includes(q) ||
          s.lrn.toLowerCase().includes(q) ||
          s.elementarySchool.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          (s.barangay && s.barangay.toLowerCase().includes(q)) ||
          (s.municipality && s.municipality.toLowerCase().includes(q))
      );
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      students = students.filter((s) => s.remarks === status);
    }

    if (sortBy && typeof sortBy === 'string') {
      const order = sortOrder === 'desc' ? -1 : 1;
      students = [...students].sort((a, b) => {
        let valA: any = (a as any)[sortBy];
        let valB: any = (b as any)[sortBy];

        if (sortBy === 'fullName') {
          valA = `${a.surname || a.lastName} ${a.firstName}`;
          valB = `${b.surname || b.lastName} ${b.firstName}`;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    }

    return res.json(students);
  });

  // 6b. Check Duplicate Record
  app.post('/api/students/check-duplicate', (req, res) => {
    const currentUser = getCurrentUser(req);
    const candidate = req.body || {};
    const excludeId = req.body?.excludeId;
    let recruitmentListId = req.body?.recruitmentListId ? String(req.body.recruitmentListId).trim() : undefined;
    if (!recruitmentListId && currentUser) {
      const userLists = dbService.getRecruitmentLists(currentUser.id, false);
      if (userLists.length > 0) {
        recruitmentListId = userLists[0].id;
      }
    }

    const result = dbService.checkDuplicate(candidate, currentUser?.id, excludeId, recruitmentListId);
    return res.json(result);
  });

  // 7. Get Single Student
  app.get('/api/students/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    const recruitmentListId = req.query.recruitmentListId as string | undefined;
    const student = dbService.getStudentById(req.params.id, currentUser?.id, recruitmentListId);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    return res.json(student);
  });

  // 8. Add Student Record (Official Recruitment Personal Information Form)
  app.post('/api/students', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to encode student records.' });
    }

    const body = req.body || {};
    const lrn = String(body.lrn || '').trim();
    const lastName = String(body.lastName || body.surname || '').trim();
    const firstName = String(body.firstName || '').trim();
    const birthdate = String(body.birthdate || body.birthday || '').trim();

    // Resolve target recruitment list ID
    let recruitmentListId = body.recruitmentListId ? String(body.recruitmentListId).trim() : undefined;
    if (!recruitmentListId && currentUser) {
      const userLists = dbService.getRecruitmentLists(currentUser.id, false);
      if (userLists.length > 0) {
        recruitmentListId = userLists[0].id;
      }
    }

    // Required Field Validations matching official workflow
    if (!lrn) {
      return res.status(400).json({ error: "Please enter the student's 12-digit LRN." });
    }
    if (!lastName) {
      return res.status(400).json({ error: 'Last Name / Surname is required.' });
    }
    if (!firstName) {
      return res.status(400).json({ error: 'First Name is required.' });
    }
    if (!birthdate) {
      return res.status(400).json({ error: 'Please enter a valid birthdate.' });
    }
    if (isNaN(Date.parse(birthdate))) {
      return res.status(400).json({ error: 'Please enter a valid birthdate date.' });
    }

    const settings = dbService.getSettings();
    const scoreNum = Number(body.examScore || 0);
    if (isNaN(scoreNum) || scoreNum < 0) {
      return res.status(400).json({ error: 'Exam score must be a non-negative number.' });
    }
    if (scoreNum > settings.maxExamScore) {
      return res.status(400).json({ error: `Exam score cannot exceed the maximum configured score of ${settings.maxExamScore}.` });
    }

    const remarks = body.remarks === 'A - PASS' ? 'A - PASS' : 'B - PENDING';

    // Duplicate check before saving
    const dupCheck = dbService.checkDuplicate(
      {
        ...body,
        lrn,
        lastName,
        surname: lastName,
        firstName,
        birthdate,
        birthday: birthdate,
      },
      currentUser.id,
      undefined,
      recruitmentListId
    );

    if (dupCheck.duplicateStatus === 'EXACT') {
      return res.status(409).json({
        error: 'DUPLICATE_RECORD',
        duplicateStatus: 'EXACT',
        existingRecord: dupCheck.existingRecord,
        matchedFields: dupCheck.matchedFields,
        matchReason: dupCheck.matchReason,
        message: dupCheck.message || 'This student/applicant record already exists in this recruitment list.',
      });
    }

    try {
      const newStudent = await dbService.createStudent(
        {
          ...body,
          userId: currentUser.id,
          recruitmentListId,
          lrn,
          lastName,
          surname: lastName,
          middleName: (body.middleName || '').trim(),
          firstName,
          birthdate,
          birthday: birthdate,
          examScore: scoreNum,
          remarks: remarks as AdmissionStatus,
          createdBy: currentUser.fullName,
          updatedBy: currentUser.fullName,
        },
        currentUser.fullName
      );

      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Student Added',
        details: `Encoded new student: ${newStudent.lastName}, ${newStudent.firstName} (LRN: ${newStudent.lrn}) - Status: ${newStudent.remarks}`,
      });

      return res.status(201).json(newStudent);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('duplicate')) {
        return res.status(409).json({
          error: 'DUPLICATE_RECORD',
          duplicateStatus: 'EXACT',
          message: err.message,
        });
      }
      return res.status(400).json({ error: err.message || 'Failed to save student record.' });
    }
  });

  // 9. Update Student Record
  app.put('/api/students/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to update student records.' });
    }

    const studentId = req.params.id;
    const existing = dbService.getStudentById(studentId, currentUser.id);
    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const body = req.body || {};
    const { lrn, birthdate, birthday, examScore, remarks } = body;

    if (lrn !== undefined && (!lrn || !String(lrn).trim())) {
      return res.status(400).json({ error: "Please enter the student's LRN." });
    }

    const bDate = birthdate || birthday;
    if (bDate && isNaN(Date.parse(bDate))) {
      return res.status(400).json({ error: 'Please enter a valid birthday date.' });
    }

    const settings = dbService.getSettings();
    if (examScore !== undefined) {
      const scoreNum = Number(examScore);
      if (isNaN(scoreNum) || scoreNum < 0) {
        return res.status(400).json({ error: 'Exam score must be a non-negative number.' });
      }
      if (scoreNum > settings.maxExamScore) {
        return res.status(400).json({ error: `Exam score cannot exceed maximum score of ${settings.maxExamScore}.` });
      }
    }

    if (remarks !== undefined && remarks !== 'A - PASS' && remarks !== 'B - PENDING') {
      return res.status(400).json({ error: 'Admission status must be "A - PASS" or "B - PENDING".' });
    }

    try {
      const isStatusChange = remarks && remarks !== existing.remarks;

      const updated = await dbService.updateStudent(
        studentId,
        {
          ...body,
          ...(bDate && { birthdate: bDate, birthday: bDate }),
          ...(body.lastName && { lastName: body.lastName.trim(), surname: body.lastName.trim() }),
          ...(body.surname && { lastName: body.surname.trim(), surname: body.surname.trim() }),
        },
        currentUser.fullName,
        currentUser.id
      );

      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: isStatusChange ? 'Status Changed' : 'Student Edited',
        details: isStatusChange
          ? `Changed admission status of ${updated.lastName || updated.surname}, ${updated.firstName} from ${existing.remarks} to ${updated.remarks}`
          : `Updated details for student ${updated.lastName || updated.surname}, ${updated.firstName} (LRN: ${updated.lrn})`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update student record.' });
    }
  });

  // 10. Delete Student Record
  app.delete('/api/students/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to delete student records.' });
    }

    if (currentUser.role === 'Viewer') {
      return res.status(403).json({ error: 'Viewer role is not authorized to delete student records.' });
    }

    const student = dbService.getStudentById(req.params.id, currentUser.id);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const success = await dbService.deleteStudent(req.params.id, currentUser.id);
    if (success) {
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Student Deleted',
        details: `Deleted student record: ${student.surname}, ${student.firstName} (LRN: ${student.lrn})`,
      });
      return res.json({ message: 'Student record deleted successfully.' });
    }
    return res.status(500).json({ error: 'Failed to delete student record.' });
  });

  // 10b. OCR Document Scanning (Gemini 3.6 Flash Multimodal Document Processing)
  app.post('/api/ocr-scan', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to perform OCR scanning.' });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
      return res.status(400).json({ error: 'Image file or camera scan data is required for OCR processing.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'OCR configuration error. Please contact the system administrator.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let cleanBase64 = imageBase64;
      let cleanMimeType = mimeType || 'image/jpeg';

      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        cleanMimeType = parts[0].replace('data:', '') || cleanMimeType;
        cleanBase64 = parts[1];
      }

      const schema = {
        type: Type.OBJECT,
        properties: {
          extractedData: {
            type: Type.OBJECT,
            properties: {
              // Section A: Basic Personal Information
              lastName: { type: Type.STRING, description: 'Last Name / Surname / Apelyido' },
              surname: { type: Type.STRING, description: 'Last Name / Surname' },
              firstName: { type: Type.STRING, description: 'First Name / Pangalan' },
              middleName: { type: Type.STRING, description: 'Middle Name / Gitnang Pangalan' },
              birthdate: { type: Type.STRING, description: 'Date of Birth in standardized YYYY-MM-DD format (e.g. 2012-05-14)' },
              birthday: { type: Type.STRING, description: 'Date of Birth in YYYY-MM-DD' },
              age: { type: Type.NUMBER, description: 'Age in years' },
              gender: { type: Type.STRING, description: 'Sex / Gender (Female or Male)' },

              // Section B: Residence / Address Information
              sitioStreet: { type: Type.STRING, description: 'Sitio / Street / Purok / House No.' },
              barangay: { type: Type.STRING, description: 'Barangay' },
              municipality: { type: Type.STRING, description: 'Municipality / City' },
              province: { type: Type.STRING, description: 'Province' },
              address: { type: Type.STRING, description: 'Complete address string' },

              // Section C: Educational Background
              elementarySchool: { type: Type.STRING, description: 'Elementary School Graduated' },
              school: { type: Type.STRING, description: 'Elementary School Graduated' },
              schoolAddress: { type: Type.STRING, description: 'Address of Elementary School' },
              reportCardSy: { type: Type.STRING, description: 'Report Card School Year (e.g. SY 2024-2025)' },
              lrn: { type: Type.STRING, description: '12-digit Learner Reference Number digits only' },
              grading: { type: Type.STRING, description: 'Grading Period (e.g. 1st, 2nd, 3rd, 4th, Final)' },
              currentGrade: { type: Type.STRING, description: 'Current Grade Level (e.g. Grade 6)' },
              oldGraduateRemarks: { type: Type.STRING, description: 'Old Graduate details or others specified' },

              // Section D: Family Background
              fatherName: { type: Type.STRING, description: "Father's Full Name (Ama)" },
              fatherOccupation: { type: Type.STRING, description: "Father's Occupation (Hanapbuhay ng Ama)" },
              motherName: { type: Type.STRING, description: "Mother's Full Maiden Name (Ina)" },
              motherOccupation: { type: Type.STRING, description: "Mother's Occupation (Hanapbuhay ng Ina)" },
              guardianName: { type: Type.STRING, description: "Guardian's Full Name (Tagapag-alaga), if applicable" },
              guardianRelation: { type: Type.STRING, description: "Relationship of Guardian to applicant" },
              guardianOccupation: { type: Type.STRING, description: "Guardian's Occupation" },

              // Section E: Contact Information
              cellphoneNumber: { type: Type.STRING, description: 'Contact / Cellphone number' },
              cellphoneOwner: { type: Type.STRING, description: 'Whose cellphone number (e.g. Mother, Father, Guardian, Applicant)' },
              messengerAccount: { type: Type.STRING, description: 'Facebook / Messenger account name' },
              messengerOwner: { type: Type.STRING, description: 'Owner of Messenger account' },

              // Section F: Religious & Civil Information
              birthCertificatePsa: { type: Type.STRING, description: 'PSA Birth Certificate submitted / verified (Yes/No)' },
              psaFatherNameAge: { type: Type.STRING, description: "PSA Father's Name and Age as appearing on document" },
              fatherReligion: { type: Type.STRING, description: "Father's Religion" },
              psaMotherNameAge: { type: Type.STRING, description: "PSA Mother's Name and Age as appearing on document" },
              motherReligion: { type: Type.STRING, description: "Mother's Religion" },
              birthOrder: { type: Type.NUMBER, description: 'Birth order / Pang-ilan sa magkakapatid (e.g. 1, 2, 3)' },
              numberOfChildren: { type: Type.NUMBER, description: 'Total number of children in family' },
              baptizedCatholic: { type: Type.STRING, description: 'Baptized Catholic (Yes or No)' },
              denomination: { type: Type.STRING, description: 'If not Catholic, religious denomination' },
              confirmedCatholic: { type: Type.STRING, description: 'Confirmed Catholic (Yes or No)' },

              // Section G: Siblings Information
              siblings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    siblingNo: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    age: { type: Type.STRING },
                    remarks: { type: Type.STRING },
                  },
                },
                description: 'List of brothers and sisters with their age and remarks/schooling/work',
              },
              numSiblings: { type: Type.NUMBER, description: 'Total count of siblings' },

              // Section H: Parish Information
              parishPlace: { type: Type.STRING, description: 'Parish name and place / location' },
              parishPriest: { type: Type.STRING, description: "Parish Priest's name" },

              // Section I: Health Assessment & Exam
              examScore: { type: Type.NUMBER, description: 'Entrance Exam Score' },
              healthStatus: { type: Type.STRING, description: 'Health & Medical Conditions / Assessment' },
              remarks: { type: Type.STRING, description: "Admission Remarks / Status ('A - PASS' or 'B - PENDING')" },
              additionalNotes: { type: Type.STRING, description: 'Additional Notes or Observations from Interviewer / Recruiter' },
              studentSignature: { type: Type.STRING, description: 'Student Signature confirmed (e.g. Signed)' },
            },
          },
          fieldConfidence: {
            type: Type.OBJECT,
            properties: {
              lastName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              firstName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              middleName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              birthdate: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              lrn: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              address: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              elementarySchool: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              fatherName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              motherName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              examScore: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              remarks: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
            },
          },
          formTitleDetected: { type: Type.STRING, description: 'Title or heading text detected on the form' },
          detectedNotes: { type: Type.STRING, description: 'Any extra handwritten notes, assessor comments, or dates found on the document' },
          uncertainFields: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of field names where the handwriting is faint, ambiguous, or requires human staff verification',
          },
          rawSummary: { type: Type.STRING, description: 'A brief 1-2 sentence overview of what student document was scanned' },
        },
        required: ['extractedData'],
      };

      let responseText = '';
      // Primary model: gemini-3.6-flash as specified by project requirements, with modern fallback aliases
      const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: `You are an expert OCR and document understanding system for Sisters of Mary School student recruitment intake forms.
Analyze the provided document image of the official "RECRUITMENT PERSONAL INFORMATION" form and extract all printed and handwritten information with high fidelity according to the official sections:

SECTION BREAKDOWN & MAPPING:
A. BASIC PERSONAL INFORMATION:
   - Last Name / Surname (SN / Apelyido)
   - First Name (FN / Pangalan)
   - Middle Name (MN / Gitnang Pangalan)
   - Date of Birth (Kaarawan): Standardize to YYYY-MM-DD (e.g., "2012-05-14")
   - Age: Calculate or extract age in years
   - Sex / Gender: Female or Male

B. RESIDENCE / ADDRESS INFORMATION:
   - Sitio / Street / Purok
   - Barangay
   - Municipality / City
   - Province
   - Complete Address string

C. EDUCATIONAL BACKGROUND:
   - Elementary School Graduated / Paaralan
   - School Address
   - Report Card (SY) / Grading Period
   - 12-digit Learner Reference Number (LRN): Digits only (e.g. 109283746123)
   - Current Grade (Grade 6) & Old Graduate remarks if any

D. FAMILY BACKGROUND:
   - Father's Full Name & Occupation
   - Mother's Full Name & Occupation
   - Guardian's Full Name, Relationship & Occupation (if applicable)

E. CONTACT INFORMATION:
   - Cellphone Number & Cellphone Owner (e.g. Mother, Father, Self)
   - Messenger Account & Messenger Owner

F. RELIGIOUS & CIVIL INFORMATION:
   - PSA Birth Certificate (Yes/No)
   - PSA Father's Name & Age, Father's Religion
   - PSA Mother's Name & Age, Mother's Religion
   - Birth Order (Pang-ilan) & Number of Children
   - Baptized Catholic (Yes/No), Denomination (if other), Confirmed Catholic (Yes/No)

G. SIBLINGS INFORMATION:
   - Extract list of siblings (name, age, remarks) and total count

H. PARISH INFORMATION:
   - Parish / Place & Parish Priest

I. HEALTH & EXAMINATION:
   - Health / Medical conditions (Normal, Asthma, Allergies, etc.)
   - Entrance Exam Score
   - Remarks: strictly "A - PASS" or "B - PENDING"

ACCURACY & INTEGRITY RULES:
- NEVER guess unreadable handwriting or invent sample names/data.
- If a field is blank or illegible, return empty string "" or 0 and assign fieldConfidence as "LOW" or "NOT_DETECTED".
- Put the names of any ambiguous/faint fields into the uncertainFields array so recruitment staff can easily review and verify them.`,
                },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
          });

          responseText = response.text || '{}';
          if (responseText && responseText.trim()) {
            break; // Succeeded!
          }
        } catch (modelErr: any) {
          lastErr = modelErr;
          console.warn(`OCR attempt with model ${modelName} returned error:`, modelErr?.message || modelErr);
          // Small pause before trying fallback model if 503 or 429
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      const resultText = responseText || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(resultText);
      } catch (parseErr) {
        console.error('Failed to parse Gemini OCR JSON:', parseErr, resultText);
        parsed = { extractedData: {} };
      }

      const rawExtractedData = parsed.extractedData || parsed;
      const { correctedData, originalOcrData, corrections } = applySmartOcrCorrection(rawExtractedData);

      const fieldConfidence = parsed.fieldConfidence || {};
      const formTitleDetected = parsed.formTitleDetected || 'Personal Data Form';
      const detectedNotes = parsed.detectedNotes || '';
      const uncertainFields = parsed.uncertainFields || [];
      const rawSummary = parsed.rawSummary || '';

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'OCR Scan Performed',
        details: `Scanned Personal Data Form with OCR (${corrections.length} smart auto-correction(s) applied): ${correctedData.surname || ''}${correctedData.firstName ? ', ' + correctedData.firstName : ''} (LRN: ${correctedData.lrn || 'N/A'})`,
      });

      return res.json({
        success: true,
        extractedData: correctedData,
        originalOcrData,
        corrections,
        fieldConfidence,
        formTitleDetected,
        detectedNotes,
        uncertainFields,
        rawSummary,
      });
    } catch (err: any) {
      console.error('OCR Scanning Error Details:', err);
      const errMsg = err?.message || String(err);

      let userFriendlyError = 'OCR temporarily unavailable. The document image was preserved. Please retry OCR.';
      let statusCode = 500;

      if (
        errMsg.includes('API_KEY') ||
        errMsg.includes('apiKey') ||
        errMsg.includes('API key') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('401') ||
        errMsg.includes('403') ||
        errMsg.includes('PERMISSION_DENIED')
      ) {
        userFriendlyError = 'OCR configuration error. Please contact the system administrator.';
        statusCode = 500;
      } else if (
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('429')
      ) {
        userFriendlyError = 'The scanning service is temporarily busy. Please retry in a moment.';
        statusCode = 503;
      } else if (
        errMsg.includes('ECONNREFUSED') ||
        errMsg.includes('fetch failed') ||
        errMsg.includes('network') ||
        errMsg.includes('ENOTFOUND') ||
        errMsg.includes('ETIMEDOUT')
      ) {
        userFriendlyError = 'Connection problem. Check your internet connection and retry OCR.';
        statusCode = 502;
      } else if (
        errMsg.includes('400') ||
        errMsg.includes('INVALID_ARGUMENT') ||
        errMsg.includes('image format') ||
        errMsg.includes('corrupted') ||
        errMsg.includes('cannot decode')
      ) {
        userFriendlyError = 'Unable to process this image. Please try a clearer document image.';
        statusCode = 400;
      } else if (
        errMsg.includes('404') ||
        errMsg.includes('NOT_FOUND') ||
        errMsg.includes('is no longer available') ||
        errMsg.includes('not found')
      ) {
        userFriendlyError = 'OCR service unavailable. Please try OCR again.';
        statusCode = 503;
      }

      return res.status(statusCode).json({
        error: userFriendlyError,
      });
    }
  });

  // 11. Excel Export
  app.get('/api/students/export/excel', async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      const students = dbService.getStudents(currentUser?.id);

      const excelBuffer = await generateStudentRecordsExcel(students);

      if (currentUser) {
        dbService.addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          action: 'Excel Exported',
          details: `Exported ${students.length} student records to Excel (.xlsx)`,
        });
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Student_Records_Sisters_of_Mary_Girlstown.xlsx"'
      );
      return res.send(excelBuffer);
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      return res.status(500).json({ error: 'Failed to generate Excel file.' });
    }
  });

  // 12. Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    const logs = dbService.getAuditLogs();
    return res.json(logs);
  });

  // Direct fallback route for uploaded files (serves from disk or database backup)
  const handleUploadedFile = (req: express.Request, res: express.Response) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    // Fallback: If disk was wiped or container redeployed, reconstruct from DB
    if (filename.startsWith('logo_')) {
      const logo = dbService.getLogoStream(filename);
      if (logo) {
        res.setHeader('Content-Type', logo.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(logo.data);
      }
    } else if (filename.startsWith('bg_')) {
      const bg = dbService.getBackgroundStream(filename);
      if (bg) {
        res.setHeader('Content-Type', bg.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(bg.data);
      }
    } else if (filename.startsWith('splash_')) {
      const splash = dbService.getSplashBackgroundStream(filename);
      if (splash) {
        res.setHeader('Content-Type', splash.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(splash.data);
      }
    }

    return res.status(404).send('Image file not found');
  };

  app.get('/api/uploads/:filename', handleUploadedFile);
  app.get('/uploads/:filename', handleUploadedFile);

  // 13. System Settings & Branding Endpoints
  // 13a. GET /api/settings/logo - Stream active logo image directly
  app.get('/api/settings/logo', (req, res) => {
    const logo = dbService.getLogoStream();
    if (logo) {
      res.setHeader('Content-Type', logo.mime);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(logo.data);
    }
    const candidateLogos = [
      path.join(process.cwd(), 'public', 'school-logo.png'),
      path.join(process.cwd(), 'public', 'school_logo.png'),
      path.join(process.cwd(), 'public', 'school_logo.svg'),
    ];
    for (const defaultLogo of candidateLogos) {
      if (fs.existsSync(defaultLogo)) {
        res.setHeader('Content-Type', defaultLogo.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
        return res.sendFile(defaultLogo);
      }
    }
    return res.status(404).send('Default school logo not found');
  });

  // 13b. PUT/PATCH/POST /api/settings/logo - Upload & save system logo permanently
  const handleLogoSave = async (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system logo.' });
    }

    const { imageBase64, mimeType, logoUrl, presetName } = req.body;
    const targetImage = imageBase64 || logoUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Logo image data is required.' });
    }

    try {
      const result = await dbService.saveLogo(targetImage, mimeType, presetName);
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Logo Updated',
        details: `Updated permanent system school logo (${result.logoUrl})`,
      });
      return res.json({
        success: true,
        logoUrl: result.logoUrl,
        settings: result.settings,
        message: 'System logo saved, persisted, and retained in presets successfully.',
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save system logo.' });
    }
  };
  app.put('/api/settings/logo', requireHealthyDatabase, handleLogoSave);
  app.patch('/api/settings/logo', requireHealthyDatabase, handleLogoSave);
  app.post('/api/settings/logo', requireHealthyDatabase, handleLogoSave);

  // 13c. GET /api/settings/background - Stream active background image directly
  app.get('/api/settings/background', (req, res) => {
    const bg = dbService.getBackgroundStream();
    if (bg) {
      res.setHeader('Content-Type', bg.mime);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(bg.data);
    }
    const candidateBgs = [
      path.join(process.cwd(), 'public', 'school-campus-background.jpg'),
      path.join(process.cwd(), 'public', 'school-sunset-background.jpg'),
      path.join(process.cwd(), 'public', 'dashboard_bg.jpg'),
    ];
    for (const defaultBg of candidateBgs) {
      if (fs.existsSync(defaultBg)) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(defaultBg);
      }
    }
    return res.status(404).send('Default dashboard background not found');
  });

  // 13d. PUT/PATCH/POST /api/settings/background - Upload & save system background permanently
  const handleBgSave = async (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system background.' });
    }

    const { imageBase64, mimeType, backgroundUrl, presetName } = req.body;
    const targetImage = imageBase64 || backgroundUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Background image data is required.' });
    }

    try {
      const result = await dbService.saveBackground(targetImage, mimeType, presetName);
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Background Updated',
        details: `Updated permanent dashboard background image (${result.backgroundUrl})`,
      });
      return res.json({
        success: true,
        backgroundUrl: result.backgroundUrl,
        settings: result.settings,
        message: 'Dashboard background saved, persisted, and retained in presets successfully.',
      });
    } catch (err: any) {
      console.error('Background upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save system background.' });
    }
  };
  app.put('/api/settings/background', requireHealthyDatabase, handleBgSave);
  app.patch('/api/settings/background', requireHealthyDatabase, handleBgSave);
  app.post('/api/settings/background', requireHealthyDatabase, handleBgSave);

  // 13e. GET /api/settings/splash-background - Stream active splash background image directly
  app.get('/api/settings/splash-background', (req, res) => {
    const splash = dbService.getSplashBackgroundStream();
    if (splash) {
      res.setHeader('Content-Type', splash.mime);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(splash.data);
    }
    const candidateSplashBgs = [
      path.join(process.cwd(), 'public', 'school-sunset-background.jpg'),
      path.join(process.cwd(), 'public', 'school-campus-background.jpg'),
      path.join(process.cwd(), 'public', 'splash_bg.jpg'),
      path.join(process.cwd(), 'public', 'dashboard_bg.jpg'),
    ];
    for (const defaultBg of candidateSplashBgs) {
      if (fs.existsSync(defaultBg)) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(defaultBg);
      }
    }
    return res.status(404).send('Default splash background not found');
  });

  // 13f. PUT/PATCH/POST /api/settings/splash-background - Upload & save splash screen background permanently
  const handleSplashBgSave = async (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update splash background.' });
    }

    const { imageBase64, mimeType, splashBackgroundUrl, presetName } = req.body;
    const targetImage = imageBase64 || splashBackgroundUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Splash background image data is required.' });
    }

    try {
      const result = await dbService.saveSplashBackground(targetImage, mimeType, presetName);
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Splash Background Updated',
        details: `Updated permanent splash screen background image (${result.splashBackgroundUrl})`,
      });
      return res.json({
        success: true,
        splashBackgroundUrl: result.splashBackgroundUrl,
        settings: result.settings,
        message: 'Splash screen background saved, persisted, and retained in presets successfully.',
      });
    } catch (err: any) {
      console.error('Splash background upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save splash screen background.' });
    }
  };
  app.put('/api/settings/splash-background', requireHealthyDatabase, handleSplashBgSave);
  app.patch('/api/settings/splash-background', requireHealthyDatabase, handleSplashBgSave);
  app.post('/api/settings/splash-background', requireHealthyDatabase, handleSplashBgSave);

  // 13g. GET /api/settings
  app.get('/api/settings', (req, res) => {
    const settings = dbService.getSettings();
    return res.json(settings);
  });

  // 13h. PUT /api/settings
  app.put('/api/settings', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system settings.' });
    }

    const {
      schoolName,
      subTitle,
      systemName,
      schoolLocation,
      schoolLogoUrl,
      maxExamScore,
      dashboardBgTheme,
      dashboardBgGradient,
      dashboardBgImageUrl,
      splashBgImageUrl,
      academicYear,
      logoPresets,
      dashboardBgPresets,
      splashBgPresets,
      customThemePresets,
    } = req.body;

    const updates: Partial<SystemSettings> = {};

    if (schoolName !== undefined) {
      if (!schoolName || !String(schoolName).trim()) {
        return res.status(400).json({ error: 'School name cannot be empty.' });
      }
      updates.schoolName = String(schoolName).trim();
    }

    if (subTitle !== undefined) {
      updates.subTitle = String(subTitle).trim();
    }

    if (systemName !== undefined) {
      updates.systemName = String(systemName).trim();
    }

    if (schoolLocation !== undefined) {
      updates.schoolLocation = String(schoolLocation).trim();
    }

    if (schoolLogoUrl !== undefined) {
      updates.schoolLogoUrl = String(schoolLogoUrl).trim();
    }

    if (academicYear !== undefined) {
      updates.academicYear = String(academicYear).trim();
    }

    if (dashboardBgTheme !== undefined) {
      updates.dashboardBgTheme = dashboardBgTheme;
    }

    if (dashboardBgGradient !== undefined) {
      updates.dashboardBgGradient = String(dashboardBgGradient).trim();
    }

    if (dashboardBgImageUrl !== undefined) {
      updates.dashboardBgImageUrl = String(dashboardBgImageUrl).trim();
    }

    if (splashBgImageUrl !== undefined) {
      updates.splashBgImageUrl = String(splashBgImageUrl).trim();
    }

    if (Array.isArray(logoPresets)) {
      updates.logoPresets = logoPresets;
    }

    if (Array.isArray(dashboardBgPresets)) {
      updates.dashboardBgPresets = dashboardBgPresets;
    }

    if (Array.isArray(splashBgPresets)) {
      updates.splashBgPresets = splashBgPresets;
    }

    if (Array.isArray(customThemePresets)) {
      updates.customThemePresets = customThemePresets;
    }

    if (maxExamScore !== undefined) {
      const scoreNum = Number(maxExamScore);
      if (isNaN(scoreNum) || scoreNum <= 0) {
        return res.status(400).json({ error: 'Maximum exam score must be a positive number.' });
      }
      updates.maxExamScore = scoreNum;
    }

    try {
      const updated = await dbService.updateSettings(updates);
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Settings Updated',
        details: `Updated system branding, presets, and configuration settings`,
      });
      return res.json(updated);
    } catch (err: any) {
      console.error('Settings update error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update system settings.' });
    }
  });

  // 13i. Preset Management Endpoints
  // Logo Presets
  app.post('/api/settings/presets/logo', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.addLogoPreset(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add logo preset.' });
    }
  });

  app.patch('/api/settings/presets/logo/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.updateLogoPreset(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update logo preset.' });
    }
  });

  app.delete('/api/settings/presets/logo/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.deleteLogoPreset(req.params.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete logo preset.' });
    }
  });

  // Dashboard Background Presets
  app.post('/api/settings/presets/dashboard-bg', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.addDashboardBgPreset(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add background preset.' });
    }
  });

  app.patch('/api/settings/presets/dashboard-bg/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.updateDashboardBgPreset(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update background preset.' });
    }
  });

  app.delete('/api/settings/presets/dashboard-bg/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.deleteDashboardBgPreset(req.params.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete background preset.' });
    }
  });

  // Splash Background Presets
  app.post('/api/settings/presets/splash-bg', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.addSplashBgPreset(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add splash preset.' });
    }
  });

  app.patch('/api/settings/presets/splash-bg/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.updateSplashBgPreset(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update splash preset.' });
    }
  });

  app.delete('/api/settings/presets/splash-bg/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.deleteSplashBgPreset(req.params.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete splash preset.' });
    }
  });

  // Theme Presets
  app.post('/api/settings/presets/theme', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.addThemePreset(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add theme preset.' });
    }
  });

  app.patch('/api/settings/presets/theme/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.updateThemePreset(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update theme preset.' });
    }
  });

  app.delete('/api/settings/presets/theme/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can manage presets.' });
    }
    try {
      const updated = await dbService.deleteThemePreset(req.params.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete theme preset.' });
    }
  });

  // 14. User Management (Super Admin)
  app.get('/api/users', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }
    const users = dbService.getUsers();
    return res.json(users);
  });

  app.post('/api/users', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    const { fullName, username, password, pin, role } = req.body;
    if (!fullName || !username || !password || !role) {
      return res.status(400).json({ error: 'All user fields (Full Name, Username, Password, Role) are required.' });
    }

    try {
      const newUser = await dbService.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        pin: pin ? pin.trim() : '1234',
        role,
      });

      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'User Created',
        details: `Created new staff account: @${newUser.username} (${newUser.role})`,
      });

      return res.status(201).json(newUser);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create user.' });
    }
  });

  app.put('/api/users/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    try {
      const updated = await dbService.updateUser(req.params.id, req.body);
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'User Updated',
        details: `Updated user account: ${updated.username} (${updated.role})`,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update user.' });
    }
  });

  app.delete('/api/users/:id', requireHealthyDatabase, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    if (req.params.id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
    }

    const deleted = await dbService.deleteUser(req.params.id);
    if (deleted) {
      await dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'User Deleted',
        details: `Deleted user account ID: ${req.params.id}`,
      });
      return res.json({ message: 'User deleted successfully.' });
    }
    return res.status(404).json({ error: 'User not found.' });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
