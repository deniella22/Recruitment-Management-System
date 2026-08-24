import React, { useState, useEffect } from 'react';
import {
  RecruitmentListWithStats,
  User,
  SystemSettings,
} from '../types';
import {
  fetchRecruitmentLists,
  createRecruitmentList,
  updateRecruitmentList,
  deleteRecruitmentList,
} from '../lib/api';
import {
  FolderPlus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles,
  Shield,
  LogOut,
  Settings as SettingsIcon,
  Layers,
  GraduationCap,
  Calendar,
  AlertCircle,
  X,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  currentUser: User;
  systemSettings: SystemSettings;
  onSelectList: (list: RecruitmentListWithStats) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const RecruitmentListsView: React.FC<Props> = ({
  currentUser,
  systemSettings,
  onSelectList,
  onLogout,
  onOpenSettings,
}) => {
  const [lists, setLists] = useState<RecruitmentListWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [listToEdit, setListToEdit] = useState<RecruitmentListWithStats | null>(null);
  const [listToDelete, setListToDelete] = useState<RecruitmentListWithStats | null>(null);

  // Form states
  const [listName, setListName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('Sisters of Mary School');
  const [branch, setBranch] = useState<string>('Talisay, Cebu');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Toast / Status
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadLists = async (autoSelectIfOnlyOne = false) => {
    try {
      setLoading(true);
      const data = await fetchRecruitmentLists();
      setLists(data);
    } catch (err: any) {
      console.error('Failed to fetch recruitment lists:', err);
      showNotification(err.message || 'Failed to load recruitment lists.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleOpenAddModal = (defaultName = '') => {
    const currentYear = new Date().getFullYear();
    setListName(defaultName || `RECRUITMENT ${currentYear}`);
    setSchoolName(systemSettings.schoolName || 'Sisters of Mary School');
    setBranch(systemSettings.schoolLocation ? 'Talisay, Cebu' : 'Talisay, Cebu');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      setFormError('Please provide a name for this recruitment list (e.g., RECRUITMENT 2026).');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const created = await createRecruitmentList({
        name: listName.trim(),
        schoolName: schoolName.trim() || 'Sisters of Mary School',
        branch: branch.trim() || 'Talisay, Cebu',
      });
      showNotification(`Recruitment list "${created.name}" created successfully!`);
      setIsAddModalOpen(false);
      await loadLists();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create recruitment list.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (list: RecruitmentListWithStats) => {
    setListToEdit(list);
    setListName(list.name);
    setSchoolName(list.schoolName);
    setBranch(list.branch);
    setFormError(null);
    setActiveMenuId(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listToEdit || !listName.trim()) {
      setFormError('Recruitment list name cannot be empty.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await updateRecruitmentList(listToEdit.id, {
        name: listName.trim(),
        schoolName: schoolName.trim(),
        branch: branch.trim(),
      });
      showNotification(`Recruitment list updated to "${listName.trim()}".`);
      setIsEditModalOpen(false);
      setListToEdit(null);
      await loadLists();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update recruitment list.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteList = async () => {
    if (!listToDelete) return;
    try {
      setSubmitting(true);
      await deleteRecruitmentList(listToDelete.id);
      showNotification(`Recruitment list "${listToDelete.name}" deleted.`);
      setListToDelete(null);
      await loadLists();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete recruitment list.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists
  const filteredLists = lists.filter((list) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      list.name.toLowerCase().includes(q) ||
      list.branch.toLowerCase().includes(q) ||
      list.schoolName.toLowerCase().includes(q)
    );
  });

  const totalApplicantsAll = lists.reduce((acc, curr) => acc + (curr.totalApplicants || 0), 0);
  const totalPassedAll = lists.reduce((acc, curr) => acc + (curr.passedApplicants || 0), 0);

  const logoSrc = systemSettings.schoolLogoUrl || '/school-logo.png';
  const campusBg = systemSettings.dashboardBgImageUrl || '/school-campus-background.jpg';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white relative">
      {/* Subtle Campus Ambient Background */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-15 pointer-events-none -z-10"
        style={{ backgroundImage: `url(${campusBg})` }}
      />
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              notification.type === 'error'
                ? 'bg-red-900/90 text-white border-red-700 backdrop-blur-md'
                : 'bg-emerald-900/90 text-white border-emerald-700 backdrop-blur-md'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* 1. PROFESSIONAL DARK-BLUE HEADER */}
      <header className="bg-[#0f1d38]/95 border-b border-blue-900/60 px-6 py-4 sticky top-0 z-30 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: School Logo + Name + Page Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white p-1 border border-blue-400/30 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={logoSrc}
                alt="School Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/school-logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                  SISTERS OF MARY SCHOOL – TALISAY, CEBU
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                Recruitment Lists
              </h1>
            </div>
          </div>

          {/* Right: User Role + Profile + Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-blue-950/70 border border-blue-800/80 px-4 py-2 rounded-xl shadow-inner">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{currentUser.fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] font-semibold text-cyan-200 uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2.5 bg-blue-950/70 hover:bg-blue-900/80 text-blue-200 hover:text-white border border-blue-800/80 rounded-xl transition-all cursor-pointer"
                title="System Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Subtitle & Hero Action Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Recruitment Workspace Years
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Organize student applicant records by recruitment year. Open a list to manage its applicants,
              scan document forms, encode exam results, and generate official admission reports.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-900/40 hover:shadow-blue-700/50 transition-all flex items-center gap-2.5 cursor-pointer border border-blue-400/30 transform active:scale-98"
            >
              <FolderPlus className="w-4 h-4 text-cyan-200" />
              <span>+ Add Another List</span>
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div className="md:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recruitment lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Lists</p>
                <p className="text-lg font-black text-white mt-0.5">{lists.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-900/40 text-blue-300 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Applicants</p>
                <p className="text-lg font-black text-cyan-400 mt-0.5">{totalApplicantsAll}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-900/40 text-cyan-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Passed (All Lists)</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{totalPassedAll}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-900/40 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Loading recruitment lists...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredLists.length === 0 && (
          <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 bg-blue-900/30 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-700/40 shadow-inner">
              <FolderPlus className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">No Recruitment Lists Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchQuery
                  ? `No recruitment lists matching "${searchQuery}". Try clearing your search.`
                  : 'Start by creating your first recruitment list (for example, RECRUITMENT 2026) to manage student applicants for this recruitment season.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => handleOpenAddModal('RECRUITMENT 2026')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create "RECRUITMENT 2026"</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. RECRUITMENT CARDS GRID */}
        {!loading && filteredLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list) => {
              const passPercent =
                list.totalApplicants > 0
                  ? Math.round((list.passedApplicants / list.totalApplicants) * 100)
                  : 0;

              return (
                <div
                  key={list.id}
                  className="bg-gradient-to-b from-[#132247] to-[#0d1730] border border-blue-700/40 hover:border-cyan-400/60 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-cyan-950/30 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Glowing subtle accent border top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>Active List</span>
                        </div>
                        <h3
                          className="text-lg font-black text-white tracking-tight uppercase group-hover:text-cyan-200 transition-colors truncate"
                          title={list.name}
                        >
                          {list.name}
                        </h3>
                      </div>

                      {/* Dropdown Menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === list.id ? null : list.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/70 rounded-lg transition-all cursor-pointer"
                          title="List Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === list.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenEditModal(list)}
                              className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-blue-900/60 hover:text-white flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Rename / Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setListToDelete(list);
                              }}
                              className="w-full px-3.5 py-2 text-left text-red-400 hover:bg-red-950/60 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete List</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* School Identity */}
                    <div className="space-y-0.5 text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                      <p className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{list.schoolName}</span>
                      </p>
                      <p className="text-[11px] text-cyan-300/80 font-medium pl-5 truncate">
                        {list.branch}
                      </p>
                    </div>
                  </div>

                  {/* Card Body - Statistics */}
                  <div className="my-5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                        <p className="text-base font-black text-white mt-0.5">{list.totalApplicants}</p>
                      </div>
                      <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/40">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Passed</span>
                        <p className="text-base font-black text-emerald-300 mt-0.5">{list.passedApplicants}</p>
                      </div>
                      <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/40">
                        <span className="text-[10px] uppercase font-bold text-amber-400">Pending</span>
                        <p className="text-base font-black text-amber-300 mt-0.5">{list.pendingApplicants}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {list.totalApplicants > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Pass Rate</span>
                          <span className="text-emerald-400 font-bold">{passPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${passPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Prominent Open Button */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(list.lastUpdated || list.createdAt).toLocaleDateString()}</span>
                    </span>

                    <button
                      onClick={() => onSelectList(list)}
                      className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer transform group-hover:translate-x-0.5"
                    >
                      <span>Click to Open</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. MODAL: CREATE RECRUITMENT LIST */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-blue-700/60 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900/50 text-cyan-400 flex items-center justify-center border border-blue-700/50">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Create Recruitment List</h3>
                  <p className="text-[11px] text-slate-400">Add a new recruitment year workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="mt-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Year Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Quick Year Selection
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['2025', '2026', '2027', '2028'].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setListName(`RECRUITMENT ${year}`)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        listName === `RECRUITMENT ${year}`
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-xs'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Recruitment List Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RECRUITMENT 2026"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-slate-400">
                  This will be the title shown on the recruitment list card and report headers.
                </p>
              </div>

              {/* School Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  School Name
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Branch Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Campus / Branch Location
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30 disabled:opacity-50"
                >
                  {submitting ? 'Creating List...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT / RENAME RECRUITMENT LIST */}
      {isEditModalOpen && listToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-blue-700/60 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900/50 text-cyan-400 flex items-center justify-center border border-blue-700/50">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Edit Recruitment List</h3>
                  <p className="text-[11px] text-slate-400">Update list details or year title</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setListToEdit(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateList} className="mt-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Recruitment List Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  School Name
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Campus / Branch Location
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setListToEdit(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30 disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: DELETE CONFIRMATION */}
      {listToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-red-950/70 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-800">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-white">Delete Recruitment List</h3>
            <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed bg-red-950/40 p-3 rounded-xl border border-red-900/60">
              Are you sure you want to delete <strong className="text-white">"{listToDelete.name}"</strong>?
              All <strong>{listToDelete.totalApplicants}</strong> applicant records contained in this list will also be permanently deleted.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setListToDelete(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                disabled={submitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
