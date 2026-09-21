'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  Building2, 
  UserCheck,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react';

// Modern 3D SVG Time Icons with volumetric depth, spherical gradients, specular highlights & realistic shadows
function ModernSunriseIcon() {
  return (
    <svg className="w-9 h-9 md:w-11 md:h-11 drop-shadow-[0_10px_15px_rgba(245,158,11,0.4)]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pagi-sun-3d" cx="35%" cy="30%" r="65%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </radialGradient>
        <linearGradient id="pagi-sea-3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="pagi-ray-grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0.9" />
        </linearGradient>
        <filter id="pagi-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#EA580C" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Radiant Sunbeams */}
      <path d="M20 2V6" stroke="url(#pagi-ray-grad)" strokeWidth="3" strokeLinecap="round" />
      <path d="M7.27 7.27L10.1 10.1" stroke="url(#pagi-ray-grad)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M32.73 7.27L29.9 10.1" stroke="url(#pagi-ray-grad)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M2 20H6" stroke="url(#pagi-ray-grad)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M34 20H38" stroke="url(#pagi-ray-grad)" strokeWidth="2.8" strokeLinecap="round" />

      {/* 3D Sun Body (Rising Dome) */}
      <path 
        d="M10 23C10 14.716 14.477 10 20 10C25.523 10 30 14.716 30 23H10Z" 
        fill="url(#pagi-sun-3d)" 
        filter="url(#pagi-3d-shadow)"
      />

      {/* 3D Specular Glossy Highlight */}
      <ellipse cx="17" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.65" transform="rotate(-20 17 14)" />

      {/* 3D Wave Layers for Horizon */}
      <path d="M3 24C9 21.5 14 25 20 23.5C26 22 31 25.5 37 23" stroke="url(#pagi-sea-3d)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M1 28C8 26 14 29.5 20 27.5C26 25.5 32 29 39 27" stroke="url(#pagi-sea-3d)" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.7" fill="none" />

      {/* 3D Sparkle */}
      <path d="M31 7L32.2 9.5L34.7 10.7L32.2 11.9L31 14.4L29.8 11.9L27.3 10.7L29.8 9.5L31 7Z" fill="#FDE047" />
    </svg>
  );
}

function ModernNoonSunIcon() {
  return (
    <svg className="w-9 h-9 md:w-11 md:h-11 drop-shadow-[0_10px_18px_rgba(245,158,11,0.45)]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="siang-sun-3d" cx="35%" cy="30%" r="70%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="90%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <linearGradient id="siang-rays-3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <filter id="siang-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#D97706" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* 3D Radiating Sunburst Rays */}
      <g stroke="url(#siang-rays-3d)" strokeWidth="2.8" strokeLinecap="round" filter="url(#siang-3d-shadow)">
        <line x1="20" y1="2" x2="20" y2="7" />
        <line x1="20" y1="33" x2="20" y2="38" />
        <line x1="2" y1="20" x2="7" y2="20" />
        <line x1="33" y1="20" x2="38" y2="20" />
        <line x1="7.27" y1="7.27" x2="10.8" y2="10.8" />
        <line x1="29.2" y1="29.2" x2="32.73" y2="32.73" />
        <line x1="7.27" y1="32.73" x2="10.8" y2="29.2" />
        <line x1="29.2" y1="10.8" x2="32.73" y2="7.27" />
      </g>

      {/* 3D Spherical Sun Body */}
      <circle cx="20" cy="20" r="10.5" fill="url(#siang-sun-3d)" filter="url(#siang-3d-shadow)" />

      {/* 3D Glossy Specular Curved Highlight */}
      <path 
        d="M14 14C16 12 20 11.5 24 13.5C21 12 16.5 12.5 14 14Z" 
        fill="#FFFFFF" 
        opacity="0.8" 
      />
      <circle cx="16" cy="15" r="2.2" fill="#FFFFFF" opacity="0.9" />

      {/* Sky Sparkle */}
      <path d="M32 5L33.2 7.7L35.9 8.9L33.2 10.1L32 12.8L30.8 10.1L28.1 8.9L30.8 7.7L32 5Z" fill="#38BDF8" />
    </svg>
  );
}

