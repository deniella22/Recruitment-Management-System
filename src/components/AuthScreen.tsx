import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Mail,
  AlertCircle,
  Shield,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { loginUser, registerAccount, resetAllUsers, fetchSettings } from '../lib/api';
import { User as UserType, SystemSettings, SavedAccountInfo } from '../types';

interface Props {
  onSuccess: (user: UserType, token: string, isNewAccount?: boolean) => void;
  onResetAccounts?: () => void;
  systemSettings?: SystemSettings;
}

export const AuthScreen: React.FC<Props> = ({ onSuccess, onResetAccounts, systemSettings }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Saved remembered account on this device
  const [savedAccount, setSavedAccount] = useState<SavedAccountInfo | null>(null);
  const [useManualLogin, setUseManualLogin] = useState(false);

  // Status & errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccountWarning, setExistingAccountWarning] = useState<{
    message: string;
    username?: string;
    email?: string;
  } | null>(null);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        .catch(() => {});
    }

    // Load saved remembered account from localStorage if available
    try {
      const saved = localStorage.getItem('sms_last_account');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          setSavedAccount(parsed);
          setLoginIdentifier(parsed.username);
        }
      }
    } catch (e) {
      // Ignore cache error
    }
  }, [systemSettings]);

  const saveRememberedAccount = (user: UserType) => {
    try {
      const accountInfo: SavedAccountInfo = {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem('sms_last_account', JSON.stringify(accountInfo));
      setSavedAccount(accountInfo);
    } catch (e) {
      // Ignore storage error
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccountWarning(null);

    const identifierToUse = loginIdentifier.trim();
    if (!identifierToUse || !loginPassword) {
      setError('Please enter your username or email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser(identifierToUse, loginPassword);
      saveRememberedAccount(res.user);
      onSuccess(res.user, res.token, false);
    } catch (err: any) {
      setError(err.message || 'Invalid username/email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccountWarning(null);

    if (!regFullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!regUsername.trim()) {
      setError('Please choose a username.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await registerAccount({
        fullName: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      saveRememberedAccount(res.user);
      onSuccess(res.user, res.token, true);
    } catch (err: any) {
      if (err.existingAccount) {
        setExistingAccountWarning({
          message: err.message || 'An account with this email/username already exists. Please log in to your existing account.',
          username: err.existingUsername,
          email: err.existingEmail,
        });
      } else {
        setError(err.message || 'Failed to create account. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToLoginWithExisting = (usernameOrEmail?: string) => {
    setExistingAccountWarning(null);
    setError(null);
    setMode('login');
    setUseManualLogin(true);
    if (usernameOrEmail) {
      setLoginIdentifier(usernameOrEmail);
    } else if (regUsername) {
      setLoginIdentifier(regUsername);
    } else if (regEmail) {
      setLoginIdentifier(regEmail);
    }
  };

  const logoSrc = settings.schoolLogoUrl || '/school_logo.png';
  const schoolName = settings.schoolName || 'Sisters of Mary School-Girlstown, Inc.';
  const subTitle = settings.subTitle || 'Internal Student Recruitment & Information Management System';

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-center items-center p-4 py-8 antialiased">
      <div className="max-w-md w-full space-y-4">
        {/* Main Authentication Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-blue-100/80 p-7 space-y-6 relative overflow-hidden">
          {/* Subtle Top Decorative Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-[#1E3A8A] via-[#2563EB] to-[#1E3A8A]" />

          {/* School Branding Header */}
          <div className="text-center space-y-3 pt-2">
            <div className="w-20 h-20 mx-auto flex items-center justify-center p-1.5 bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <img
                src={logoSrc}
                alt={`${schoolName} Logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/school_logo.png';
                }}
              />
            </div>

            <div>
              <h1 className="text-lg font-black text-[#1E3A8A] leading-snug tracking-tight">
                {schoolName}
              </h1>
              <p className="text-[11px] uppercase tracking-wider text-blue-900 font-bold mt-0.5">
                {subTitle}
              </p>
            </div>

            <p className="text-xs text-gray-500 font-medium pt-0.5">
              Create a new account or log in to your existing account.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setExistingAccountWarning(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#1E3A8A] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login to Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setExistingAccountWarning(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#1E3A8A] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Account</span>
            </button>
          </div>

          {/* Existing Account Conflict Alert */}
          {existingAccountWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-900">Existing Account Found</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed font-medium">
                    {existingAccountWarning.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => switchToLoginWithExisting(existingAccountWarning.username || existingAccountWarning.email)}
                  className="flex-1 py-2 px-3 bg-[#1E3A8A] hover:bg-blue-900 text-white font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In to Existing Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExistingAccountWarning(null);
                    setRegUsername('');
                    setRegEmail('');
                  }}
                  className="py-2 px-3 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer text-center"
                >
                  Use Different Details
                </button>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Remembered Account Quick Card (If available and user didn't request manual switch) */}
              {savedAccount && !useManualLogin && (
                <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1E3A8A] text-white rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-xs">
                      {savedAccount.fullName.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-blue-900 font-bold uppercase tracking-wider">
                        Saved Account on this device
                      </p>
                      <h3 className="text-xs font-extrabold text-gray-900 truncate">
                        {savedAccount.fullName}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium truncate">
                        @{savedAccount.username} &bull; {savedAccount.email}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Password for @{savedAccount.username}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your account password"
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Log In as {savedAccount.fullName.split(' ')[0]}</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-gray-500 font-bold border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => setUseManualLogin(true)}
                      className="text-blue-800 hover:underline cursor-pointer"
                    >
                      Use a different account
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-blue-800 hover:underline cursor-pointer"
                    >
                      Create new account
                    </button>
                  </div>
                </div>
              )}

              {/* Standard Full Login Form */}
              {(!savedAccount || useManualLogin) && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Username or Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter username or email"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Log In to System</span>
                      </>
                    )}
                  </button>

                  {savedAccount && useManualLogin && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setUseManualLogin(false)}
                        className="text-xs text-blue-800 hover:underline font-bold cursor-pointer"
                      >
                        &larr; Switch back to saved account ({savedAccount.fullName})
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* 2. CREATE NEW ACCOUNT MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Full Name & Title
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Maria Santos / Sr. Elena SMS"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      placeholder="e.g. maria_santos"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="maria@sms.edu"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Password (min 6)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 font-medium leading-relaxed">
                <p className="flex items-center gap-1 font-bold text-[#1E3A8A]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  Isolated & Secure Storage
                </p>
                Student records encoded under this account will be isolated and persistently saved in the database.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account & Start</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Card Footer */}
          <div className="text-center pt-2 text-[11px] font-medium text-gray-400 border-t border-gray-100 flex flex-col gap-2">
            <div>
              {schoolName} &copy; {new Date().getFullYear()}
            </div>
            {onResetAccounts && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-blue-800 hover:text-[#1E3A8A] font-bold underline transition-all cursor-pointer text-[11px] inline-flex items-center justify-center gap-1 mt-0.5"
              >
                <RefreshCw className="w-3 h-3 text-blue-800" />
                <span>Reset User Accounts & Setup Fresh Administrator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Accounts */}
      {showResetConfirm && (
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
                Branding & Background Will Remain Preserved!
              </p>
              <p className="leading-relaxed">
                Resetting will clear existing user accounts so you can register a new permanent admin. <strong>Your customized school logo, school name, and dashboard background image/theme will stay completely saved!</strong>
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
                    localStorage.removeItem('sms_last_account');
                    setSavedAccount(null);
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
