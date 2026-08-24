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
  Edit3,
  Plus,
  Check,
  X,
  Tag,
  Sliders,
} from 'lucide-react';
import { SystemSettings, UserRole, BrandingPreset, ThemePreset } from '../types';
import {
  fetchSettings,
  updateSettings,
  resetAllUsers,
  deleteMyAccount,
  uploadSystemLogo,
  uploadSystemBackground,
  uploadSplashBackground,
  deleteLogoPreset,
  renameLogoPreset,
  deleteDashboardBgPreset,
  renameDashboardBgPreset,
  deleteSplashBgPreset,
  renameSplashBgPreset,
  addThemePreset,
  deleteThemePreset,
  renameThemePreset,
} from '../lib/api';
import { getThemeGradientClass } from './DashboardView';

interface Props {
  userRole: UserRole;
  onSettingsUpdated: (newSettings: SystemSettings) => void;
  onAccountsResetNeeded?: () => void;
  onAccountDeleted?: () => void;
}

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
  const [systemName, setSystemName] = useState<string>('STUDENT RECRUITMENT MANAGEMENT SYSTEM');
  const [schoolLocation, setSchoolLocation] = useState<string>('TALISAY, CEBU, PHILIPPINES');
  const [academicYear, setAcademicYear] = useState<string>('SY 2026-2027 Recruitment');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>('/school-logo.png');
  const [maxExamScore, setMaxExamScore] = useState<number>(100);

  // Theme states
  const [dashboardBgTheme, setDashboardBgTheme] = useState<SystemSettings['dashboardBgTheme']>('custom');
  const [dashboardBgGradient, setDashboardBgGradient] = useState<string>('from-[#1E3A8A] via-[#1D4ED8] to-[#172554]');
  const [dashboardBgImageUrl, setDashboardBgImageUrl] = useState<string>('/school-campus-background.jpg');

  // Splash Screen Background State (Independently Configurable)
  const [splashBgImageUrl, setSplashBgImageUrl] = useState<string>('/school-sunset-background.jpg');

  // Persistent Customization Presets
  const [logoPresets, setLogoPresets] = useState<BrandingPreset[]>([]);
  const [dashboardBgPresets, setDashboardBgPresets] = useState<BrandingPreset[]>([]);
  const [splashBgPresets, setSplashBgPresets] = useState<BrandingPreset[]>([]);
  const [customThemePresets, setCustomThemePresets] = useState<ThemePreset[]>([]);

  // Pending Upload Buffers & Names
  const [pendingLogoBase64, setPendingLogoBase64] = useState<string | null>(null);
  const [pendingLogoMime, setPendingLogoMime] = useState<string | null>(null);
  const [pendingLogoPresetName, setPendingLogoPresetName] = useState<string>('');

  const [pendingBgBase64, setPendingBgBase64] = useState<string | null>(null);
  const [pendingBgMime, setPendingBgMime] = useState<string | null>(null);
  const [pendingBgPresetName, setPendingBgPresetName] = useState<string>('');

  const [pendingSplashBgBase64, setPendingSplashBgBase64] = useState<string | null>(null);
  const [pendingSplashBgMime, setPendingSplashBgMime] = useState<string | null>(null);
  const [pendingSplashBgPresetName, setPendingSplashBgPresetName] = useState<string>('');

  // Preset Renaming Modal/Inline State
  const [editingPreset, setEditingPreset] = useState<{
    type: 'logo' | 'dashboardBg' | 'splashBg' | 'theme';
    id: string;
    name: string;
  } | null>(null);

  // Preset Deletion Confirmation Modal State
  const [presetToDelete, setPresetToDelete] = useState<{
    type: 'logo' | 'dashboardBg' | 'splashBg' | 'theme';
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);

  // New Custom Theme Form State
  const [showAddThemeModal, setShowAddThemeModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeGradient, setNewThemeGradient] = useState('from-[#1E3A8A] via-[#1D4ED8] to-[#172554]');
  const [newThemeColorBadge, setNewThemeColorBadge] = useState('bg-[#1E3A8A]');

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resettingAccounts, setResettingAccounts] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applySettingsToState = (s: SystemSettings) => {
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
    if (s.logoPresets) setLogoPresets(s.logoPresets);
    if (s.dashboardBgPresets) setDashboardBgPresets(s.dashboardBgPresets);
    if (s.splashBgPresets) setSplashBgPresets(s.splashBgPresets);
    if (s.customThemePresets) setCustomThemePresets(s.customThemePresets);
  };

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        applySettingsToState(s);
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

    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const autoPresetName = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingLogoBase64(result);
        setPendingLogoMime(file.type || 'image/png');
        setPendingLogoPresetName(autoPresetName || 'Custom School Logo');
        setSchoolLogoUrl(result);
        setSuccess('New logo loaded into preview. Click "Save All Settings" or save preset to persist permanently.');
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

    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const autoPresetName = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingBgBase64(result);
        setPendingBgMime(file.type || 'image/jpeg');
        setPendingBgPresetName(autoPresetName || 'Custom Campus Background');
        setDashboardBgImageUrl(result);
        setDashboardBgTheme('custom');
        setSuccess('Dashboard background loaded into preview. Click "Save All Settings" to persist permanently.');
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

    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const autoPresetName = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPendingSplashBgBase64(result);
        setPendingSplashBgMime(file.type || 'image/jpeg');
        setPendingSplashBgPresetName(autoPresetName || 'Custom Splash Campus Background');
        setSplashBgImageUrl(result);
        setSuccess('Splash screen background loaded into preview. Click "Save All Settings" to persist permanently.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset Selection Handlers
  const handleSelectLogoPreset = async (preset: BrandingPreset) => {
    setSchoolLogoUrl(preset.url);
    setPendingLogoBase64(null);
    setPendingLogoMime(null);
    setPendingLogoPresetName('');
    if (isSuperAdmin) {
      try {
        setActionLoading(true);
        const updated = await updateSettings({ schoolLogoUrl: preset.url });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess(`Applied "${preset.name}" as the active system logo.`);
      } catch (err: any) {
        setError(err.message || 'Failed to apply logo preset');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSelectDashboardBgPreset = async (preset: BrandingPreset) => {
    setDashboardBgImageUrl(preset.url);
    setDashboardBgTheme('custom');
    setPendingBgBase64(null);
    setPendingBgMime(null);
    setPendingBgPresetName('');
    if (isSuperAdmin) {
      try {
        setActionLoading(true);
        const updated = await updateSettings({
          dashboardBgImageUrl: preset.url,
          dashboardBgTheme: 'custom',
        });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess(`Applied "${preset.name}" as the active dashboard background.`);
      } catch (err: any) {
        setError(err.message || 'Failed to apply dashboard background preset');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSelectSplashBgPreset = async (preset: BrandingPreset) => {
    setSplashBgImageUrl(preset.url);
    setPendingSplashBgBase64(null);
    setPendingSplashBgMime(null);
    setPendingSplashBgPresetName('');
    if (isSuperAdmin) {
      try {
        setActionLoading(true);
        const updated = await updateSettings({ splashBgImageUrl: preset.url });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess(`Applied "${preset.name}" as the active splash screen background.`);
      } catch (err: any) {
        setError(err.message || 'Failed to apply splash background preset');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSelectThemePreset = async (preset: ThemePreset) => {
    setDashboardBgTheme(preset.id as any);
    setDashboardBgGradient(preset.gradient);
    setDashboardBgImageUrl('');
    setPendingBgBase64(null);
    setPendingBgMime(null);
    setPendingBgPresetName('');
    if (isSuperAdmin) {
      try {
        setActionLoading(true);
        const updated = await updateSettings({
          dashboardBgTheme: preset.id as any,
          dashboardBgGradient: preset.gradient,
          dashboardBgImageUrl: '',
        });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess(`Applied color theme "${preset.name}".`);
      } catch (err: any) {
        setError(err.message || 'Failed to apply theme preset');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Preset Deletion Confirmation & Handler
  const handleConfirmDeletePreset = async () => {
    if (!presetToDelete) return;
    const { type, id, name, isActive } = presetToDelete;
    try {
      setActionLoading(true);
      let updated: SystemSettings;
      if (type === 'logo') {
        updated = await deleteLogoPreset(id);
      } else if (type === 'dashboardBg') {
        updated = await deleteDashboardBgPreset(id);
      } else if (type === 'splashBg') {
        updated = await deleteSplashBgPreset(id);
      } else {
        updated = await deleteThemePreset(id);
      }
      applySettingsToState(updated);
      onSettingsUpdated(updated);
      setPresetToDelete(null);
      if (isActive) {
        setSuccess(`Permanently removed preset "${name}". The system automatically reverted to the built-in default asset.`);
      } else {
        setSuccess(`Deleted preset "${name}" permanently from saved presets.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete preset.');
    } finally {
      setActionLoading(false);
    }
  };

  // Preset Renaming Handler
  const handleSaveRenamePreset = async () => {
    if (!editingPreset || !editingPreset.name.trim()) return;
    try {
      setActionLoading(true);
      let updated: SystemSettings;
      const { type, id, name } = editingPreset;
      if (type === 'logo') {
        updated = await renameLogoPreset(id, name.trim());
      } else if (type === 'dashboardBg') {
        updated = await renameDashboardBgPreset(id, name.trim());
      } else if (type === 'splashBg') {
        updated = await renameSplashBgPreset(id, name.trim());
      } else {
        updated = await renameThemePreset(id, name.trim());
      }
      applySettingsToState(updated);
      onSettingsUpdated(updated);
      setEditingPreset(null);
      setSuccess(`Renamed preset to "${name.trim()}".`);
    } catch (err: any) {
      setError(err.message || 'Failed to rename preset.');
    } finally {
      setActionLoading(false);
    }
  };

  // Custom Theme Creation Handler
  const handleCreateThemePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) {
      setError('Theme name is required.');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await addThemePreset({
        name: newThemeName.trim(),
        gradient: newThemeGradient.trim(),
        colorBadge: newThemeColorBadge.trim(),
      });
      applySettingsToState(updated);
      onSettingsUpdated(updated);
      setShowAddThemeModal(false);
      setNewThemeName('');
      setSuccess(`Created and saved new theme preset "${newThemeName.trim()}".`);
    } catch (err: any) {
      setError(err.message || 'Failed to create theme preset.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSplashBgToDefault = async () => {
    setSplashBgImageUrl('/school-sunset-background.jpg');
    setPendingSplashBgBase64(null);
    setPendingSplashBgMime(null);
    setPendingSplashBgPresetName('');
    if (isSuperAdmin) {
      try {
        const updated = await updateSettings({ splashBgImageUrl: '/school-sunset-background.jpg' });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess('Splash background reset to official school sunset default.');
      } catch (err: any) {
        setError(err.message || 'Failed to reset splash background');
      }
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all branding, titles, and backgrounds to default school values?')) return;
    setSchoolName('Sisters of Mary School-Girlstown, Inc.');
    setSubTitle('Internal Student Recruitment & Information Management System');
    setSystemName('STUDENT RECRUITMENT MANAGEMENT SYSTEM');
    setSchoolLocation('TALISAY, CEBU, PHILIPPINES');
    setAcademicYear('SY 2026-2027 Recruitment');
    setSchoolLogoUrl('/school-logo.png');
    setMaxExamScore(100);
    setDashboardBgTheme('custom');
    setDashboardBgGradient('from-[#1E3A8A] via-[#1D4ED8] to-[#172554]');
    setDashboardBgImageUrl('/school-campus-background.jpg');
    setSplashBgImageUrl('/school-sunset-background.jpg');
    setPendingLogoBase64(null);
    setPendingLogoMime(null);
    setPendingLogoPresetName('');
    setPendingBgBase64(null);
    setPendingBgMime(null);
    setPendingBgPresetName('');
    setPendingSplashBgBase64(null);
    setPendingSplashBgMime(null);
    setPendingSplashBgPresetName('');

    if (isSuperAdmin) {
      try {
        setSaving(true);
        const updated = await updateSettings({
          schoolName: 'Sisters of Mary School-Girlstown, Inc.',
          subTitle: 'Internal Student Recruitment & Information Management System',
          systemName: 'STUDENT RECRUITMENT MANAGEMENT SYSTEM',
          schoolLocation: 'TALISAY, CEBU, PHILIPPINES',
          academicYear: 'SY 2026-2027 Recruitment',
          schoolLogoUrl: '/school-logo.png',
          maxExamScore: 100,
          dashboardBgTheme: 'custom',
          dashboardBgGradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#172554]',
          dashboardBgImageUrl: '/school-campus-background.jpg',
          splashBgImageUrl: '/school-sunset-background.jpg',
        });
        applySettingsToState(updated);
        onSettingsUpdated(updated);
        setSuccess('Settings reset to official school defaults and saved permanently.');
      } catch (err: any) {
        setError(err.message || 'Failed to reset settings.');
      } finally {
        setSaving(false);
      }
    }
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
        const logoRes = await uploadSystemLogo(
          pendingLogoBase64,
          pendingLogoMime || undefined,
          pendingLogoPresetName || undefined
        );
        activeLogoUrl = logoRes.logoUrl;
      }

      // 2. Upload custom dashboard background if a new one is pending
      let activeBgUrl = dashboardBgImageUrl;
      if (pendingBgBase64) {
        const bgRes = await uploadSystemBackground(
          pendingBgBase64,
          pendingBgMime || undefined,
          pendingBgPresetName || undefined
        );
        activeBgUrl = bgRes.backgroundUrl;
      }

      // 3. Upload custom splash background if a new one is pending
      let activeSplashBgUrl = splashBgImageUrl;
      if (pendingSplashBgBase64) {
        const splashRes = await uploadSplashBackground(
          pendingSplashBgBase64,
          pendingSplashBgMime || undefined,
          pendingSplashBgPresetName || undefined
        );
        activeSplashBgUrl = splashRes.splashBackgroundUrl;
      }

      // 4. Save all updated metadata & theme settings
      await updateSettings({
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

      // 5. Fetch clean fresh settings from database to synchronize all preset collections
      const fresh = await fetchSettings();
      applySettingsToState(fresh);

      setPendingLogoBase64(null);
      setPendingLogoMime(null);
      setPendingLogoPresetName('');
      setPendingBgBase64(null);
      setPendingBgMime(null);
      setPendingBgPresetName('');
      setPendingSplashBgBase64(null);
      setPendingSplashBgMime(null);
      setPendingSplashBgPresetName('');

      setSuccess('All system branding, configurations, and preset collections saved permanently across all browsers and sessions!');
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
          <p className="text-xs text-gray-500 font-semibold">Loading System Settings & Presets...</p>
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
            <h2 className="font-extrabold text-lg text-gray-900">System Branding & Customization Presets</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Customize school identity, persistent logo presets, dashboard backgrounds, splash screen presets, and color themes.
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
            You are currently logged in as a <strong>{userRole}</strong>. Settings are in read-only mode. Only <strong>Super Administrators</strong> can update system configurations and manage presets.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1">{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
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
              src={schoolLogoUrl || '/school-logo.png'}
              alt="School Logo Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/school-logo.png';
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
                placeholder="e.g. TALISAY, CEBU, PHILIPPINES"
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

        {/* SECTION 2: Branding & Appearance Customization Presets */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs p-6 space-y-8">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#1E3A8A]" />
            <span>2. Branding & Appearance Presets</span>
          </h3>

          {/* 2A: System Official Logo & Saved Presets */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                  <span>System Official Logo & Saved Presets</span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Uploaded logos are automatically retained in the presets collection with permanent database storage.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 w-fit">
                {logoPresets.length} Saved Presets
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Active Logo Preview Box */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-2 shadow-xs">
                <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={schoolLogoUrl}
                    alt="Current Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/school-logo.png';
                    }}
                  />
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs" title="Active">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-gray-900">Current Active Logo</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">{schoolLogoUrl}</p>
                </div>
              </div>

              {/* Upload New Logo Box */}
              <div className="md:col-span-2 space-y-3 text-xs bg-white p-4 rounded-2xl border border-gray-200">
                <label className="block font-bold text-gray-800 uppercase">
                  Upload New Logo (Auto-Saved to Presets)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] border border-blue-200 font-bold rounded-xl transition-all inline-flex items-center justify-center gap-2 shadow-xs shrink-0">
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
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={pendingLogoPresetName}
                    onChange={(e) => setPendingLogoPresetName(e.target.value)}
                    placeholder="Optional preset label name..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  PNG, SVG, or JPG (Max 5MB). Once uploaded and saved, it is automatically cataloged in the presets collection below.
                </p>
              </div>
            </div>

            {/* Saved Logo Presets Grid */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="block font-extrabold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>Saved Logo Presets Collection</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {logoPresets.map((preset) => {
                  const isActive = schoolLogoUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 bg-white rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] shadow-sm bg-blue-50/40'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-white p-1 rounded-lg border border-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/school-logo.png';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-gray-900 truncate">{preset.name}</p>
                            {preset.isDefault && (
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 mt-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && isSuperAdmin && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSelectLogoPreset(preset)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Apply
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPreset({
                                type: 'logo',
                                id: preset.id,
                                name: preset.name,
                              })
                            }
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-gray-100 rounded-lg transition-all"
                            title="Rename Preset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!preset.isDefault && isSuperAdmin && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              setPresetToDelete({
                                type: 'logo',
                                id: preset.id,
                                name: preset.name,
                                isActive,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2B: Normal System / Dashboard Background & Themes */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-gray-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Dashboard Backgrounds & Theme Presets</span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Controls normal workspace theme banner and background. Presets are permanently saved in database.
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddThemeModal(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Theme Preset</span>
                </button>
              )}
            </div>

            {/* Color Theme Presets */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-700 text-xs uppercase tracking-wider">
                Color Gradient Theme Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customThemePresets.map((p) => {
                  const isSelected = dashboardBgTheme === p.id && !dashboardBgImageUrl;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 bg-white rounded-xl border text-left transition-all flex flex-col justify-between h-24 relative overflow-hidden ${
                        isSelected
                          ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] shadow-sm bg-blue-50/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-full h-5 rounded-lg bg-gradient-to-r ${p.gradient}`} />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] text-gray-900 truncate">{p.name}</p>
                          {isSelected ? (
                            <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{p.isDefault ? 'Built-in' : 'Custom'}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isSelected && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleSelectThemePreset(p)}
                              className="px-2 py-1 bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Apply
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPreset({
                                  type: 'theme',
                                  id: p.id,
                                  name: p.name,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-blue-700"
                              title="Rename Theme"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          {!p.isDefault && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() =>
                                setPresetToDelete({
                                  type: 'theme',
                                  id: p.id,
                                  name: p.name,
                                  isActive: isSelected,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                              title="Delete Theme"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dashboard Background Presets */}
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Dashboard Campus Background Presets</span>
                </label>
                <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {dashboardBgPresets.length} Presets
                </span>
              </div>

              {/* Upload Dashboard Background Box */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                <label className="block font-bold text-gray-800 text-xs uppercase">
                  Upload New Dashboard Background (Auto-Saved to Presets)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-blue-50 hover:bg-[#1E3A8A] hover:text-white text-[#1E3A8A] border border-blue-200 font-bold rounded-xl transition-all inline-flex items-center justify-center gap-2 shadow-xs shrink-0 text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Choose Dashboard Image...</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!isSuperAdmin}
                      onChange={handleBgFileUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={pendingBgPresetName}
                    onChange={(e) => setPendingBgPresetName(e.target.value)}
                    placeholder="Optional preset label name..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  />
                </div>
              </div>

              {/* Dashboard Background Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardBgPresets.map((preset) => {
                  const isActive = dashboardBgImageUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 bg-white rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isActive
                          ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] shadow-sm bg-blue-50/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-full h-20 rounded-lg bg-cover bg-center border border-gray-200 relative overflow-hidden"
                        style={{ backgroundImage: `url(${preset.url})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 to-blue-900/40" />
                        <div className="absolute bottom-1.5 left-2 right-2 text-white">
                          <p className="text-[11px] font-bold truncate drop-shadow">{preset.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                        <div>
                          {isActive ? (
                            <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{preset.isDefault ? 'Built-in' : 'Custom'}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!isActive && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleSelectDashboardBgPreset(preset)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Apply
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPreset({
                                  type: 'dashboardBg',
                                  id: preset.id,
                                  name: preset.name,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-blue-700"
                              title="Rename Preset"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!preset.isDefault && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() =>
                                setPresetToDelete({
                                  type: 'dashboardBg',
                                  id: preset.id,
                                  name: preset.name,
                                  isActive,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                              title="Delete Preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2C: Splash Screen Background Presets (Completely Separate) */}
          <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-xs text-[#1E3A8A] uppercase tracking-wider flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Splash Screen Background Presets (Separate Customization)</span>
                </h4>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Controls the full-screen institutional splash screen when users load the recruitment system.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetSplashBgToDefault}
                className="px-3 py-1.5 bg-white hover:bg-blue-100 text-[#1E3A8A] font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Sunset</span>
              </button>
            </div>

            {/* Upload Splash Background Box */}
            <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-3">
              <label className="block font-bold text-gray-800 text-xs uppercase">
                Upload New Splash Screen Background (Auto-Saved to Presets)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label className="cursor-pointer px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-800 text-white font-bold rounded-xl transition-all inline-flex items-center justify-center gap-2 shadow-xs shrink-0 text-xs">
                  <Upload className="w-4 h-4 text-cyan-300" />
                  <span>Choose Splash Image...</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isSuperAdmin}
                    onChange={handleSplashBgFileUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={pendingSplashBgPresetName}
                  onChange={(e) => setPendingSplashBgPresetName(e.target.value)}
                  placeholder="Optional preset label name..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                PNG, JPG, WebP (Max 8MB). Automatically retained in the splash presets collection below.
              </p>
            </div>

            {/* Splash Background Presets Grid */}
            <div className="space-y-2 pt-2 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Saved Splash Screen Background Presets</span>
                </label>
                <span className="text-[11px] font-bold text-[#1E3A8A] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                  {splashBgPresets.length} Presets
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {splashBgPresets.map((preset) => {
                  const isActive = splashBgImageUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 bg-white rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isActive
                          ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] shadow-sm bg-blue-50/40'
                          : 'border-blue-100 hover:border-blue-200'
                      }`}
                    >
                      <div
                        className="w-full h-24 rounded-lg bg-cover bg-center border border-gray-200 relative overflow-hidden"
                        style={{ backgroundImage: `url(${preset.url})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1E48]/50 via-[#0D2866]/40 to-[#071330]/70" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white">
                          <p className="text-[10px] font-black tracking-widest text-cyan-300 uppercase drop-shadow">
                            Splash Preview
                          </p>
                          <p className="text-[11px] font-extrabold truncate drop-shadow max-w-full">
                            {preset.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                        <div>
                          {isActive ? (
                            <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{preset.isDefault ? 'Built-in' : 'Custom'}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!isActive && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleSelectSplashBgPreset(preset)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Apply
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPreset({
                                  type: 'splashBg',
                                  id: preset.id,
                                  name: preset.name,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-blue-700"
                              title="Rename Preset"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!preset.isDefault && isSuperAdmin && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() =>
                                setPresetToDelete({
                                  type: 'splashBg',
                                  id: preset.id,
                                  name: preset.name,
                                  isActive,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                              title="Delete Preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

        {/* SECTION 4: User Accounts Reset (Keeps Logo, Backgrounds, Presets & Settings) */}
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
                  Customized Logo, School Name, Presets & Backgrounds Will Remain Saved!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Need to recreate or reset account credentials? You can safely reset existing user accounts to trigger the administrator setup modal. <strong>Your uploaded logo emblem, school name, presets, dashboard background, and splash screen background will remain completely untouched.</strong>
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

        {/* Delete My Account Section for Non-Super Admin Staff */}
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

      {/* Rename Preset Modal */}
      {editingPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#1E3A8A]" />
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">Rename Preset</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPreset(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Preset Label Name
              </label>
              <input
                type="text"
                autoFocus
                value={editingPreset.name}
                onChange={(e) =>
                  setEditingPreset({
                    ...editingPreset,
                    name: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPreset(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !editingPreset.name.trim()}
                onClick={handleSaveRenamePreset}
                className="px-5 py-2 bg-[#1E3A8A] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>Save New Name</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Theme Modal */}
      {showAddThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateThemePreset}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#1E3A8A]" />
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">Create Custom Theme Preset</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddThemeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Theme Name</label>
                <input
                  type="text"
                  required
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="e.g. Cardinal Red & Gold"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Gradient Classes</label>
                <input
                  type="text"
                  required
                  value={newThemeGradient}
                  onChange={(e) => setNewThemeGradient(e.target.value)}
                  placeholder="from-[#800000] via-[#A52A2A] to-[#4A0404]"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Color Badge Class</label>
                <input
                  type="text"
                  value={newThemeColorBadge}
                  onChange={(e) => setNewThemeColorBadge(e.target.value)}
                  placeholder="bg-[#800000]"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>

              {/* Live Gradient Preview in Modal */}
              <div>
                <label className="block font-bold text-gray-500 uppercase mb-1">Theme Preview</label>
                <div className={`w-full h-12 rounded-xl bg-gradient-to-r ${newThemeGradient} shadow-inner flex items-center justify-center text-white font-black text-xs drop-shadow`}>
                  {newThemeName || 'Sample Theme'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddThemeModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !newThemeName.trim()}
                className="px-5 py-2 bg-[#1E3A8A] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>Create Theme</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Resetting Accounts */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
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
                Branding, Presets & Backgrounds Will Remain Preserved!
              </p>
              <p className="leading-relaxed">
                Resetting will clear user login accounts so you can register a new administrator account. <strong>Your customized school logo, presets collection, school name, dashboard background, and splash screen background will stay completely saved!</strong>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
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

      {/* Confirmation Modal for Deleting Saved Preset */}
      {presetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200 shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base text-gray-900">Delete this saved preset?</h3>
                <p className="text-xs text-gray-500 font-semibold truncate max-w-[280px]">
                  {presetToDelete.name}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-950 space-y-2">
              <p className="leading-relaxed font-medium">
                This customization will be removed from your saved presets and can no longer be selected.
              </p>
              {presetToDelete.isActive && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Notice:</strong> This preset is currently active. Deleting it will automatically revert the system to the built-in default asset.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setPresetToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeletePreset}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                {actionLoading ? (
                  <span>Deleting Preset...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
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