function ModernSunsetIcon() {
  return (
    <svg className="w-9 h-9 md:w-11 md:h-11 drop-shadow-[0_10px_18px_rgba(225,29,72,0.4)]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sore-sun-3d" cx="35%" cy="30%" r="65%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="30%" stopColor="#FB923C" />
          <stop offset="75%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <linearGradient id="sore-sea-3d" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="50%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>
        <filter id="sore-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#E11D48" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Sunbeams */}
      <path d="M20 3V7" stroke="#F97316" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M9.4 9.4L12.2 12.2" stroke="#FB923C" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M30.6 9.4L27.8 12.2" stroke="#FB923C" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M3 20H7" stroke="#F43F5E" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M33 20H37" stroke="#F43F5E" strokeWidth="2.8" strokeLinecap="round" />

      {/* Setting 3D Sun Body */}
      <path 
        d="M11 22C11 14.816 15.029 11 20 11C24.971 11 29 14.816 29 22H11Z" 
        fill="url(#sore-sun-3d)" 
        filter="url(#sore-3d-shadow)"
      />

      {/* Gloss Highlight */}
      <ellipse cx="17.5" cy="15" rx="3.5" ry="1.8" fill="#FFFFFF" opacity="0.6" transform="rotate(-15 17.5 15)" />

      {/* 3D Sea Wave Ridges */}
      <path d="M3 23C9 21 14 24 20 22.5C26 21 31 24 37 22" stroke="url(#sore-sea-3d)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M2 27C7 25.5 13 28 20 26.5C27 25 32 27.5 38 26" stroke="url(#sore-sea-3d)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" fill="none" />

      {/* Flying Bird Silhouettes */}
      <path d="M26 8C27.2 6.8 28.5 7.4 29.6 8C30.7 7.4 32 6.8 33.2 8" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M14 6C15 5 16 5.5 17 6C18 5.5 19 5 20 6" stroke="#FDBA74" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.85" />
    </svg>
  );
}

function ModernNightMoonIcon() {
  return (
    <svg className="w-9 h-9 md:w-11 md:h-11 drop-shadow-[0_10px_20px_rgba(99,102,241,0.5)]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="malam-moon-3d" cx="30%" cy="25%" r="75%" fx="30%" fy="25%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#E0E7FF" />
          <stop offset="60%" stopColor="#818CF8" />
          <stop offset="85%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
        <linearGradient id="malam-star-3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <filter id="malam-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-2" dy="5" stdDeviation="3.5" floodColor="#312E81" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Glowing Soft Aura Halo */}
      <circle cx="19" cy="20" r="13" fill="#818CF8" opacity="0.18" />

      {/* 3D Crescent Moon Body */}
      <path 
        d="M27.5 24C26 25.5 23.8 26.5 21.3 26.5C16.4 26.5 12.5 22.6 12.5 17.7C12.5 13.4 15.6 9.8 19.6 9.1C14.5 9.2 10.3 13.4 10.3 18.6C10.3 23.8 14.6 28.1 19.8 28.1C23.4 28.1 26.5 26.1 28.1 23.2C27.9 23.5 27.7 23.8 27.5 24Z" 
        fill="url(#malam-moon-3d)" 
        filter="url(#malam-3d-shadow)"
      />

      {/* Moon Surface Indent Craters */}
      <circle cx="16" cy="16.5" r="1.8" fill="#6366F1" opacity="0.45" />
      <circle cx="19.5" cy="21" r="2.2" fill="#4F46E5" opacity="0.4" />
      <circle cx="15" cy="22" r="1.2" fill="#6366F1" opacity="0.35" />

      {/* Gloss Highlight Arc */}
      <path 
        d="M13.5 15C14 12.8 15.5 11 17.5 10.2C15 11.2 13.5 13 13.5 15Z" 
        fill="#FFFFFF" 
        opacity="0.8" 
      />

      {/* 3D Sparkle Star */}
      <path d="M29 4L30.4 7.6L34 9L30.4 10.4L29 14L27.6 10.4L24 9L27.6 7.6L29 4Z" fill="url(#malam-star-3d)" />
      <path d="M7 28L7.8 30.2L10 31L7.8 31.8L7 34L6.2 31.8L4 31L6.2 30.2L7 28Z" fill="#FDE047" opacity="0.9" />

      {/* Star Dots */}
      <circle cx="33" cy="20" r="1.1" fill="#38BDF8" />
      <circle cx="24" cy="2" r="0.8" fill="#FDE047" />
    </svg>
  );
}

