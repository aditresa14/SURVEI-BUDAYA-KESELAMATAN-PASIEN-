'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  ClipboardCheck, 
  BarChart2, 
  FileText, 
  Settings, 
  LogOut, 
  Users, 
  Building2, 
  Activity, 
  TrendingUp, 
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  X,
  Trash2,
  UserCheck,
  Briefcase,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import useSWR, { mutate as globalMutate } from 'swr';
import InputDataTab from './InputDataTab';
import LaporanTab from './LaporanTab';
import AnalisaDataTab from './AnalisaDataTab';
import PengaturanTab from './PengaturanTab';
import PersetujuanTab from './PersetujuanTab';
import PersetujuanBenchmarkTab from './PersetujuanBenchmarkTab';
import DashboardTable from './DashboardTable';
import { getSurveys, saveSurvey, getHospitalAccounts, deleteSurvey, getBenchmarkRequests, isSurveyResponse } from '../lib/db';
import { computeDimensionScores } from '../lib/scoring';
import { WallpaperData } from '../lib/wallpaper';
import { LogoData } from '../lib/logo';
import { HeaderImageData } from '../lib/headerBanner';
import DashboardHeader from './DashboardHeader';

interface SurveyData {
  id: string;
  namaRs: string;
  unitKerja: string;
  jumlahResponden: number;
  tanggalInput: string;
  dimensiScores: { [key: string]: any };
}

interface DashboardProps {
  role: 'rs' | 'admin';
  identifier: string;
  hospitalId?: string;
  namaRs: string;
  onLogout: () => void;
  onUpdateRsName: (newName: string) => void;
  activeWallpaper: WallpaperData | null;
  onUpdateWallpaper: (wallpaper: WallpaperData | null) => void;
  activeLogo: LogoData | null;
  onUpdateLogo: (logo: LogoData | null) => void;
  activeHeaderImage?: HeaderImageData | null;
  onUpdateHeaderImage?: (headerImage: HeaderImageData | null) => void;
}

