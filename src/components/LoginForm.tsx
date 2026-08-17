import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { loginUser, fetchSettings, resetAllUsers } from '../lib/api';
import { User as UserType, SystemSettings } from '../types';

interface Props {
  onSuccess: (user: UserType, token: string) => void;
  onResetAccounts?: () => void;
  systemSettings?: SystemSettings;
}

export const LoginForm: React.FC<Props> = ({ onSuccess, onResetAccounts, systemSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (systemSettings && systemSettings.schoolName) {
      return systemSettings;
    }
    return {
      schoolName: 'Sisters of Mary School-Girlstown, Inc.',
      subTitle: 'Internal Student Recruitment & Information Management System',
      schoolLogoUrl: '/school_logo.png',
      maxExamScore: 100,
    };
  });

  useEffect(() => {
    if (systemSettings && systemSettings.schoolName) {
      setSettings(systemSettings);
    } else {
      fetchSettings()
        .then((s) => {
          if (s) setSettings(s);
        })
        .catch((err) => console.error('Error loading settings in login form:', err));
    }
  }, [systemSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const res = await loginUser(username, password);
      onSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = settings.schoolLogoUrl || '/school_logo.png';
  const schoolName = settings.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const subTitle = settings.subTitle || 'Student Information Management System';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* School Emblem Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8 space-y-6">
          <div className="text-center space-y-3">
            {/* Official School Logo */}
            <div className="w-24 h-24 mx-auto flex items-center justify-center p-1 bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <img
                src={logoSrc}
                alt={`${schoolName} Logo`}
                className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/school_logo.png'; }}
              />
            </div>

            <div>
              <h1 className="text-xl font-black text-[#1E3A8A] leading-snug">
                {schoolName}
              </h1>
              <p className="text-xs uppercase tracking-wider text-blue-800 font-bold mt-1">
                {subTitle}
              </p>
            </div>

            <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-blue-900 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-200/80 font-semibold">
              <Shield className="w-3.5 h-3.5 shrink-0 text-[#1E3A8A]" />
              <span>Internal Authorized Personnel Portal</span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Log In to System</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-[11px] font-medium text-gray-400 border-t border-gray-100 flex flex-col gap-2">
            <div>
              {schoolName} &copy; {new Date().getFullYear()}
            </div>
            {onResetAccounts && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-blue-800 hover:text-[#1E3A8A] font-bold underline transition-all cursor-pointer text-[11px] inline-flex items-center justify-center gap-1 mt-1"
              >
                <RefreshCw className="w-3 h-3 text-blue-800" />
                <span>Reset User Accounts & Setup New Permanent Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Accounts */}
      {showResetConfirm && (
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
                Branding & Background Will Remain Preserved!
              </p>
              <p className="leading-relaxed">
                Resetting will clear existing user login accounts so you can register your new permanent admin. <strong>Your customized school logo, school name, and dashboard background image/theme will stay completely saved!</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  try {
                    setResetting(true);
                    await resetAllUsers();
                    setShowResetConfirm(false);
                    if (onResetAccounts) onResetAccounts();
                  } catch (err: any) {
                    setError(err.message || 'Failed to reset user accounts.');
                  } finally {
                    setResetting(false);
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {resetting ? (
                  <span>Resetting...</span>
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
    </div>
  );
};
