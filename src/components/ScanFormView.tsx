import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  User,
  Users,
  GraduationCap,
  HeartPulse,
  Save,
  SwitchCamera,
  FileSearch,
  Check,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  Phone,
  Church,
  Home,
  Image as ImageIcon,
} from 'lucide-react';
import { StudentRecord, AdmissionStatus, OCRScanResult, SiblingRecord } from '../types';
import { performOCRScan, createStudent, updateStudent, checkStudentDuplicate } from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: (student: StudentRecord) => void;
  maxExamScore: number;
  initialImageBase64?: string;
  recruitmentListId?: string;
}

export const ScanFormView: React.FC<Props> = ({
  onClose,
  onSuccess,
  maxExamScore,
  initialImageBase64,
  recruitmentListId,
}) => {
  // Stage: 'capture' | 'scanning' | 'review'
  const [stage, setStage] = useState<'capture' | 'scanning' | 'review'>(
    initialImageBase64 ? 'scanning' : 'capture'
  );

  // Capture & Camera State
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageBase64 || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // OCR Processing State
  const [scanProgressStage, setScanProgressStage] = useState<number>(1);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);

  // Active section tab in Review mode
  const [activeReviewTab, setActiveReviewTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H_I'>('A');

  // --- SECTION A: Basic Personal Information ---
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [birthdate, setBirthdate] = useState<string>('');
  const [age, setAge] = useState<number | string>('');
  const [gender, setGender] = useState<'Female' | 'Male' | string>('Female');

  // --- SECTION B: Residence / Address Information ---
  const [sitioStreet, setSitioStreet] = useState<string>('');
  const [barangay, setBarangay] = useState<string>('');
  const [municipality, setMunicipality] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // --- SECTION C: Educational Background ---
  const [elementarySchool, setElementarySchool] = useState<string>('');
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [reportCardSy, setReportCardSy] = useState<string>('SY 2024-2025');
  const [lrn, setLrn] = useState<string>('');
  const [grading, setGrading] = useState<string>('Final');
  const [currentGrade, setCurrentGrade] = useState<string>('Grade 6');
  const [oldGraduateRemarks, setOldGraduateRemarks] = useState<string>('');

  // --- SECTION D: Family Background ---
  const [fatherName, setFatherName] = useState<string>('');
  const [fatherOccupation, setFatherOccupation] = useState<string>('');
  const [motherName, setMotherName] = useState<string>('');
  const [motherOccupation, setMotherOccupation] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianRelation, setGuardianRelation] = useState<string>('');
  const [guardianOccupation, setGuardianOccupation] = useState<string>('');

  // --- SECTION E: Contact Information ---
  const [cellphoneNumber, setCellphoneNumber] = useState<string>('');
  const [cellphoneOwner, setCellphoneOwner] = useState<string>('');
  const [messengerAccount, setMessengerAccount] = useState<string>('');
  const [messengerOwner, setMessengerOwner] = useState<string>('');

  // --- SECTION F: Religious & Civil Information ---
  const [birthCertificatePsa, setBirthCertificatePsa] = useState<'Yes' | 'No' | string>('Yes');
  const [psaFatherNameAge, setPsaFatherNameAge] = useState<string>('');
  const [fatherReligion, setFatherReligion] = useState<string>('Roman Catholic');
  const [psaMotherNameAge, setPsaMotherNameAge] = useState<string>('');
  const [motherReligion, setMotherReligion] = useState<string>('Roman Catholic');
  const [birthOrder, setBirthOrder] = useState<number | string>(1);
  const [numberOfChildren, setNumberOfChildren] = useState<number | string>(1);
  const [baptizedCatholic, setBaptizedCatholic] = useState<'Yes' | 'No' | string>('Yes');
  const [denomination, setDenomination] = useState<string>('');
  const [confirmedCatholic, setConfirmedCatholic] = useState<'Yes' | 'No' | string>('Yes');

  // --- SECTION G: Siblings Information ---
  const [siblings, setSiblings] = useState<SiblingRecord[]>([
    { siblingNo: 1, name: '', age: '', remarks: '' },
  ]);

  // --- SECTION H: Parish Information ---
  const [parishPlace, setParishPlace] = useState<string>('');
  const [parishPriest, setParishPriest] = useState<string>('');

  // --- SECTION I: Health Assessment & Exam ---
  const [healthStatus, setHealthStatus] = useState<string>('Normal / Fit for schooling');
  const [examScore, setExamScore] = useState<number | string>(0);
  const [remarks, setRemarks] = useState<AdmissionStatus>('B - PENDING');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [studentSignature, setStudentSignature] = useState<string>('Signed');

  // Review UI State
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicateStatus: 'EXACT' | 'POSSIBLE';
    existingRecord: StudentRecord;
    matchReason?: string;
    message: string;
  } | null>(null);

  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [showCorrectionsDrawer, setShowCorrectionsDrawer] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Callback ref to attach stream immediately when <video> mounts into DOM
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch((playErr) => {
        console.warn('[Camera] Autoplay promise notice:', playErr);
      });
    }
  }, []);

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (stage !== 'capture') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [stage]);

  // Clean up camera stream on unmount
  useEffect(() => {
    if (!initialImageBase64) {
      startCamera('environment');
    }
    return () => {
      stopCamera();
    };
  }, []);

  // Synchronize stream to video if camera active state updates
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Camera Management
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Live camera stream is not supported in this browser environment. Please use "Upload Document File" or native device capture.'
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setCameraFacingMode(facing);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Camera] Initialization error:', err);
      setIsCameraActive(false);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('Permission') || errMsg.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Please allow camera permission in your browser settings and try again.');
      } else if (err.name === 'NotFoundError' || errMsg.includes('NotFound')) {
        setCameraError('No camera found on this device. Please use "Select File" to upload the document.');
      } else if (err.name === 'NotReadableError' || errMsg.includes('in use')) {
        setCameraError('Camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Camera initialization failed: ${errMsg || 'Restricted'}. You can still upload or snap with native camera.`);
      }
    }
  };

  const handleToggleFacingMode = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  // Capture current frame from live video
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setImagePreview(dataUrl);
    runOcrScan(dataUrl);
  };

  // File Upload Handlers
  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }
    setSelectedFile(file);
    stopCamera();
    setOcrError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const rawDataUrl = reader.result;
        // Optimize resolution if oversized to ensure fast, reliable upload without losing OCR readability
        const img = new Image();
        img.onload = () => {
          const maxDim = 2048;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
              setImagePreview(optimizedDataUrl);
              runOcrScan(optimizedDataUrl);
              return;
            }
          }

          setImagePreview(rawDataUrl);
          runOcrScan(rawDataUrl);
        };
        img.onerror = () => {
          setImagePreview(rawDataUrl);
          runOcrScan(rawDataUrl);
        };
        img.src = rawDataUrl;
      }
    };
    reader.onerror = () => {
      setOcrError('Failed to read the selected file. Please try selecting the image again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Execute Gemini OCR Scan
  const runOcrScan = async (base64Data: string) => {
    setStage('scanning');
    setOcrError(null);
    setScanProgressStage(1);

    // Progress simulation steps
    const t1 = setTimeout(() => setScanProgressStage(2), 700);
    const t2 = setTimeout(() => setScanProgressStage(3), 1500);

    try {
      const result = await performOCRScan(base64Data);
      clearTimeout(t1);
      clearTimeout(t2);

      setScanResult(result);
      const data = result.extractedData || {};

      // Map Extracted Data into Official Form State
      setLastName(data.lastName || data.surname || '');
      setFirstName(data.firstName || '');
      setMiddleName(data.middleName || '');

      const bDate = data.birthdate || data.birthday || '';
      setBirthdate(bDate);
      if (data.age) {
        setAge(data.age);
      } else if (bDate && bDate.includes('-')) {
        const birth = new Date(bDate);
        if (!isNaN(birth.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birth.getFullYear();
          if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            calculatedAge--;
          }
          setAge(calculatedAge > 0 ? calculatedAge : 12);
        }
      }

      setGender(data.gender || 'Female');

      // Section B
      setSitioStreet(data.sitioStreet || '');
      setBarangay(data.barangay || '');
      setMunicipality(data.municipality || '');
      setProvince(data.province || '');
      setAddress(data.address || [data.sitioStreet, data.barangay, data.municipality, data.province].filter(Boolean).join(', '));

      // Section C
      setElementarySchool(data.elementarySchool || data.school || '');
      setSchoolAddress(data.schoolAddress || '');
      setReportCardSy(data.reportCardSy || 'SY 2024-2025');
      setLrn(data.lrn ? String(data.lrn).replace(/\D/g, '').slice(0, 12) : '');
      setGrading(data.grading || 'Final');
      setCurrentGrade(data.currentGrade || 'Grade 6');
      setOldGraduateRemarks(data.oldGraduateRemarks || '');

      // Section D
      setFatherName(data.fatherName || '');
      setFatherOccupation(data.fatherOccupation || '');
      setMotherName(data.motherName || '');
      setMotherOccupation(data.motherOccupation || '');
      setGuardianName(data.guardianName || '');
      setGuardianRelation(data.guardianRelation || '');
      setGuardianOccupation(data.guardianOccupation || '');

      // Section E
      setCellphoneNumber(data.cellphoneNumber || '');
      setCellphoneOwner(data.cellphoneOwner || '');
      setMessengerAccount(data.messengerAccount || '');
      setMessengerOwner(data.messengerOwner || '');

      // Section F
      setBirthCertificatePsa(data.birthCertificatePsa || 'Yes');
      setPsaFatherNameAge(data.psaFatherNameAge || '');
      setFatherReligion(data.fatherReligion || 'Roman Catholic');
      setPsaMotherNameAge(data.psaMotherNameAge || '');
      setMotherReligion(data.motherReligion || 'Roman Catholic');
      setBirthOrder(data.birthOrder || 1);
      setNumberOfChildren(data.numberOfChildren || (data.numSiblings ? Number(data.numSiblings) + 1 : 1));
      setBaptizedCatholic(data.baptizedCatholic || 'Yes');
      setDenomination(data.denomination || '');
      setConfirmedCatholic(data.confirmedCatholic || 'Yes');

      // Section G
      if (Array.isArray(data.siblings) && data.siblings.length > 0) {
        setSiblings(data.siblings);
      } else if (data.numSiblings && Number(data.numSiblings) > 0) {
        const count = Math.min(Number(data.numSiblings), 10);
        const rows: SiblingRecord[] = [];
        for (let i = 1; i <= count; i++) {
          rows.push({ siblingNo: i, name: '', age: '', remarks: '' });
        }
        setSiblings(rows);
      } else {
        setSiblings([{ siblingNo: 1, name: '', age: '', remarks: '' }]);
      }

      // Section H
      setParishPlace(data.parishPlace || '');
      setParishPriest(data.parishPriest || '');

      // Section I
      setHealthStatus(data.healthStatus || 'Normal / Fit for schooling');
      setExamScore(data.examScore !== undefined && data.examScore !== null ? data.examScore : 0);
      setRemarks(data.remarks === 'A - PASS' ? 'A - PASS' : 'B - PENDING');
      setAdditionalNotes(data.additionalNotes || '');
      setStudentSignature(data.studentSignature || 'Signed');

      setStage('review');
    } catch (err: any) {
      console.error('OCR Processing Error:', err);
      setOcrError(err.message || 'Gemini document understanding failed. Please try snapping again with clearer lighting.');
      setStage('capture');
    }
  };

  // Real-time duplicate checking in Review Mode
  useEffect(() => {
    if (stage !== 'review') return;

    const timer = setTimeout(async () => {
      const cleanLrn = lrn.trim();
      const cleanSn = lastName.trim();
      const cleanFn = firstName.trim();
      const activeListId =
        recruitmentListId ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('sms_active_recruitment_list_id') || undefined : undefined);

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
            undefined,
            activeListId
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
          // Silent
        }
      } else {
        setDuplicateWarning(null);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [stage, lrn, lastName, firstName, birthdate, address, recruitmentListId]);

  // Sibling Helpers
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

  // Save Applicant Record
  const handleSaveReviewedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const cleanLastName = lastName.trim();
    const cleanFirstName = firstName.trim();
    const cleanLrn = lrn.trim();

    if (!cleanLastName) {
      setSaveError('Last Name (Surname) is required.');
      setActiveReviewTab('A');
      return;
    }
    if (!cleanFirstName) {
      setSaveError('First Name is required.');
      setActiveReviewTab('A');
      return;
    }
    if (!cleanLrn) {
      setSaveError('12-Digit Learner Reference Number (LRN) is required.');
      setActiveReviewTab('C');
      return;
    }
    if (cleanLrn.length !== 12 || !/^\d{12}$/.test(cleanLrn)) {
      setSaveError('Learner Reference Number (LRN) must be exactly 12 digits.');
      setActiveReviewTab('C');
      return;
    }

    const parsedScore = typeof examScore === 'number' ? examScore : parseFloat(String(examScore)) || 0;
    if (parsedScore < 0 || parsedScore > maxExamScore) {
      setSaveError(`Entrance Exam Score must be between 0 and ${maxExamScore}.`);
      setActiveReviewTab('H_I');
      return;
    }

    setSaving(true);

    try {
      const activeListId =
        recruitmentListId ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('sms_active_recruitment_list_id') || undefined : undefined);

      const studentPayload: any = {
        recruitmentListId: activeListId,
        photoUrl: photoUrl || undefined,
        // Section A
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

      const saved = await createStudent(studentPayload);
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save scanned student record.');
    } finally {
      setSaving(false);
    }
  };

  // --- STAGE 2: SCANNING IN PROGRESS ---
  if (stage === 'scanning') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in text-white">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-32 h-44 mx-auto bg-slate-900 rounded-2xl border-2 border-blue-400/60 overflow-hidden shadow-2xl flex items-center justify-center">
            {imagePreview && (
              <img src={imagePreview} alt="Document Scan" className="w-full h-full object-cover opacity-60 filter blur-[1px]" />
            )}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse" />
            <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight flex items-center justify-center gap-2">
              <span>Reading document...</span>
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-xs text-blue-200">
              {scanProgressStage === 1 && 'Reading document and detecting orientation...'}
              {scanProgressStage === 2 && 'Extracting applicant details, LRN, and family data...'}
              {scanProgressStage === 3 && 'Applying smart corrections and preparing validation mapping...'}
            </p>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-500"
              style={{
                width: scanProgressStage === 1 ? '35%' : scanProgressStage === 2 ? '70%' : '95%',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 1: CAPTURE & UPLOAD ---
  if (stage === 'capture') {
    return (
      <div
        id="scan-form-capture-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-blue-100 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] p-4 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <Camera className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold text-blue-200">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>GEMINI DOCUMENT RECOGNITION</span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                  Scan Official Recruitment Personal Information Form
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* OCR Error Message Banner */}
          {ocrError && (
            <div className="p-3 sm:p-4 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-start gap-3 shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-sm text-red-950">
                  {ocrError.includes('configured')
                    ? 'OCR Service Configuration Required'
                    : ocrError.includes('temporarily') || ocrError.includes('busy')
                    ? 'OCR Service Temporarily Unavailable'
                    : ocrError.includes('connect') || ocrError.includes('connection')
                    ? 'Connection Error'
                    : ocrError.includes('valid JPG') || ocrError.includes('format')
                    ? 'Invalid Image Format'
                    : 'Document Scanning Issue'}
                </p>
                <p className="text-xs text-red-700 mt-0.5 font-medium">{ocrError}</p>
              </div>
              <button
                type="button"
                onClick={() => setOcrError(null)}
                className="p-1 hover:bg-red-200 rounded text-red-700 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Capture Stage Body */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
            {/* Live Camera Viewfinder or Fallback Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                isDragOver
                  ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-100'
                  : 'border-slate-800 bg-slate-950 text-white'
              } min-h-[340px] flex flex-col items-center justify-center`}
            >
              {isCameraActive ? (
                <>
                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      v.play().catch(() => {});
                    }}
                    className="w-full h-full min-h-[340px] max-h-[440px] object-cover bg-black block"
                  />
                  {/* Document Alignment Frame */}
                  <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <div className="flex justify-between items-center text-[11px] font-bold text-cyan-300 bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-md self-center">
                      <span>ALIGN RECRUITMENT PAPER FORM INSIDE RECTANGLE</span>
                    </div>
                    <div className="text-center text-[10px] text-cyan-200/80">
                      Ensure good lighting and all 4 corners of the form are visible
                    </div>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="w-5 h-5 text-amber-300" />
                    </button>

                    <button
                      type="button"
                      id="btn-capture-snapshot"
                      onClick={handleCaptureSnapshot}
                      className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-full shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <Camera className="w-5 h-5" />
                      <span>CAPTURE & EXTRACT</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-100">Upload or Drag Paper Form Image</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports high-resolution photos, phone camera snaps, or scanned PDF images (JPEG, PNG, WebP)
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>SELECT FILE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 shadow-md transition-all cursor-pointer uppercase tracking-wider flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>NATIVE CAMERA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startCamera('environment')}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-black rounded-xl border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Live Video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden Input Elements */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
              }}
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
              }}
            />

            {/* Bottom Tips */}
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Pro Tip: </span>
                All official Sections A to J (Personal, Residence, Education, Family, Contact, Civil & Religion, Siblings, Parish & Exam) will be populated with auto-duplicate detection.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 3: REVIEW & EDIT EXTRACTED INFORMATION ---
  return (
    <div
      id="scan-form-review-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full border border-blue-100 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] p-4 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStage('capture');
                startCamera('environment');
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Rescan another document"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full text-[10px] font-bold text-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>OCR EXTRACTION COMPLETE — REVIEW & VALIDATE</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                Official Recruitment Form: {lastName || 'NEW APPLICANT'}, {firstName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scanResult?.corrections && scanResult.corrections.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCorrectionsDrawer(!showCorrectionsDrawer)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{scanResult.corrections.length} Smart Auto-Corrections</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <div
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
                  ? 'DUPLICATE RECORD WARNING'
                  : 'POSSIBLE MATCH DETECTED IN DATABASE'}
              </p>
              <p className="mt-0.5 font-medium">{duplicateWarning.message}</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                Existing record: <span className="font-bold">{duplicateWarning.existingRecord.surname}, {duplicateWarning.existingRecord.firstName}</span> (LRN: {duplicateWarning.existingRecord.lrn})
              </p>
            </div>
          </div>
        )}

        {/* Save Error Banner */}
        {saveError && (
          <div className="p-3 bg-red-100 border-b border-red-200 text-red-900 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Split Container: Left Image Preview, Right Tabbed Form */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Scanned Document Image Viewer (4 cols) */}
          <div className="hidden lg:flex lg:col-span-4 bg-slate-900 flex-col border-r border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-cyan-400" />
                <span>Original Document</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(2.5, z + 0.2))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white ml-1"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-slate-950/60">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Scanned Document"
                  className="max-w-full rounded-lg shadow-xl transition-transform duration-200"
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="text-slate-500 text-xs font-bold">No image preview</div>
              )}
            </div>
          </div>

          {/* Right Column: Editable Sections A through J Form (8 cols) */}
          <div className="col-span-1 lg:col-span-8 flex flex-col overflow-hidden bg-white">
            {/* OCR Scan Result Showcase Banner */}
            <div className="bg-gradient-to-br from-blue-50/90 via-slate-50 to-indigo-50/70 border-b border-blue-200/80 p-3 sm:p-4 shrink-0 shadow-2xs">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[11px] font-black tracking-wide uppercase shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Scan Complete</span>
                  </span>
                  <h3 className="font-black text-sm text-blue-950 uppercase tracking-tight">
                    OCR Scan Result
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 hidden sm:inline-flex items-center gap-1 bg-blue-100/60 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Auto-filled into recruitment form</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Full Name</span>
                  <span className="font-extrabold text-gray-900 truncate block" title={`${lastName}, ${firstName} ${middleName}`}>
                    {lastName || firstName ? `${lastName || '—'}, ${firstName || '—'} ${middleName || ''}`.trim() : '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Date of Birth / Age</span>
                  <span className="font-extrabold text-gray-900 truncate block">
                    {birthdate || '—'} {age ? `(${age} yrs)` : ''}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Gender</span>
                  <span className="font-extrabold text-gray-900 truncate block">{gender || '—'}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">12-Digit LRN</span>
                  <span className="font-extrabold text-blue-700 font-mono tracking-tight truncate block">{lrn || '—'}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Elementary School</span>
                  <span className="font-extrabold text-gray-900 truncate block" title={elementarySchool}>
                    {elementarySchool || '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Contact Number</span>
                  <span className="font-extrabold text-gray-900 truncate block">
                    {cellphoneNumber || '—'}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                <div className="flex items-center gap-1.5 text-blue-900 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>All student recruitment form fields have been automatically populated below. Review and edit any field before saving.</span>
                </div>
                {scanResult?.corrections && scanResult.corrections.length > 0 && (
                  <span className="text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                    {scanResult.corrections.length} smart auto-corrections applied
                  </span>
                )}
              </div>
            </div>

            {/* Section Tab Bar */}
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
                const isActive = activeReviewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveReviewTab(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

            {/* Review Form Content */}
            <form onSubmit={handleSaveReviewedRecord} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* SECTION A */}
              {activeReviewTab === 'A' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <User className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">A. Basic Personal Information</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section A</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Last Name / Surname <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
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
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date of Birth (Birthdate)</label>
                      <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Age (Years)</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sex / Gender</label>
                      <select
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
              )}

              {/* SECTION B */}
              {activeReviewTab === 'B' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <Home className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">B. Residence / Address Information</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section B</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sitio / Street / Purok</label>
                      <input
                        type="text"
                        value={sitioStreet}
                        onChange={(e) => setSitioStreet(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Barangay</label>
                      <input
                        type="text"
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Municipality / City</label>
                      <input
                        type="text"
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Province</label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Complete Home Address</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* SECTION C */}
              {activeReviewTab === 'C' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <GraduationCap className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">C. Educational Background</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section C</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Elementary School Graduated</label>
                      <input
                        type="text"
                        value={elementarySchool}
                        onChange={(e) => setElementarySchool(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">School Address</label>
                      <input
                        type="text"
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
                        type="text"
                        required
                        maxLength={12}
                        value={lrn}
                        onChange={(e) => setLrn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-black text-blue-900 tracking-wider focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                      <span className={`text-[10px] font-bold ${lrn.length === 12 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {lrn.length === 12 ? '✓ 12 Digits verified' : `${lrn.length}/12 Digits`}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Report Card (SY)</label>
                      <input
                        type="text"
                        value={reportCardSy}
                        onChange={(e) => setReportCardSy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grading Period</label>
                      <select
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
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Grade</label>
                      <input
                        type="text"
                        value={currentGrade}
                        onChange={(e) => setCurrentGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Old Graduate / Remarks</label>
                      <input
                        type="text"
                        value={oldGraduateRemarks}
                        onChange={(e) => setOldGraduateRemarks(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION D */}
              {activeReviewTab === 'D' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <Users className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">D. Family Background</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section D</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-xs text-blue-900 uppercase">Father's Info (Ama)</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Full Name</label>
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Occupation</label>
                        <input
                          type="text"
                          value={fatherOccupation}
                          onChange={(e) => setFatherOccupation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-xs text-blue-900 uppercase">Mother's Info (Ina)</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Maiden Name</label>
                        <input
                          type="text"
                          value={motherName}
                          onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-gray-900 uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Occupation</label>
                        <input
                          type="text"
                          value={motherOccupation}
                          onChange={(e) => setMotherOccupation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-xs text-slate-800 uppercase">Guardian's Info (Tagapag-alaga)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Full Name</label>
                          <input
                            type="text"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value.toUpperCase())}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Relationship</label>
                          <input
                            type="text"
                            value={guardianRelation}
                            onChange={(e) => setGuardianRelation(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Occupation</label>
                          <input
                            type="text"
                            value={guardianOccupation}
                            onChange={(e) => setGuardianOccupation(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION E */}
              {activeReviewTab === 'E' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <Phone className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">E. Contact Information</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section E</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-xs text-blue-900 uppercase">Cellphone Contact</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Cellphone Number</label>
                        <input
                          type="text"
                          value={cellphoneNumber}
                          onChange={(e) => setCellphoneNumber(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Cellphone Owner</label>
                        <input
                          type="text"
                          value={cellphoneOwner}
                          onChange={(e) => setCellphoneOwner(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-xs text-blue-900 uppercase">Social Media / Messenger</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Messenger Account Name</label>
                        <input
                          type="text"
                          value={messengerAccount}
                          onChange={(e) => setMessengerAccount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Messenger Owner</label>
                        <input
                          type="text"
                          value={messengerOwner}
                          onChange={(e) => setMessengerOwner(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION F */}
              {activeReviewTab === 'F' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <Church className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">F. Religious & Civil Information</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Section F</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">PSA Birth Certificate?</label>
                      <select
                        value={birthCertificatePsa}
                        onChange={(e) => setBirthCertificatePsa(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">PSA Father's Name & Age</label>
                      <input
                        type="text"
                        value={psaFatherNameAge}
                        onChange={(e) => setPsaFatherNameAge(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Father's Religion</label>
                      <input
                        type="text"
                        value={fatherReligion}
                        onChange={(e) => setFatherReligion(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">PSA Mother's Name & Age</label>
                      <input
                        type="text"
                        value={psaMotherNameAge}
                        onChange={(e) => setPsaMotherNameAge(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mother's Religion</label>
                      <input
                        type="text"
                        value={motherReligion}
                        onChange={(e) => setMotherReligion(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Birth Order (Pang-ilan)</label>
                      <input
                        type="number"
                        value={birthOrder}
                        onChange={(e) => setBirthOrder(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Number of Children</label>
                      <input
                        type="number"
                        value={numberOfChildren}
                        onChange={(e) => setNumberOfChildren(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Baptized Catholic?</label>
                      <select
                        value={baptizedCatholic}
                        onChange={(e) => setBaptizedCatholic(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirmed Catholic?</label>
                      <select
                        value={confirmedCatholic}
                        onChange={(e) => setConfirmedCatholic(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION G */}
              {activeReviewTab === 'G' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <Users className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">G. Siblings Information</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSibling}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">No.</th>
                          <th className="p-2">Name of Sibling</th>
                          <th className="p-2 w-20">Age</th>
                          <th className="p-2">Remarks / Schooling</th>
                          <th className="p-2 w-12 text-center">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {siblings.map((sib, index) => (
                          <tr key={index}>
                            <td className="p-2 text-center font-bold text-slate-500">{index + 1}</td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                placeholder="Sibling name"
                                value={sib.name}
                                onChange={(e) => handleSiblingChange(index, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                placeholder="Age"
                                value={sib.age}
                                onChange={(e) => handleSiblingChange(index, 'age', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                placeholder="Grade / Work"
                                value={sib.remarks}
                                onChange={(e) => handleSiblingChange(index, 'remarks', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSibling(index)}
                                disabled={siblings.length <= 1}
                                className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION H & I */}
              {activeReviewTab === 'H_I' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <HeartPulse className="w-5 h-5" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">H & I. Parish & Entrance Exam</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Sections H & I</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Parish / Place</label>
                      <input
                        type="text"
                        value={parishPlace}
                        onChange={(e) => setParishPlace(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Parish Priest Name</label>
                      <input
                        type="text"
                        value={parishPriest}
                        onChange={(e) => setParishPriest(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Health Status / Conditions</label>
                      <input
                        type="text"
                        value={healthStatus}
                        onChange={(e) => setHealthStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Entrance Exam Score <span className="text-gray-500 font-normal">(Max: {maxExamScore})</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={maxExamScore}
                        value={examScore}
                        onChange={(e) => setExamScore(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-blue-950 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Admission Remarks <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value as AdmissionStatus)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-black focus:ring-2 focus:outline-none ${
                          remarks === 'A - PASS'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-emerald-600'
                            : 'border-amber-500 bg-amber-50 text-amber-900 focus:ring-amber-600'
                        }`}
                      >
                        <option value="A - PASS">A - PASS (Qualified for Admission)</option>
                        <option value="B - PENDING">B - PENDING (Under Evaluation)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Additional Notes / Remarks</label>
                      <textarea
                        rows={2}
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    Official Single Source of Truth • Form Sections A-J
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStage('capture');
                      startCamera('environment');
                    }}
                    disabled={saving}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Rescan
                  </button>

                  <button
                    type="submit"
                    id="btn-save-scanned-record"
                    disabled={saving}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8] hover:from-[#172554] hover:to-[#1E3A8A] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-amber-300" />
                        <span>Save Applicant Record</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
