import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  User,
  Users,
  GraduationCap,
  HeartPulse,
  AlertCircle,
  Save,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  Edit3,
  ArrowLeft,
  FileSearch,
  Check,
  Plus,
  Trash2,
  Phone,
  Church,
  Home,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { StudentRecord, AdmissionStatus, SiblingRecord } from '../types';
import { createStudent, updateStudent, checkStudentDuplicate } from '../lib/api';
import { ScanFormView } from './ScanFormView';

interface Props {
  studentToEdit?: StudentRecord | null;
  initialMode?: 'selection' | 'ocr' | 'form';
  maxExamScore: number;
  recruitmentListId?: string;
  onClose: () => void;
  onSuccess: (student: StudentRecord) => void;
}

export const StudentFormModal: React.FC<Props> = ({
  studentToEdit,
  initialMode = 'selection',
  maxExamScore,
  recruitmentListId,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!studentToEdit;

  // View state: 'selection' | 'ocr' | 'form'
  const [mode, setMode] = useState<'selection' | 'ocr' | 'form'>(
    isEditing ? 'form' : initialMode
  );

  // Active section tab for easy navigation
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H_I'>('A');

  // --- SECTION A: Basic Personal Information ---
  const [photoUrl, setPhotoUrl] = useState<string>(studentToEdit?.photoUrl || '');
  const [lastName, setLastName] = useState<string>(studentToEdit?.lastName || studentToEdit?.surname || '');
  const [firstName, setFirstName] = useState<string>(studentToEdit?.firstName || '');
  const [middleName, setMiddleName] = useState<string>(studentToEdit?.middleName || '');
  const [birthdate, setBirthdate] = useState<string>(studentToEdit?.birthdate || studentToEdit?.birthday || '');
  const [age, setAge] = useState<number | string>(studentToEdit?.age ?? '');
  const [gender, setGender] = useState<'Female' | 'Male' | string>(studentToEdit?.gender || 'Female');

  // --- SECTION B: Residence / Address Information ---
  const [sitioStreet, setSitioStreet] = useState<string>(studentToEdit?.sitioStreet || '');
  const [barangay, setBarangay] = useState<string>(studentToEdit?.barangay || '');
  const [municipality, setMunicipality] = useState<string>(studentToEdit?.municipality || '');
  const [province, setProvince] = useState<string>(studentToEdit?.province || '');
  const [address, setAddress] = useState<string>(studentToEdit?.address || '');

  // --- SECTION C: Educational Background ---
  const [elementarySchool, setElementarySchool] = useState<string>(
    studentToEdit?.elementarySchool || studentToEdit?.school || ''
  );
  const [schoolAddress, setSchoolAddress] = useState<string>(studentToEdit?.schoolAddress || '');
  const [reportCardSy, setReportCardSy] = useState<string>(
    studentToEdit?.reportCardSy || studentToEdit?.reportCard || 'SY 2024-2025'
  );
  const [lrn, setLrn] = useState<string>(studentToEdit?.lrn || '');
  const [grading, setGrading] = useState<string>(studentToEdit?.grading || 'Final');
  const [currentGrade, setCurrentGrade] = useState<string>(studentToEdit?.currentGrade || 'Grade 6');
  const [oldGraduateRemarks, setOldGraduateRemarks] = useState<string>(studentToEdit?.oldGraduateRemarks || '');

  // --- SECTION D: Family Background ---
  const [fatherName, setFatherName] = useState<string>(studentToEdit?.fatherName || '');
  const [fatherOccupation, setFatherOccupation] = useState<string>(studentToEdit?.fatherOccupation || '');
  const [motherName, setMotherName] = useState<string>(studentToEdit?.motherName || '');
  const [motherOccupation, setMotherOccupation] = useState<string>(studentToEdit?.motherOccupation || '');
  const [guardianName, setGuardianName] = useState<string>(studentToEdit?.guardianName || '');
  const [guardianRelation, setGuardianRelation] = useState<string>(studentToEdit?.guardianRelation || '');
  const [guardianOccupation, setGuardianOccupation] = useState<string>(studentToEdit?.guardianOccupation || '');

  // --- SECTION E: Contact Information ---
  const [cellphoneNumber, setCellphoneNumber] = useState<string>(studentToEdit?.cellphoneNumber || '');
  const [cellphoneOwner, setCellphoneOwner] = useState<string>(studentToEdit?.cellphoneOwner || '');
  const [messengerAccount, setMessengerAccount] = useState<string>(studentToEdit?.messengerAccount || '');
  const [messengerOwner, setMessengerOwner] = useState<string>(studentToEdit?.messengerOwner || '');

  // --- SECTION F: Religious & Civil Information ---
  const [birthCertificatePsa, setBirthCertificatePsa] = useState<'Yes' | 'No' | string>(
    studentToEdit?.birthCertificatePsa || 'Yes'
  );
  const [psaFatherNameAge, setPsaFatherNameAge] = useState<string>(studentToEdit?.psaFatherNameAge || '');
  const [fatherReligion, setFatherReligion] = useState<string>(studentToEdit?.fatherReligion || 'Roman Catholic');
  const [psaMotherNameAge, setPsaMotherNameAge] = useState<string>(studentToEdit?.psaMotherNameAge || '');
  const [motherReligion, setMotherReligion] = useState<string>(studentToEdit?.motherReligion || 'Roman Catholic');
  const [birthOrder, setBirthOrder] = useState<number | string>(studentToEdit?.birthOrder ?? 1);
  const [numberOfChildren, setNumberOfChildren] = useState<number | string>(studentToEdit?.numberOfChildren ?? 1);
  const [baptizedCatholic, setBaptizedCatholic] = useState<'Yes' | 'No' | string>(
    studentToEdit?.baptizedCatholic || 'Yes'
  );
  const [denomination, setDenomination] = useState<string>(studentToEdit?.denomination || '');
  const [confirmedCatholic, setConfirmedCatholic] = useState<'Yes' | 'No' | string>(
    studentToEdit?.confirmedCatholic || 'Yes'
  );

  // --- SECTION G: Siblings Information ---
  const [siblings, setSiblings] = useState<SiblingRecord[]>(
    studentToEdit?.siblings && Array.isArray(studentToEdit.siblings) && studentToEdit.siblings.length > 0
      ? studentToEdit.siblings
      : [{ siblingNo: 1, name: '', age: '', remarks: '' }]
  );

  // --- SECTION H: Parish Information ---
  const [parishPlace, setParishPlace] = useState<string>(studentToEdit?.parishPlace || '');
  const [parishPriest, setParishPriest] = useState<string>(studentToEdit?.parishPriest || '');

  // --- SECTION I: Health Assessment & Exam ---
  const [healthStatus, setHealthStatus] = useState<string>(
    studentToEdit?.healthStatus || 'Normal / Fit for schooling'
  );
  const [examScore, setExamScore] = useState<number | string>(studentToEdit?.examScore ?? 0);
  const [remarks, setRemarks] = useState<AdmissionStatus>(studentToEdit?.remarks || 'B - PENDING');
  const [additionalNotes, setAdditionalNotes] = useState<string>(studentToEdit?.additionalNotes || '');
  const [studentSignature, setStudentSignature] = useState<string>(studentToEdit?.studentSignature || 'Signed');

  // UI / Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicateStatus: 'EXACT' | 'POSSIBLE';
    existingRecord: StudentRecord;
    matchReason?: string;
    message: string;
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate age whenever birthdate changes
  useEffect(() => {
    if (birthdate && birthdate.includes('-')) {
      const birth = new Date(birthdate);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 0 && calculatedAge < 100) {
          setAge(calculatedAge);
        }
      }
    }
  }, [birthdate]);

  // Auto-compose address string if individual parts are filled
  useEffect(() => {
    const parts = [sitioStreet, barangay, municipality, province].map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      setAddress(parts.join(', '));
    }
  }, [sitioStreet, barangay, municipality, province]);

  // Real-time duplicate checking
  useEffect(() => {
    const timer = setTimeout(async () => {
      const cleanLrn = lrn.trim();
      const cleanSn = lastName.trim();
      const cleanFn = firstName.trim();

      if ((cleanLrn && cleanLrn.length >= 6) || (cleanSn && cleanFn)) {
        try {
          const res = await checkStudentDuplicate(
            {
              lrn: cleanLrn,
              lastName: cleanSn,
              surname: cleanSn,
              firstName: cleanFn,
              birthdate: birthdate,
              birthday: birthdate,
              address: address,
            },
            studentToEdit?.id,
            recruitmentListId
          );

          if (res.duplicateStatus === 'EXACT' || res.duplicateStatus === 'POSSIBLE') {
            setDuplicateWarning({
              duplicateStatus: res.duplicateStatus,
              existingRecord: res.existingRecord!,
              matchReason: res.matchReason,
              message: res.message,
            });
          } else {
            setDuplicateWarning(null);
          }
        } catch {
          // Silent fallback
        }
      } else {
        setDuplicateWarning(null);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [lrn, lastName, firstName, birthdate, address, studentToEdit?.id, recruitmentListId]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Photo file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG or PNG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Siblings handling
  const handleAddSibling = () => {
    setSiblings((prev) => [
      ...prev,
      {
        siblingNo: prev.length + 1,
        name: '',
        age: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveSibling = (index: number) => {
    setSiblings((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((item, idx) => ({ ...item, siblingNo: idx + 1 }));
    });
  };

  const handleSiblingChange = (index: number, field: keyof SiblingRecord, value: any) => {
    setSiblings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const cleanLastName = lastName.trim();
    const cleanFirstName = firstName.trim();
    const cleanLrn = lrn.trim();

    if (!cleanLastName) {
      setError('Last Name (Surname) is required according to the official form.');
      setActiveTab('A');
      return;
    }
    if (!cleanFirstName) {
      setError('First Name is required according to the official form.');
      setActiveTab('A');
      return;
    }
    if (!cleanLrn) {
      setError('12-Digit Learner Reference Number (LRN) is required.');
      setActiveTab('C');
      return;
    }
    if (cleanLrn.length !== 12 || !/^\d{12}$/.test(cleanLrn)) {
      setError('Learner Reference Number (LRN) must be exactly 12 digits.');
      setActiveTab('C');
      return;
    }

    const parsedScore = typeof examScore === 'number' ? examScore : parseFloat(String(examScore)) || 0;
    if (parsedScore < 0 || parsedScore > maxExamScore) {
      setError(`Entrance Exam Score must be between 0 and ${maxExamScore}.`);
      setActiveTab('H_I');
      return;
    }

    setLoading(true);

    try {
      const studentPayload: any = {
        recruitmentListId,
        // Section A
        photoUrl: photoUrl || undefined,
        lastName: cleanLastName,
        surname: cleanLastName,
        firstName: cleanFirstName,
        middleName: middleName.trim(),
        birthdate: birthdate.trim(),
        birthday: birthdate.trim(),
        age: typeof age === 'number' ? age : parseInt(String(age), 10) || 0,
        gender: gender || 'Female',

        // Section B
        sitioStreet: sitioStreet.trim(),
        barangay: barangay.trim(),
        municipality: municipality.trim(),
        province: province.trim(),
        address: address.trim() || [sitioStreet, barangay, municipality, province].filter(Boolean).join(', '),

        // Section C
        elementarySchool: elementarySchool.trim(),
        school: elementarySchool.trim(),
        schoolAddress: schoolAddress.trim(),
        reportCardSy: reportCardSy.trim(),
        reportCard: reportCardSy.trim(),
        lrn: cleanLrn,
        grading: grading.trim(),
        currentGrade: currentGrade.trim() || 'Grade 6',
        oldGraduateRemarks: oldGraduateRemarks.trim(),

        // Section D
        fatherName: fatherName.trim(),
        fatherOccupation: fatherOccupation.trim(),
        motherName: motherName.trim(),
        motherOccupation: motherOccupation.trim(),
        guardianName: guardianName.trim(),
        guardianRelation: guardianRelation.trim(),
        guardianOccupation: guardianOccupation.trim(),

        // Section E
        cellphoneNumber: cellphoneNumber.trim(),
        cellphoneOwner: cellphoneOwner.trim(),
        messengerAccount: messengerAccount.trim(),
        messengerOwner: messengerOwner.trim(),

        // Section F
        birthCertificatePsa: birthCertificatePsa || 'Yes',
        psaFatherNameAge: psaFatherNameAge.trim(),
        fatherReligion: fatherReligion.trim() || 'Roman Catholic',
        psaMotherNameAge: psaMotherNameAge.trim(),
        motherReligion: motherReligion.trim() || 'Roman Catholic',
        birthOrder: typeof birthOrder === 'number' ? birthOrder : parseInt(String(birthOrder), 10) || 1,
        numberOfChildren: typeof numberOfChildren === 'number' ? numberOfChildren : parseInt(String(numberOfChildren), 10) || 1,
        baptizedCatholic: baptizedCatholic || 'Yes',
        denomination: denomination.trim(),
        confirmedCatholic: confirmedCatholic || 'Yes',

        // Section G
        siblings: siblings.filter((s) => s.name?.trim()),
        numSiblings: siblings.filter((s) => s.name?.trim()).length,

        // Section H
        parishPlace: parishPlace.trim(),
        parishPriest: parishPriest.trim(),

        // Section I
        healthStatus: healthStatus.trim() || 'Normal / Fit for schooling',
        examScore: parsedScore,
        remarks: remarks,
        additionalNotes: additionalNotes.trim(),
        studentSignature: studentSignature || 'Signed',
      };

      let saved: StudentRecord;
      if (isEditing && studentToEdit) {
        saved = await updateStudent(studentToEdit.id, studentPayload);
      } else {
        saved = await createStudent(studentPayload);
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save student record. Please review all fields.');
    } finally {
      setLoading(false);
    }
  };

  // If OCR mode selected from choices
  if (mode === 'ocr') {
    return (
      <ScanFormView
        onClose={onClose}
        onSuccess={onSuccess}
        maxExamScore={maxExamScore}
      />
    );
  }

  // Initial Method Selection Screen (Add Student -> Choose OCR Camera vs Manual Entry)
  if (mode === 'selection') {
    return (
      <div
        id="student-entry-selection-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-blue-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] p-6 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 mx-auto mb-3 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <GraduationCap className="w-7 h-7 text-amber-300" />
            </div>
            <h2 className="text-xl font-black tracking-tight">ADMISSION / RECRUITMENT INTAKE</h2>
            <p className="text-xs text-blue-100/90 mt-1 max-w-md mx-auto">
              Official "Recruitment Personal Information" Student Entry System
            </p>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
              Choose your preferred data entry method:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: OCR Camera Scan */}
              <button
                id="btn-choice-ocr-scan"
                onClick={() => setMode('ocr')}
                className="flex flex-col items-center text-center p-5 rounded-2xl border-2 border-blue-500/30 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-600 transition-all group cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="font-black text-sm text-blue-950 flex items-center gap-1">
                  <span>CAMERA / OCR SCAN</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </h3>
                <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">
                  Snap or upload the paper Recruitment form to automatically extract and populate all Sections A to J with Gemini AI.
                </p>
                <span className="mt-3 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              </button>

              {/* Option 2: Manual Data Entry */}
              <button
                id="btn-choice-manual-entry"
                onClick={() => setMode('form')}
                className="flex flex-col items-center text-center p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all group cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md">
                  <Edit3 className="w-7 h-7" />
                </div>
                <h3 className="font-black text-sm text-slate-900">MANUAL DATA ENTRY</h3>
                <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">
                  Directly fill out the digital Recruitment Personal Information form using the official Sections A to J.
                </p>
                <span className="mt-3 px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Standard
                </span>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 py-1 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MANUAL FORM VIEW ---
  return (
    <div
      id="student-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-blue-100 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setMode('selection')}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Back to entry method selection"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full text-[10px] font-bold text-blue-200 border border-white/10">
                <FileText className="w-3 h-3 text-amber-300" />
                <span>OFFICIAL RECRUITMENT PERSONAL INFORMATION FORM</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {isEditing ? `Edit Applicant: ${lastName}, ${firstName}` : 'New Applicant Digital Registration'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setMode('ocr')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-white rounded-xl text-xs font-bold transition-all border border-white/20 shadow-xs"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                <span>Switch to Camera / OCR</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Duplicate Detection Alert Banner */}
        {duplicateWarning && (
          <div
            id="duplicate-warning-banner"
            className={`p-3 sm:p-4 shrink-0 flex items-start gap-3 border-b ${
              duplicateWarning.duplicateStatus === 'EXACT'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                duplicateWarning.duplicateStatus === 'EXACT' ? 'text-red-600' : 'text-amber-600'
              }`}
            />
            <div className="flex-1 text-xs">
              <p className="font-black text-sm">
                {duplicateWarning.duplicateStatus === 'EXACT'
                  ? 'DUPLICATE STUDENT RECORD DETECTED'
                  : 'POSSIBLE MATCH DETECTED IN DATABASE'}
              </p>
              <p className="mt-0.5 font-medium">{duplicateWarning.message}</p>
              <p className="text-[11px] opacity-80 mt-1">
                Existing record: <span className="font-bold">{duplicateWarning.existingRecord.surname}, {duplicateWarning.existingRecord.firstName}</span> (LRN: {duplicateWarning.existingRecord.lrn}) — Elementary: {duplicateWarning.existingRecord.elementarySchool || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 bg-red-100 border-b border-red-200 text-red-900 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Tabs (Sections A-I) */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
          {[
            { id: 'A', label: 'A. Basic Info', icon: User },
            { id: 'B', label: 'B. Residence', icon: Home },
            { id: 'C', label: 'C. Education', icon: GraduationCap },
            { id: 'D', label: 'D. Family', icon: Users },
            { id: 'E', label: 'E. Contact', icon: Phone },
            { id: 'F', label: 'F. Religious & Civil', icon: Church },
            { id: 'G', label: 'G. Siblings', icon: Users },
            { id: 'H_I', label: 'H & I. Parish & Exam', icon: HeartPulse },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ========================================================================= */}
          {/* SECTION A: BASIC PERSONAL INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'A' && (
            <div id="section-a-personal" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <User className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">A. Basic Personal Information</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section A of Official Form</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1x1 ID Photo Upload / Capture */}
                <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center">
                  <div className="w-28 h-28 rounded-xl bg-white border-2 border-slate-300 overflow-hidden relative shadow-inner flex items-center justify-center mb-2">
                    {photoUrl ? (
                      <img src={photoUrl} alt="1x1 ID Photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 p-2">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-[9px] font-bold uppercase">1x1 ID PHOTO</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Upload Photo
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Details Fields */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Last Name / Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-lastName"
                      type="text"
                      required
                      placeholder="e.g. SANTOS"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-firstName"
                      type="text"
                      required
                      placeholder="e.g. MARIA CLARA"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Middle Name
                    </label>
                    <input
                      id="input-middleName"
                      type="text"
                      placeholder="e.g. DELA CRUZ"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Date of Birth (Birthdate)
                    </label>
                    <input
                      id="input-birthdate"
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Age (Years)
                    </label>
                    <input
                      id="input-age"
                      type="number"
                      min={1}
                      max={99}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Calculated automatically"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Sex / Gender
                    </label>
                    <select
                      id="select-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B: RESIDENCE / ADDRESS INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'B' && (
            <div id="section-b-residence" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <Home className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">B. Residence / Address Information</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section B of Official Form</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Sitio / Street / Purok
                  </label>
                  <input
                    id="input-sitioStreet"
                    type="text"
                    placeholder="e.g. Purok 4, Sitio Riverside"
                    value={sitioStreet}
                    onChange={(e) => setSitioStreet(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Barangay
                  </label>
                  <input
                    id="input-barangay"
                    type="text"
                    placeholder="e.g. San Jose"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Municipality / City
                  </label>
                  <input
                    id="input-municipality"
                    type="text"
                    placeholder="e.g. Silang"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Province
                  </label>
                  <input
                    id="input-province"
                    type="text"
                    placeholder="e.g. Cavite"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Complete Address (Auto-assembled / Full Address)
                </label>
                <textarea
                  id="input-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Complete home address..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION C: EDUCATIONAL BACKGROUND */}
          {/* ========================================================================= */}
          {activeTab === 'C' && (
            <div id="section-c-education" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <GraduationCap className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">C. Educational Background</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section C of Official Form</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Elementary School Graduated
                  </label>
                  <input
                    id="input-elementarySchool"
                    type="text"
                    placeholder="e.g. Silang Central Elementary School"
                    value={elementarySchool}
                    onChange={(e) => setElementarySchool(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    School Address
                  </label>
                  <input
                    id="input-schoolAddress"
                    type="text"
                    placeholder="e.g. J.P. Rizal St., Silang, Cavite"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Learner Reference Number (LRN) <span className="text-red-500">* (12 Digits)</span>
                  </label>
                  <input
                    id="input-lrn"
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit LRN (e.g. 109283746123)"
                    value={lrn}
                    onChange={(e) => setLrn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-black text-blue-900 tracking-wider focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <div className="flex justify-between items-center text-[10px] font-bold mt-1">
                    <span className={lrn.length === 12 ? 'text-emerald-600' : 'text-amber-600'}>
                      {lrn.length === 12 ? '✓ 12 Digits verified' : `${lrn.length}/12 Digits`}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Report Card (SY)
                  </label>
                  <input
                    id="input-reportCardSy"
                    type="text"
                    placeholder="e.g. SY 2024-2025"
                    value={reportCardSy}
                    onChange={(e) => setReportCardSy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Grading Period
                  </label>
                  <select
                    id="select-grading"
                    value={grading}
                    onChange={(e) => setGrading(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Final">Final</option>
                    <option value="1st">1st Quarter</option>
                    <option value="2nd">2nd Quarter</option>
                    <option value="3rd">3rd Quarter</option>
                    <option value="4th">4th Quarter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Current Grade
                  </label>
                  <input
                    id="input-currentGrade"
                    type="text"
                    placeholder="Grade 6"
                    value={currentGrade}
                    onChange={(e) => setCurrentGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Old Graduate / Special Remarks (if any)
                  </label>
                  <input
                    id="input-oldGraduateRemarks"
                    type="text"
                    placeholder="e.g. Graduated 2023, transferee, etc."
                    value={oldGraduateRemarks}
                    onChange={(e) => setOldGraduateRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION D: FAMILY BACKGROUND */}
          {/* ========================================================================= */}
          {activeTab === 'D' && (
            <div id="section-d-family" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <Users className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">D. Family Background</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section D of Official Form</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Father's Info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-xs text-blue-900 uppercase">Father's Information (Ama)</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Father's Full Name</label>
                    <input
                      id="input-fatherName"
                      type="text"
                      placeholder="e.g. JUAN SANTOS"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Father's Occupation</label>
                    <input
                      id="input-fatherOccupation"
                      type="text"
                      placeholder="e.g. Farmer / Magsasaka"
                      value={fatherOccupation}
                      onChange={(e) => setFatherOccupation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Mother's Info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-xs text-blue-900 uppercase">Mother's Information (Ina)</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Mother's Maiden Name</label>
                    <input
                      id="input-motherName"
                      type="text"
                      placeholder="e.g. MARIA DELA CRUZ"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Mother's Occupation</label>
                    <input
                      id="input-motherOccupation"
                      type="text"
                      placeholder="e.g. Housewife / Kasambahay"
                      value={motherOccupation}
                      onChange={(e) => setMotherOccupation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Guardian's Info */}
                <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-xs text-slate-800 uppercase">Guardian's Information (Tagapag-alaga, if applicable)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Guardian's Full Name</label>
                      <input
                        id="input-guardianName"
                        type="text"
                        placeholder="e.g. ELENA DELA CRUZ"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Relationship</label>
                      <input
                        id="input-guardianRelation"
                        type="text"
                        placeholder="e.g. Grandmother / Aunt"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Guardian's Occupation</label>
                      <input
                        id="input-guardianOccupation"
                        type="text"
                        placeholder="e.g. Vendor"
                        value={guardianOccupation}
                        onChange={(e) => setGuardianOccupation(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION E: CONTACT INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'E' && (
            <div id="section-e-contact" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <Phone className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">E. Contact Information</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section E of Official Form</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-xs text-blue-900 uppercase">Primary Cellphone / Contact</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Cellphone Number</label>
                    <input
                      id="input-cellphoneNumber"
                      type="text"
                      placeholder="e.g. 0917-123-4567"
                      value={cellphoneNumber}
                      onChange={(e) => setCellphoneNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Cellphone Owner</label>
                    <input
                      id="input-cellphoneOwner"
                      type="text"
                      placeholder="e.g. Mother / Nanay"
                      value={cellphoneOwner}
                      onChange={(e) => setCellphoneOwner(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-xs text-blue-900 uppercase">Social Media / Messenger</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Messenger Account Name</label>
                    <input
                      id="input-messengerAccount"
                      type="text"
                      placeholder="e.g. Maria Santos FB"
                      value={messengerAccount}
                      onChange={(e) => setMessengerAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Messenger Owner</label>
                    <input
                      id="input-messengerOwner"
                      type="text"
                      placeholder="e.g. Father / Applicant"
                      value={messengerOwner}
                      onChange={(e) => setMessengerOwner(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION F: RELIGIOUS & CIVIL INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'F' && (
            <div id="section-f-religious" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <Church className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">F. Religious & Civil Information</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase">Section F of Official Form</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    PSA Birth Certificate Submitted?
                  </label>
                  <select
                    id="select-birthCertificatePsa"
                    value={birthCertificatePsa}
                    onChange={(e) => setBirthCertificatePsa(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    PSA Father's Name & Age
                  </label>
                  <input
                    id="input-psaFatherNameAge"
                    type="text"
                    placeholder="e.g. Juan Santos (45yo)"
                    value={psaFatherNameAge}
                    onChange={(e) => setPsaFatherNameAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Father's Religion
                  </label>
                  <input
                    id="input-fatherReligion"
                    type="text"
                    placeholder="e.g. Roman Catholic"
                    value={fatherReligion}
                    onChange={(e) => setFatherReligion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    PSA Mother's Name & Age
                  </label>
                  <input
                    id="input-psaMotherNameAge"
                    type="text"
                    placeholder="e.g. Maria Dela Cruz (42yo)"
                    value={psaMotherNameAge}
                    onChange={(e) => setPsaMotherNameAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Mother's Religion
                  </label>
                  <input
                    id="input-motherReligion"
                    type="text"
                    placeholder="e.g. Roman Catholic"
                    value={motherReligion}
                    onChange={(e) => setMotherReligion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Birth Order (Pang-ilan sa Magkakapatid)
                  </label>
                  <input
                    id="input-birthOrder"
                    type="number"
                    min={1}
                    max={20}
                    value={birthOrder}
                    onChange={(e) => setBirthOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Total Number of Children in Family
                  </label>
                  <input
                    id="input-numberOfChildren"
                    type="number"
                    min={1}
                    max={20}
                    value={numberOfChildren}
                    onChange={(e) => setNumberOfChildren(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Baptized Catholic?
                  </label>
                  <select
                    id="select-baptizedCatholic"
                    value={baptizedCatholic}
                    onChange={(e) => setBaptizedCatholic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {baptizedCatholic === 'No' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      If Not Catholic, Religious Denomination
                    </label>
                    <input
                      id="input-denomination"
                      type="text"
                      placeholder="e.g. Born Again, INC, etc."
                      value={denomination}
                      onChange={(e) => setDenomination(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Confirmed Catholic?
                  </label>
                  <select
                    id="select-confirmedCatholic"
                    value={confirmedCatholic}
                    onChange={(e) => setConfirmedCatholic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION G: SIBLINGS INFORMATION */}
          {/* ========================================================================= */}
          {activeTab === 'G' && (
            <div id="section-g-siblings" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 text-[#1E3A8A]">
                  <Users className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">G. Siblings Information</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">
                    Total: {siblings.filter((s) => s.name?.trim()).length} siblings
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSibling}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sibling Row</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">No.</th>
                      <th className="p-3">Full Name of Sibling</th>
                      <th className="p-3 w-24">Age</th>
                      <th className="p-3">Remarks / Schooling / Work</th>
                      <th className="p-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {siblings.map((sib, index) => (
                      <tr key={index} className="hover:bg-slate-50/80">
                        <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. Juan Santos Jr."
                            value={sib.name}
                            onChange={(e) => handleSiblingChange(index, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. 14"
                            value={sib.age}
                            onChange={(e) => handleSiblingChange(index, 'age', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-center focus:ring-1 focus:ring-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. Grade 8 / Working / Out of school"
                            value={sib.remarks}
                            onChange={(e) => handleSiblingChange(index, 'remarks', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSibling(index)}
                            disabled={siblings.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION H & I: PARISH & HEALTH ASSESSMENT & EXAM */}
          {/* ========================================================================= */}
          {activeTab === 'H_I' && (
            <div id="section-h-i-parish-exam" className="space-y-6 animate-fade-in">
              {/* Section H: Parish Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2 text-[#1E3A8A]">
                    <Church className="w-5 h-5" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">H. Parish Information</h3>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Section H of Official Form</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Parish / Place
                    </label>
                    <input
                      id="input-parishPlace"
                      type="text"
                      placeholder="e.g. Our Lady of Candelaria Parish, Silang"
                      value={parishPlace}
                      onChange={(e) => setParishPlace(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Parish Priest Name
                    </label>
                    <input
                      id="input-parishPriest"
                      type="text"
                      placeholder="e.g. Rev. Fr. Jose Santos"
                      value={parishPriest}
                      onChange={(e) => setParishPriest(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section I: Health Assessment & Examination Score */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2 text-[#1E3A8A]">
                    <HeartPulse className="w-5 h-5" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">I. Health Assessment & Entrance Exam</h3>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Section I of Official Form</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Health Conditions */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Health & Medical Conditions / Assessment
                    </label>
                    <input
                      id="input-healthStatus"
                      type="text"
                      placeholder="Normal, Fit for schooling, Asthma, Allergies, etc."
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Normal / Fit for schooling', 'Asthma', 'Allergies', 'Heart Condition', 'Visual Impairment', 'Underweight'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHealthStatus(preset)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exam Score */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Entrance Exam Score <span className="text-gray-500 font-normal">(Max: {maxExamScore})</span>
                    </label>
                    <input
                      id="input-examScore"
                      type="number"
                      step="0.1"
                      min={0}
                      max={maxExamScore}
                      value={examScore}
                      onChange={(e) => setExamScore(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-blue-950 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* Remarks / Admission Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Admission Status (Remarks) <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="select-remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value as AdmissionStatus)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm font-black focus:ring-2 focus:outline-none ${
                        remarks === 'A - PASS'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-emerald-600'
                          : 'border-amber-500 bg-amber-50 text-amber-900 focus:ring-amber-600'
                      }`}
                    >
                      <option value="A - PASS">A - PASS (Qualified for Admission)</option>
                      <option value="B - PENDING">B - PENDING (Under Evaluation)</option>
                    </select>
                  </div>

                  {/* Student Signature status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Student Signature
                    </label>
                    <select
                      id="select-studentSignature"
                      value={studentSignature}
                      onChange={(e) => setStudentSignature(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Signed">Signed by Applicant</option>
                      <option value="Unsigned">Unsigned / Blank</option>
                    </select>
                  </div>

                  {/* Additional Notes */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Additional Notes / Recruiter & Interviewer Observations
                    </label>
                    <textarea
                      id="input-additionalNotes"
                      rows={2}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Notes on socioeconomic status, family background, or interviewer comments..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer Bar */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">
                Official SMS Recruitment Format • All fields stored in JSON database
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="btn-save-applicant-form"
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8] hover:from-[#172554] hover:to-[#1E3A8A] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-amber-300" />
                    <span>{isEditing ? 'Update Student Record' : 'Save New Applicant'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
