import React, { useState } from 'react';
import {
  Search,
  ArrowUpDown,
  UserPlus,
  FileSpreadsheet,
  FileText,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Camera,
  ChevronDown,
  Download,
  MapPin,
} from 'lucide-react';
import { StudentRecord, UserRole } from '../types';
import { getTestingCenterName, getStudentProvince, sortStudents } from '../lib/studentSorting';

interface TestingCenterGroup {
  centerName: string;
  students: StudentRecord[];
}

interface ProvinceGroup {
  provinceName: string;
  totalStudents: number;
  testingCenters: TestingCenterGroup[];
}

interface Props {
  students: StudentRecord[];
  allStudents?: StudentRecord[];
  loading?: boolean;
  onViewStudent: (student: StudentRecord) => void;
  onEditStudent: (student: StudentRecord) => void;
  onDeleteStudent: (student: StudentRecord) => void;
  onOpenAddStudent: (mode?: 'selection' | 'ocr' | 'form') => void;
  onExportExcel: (exportAll?: boolean) => void;
  onExportPdf: (exportAll?: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  userRole: UserRole;
}

export const StudentListView: React.FC<Props> = ({
  students,
  allStudents,
  loading = false,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenAddStudent,
  onExportExcel,
  onExportPdf,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  userRole,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isViewer = userRole === 'Viewer';
  const totalCount = allStudents ? allStudents.length : students.length;
  const isFiltered = (searchQuery.trim() !== '' || statusFilter !== 'ALL') && students.length !== totalCount;

  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const provinceGroups = React.useMemo(() => {
    if (sortBy !== 'province' && sortBy !== 'testingCenter') return null;

    // Strict hierarchy: Province A–Z -> Testing Center A–Z -> Status -> Name
    const sorted = sortStudents(students, 'province', sortOrder);

    const provMap = new Map<string, Map<string, StudentRecord[]>>();
    for (const s of sorted) {
      const prov = getStudentProvince(s);
      const center = getTestingCenterName(s);

      if (!provMap.has(prov)) {
        provMap.set(prov, new Map<string, StudentRecord[]>());
      }
      const centerMap = provMap.get(prov)!;
      if (!centerMap.has(center)) {
        centerMap.set(center, []);
      }
      centerMap.get(center)!.push(s);
    }

    const result: ProvinceGroup[] = [];
    for (const [prov, centerMap] of provMap.entries()) {
      const centers: TestingCenterGroup[] = [];
      let provTotal = 0;
      for (const [center, cStudents] of centerMap.entries()) {
        centers.push({ centerName: center, students: cStudents });
        provTotal += cStudents.length;
      }
      result.push({
        provinceName: prov,
        totalStudents: provTotal,
        testingCenters: centers,
      });
    }

    return result;
  }, [students, sortBy, sortOrder]);

  const renderStudentRow = (student: StudentRecord, idx: number, showTestingCenterTag: boolean) => (
    <tr
      key={student.id}
      className={`hover:bg-blue-50/50 transition-colors ${
        idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
      }`}
    >
      <td className="py-3.5 px-4 font-mono font-bold text-gray-900 select-all">
        {student.lrn}
      </td>
      <td className="py-3.5 px-4 font-bold text-gray-900">
        <button
          onClick={() => onViewStudent(student)}
          className="text-left hover:text-[#1E3A8A] hover:underline cursor-pointer block"
        >
          {student.surname}, {student.firstName}{' '}
          {student.middleName ? `${student.middleName}` : ''}
        </button>
        {showTestingCenterTag && getTestingCenterName(student) && (
          <span className="text-[10px] text-blue-700 font-medium block mt-0.5">
            📍 {getTestingCenterName(student)}
          </span>
        )}
      </td>
      <td className="py-3.5 px-4 text-gray-700 font-medium">
        {formatBirthday(student.birthday)}
      </td>
      <td className="py-3.5 px-4 text-gray-700 font-medium">
        {student.elementarySchool || 'N/A'}
      </td>
      <td className="py-3.5 px-4 font-bold text-gray-900">
        {student.examScore}
      </td>
      <td className="py-3.5 px-4">
        {student.admissionStatus === 'Passed' || student.remarks === 'A - PASS' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Passed
          </span>
        ) : student.admissionStatus === 'Conditional' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Conditional
          </span>
        ) : student.admissionStatus === 'Failed' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full font-bold text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Failed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-full font-bold text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Pending
          </span>
        )}
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onViewStudent(student)}
            className="px-3 py-1 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-blue-200/60"
            title="View Complete Student Profile"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>VIEW</span>
          </button>

          {!isViewer && (
            <>
              <button
                onClick={() => onEditStudent(student)}
                className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                title="Edit Record"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteStudent(student)}
                className="p-1.5 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-5">
      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name, LRN, or Elementary School..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white transition-all"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              All Students
            </button>
            <button
              onClick={() => setStatusFilter('Passed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Passed' || statusFilter === 'A - PASS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Passed</span>
            </button>
            <button
              onClick={() => setStatusFilter('Conditional')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Conditional'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Conditional</span>
            </button>
            <button
              onClick={() => setStatusFilter('Failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Failed'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'Pending' || statusFilter === 'B - PENDING'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                const nextSort = e.target.value;
                setSortBy(nextSort);
                if (nextSort === 'province' || nextSort === 'testingCenter') {
                  setSortOrder('asc');
                }
              }}
              className="bg-slate-50 border border-gray-200 text-gray-800 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="province">Sort: Province</option>
              <option value="fullName">Sort: Student Name</option>
              <option value="testingCenter">Sort: Testing Center</option>
              <option value="lrn">Sort: LRN</option>
              <option value="examScore">Sort: Exam Score</option>
              <option value="elementarySchool">Sort: Elementary School</option>
              <option value="remarks">Sort: Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              title={`Toggle Sort Order (${sortOrder.toUpperCase()})`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Main Actions */}
          <button
            onClick={() => onOpenAddStudent('selection')}
            className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wide rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ADD STUDENT</span>
          </button>

          <button
            onClick={() => onOpenAddStudent('ocr')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-200" />
            <span>📷 SCAN / IMPORT</span>
          </button>

          {/* Export Actions Menu */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-800 text-white shadow-xs overflow-hidden">
              <button
                onClick={() => onExportExcel(false)}
                className="px-3.5 py-2 hover:bg-slate-900 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export list to Excel spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>EXCEL</span>
              </button>
              <div className="w-[1px] h-5 bg-slate-700" />
              <button
                onClick={() => onExportPdf(false)}
                className="px-3.5 py-2 hover:bg-slate-900 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export official printable report to PDF (.pdf)"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span>PDF</span>
              </button>
              {isFiltered && (
                <>
                  <div className="w-[1px] h-5 bg-slate-700" />
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-2 py-2 hover:bg-slate-900 text-slate-300 transition-all cursor-pointer"
                    title="More export options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Dropdown Options for Filtered vs All */}
            {showExportMenu && isFiltered && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  Export Options ({students.length} filtered / {totalCount} total)
                </div>
                <button
                  onClick={() => {
                    onExportExcel(false);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Filtered ({students.length}) to Excel</span>
                </button>
                <button
                  onClick={() => {
                    onExportExcel(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export All ({totalCount}) to Excel</span>
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => {
                    onExportPdf(false);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Export Filtered ({students.length}) to PDF</span>
                </button>
                <button
                  onClick={() => {
                    onExportPdf(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Export All ({totalCount}) to PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Records Table */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 space-y-3">
            <div className="w-9 h-9 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-bold text-sm text-gray-700">Loading student records from recruitment database...</p>
            <p className="text-xs text-gray-400">Synchronizing persistent workspace records...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto text-blue-200 mb-3" />
            <p className="font-bold text-base text-gray-700">No student records available.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto font-medium">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No students matched your search filter criteria. Try adjusting your search query or filter.'
                : 'The recruitment database currently has 0 encoded student records.'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => onOpenAddStudent('selection')}
                  className="px-4 py-2 bg-[#1E3A8A] text-white font-bold text-xs rounded-xl hover:bg-[#1D4ED8] transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Encode First Student</span>
                </button>
                <button
                  onClick={() => onOpenAddStudent('ocr')}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>📷 Scan Document with OCR</span>
                </button>
              </div>
            )}
          </div>
        ) : provinceGroups ? (
          <div className="space-y-8 p-3 sm:p-5 bg-slate-50/60 rounded-2xl border border-slate-200/60">
            {provinceGroups.map((provGroup) => (
              <div key={provGroup.provinceName} className="space-y-4">
                {/* 📍 Province Heading */}
                <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#1E40AF] text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                      <MapPin className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200 bg-blue-950/70 px-2.5 py-0.5 rounded-full border border-blue-400/20">
                          PROVINCE
                        </span>
                        <span className="text-xs font-bold text-blue-200">
                          {provGroup.totalStudents} {provGroup.totalStudents === 1 ? 'Applicant' : 'Applicants'}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black tracking-wide text-white mt-1">
                        📍 {provGroup.provinceName}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-blue-200 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
                    <span>
                      {provGroup.testingCenters.length}{' '}
                      {provGroup.testingCenters.length === 1 ? 'Testing Center' : 'Testing Centers'}
                    </span>
                  </div>
                </div>

                {/* Testing Centers within this Province */}
                <div className="space-y-5 sm:pl-3">
                  {provGroup.testingCenters.map((centerGroup) => {
                    const passedCount = centerGroup.students.filter(
                      (s) => s.admissionStatus === 'Passed' || s.remarks === 'A - PASS'
                    ).length;
                    const condCount = centerGroup.students.filter(
                      (s) => s.admissionStatus === 'Conditional' || s.remarks === 'Conditional'
                    ).length;
                    const pendCount = centerGroup.students.filter(
                      (s) =>
                        (!s.admissionStatus && !s.remarks) ||
                        s.admissionStatus === 'Pending' ||
                        s.remarks === 'B - PENDING' ||
                        s.remarks === 'Pending'
                    ).length;
                    const failCount = centerGroup.students.filter(
                      (s) => s.admissionStatus === 'Failed' || s.remarks === 'Failed'
                    ).length;

                    return (
                      <div key={centerGroup.centerName} className="space-y-2.5">
                        {/* Testing Center Heading */}
                        <div className="bg-blue-50/90 border border-blue-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                              Testing Center:
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
                              {centerGroup.centerName}
                            </h3>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                              {centerGroup.students.length}{' '}
                              {centerGroup.students.length === 1 ? 'student' : 'students'}
                            </span>
                            {passedCount > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100/90 border border-emerald-300 text-emerald-800 font-bold text-[11px] rounded-md">
                                Passed: {passedCount}
                              </span>
                            )}
                            {condCount > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100/90 border border-amber-300 text-amber-800 font-bold text-[11px] rounded-md">
                                Conditional: {condCount}
                              </span>
                            )}
                            {pendCount > 0 && (
                              <span className="px-2 py-0.5 bg-blue-100/90 border border-blue-300 text-blue-800 font-bold text-[11px] rounded-md">
                                Pending: {pendCount}
                              </span>
                            )}
                            {failCount > 0 && (
                              <span className="px-2 py-0.5 bg-red-100/90 border border-red-300 text-red-800 font-bold text-[11px] rounded-md">
                                Failed: {failCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Table for this Testing Center */}
                        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#1E3A8A] text-white font-bold uppercase tracking-wider">
                                <tr>
                                  <th className="py-3 px-4">LRN</th>
                                  <th className="py-3 px-4">Student Name (SN, FN, MN)</th>
                                  <th className="py-3 px-4">Birthday</th>
                                  <th className="py-3 px-4">Elementary School</th>
                                  <th className="py-3 px-4">Exam Score</th>
                                  <th className="py-3 px-4">Admission Status</th>
                                  <th className="py-3 px-4 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-medium">
                                {centerGroup.students.map((student, idx) =>
                                  renderStudentRow(student, idx, false)
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E3A8A] text-white font-bold uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => handleSortChange('lrn')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>LRN</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('fullName')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Student Name (SN, FN, MN)</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('birthday')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Birthday</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('elementarySchool')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Elementary School</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('examScore')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Exam Score</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('remarks')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Admission Status</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {students.map((student, idx) =>
                  renderStudentRow(student, idx, true)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
