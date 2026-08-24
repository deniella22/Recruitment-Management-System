import React from 'react';
import { User, SystemSettings, RecruitmentListWithStats } from '../types';
import { LogOut, Shield, ArrowLeft, Layers } from 'lucide-react';

interface Props {
  currentUser: User;
  activeTab: string;
  onLogout: () => void;
  systemSettings?: SystemSettings;
  selectedRecruitmentList?: RecruitmentListWithStats | null;
  onBackToLists?: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  activeTab,
  onLogout,
  systemSettings,
  selectedRecruitmentList,
  onBackToLists,
}) => {
  const logoSrc = systemSettings?.schoolLogoUrl || '/school-logo.png';
  const schoolName = systemSettings?.schoolName || 'Sisters of Mary School – Talisay, Cebu';

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard & Overview';
      case 'students': return 'Student Recruitment Records';
      case 'profile': return 'Student Detailed Profile';
      case 'reports': return 'Recruitment Reports & Analytics';
      case 'users': return 'User & Staff Management';
      case 'audit': return 'System Audit Logs';
      case 'settings': return 'System Settings';
      default: return 'Recruitment Workspace';
    }
  };

  return (
    <header className="bg-white border-b border-blue-100 px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3 flex-wrap">
        {onBackToLists && (
          <button
            onClick={onBackToLists}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-2xs mr-1"
            title="Return to Recruitment Lists Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Recruitment Lists</span>
          </button>
        )}

        <div className="w-9 h-9 bg-white rounded-lg p-0.5 border border-blue-200 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
          <img
            src={logoSrc}
            alt={`${schoolName} Logo`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/school-logo.png'; }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1E3A8A]">
              {schoolName}
            </span>
            {selectedRecruitmentList && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-extrabold text-[10px] uppercase border border-blue-200">
                <Layers className="w-3 h-3 text-[#1E3A8A]" />
                {selectedRecruitmentList.name}
              </span>
            )}
          </div>
          <h1 className="text-base font-black text-gray-900 tracking-tight leading-tight">
            {getPageTitle(activeTab)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200/80 px-3.5 py-1.5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center font-black text-xs shadow-xs">
            {currentUser.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <p className="font-bold text-gray-900 leading-tight">{currentUser.fullName}</p>
            <p className="text-blue-800 flex items-center gap-1 font-semibold text-[11px] mt-0.5">
              <Shield className="w-3 h-3 text-[#1E3A8A]" />
              {currentUser.role}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 hover:text-red-700 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all cursor-pointer"
          title="Sign out of system"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