import { HeaderImageData } from '../lib/headerBanner';

interface SurveyData {
  id: string;
  namaRs: string;
  unitKerja: string;
  jumlahResponden: number;
  tanggalInput: string;
  dimensiScores: { [key: string]: number };
}

interface DashboardHeaderProps {
  role: 'rs' | 'admin';
  namaRs: string;
  surveys: SurveyData[];
  selectedYear: string;
  availableYears: string[];
  onYearChange: (year: string) => void;
  headerImage?: HeaderImageData | null;
}

export default function DashboardHeader({ role, namaRs, surveys, selectedYear, availableYears, onYearChange, headerImage }: DashboardHeaderProps) {
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageError(false);
  }, [headerImage?.url]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dynamic clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set initial Indonesian date
  useEffect(() => {
    setDateString(
      new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    );
  }, []);

  // Determine time-based personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 11) {
      return { 
        type: 'morning',
        text: 'Selamat Pagi'
      };
    } else if (hour >= 11 && hour < 15) {
      return { 
        type: 'noon',
        text: 'Selamat Siang'
      };
    } else if (hour >= 15 && hour < 18) {
      return { 
        type: 'afternoon',
        text: 'Selamat Sore'
      };
    } else {
      return { 
        type: 'night',
        text: 'Selamat Malam'
      };
    }
  };

  const renderGreetingIcon = (type: string) => {
    switch (type) {
      case 'morning':
        return <ModernSunriseIcon />;
      case 'noon':
        return <ModernNoonSunIcon />;
      case 'afternoon':
        return <ModernSunsetIcon />;
      case 'night':
        return <ModernNightMoonIcon />;
      default:
        return <ModernNoonSunIcon />;
    }
  };

  const greeting = getGreeting();
  const displayHospital = role === 'admin' ? 'Admin AHRQ' : namaRs;

  // Framer Motion variants
  const containerVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
        staggerChildren: 0.1,
      }
    }
  };

  const sapaanVariants: any = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const namaRsVariants: any = {
    hidden: { opacity: 0, x: -25 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const subjudulVariants: any = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const deskripsiVariants: any = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <motion.div
      id="dashboard-header-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden w-full p-6 md:p-8 rounded-[22px] bg-white border border-slate-200/80 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.07),0_10px_15px_-6px_rgba(0,0,0,0.04)] flex flex-col justify-between items-start gap-8 pt-10 md:pt-8"
    >
      {/* Top Right Year Selector */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-10" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="bg-white/90 hover:bg-white text-slate-700 text-xs font-bold py-1 px-2.5 rounded-md border border-slate-200 shadow-sm flex items-center gap-1 transition-all cursor-pointer"
        >
          {selectedYear}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1.5 w-32 bg-white rounded-lg shadow-lg border border-slate-200/60 overflow-hidden z-[100]"
            >
              <div className="max-h-48 overflow-y-auto">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      onYearChange(year);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer flex justify-between items-center ${
                      selectedYear === year
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{year}</span>
                    {selectedYear === year && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative premium radial glow & gradient elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full filter blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/5 rounded-full filter blur-[80px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-48 bg-teal-500/5 rounded-full filter blur-[60px] pointer-events-none -z-10" />

      {/* Content Layout Container: Left Text Content + Right Header Banner Image */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8 w-full">
        {/* Left Column: Greeting, Welcome Messages */}
        <div className="flex-1 w-full min-w-0 flex items-stretch gap-4 md:gap-5">
          {/* Teal Vertical Accent Bar with vertical moving color animation */}
          <motion.div 
            animate={{ 
              backgroundPosition: ["0% 0%", "0% 100%", "0% 0%"]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              backgroundSize: "100% 200%",
              backgroundImage: "linear-gradient(to bottom, #2dd4bf, #14b8a6, #0d9488, #14b8a6, #2dd4bf)"
            }}
            className="w-1 md:w-1.5 rounded-full shadow-xs shrink-0" 
          />
          
          <div className="space-y-4 min-w-0 w-full">
            <div className="space-y-1.5 min-w-0 w-full">
              {/* Row 1: Greeting with Premium 3D Icon */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <motion.div 
                  variants={sapaanVariants}
                  className="text-[22px] md:text-[36px] font-black text-[#1E6F73] leading-tight md:leading-none tracking-tight whitespace-normal break-words font-['Poppins',sans-serif]"
                >
                  {greeting.text}
                </motion.div>
                
                <div className="relative inline-flex items-center justify-center shrink-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={greeting.type}
                      initial={{ opacity: 0, scale: 0.7, rotate: -15, y: 5 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 15, y: -5 }}
                      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                      className="flex items-center justify-center p-1 cursor-default hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_5px_8px_rgba(15,23,42,0.35)]"
                    >
                      {renderGreetingIcon(greeting.type)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Row 2: Hospital Title with Gradient Accent & Glow */}
              <motion.h2 
                variants={namaRsVariants}
                className="text-[30px] leading-[30px] font-extrabold text-[#1E6F73] tracking-tight break-words whitespace-normal font-sans"
              >
                Hai, Sobat <span className="text-[#1E6F73] font-extrabold">{displayHospital}</span>
              </motion.h2>
            </div>

            {/* Row 3: Subtitle & Description */}
            <div className="space-y-2">
              <motion.p 
                variants={subjudulVariants}
                className="text-[13px] font-bold text-[#45556C] leading-tight font-['Poppins',sans-serif] mb-2"
              >
                Selamat Datang di Aplikasi <span className="text-[13px] font-bold text-[#45556C] font-['Poppins',sans-serif]">Sistem Survei Budaya Keselamatan Pasien</span>
              </motion.p>
              <motion.p 
                variants={deskripsiVariants}
                className="text-[13px] text-slate-600 font-medium leading-[1.7]"
              >
                {"\"Kelola survei, analisis hasil, dan tingkatkan budaya keselamatan pasien melalui dashboard analitik berbasis AHRQ SOPS Version 2.0.\""}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Right Column: Header Banner Image */}
        {headerImage?.url && !imageError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:w-[360px] xl:w-[420px] shrink-0 relative group self-stretch flex items-center"
          >
            {/* Ambient Soft Glows (Radar Style) */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none -z-10 group-hover:bg-teal-500/15 transition-colors duration-700" />
            <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none -z-10 group-hover:bg-emerald-500/15 transition-colors duration-700" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-l from-emerald-500/20 via-teal-400/10 to-transparent rounded-2xl filter blur-xl pointer-events-none -z-10" />

            {/* Seamless Image Container without box/borders */}
            <div className="relative w-full h-44 sm:h-48 md:h-52 lg:h-56 overflow-hidden rounded-2xl pointer-events-none">
              {/* Gradient Mask & Image Integration */}
              <div 
                className="w-full h-full relative"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 4%, black 12%, black 100%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 4%, black 12%, black 100%)'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={headerImage.url}
                  alt="Banner Card Header Dashboard"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] filter brightness-[1.02] contrast-[1.02]"
                  style={{
                    objectPosition: headerImage.position === 'center'
                      ? 'center center'
                      : headerImage.position === 'top-right'
                      ? 'right top'
                      : headerImage.position === 'bottom-right'
                      ? 'right bottom'
                      : 'right center'
                  }}
                />
              </div>

              {/* Soft Feather Overlay strictly at the left edge */}
              <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white/40 to-transparent pointer-events-none" />
              {/* Minimal top/bottom fade for subtle integration */}
              <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

