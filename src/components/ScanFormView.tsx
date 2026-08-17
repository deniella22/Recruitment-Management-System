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
  Maximize2,
  Minimize2,
  RotateCw,
  ShieldCheck,
  User,
  Users,
  GraduationCap,
  HeartPulse,
  Save,
  SwitchCamera,
  HelpCircle,
  FileSearch,
  Check,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { StudentRecord, AdmissionStatus, OCRScanResult, ConfidenceLevel } from '../types';
import { performOCRScan, createStudent, updateStudent } from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: (student: StudentRecord) => void;
  maxExamScore: number;
  initialImageBase64?: string;
}

export const ScanFormView: React.FC<Props> = ({
  onClose,
  onSuccess,
  maxExamScore,
  initialImageBase64,
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
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // OCR Processing State
  const [scanProgressStage, setScanProgressStage] = useState<number>(1);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);

  // Extracted & Editable Fields
  const [lrn, setLrn] = useState<string>('');
  const [surname, setSurname] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [fatherName, setFatherName] = useState<string>('');
  const [fatherOccupation, setFatherOccupation] = useState<string>('');
  const [motherName, setMotherName] = useState<string>('');
  const [motherOccupation, setMotherOccupation] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianOccupation, setGuardianOccupation] = useState<string>('');
  const [numSiblings, setNumSiblings] = useState<number | string>(0);

  const [examScore, setExamScore] = useState<number | string>(0);
  const [elementarySchool, setElementarySchool] = useState<string>('');
  const [remarks, setRemarks] = useState<AdmissionStatus>('B - PENDING');
  const [healthStatus, setHealthStatus] = useState<string>('');

  // Review UI State
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [activeReviewTab, setActiveReviewTab] = useState<'personal' | 'family' | 'educational' | 'health'>('personal');
  const [highlightField, setHighlightField] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste listener (Ctrl+V)
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
      // Auto-start live camera on mount
      startCamera('environment');
    }
    return () => {
      stopCamera();
    };
  }, []);

  // Re-connect stream to video element whenever isCameraActive changes or video element mounts
  const attachStreamToVideo = useCallback((videoEl: HTMLVideoElement | null) => {
    if (videoEl && streamRef.current) {
      if (videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
      }
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.autoplay = true;
      videoEl.play().catch((err) => {
        console.warn('Video auto-play warning:', err);
      });
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera access is not supported by your browser. Please use "Upload Document File" or native camera capture.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
          audio: false,
        });
      } catch (err) {
        // Fall back to basic video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
      }

      // Verify active video track
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
        throw new Error('No live video track available from camera device.');
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setCameraFacingMode(facing);

      // Attach stream to video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play call required gesture or had warning:', playErr);
        }
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsCameraActive(false);

      const errName = err?.name || '';
      const errMsg = err?.message || String(err);

      if (
        errName === 'NotAllowedError' ||
        errMsg.includes('Permission dismissed') ||
        errMsg.includes('Permission denied')
      ) {
        setCameraError('Camera permission was not granted or dismissed. You can snap a photo with your device camera app or upload a document file.');
      } else if (errName === 'NotFoundError') {
        setCameraError('No camera found on this device. Please select or upload a document photo from your device storage.');
      } else if (errName === 'NotReadableError') {
        setCameraError('Camera is currently being used by another application. Please close other camera tabs and try again.');
      } else {
        setCameraError(`Camera note: ${errMsg || 'Connection unavailable'}. Please use "Upload Document File" or choose a photo.`);
      }
    }
  };

  const toggleCameraFacing = () => {
    const next = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(next);
  };

  const capturePhoto = () => {
    if (!videoRef.current) {
      setCameraError('Camera is not ready for capture. Please wait a moment or restart camera.');
      return;
    }
    const video = videoRef.current;

    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to create image canvas. Please try again.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setImagePreview(dataUrl);
    setSelectedFile(null);
    stopCamera();

    // Trigger OCR automatically after capture
    runOCR(dataUrl);
  };

  const handleFileSelected = (file: File) => {
    setCameraError(null);
    setOcrError(null);
    setSelectedFile(file);
    stopCamera();

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      runOCR(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Load a realistic sample "Personal Data Form" for instant testing
  const loadSampleForm = () => {
    stopCamera();
    // Create an SVG canvas data URL representing a real Sisters of Mary School Personal Data Form with handwritten entries
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper
    ctx.fillStyle = '#FCFAF2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Header
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SISTERS OF MARY SCHOOL - GIRLSTOWN, INC.', canvas.width / 2, 85);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('STUDENT RECRUITMENT & ADMISSION - PERSONAL DATA FORM', canvas.width / 2, 125);
    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Biga II, Silang, Cavite | School Year 2025-2026', canvas.width / 2, 155);

    // Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 175);
    ctx.lineTo(canvas.width - 50, 175);
    ctx.stroke();

    // Section 1: Personal Information
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('I. PERSONAL INFORMATION', 60, 215);

    // LRN Header & 12 boxes
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('LEARNER REFERENCE NUMBER (LRN):', 60, 255);

    const lrnDigits = ['1', '0', '9', '2', '8', '3', '7', '4', '6', '1', '2', '3'];
    for (let i = 0; i < 12; i++) {
      const x = 390 + i * 40;
      const y = 232;
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 34, 34);
      // Handwritten digit
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 20px cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lrnDigits[i], x + 17, y + 25);
    }

    ctx.textAlign = 'left';

    // Surname, First Name, Middle Name
    const drawField = (label: string, value: string, x: number, y: number, w: number) => {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(label, x, y);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 25);
      ctx.lineTo(x + w, y + 25);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px cursive, sans-serif';
      ctx.fillText(value, x + 5, y + 20);
    };

    drawField('Surname (SN):', 'DELA CRUZ', 60, 310, 320);
    drawField('First Name (FN):', 'MARIA CRISTINA', 420, 310, 420);
    drawField('Middle Name (MN):', 'SANTOS', 880, 310, 260);

    drawField('Date of Birth (Birthday):', '2012-05-14 (May 14, 2012)', 60, 370, 360);
    drawField('Age:', '12', 460, 370, 120);
    drawField('Sex / Gender:', 'Female', 620, 370, 180);
    drawField('Contact / Mobile No.:', '0917-892-3412', 840, 370, 300);

    drawField('Complete Home Address:', 'Block 14 Lot 22, Brgy. San Jose, Dasmariñas City, Cavite', 60, 430, 1080);

    // Section 2: Family Background
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('II. FAMILY BACKGROUND', 60, 500);

    drawField("Father's Name (Tatay):", 'ROBERTO DELA CRUZ', 60, 545, 520);
    drawField("Father's Occupation:", 'TRICYCLE DRIVER', 620, 545, 520);

    drawField("Mother's Name (Nanay):", 'TERESITA SANTOS DELA CRUZ', 60, 610, 520);
    drawField("Mother's Occupation:", 'HOUSEWIFE / SEWER', 620, 610, 520);

    drawField("Guardian's Name (if applicable):", 'ELENA SANTOS', 60, 675, 520);
    drawField("Guardian's Occupation:", 'STORE VENDOR', 620, 675, 520);

    drawField('Number of Siblings (Bilang ng Kapatid):', '4', 60, 740, 340);

    // Section 3: Educational Background
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('III. EDUCATIONAL BACKGROUND', 60, 815);

    drawField('Elementary School Graduated:', 'DASMARIÑAS INTEGRATED ELEMENTARY SCHOOL', 60, 860, 700);
    drawField('General Average (GWA):', '89.5%', 800, 860, 340);

    // Section 4: Examination & Recruitment Evaluation
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('IV. ENTRANCE EXAM & ADMISSION STATUS', 60, 935);

    drawField('Entrance Exam Score:', '88', 60, 980, 240);
    drawField('Exam Date:', '2025-02-15', 340, 980, 260);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Admission Remarks / Result:', 640, 980);
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('[X] A - PASS (QUALIFIED FOR ADMISSION)', 640, 1010);

    // Section 5: Health & Medical
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('V. HEALTH & MEDICAL RECORD', 60, 1075);

    drawField('Health Status / Medical History:', 'NORMAL / NO KNOWN ALLERGIES / FIT FOR BOARDING SCHOOL', 60, 1120, 1080);

    // Stamp / Signature
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Assessed by: Sr. Maria Theresa, SM', 60, 1200);
    ctx.fillText('Date Processed: 2025-02-16', 700, 1200);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setImagePreview(dataUrl);
    setSelectedFile(null);
    runOCR(dataUrl);
  };

  const runOCR = async (base64Img: string, mime: string = 'image/jpeg') => {
    setStage('scanning');
    setOcrError(null);
    setScanProgressStage(1);

    // Simulate smooth scanning pipeline steps while waiting for Gemini 3.7
    const timer1 = setTimeout(() => setScanProgressStage(2), 700);
    const timer2 = setTimeout(() => setScanProgressStage(3), 1500);
    const timer3 = setTimeout(() => setScanProgressStage(4), 2200);

    try {
      const result = await performOCRScan(base64Img, mime);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setScanResult(result);
      const data = result.extractedData || {};

      // Map Extracted Data into State
      if (data.lrn) setLrn(data.lrn.replace(/\D/g, '').slice(0, 12));
      if (data.surname) setSurname(data.surname.toUpperCase());
      if (data.firstName) setFirstName(data.firstName.toUpperCase());
      if (data.middleName) setMiddleName(data.middleName.toUpperCase());
      if (data.birthday) setBirthday(data.birthday);
      if (data.address) setAddress(data.address);

      if (data.fatherName) setFatherName(data.fatherName.toUpperCase());
      if (data.fatherOccupation) setFatherOccupation(data.fatherOccupation);
      if (data.motherName) setMotherName(data.motherName.toUpperCase());
      if (data.motherOccupation) setMotherOccupation(data.motherOccupation);
      if (data.guardianName) setGuardianName(data.guardianName.toUpperCase());
      if (data.guardianOccupation) setGuardianOccupation(data.guardianOccupation);
      if (data.numSiblings !== undefined && data.numSiblings !== null) {
        setNumSiblings(data.numSiblings);
      }

      if (data.examScore !== undefined && data.examScore !== null) {
        setExamScore(data.examScore);
      }
      if (data.elementarySchool) setElementarySchool(data.elementarySchool.toUpperCase());
      if (data.remarks && (data.remarks === 'A - PASS' || data.remarks === 'B - PENDING')) {
        setRemarks(data.remarks as AdmissionStatus);
      } else {
        setRemarks('B - PENDING');
      }
      if (data.healthStatus) setHealthStatus(data.healthStatus);

      setStage('review');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setOcrError(err?.message || 'Failed to scan document with OCR. You can try retaking the photo or upload another file.');
      setStage('capture');
    }
  };

  const handleSaveToDatabase = async () => {
    setSaveError(null);

    // Validation
    if (!lrn.trim()) {
      setSaveError("Please enter or verify the student's 12-digit LRN.");
      setActiveReviewTab('personal');
      return;
    }
    if (!surname.trim()) {
      setSaveError("Please enter the student's Surname (SN).");
      setActiveReviewTab('personal');
      return;
    }
    if (!firstName.trim()) {
      setSaveError("Please enter the student's First Name (FN).");
      setActiveReviewTab('personal');
      return;
    }
    if (!birthday) {
      setSaveError('Please enter a valid Date of Birth (Birthday).');
      setActiveReviewTab('personal');
      return;
    }

    const scoreNum = Number(examScore);
    if (isNaN(scoreNum) || scoreNum < 0) {
      setSaveError('Exam score must be a non-negative number.');
      setActiveReviewTab('educational');
      return;
    }
    if (scoreNum > maxExamScore) {
      setSaveError(`Exam score cannot exceed configured maximum score of ${maxExamScore}.`);
      setActiveReviewTab('educational');
      return;
    }

    const sibNum = Math.max(0, Math.floor(Number(numSiblings) || 0));

    try {
      setSaving(true);
      const studentPayload = {
        lrn: lrn.trim(),
        surname: surname.trim(),
        middleName: middleName.trim(),
        firstName: firstName.trim(),
        birthday,
        address: address.trim(),
        fatherName: fatherName.trim(),
        fatherOccupation: fatherOccupation.trim(),
        motherName: motherName.trim(),
        motherOccupation: motherOccupation.trim(),
        guardianName: guardianName.trim(),
        guardianOccupation: guardianOccupation.trim(),
        numSiblings: sibNum,
        examScore: scoreNum,
        elementarySchool: elementarySchool.trim(),
        remarks,
        healthStatus: healthStatus.trim(),
      };

      const created = await createStudent(studentPayload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save student record to database.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for confidence badge
  const getConfidenceBadge = (fieldKey: string) => {
    const conf = scanResult?.fieldConfidence?.[fieldKey] || 'MEDIUM';
    const isUncertain = scanResult?.uncertainFields?.includes(fieldKey);

    if (isUncertain || conf === 'LOW') {
      return (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-black rounded-full border border-amber-300 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
          Review Needed
        </span>
      );
    }
    if (conf === 'HIGH') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300 flex items-center gap-1">
          <Check className="w-2.5 h-2.5 text-emerald-600" />
          OCR Verified
        </span>
      );
    }
    if (conf === 'NOT_DETECTED') {
      return (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-300">
          Not Found
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-blue-50 text-[#1E3A8A] text-[10px] font-bold rounded-full border border-blue-200">
        Extracted
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 max-w-6xl w-full flex flex-col max-h-[96vh] my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-blue-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1E3A8A]">
                  Sisters of Mary School-Girlstown, Inc.
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded-full border border-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                  Gemini 3.7 AI Multimodal OCR
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                PERSONAL DATA FORM SCANNER & AUTO-FILL
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="Close Scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STAGE 1: CAPTURE & UPLOAD VIEW */}
        {stage === 'capture' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {ocrError && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs font-medium space-y-3 animate-in fade-in shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-sm">
                      {ocrError.includes('busy') || ocrError.includes('503')
                        ? 'The scanning service is temporarily busy. Please try again.'
                        : ocrError}
                    </p>
                    <p className="text-amber-800 text-xs mt-0.5">
                      Your captured document image has been preserved. You can retry OCR immediately without taking another photo.
                    </p>
                  </div>
                  <button
                    onClick={() => setOcrError(null)}
                    className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {imagePreview && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => runOCR(imagePreview)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>[ 🔄 TRY AGAIN ]</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setOcrError(null);
                        startCamera('environment');
                      }}
                      className="px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Retake Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Different File</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {cameraError && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{cameraError}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 pl-7">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera Permission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Device Camera App</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Device</span>
                  </button>
                </div>
              </div>
            )}

            {/* LIVE CAMERA VIEWFINDER */}
            {isCameraActive ? (
              <div className="bg-slate-950 rounded-2xl overflow-hidden relative border-2 border-emerald-500 shadow-2xl max-w-3xl mx-auto flex items-center justify-center min-h-[360px] sm:min-h-[460px]">
                {/* Layer 1: Real HTML <video> Camera Element */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current) {
                      if (el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                      }
                      el.muted = true;
                      el.playsInline = true;
                      el.autoplay = true;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full min-h-[360px] sm:min-h-[460px] max-h-[560px] object-contain bg-slate-950 block z-0"
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                />

                {/* Layer 2 & 3 & 4: Scanning Frame Overlay & Guides */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6">
                  {/* Top Header inside camera */}
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="bg-slate-900/85 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-black backdrop-blur-md tracking-wider uppercase border border-emerald-500/50 shadow-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>ALIGN PERSONAL DATA FORM INSIDE FRAME</span>
                    </div>
                    <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  </div>

                  {/* Center subtle scan line */}
                  <div className="flex-1 flex items-center justify-center my-4">
                    <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-pulse" />
                  </div>

                  {/* Bottom Footer inside camera */}
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="text-[11px] text-white/90 font-bold bg-slate-900/85 px-3.5 py-1 rounded-full border border-slate-700/60 backdrop-blur-md">
                      Hold steady for clear handwriting recognition
                    </div>
                    <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  </div>
                </div>

                {/* Layer 5: Camera Controls & Buttons */}
                <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-3 sm:gap-4 px-4 z-20">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-3.5 bg-slate-900/85 hover:bg-slate-800 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/30 shadow-lg"
                    title="Switch Camera (Front / Rear)"
                  >
                    <SwitchCamera className="w-5 h-5 text-emerald-300" />
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 sm:px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-2xl transition-all flex items-center gap-2.5 cursor-pointer border-2 border-white transform active:scale-95 hover:shadow-emerald-500/25"
                  >
                    <Camera className="w-5 h-5 text-white" />
                    <span>[ 📷 SNAP & PROCESS FORM ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                    }}
                    className="p-3.5 bg-slate-900/85 hover:bg-slate-800 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/30 shadow-lg"
                    title="Choose File Instead"
                  >
                    <Upload className="w-5 h-5 text-blue-300" />
                  </button>
                </div>
              </div>
            ) : (
              /* DUAL CAMERA / FILE DROPZONE */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                className={`rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 text-center space-y-6 max-w-3xl mx-auto ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                    : 'border-blue-200 bg-slate-50/80 hover:bg-blue-50/40'
                }`}
              >
                <div className="w-20 h-20 bg-blue-100 text-[#1E3A8A] rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-sm">
                  <FileSearch className="w-10 h-10" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-black text-gray-900">
                    Scan or Upload Student "Personal Data Form"
                  </h3>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    Capture paper forms directly with your device camera, drag and drop an image file, or press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono text-[10px] text-gray-800">Ctrl+V</kbd> to paste.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600/50 hover:shadow-lg"
                  >
                    <Camera className="w-4 h-4 text-emerald-200" />
                    <span>📷 OPEN LIVE CAMERA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                  >
                    <Upload className="w-4 h-4 text-blue-200" />
                    <span>UPLOAD FORM FILE (PNG / JPG / PDF)</span>
                  </button>
                </div>

                {/* Instant Sample Test Option */}
                <div className="pt-4 border-t border-blue-100/80 max-w-md mx-auto">
                  <p className="text-xs text-gray-500 font-medium mb-2.5">
                    Testing without a physical paper form right now?
                  </p>
                  <button
                    type="button"
                    onClick={loadSampleForm}
                    className="px-4 py-2 bg-white border border-blue-300 hover:border-[#1E3A8A] text-[#1E3A8A] font-bold text-xs rounded-xl shadow-2xs hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚡ Load Sample Personal Data Form for Instant Test</span>
                  </button>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: REAL-TIME AI SCANNING ANIMATION */}
        {stage === 'scanning' && (
          <div className="p-8 sm:p-12 text-center space-y-6 my-auto">
            {/* Visual Document Scan Animation */}
            <div className="relative w-48 sm:w-56 h-64 sm:h-72 mx-auto bg-white rounded-2xl shadow-xl border-2 border-blue-200 overflow-hidden flex flex-col justify-between p-4">
              {/* Mock lines of document */}
              <div className="space-y-2 text-left opacity-30">
                <div className="h-3 w-3/4 bg-blue-900 rounded" />
                <div className="h-2 w-1/2 bg-blue-700 rounded" />
                <div className="h-px bg-slate-300 my-2" />
                <div className="h-2 w-full bg-slate-400 rounded" />
                <div className="h-2 w-5/6 bg-slate-400 rounded" />
                <div className="h-2 w-4/6 bg-slate-400 rounded" />
                <div className="h-2 w-full bg-slate-400 rounded" />
                <div className="h-2 w-3/4 bg-slate-400 rounded" />
              </div>

              {/* Animated Laser Bar */}
              <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 shadow-[0_0_15px_#10B981] animate-bounce" />

              <div className="flex items-center justify-between text-[10px] text-blue-900 font-bold opacity-60">
                <span>Personal Data Form</span>
                <span>Gemini 3.7</span>
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-base uppercase tracking-wide">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>PROCESSING DOCUMENT WITH AI OCR...</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Reading printed text, handwritten entries, 12-digit LRN, and examination remarks.
              </p>
            </div>

            {/* Pipeline Stage Badges */}
            <div className="max-w-md mx-auto grid grid-cols-2 gap-2 text-[11px] font-bold text-left pt-2">
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                scanProgressStage >= 1
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Form Header & Layout</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                scanProgressStage >= 2
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Handwriting OCR</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                scanProgressStage >= 3
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. LRN & Two-Column Map</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                scanProgressStage >= 4
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>4. Preparing Review Form</span>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: SIDE-BY-SIDE SPLIT VERIFICATION & EDIT WORKSPACE */}
        {stage === 'review' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Review Status Banner */}
            <div className="p-3 bg-blue-50 border-b border-blue-200 px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-blue-950">
                  OCR Extraction Complete!
                </span>
                <span className="text-gray-600 font-medium hidden sm:inline">
                  Compare the scanned document on the left with the auto-filled fields on the right.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStage('capture');
                    startCamera('environment');
                  }}
                  className="px-2.5 py-1 bg-white border border-blue-300 hover:border-[#1E3A8A] text-blue-900 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3 text-[#1E3A8A]" />
                  <span>Scan Another Document</span>
                </button>
              </div>
            </div>

            {saveError && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* LEFT COLUMN: INTERACTIVE DOCUMENT VIEWER */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-slate-900 flex flex-col min-h-[260px] lg:min-h-0 relative">
                {/* Document Viewer Controls */}
                <div className="p-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white text-xs shrink-0 px-4">
                  <div className="flex items-center gap-2 font-bold text-[11px] text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Scanned Form Reference</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setImageZoom((prev) => Math.max(0.6, prev - 0.2))}
                      className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-white cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-slate-300 w-9 text-center">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageZoom((prev) => Math.min(2.5, prev + 0.2))}
                      className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-white cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageZoom(1)}
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold text-white cursor-pointer"
                      title="Reset Zoom"
                    >
                      Fit
                    </button>
                  </div>
                </div>

                {/* Document Image Canvas */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Scanned Student Document"
                      style={{
                        transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">No image preview available</div>
                  )}
                </div>

                {/* Form metadata badge */}
                {scanResult?.formTitleDetected && (
                  <div className="p-2 bg-slate-800/80 border-t border-slate-700 text-[10px] text-slate-400 text-center font-medium truncate px-3">
                    Detected Document: <strong className="text-slate-200">{scanResult.formTitleDetected}</strong>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: AUTO-FILLED EDITABLE FORM */}
              <div className="lg:col-span-7 bg-white flex flex-col overflow-hidden">
                {/* Form Navigation Tabs */}
                <div className="flex items-center border-b border-blue-100 bg-slate-50 px-4 pt-2 shrink-0 overflow-x-auto text-xs font-semibold gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('personal')}
                    className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeReviewTab === 'personal'
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>1. Personal Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('family')}
                    className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeReviewTab === 'family'
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Family Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('educational')}
                    className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeReviewTab === 'educational'
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>3. Exam & Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('health')}
                    className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeReviewTab === 'health'
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-extrabold'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>4. Health</span>
                  </button>
                </div>

                {/* Form Fields Workspace */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                  {/* TAB 1: PERSONAL INFORMATION */}
                  {activeReviewTab === 'personal' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      {/* LRN Field with 12-digit validator */}
                      <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-black text-blue-950 uppercase flex items-center gap-1.5">
                            <span>Learner Reference Number (LRN)</span>
                            <span className="text-red-500">*</span>
                          </label>
                          {getConfidenceBadge('lrn')}
                        </div>

                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            maxLength={12}
                            value={lrn}
                            onChange={(e) => setLrn(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 109283746123"
                            className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono font-black text-[#1E3A8A] tracking-wider focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                          />
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                            lrn.length === 12
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {lrn.length} / 12 digits
                          </span>
                        </div>
                      </div>

                      {/* Name Fields (SN, FN, MN) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Surname (SN) <span className="text-red-500">*</span>
                            </label>
                            {getConfidenceBadge('surname')}
                          </div>
                          <input
                            type="text"
                            required
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder="e.g. DELA CRUZ"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              First Name (FN) <span className="text-red-500">*</span>
                            </label>
                            {getConfidenceBadge('firstName')}
                          </div>
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. MARIA CRISTINA"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Middle Name (MN)
                            </label>
                            {getConfidenceBadge('middleName')}
                          </div>
                          <input
                            type="text"
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                            placeholder="e.g. SANTOS"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>
                      </div>

                      {/* Birthday & Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Birthday <span className="text-red-500">*</span>
                            </label>
                            {getConfidenceBadge('birthday')}
                          </div>
                          <input
                            type="date"
                            required
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Complete Home Address
                            </label>
                            {getConfidenceBadge('address')}
                          </div>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="House No., Barangay, Municipality/City, Province"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: FAMILY INFORMATION */}
                  {activeReviewTab === 'family' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Father's Name (Tatay)
                            </label>
                            {getConfidenceBadge('fatherName')}
                          </div>
                          <input
                            type="text"
                            value={fatherName}
                            onChange={(e) => setFatherName(e.target.value)}
                            placeholder="Full name of father"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Father's Occupation
                            </label>
                            {getConfidenceBadge('fatherOccupation')}
                          </div>
                          <input
                            type="text"
                            value={fatherOccupation}
                            onChange={(e) => setFatherOccupation(e.target.value)}
                            placeholder="e.g. Farmer / Tricycle Driver"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Mother's Name (Nanay)
                            </label>
                            {getConfidenceBadge('motherName')}
                          </div>
                          <input
                            type="text"
                            value={motherName}
                            onChange={(e) => setMotherName(e.target.value)}
                            placeholder="Full name of mother"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Mother's Occupation
                            </label>
                            {getConfidenceBadge('motherOccupation')}
                          </div>
                          <input
                            type="text"
                            value={motherOccupation}
                            onChange={(e) => setMotherOccupation(e.target.value)}
                            placeholder="e.g. Housewife / Sewer"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Guardian's Name
                            </label>
                            {getConfidenceBadge('guardianName')}
                          </div>
                          <input
                            type="text"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value)}
                            placeholder="Full name of guardian if applicable"
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Number of Siblings
                            </label>
                            {getConfidenceBadge('numSiblings')}
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={numSiblings}
                            onChange={(e) => setNumSiblings(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: EDUCATIONAL & ADMISSION STATUS */}
                  {activeReviewTab === 'educational' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-gray-700 uppercase">
                            Elementary School Graduated
                          </label>
                          {getConfidenceBadge('elementarySchool')}
                        </div>
                        <input
                          type="text"
                          value={elementarySchool}
                          onChange={(e) => setElementarySchool(e.target.value)}
                          placeholder="e.g. DASMARIÑAS INTEGRATED ELEMENTARY SCHOOL"
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white uppercase"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Entrance Exam Score <span className="text-red-500">*</span>
                            </label>
                            {getConfidenceBadge('examScore')}
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={maxExamScore}
                            value={examScore}
                            onChange={(e) => setExamScore(e.target.value)}
                            placeholder={`0 to ${maxExamScore}`}
                            className="w-full px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl text-xs font-black text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                          />
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Max configured score: <strong>{maxExamScore}</strong>
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">
                              Admission Status (Remarks) <span className="text-red-500">*</span>
                            </label>
                            {getConfidenceBadge('remarks')}
                          </div>
                          <select
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value as AdmissionStatus)}
                            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                          >
                            <option value="A - PASS">A - PASS (Qualified)</option>
                            <option value="B - PENDING">B - PENDING (Evaluation)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HEALTH & ASSESSOR NOTES */}
                  {activeReviewTab === 'health' && (
                    <div className="space-y-3.5 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-gray-700 uppercase">
                            Health Status & Medical Remarks
                          </label>
                          {getConfidenceBadge('healthStatus')}
                        </div>
                        <textarea
                          rows={3}
                          value={healthStatus}
                          onChange={(e) => setHealthStatus(e.target.value)}
                          placeholder="e.g. Normal / Fit for boarding school / No known asthma or allergies"
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                        />
                      </div>

                      {scanResult?.detectedNotes && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
                          <span className="font-bold text-gray-900">Detected Handwritten Notes on Form:</span>
                          <p className="font-mono text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-200">
                            {scanResult.detectedNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Bar Footer */}
                <div className="p-4 border-t border-blue-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStage('capture')}
                    className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Scanner</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveToDatabase}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:shadow-lg"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                        <span>SAVING STUDENT RECORD...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-emerald-200" />
                        <span>[ SAVE STUDENT RECORD TO DATABASE ]</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
