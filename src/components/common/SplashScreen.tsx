import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

export interface SplashScreenProps {
  onComplete: () => void;
  schoolName?: string;
  logoSrc?: string;
  subTitle?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  schoolName = 'Sisters of Mary School-Girlstown, Inc.',
  logoSrc = '/school_logo.png',
  subTitle = 'Student Admission & Records Management System',
}) => {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0F172A] to-[#1E3A8A] text-white p-6 overflow-hidden select-none">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content with Motion Fade-In */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-lg w-full z-10"
      >
        {/* Logo Container */}
        <div className="relative mb-6">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-amber-400 to-blue-600 rounded-3xl blur-sm opacity-60 animate-pulse" />
          <div className="relative w-28 h-28 bg-white rounded-2xl p-2.5 shadow-2xl border border-white/20 flex items-center justify-center overflow-hidden">
            <img
              src={logoSrc}
              alt={`${schoolName} Logo`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/school_logo.png';
              }}
            />
          </div>
        </div>

        {/* School Name */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md mb-2">
          {schoolName}
        </h1>

        {/* System Subtitle */}
        <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-200/90 uppercase mb-8 flex items-center justify-center gap-1.5">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{subTitle}</span>
        </p>

        {/* Progress Loading Bar */}
        <div className="w-48 h-1.5 bg-white/15 rounded-full overflow-hidden p-0.5 backdrop-blur-xs">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="w-full h-full bg-gradient-to-r from-amber-400 to-blue-400 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
