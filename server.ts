import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { dbService } from './server/db.js';
import { generateStudentRecordsExcel } from './server/excelExport.js';
import { User, StudentRecord, AdmissionStatus, SystemSettings } from './src/types.js';

async function startServer() {
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

  // --- API ROUTES ---

  // 1. Auth Status & Check
  app.get('/api/auth/status', (req, res) => {
    const users = dbService.getUsers();
    const settings = dbService.getSettings();
    const currentUser = getCurrentUser(req);
    res.json({
      hasUsers: users.length > 0,
      currentUser,
      settings,
    });
  });

  // 1b. Check if Username or Email Exists
  app.post('/api/auth/check-account', (req, res) => {
    const { identifier, email, username } = req.body;
    const checkEmail = (email || identifier || '').trim();
    const checkUsername = (username || identifier || '').trim();

    const result = dbService.checkUserExists(checkEmail, checkUsername);
    if (result.exists && result.existingUser) {
      return res.json({
        exists: true,
        matchedField: result.matchedField,
        accountName: result.existingUser.fullName,
        username: result.existingUser.username,
        email: result.existingUser.email,
        message: 'An account with this email/username already exists. Please log in to your existing account.',
      });
    }
    return res.json({ exists: false });
  });

  // 2. User Registration (Admin or Staff Account Creation)
  app.post('/api/auth/register', (req, res) => {
    try {
      const { fullName, email, username, password, confirmPassword, role } = req.body;

      if (!fullName || !email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Check for existing account first
      const check = dbService.checkUserExists(email, username);
      if (check.exists && check.existingUser) {
        return res.status(409).json({
          error: 'An account with this email/username already exists. Please log in to your existing account.',
          existingAccount: true,
          existingUsername: check.existingUser.username,
          existingEmail: check.existingUser.email,
          matchedField: check.matchedField,
        });
      }

      const users = dbService.getUsers();
      // First user becomes Super Admin, subsequent users get specified role or Recruitment Staff
      const userRole = users.length === 0 ? 'Super Administrator' : (role || 'Recruitment Staff');

      const newUser = dbService.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        role: userRole,
      });

      dbService.updateLastLogin(newUser.id);
      dbService.addAuditLog({
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
  app.post('/api/auth/register-admin', (req, res) => {
    try {
      const users = dbService.getUsers();
      if (users.length > 0) {
        return res.status(400).json({ error: 'System already has an administrator account. Please log in or create a staff account.' });
      }

      const { fullName, email, username, password, confirmPassword } = req.body;

      if (!fullName || !email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const newUser = dbService.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        role: 'Super Administrator',
      });

      dbService.updateLastLogin(newUser.id);
      dbService.addAuditLog({
        userId: newUser.id,
        userName: newUser.fullName,
        action: 'System Initialized',
        details: `Created initial Super Administrator account: ${newUser.username} (${newUser.email})`,
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
  app.post('/api/auth/reset-users', (req, res) => {
    try {
      dbService.resetUsers();
      dbService.addAuditLog({
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
  app.delete('/api/auth/account', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }

    try {
      const result = dbService.deleteUserAccount(currentUser.id);
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

  app.post('/api/auth/delete-account', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }

    try {
      const result = dbService.deleteUserAccount(currentUser.id);
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

  // 3. User Login (Supports Username or Email)
  app.post('/api/auth/login', (req, res) => {
    const { username, identifier, password } = req.body;
    const loginId = (identifier || username || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const userWithHash = dbService.getUserByUsernameOrEmail(loginId);
    if (!userWithHash) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    if (userWithHash.status !== 'Active') {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    const isMatch = dbService.verifyPassword(password, userWithHash.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isFirstLogin = !userWithHash.lastLoginAt;
    dbService.updateLastLogin(userWithHash.id);
    dbService.addAuditLog({
      userId: userWithHash.id,
      userName: userWithHash.fullName,
      action: 'Login',
      details: `User ${userWithHash.username} (${userWithHash.fullName}) logged in successfully`,
    });

    const { passwordHash, ...cleanUser } = userWithHash;

    return res.json({
      user: cleanUser,
      token: cleanUser.id,
      isFirstLogin,
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

  // 5. Dashboard Statistics (Account-isolated)
  app.get('/api/dashboard/stats', (req, res) => {
    const currentUser = getCurrentUser(req);
    const students = dbService.getStudents(currentUser?.id);
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

  // 6. Get Students (Account-isolated)
  app.get('/api/students', (req, res) => {
    const currentUser = getCurrentUser(req);
    let students = dbService.getStudents(currentUser?.id);
    const { search, status, sortBy, sortOrder } = req.query;

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          `${s.firstName} ${s.middleName} ${s.surname}`.toLowerCase().includes(q) ||
          s.lrn.toLowerCase().includes(q) ||
          s.elementarySchool.toLowerCase().includes(q)
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
          valA = `${a.surname} ${a.firstName}`;
          valB = `${b.surname} ${b.firstName}`;
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

    const result = dbService.checkDuplicate(candidate, currentUser?.id, excludeId);
    return res.json(result);
  });

  // 7. Get Single Student
  app.get('/api/students/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    const student = dbService.getStudentById(req.params.id, currentUser?.id);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    return res.json(student);
  });

  // 8. Add Student Record
  app.post('/api/students', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to encode student records.' });
    }

    const {
      lrn,
      surname,
      middleName,
      firstName,
      birthday,
      address,
      fatherName,
      motherName,
      guardianName,
      numSiblings,
      fatherOccupation,
      motherOccupation,
      guardianOccupation,
      examScore,
      elementarySchool,
      remarks,
      healthStatus,
    } = req.body;

    // Validation
    if (!lrn || !lrn.trim()) {
      return res.status(400).json({ error: "Please enter the student's LRN." });
    }
    if (!surname || !surname.trim()) {
      return res.status(400).json({ error: 'Surname is required.' });
    }
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'First Name is required.' });
    }
    if (!birthday) {
      return res.status(400).json({ error: 'Please enter a valid birthday.' });
    }
    if (isNaN(Date.parse(birthday))) {
      return res.status(400).json({ error: 'Please enter a valid birthday date.' });
    }

    const settings = dbService.getSettings();
    const scoreNum = Number(examScore);
    if (isNaN(scoreNum) || scoreNum < 0) {
      return res.status(400).json({ error: 'Exam score must be a non-negative number.' });
    }
    if (scoreNum > settings.maxExamScore) {
      return res.status(400).json({ error: `Exam score cannot exceed the maximum configured score of ${settings.maxExamScore}.` });
    }

    const siblingsNum = Number(numSiblings);
    if (isNaN(siblingsNum) || siblingsNum < 0) {
      return res.status(400).json({ error: 'Number of siblings must be a valid number.' });
    }

    if (remarks !== 'A - PASS' && remarks !== 'B - PENDING') {
      return res.status(400).json({ error: 'Admission status must be either "A - PASS" or "B - PENDING".' });
    }

    try {
      const newStudent = dbService.createStudent(
        {
          userId: currentUser.id,
          lrn: lrn.trim(),
          surname: surname.trim(),
          middleName: (middleName || '').trim(),
          firstName: firstName.trim(),
          birthday,
          address: (address || '').trim(),
          fatherName: (fatherName || '').trim(),
          motherName: (motherName || '').trim(),
          guardianName: (guardianName || '').trim(),
          numSiblings: Math.floor(siblingsNum),
          fatherOccupation: (fatherOccupation || '').trim(),
          motherOccupation: (motherOccupation || '').trim(),
          guardianOccupation: (guardianOccupation || '').trim(),
          examScore: scoreNum,
          elementarySchool: (elementarySchool || '').trim(),
          remarks: remarks as AdmissionStatus,
          healthStatus: (healthStatus || '').trim(),
          createdBy: currentUser.fullName,
          updatedBy: currentUser.fullName,
        },
        currentUser.fullName
      );

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Student Added',
        details: `Encoded new student: ${newStudent.surname}, ${newStudent.firstName} (LRN: ${newStudent.lrn}) - Status: ${newStudent.remarks}`,
      });

      return res.status(201).json(newStudent);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to save student record.' });
    }
  });

  // 9. Update Student Record
  app.put('/api/students/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to update student records.' });
    }

    const studentId = req.params.id;
    const existing = dbService.getStudentById(studentId, currentUser.id);
    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const {
      lrn,
      surname,
      middleName,
      firstName,
      birthday,
      address,
      fatherName,
      motherName,
      guardianName,
      numSiblings,
      fatherOccupation,
      motherOccupation,
      guardianOccupation,
      examScore,
      elementarySchool,
      remarks,
      healthStatus,
    } = req.body;

    if (lrn !== undefined && (!lrn || !lrn.trim())) {
      return res.status(400).json({ error: "Please enter the student's LRN." });
    }

    if (birthday && isNaN(Date.parse(birthday))) {
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

      const updated = dbService.updateStudent(
        studentId,
        {
          ...(lrn !== undefined && { lrn: lrn.trim() }),
          ...(surname !== undefined && { surname: surname.trim() }),
          ...(middleName !== undefined && { middleName: middleName.trim() }),
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(birthday !== undefined && { birthday }),
          ...(address !== undefined && { address: address.trim() }),
          ...(fatherName !== undefined && { fatherName: fatherName.trim() }),
          ...(motherName !== undefined && { motherName: motherName.trim() }),
          ...(guardianName !== undefined && { guardianName: guardianName.trim() }),
          ...(numSiblings !== undefined && { numSiblings: Math.floor(Number(numSiblings)) }),
          ...(fatherOccupation !== undefined && { fatherOccupation: fatherOccupation.trim() }),
          ...(motherOccupation !== undefined && { motherOccupation: motherOccupation.trim() }),
          ...(guardianOccupation !== undefined && { guardianOccupation: guardianOccupation.trim() }),
          ...(examScore !== undefined && { examScore: Number(examScore) }),
          ...(elementarySchool !== undefined && { elementarySchool: elementarySchool.trim() }),
          ...(remarks !== undefined && { remarks }),
          ...(healthStatus !== undefined && { healthStatus: healthStatus.trim() }),
        },
        currentUser.fullName,
        currentUser.id
      );

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: isStatusChange ? 'Status Changed' : 'Student Edited',
        details: isStatusChange
          ? `Changed admission status of ${updated.surname}, ${updated.firstName} from ${existing.remarks} to ${updated.remarks}`
          : `Updated details for student ${updated.surname}, ${updated.firstName} (LRN: ${updated.lrn})`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update student record.' });
    }
  });

  // 10. Delete Student Record
  app.delete('/api/students/:id', (req, res) => {
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

    const success = dbService.deleteStudent(req.params.id, currentUser.id);
    if (success) {
      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Student Deleted',
        details: `Deleted student record: ${student.surname}, ${student.firstName} (LRN: ${student.lrn})`,
      });
      return res.json({ message: 'Student record deleted successfully.' });
    }
    return res.status(500).json({ error: 'Failed to delete student record.' });
  });

  // 10b. OCR Document Scanning (Gemini 3.7 Flash Multimodal)
  app.post('/api/ocr-scan', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required to perform OCR scanning.' });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image file or camera scan data is required for OCR processing.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Gemini API key is not configured on the server. Ensure GEMINI_API_KEY is available.',
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
              surname: { type: Type.STRING, description: 'Surname / Last Name / SN written on the form' },
              middleName: { type: Type.STRING, description: 'Middle Name / MN written on the form' },
              firstName: { type: Type.STRING, description: 'First Name / Given Name / FN written on the form' },
              birthday: { type: Type.STRING, description: 'Date of Birth in standardized YYYY-MM-DD format if recognizable, else empty string' },
              address: { type: Type.STRING, description: 'Complete home address including Barangay, Municipality/City, Province' },
              lrn: { type: Type.STRING, description: '12-digit Learner Reference Number (digits only, e.g. 109283746123)' },
              fatherName: { type: Type.STRING, description: 'Full name of father (Ama/Tatay)' },
              fatherOccupation: { type: Type.STRING, description: 'Occupation / Hanapbuhay of father' },
              motherName: { type: Type.STRING, description: 'Full name of mother (Ina/Nanay)' },
              motherOccupation: { type: Type.STRING, description: 'Occupation / Hanapbuhay of mother' },
              guardianName: { type: Type.STRING, description: 'Full name of guardian (Tagapag-alaga), if any' },
              guardianOccupation: { type: Type.STRING, description: 'Occupation / Hanapbuhay of guardian, if any' },
              numSiblings: { type: Type.NUMBER, description: 'Number of siblings (Bilang ng kapatid). Default 0 if none or unstated' },
              examScore: { type: Type.NUMBER, description: 'Score in Entrance/Admission Exam, if indicated on the form' },
              elementarySchool: { type: Type.STRING, description: 'Name of Elementary School Graduated / Paaralang Elementarya' },
              healthStatus: { type: Type.STRING, description: 'Health / Medical conditions (e.g., Normal, Asthma, Allergies, or None)' },
              remarks: { type: Type.STRING, description: "Admission remarks: strictly either 'A - PASS' or 'B - PENDING'" },
            },
          },
          fieldConfidence: {
            type: Type.OBJECT,
            properties: {
              surname: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              middleName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              firstName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              birthday: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              address: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              lrn: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              fatherName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              fatherOccupation: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              motherName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              motherOccupation: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              guardianName: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              guardianOccupation: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              numSiblings: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              examScore: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              elementarySchool: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
              healthStatus: { type: Type.STRING, description: 'HIGH, MEDIUM, LOW, or NOT_DETECTED' },
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
      const candidateModels = ['gemini-3.7-flash', 'gemini-2.5-flash'];
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
                  text: `You are an expert OCR and document understanding system for Sisters of Mary School-Girlstown, Inc. student recruitment forms.
Analyze the provided document image (Personal Data Form / Applicant Form) and extract all printed and handwritten information with high fidelity.

FORM STRUCTURE AND MAPPING GUIDELINES:
1. FORM HEADER: Look for "PERSONAL DATA FORM", "Sisters of Mary School-Girlstown, Inc.", or recruitment intake header.
2. PERSONAL INFORMATION:
   - Surname (SN / Apelyido / Last Name): Look for the surname field.
   - First Name (FN / Pangalan / Given Name): Look for the applicant's first name.
   - Middle Name (MN / Gitnang Pangalan): Look for middle name or initial.
   - LRN (Learner Reference Number): 12-digit student reference number, often enclosed in 12 individual boxes or next to "LRN". Extract strictly digits.
   - Birthday / Date of Birth (Kaarawan): Convert any format (e.g., "10/24/2012", "October 24, 2012", "24-Oct-2012", "2012-10-24") to standardized "YYYY-MM-DD".
   - Address (Tirahan): Complete street address, barangay, town/city, province.
3. FAMILY BACKGROUND:
   - Father's Name (Pangalan ng Ama / Tatay) and Father's Occupation (Hanapbuhay)
   - Mother's Name (Pangalan ng Ina / Nanay) and Mother's Occupation (Hanapbuhay)
   - Guardian's Name (Tagapag-alaga) and Guardian's Occupation (Hanapbuhay)
   - Number of Siblings (Bilang ng Kapatid): Extract integer count. If written as words (e.g. "tatlo", "three", "3"), parse to numeric 3.
4. EDUCATIONAL & ADMISSION:
   - Elementary School (Paaralang Elementarya / School Graduated): Elementary school name where student finished Grade 6.
   - Exam Score: Score in the entrance examination or admission test. Extract as number.
   - Remarks: Check if marked "A - PASS" / Passed / Admitted / Qualified, or "B - PENDING" / Pending / For evaluation. Map strictly to "A - PASS" or "B - PENDING".
5. HEALTH STATUS:
   - Medical conditions, allergies, asthma, normal, fit, or none.

ACCURACY & INTEGRITY RULES:
- NEVER guess unreadable handwriting or invent sample names/data.
- If a field is blank, unmarked, or completely illegible, return an empty string "" or 0 and assign fieldConfidence as "LOW" or "NOT_DETECTED".
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
          console.warn(`OCR attempt with ${modelName} encountered error:`, modelErr?.message || modelErr);
          // Wait 300ms before trying fallback model if 503 or 429
          await new Promise((r) => setTimeout(r, 300));
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

      const extractedData = parsed.extractedData || parsed;
      const fieldConfidence = parsed.fieldConfidence || {};
      const formTitleDetected = parsed.formTitleDetected || 'Personal Data Form';
      const detectedNotes = parsed.detectedNotes || '';
      const uncertainFields = parsed.uncertainFields || [];
      const rawSummary = parsed.rawSummary || '';

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'OCR Scan Performed',
        details: `Scanned Personal Data Form with OCR: ${extractedData.surname || ''}${extractedData.firstName ? ', ' + extractedData.firstName : ''} (LRN: ${extractedData.lrn || 'N/A'})`,
      });

      return res.json({
        success: true,
        extractedData,
        fieldConfidence,
        formTitleDetected,
        detectedNotes,
        uncertainFields,
        rawSummary,
      });
    } catch (err: any) {
      console.error('OCR Scanning Error:', err);
      const errMsg = err?.message || String(err);
      const is503OrBusy =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('429');

      if (is503OrBusy) {
        return res.status(503).json({
          error: 'The scanning service is temporarily busy. Please try again.',
          isTemporary: true,
        });
      }

      return res.status(500).json({
        error: errMsg || 'Failed to scan document image with OCR. Please try again.',
      });
    }
  });

  // 11. Excel Export
  app.get('/api/students/export/excel', async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      const students = dbService.getStudents();

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
      const logo = dbService.getLogoStream();
      if (logo) {
        res.setHeader('Content-Type', logo.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(logo.data);
      }
    } else if (filename.startsWith('bg_')) {
      const bg = dbService.getBackgroundStream();
      if (bg) {
        res.setHeader('Content-Type', bg.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(bg.data);
      }
    } else if (filename.startsWith('splash_')) {
      const splash = dbService.getSplashBackgroundStream();
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
    const defaultLogo = path.join(process.cwd(), 'public', 'school_logo.png');
    if (fs.existsSync(defaultLogo)) {
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(defaultLogo);
    }
    return res.status(404).send('Default school logo not found');
  });

  // 13b. PUT/PATCH/POST /api/settings/logo - Upload & save system logo permanently
  const handleLogoSave = (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system logo.' });
    }

    const { imageBase64, mimeType, logoUrl } = req.body;
    const targetImage = imageBase64 || logoUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Logo image data is required.' });
    }

    try {
      const result = dbService.saveLogo(targetImage, mimeType);
      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Logo Updated',
        details: `Updated permanent system school logo (${result.logoUrl})`,
      });
      return res.json({
        success: true,
        logoUrl: result.logoUrl,
        settings: result.settings,
        message: 'System logo saved and persisted successfully.',
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save system logo.' });
    }
  };
  app.put('/api/settings/logo', handleLogoSave);
  app.patch('/api/settings/logo', handleLogoSave);
  app.post('/api/settings/logo', handleLogoSave);

  // 13c. GET /api/settings/background - Stream active background image directly
  app.get('/api/settings/background', (req, res) => {
    const bg = dbService.getBackgroundStream();
    if (bg) {
      res.setHeader('Content-Type', bg.mime);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(bg.data);
    }
    const defaultBg = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
    if (fs.existsSync(defaultBg)) {
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(defaultBg);
    }
    return res.status(404).send('Default dashboard background not found');
  });

  // 13d. PUT/PATCH/POST /api/settings/background - Upload & save system background permanently
  const handleBgSave = (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system background.' });
    }

    const { imageBase64, mimeType, backgroundUrl } = req.body;
    const targetImage = imageBase64 || backgroundUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Background image data is required.' });
    }

    try {
      const result = dbService.saveBackground(targetImage, mimeType);
      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Background Updated',
        details: `Updated permanent dashboard background image (${result.backgroundUrl})`,
      });
      return res.json({
        success: true,
        backgroundUrl: result.backgroundUrl,
        settings: result.settings,
        message: 'Dashboard background saved and persisted successfully.',
      });
    } catch (err: any) {
      console.error('Background upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save system background.' });
    }
  };
  app.put('/api/settings/background', handleBgSave);
  app.patch('/api/settings/background', handleBgSave);
  app.post('/api/settings/background', handleBgSave);

  // 13e. GET /api/settings/splash-background - Stream active splash background image directly
  app.get('/api/settings/splash-background', (req, res) => {
    const splash = dbService.getSplashBackgroundStream();
    if (splash) {
      res.setHeader('Content-Type', splash.mime);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(splash.data);
    }
    const defaultBg = path.join(process.cwd(), 'public', 'dashboard_bg.jpg');
    if (fs.existsSync(defaultBg)) {
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(defaultBg);
    }
    return res.status(404).send('Default splash background not found');
  });

  // 13f. PUT/PATCH/POST /api/settings/splash-background - Upload & save splash screen background permanently
  const handleSplashBgSave = (req: express.Request, res: express.Response) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update splash background.' });
    }

    const { imageBase64, mimeType, splashBackgroundUrl } = req.body;
    const targetImage = imageBase64 || splashBackgroundUrl;
    if (!targetImage) {
      return res.status(400).json({ error: 'Splash background image data is required.' });
    }

    try {
      const result = dbService.saveSplashBackground(targetImage, mimeType);
      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Splash Background Updated',
        details: `Updated permanent splash screen background image (${result.splashBackgroundUrl})`,
      });
      return res.json({
        success: true,
        splashBackgroundUrl: result.splashBackgroundUrl,
        settings: result.settings,
        message: 'Splash screen background saved and persisted successfully.',
      });
    } catch (err: any) {
      console.error('Splash background upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save splash screen background.' });
    }
  };
  app.put('/api/settings/splash-background', handleSplashBgSave);
  app.patch('/api/settings/splash-background', handleSplashBgSave);
  app.post('/api/settings/splash-background', handleSplashBgSave);

  // 13g. GET /api/settings
  app.get('/api/settings', (req, res) => {
    const settings = dbService.getSettings();
    return res.json(settings);
  });

  // 13h. PUT /api/settings
  app.put('/api/settings', (req, res) => {
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

    if (maxExamScore !== undefined) {
      const scoreNum = Number(maxExamScore);
      if (isNaN(scoreNum) || scoreNum <= 0) {
        return res.status(400).json({ error: 'Maximum exam score must be a positive number.' });
      }
      updates.maxExamScore = scoreNum;
    }

    try {
      const updated = dbService.updateSettings(updates);
      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'Settings Updated',
        details: `Updated system branding and configuration settings`,
      });
      return res.json(updated);
    } catch (err: any) {
      console.error('Settings update error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update system settings.' });
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

  app.post('/api/users', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    const { fullName, email, username, password, role } = req.body;
    if (!fullName || !email || !username || !password || !role) {
      return res.status(400).json({ error: 'All user fields are required.' });
    }

    try {
      const newUser = dbService.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        role,
      });

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'User Created',
        details: `Created new staff account: ${newUser.username} (${newUser.role})`,
      });

      return res.status(201).json(newUser);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create user.' });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    try {
      const updated = dbService.updateUser(req.params.id, req.body);
      dbService.addAuditLog({
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

  app.delete('/api/users/:id', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Access restricted to Super Administrator.' });
    }

    if (req.params.id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
    }

    const deleted = dbService.deleteUser(req.params.id);
    if (deleted) {
      dbService.addAuditLog({
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
