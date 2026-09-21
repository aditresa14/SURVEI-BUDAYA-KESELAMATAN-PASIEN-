'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowRight,
  Calendar,
  Clock
} from 'lucide-react';
import { LogoData } from '../lib/logo';

interface WelcomeScreenProps {
  onEnter: () => void;
  activeLogo?: LogoData | null;
}

export default function WelcomeScreen({ onEnter, activeLogo }: WelcomeScreenProps) {
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Clock format: HH:mm:ss WIB
      setTimeString(
        now.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        }) + ' WIB'
      );

      // Date format: Sen, 10 Jul 2026
      setDateString(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      id="welcome-screen-container" 
      className="min-h-screen lg:h-screen lg:max-h-screen bg-transparent text-slate-800 flex flex-col justify-between p-4 md:p-6 lg:p-8 relative overflow-x-hidden overflow-y-auto lg:overflow-hidden font-sans select-none"
    >
      
      {/* 1. Header (Clean direct items without card/box container) */}
      <header 
        id="welcome-header" 
        className="max-w-7xl mx-auto w-full flex justify-between items-center py-2 px-2 md:px-4 relative z-20"
      >
        {/* Left branding: Logo & Text */}
        <div className="flex items-center gap-3">
          <div className="p-0.5 bg-white text-blue-600 rounded-xl border-2 border-teal-400 ring-2 ring-white shadow-md flex items-center justify-center shrink-0 w-12 h-12 overflow-hidden relative group/logo">
            <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/logo:opacity-100 transition-opacity"></div>
            {activeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeLogo.url} alt="Medclin Logo" className="w-full h-full object-contain scale-125 p-0.5" />
            ) : (
              <ShieldCheck className="w-9 h-9 text-blue-600" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span 
              className="font-extrabold text-lg leading-tight text-[#2E7D82] block font-sans tracking-tight"
              style={{
                WebkitTextStroke: '1px white',
                paintOrder: 'stroke fill'
              }}
            >
              Medclin
            </span>
            <span 
              className="font-bold text-sm leading-tight text-[#48B8BE] block font-sans tracking-tight"
              style={{
                WebkitTextStroke: '1px white',
                paintOrder: 'stroke fill'
              }}
            >
              Pro Academy
            </span>
          </div>
        </div>

        {/* Right side: Floating Date & Clock Widget */}
        <div className="flex items-center gap-2 md:gap-3 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.08)] ring-1 ring-white/40">
          {/* Date pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="text-[11px] font-bold tracking-wide">{dateString || 'Memuat...'}</span>
          </div>

          {/* Clock pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 text-teal-900 font-mono">
            <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0 animate-pulse" />
            <span className="text-xs font-black tracking-wider">{timeString || '--:--:-- WIB'}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area (Bottom-Left Aligned Layout) */}
      <main 
        id="welcome-main" 
        className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-end items-start text-left pb-8 pt-6 px-6"
      >
        
        {/* Headline & CTA */}
        <div className="space-y-6 flex flex-col justify-center items-start text-left w-full md:w-[620px] md:max-w-[620px]">
          
          <div className="space-y-4 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[36px] sm:text-[44px] md:text-[49px] w-full md:w-[504px] max-w-[504px] font-extrabold tracking-tight leading-[1.1] font-sans text-left"
              style={{
                WebkitTextStroke: '1px #94a3b8',
                paintOrder: 'stroke fill'
              }}
            >
              <span className="text-[#5CC8C9]">Sistem Survei</span> <br />
              <span className="text-[#2FA7A7]">Budaya</span>{' '}
              <span className="text-[#1E6F73]">Keselamatan Pasien</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[11px] leading-relaxed w-full md:w-[501px] max-w-[501px] text-left md:text-justify font-medium text-slate-700 [text-shadow:_0_1px_3px_rgba(0,0,0,0.12)]"
            >
              Platform digital untuk pelaksanaan, analisis, dan pelaporan Survei Budaya Keselamatan Pasien berbasis AHRQ SOPS Version 2.0 yang terintegrasi secara realtime guna mendukung peningkatan mutu pelayanan dan keselamatan pasien di rumah sakit
            </motion.p>
          </div>

          {/* Core Interactive Action */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-2 flex flex-col sm:flex-row gap-4 items-center justify-start"
          >
            <button
              onClick={onEnter}
              className="group px-8 py-4 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white font-extrabold rounded-2xl inline-flex items-center gap-3.5 shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all transform-gpu duration-300 cursor-pointer text-sm tracking-wide"
            >
              MULAI SURVEI
              <motion.div
                className="transform-gpu will-change-transform"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight className="w-4.5 h-4.5" />
              </motion.div>
            </button>
          </motion.div>

        </div>

      </main>

      {/* 3. Footer */}
      <footer 
        id="welcome-footer" 
        className="max-w-7xl mx-auto w-full py-4 text-center flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500 px-6"
      >
        <p className="text-[#1c293e] font-medium">© 2026 Sistem Survei Budaya Keselamatan Pasien • AHRQ SOPS v2.0</p>
      </footer>

    </div>
  );
}
