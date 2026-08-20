import React from 'react';
import {
  ArrowLeft,
  Edit3,
  User,
  HeartPulse,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  MapPin,
  Briefcase,
  History,
  FileText,
  Printer,
} from 'lucide-react';
import { StudentRecord, SystemSettings, UserRole } from '../types';
import { exportStudentProfilePdf } from '../lib/pdfExport';

interface Props {
  student: StudentRecord;
  onBack: () => void;
  onEdit: (student: StudentRecord) => void;
  userRole: UserRole;
  systemSettings?: SystemSettings;
}

export const StudentProfileView: React.FC<Props> = ({
  student,
  onBack,
  onEdit,
  userRole,
  systemSettings,
}) => {
  const isViewer = userRole === 'Viewer';

  const handleExportProfilePdf = async () => {
    try {
      await exportStudentProfilePdf(student, systemSettings);
    } catch (err) {
      console.error('Failed to export profile PDF:', err);
    }
  };

  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'N/A';
    try {
      return new Date(ts).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-blue-100 shadow-xs">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO STUDENTS</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportProfilePdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Download official PDF applicant admission profile sheet"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>EXPORT PDF PROFILE</span>
          </button>

          {!isViewer && (
            <button
              onClick={() => onEdit(student)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded-xl shadow-xs transition-all cursor-pointer uppercase tracking-wider"
            >
              <Edit3 className="w-4 h-4" />
              <span>EDIT STUDENT PROFILE</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Student Title Card */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-blue-100 border border-white/15">
            <Building2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Learner Reference Number (LRN): {student.lrn}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {student.surname}, {student.firstName} {student.middleName || ''}
          </h1>
          <p className="text-xs text-blue-100/90 font-medium flex items-center gap-2 pt-1">
            <span>Origin Elementary School: {student.elementarySchool || 'Not specified'}</span>
          </p>
        </div>

        <div>
          {student.remarks === 'A - PASS' ? (
            <div className="px-4 py-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-2xl backdrop-blur-md flex items-center gap-2 font-extrabold text-sm shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ADMISSION STATUS: A (PASS)</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-2xl backdrop-blur-md flex items-center gap-2 font-extrabold text-sm shadow-inner">
              <Clock className="w-5 h-5 text-amber-300" />
              <span>ADMISSION STATUS: B (PENDING)</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. PERSONAL INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <User className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">PERSONAL INFORMATION</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Surname (SN)</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.surname}</p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">First Name (FN)</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.firstName}</p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Middle Name (MN)</p>
              <p className="font-semibold text-gray-800 text-sm mt-0.5">{student.middleName || 'N/A'}</p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Birthday (MM/DD/YYYY)</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1E3A8A]" />
                {formatBirthday(student.birthday)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">LRN (Learner Reference Number)</p>
              <p className="font-mono font-bold text-gray-900 text-sm mt-0.5 select-all">{student.lrn}</p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Address</p>
              <p className="font-semibold text-gray-800 mt-0.5 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                <span>{student.address || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. FAMILY INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <Users className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">FAMILY INFORMATION</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Father's Name</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.fatherName || 'N/A'}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                <Briefcase className="w-3 h-3" /> {student.fatherOccupation || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Mother's Name</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.motherName || 'N/A'}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                <Briefcase className="w-3 h-3" /> {student.motherOccupation || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Guardian's Name</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.guardianName || 'N/A'}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                <Briefcase className="w-3 h-3" /> {student.guardianOccupation || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Number of Siblings</p>
              <p className="font-black text-gray-900 text-base mt-0.5">{student.numSiblings}</p>
            </div>
          </div>
        </div>

        {/* 3. EDUCATIONAL INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">EDUCATIONAL INFORMATION</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Entrance Exam Score</p>
              <p className="font-black text-[#1E3A8A] text-xl mt-0.5">{student.examScore}</p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Name of Elementary School</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.elementarySchool || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* 4. HEALTH & ADMISSION LOGS */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <HeartPulse className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">HEALTH & EVALUATION METADATA</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Health Status</p>
              <p className="font-semibold text-gray-800 bg-slate-50 p-2.5 rounded-xl border border-gray-100 mt-1">
                {student.healthStatus || 'No health conditions reported'}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Last Updated</p>
              <p className="font-medium text-gray-700 mt-0.5 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-gray-400" />
                {formatTimestamp(student.updatedAt)}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Updated By</p>
              <p className="font-bold text-gray-800 mt-0.5">{student.updatedBy || 'System Staff'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
