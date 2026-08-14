import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { dbService } from './server/db.js';
import { generateStudentRecordsExcel } from './server/excelExport.js';
import { User, StudentRecord, AdmissionStatus, SystemSettings } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  // 2. Initial Admin Creation (First Use Only)
  app.post('/api/auth/register-admin', (req, res) => {
    try {
      const users = dbService.getUsers();
      if (users.length > 0) {
        return res.status(400).json({ error: 'System already has an administrator account.' });
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

  // 3. User Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const userWithHash = dbService.getUserByUsername(username);
    if (!userWithHash) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (userWithHash.status !== 'Active') {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    const isMatch = dbService.verifyPassword(password, userWithHash.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    dbService.updateLastLogin(userWithHash.id);
    dbService.addAuditLog({
      userId: userWithHash.id,
      userName: userWithHash.fullName,
      action: 'Login',
      details: `User ${userWithHash.username} logged in successfully`,
    });

    const { passwordHash, ...cleanUser } = userWithHash;

    return res.json({
      user: cleanUser,
      token: cleanUser.id,
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

  // 5. Dashboard Statistics
  app.get('/api/dashboard/stats', (req, res) => {
    const students = dbService.getStudents();
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

  // 6. Get All Students
  app.get('/api/students', (req, res) => {
    let students = dbService.getStudents();
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

  // 7. Get Single Student
  app.get('/api/students/:id', (req, res) => {
    const student = dbService.getStudentById(req.params.id);
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
    const existing = dbService.getStudentById(studentId);
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
        currentUser.fullName
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

    const student = dbService.getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const success = dbService.deleteStudent(req.params.id);
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

  // 10b. OCR Document Scanning (Gemini Flash Multimodal)
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
          surname: { type: Type.STRING },
          middleName: { type: Type.STRING },
          firstName: { type: Type.STRING },
          birthday: { type: Type.STRING, description: 'Formatted YYYY-MM-DD if recognizable' },
          address: { type: Type.STRING },
          lrn: { type: Type.STRING, description: 'Learner Reference Number, digits only' },
          fatherName: { type: Type.STRING },
          motherName: { type: Type.STRING },
          guardianName: { type: Type.STRING },
          numSiblings: { type: Type.NUMBER, description: 'Number of siblings' },
          fatherOccupation: { type: Type.STRING },
          motherOccupation: { type: Type.STRING },
          guardianOccupation: { type: Type.STRING },
          examScore: { type: Type.NUMBER, description: 'Score in entrance/admission exam' },
          elementarySchool: { type: Type.STRING },
          healthStatus: { type: Type.STRING },
          remarks: { type: Type.STRING, description: "Either 'A - PASS' or 'B - PENDING'" },
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: cleanBase64,
              },
            },
            {
              text: `You are an expert OCR document reader for Sisters of Mary School-Girlstown, Inc. student recruitment forms.
Extract all readable applicant information from the document image provided.
Extract these exact fields:
- surname (SN)
- middleName (MN)
- firstName (FN)
- birthday (formatted YYYY-MM-DD)
- address
- lrn (12-digit Learner Reference Number)
- fatherName
- motherName
- guardianName
- numSiblings (number of siblings)
- fatherOccupation
- motherOccupation
- guardianOccupation
- examScore (entrance exam score)
- elementarySchool
- healthStatus
- remarks ('A - PASS' or 'B - PENDING')

If any field is missing or unclear on the document, set it as an empty string or 0.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const resultText = response.text || '{}';
      let extractedData = {};
      try {
        extractedData = JSON.parse(resultText);
      } catch {
        extractedData = {};
      }

      dbService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'OCR Scan Performed',
        details: 'Scanned student document with OCR to assist recruitment encoding',
      });

      return res.json({
        success: true,
        extractedData,
      });
    } catch (err: any) {
      console.error('OCR Scanning Error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to scan document image with OCR.',
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

  // 13. System Settings
  app.get('/api/settings', (req, res) => {
    const settings = dbService.getSettings();
    return res.json(settings);
  });

  app.put('/api/settings', (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser || currentUser.role !== 'Super Administrator') {
      return res.status(403).json({ error: 'Only Super Administrator can update system settings.' });
    }

    const {
      schoolName,
      subTitle,
      schoolLogoUrl,
      maxExamScore,
      dashboardBgTheme,
      dashboardBgGradient,
      dashboardBgImageUrl,
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

    if (maxExamScore !== undefined) {
      const scoreNum = Number(maxExamScore);
      if (isNaN(scoreNum) || scoreNum <= 0) {
        return res.status(400).json({ error: 'Maximum exam score must be a positive number.' });
      }
      updates.maxExamScore = scoreNum;
    }

    const updated = dbService.updateSettings(updates);
    dbService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'Settings Updated',
      details: `Updated system settings (School: "${updated.schoolName}", Theme: "${updated.dashboardBgTheme || 'default'}")`,
    });
    return res.json(updated);
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
