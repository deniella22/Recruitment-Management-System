import React, { useState } from 'react';
import {
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  Search,
  Download,
} from 'lucide-react';
import { StudentRecord, SystemSettings } from '../types';

interface Props {
  students: StudentRecord[];
  onExportExcel: (customList?: StudentRecord[], filterName?: string) => void;
  onExportPdf: (customList?: StudentRecord[], filterName?: string) => void;
  onExportSchoolsSummary?: (type: 'excel' | 'pdf') => void;
  onViewStudentProfile: (student: StudentRecord) => void;
  systemSettings?: SystemSettings;
}

export const ReportsView: React.FC<Props> = ({
  students,
  onExportExcel,
  onExportPdf,
  onExportSchoolsSummary,
  onViewStudentProfile,
  systemSettings,
}) => {
  const [selectedReportTab, setSelectedReportTab] = useState<'all' | 'pass' | 'pending' | 'schools'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const totalStudents = students.length;
  const passStudents = students.filter((s) => s.remarks === 'A - PASS');
  const pendingStudents = students.filter((s) => s.remarks === 'B - PENDING');

  const schoolMap: Record<string, { total: number; pass: number; pending: number }> = {};
  students.forEach((s) => {
    const sch = s.elementarySchool?.trim() || 'Unspecified School';
    if (!schoolMap[sch]) {
      schoolMap[sch] = { total: 0, pass: 0, pending: 0 };
    }
    schoolMap[sch].total += 1;
    if (s.remarks === 'A - PASS') schoolMap[sch].pass += 1;
    else schoolMap[sch].pending += 1;
  });

  const schoolList = Object.entries(schoolMap).map(([name, counts]) => ({
    name,
    ...counts,
  }));

  let displayedStudents = students;
  let currentFilterLabel = 'All Applicants';
  if (selectedReportTab === 'pass') {
    displayedStudents = passStudents;
    currentFilterLabel = 'PASS (A) Qualified Candidates';
  } else if (selectedReportTab === 'pending') {
    displayedStudents = pendingStudents;
    currentFilterLabel = 'PENDING (B) Evaluation Candidates';
  }

  if (searchFilter) {
    const q = searchFilter.toLowerCase();
    displayedStudents = displayedStudents.filter(
      (s) =>
        `${s.surname} ${s.firstName}`.toLowerCase().includes(q) ||
        s.lrn.toLowerCase().includes(q) ||
        s.elementarySchool.toLowerCase().includes(q)
    );
  }

  const handleExportCurrent = (type: 'excel' | 'pdf') => {
    if (selectedReportTab === 'schools') {
      if (onExportSchoolsSummary) {
        onExportSchoolsSummary(type);
      } else if (type === 'excel') {
        onExportExcel(students, 'Schools_Summary');
      } else {
        onExportPdf(students, 'Schools_Summary');
      }
      return;
    }

    if (type === 'excel') {
      onExportExcel(displayedStudents, currentFilterLabel);
    } else {
      onExportPdf(displayedStudents, currentFilterLabel);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <FileBarChart2 className="w-5 h-5" />
            <h2 className="font-black text-lg text-gray-900">
              Recruitment & Admission Reports
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Real-time evaluation statistics and student reporting for {systemSettings?.schoolName || 'Sisters of Mary School-Girlstown, Inc.'}
          </p>
        </div>

        {/* Global Export Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onExportExcel(students, 'All_Recruitment_Records')}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Export all student records to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>EXPORT ALL EXCEL (.XLSX)</span>
          </button>

          <button
            onClick={() => onExportPdf(students, 'All_Recruitment_Records')}
            className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Export all student records to official PDF document (.pdf)"
          >
            <FileText className="w-4 h-4 text-red-200" />
            <span>EXPORT ALL PDF (.PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedReportTab('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedReportTab === 'all'
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md'
              : 'bg-white border-blue-100 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider opacity-90">All Recruited</span>
            <Users className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl font-black mt-2">{totalStudents}</p>
          <p className="text-[11px] opacity-80 mt-1 font-semibold">Total Encoded Applicants</p>
        </div>

        <div
          onClick={() => setSelectedReportTab('pass')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedReportTab === 'pass'
              ? 'bg-emerald-800 text-white border-emerald-800 shadow-md'
              : 'bg-white border-emerald-100 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">A (PASS)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-2">{passStudents.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Qualified Candidates</p>
        </div>

        <div
          onClick={() => setSelectedReportTab('pending')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedReportTab === 'pending'
              ? 'bg-amber-800 text-white border-amber-800 shadow-md'
              : 'bg-white border-amber-100 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">B (PENDING)</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-800 mt-2">{pendingStudents.length}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">Awaiting Evaluation</p>
        </div>

        <div
          onClick={() => setSelectedReportTab('schools')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedReportTab === 'schools'
              ? 'bg-blue-800 text-white border-blue-800 shadow-md'
              : 'bg-white border-blue-100 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Origin Schools</span>
            <GraduationCap className="w-5 h-5 text-blue-700" />
          </div>
          <p className="text-3xl font-black text-blue-900 mt-2">{schoolList.length}</p>
          <p className="text-[11px] text-blue-700 font-semibold mt-1">Feeder Elementary Schools</p>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedReportTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedReportTab === 'all'
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
              }`}
            >
              All Applicants ({totalStudents})
            </button>
            <button
              onClick={() => setSelectedReportTab('pass')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedReportTab === 'pass'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
              }`}
            >
              PASS List ({passStudents.length})
            </button>
            <button
              onClick={() => setSelectedReportTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedReportTab === 'pending'
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
              }`}
            >
              PENDING List ({pendingStudents.length})
            </button>
            <button
              onClick={() => setSelectedReportTab('schools')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedReportTab === 'schools'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
              }`}
            >
              Schools Grouping
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Export Current Tab Button */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-gray-200">
              <button
                onClick={() => handleExportCurrent('excel')}
                className="px-2.5 py-1.5 hover:bg-white text-emerald-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Export this view to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Tab .xlsx</span>
              </button>
              <div className="w-[1px] h-3.5 bg-gray-300" />
              <button
                onClick={() => handleExportCurrent('pdf')}
                className="px-2.5 py-1.5 hover:bg-white text-red-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Export this view to PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Tab .pdf</span>
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter report list..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>
          </div>
        </div>

        {selectedReportTab === 'schools' ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-extrabold uppercase text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Elementary School Name</th>
                  <th className="py-3 px-4 text-center">Total Applicants</th>
                  <th className="py-3 px-4 text-center">PASS (A)</th>
                  <th className="py-3 px-4 text-center">PENDING (B)</th>
                  <th className="py-3 px-4 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {schoolList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">
                      No school records available.
                    </td>
                  </tr>
                ) : (
                  schoolList.map((sch) => {
                    const passRate = sch.total > 0 ? Math.round((sch.pass / sch.total) * 100) : 0;
                    return (
                      <tr key={sch.name} className="hover:bg-blue-50/30">
                        <td className="py-3 px-4 font-bold text-gray-900">{sch.name}</td>
                        <td className="py-3 px-4 text-center font-bold">{sch.total}</td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-bold">{sch.pass}</td>
                        <td className="py-3 px-4 text-center text-amber-700 font-bold">{sch.pending}</td>
                        <td className="py-3 px-4 text-right font-black text-[#1E3A8A]">
                          {passRate}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E3A8A] text-white font-bold uppercase border-b border-blue-900">
                <tr>
                  <th className="py-3 px-4">LRN</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Elementary School</th>
                  <th className="py-3 px-4">Exam Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {displayedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400 font-bold">
                      No student records available for this report filter.
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">{s.lrn}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {s.surname}, {s.firstName} {s.middleName || ''}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{s.elementarySchool || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold">{s.examScore}</td>
                      <td className="py-3 px-4">
                        {s.remarks === 'A - PASS' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold text-[11px] border border-emerald-200">
                            A (PASS)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-bold text-[11px] border border-amber-200">
                            B (PENDING)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onViewStudentProfile(s)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] font-bold rounded-lg transition-all cursor-pointer border border-blue-200/60"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
