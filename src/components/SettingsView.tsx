import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Building2,
  Image as ImageIcon,
  Palette,
  Award,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Shield,
  Upload,
  Eye,
  RefreshCw,
  MonitorPlay,
  MapPin,
  Trash2,
  UserX,
} from 'lucide-react';
import { SystemSettings, UserRole } from '../types';
import {
  fetchSettings,
  updateSettings,
  resetAllUsers,
  deleteMyAccount,
  uploadSystemLogo,
  uploadSystemBackground,
  uploadSplashBackground,
} from '../lib/api';
import { getThemeGradientClass } from './DashboardView';

interface Props {
  userRole: UserRole;
  onSettingsUpdated: (newSettings: SystemSettings) => void;
  onAccountsResetNeeded?: () => void;
  onAccountDeleted?: () => void;
}

const THEME_PRESETS = [
  {
    id: 'royal-blue',
    name: 'Institutional Royal Blue',
    gradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
    colorBadge: 'bg-[#1E3A8A]',
  },
  {
    id: 'navy-gold',
    name: 'Navy & Amber Gold',
    gradient: 'from-[#0F172A] via-[#1E3A8A] to-[#D97706]',
    colorBadge: 'bg-[#0F172A]',
  },
  {
    id: 'emerald',
    name: 'Academic Emerald',
    gradient: 'from-[#064E3B] via-[#047857] to-[#022c22]',
    colorBadge: 'bg-[#064E3B]',
  },
  {
    id: 'burgundy',
    name: 'Classic Burgundy',
    gradient: 'from-[#691B23] via-[#881337] to-[#4c0519]',
    colorBadge: 'bg-[#691B23]',
  },
  {
    id: 'slate',
    name: 'Slate Tech',
    gradient: 'from-[#1e293b] via-[#334155] to-[#0f172a]',
    colorBadge: 'bg-[#334155]',
  },
];