export default function Dashboard({ 
  role, 
  identifier, 
  hospitalId,
  namaRs, 
  onLogout, 
  onUpdateRsName,
  activeWallpaper,
  onUpdateWallpaper,
  activeLogo,
  onUpdateLogo,
  activeHeaderImage,
  onUpdateHeaderImage
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analisa-data' | 'input' | 'laporan' | 'pengaturan' | 'persetujuan' | 'master-posisi' | 'master-unit' | 'persetujuan-benchmark'>('dashboard');
  const mainContainerRef = useRef<HTMLElement | null>(null);

  // Reset scroll to top immediately whenever activeTab changes
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const [showRespondentsModal, setShowRespondentsModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedRsFilter, setSelectedRsFilter] = useState<'all' | 'admin' | string>('admin');
  const [selectedYear, setSelectedYear] = useState<string>('Semua Tahun');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // SWR for real-time survey synchronization with background polling
  const { data: surveys = [], mutate, isLoading: surveysLoading } = useSWR(
    role === 'admin' ? 'ahrq_surveys_all' : ['ahrq_surveys', hospitalId || identifier],
    () => getSurveys(role === 'admin' ? undefined : (hospitalId || identifier)),
    {
      refreshInterval: 3000
    }
  );

  // SWR for real-time hospital accounts with background polling
  const { data: accounts = [], mutate: mutateAccounts } = useSWR(
    'hospital_accounts',
    getHospitalAccounts,
    { refreshInterval: 5000 }
  );

  // SWR for real-time benchmark requests (disabled for Admin Utama to respect data privacy)
  const { data: benchmarkRequests = [], mutate: mutateBenchmarkRequests } = useSWR(
    role === 'admin' ? null : ['ahrq_benchmark_requests', hospitalId || identifier],
    () => getBenchmarkRequests(hospitalId || identifier),
    { refreshInterval: 3000 }
  );

  // Benchmark notification badge: ONLY target hospital receives notification!
  const pendingBenchmarkCount = useMemo(() => {
    if (role === 'admin' || identifier === 'admin') return 0;
    return benchmarkRequests.filter(r => {
      const isTarget = r.target_id === (hospitalId || identifier) || 
                       r.target_name?.toLowerCase() === namaRs?.toLowerCase();
      const isRequester = r.requester_id === (hospitalId || identifier) ||
                          r.requester_name?.toLowerCase() === namaRs?.toLowerCase();
      return isTarget && !isRequester && r.status === 'pending';
    }).length;
  }, [role, benchmarkRequests, hospitalId, identifier, namaRs]);

  // Security guard: Admin Utama must never land on persetujuan-benchmark
  useEffect(() => {
    if (role === 'admin' && activeTab === 'persetujuan-benchmark') {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  const pendingAccountsCount = accounts.filter(a => a.status === 'Pending').length;

  // Real-time active session security check: force logout if account is disabled/archived
  useEffect(() => {
    if (role === 'rs' && accounts.length > 0) {
      const currentAcc = accounts.find(
        a => a.id === hospitalId || a.username.toLowerCase() === identifier.toLowerCase()
      );
      if (currentAcc && (currentAcc.status === 'Disabled' || currentAcc.status === 'Archived' || currentAcc.status === 'Rejected')) {
        alert("Akun rumah sakit Anda telah dinonaktifkan atau diarsipkan oleh Administrator Utama. Sesi Anda diakhiri secara otomatis.");
        onLogout();
      }
    }
  }, [role, accounts, hospitalId, identifier, onLogout]);

  // Filter surveys: Admin sees all, RS sees only their own (and excludes config/pengesahan rows)
  const validSurveys = surveys.filter(s => isSurveyResponse(s) && s.namaRs !== '_LINK_CONFIG_' && s.namaRs !== '_MASTER_CONFIG_' && s.id !== 'MASTER_BENCHMARK');

  const activeHospitalNameForLaporan = useMemo(() => {
    if (role === 'admin') {
      if (selectedRsFilter === 'admin') {
        return 'Administrator Pusat';
      } else if (selectedRsFilter === 'all') {
        return 'Semua Rumah Sakit';
      } else {
        const acc = accounts.find(a => a.username === selectedRsFilter || a.id === selectedRsFilter);
        return acc ? acc.namaRs : namaRs;
      }
    }
    return namaRs;
  }, [role, selectedRsFilter, accounts, namaRs]);

  const activeHospitalSurveys = useMemo(() => {
    if (role === 'admin') {
      if (selectedRsFilter === 'admin') {
        return validSurveys.filter(s => {
          const surveyUser = (s.dimensiScores as any)?.username;
          return surveyUser?.toLowerCase() === 'admin' || s.namaRs === 'Administrator Pusat';
        });
      } else if (selectedRsFilter === 'all') {
        return validSurveys;
      } else {
        return validSurveys.filter(s => {
          const surveyUser = (s.dimensiScores as any)?.username;
          const surveyHospitalId = (s.dimensiScores as any)?.hospital_id;
          return (surveyUser?.toLowerCase() === selectedRsFilter.toLowerCase() || 
                  surveyHospitalId === selectedRsFilter || 
                  s.namaRs.toLowerCase() === selectedRsFilter.toLowerCase());
        });
      }
    }
    return validSurveys;
  }, [validSurveys, role, selectedRsFilter]);

  const surveysWithConfig = useMemo(() => {
    // Include the actual surveys PLUS the link config for this specific RS
    const baseSurveys = surveys.filter(s => 
      (isSurveyResponse(s) || s.id.startsWith('LINK_CONFIG_')) && 
      s.namaRs !== '_MASTER_CONFIG_' && 
      s.id !== 'MASTER_BENCHMARK'
    );
    if (role === 'admin') {
      if (selectedRsFilter === 'admin') {
        return baseSurveys.filter(s => {
          const surveyUser = (s.dimensiScores as any)?.username || s.unitKerja;
          return surveyUser?.toLowerCase() === 'admin' || s.namaRs === 'Administrator Pusat' || s.namaRs === '_LINK_CONFIG_';
        });
      } else if (selectedRsFilter === 'all') {
        return baseSurveys;
      } else {
        return baseSurveys.filter(s => {
          const surveyUser = (s.dimensiScores as any)?.username || s.unitKerja;
          const surveyHospitalId = (s.dimensiScores as any)?.hospital_id;
          return (surveyUser?.toLowerCase() === selectedRsFilter.toLowerCase() || 
                  surveyHospitalId === selectedRsFilter || 
                  s.namaRs.toLowerCase() === selectedRsFilter.toLowerCase() ||
                  (s.namaRs === '_LINK_CONFIG_' && surveyUser?.toLowerCase() === selectedRsFilter.toLowerCase()));
        });
      }
    }
    return baseSurveys;
  }, [surveys, role, selectedRsFilter]);


  const availableYears = useMemo(() => {
    const extractYear = (tanggalStr?: string) => {
      if (!tanggalStr) return new Date().getFullYear().toString();
      const match = tanggalStr.match(/\b(20\d{2}|19\d{2})\b/);
      if (match) return match[1];
      const partsBySpace = tanggalStr.trim().split(/\s+/);
      const lastPart = partsBySpace[partsBySpace.length - 1];
      if (lastPart && !isNaN(Number(lastPart)) && lastPart.length === 4) return lastPart;
      const partsByDash = tanggalStr.split('-');
      if (partsByDash[0] && !isNaN(Number(partsByDash[0])) && partsByDash[0].length === 4) return partsByDash[0];
      return new Date().getFullYear().toString();
    };
    const years = new Set<string>();
    // Pre-populate years for a wider selection as requested
    for (let i = 2022; i <= 2030; i++) {
      years.add(i.toString());
    }
    validSurveys.forEach(s => {
      if (s.id !== 'MASTER_BENCHMARK') {
        years.add(extractYear(s.tanggalInput));
      }
    });
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    return ['Semua Tahun', ...sortedYears];
  }, [validSurveys]);

  const handleSaveSurvey = async (newSurvey: SurveyData) => {
    try {
      const surveyWithUser = {
        ...newSurvey,
        dimensiScores: {
          ...newSurvey.dimensiScores,
          username: identifier,
          hospital_id: hospitalId || identifier
        }
      };
      const saved = await saveSurvey(surveyWithUser, hospitalId || identifier, identifier, identifier, namaRs);
      
      // Mutate all survey-related SWR keys across the application
      await globalMutate(
        (key) => {
          if (typeof key === 'string') {
            return key === 'ahrq_surveys_all' || key === 'ahrq_surveys';
          }
          if (Array.isArray(key)) {
            return key[0] === 'ahrq_surveys';
          }
          return false;
        },
        undefined,
        { revalidate: true }
      );
    } catch (e) {
      console.error("Gagal menyimpan data survei:", e);
      throw e; // Rethrow to let the UI handle the error state
    }
  };

  const handleResetData = () => {
    mutate([]);
  };

  const handleDeleteSurvey = (id: string) => {
    setSurveyToDelete(id);
    setShowDeleteConfirm(true);
  };

  const executeDeleteSurvey = async () => {
    if (!surveyToDelete) return;

    setIsDeleting(true);
    try {
      // Optimistically filter out the deleted survey from the current list
      const updatedSurveys = surveys.filter(s => s.id !== surveyToDelete);
      
      // Mutate locally both the bound and global cache for 'ahrq_surveys' immediately
      mutate(updatedSurveys, false);

      // Perform actual deletion on Supabase database
      await deleteSurvey(surveyToDelete);
      
      // Success feedback
      setNotification({ text: "Data responden berhasil dihapus.", type: 'success' });
      
      // Finally, trigger real background revalidation to make sure everyone is fully synchronized
      await globalMutate(
        (key) => {
          if (typeof key === 'string') {
            return key === 'ahrq_surveys_all' || key === 'ahrq_surveys';
          }
          if (Array.isArray(key)) {
            return key[0] === 'ahrq_surveys';
          }
          return false;
        },
        undefined,
        { revalidate: true }
      );
    } catch (e) {
      console.error("Gagal menghapus survei:", e);
      setNotification({ text: "Gagal menghapus data. Silakan coba kembali.", type: 'error' });
      // Rollback state in case of any database exception
      mutate();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSurveyToDelete(null);
    }
  };
  
  const filteredSurveys = useMemo(() => {
    return validSurveys.filter(s => {
      // Year Filter
      if (selectedYear !== 'Semua Tahun') {
        const extractYear = (tanggalStr?: string) => {
          if (!tanggalStr) return new Date().getFullYear().toString();
          const match = tanggalStr.match(/\b(20\d{2}|19\d{2})\b/);
          if (match) return match[1];
          const partsBySpace = tanggalStr.trim().split(/\s+/);
          const lastPart = partsBySpace[partsBySpace.length - 1];
          if (lastPart && !isNaN(Number(lastPart)) && lastPart.length === 4) return lastPart;
          const partsByDash = tanggalStr.split('-');
          if (partsByDash[0] && !isNaN(Number(partsByDash[0])) && partsByDash[0].length === 4) return partsByDash[0];
          return new Date().getFullYear().toString();
        };
        const year = extractYear(s.tanggalInput);
        if (year !== selectedYear) return false;
      }

      if (role === 'admin') {
        if (selectedRsFilter === 'admin') {
          const surveyUser = (s.dimensiScores as any)?.username;
          if (surveyUser) return surveyUser.toLowerCase() === 'admin';
          return s.namaRs === 'Administrator Pusat';
        } else if (selectedRsFilter === 'all') {
          return true;
        } else {
          const surveyUser = (s.dimensiScores as any)?.username;
          const surveyHospitalId = (s.dimensiScores as any)?.hospital_id;
          return (surveyUser?.toLowerCase() === selectedRsFilter.toLowerCase() || 
                  surveyHospitalId === selectedRsFilter || 
                  s.namaRs.toLowerCase() === selectedRsFilter.toLowerCase());
        }
      } else {
        // RS user: surveys in validSurveys were already fetched from Supabase for this hospital
        // Verify with comprehensive identifiers without prematurely returning false
        const sUser = ((s.dimensiScores as any)?.username || '').toLowerCase();
        const sHospId = ((s.dimensiScores as any)?.hospital_id || (s as any).hospital_id || '').toLowerCase();
        const sUserId = ((s.dimensiScores as any)?.user_id || (s as any).user_id || '').toLowerCase();
        const sCreatedBy = ((s.dimensiScores as any)?.created_by || (s as any).created_by || '').toLowerCase();
        const sRsName = (s.namaRs || (s.dimensiScores as any)?.hospital_name || '').toLowerCase();

        const myId = (identifier || '').toLowerCase();
        const myHospId = (hospitalId || '').toLowerCase();
        const myName = (namaRs || '').toLowerCase();

        const isMatch = 
          (myId && (sUser === myId || sHospId === myId || sUserId === myId || sCreatedBy === myId || sRsName === myId)) ||
          (myHospId && (sHospId === myHospId || sUser === myHospId || sUserId === myHospId || sCreatedBy === myHospId)) ||
          (myName && (sRsName === myName || sUser === myName));

        // If explicitly matched or if loaded in RS-scoped dataset, keep it
        return isMatch || true;
      }
    });
  }, [validSurveys, role, identifier, hospitalId, namaRs, selectedRsFilter, selectedYear]);

  // Statistics calculations
  const totalRespondents = filteredSurveys.reduce((acc, curr) => acc + curr.jumlahResponden, 0);

  // Grouped Unit summary data
  const unitsSummary = useMemo(() => {
    const summaryMap: Record<string, { latestDate: string; count: number }> = {};
    filteredSurveys.forEach((survey) => {
      const unit = survey.unitKerja || 'Instansi Umum';
      if (!summaryMap[unit]) {
        summaryMap[unit] = { latestDate: survey.tanggalInput, count: 0 };
      }
      summaryMap[unit].count += (survey.jumlahResponden || 1);
    });
    return Object.entries(summaryMap).map(([unit, data]) => ({
      unit,
      tanggalInput: data.latestDate,
      jumlah: data.count,
    }));
  }, [filteredSurveys]);

  const totalUnits = unitsSummary.length;
  
  // Overall average percentage response using robust dimension scoring
  const overallScorePercent = useMemo(() => {
    if (filteredSurveys.length === 0) return 0;
    const calculatedDims = computeDimensionScores(filteredSurveys);
    if (calculatedDims.length === 0) return 0;
    const sum = calculatedDims.reduce((acc, dim) => acc + dim.percentage, 0);
    return Math.round(sum / calculatedDims.length);
  }, [filteredSurveys]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Beranda', icon: LayoutDashboard },
    { id: 'input', label: 'Input Data Survei', mobileLabel: 'Survei', icon: ClipboardCheck },
    { id: 'analisa-data', label: 'Analisa Data', mobileLabel: 'Analisa', icon: Activity },
    { id: 'laporan', label: 'Laporan Survei', mobileLabel: 'Laporan', icon: FileText },
    { id: 'pengaturan', label: 'Pengaturan', mobileLabel: 'Setelan', icon: Settings },
    ...(role !== 'admin' ? [{ 
      id: 'persetujuan-benchmark', 
      label: 'Persetujuan Benchmark Data', 
      mobileLabel: 'Benchmark', 
      icon: ShieldCheck, 
      badge: pendingBenchmarkCount 
    }] : []),
    ...(role === 'admin' ? [{
      id: 'persetujuan',
      label: 'Persetujuan Akun',
      mobileLabel: 'Persetujuan',
      icon: ShieldCheck,
      badge: pendingAccountsCount,
      badgeColor: 'bg-red-500 text-white'
    }] : [])
  ];

  return (
    <div className="h-[100dvh] md:h-screen w-full bg-[#E2E8F0] md:p-3 lg:p-4 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      
      {/* Floating Outer Card Frame */}
      <div className="w-full h-full bg-[#FAFBFB] rounded-none md:rounded-[28px] lg:rounded-[32px] shadow-2xl border border-slate-200/80 flex flex-col md:flex-row overflow-hidden relative">

        {/* Mobile Top Header (Sticky on Mobile) */}
        <header className="md:hidden flex-none w-full z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-0.5 bg-white text-blue-600 rounded-lg border-2 border-teal-400 ring-2 ring-white shadow-xs flex items-center justify-center shrink-0 w-8 h-8 overflow-hidden">
              {activeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeLogo.url} alt="AHRQ Logo" className="w-full h-full object-contain scale-125 p-0.5" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <span 
                className="font-sans font-extrabold text-sm text-[#2E7D82] tracking-tight block leading-tight"
                style={{ textShadow: '1px 1px 1px rgba(15, 23, 42, 0.15), 2px 2px 1px rgba(15, 23, 42, 0.1)' }}
              >
                Medclin
              </span>
              <span 
                className="font-sans font-bold text-xs text-[#48B8BE] tracking-tight block leading-tight"
                style={{ textShadow: '1px 1px 1px rgba(15, 23, 42, 0.15), 2px 2px 1px rgba(15, 23, 42, 0.1)' }}
              >
                Pro Academy
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-500 hover:text-rose-600 p-1 rounded-lg transition-colors border border-transparent hover:bg-slate-100"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Navigation - Sidebar on Desktop, Bottom Bar on Mobile */}
        <aside className={`w-[calc(100%-24px)] fixed bottom-3 left-3 right-3 z-50 rounded-3xl border border-white/25 shadow-2xl shadow-teal-950/45 bg-[#1E6F73] text-white flex flex-col shrink-0 no-print transition-all duration-300 ease-in-out pb-1 pt-0 md:relative md:bottom-0 md:left-0 md:right-0 md:w-auto md:mx-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} md:h-full md:rounded-none md:border-none md:shadow-2xl md:bg-[#1E6F73] md:pt-5 md:pb-5`}>
          
          {/* Tombol Collapse / Hide Sidebar - Terletak Sejajar Dengan Tulisan AHRQ SOPS v2.0 */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Tampilkan Menu Sidebar" : "Sembunyikan Menu Sidebar"}
            className="hidden md:flex absolute -right-4 top-[96px] z-50 items-center justify-center w-4 h-10 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-r-xl border border-slate-200 border-l-0 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)] cursor-pointer transition-colors duration-200"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </button>
          
          <div className="flex-1 flex flex-col justify-start md:overflow-y-auto md:overflow-x-hidden no-scrollbar max-h-full space-y-4 py-1">
            
            {/* Header / Brand Logo & Title - Centered Logo with Text Underneath */}
            <div className={`hidden md:flex flex-col items-center text-center pt-1 pb-1 ${isSidebarCollapsed ? 'px-1' : 'px-4'}`}>
              <div className="relative mb-2 shrink-0">
                <div className="p-0.5 bg-white text-[#2FA7A7] rounded-xl border-2 border-teal-400 ring-2 ring-white shadow-md flex items-center justify-center shrink-0 w-12 h-12 overflow-hidden relative">
                  {activeLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeLogo.url} alt="AHRQ Logo" className="w-full h-full object-contain scale-125 p-0.5" />
                  ) : (
                    <ShieldCheck className="w-8 h-8 text-[#2FA7A7]" />
                  )}
                </div>
              </div>
              {!isSidebarCollapsed && (
                <div className="w-full overflow-hidden text-center transition-all duration-200">
                  <span 
                    className="font-sans font-black text-[20px] text-white tracking-tight block leading-snug"
                    style={{ color: '#ffffff', textShadow: '1px 1px 1px rgba(15, 23, 42, 0.25), 2px 2px 1px rgba(15, 23, 42, 0.15)' }}
                  >
                    Medclin
                  </span>
                  <span 
                    className="font-sans font-extrabold text-[18px] text-[#f5fbfc] tracking-tight block leading-snug"
                    style={{ textShadow: '1px 1px 1px rgba(15, 23, 42, 0.25), 2px 2px 1px rgba(15, 23, 42, 0.15)' }}
                  >
                    Pro Academy
                  </span>
                </div>
              )}
            </div>

            <div className={`hidden md:block ${isSidebarCollapsed ? 'px-2' : 'px-4'} my-1`}>
              <div className="h-px w-full bg-white/15 rounded-full" />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-row md:flex-col justify-around md:justify-start items-center md:items-stretch w-full px-2 py-2 md:py-0 md:pl-3 md:pr-0 h-[70px] md:h-auto gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`relative flex flex-col md:flex-row items-center justify-center ${
                      isSidebarCollapsed ? 'md:justify-center md:px-0' : 'md:justify-start md:px-3.5'
                    } flex-1 md:flex-none py-2 md:py-2.5 w-full font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white md:bg-[#FAFBFB] text-[#1E6F73] md:rounded-l-2xl md:rounded-r-none rounded-xl z-20 shadow-xs md:mr-0'
                        : 'text-white hover:text-white md:hover:bg-white/10 rounded-xl md:mr-3 border border-transparent'
                    }`}
                  >
                    {/* Top Inverted Curve Cutout on Desktop */}
                    {isActive && (
                      <div className="hidden md:block absolute -top-4 right-0 w-4 h-4 pointer-events-none z-10">
                        <svg className="w-full h-full text-[#FAFBFB] fill-current" viewBox="0 0 16 16" shapeRendering="geometricPrecision">
                          <path d="M 0 16 A 16 16 0 0 0 16 0 L 16 16 Z" />
                        </svg>
                      </div>
                    )}

                    {/* Bottom Inverted Curve Cutout on Desktop */}
                    {isActive && (
                      <div className="hidden md:block absolute -bottom-4 right-0 w-4 h-4 pointer-events-none z-10">
                        <svg className="w-full h-full text-[#FAFBFB] fill-current" viewBox="0 0 16 16" shapeRendering="geometricPrecision">
                          <path d="M 0 0 A 16 16 0 0 1 16 16 L 16 0 Z" />
                        </svg>
                      </div>
                    )}

                    {/* Icon */}
                    <motion.div 
                      className={`p-1 rounded-lg shrink-0 ${isActive ? 'text-[#1E6F73]' : 'text-white'}`}
                      animate={
                        isActive
                          ? {
                              y: [0, -7, 0, -3.5, 0, 0],
                              scale: [1, 1.15, 1, 1.08, 1, 1],
                            }
                          : { y: 0, scale: 1 }
                      }
                      transition={
                        isActive
                          ? {
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                              times: [0, 0.12, 0.24, 0.36, 0.48, 1],
                            }
                          : { duration: 0.2 }
                      }
                    >
                      <Icon className="w-[18px] h-[18px] md:w-5 md:h-5 shrink-0 transition-all" />
                    </motion.div>

                    {!isSidebarCollapsed && (
                      item.id === 'persetujuan-benchmark' ? (
                        <span className="hidden md:block text-[15.5px] font-bold leading-[20.25px] text-left ml-2">
                          Persetujuan<br />Benchmark Data
                        </span>
                      ) : (
                        <span className="hidden md:block text-[15.5px] font-bold leading-normal whitespace-nowrap ml-2 text-left">
                          {item.label}
                        </span>
                      )
                    )}
                    <span className="md:hidden text-[10px] mt-0.5 tracking-wide font-medium">{item.mobileLabel}</span>

                    {item.badge && item.badge > 0 ? (
                      <span className={`absolute ${isSidebarCollapsed ? 'top-0 right-1' : 'top-1 right-2 md:top-2 md:right-3'} flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full ${item.badgeColor || 'bg-amber-400 text-amber-950'} text-[9px] font-black shadow-md z-30`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {/* Logout Button */}
              <div className="hidden md:block pt-2 mt-2 w-full pr-3">
                <div className="px-3 mb-2">
                  <div className="h-px w-full bg-white/15 rounded-full" />
                </div>
                <button
                  onClick={onLogout}
                  title={isSidebarCollapsed ? "Log Out Akun" : undefined}
                  className={`w-full py-2 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 gap-2.5'} text-white/90 hover:text-white hover:bg-white/10 rounded-xl text-[15px] font-bold flex items-center transition-all cursor-pointer`}
                >
                  <LogOut className="w-4.5 h-4.5 shrink-0 transition-all text-white/90" />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap font-bold text-[15px]">Log Out Akun</span>}
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Container - Independently Scrollable */}
        <main id="dashboard-main-scroll" ref={mainContainerRef} className="flex-grow p-4 md:p-8 w-full overflow-y-auto md:h-full pb-24 md:pb-8 bg-[#FAFBFB]">
          <div className="max-w-7xl mx-auto w-full">
        
        {/* Dynamic View rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Greeting */}
            <DashboardHeader 
              role={role} 
              namaRs={namaRs} 
              surveys={surveys} 
              selectedYear={selectedYear}
              availableYears={availableYears}
              onYearChange={setSelectedYear}
              headerImage={activeHeaderImage}
            />

            {/* Filter Fasyankes / Rumah Sakit - Khusus Admin Utama */}
            {role === 'admin' && (
              <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 p-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase font-mono">SELEKSI SUMBER DATA</span>
                    <h4 className="text-sm font-bold text-slate-800">Tampilkan Data Fasyankes</h4>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex items-center gap-2">
                  <select
                    value={selectedRsFilter}
                    onChange={(e) => setSelectedRsFilter(e.target.value)}
                    className="w-full md:w-[280px] bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="admin">Administrator Pusat (Hanya Data Saya)</option>
                    <option value="all">Semua Rumah Sakit (Data Gabungan)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.username}>
                        {acc.namaRs} ({acc.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Quick alert for admin about pending registrations */}
            {role === 'admin' && pendingAccountsCount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-200">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Permohonan Registrasi RS Menunggu Persetujuan</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Terdapat <strong className="text-amber-600">{pendingAccountsCount} fasyankes baru</strong> yang mendaftar dan menunggu verifikasi Anda.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('persetujuan')}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all transform-gpu cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  Buka Menu Persetujuan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Stats Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10 px-4 md:px-0">
              
              {/* Card 1: Total Responden */}
              <div 
                onClick={() => setShowRespondentsModal(true)}
                className="cursor-pointer bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-[2.5rem] relative border border-slate-300 shadow-[0_10px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.20)] transition-all transform-gpu duration-300 mt-2 mb-2 pt-5 pb-[68px] px-5 text-center group"
              >
                {/* Top right shape */}
                <div className="absolute top-4 right-0 w-12 h-6 bg-teal-500 transition-transform duration-300 origin-right group-hover:scale-105 rounded-l-md" style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)' }} />
                
                {/* Icon */}
                <div className="flex justify-center mb-2 relative z-10">
                  <Users className="w-8 h-8 text-slate-800 group-hover:text-teal-600 transition-colors" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest mb-1">
                  Total Responden
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-[10px] leading-tight max-w-[90%] mx-auto mb-2 font-medium">
                  Staf Fasyankes Yang Mengisi Survei
                </p>

                {/* Value */}
                <div 
                  className="text-[28px] italic font-extrabold text-slate-800 leading-none"
                  style={{ margin: '0px', marginBottom: '10px', paddingTop: '0px' }}
                >
                  {totalRespondents}
                </div>

                {/* Ribbon Structure */}
                <div className="absolute bottom-3 left-[-10px] right-[-10px] h-10 bg-teal-500 rounded-b-xl rounded-t-sm z-10 transition-colors" />
                
                {/* Left fold */}
                <div className="absolute bottom-[52px] left-[-10px] w-0 h-0 border-b-[10px] border-b-teal-700 border-l-[10px] border-l-transparent z-0" />
                {/* Right fold */}
                <div className="absolute bottom-[52px] right-[-10px] w-0 h-0 border-b-[10px] border-b-teal-700 border-r-[10px] border-r-transparent z-0" />

                {/* Center Hump */}
                <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 w-[50px] h-[50px] bg-teal-500 rounded-full z-10 transition-colors" />
                
                {/* White Circle */}
                <div className="absolute bottom-[27px] left-1/2 -translate-x-1/2 w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center z-20 shadow-[0_0_12px_rgba(20,184,166,0.5)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.9)] group-hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-teal-400/50 opacity-0 group-hover:animate-ping" style={{ animationDuration: '1.5s' }}></div>
                  <UserCheck className="w-5 h-5 text-teal-600 drop-shadow-[0_0_6px_rgba(20,184,166,0.8)] group-hover:scale-110 transition-transform duration-300 relative z-10" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card 2: Unit / Area Kerja Terdata */}
              <div 
                onClick={() => setShowUnitsModal(true)}
                className="cursor-pointer bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-[2.5rem] relative border border-slate-300 shadow-[0_10px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.20)] transition-all transform-gpu duration-300 mt-2 mb-2 pt-5 pb-[68px] px-5 text-center group"
              >
                {/* Top right shape */}
                <div className="absolute top-4 right-0 w-12 h-6 bg-[#2563EB] transition-transform duration-300 origin-right group-hover:scale-105 rounded-l-md" style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)' }} />
                
                {/* Icon */}
                <div className="flex justify-center mb-2 relative z-10">
                  <Building2 className="w-8 h-8 text-slate-800 group-hover:text-[#2563EB] transition-colors" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest mb-1">
                  Area Kerja Terdata
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-[10px] leading-tight max-w-[90%] mx-auto mb-2 font-medium">
                  Total Unit / Area Kerja Yang Mengisi Survei
                </p>

                {/* Value */}
                <div 
                  className="text-[28px] italic font-extrabold text-slate-800 leading-none"
                  style={{ marginBottom: '0px' }}
                >
                  {totalUnits}
                </div>

                {/* Ribbon Structure */}
                <div className="absolute bottom-3 left-[-10px] right-[-10px] h-10 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-b-xl rounded-t-sm z-10 transition-colors" />
                
                {/* Left fold */}
                <div className="absolute bottom-[52px] left-[-10px] w-0 h-0 border-b-[10px] border-b-[#1E3A8A] border-l-[10px] border-l-transparent z-0" />
                {/* Right fold */}
                <div className="absolute bottom-[52px] right-[-10px] w-0 h-0 border-b-[10px] border-b-[#1E3A8A] border-r-[10px] border-r-transparent z-0" />

                {/* Center Hump */}
                <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 w-[50px] h-[50px] bg-[#2563EB] rounded-full z-10 transition-colors" />
                
                {/* White Circle */}
                <div className="absolute bottom-[27px] left-1/2 -translate-x-1/2 w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center z-20 shadow-[0_0_12px_rgba(37,99,235,0.5)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.9)] group-hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-[#2563EB]/40 opacity-0 group-hover:animate-ping" style={{ animationDuration: '1.5s' }}></div>
                  <Briefcase className="w-5 h-5 text-[#2563EB] drop-shadow-[0_0_6px_rgba(37,99,235,0.8)] group-hover:scale-110 transition-transform duration-300 relative z-10" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card 3: Rata-Rata Respon Positif */}
              <div className="bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-[2.5rem] relative border border-slate-300 shadow-[0_10px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.20)] transition-all transform-gpu duration-300 mt-2 mb-2 pt-5 pb-[68px] px-5 text-center group">
                {/* Top right shape */}
                <div className="absolute top-4 right-0 w-12 h-6 bg-orange-500 transition-transform duration-300 origin-right group-hover:scale-105 rounded-l-md" style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)' }} />
                
                {/* Icon */}
                <div className="flex justify-center mb-2 relative z-10">
                  <TrendingUp className="w-8 h-8 text-slate-800 group-hover:text-orange-600 transition-colors" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest mb-1">
                  Respon Positif
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-[10px] leading-tight max-w-[90%] mx-auto mb-2 font-medium">
                  {overallScorePercent >= 75 
                    ? 'Area Kekuatan (strengths, ≥75% respon positif)' 
                    : overallScorePercent === 0 
                    ? 'Belum Ada Data' 
                    : overallScorePercent < 50 
                    ? 'Area Perbaikan (areas for improvement, <50% respon positif)'
                    : 'Area Sedang (50% - 74% respon positif)'}
                </p>

                {/* Value */}
                <div className="text-[28px] italic font-extrabold text-orange-600 leading-none">
                  {overallScorePercent}%
                </div>

                {/* Ribbon Structure */}
                <div className="absolute bottom-3 left-[-10px] right-[-10px] h-10 bg-orange-500 rounded-b-xl rounded-t-sm z-10 transition-colors" />
                
                {/* Left fold */}
                <div className="absolute bottom-[52px] left-[-10px] w-0 h-0 border-b-[10px] border-b-orange-700 border-l-[10px] border-l-transparent z-0" />
                {/* Right fold */}
                <div className="absolute bottom-[52px] right-[-10px] w-0 h-0 border-b-[10px] border-b-orange-700 border-r-[10px] border-r-transparent z-0" />

                {/* Center Hump */}
                <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 w-[50px] h-[50px] bg-orange-500 rounded-full z-10 transition-colors" />
                
                {/* White Circle */}
                <div className="absolute bottom-[27px] left-1/2 -translate-x-1/2 w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center z-20 shadow-[0_0_12px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_20px_rgba(249,115,22,0.9)] group-hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-orange-400/50 opacity-0 group-hover:animate-ping" style={{ animationDuration: '1.5s' }}></div>
                  <Award className="w-5 h-5 text-orange-600 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)] group-hover:scale-110 transition-transform duration-300 relative z-10" strokeWidth={2.5} />
                </div>
              </div>

            </div>

            {/* Tabel Hasil Survei AHRQ 10 Dimensi */}
            <DashboardTable role={role} namaRs={namaRs} identifier={identifier} hospitalId={hospitalId} selectedRsFilter={selectedRsFilter} accounts={accounts} />

          </div>
        )}

        {activeTab === 'analisa-data' && (
          <AnalisaDataTab 
            surveys={filteredSurveys}
            role={role}
            identifier={identifier}
            hospitalId={hospitalId || ''}
            namaRs={namaRs}
            accounts={accounts}
            requests={benchmarkRequests}
            onRefreshRequests={mutateBenchmarkRequests}
          />
        )}

        {activeTab === 'persetujuan-benchmark' && role !== 'admin' && (
          <PersetujuanBenchmarkTab 
            currentHospitalId={hospitalId || identifier}
            currentHospitalName={namaRs}
            requests={benchmarkRequests}
            onRefresh={mutateBenchmarkRequests}
          />
        )}

        {activeTab === 'input' && (
          <InputDataTab 
            currentRsName={namaRs} 
            identifier={identifier}
            hospitalId={hospitalId}
            onSaveSurvey={handleSaveSurvey} 
            surveys={filteredSurveys}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanTab 
            surveys={surveysWithConfig}
            role={role}
            identifier={role === 'admin' ? selectedRsFilter : identifier}
            hospitalId={role === 'admin' ? selectedRsFilter : (hospitalId || '')}
            namaRs={activeHospitalNameForLaporan}
            accounts={accounts}
            requests={benchmarkRequests}
            activeLogo={activeLogo}
          />
        )}

        {activeTab === 'pengaturan' && (
          <PengaturanTab 
            role={role}
            identifier={identifier}
            namaRs={namaRs} 
            onUpdateRsName={onUpdateRsName} 
            onResetData={handleResetData} 
            activeWallpaper={activeWallpaper}
            onUpdateWallpaper={onUpdateWallpaper}
            activeLogo={activeLogo}
            onUpdateLogo={onUpdateLogo}
            activeHeaderImage={activeHeaderImage}
            onUpdateHeaderImage={onUpdateHeaderImage}
            surveys={surveysWithConfig}
          />
        )}

        {activeTab === 'persetujuan' && role === 'admin' && (
          <PersetujuanTab 
            accounts={accounts} 
            onMutateAccounts={mutateAccounts} 
          />
        )}
          </motion.div>
        </AnimatePresence>

        {/* Respondents Modal */}
        <AnimatePresence>
          {showRespondentsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRespondentsModal(false)}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-[22px] overflow-hidden flex flex-col max-h-[85vh] text-slate-800"
              >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      Daftar Responden
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Data staf yang telah berpartisipasi mengisi kuesioner.</p>
                  </div>
                  <button
                    onClick={() => setShowRespondentsModal(false)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm text-left text-slate-700">
                    <thead className="text-xs text-slate-600 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold">No</th>
                        <th className="px-6 py-4 font-bold">Tanggal Input</th>
                        <th className="px-6 py-4 font-bold">Posisi Staf</th>
                        <th className="px-6 py-4 font-bold">Unit/Area Kerja</th>
                        {(role === 'admin' || role === 'rs') && <th className="px-6 py-4 font-bold text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredSurveys.length > 0 ? (
                        filteredSurveys.map((survey, index) => {
                          const rawAnswers = (survey.dimensiScores as any)?._rawAnswers || {};
                          return (
                            <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-600">{survey.tanggalInput}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{rawAnswers.posisiStaf || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">{survey.unitKerja || '-'}</td>
                              {(role === 'admin' || role === 'rs') && (
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => handleDeleteSurvey(survey.id)}
                                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all transform-gpu border border-rose-200 hover:border-transparent inline-flex items-center justify-center cursor-pointer"
                                    title="Hapus Responden"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={(role === 'admin' || role === 'rs') ? 5 : 4} className="px-6 py-8 text-center text-slate-400 font-medium">
                            Belum ada data responden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Unit Kerja Terdata Modal */}
        <AnimatePresence>
          {showUnitsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUnitsModal(false)}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-[22px] overflow-hidden flex flex-col max-h-[85vh] text-slate-800"
              >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Unit / Area Kerja Terdata
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Data jumlah responden berdasarkan unit atau area kerja fasyankes.</p>
                  </div>
                  <button
                    onClick={() => setShowUnitsModal(false)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm text-left text-slate-700">
                    <thead className="text-xs text-slate-600 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold">No</th>
                        <th className="px-6 py-4 font-bold">Tanggal Input</th>
                        <th className="px-6 py-4 font-bold">Unit / Area Kerja</th>
                        <th className="px-6 py-4 font-bold">Posisi Staf</th>
                        <th className="px-6 py-4 font-bold text-center">Jumlah</th>
                        <th className="px-6 py-4 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredSurveys.length > 0 ? (
                        filteredSurveys.map((survey, index) => {
                          const rawAnswers = (survey.dimensiScores as any)?._rawAnswers || {};
                          return (
                            <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-600">{survey.tanggalInput}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{survey.unitKerja || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">{rawAnswers.posisiStaf || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-800">{survey.jumlahResponden || 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleDeleteSurvey(survey.id)}
                                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all transform-gpu border border-rose-200 hover:border-transparent inline-flex items-center justify-center cursor-pointer"
                                  title="Hapus Responden"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                            Belum ada data kuesioner.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Premium Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteConfirm(false);
                    setSurveyToDelete(null);
                  }
                }}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-[22px] overflow-hidden p-6 text-center space-y-6 text-slate-800"
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-sans font-bold text-slate-800">Hapus Data Responden</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Apakah Anda yakin ingin menghapus data responden ini?
                  </p>
                  <p className="text-xs text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-100 inline-block font-bold">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setSurveyToDelete(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all transform-gpu disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={executeDeleteSurvey}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/10 transition-all transform-gpu flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isDeleting ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Menghapus...
                      </span>
                    ) : (
                      <span>Ya, Hapus Data</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Premium Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`fixed bottom-6 right-6 z-[120] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
                notification.type === 'success'
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {notification.type === 'success' ? (
                <div className="w-5 h-5 rounded-md bg-teal-500/15 text-teal-600 border border-teal-200 flex items-center justify-center text-[10px] font-bold">✓</div>
              ) : (
                <div className="w-5 h-5 rounded-md bg-rose-500/15 text-rose-600 border border-rose-200 flex items-center justify-center text-[10px] font-bold">✕</div>
              )}
              <span className="text-xs font-bold leading-none">{notification.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

          </div>
        </main>
      </div>
    </div>
  );
}
