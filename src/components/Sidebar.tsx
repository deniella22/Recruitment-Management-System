import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileBarChart2,
  FileSpreadsheet,
  UserCheck,
  History,
  Settings,
  Camera,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { UserRole, SystemSettings, RecruitmentListWithStats } from '../types';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddStudent: (mode?: 'selection' | 'ocr' | 'form') => void;
  onExportExcel: () => void;
  userRole: UserRole;
  systemSettings?: SystemSettings;
  selectedRecruitmentList?: RecruitmentListWithStats | null;
  onBackToLists?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenAddStudent,
  onExportExcel,
  userRole,
  systemSettings,
  selectedRecruitmentList,
  onBackToLists,
}) => {
  const isSuperAdmin = userRole === 'Super Administrator';
  const logoSrc = systemSettings?.schoolLogoUrl || '/school_logo.png';
  const schoolName = systemSettings?.schoolName || 'Sisters of Mary School – Talisay, Cebu';
  const listName = selectedRecruitmentList?.name || systemSettings?.academicYear || 'Recruitment Workspace';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Records', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    ...(isSuperAdmin ? [{ id: 'users', label: 'User Management', icon: UserCheck }] : []),
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col h-screen sticky top-0 shrink-0 select-none shadow-xl">
      {/* School Branding Header */}
      <div className="p-4 border-b border-blue-800/80 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20 overflow-hidden">
          <img
            src={logoSrc}
            alt={`${schoolName} Logo`}
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/school_logo.png'; }}
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-extrabold text-xs leading-snug tracking-tight text-white truncate" title={schoolName}>
            {schoolName}
          </h2>
          <p className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider mt-0.5 truncate flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{listName}</span>
          </p>
        </div>
      </div>

      {/* Switch Recruitment List Button */}
      {onBackToLists && (
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={onBackToLists}
            className="w-full py-2 px-3 bg-blue-950/80 hover:bg-blue-900 text-cyan-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer border border-blue-700/60 shadow-xs"
            title="Return to Recruitment Lists Dashboard"
          >
            <span className="flex items-center gap-1.5 truncate">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Recruitment Lists</span>
            </span>
          </button>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="p-4 space-y-2 border-b border-blue-800/80">
        <button
          onClick={() => onOpenAddStudent('selection')}
          className="w-full py-2.5 px-3 bg-white text-[#1E3A8A] hover:bg-blue-50 font-black text-xs uppercase tracking-wide rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#1E3A8A]" />
          <span>+ ADD STUDENT</span>
        </button>

        <button
          onClick={() => onOpenAddStudent('ocr')}
          className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600/50"
        >
          <Camera className="w-4 h-4 text-emerald-200" />
          <span>📷 SCAN / IMPORT</span>
        </button>

        <button
          onClick={onExportExcel}
          className="w-full py-2 px-3 bg-blue-900/80 hover:bg-blue-900 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          <span>EXPORT TO EXCEL</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-200/70">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/15 text-white font-extrabold border-l-4 border-white shadow-xs'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-blue-200'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer System Info */}
      <div className="p-4 border-t border-blue-800/80 text-[11px] text-blue-200/80 bg-blue-950/80">
        <p className="font-bold text-white">Talisay Admission Office</p>
        <p className="text-[10px] text-cyan-300/80 mt-0.5">Sisters of Mary School – Cebu</p>
      </div>
    </aside>
  );
};
