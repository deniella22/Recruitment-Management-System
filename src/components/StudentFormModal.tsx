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
  Video,
  SwitchCamera,
  Check,
} from 'lucide-react';
import { StudentRecord, AdmissionStatus } from '../types';
import { createStudent, updateStudent, performOCRScan, checkStudentDuplicate } from '../lib/api';
import { ScanFormView } from './ScanFormView';

interface Props {
  studentToEdit?: StudentRecord | null;
  initialMode?: 'selection' | 'ocr' | 'form';
  maxExamScore: number;
  onClose: () => void;
  onSuccess: (student: StudentRecord) => void;
}

export const StudentFormModal: React.FC<Props> = ({
  studentToEdit,
  initialMode = 'selection',
  maxExamScore,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!studentToEdit;

  // View state: 'selection' | 'ocr' | 'form'
  const [mode, setMode] = useState<'selection' | 'ocr' | 'form'>(
    isEditing ? 'form' : initialMode
  );

  // OCR state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessBanner, setOcrSuccessBanner] = useState<string | null>(null);

  // Live Camera Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form States
  const [lrn, setLrn] = useState(studentToEdit?.lrn || '');
  const [surname, setSurname] = useState(studentToEdit?.surname || '');
  const [middleName, setMiddleName] = useState(studentToEdit?.middleName || '');
  const [firstName, setFirstName] = useState(studentToEdit?.firstName || '');
  const [birthday, setBirthday] = useState(studentToEdit?.birthday || '');
  const [address, setAddress] = useState(studentToEdit?.address || '');

  const [fatherName, setFatherName] = useState(studentToEdit?.fatherName || '');
  const [motherName, setMotherName] = useState(studentToEdit?.motherName || '');
  const [guardianName, setGuardianName] = useState(studentToEdit?.guardianName || '');
  const [numSiblings, setNumSiblings] = useState<number | string>(
    studentToEdit?.numSiblings ?? 0
  );
  const [fatherOccupation, setFatherOccupation] = useState(studentToEdit?.fatherOccupation || '');
  const [motherOccupation, setMotherOccupation] = useState(studentToEdit?.motherOccupation || '');
  const [guardianOccupation, setGuardianOccupation] = useState(
    studentToEdit?.guardianOccupation || ''
  );

  const [examScore, setExamScore] = useState<number | string>(studentToEdit?.examScore ?? 0);
  const [elementarySchool, setElementarySchool] = useState(
    studentToEdit?.elementarySchool || ''
  );

  const [remarks, setRemarks] = useState<AdmissionStatus>(
    studentToEdit?.remarks || 'B - PENDING'
  );
  const [healthStatus, setHealthStatus] = useState(studentToEdit?.healthStatus || '');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'educational' | 'health'>('personal');
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicateStatus: 'EXACT' | 'POSSIBLE';
    existingRecord: StudentRecord;
    matchReason?: string;
    message: string;
  } | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      stopCameraStream();
    };
  }, [stopCameraStream]);

  if (mode === 'ocr') {
    return (
      <ScanFormView
        onClose={onClose}
        onSuccess={onSuccess}
        maxExamScore={maxExamScore}
      />
    );
  }

  // Stop camera when leaving OCR mode
  useEffect(() => {
    if (mode !== 'ocr') {
      stopCameraStream();
    }
  }, [mode, stopCameraStream]);

  const startCameraStream = async (facing: 'environment' | 'user' = 'environment') => {
    setCameraError(null);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera video feed is not supported in this browser context. You can use "UPLOAD DOCUMENT FILE" or native camera capture below.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        // Fall back to basic video constraint if ideal constraints fail
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCameraFacingMode(facing);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsCameraActive(false);

      const errName = err?.name || '';
      const errMsg = err?.message || String(err);

      if (
        errName === 'NotAllowedError' ||
        errMsg.includes('Permission dismissed') ||
        errMsg.includes('Permission denied') ||
        errMsg.includes('NotAllowedError')
      ) {
        setCameraError(
          'Camera permission was dismissed or restricted by browser settings. Please click "UPLOAD DOCUMENT FILE" or "NATIVE CAMERA CAPTURE" to snap or select your document image directly!'
        );
      } else if (errName === 'NotFoundError' || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('No camera hardware found. Please select or upload a document file from your device.');
      } else if (errName === 'NotReadableError' || errMsg.includes('TrackStartError')) {
        setCameraError('Camera is currently in use by another program. Please close other camera apps and try again.');
      } else {
        setCameraError(
          `Unable to access live camera (${errMsg || 'Permission or device restricted'}). Please use "UPLOAD DOCUMENT FILE" or native photo capture.`
        );
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextFacing);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setImagePreview(dataUrl);
    setSelectedFile(null);
    stopCameraStream();
  };

  const handleFileChange = (file: File) => {
    setOcrError(null);
    setSelectedFile(file);
    stopCameraStream();

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOCR = async () => {
    if (!selectedFile && !imagePreview) {
      setOcrError('Please upload or snap a student information document photo first.');
      return;
    }

    try {
      setOcrScanning(true);
      setOcrError(null);

      let base64Data = imagePreview || '';
      let mimeType = selectedFile?.type || 'image/jpeg';

      if (!base64Data && selectedFile) {
        const readerRes = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(selectedFile);
        });
        base64Data = readerRes;
      }

      const result = await performOCRScan(base64Data, mimeType);
      const extracted = result.extractedData || {};

      // Populate Form Fields
      if (extracted.lrn) setLrn(extracted.lrn);
      if (extracted.surname) setSurname(extracted.surname);
      if (extracted.middleName) setMiddleName(extracted.middleName);
      if (extracted.firstName) setFirstName(extracted.firstName);
      if (extracted.birthday) setBirthday(extracted.birthday);
      if (extracted.address) setAddress(extracted.address);

      if (extracted.fatherName) setFatherName(extracted.fatherName);
      if (extracted.motherName) setMotherName(extracted.motherName);
      if (extracted.guardianName) setGuardianName(extracted.guardianName);
      if (extracted.numSiblings !== undefined && extracted.numSiblings !== null) {
        setNumSiblings(extracted.numSiblings);
      }
      if (extracted.fatherOccupation) setFatherOccupation(extracted.fatherOccupation);
      if (extracted.motherOccupation) setMotherOccupation(extracted.motherOccupation);
      if (extracted.guardianOccupation) setGuardianOccupation(extracted.guardianOccupation);

      if (extracted.examScore !== undefined && extracted.examScore !== null) {
        setExamScore(extracted.examScore);
      }
      if (extracted.elementarySchool) setElementarySchool(extracted.elementarySchool);

      if (extracted.healthStatus) setHealthStatus(extracted.healthStatus);
      if (
        extracted.remarks &&
        (extracted.remarks === 'A - PASS' || extracted.remarks === 'B - PENDING')
      ) {
        setRemarks(extracted.remarks as AdmissionStatus);
      }

      setOcrSuccessBanner(
        'OCR Data Extraction Complete! Sister/Staff, please review all extracted fields below, verify LRN, correct any errors, and click [ SAVE STUDENT RECORD ].'
      );
      setMode('form');
    } catch (err: any) {
      setOcrError(err.message || 'Failed to scan document with OCR. You may switch to manual encoding.');
    } finally {
      setOcrScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!lrn.trim()) {
      setError("Please enter the student's LRN.");
      setActiveTab('personal');
      return;
    }
    if (!surname.trim()) {
      setError("Please enter the student's Surname.");
      setActiveTab('personal');
      return;
    }
    if (!firstName.trim()) {
      setError("Please enter the student's First Name.");
      setActiveTab('personal');
      return;
    }
    if (!birthday) {
      setError('Please enter a valid birthday.');
      setActiveTab('personal');
      return;
    }

    const scoreNum = Number(examScore);
    if (isNaN(scoreNum) || scoreNum < 0) {
      setError('Exam score must be a valid non-negative number.');
      setActiveTab('educational');
      return;
    }
    if (scoreNum > maxExamScore) {
      setError(`Exam score cannot exceed maximum configured score of ${maxExamScore}.`);
      setActiveTab('educational');
      return;
    }

    const siblingsNum = Number(numSiblings);
    if (isNaN(siblingsNum) || siblingsNum < 0) {
      setError('Number of siblings must be a valid number.');
      setActiveTab('family');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        lrn: lrn.trim(),
        surname: surname.trim(),
        middleName: middleName.trim(),
        firstName: firstName.trim(),
        birthday,
        address: address.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        guardianName: guardianName.trim(),
        numSiblings: Math.floor(siblingsNum),
        fatherOccupation: fatherOccupation.trim(),
        motherOccupation: motherOccupation.trim(),
        guardianOccupation: guardianOccupation.trim(),
        examScore: scoreNum,
        elementarySchool: elementarySchool.trim(),
        remarks,
        healthStatus: healthStatus.trim(),
      };

      // Check duplicates on new records
      if (!isEditing && !duplicateWarning) {
        const dupCheck = await checkStudentDuplicate(payload);
        if (dupCheck.duplicateStatus !== 'NONE' && dupCheck.existingRecord) {
          setDuplicateWarning({
            duplicateStatus: dupCheck.duplicateStatus,
            existingRecord: dupCheck.existingRecord,
            matchReason: dupCheck.matchReason,
            message: dupCheck.message,
          });
          setLoading(false);
          return;
        }
      }

      let result: StudentRecord;
      if (isEditing && studentToEdit) {
        result = await updateStudent(studentToEdit.id, payload);
      } else {
        result = await createStudent(payload);
      }

      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!duplicateWarning?.existingRecord) return;
    try {
      setLoading(true);
      const scoreNum = Number(examScore) || 0;
      const siblingsNum = Number(numSiblings) || 0;
      const payload = {
        lrn: lrn.trim(),
        surname: surname.trim(),
        middleName: middleName.trim(),
        firstName: firstName.trim(),
        birthday,
        address: address.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        guardianName: guardianName.trim(),
        numSiblings: Math.floor(siblingsNum),
        fatherOccupation: fatherOccupation.trim(),
        motherOccupation: motherOccupation.trim(),
        guardianOccupation: guardianOccupation.trim(),
        examScore: scoreNum,
        elementarySchool: elementarySchool.trim(),
        remarks,
        healthStatus: healthStatus.trim(),
      };

      const result = await updateStudent(duplicateWarning.existingRecord.id, payload);
      setDuplicateWarning(null);
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to update existing student record.');
      setDuplicateWarning(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewExisting = () => {
    if (!duplicateWarning?.existingRecord) return;
    const existing = duplicateWarning.existingRecord;
    setDuplicateWarning(null);
    onSuccess(existing);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-3xl w-full flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-blue-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-blue-200 shadow-2xs shrink-0">
              <img
                src="/school_logo.svg"
                alt="Sisters of Mary School-Girlstown Logo"
                className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/school_logo.png'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1E3A8A]">
                  Sisters of Mary School-Girlstown, Inc.
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                {isEditing
                  ? `Edit Student: ${studentToEdit.surname}, ${studentToEdit.firstName}`
                  : 'ADD NEW STUDENT RECORD'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODE 1: ENTRY METHOD SELECTION VIEW */}
        {mode === 'selection' && (
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="text-center max-w-md mx-auto space-y-1">
              <h3 className="text-base font-black text-gray-900">Choose how you want to add the student:</h3>
              <p className="text-xs text-gray-500 font-medium">
                Select your preferred entry method. Both options populate the official recruitment database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto pt-2">
              {/* Option A: Manual Encoding */}
              <div className="bg-white rounded-2xl border-2 border-blue-100 hover:border-[#1E3A8A] hover:shadow-md transition-all p-6 flex flex-col justify-between group cursor-pointer text-center">
                <div>
                  <div className="w-14 h-14 bg-blue-50 group-hover:bg-[#1E3A8A] group-hover:text-white text-[#1E3A8A] rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all border border-blue-100">
                    <Edit3 className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">
                    ✍ MANUAL ENCODING
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
                    Enter student personal, family, examination, and health information manually using standard form fields.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOcrSuccessBanner(null);
                    setMode('form');
                  }}
                  className="mt-6 w-full py-2.5 bg-slate-100 group-hover:bg-[#1E3A8A] group-hover:text-white text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  [ START MANUAL ENCODING ]
                </button>
              </div>

              {/* Option B: OCR Scanning */}
              <div className="bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-600 hover:shadow-md transition-all p-6 flex flex-col justify-between group cursor-pointer text-center">
                <div>
                  <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-700 group-hover:text-white text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all border border-emerald-100">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">
                    📷 OCR SCANNING & CAMERA
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
                    Scan or capture a photo directly via device camera or upload a student form. OCR automatically fills the form.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('ocr')}
                  className="mt-6 w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>[ 📷 SCAN / IMPORT ]</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 text-center font-semibold max-w-xl mx-auto">
              <strong>Notice for Sisters & Staff:</strong> OCR scanning is an assistive data-entry tool. Extracted data will always be presented for your review and correction before saving.
            </div>
          </div>
        )}

        {/* MODE 2: OCR SCAN / LIVE CAMERA VIEW */}
        {mode === 'ocr' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setMode('selection');
                }}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Entry Options</span>
              </button>

              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-[11px] rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Gemini AI OCR Assistive Scanner
              </span>
            </div>

            {ocrError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {cameraError && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{cameraError}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 pl-6">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Device Camera App</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-[11px] rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Device</span>
                  </button>
                </div>
              </div>
            )}

            {/* LIVE CAMERA VIEWFINDER */}
            {isCameraActive ? (
              <div className="bg-black rounded-2xl overflow-hidden relative border-2 border-emerald-500 shadow-xl max-w-xl mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-80 object-cover"
                />

                {/* Framing Overlay Guide */}
                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="bg-black/60 text-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-xs">
                    Position Student Form Within Frame
                  </div>
                </div>

                {/* Camera Live Controls */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/30"
                    title="Switch Camera (Front / Back)"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-full shadow-lg transition-all flex items-center gap-2 cursor-pointer border-2 border-white"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>[ 📷 SNAP PHOTO ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="p-2.5 bg-red-600/80 hover:bg-red-700 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/30"
                    title="Close Camera"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              /* PHOTO PREVIEW BOX */
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-blue-200 p-6 text-center space-y-4">
                <div className="max-h-64 mx-auto overflow-hidden rounded-xl border border-gray-200 shadow-md flex justify-center bg-black/5">
                  <img
                    src={imagePreview}
                    alt="Captured Student Form"
                    className="max-h-64 object-contain rounded-xl"
                  />
                </div>
                <p className="text-xs font-bold text-gray-800">
                  Document Ready: <span className="text-[#1E3A8A]">{selectedFile?.name || 'Captured Live Camera Photo'}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => startCameraStream('environment')}
                    className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Retake Photo with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-blue-800" />
                    <span>Upload Different File</span>
                  </button>
                </div>
              </div>
            ) : (
              /* DUAL CAMERA / UPLOAD ACTION SELECTOR */
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-blue-200 p-8 text-center space-y-5">
                <div className="w-16 h-16 bg-blue-100 text-[#1E3A8A] rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-2xs">
                  <FileSearch className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-black text-gray-900">
                    Scan or Upload Student Information Document
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Capture urgent paper documents live with your device camera or upload image files.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => startCameraStream('environment')}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600/50"
                  >
                    <Video className="w-4 h-4 text-emerald-200" />
                    <span>📷 CAPTURE WITH CAMERA LIVE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-5 py-3 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-blue-200" />
                    <span>UPLOAD DOCUMENT FILE</span>
                  </button>
                </div>

                {/* Hidden input for general file selection */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {/* Hidden input for native device camera capture fallback */}
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setOcrSuccessBanner(null);
                  setMode('form');
                }}
                className="text-xs font-bold text-gray-600 hover:underline cursor-pointer"
              >
                Skip scanning and open blank form manually
              </button>

              <button
                type="button"
                disabled={!imagePreview || ocrScanning}
                onClick={handleProcessOCR}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {ocrScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>EXTRACTING DATA WITH OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>PROCESS & FILL FORM WITH OCR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: STUDENT INFORMATION FORM */}
        {mode === 'form' && (
          <>
            {/* Form Tabs */}
            <div className="flex items-center justify-between border-b border-blue-100 bg-white px-5 pt-2 shrink-0 overflow-x-auto text-xs font-semibold">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'personal'
                      ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>1. Personal Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('family')}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'family'
                      ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>2. Family Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('educational')}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'educational'
                      ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>3. Educational Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('health')}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'health'
                      ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <HeartPulse className="w-4 h-4" />
                  <span>4. Health & Status</span>
                </button>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setMode('ocr')}
                  className="mb-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Scan Document with OCR</span>
                </button>
              )}
            </div>

            {/* OCR Success Review Banner */}
            {ocrSuccessBanner && (
              <div className="mx-5 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{ocrSuccessBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOcrSuccessBanner(null)}
                  className="text-emerald-800 hover:text-emerald-950 text-xs font-bold cursor-pointer shrink-0 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Form Validation Error Banner */}
            {error && (
              <div className="mx-5 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeTab === 'personal' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-xs text-blue-900 font-semibold">
                    Enter primary student details. LRN must be a unique 12-digit Learner Reference Number.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        LRN (Learner Reference Number) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lrn}
                        onChange={(e) => setLrn(e.target.value)}
                        placeholder="e.g. 109283746123"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                      <p className="text-[11px] text-gray-500 mt-1 font-medium">
                        Must be a unique 12-digit Learner Reference Number.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Surname (SN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Santos"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        First Name (FN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Maria Clara"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Middle Name (MN)
                      </label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="e.g. Dela Cruz"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Birthday <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Complete Address
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No., Barangay, Municipality/City, Province"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FAMILY INFORMATION */}
              {activeTab === 'family' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-semibold">
                    Enter household and parents' background details.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Full name of father"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Father's Occupation
                      </label>
                      <input
                        type="text"
                        value={fatherOccupation}
                        onChange={(e) => setFatherOccupation(e.target.value)}
                        placeholder="e.g. Farmer / Driver"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Full name of mother"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Mother's Occupation
                      </label>
                      <input
                        type="text"
                        value={motherOccupation}
                        onChange={(e) => setMotherOccupation(e.target.value)}
                        placeholder="e.g. Housewife / Vendor"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Guardian's Name <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Full name of guardian if applicable"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Guardian's Occupation <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={guardianOccupation}
                        onChange={(e) => setGuardianOccupation(e.target.value)}
                        placeholder="Guardian occupation if applicable"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Number of Siblings
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={numSiblings}
                        onChange={(e) => setNumSiblings(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white max-w-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EDUCATIONAL INFORMATION */}
              {activeTab === 'educational' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-semibold">
                    Record entrance examination score and elementary origin.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Score in Entrance / Admission Exam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={maxExamScore}
                        value={examScore}
                        onChange={(e) => setExamScore(e.target.value)}
                        placeholder={`0 to ${maxExamScore}`}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white text-[#1E3A8A]"
                      />
                      <p className="text-[11px] text-gray-500 mt-1 font-medium">
                        Maximum score configured: <strong className="text-gray-800">{maxExamScore}</strong>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Name of Elementary School
                      </label>
                      <input
                        type="text"
                        value={elementarySchool}
                        onChange={(e) => setElementarySchool(e.target.value)}
                        placeholder="e.g. San Jose Elementary School"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HEALTH & ADMISSION STATUS */}
              {activeTab === 'health' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold">
                    Select admission evaluation status (PASS or PENDING) and health notes.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                      Admission Status / Remarks <span className="text-red-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        onClick={() => setRemarks('A - PASS')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                          remarks === 'A - PASS'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 hover:border-gray-300 bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="remarks_radio"
                          checked={remarks === 'A - PASS'}
                          onChange={() => setRemarks('A - PASS')}
                          className="accent-emerald-600"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>A - PASS</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                            Applicant passed interview & exam requirements
                          </p>
                        </div>
                      </label>

                      <label
                        onClick={() => setRemarks('B - PENDING')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                          remarks === 'B - PENDING'
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-gray-200 hover:border-gray-300 bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="remarks_radio"
                          checked={remarks === 'B - PENDING'}
                          onChange={() => setRemarks('B - PENDING')}
                          className="accent-amber-600"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-black text-xs text-amber-800">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>B - PENDING</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                            Under review or awaiting complete documents
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Health Status / Medical Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value)}
                      placeholder="Note any medical conditions, allergies, or health status details..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-gray-100 bg-slate-50 rounded-b-2xl flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                {activeTab !== 'personal' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'family') setActiveTab('personal');
                      else if (activeTab === 'educational') setActiveTab('family');
                      else if (activeTab === 'health') setActiveTab('educational');
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    Previous Step
                  </button>
                )}
                {activeTab !== 'health' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'personal') setActiveTab('family');
                      else if (activeTab === 'family') setActiveTab('educational');
                      else if (activeTab === 'educational') setActiveTab('health');
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-[#1E3A8A] bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                  >
                    Next Step
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditing ? 'UPDATE STUDENT RECORD' : 'SAVE STUDENT RECORD'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Duplicate Candidate Detection Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-300 shrink-0 text-amber-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-black text-[10px] uppercase tracking-wider rounded-md">
                    {duplicateWarning.duplicateStatus === 'EXACT' ? 'Exact Duplicate Match' : 'Possible Duplicate Match'}
                  </span>
                </div>
                <h3 className="font-black text-base text-gray-900 mt-1">
                  Duplicate Student Record Detected
                </h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed font-medium">
                  {duplicateWarning.message}
                </p>
              </div>
            </div>

            {/* Existing Student Card */}
            <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Existing Record in Database</span>
                  <h4 className="font-black text-sm text-[#1E3A8A]">
                    {duplicateWarning.existingRecord.surname}, {duplicateWarning.existingRecord.firstName} {duplicateWarning.existingRecord.middleName}
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  duplicateWarning.existingRecord.remarks === 'A - PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {duplicateWarning.existingRecord.remarks}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-gray-500 font-bold">LRN:</span>{' '}
                  <span className="font-mono font-bold text-gray-900">{duplicateWarning.existingRecord.lrn}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold">Birthday:</span>{' '}
                  <span className="font-bold text-gray-900">{duplicateWarning.existingRecord.birthday}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 font-bold">Elementary School:</span>{' '}
                  <span className="font-bold text-gray-900">{duplicateWarning.existingRecord.elementarySchool || 'None specified'}</span>
                </div>
                <div className="col-span-2 text-[10px] text-gray-500 font-medium">
                  Encoded by {duplicateWarning.existingRecord.createdBy} on {new Date(duplicateWarning.existingRecord.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Review & Edit Details
              </button>
              <button
                type="button"
                onClick={handleViewExisting}
                className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>View Existing Record</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleUpdateExisting}
                className="w-full sm:w-auto px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Updating...' : 'Update Existing Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
