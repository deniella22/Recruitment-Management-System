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
  Phone,
  Church,
  Home,
  Check,
  Image as ImageIcon,
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

  const formatBirthday = (dateStr?: string) => {
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

  const displayName = `${student.lastName || student.surname || ''}, ${student.firstName || ''} ${student.middleName || ''}`.trim();
  const displayAddress = student.address || [student.sitioStreet, student.barangay, student.municipality, student.province].filter(Boolean).join(', ') || 'Not specified';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Controls Header */}
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
              <span>EDIT APPLICANT PROFILE</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Student Title & Photo Card */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#172554] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* 1x1 Photo or Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden shadow-md flex items-center justify-center shrink-0">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="1x1 Photo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-white/50" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-blue-100 border border-white/15">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Learner Reference Number (LRN): {student.lrn}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{displayName}</h1>
            <p className="text-xs text-blue-100/90 font-medium">
              Origin Elementary School: <span className="font-bold text-white">{student.elementarySchool || student.school || 'Not specified'}</span>
            </p>
          </div>
        </div>

        <div className="self-stretch sm:self-auto flex sm:flex-col items-center justify-between sm:justify-center gap-2">
          {student.remarks === 'A - PASS' ? (
            <div className="px-5 py-2.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-2xl backdrop-blur-md flex items-center gap-2 font-black text-sm shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>STATUS: A (PASS)</span>
            </div>
          ) : (
            <div className="px-5 py-2.5 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-2xl backdrop-blur-md flex items-center gap-2 font-black text-sm shadow-inner">
              <Clock className="w-5 h-5 text-amber-300" />
              <span>STATUS: B (PENDING)</span>
            </div>
          )}
          <div className="text-[11px] text-blue-200 font-bold bg-white/10 px-3 py-1 rounded-xl">
            Exam Score: <span className="text-amber-300 font-black">{student.examScore ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Official Form Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION A: BASIC PERSONAL INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <User className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">A. Basic Personal Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Last Name / Surname</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.lastName || student.surname || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">First Name</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.firstName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Middle Name</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.middleName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Date of Birth (Birthdate)</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{formatBirthday(student.birthdate || student.birthday)}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Age</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.age !== undefined && student.age !== null ? `${student.age} years old` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Sex / Gender</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.gender || 'Female'}</p>
            </div>
          </div>
        </div>

        {/* SECTION B: RESIDENCE / ADDRESS INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <Home className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">B. Residence / Address Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Sitio / Street / Purok</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.sitioStreet || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Barangay</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.barangay || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Municipality / City</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.municipality || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Province</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.province || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Complete Home Address</p>
              <p className="font-bold text-gray-900 mt-0.5 leading-relaxed">{displayAddress}</p>
            </div>
          </div>
        </div>

        {/* SECTION C: EDUCATIONAL BACKGROUND */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">C. Educational Background</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Elementary School Graduated</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.elementarySchool || student.school || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">School Address</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.schoolAddress || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Learner Reference Number (LRN)</p>
              <p className="font-mono font-bold text-blue-900 text-sm mt-0.5">{student.lrn}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Report Card (SY)</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.reportCardSy || student.reportCard || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Grading Period</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.grading || 'Final'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Current Grade</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.currentGrade || 'Grade 6'}</p>
            </div>
            {student.oldGraduateRemarks && (
              <div className="col-span-2">
                <p className="text-gray-500 font-semibold uppercase text-[10px]">Old Graduate Remarks</p>
                <p className="font-medium text-gray-800 mt-0.5">{student.oldGraduateRemarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION D: FAMILY BACKGROUND */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <Users className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">D. Family Background</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Father's Name (Ama)</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.fatherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Father's Occupation</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.fatherOccupation || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Mother's Name (Ina)</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.motherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Mother's Occupation</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.motherOccupation || 'N/A'}</p>
            </div>
            {student.guardianName && (
              <>
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">Guardian's Name</p>
                  <p className="font-bold text-gray-900 mt-0.5">{student.guardianName}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">Relationship & Occupation</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {student.guardianRelation || 'Guardian'} {student.guardianOccupation ? `(${student.guardianOccupation})` : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION E: CONTACT INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <Phone className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">E. Contact Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Cellphone Number</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{student.cellphoneNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Cellphone Owner</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.cellphoneOwner || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Messenger Account</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.messengerAccount || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Messenger Owner</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.messengerOwner || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* SECTION F: RELIGIOUS & CIVIL INFORMATION */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
            <Church className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">F. Religious & Civil Information</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">PSA Birth Certificate</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.birthCertificatePsa || 'Yes'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Father's Religion</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.fatherReligion || 'Roman Catholic'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Mother's Religion</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.motherReligion || 'Roman Catholic'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Birth Order</p>
              <p className="font-bold text-gray-900 mt-0.5">Pang-{student.birthOrder || 1}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Number of Children</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.numberOfChildren || (student.numSiblings ? Number(student.numSiblings) + 1 : 1)}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Baptized Catholic</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.baptizedCatholic || 'Yes'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Confirmed Catholic</p>
              <p className="font-bold text-gray-900 mt-0.5">{student.confirmedCatholic || 'Yes'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION G: SIBLINGS INFORMATION TABLE */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-blue-50 text-[#1E3A8A]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">G. Siblings Information</h3>
          </div>
          <span className="text-xs font-bold text-gray-500">
            Total Siblings: {student.siblings?.length || student.numSiblings || 0}
          </span>
        </div>

        {Array.isArray(student.siblings) && student.siblings.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No.</th>
                  <th className="p-3">Full Name of Sibling</th>
                  <th className="p-3 w-24">Age</th>
                  <th className="p-3">Remarks / Schooling / Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student.siblings.map((sib, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{sib.name || 'Unnamed'}</td>
                    <td className="p-3 font-medium text-slate-700">{sib.age ? `${sib.age}yo` : 'N/A'}</td>
                    <td className="p-3 font-medium text-slate-700">{sib.remarks || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No siblings detailed in record.</p>
        )}
      </div>

      {/* SECTION H & I: PARISH & HEALTH ASSESSMENT & EXAM */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-blue-50 text-[#1E3A8A]">
          <HeartPulse className="w-5 h-5" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider">H & I. Parish Information & Health Assessment</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Parish / Place</p>
            <p className="font-bold text-gray-900 mt-0.5">{student.parishPlace || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Parish Priest</p>
            <p className="font-bold text-gray-900 mt-0.5">{student.parishPriest || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Health Status / Conditions</p>
            <p className="font-bold text-gray-900 mt-0.5">{student.healthStatus || 'Normal / Fit for schooling'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Entrance Exam Score</p>
            <p className="font-black text-blue-900 text-base mt-0.5">{student.examScore ?? 0}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Admission Status (Remarks)</p>
            <p className={`font-black text-sm mt-0.5 ${student.remarks === 'A - PASS' ? 'text-emerald-700' : 'text-amber-700'}`}>
              {student.remarks || 'B - PENDING'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[10px]">Student Signature</p>
            <p className="font-bold text-gray-900 mt-0.5">{student.studentSignature || 'Signed'}</p>
          </div>
          {student.additionalNotes && (
            <div className="col-span-full">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Additional Notes / Interviewer Observations</p>
              <p className="font-medium text-gray-800 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {student.additionalNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Record Metadata & Audit Footer */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-[11px] text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span>Created: {formatTimestamp(student.createdAt)}</span>
        </div>
        <div>
          <span>Last Updated: {formatTimestamp(student.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
