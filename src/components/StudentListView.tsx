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
  Users,
  Camera,
  ChevronDown,
  Download,
} from 'lucide-react';
import { StudentRecord, UserRole } from '../types';

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
          <div className="flex items-center gap-1.5 bg-slate-100 border border-gray-200 rounded-xl p-1">
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
              onClick={() => setStatusFilter('A - PASS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'A - PASS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>A (PASS)</span>
            </button>
            <button
              onClick={() => setStatusFilter('B - PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'B - PENDING'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>B (PENDING)</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-gray-800 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="fullName">Sort: Student Name</option>
              <option value="lrn">Sort: LRN</option>
              <option value="birthday">Sort: Birthday</option>
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
                      <span>Student Name (SN, MN, FN)</span>
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
                {students.map((student, idx) => (
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
                        className="text-left hover:text-[#1E3A8A] hover:underline cursor-pointer"
                      >
                        {student.surname}, {student.firstName}{' '}
                        {student.middleName ? `${student.middleName}` : ''}
                      </button>
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
                      {student.remarks === 'A - PASS' ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
