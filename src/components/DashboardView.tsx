import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  GraduationCap,
  Award,
  UserPlus,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Eye,
  Camera,
} from 'lucide-react';
import { DashboardStats, StudentRecord, SystemSettings } from '../types';

export const getThemeGradientClass = (theme?: string, customGradient?: string) => {
  if (customGradient && customGradient.trim().startsWith('from-')) {
    return `bg-gradient-to-r ${customGradient}`;
  }
  switch (theme) {
    case 'navy-gold':
      return 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e3a8a]';
    case 'emerald':
      return 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#022c22]';
    case 'burgundy':
      return 'bg-gradient-to-r from-[#691B23] via-[#881337] to-[#4c0519]';
    case 'slate':
      return 'bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#0f172a]';
    case 'royal-blue':
    default:
      return 'bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554]';
  }
};

interface Props {
  stats: DashboardStats | null;
  onOpenAddStudent: (mode?: 'selection' | 'ocr' | 'form') => void;
  onExportExcel: () => void;
  onExportPdf?: () => void;
  onNavigateToStudents: (statusFilter?: string) => void;
  onViewStudentProfile: (student: StudentRecord) => void;
  loading: boolean;
  systemSettings?: SystemSettings;
}

export const DashboardView: React.FC<Props> = ({
  stats,
  onOpenAddStudent,
  onExportExcel,
  onExportPdf,
  onNavigateToStudents,
  onViewStudentProfile,
  loading,
  systemSettings,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold">Loading Dashboard Statistics...</p>
        </div>
      </div>
    );
  }

  const totalStudents = stats?.totalStudents ?? 0;
  const totalPass = stats?.totalPass ?? 0;
  const totalPending = stats?.totalPending ?? 0;
  const elementarySchoolsCount = stats?.elementarySchoolsCount ?? 0;
  const averageExamScore = stats?.averageExamScore ?? 0;
  const recentStudents = stats?.recentStudents ?? [];

  const logoSrc = systemSettings?.schoolLogoUrl || '/school-logo.png';
  const schoolName = systemSettings?.schoolName || 'Sisters of Mary School – Talisay, Cebu';
  const subTitle = systemSettings?.subTitle || 'Internal Student Information Management System';
  const academicYear = systemSettings?.academicYear || 'SY 2026-2027 Recruitment';
  const themeClass = getThemeGradientClass(
    systemSettings?.dashboardBgTheme,
    systemSettings?.dashboardBgGradient
  );
  const bgImageUrl = systemSettings?.dashboardBgImageUrl || '/school-campus-background.jpg';

  return (
    <div className="space-y-6">
      {/* Banner / Welcome Header */}
      <div
        className={`${themeClass} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300`}
        style={
          bgImageUrl
            ? {
                backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.85), rgba(30,58,138,0.75)), url(${bgImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-blue-100 border border-white/15">
            <span>{academicYear}</span>
            <span>•</span>
            <span>{subTitle}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {schoolName}
          </h2>
          <p className="text-xs text-blue-100/90 leading-relaxed font-medium">
            Welcome to the official recruitment and admission records portal. Easily encode applicants manually or via direct camera scan / document OCR, evaluate entrance examination scores, manage profiles, and export official reports.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onOpenAddStudent('selection')}
              className="px-4 py-2 bg-white text-[#1E3A8A] hover:bg-blue-50 font-black text-xs uppercase tracking-wide rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#1E3A8A]" />
              <span>+ Encode New Student</span>
            </button>
            <button
              onClick={() => onOpenAddStudent('ocr')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-emerald-500/30"
            >
              <Camera className="w-4 h-4 text-emerald-200" />
              <span>📷 SCAN / IMPORT</span>
            </button>
            <button
              onClick={onExportExcel}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              title="Export all student records to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Export Excel</span>
            </button>
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                title="Export official printable report to PDF (.pdf)"
              >
                <FileText className="w-4 h-4 text-red-300" />
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Large Decorative School Logo */}
        <div className="w-28 h-28 bg-white p-2 rounded-2xl shadow-xl border border-white/30 shrink-0 hidden sm:flex items-center justify-center relative z-10 overflow-hidden">
          <img
            src={logoSrc}
            alt={`${schoolName} Logo`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/school-logo.png'; }}
          />
        </div>
      </div>

      {/* Database Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Students */}
        <div
          onClick={() => onNavigateToStudents('ALL')}
          className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">TOTAL STUDENTS</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center group-hover:bg-[#1E3A8A] group-hover:text-white transition-all">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-[#1E3A8A]">{totalStudents}</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-semibold">
              <span>Recruited & Encoded</span>
            </p>
          </div>
        </div>

        {/* Total Pass */}
        <div
          onClick={() => onNavigateToStudents('A - PASS')}
          className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">TOTAL PASS</p>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-emerald-700">{totalPass}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
              Status: A - PASS
            </p>
          </div>
        </div>

        {/* Total Pending */}
        <div
          onClick={() => onNavigateToStudents('B - PENDING')}
          className="bg-white rounded-2xl p-5 border border-amber-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">TOTAL PENDING</p>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-amber-700">{totalPending}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">
              Status: B - PENDING
            </p>
          </div>
        </div>

        {/* Schools Represented */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">ELEMENTARY SCHOOLS</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-gray-900">{elementarySchoolsCount}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-semibold">Unique Origin Schools</p>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">AVG EXAM SCORE</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-gray-900">{averageExamScore}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-semibold">Overall Entrance Average</p>
          </div>
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-blue-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Recently Encoded Students</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Latest recruitment and evaluation records added to system
            </p>
          </div>
          <button
            onClick={() => onNavigateToStudents('ALL')}
            className="text-xs font-bold text-[#1E3A8A] hover:text-[#1D4ED8] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View All Student Records</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentStudents.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto text-blue-200 mb-3" />
            <p className="font-bold text-sm text-gray-700">No student records available.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto font-medium">
              Click "+ Encode New Student" or "📷 SCAN / IMPORT" above to add the first student record to the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E3A8A] text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">LRN</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Elementary School</th>
                  <th className="py-3.5 px-4">Exam Score</th>
                  <th className="py-3.5 px-4">Admission Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {recentStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{s.lrn}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {s.surname}, {s.firstName} {s.middleName ? `${s.middleName.charAt(0)}.` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{s.elementarySchool || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{s.examScore}</td>
                    <td className="py-3.5 px-4">
                      {s.remarks === 'A - PASS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          A (PASS)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          B (PENDING)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewStudentProfile(s)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] font-bold rounded-lg transition-all cursor-pointer border border-blue-200/60"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
