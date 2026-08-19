import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, CheckCircle2, Sparkles } from 'lucide-react';

export interface SplashScreenProps {
  onComplete: () => void;
  schoolName?: string;
  logoSrc?: string;
  subTitle?: string;
  systemName?: string;
  schoolLocation?: string;
  splashBgImageUrl?: string;
  welcomeUser?: {
    name: string;
    isNewAccount?: boolean;
    role?: string;
  };
}

const INITIAL_LOADING_STAGES = [
  'Initializing Recruitment Portal...',
  'Connecting Secure Database & Verification Registry...',
  'Loading Candidate Admissions Records...',
  'Preparing Authorized Staff Workspace...',
];

const WELCOME_LOADING_STAGES = [
  'Authenticating Credentials...',
  'Loading Your Isolated Workspace & Records...',
  'Synchronizing Cloud Database...',
  'Opening Recruitment Dashboard...',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  schoolName = 'Sisters of Mary School-Girlstown, Inc.',
  logoSrc = '/school_logo.png',
  subTitle = 'Internal Student Recruitment & Information Management System',
  systemName = 'MALE STUDENT RECRUITMENT MANAGEMENT SYSTEM',
  schoolLocation = 'ADLAS, SILANG, CAVITE, PHILIPPINES',
  splashBgImageUrl = '/dashboard_bg.jpg',
  welcomeUser,
}) => {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);

  const stages = welcomeUser ? WELCOME_LOADING_STAGES : INITIAL_LOADING_STAGES;
  const duration = welcomeUser ? 1800 : 2600;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Smooth realistic progress animation
  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 80) {
        setStageIndex(3);
      } else if (pct >= 50) {
        setStageIndex(2);
      } else if (pct >= 25) {
        setStageIndex(1);
      } else {
        setStageIndex(0);
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          onCompleteRef.current();
        }, 150);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration]);

  const activeBg = splashBgImageUrl || '/dashboard_bg.jpg';
  const displaySystemTitle = systemName || subTitle || 'STUDENT RECRUITMENT MANAGEMENT SYSTEM';

  return (
    <div
      id="recruitment-splash-screen"
      className="fixed inset-0 z-50 flex flex-col justify-between items-center text-white select-none overflow-hidden"
    >
      {/* 1. Full-screen School/Campus Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 transform scale-100 brightness-[1.03] contrast-[1.02]"
        style={{
          backgroundImage: `url(${activeBg})`,
        }}
      />

      {/* 2. Moderate Royal Navy / Institutional Blue Transparent Tint */}
      <div className="absolute inset-0 bg-linear-to-b from-[#0B1E48]/45 via-[#0D2866]/40 to-[#071330]/60 pointer-events-none" />

      {/* 3. Subtle Edge Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,35,80,0.1)_0%,rgba(4,9,24,0.5)_100%)] pointer-events-none" />

      {/* Subtle Top Blue Ambient Glow */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-blue-500/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Header Spacer */}
      <div className="w-full pt-5 sm:pt-8 px-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/45 border border-white/15 backdrop-blur-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] tracking-widest uppercase font-bold text-blue-100 drop-shadow">
            {welcomeUser ? 'Authenticated' : 'System Online'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/45 border border-white/15 backdrop-blur-xs text-[10px] tracking-widest uppercase font-bold text-blue-100 drop-shadow">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>SSL 256-Bit Encrypted</span>
        </div>
      </div>

      {/* Main Centered Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center px-4 sm:px-8 max-w-2xl w-full z-10 my-auto py-3 relative"
      >
        {/* Localized soft dark halo */}
        <div className="absolute -inset-4 sm:-inset-6 bg-radial from-slate-950/65 via-slate-950/40 to-transparent rounded-3xl pointer-events-none blur-md" />

        {/* School Logo */}
        <div className="relative mb-4 group z-10">
          <div className="absolute -inset-3 bg-linear-to-r from-blue-500/50 via-cyan-400/40 to-blue-600/50 rounded-full blur-xl animate-pulse pointer-events-none" />
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-b from-white/95 to-slate-100 p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_25px_rgba(37,99,235,0.5)] border-2 border-white flex items-center justify-center overflow-hidden">
            <img
              src={logoSrc}
              alt={`${schoolName} Logo`}
              className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-500 hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/school_logo.png';
              }}
            />
          </div>
        </div>

        {/* Welcome Message (If Post-Login/Post-Registration) */}
        {welcomeUser ? (
          <div className="relative z-10 space-y-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black backdrop-blur-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{welcomeUser.isNewAccount ? 'Account Created Successfully' : 'Login Verified'}</span>
            </div>
            <h1
              id="splash-welcome-title"
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] [text-shadow:_0_2px_14px_rgba(0,0,0,0.9),_0_0_20px_rgba(0,0,0,0.8)] leading-tight"
            >
              {welcomeUser.isNewAccount ? `Welcome, ${welcomeUser.name}!` : `Welcome back, ${welcomeUser.name}!`}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-cyan-200 drop-shadow">
              {schoolName} &bull; {welcomeUser.role || 'Recruitment Portal'}
            </p>
          </div>
        ) : (
          <>
            {/* Standard School Name */}
            <h1
              id="splash-school-name"
              className="relative z-10 text-xl sm:text-2xl md:text-3xl font-black tracking-wide uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] [text-shadow:_0_2px_14px_rgba(0,0,0,0.9),_0_0_20px_rgba(0,0,0,0.8)] leading-tight max-w-xl"
            >
              {schoolName}
            </h1>

            {/* System Subtitle */}
            <div className="relative z-10 mt-2 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
              <h2
                id="splash-system-subtitle"
                className="text-xs sm:text-sm md:text-base font-extrabold tracking-widest uppercase text-cyan-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:_0_0_12px_rgba(6,182,212,0.7)]"
              >
                {displaySystemTitle}
              </h2>
            </div>

            {schoolLocation && (
              <p
                id="splash-school-location"
                className="relative z-10 mt-1 text-[11px] sm:text-xs font-bold tracking-widest uppercase text-blue-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
              >
                {schoolLocation}
              </p>
            )}
          </>
        )}

        {/* Loading / Progress Section */}
        <div className="relative z-10 mt-6 sm:mt-8 w-full max-w-md flex flex-col items-center">
          {/* Progress Bar */}
          <div className="w-full bg-slate-950/75 border border-cyan-400/35 rounded-full p-1 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(30,58,138,0.5)] backdrop-blur-xs">
            <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-linear-to-r from-blue-600 via-cyan-400 to-amber-300 rounded-full shadow-[0_0_14px_rgba(34,211,238,0.9)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>

          {/* Loading Spinner & Status Text */}
          <div className="mt-3.5 flex items-center justify-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/60 border border-white/10 backdrop-blur-xs">
            <div className="relative w-4 h-4">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 animate-spin" />
            </div>
            
            <div className="h-5 flex items-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stageIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs font-semibold text-white tracking-wide drop-shadow"
                >
                  {stages[stageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <span className="text-[11px] font-mono font-black text-cyan-300 ml-1 drop-shadow">
              {progress}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Institutional Understated Footer */}
      <div className="w-full pb-6 sm:pb-8 px-6 text-center z-10">
        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/40 border border-white/10 backdrop-blur-xs">
          <Shield className="w-3 h-3 text-amber-400/80" />
          <p
            id="splash-footer-confidential"
            className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-blue-200/70 uppercase"
          >
            OFFICIAL ADMISSIONS SYSTEM &bull; CONFIDENTIAL
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