export const SettingsView: React.FC<Props> = ({
  userRole,
  onSettingsUpdated,
  onAccountsResetNeeded,
  onAccountDeleted,
}) => {
  const isSuperAdmin = userRole === 'Super Administrator';

  // Form States
  const [schoolName, setSchoolName] = useState<string>('Sisters of Mary School-Girlstown, Inc.');
  const [subTitle, setSubTitle] = useState<string>('Internal Student Recruitment & Information Management System');
  const [systemName, setSystemName] = useState<string>('MALE STUDENT RECRUITMENT MANAGEMENT SYSTEM');
  const [schoolLocation, setSchoolLocation] = useState<string>('ADLAS, SILANG, CAVITE, PHILIPPINES');
  const [academicYear, setAcademicYear] = useState<string>('SY 2026-2027 Recruitment');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>('/school_logo.png');
  const [maxExamScore, setMaxExamScore] = useState<number>(100);

  // Theme states
  const [dashboardBgTheme, setDashboardBgTheme] = useState<SystemSettings['dashboardBgTheme']>('custom');
  const [dashboardBgGradient, setDashboardBgGradient] = useState<string>('from-[#1E3A8A] via-[#1D4ED8] to-[#172554]');
  const [dashboardBgImageUrl, setDashboardBgImageUrl] = useState<string>('/dashboard_bg.jpg');

  // Splash Screen Background State (Independently Configurable)
  const [splashBgImageUrl, setSplashBgImageUrl] = useState<string>('/dashboard_bg.jpg');

  // Pending Upload Buffers
  const [pendingLogoBase64, setPendingLogoBase64] = useState<string | null>(null);
  const [pendingLogoMime, setPendingLogoMime] = useState<string | null>(null);
  const [pendingBgBase64, setPendingBgBase64] = useState<string | null>(null);
  const [pendingBgMime, setPendingBgMime] = useState<string | null>(null);
  const [pendingSplashBgBase64, setPendingSplashBgBase64] = useState<string | null>(null);
  const [pendingSplashBgMime, setPendingSplashBgMime] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingAccounts, setResettingAccounts] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (s.schoolName) setSchoolName(s.schoolName);
        if (s.subTitle) setSubTitle(s.subTitle);
        if (s.systemName) setSystemName(s.systemName);
        if (s.schoolLocation) setSchoolLocation(s.schoolLocation);
        if (s.academicYear) setAcademicYear(s.academicYear);
        if (s.schoolLogoUrl) setSchoolLogoUrl(s.schoolLogoUrl);
        if (s.maxExamScore) setMaxExamScore(s.maxExamScore);
        if (s.dashboardBgTheme) setDashboardBgTheme(s.dashboardBgTheme);
        if (s.dashboardBgGradient) setDashboardBgGradient(s.dashboardBgGradient);
        if (s.dashboardBgImageUrl !== undefined) setDashboardBgImageUrl(s.dashboardBgImageUrl);
        if (s.splashBgImageUrl !== undefined) setSplashBgImageUrl(s.splashBgImageUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // File Upload Handlers
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo image file must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingLogoBase64(result);
        setPendingLogoMime(file.type || 'image/png');
        setSchoolLogoUrl(result);
        setSuccess('New logo selected! Click "Save All Settings" to permanently save to database.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Background image file must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingBgBase64(result);
        setPendingBgMime(file.type || 'image/jpeg');
        setDashboardBgImageUrl(result);
        setDashboardBgTheme('custom');
        setSuccess('Dashboard background image selected! Click "Save All Settings" to permanently save to database.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSplashBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Splash background image file must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingSplashBgBase64(result);
        setPendingSplashBgMime(file.type || 'image/jpeg');
        setSplashBgImageUrl(result);
        setSuccess('Splash screen background image selected! Click "Save All Settings" to permanently save to database.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetTheme = (preset: typeof THEME_PRESETS[0]) => {
    setDashboardBgTheme(preset.id as any);
    setDashboardBgGradient(preset.gradient);
    setDashboardBgImageUrl('');
    setPendingBgBase64(null);
    setPendingBgMime(null);
  };

  const handleResetSplashBgToDefault = () => {
    setSplashBgImageUrl('/dashboard_bg.jpg');
    setPendingSplashBgBase64(null);
    setPendingSplashBgMime(null);
    setSuccess('Splash background set back to official campus default. Click "Save All Settings" to finalize.');
  };

  const handleResetToDefaults = () => {
    setSchoolName('Sisters of Mary School-Girlstown, Inc.');
    setSubTitle('Internal Student Recruitment & Information Management System');
    setSystemName('MALE STUDENT RECRUITMENT MANAGEMENT SYSTEM');
    setSchoolLocation('ADLAS, SILANG, CAVITE, PHILIPPINES');
    setAcademicYear('SY 2026-2027 Recruitment');
    setSchoolLogoUrl('/school_logo.png');
    setMaxExamScore(100);
    setDashboardBgTheme('custom');
    setDashboardBgGradient('from-[#1E3A8A] via-[#1D4ED8] to-[#172554]');
    setDashboardBgImageUrl('/dashboard_bg.jpg');
    setSplashBgImageUrl('/dashboard_bg.jpg');
    setPendingLogoBase64(null);
    setPendingLogoMime(null);
    setPendingBgBase64(null);
    setPendingBgMime(null);
    setPendingSplashBgBase64(null);
    setPendingSplashBgMime(null);
    setSuccess('Settings reset to official school defaults. Click "Save All Settings" to finalize and save.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setError(null);
    setSuccess(null);

    if (!schoolName.trim()) {
      setError('School Name cannot be empty.');
      return;
    }

    const scoreNum = Number(maxExamScore);
    if (isNaN(scoreNum) || scoreNum <= 0) {
      setError('Maximum exam score must be a positive number.');
      return;
    }

    try {
      setSaving(true);

      // 1. Upload custom logo if a new one is pending
      let activeLogoUrl = schoolLogoUrl;
      if (pendingLogoBase64) {
        const logoRes = await uploadSystemLogo(pendingLogoBase64, pendingLogoMime || undefined);
        activeLogoUrl = logoRes.logoUrl;
      }

      // 2. Upload custom dashboard background if a new one is pending
      let activeBgUrl = dashboardBgImageUrl;
      if (pendingBgBase64) {
        const bgRes = await uploadSystemBackground(pendingBgBase64, pendingBgMime || undefined);
        activeBgUrl = bgRes.backgroundUrl;
      }

      // 3. Upload custom splash background if a new one is pending
      let activeSplashBgUrl = splashBgImageUrl;
      if (pendingSplashBgBase64) {
        const splashRes = await uploadSplashBackground(pendingSplashBgBase64, pendingSplashBgMime || undefined);
        activeSplashBgUrl = splashRes.splashBackgroundUrl;
      }

      // 4. Save all updated metadata & theme settings
      const updated = await updateSettings({
        schoolName: schoolName.trim(),
        subTitle: subTitle.trim(),
        systemName: systemName.trim(),
        schoolLocation: schoolLocation.trim(),
        academicYear: academicYear.trim(),
        schoolLogoUrl: activeLogoUrl,
        maxExamScore: scoreNum,
        dashboardBgTheme,
        dashboardBgGradient,
        dashboardBgImageUrl: activeBgUrl,
        splashBgImageUrl: activeSplashBgUrl,
      });

      // 5. Fetch clean fresh settings from database
      const fresh = await fetchSettings();

      setPendingLogoBase64(null);
      setPendingLogoMime(null);
      setPendingBgBase64(null);
      setPendingBgMime(null);
      setPendingSplashBgBase64(null);
      setPendingSplashBgMime(null);
      setSchoolLogoUrl(fresh.schoolLogoUrl || activeLogoUrl);
      setDashboardBgImageUrl(fresh.dashboardBgImageUrl || activeBgUrl);
      setSplashBgImageUrl(fresh.splashBgImageUrl || activeSplashBgUrl);

      setSuccess('All system branding and configuration settings saved and persisted permanently across all browsers and sessions!');
      onSettingsUpdated(fresh);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold">Loading System Settings...</p>
        </div>
      </div>
    );
  }

  const previewThemeClass = getThemeGradientClass(dashboardBgTheme, dashboardBgGradient);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <Settings className="w-5 h-5 text-[#1E3A8A]" />
            <h2 className="font-extrabold text-lg text-gray-900">System Branding & Settings</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Customize school identity, logo emblem, dashboard header theme, splash screen background, and admissions exam rules.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
          </div>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-700 shrink-0" />
          <span>
            You are currently logged in as a <strong>{userRole}</strong>. Settings are in read-only mode. Only <strong>Super Administrators</strong> can update system configurations.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* LIVE DASHBOARD BANNER PREVIEW CARD */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-800">
            <Eye className="w-4 h-4 text-[#1E3A8A]" />
            <span>Live Dashboard Banner Preview</span>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Real-time Visual Feedback</span>
        </div>

        <div
          className={`${previewThemeClass} rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300`}
          style={
            dashboardBgImageUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.85), rgba(30,58,138,0.75)), url(${dashboardBgImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="space-y-2 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-blue-100 border border-white/15">
              <span>{academicYear || 'SY 2026-2027 Recruitment'}</span>
              <span>•</span>
              <span>{systemName || subTitle || 'Student Recruitment Portal'}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">{schoolName || 'School Name Placeholder'}</h2>
            <p className="text-[11px] text-blue-100/90 font-medium">
              {schoolLocation || 'ADLAS, SILANG, CAVITE, PHILIPPINES'}
            </p>
          </div>

          <div className="w-20 h-20 bg-white p-1.5 rounded-2xl shadow-lg border border-white/30 shrink-0 hidden sm:flex items-center justify-center relative z-10 overflow-hidden">
            <img
              src={schoolLogoUrl || '/school_logo.svg'}
              alt="School Logo Preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/school_logo.png';
              }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: School Identity & Names */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1E3A8A]" />
            <span>1. School Identity & Institutional Titles</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Official School Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Sisters of Mary School-Girlstown, Inc. or Sisters of Mary School Adlas, Inc."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-extrabold text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Appears on the splash screen, top header, sidebar, login portal, export reports, and student profiles.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Recruitment System Title</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="e.g. MALE STUDENT RECRUITMENT MANAGEMENT SYSTEM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-cyan-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Prominently displayed in cyan on the splash screen and system banners.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>School Location / Address</span>
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={schoolLocation}
                onChange={(e) => setSchoolLocation(e.target.value)}
                placeholder="e.g. ADLAS, SILANG, CAVITE, PHILIPPINES"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Displayed below the recruitment title on the splash screen and reports.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">System Subtitle / Scope</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="e.g. Internal Student Recruitment & Information Management"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Academic Batch / Recruitment Tag</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. SY 2026-2027 Recruitment"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Branding & Appearance (Logo, System Background, Splash Background) */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-6">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#1E3A8A]" />
            <span>2. Branding & Appearance Customization</span>
          </h3>

          {/* 2A: System Logo */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                <span>System Official Logo</span>
              </h4>
              <span className="text-[11px] font-semibold text-gray-500">Stored in Persistent Database</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Logo Preview Box */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-1.5 shadow-xs">
                <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={schoolLogoUrl}
                    alt="Current Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/school_logo.png';
                    }}
                  />
                </div>
                <p className="text-[10px] font-extrabold text-gray-700">Current Logo Preview</p>
              </div>

              {/* Logo Input Options */}
              <div className="md:col-span-2 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Upload New Logo (PNG, SVG, JPG)
                  </label>
                  <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] border border-blue-200 font-bold rounded-xl transition-all inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Choose Logo File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!isSuperAdmin}
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Quick Logo Presets</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSchoolLogoUrl('/school_logo.svg')}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-gray-800 hover:text-[#1E3A8A] font-bold rounded-lg transition-all text-[11px] border border-gray-200 cursor-pointer"
                    >
                      🏫 Official Vector SVG
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolLogoUrl('/school_logo.png')}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-gray-800 hover:text-[#1E3A8A] font-bold rounded-lg transition-all text-[11px] border border-gray-200 cursor-pointer"
                    >
                      🛡️ PNG Shield Emblem
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2B: Normal System / Dashboard Background */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#1E3A8A]" />
                <span>System / Dashboard Background & Theme</span>
              </h4>
              <span className="text-[11px] font-semibold text-gray-500">Normal Application Background</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-2">Color Theme Presets</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {THEME_PRESETS.map((p) => {
                    const isSelected = dashboardBgTheme === p.id && !dashboardBgImageUrl;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!isSuperAdmin}
                        onClick={() => handleSelectPresetTheme(p)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 relative overflow-hidden ${
                          isSelected
                            ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] shadow-sm bg-blue-50/50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-full h-5 rounded-lg bg-gradient-to-r ${p.gradient}`} />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-[11px] text-gray-900">{p.name}</span>
                          {isSelected && <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Upload New Dashboard Background
                  </label>
                  <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] border border-blue-200 font-bold rounded-xl transition-all inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Dashboard Image...</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!isSuperAdmin}
                      onChange={handleBgFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Current Dashboard Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={dashboardBgImageUrl}
                      onChange={(e) => {
                        setDashboardBgImageUrl(e.target.value);
                        if (e.target.value.trim()) setDashboardBgTheme('custom');
                      }}
                      placeholder="/dashboard_bg.jpg or https://..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl font-mono text-[11px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                    {dashboardBgImageUrl && (
                      <button
                        type="button"
                        onClick={() => setDashboardBgImageUrl('')}
                        className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2C: Splash Screen Background (Separate & Admin-Editable) */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-xs text-[#1E3A8A] uppercase tracking-wider flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Splash Screen Background (Separate Customization)</span>
                </h4>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Used specifically for the full-screen institutional splash screen when users load the application.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetSplashBgToDefault}
                className="px-3 py-1.5 bg-white hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-xs">
              {/* Splash Background Preview Thumbnail */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-blue-200 text-center space-y-2 shadow-xs">
                <div
                  className="w-full h-28 rounded-xl bg-cover bg-center border border-gray-300 relative overflow-hidden flex items-center justify-center shadow-inner"
                  style={{
                    backgroundImage: `url(${splashBgImageUrl || '/dashboard_bg.jpg'})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-blue-950/50 to-slate-900/60" />
                  <div className="relative z-10 text-white text-center px-2">
                    <p className="font-black text-xs uppercase tracking-wider text-cyan-300 drop-shadow">
                      Splash Preview
                    </p>
                    <p className="text-[10px] font-semibold text-blue-100 drop-shadow">
                      {schoolName.substring(0, 24)}...
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-extrabold text-gray-700">Active Splash Background</p>
              </div>

              {/* Splash Background Upload Controls */}
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Upload New Splash Background Image (File Upload)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-[#1E3A8A] hover:bg-blue-800 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-xs">
                      <Upload className="w-4 h-4 text-cyan-300" />
                      <span>Choose Splash Campus Image...</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!isSuperAdmin}
                        onChange={handleSplashBgFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">PNG, JPG, WebP (Max 8MB)</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Splash Background Image URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={splashBgImageUrl}
                      onChange={(e) => setSplashBgImageUrl(e.target.value)}
                      placeholder="/dashboard_bg.jpg or https://..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl font-mono text-[11px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                    <button
                      type="button"
                      onClick={handleResetSplashBgToDefault}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold rounded-xl text-xs"
                    >
                      Default
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-900/80 mt-1">
                    Persistent database storage ensures this background is shown to all users, new incognito tabs, and redeployments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Exam Configuration */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#1E3A8A]" />
            <span>3. Entrance Examination Rules</span>
          </h3>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Maximum Entrance Exam Score
            </label>
            <input
              type="number"
              min="1"
              disabled={!isSuperAdmin}
              value={maxExamScore}
              onChange={(e) => setMaxExamScore(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-extrabold text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Validation ceiling applied when entering student examination results in the encoding form.
            </p>
          </div>
        </div>

        {/* SECTION 4: User Accounts Reset (Keeps Logo, Backgrounds & Settings) */}
        {isSuperAdmin && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-amber-900 uppercase tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>4. Reset Accounts & Setup New Permanent Admin</span>
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#1E3A8A]" />
                  Customized Logo, School Name & Background Images Will Remain Saved!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Need to recreate or reset account credentials? You can safely reset existing user accounts to trigger the administrator setup modal. <strong>Your uploaded logo emblem, school name, dashboard background, and splash screen background will remain completely untouched.</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset All Accounts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <UserX className="w-4 h-4" />
                  <span>Delete My Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete My Account Section for Non-Super Admin Staff as well */}
        {!isSuperAdmin && (
          <div className="bg-red-50/70 border border-red-200 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-red-900 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-red-600" />
                  Delete My User Account & Records
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Permanently delete your personal staff account credentials and all student records encoded under your user ID.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <UserX className="w-4 h-4" />
                <span>Delete My Account</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isSuperAdmin && (
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Reset All
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{saving ? 'Saving System Settings...' : 'Save All Settings'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Footer Info */}
      <div className="p-4 bg-slate-50 border border-gray-200/80 rounded-2xl text-xs text-gray-600 space-y-1">
        <p className="font-bold text-gray-800 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-[#1E3A8A]" />
          Confidentiality & System Governance
        </p>
        <p className="leading-relaxed">
          All branding configurations, system rules, and applicant database records are strictly assigned to <strong>{schoolName}</strong>.
        </p>
      </div>

      {/* Confirmation Modal for Resetting Accounts */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200 shrink-0">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Reset User Accounts?</h3>
                <p className="text-xs text-gray-500 font-semibold">
                  Setup a new permanent administrator account
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-950 space-y-2">
              <p className="font-extrabold flex items-center gap-1.5 text-[#1E3A8A]">
                <Shield className="w-4 h-4 text-[#1E3A8A]" />
                Branding & Backgrounds Will Remain Preserved!
              </p>
              <p className="leading-relaxed">
                Resetting will clear user login accounts so you can register a new administrator account. <strong>Your customized school logo, school name, dashboard background, and splash screen background will stay completely saved!</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={resettingAccounts}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingAccounts}
                onClick={async () => {
                  try {
                    setResettingAccounts(true);
                    await resetAllUsers();
                    localStorage.removeItem('sms_last_account');
                    localStorage.removeItem('sms_auth_token');
                    setShowResetModal(false);
                    if (onAccountsResetNeeded) {
                      onAccountsResetNeeded();
                    } else {
                      window.location.reload();
                    }
                  } catch (err: any) {
                    setError(err.message || 'Failed to reset user accounts.');
                  } finally {
                    setResettingAccounts(false);
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                {resettingAccounts ? (
                  <span>Resetting Accounts...</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirm Account Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Single Account */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200 shrink-0">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Delete Your Account?</h3>
                <p className="text-xs text-gray-500 font-semibold">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-950 space-y-2">
              <p className="font-extrabold flex items-center gap-1.5 text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Permanent Data Deletion
              </p>
              <p className="leading-relaxed text-red-800">
                Deleting your account will permanently remove your login credentials and all student records encoded under your account from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={async () => {
                  try {
                    setDeletingAccount(true);
                    await deleteMyAccount();
                    localStorage.removeItem('sms_auth_token');
                    localStorage.removeItem('sms_last_account');
                    setShowDeleteAccountModal(false);
                    if (onAccountDeleted) {
                      onAccountDeleted();
                    } else {
                      window.location.reload();
                    }
                  } catch (err: any) {
                    setError(err.message || 'Failed to delete account.');
                  } finally {
                    setDeletingAccount(false);
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                {deletingAccount ? (
                  <span>Deleting Account...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete My Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
