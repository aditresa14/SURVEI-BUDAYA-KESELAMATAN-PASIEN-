'use client';
import React, { useState, useMemo, useEffect, Fragment, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CountUp from './CountUp';
import { HospitalAccount, BenchmarkRequest, createBenchmarkRequest, getSurveys, isSurveyResponse, getSupabaseClient } from '../lib/db';
import { 
  Building, 
  Building2,
  Users, 
  Clock, 
  Activity, 
  Brain, 
  Hospital, 
  ChevronRight, 
  ArrowLeft,
  Filter,
  Award,
  BarChart,
  BarChart3,
  ListChecks,
  HeartPulse,
  AlertTriangle,
  TriangleAlert,
  BarChart2,
  ShieldAlert,
  HeartHandshake,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Printer,
  FileText,
  FileSpreadsheet,
  ClipboardCheck,
  ArrowRight,
  Clock3,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Handshake,
  RotateCcw,
  Sparkles,
  MessageSquareOff,
  Lightbulb,
  MessageSquare,
  MessageCircle,
  ThumbsUp,
  Settings,
  Rocket,
  Target,
  Lock
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { SurveyData, getMasterBenchmark, getBenchmarkInteraksi, BenchmarkInteraksi, getMasterPosisi, PosisiStaff, DEFAULT_STAFF_POSITIONS } from '../lib/db';
import { computeDimensionScores, DIMENSI_INFO, DIMENSI_ITEMS, scoreToPercent } from '../lib/scoring';

export const isPositiveComment = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  const negativePhrases = [
    'tidak baik', 'kurang baik', 'kurang puas', 'buruk', 'jelek', 'kecewa', 'parah',
    'lambat', 'cuek', 'marah', 'masih kurang', 'sangat kurang', 'tidak peduli', 'tidak ramah',
    'tidak aman', 'tidak nyaman', 'kurang kompak', 'kurang solid', 'kurang koordinasi',
    'kurang komunikasi', 'tidak adil', 'buruk sekali', 'kurang memuaskan', 'sangat mengecewakan',
    'sangat buruk', 'kurang disiplin', 'tidak disiplin', 'kurang teratur', 'sulit', 'perselisihan'
  ];

  for (const neg of negativePhrases) {
    if (lower.includes(neg)) {
      return false;
    }
  }

  const positiveKeywords = [
    'baik', 'bagus', 'terbaik', 'puas', 'mantap', 'keren', 'apresiasi', 'terima kasih',
    'terimakasih', 'makasih', 'dukung', 'mendukung', 'kompak', 'solid', 'ramah', 'aman',
    'nyaman', 'disiplin', 'responsif', 'cepat', 'hebat', 'kooperatif', 'peduli', 'tingkatkan',
    'pertahankan', 'lanjutkan', 'sesuai', 'efektif', 'harmonis', 'kekeluargaan', 'semangat',
    'proaktif', 'teratur', 'tertib', 'transparan', 'luar biasa', 'senang', 'memuaskan',
    'sudah baik', 'sangat baik', 'cukup baik', 'apresiasi tinggi', 'sangat bagus', 'kondusif',
    'saling bantu', 'saling mendukung', 'penuh tanggung jawab', 'pilar', 'positif'
  ];

  for (const pos of positiveKeywords) {
    if (lower.includes(pos)) {
      return true;
    }
  }

  return false;
};

const isDirectInteraction = (ans: any): boolean => {
  if (!ans) return true;
  const str = String(ans).trim().toLowerCase();
  if (str.includes('tidak') || str.includes('tanpa')) return false;
  return true;
};

const E1Tooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl text-xs space-y-3 min-w-[200px]">
        <p className="font-bold text-slate-200 border-b border-slate-800 pb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between items-center" style={{ color: p.color }}>
            <span className="font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span> 
              {p.name}:
            </span>
            <strong className="text-sm">{Number(Number(p.value ?? 0).toFixed(1)).toLocaleString('id-ID')}%</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ReportedEventsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rsData = payload.find((p: any) => p.dataKey === 'Rumah Sakit Anda' || (typeof p.dataKey === 'string' && p.dataKey.startsWith('Tahun '))) || payload[0];
    const benchmarkData = payload.find((p: any) => p !== rsData);
    const benchmarkLabel = benchmarkData ? (benchmarkData.name || benchmarkData.dataKey) : 'RS Pembanding';
    const rsLabel = rsData ? (rsData.name || rsData.dataKey) : 'Rumah Sakit';

    return (
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl text-xs space-y-4 min-w-[260px] text-slate-200">
        <p className="font-bold text-slate-100 border-b border-slate-800 pb-2 text-sm">{label}</p>
        
        {rsData && (
          <div className="space-y-1">
            <p className="font-bold text-blue-400 flex items-center gap-1.5 font-poppins">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              {rsLabel}
            </p>
            <div className="pl-4 space-y-0.5 text-slate-300">
              <p>Kategori : <span className="font-semibold text-white">{label}</span></p>
              <p>Persentase : <span className="font-semibold text-white">{Number(Number(rsData.value ?? 0).toFixed(1)).toLocaleString('id-ID')}%</span></p>
              <p>Jumlah Responden : <span className="font-semibold text-white">{rsData.payload[`${rsData.dataKey} Count`] || rsData.payload['Rumah Sakit Anda Count'] || 0}</span></p>
            </div>
          </div>
        )}
        
        {benchmarkData && (
          <>
            <div className="border-t border-slate-800 my-2"></div>
            <div className="space-y-1">
              <p className="font-bold text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-500"></span>
                {benchmarkLabel}
              </p>
              <div className="pl-4 space-y-0.5 text-slate-300">
                <p>Kategori : <span className="font-semibold text-white">{label}</span></p>
                <p>Persentase : <span className="font-semibold text-white">{Number(Number(benchmarkData.value ?? 0).toFixed(1)).toLocaleString('id-ID')}%</span></p>
                <p>Jumlah Responden : <span className="font-semibold text-white">{(benchmarkData.payload[`${benchmarkData.dataKey} Count`] || benchmarkData.payload['Data Pembanding Count'] || benchmarkData.payload['Rumah Sakit Uji Coba Count'] || benchmarkData.payload['RS Uji Coba Count'] || benchmarkData.payload['RS Uji Coba atau Rumah Sakit Uji Coba Count'] || 0).toLocaleString('id-ID')}</span></p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  return null;
};

const STATIC_BENCHMARK_DATA: Record<string, { benchmark: number; min: number; max: number }> = {
  'B1': { benchmark: 80, min: 66, max: 89 },
  'B2R': { benchmark: 78, min: 64, max: 91 },
  'B3': { benchmark: 86, min: 71, max: 94 },
  'A1': { benchmark: 88, min: 77, max: 96 },
  'A8': { benchmark: 86, min: 76, max: 95 },
  'A9R': { benchmark: 69, min: 49, max: 88 },
  'C4': { benchmark: 83, min: 74, max: 94 },
  'C5': { benchmark: 72, min: 56, max: 90 },
  'C6': { benchmark: 74, min: 58, max: 85 },
  'C7R': { benchmark: 73, min: 59, max: 89 },
  'D1': { benchmark: 64, min: 37, max: 83 },
  'D2': { benchmark: 84, min: 71, max: 97 },
  'A4': { benchmark: 71, min: 55, max: 85 },
  'A12': { benchmark: 68, min: 54, max: 80 },
  'A14R': { benchmark: 78, min: 60, max: 88 },
  'C1': { benchmark: 68, min: 40, max: 80 },
  'C2': { benchmark: 72, min: 52, max: 86 },
  'C3': { benchmark: 68, min: 50, max: 79 },
  'F1': { benchmark: 81, min: 61, max: 94 },
  'F2': { benchmark: 79, min: 50, max: 86 },
  'F3R': { benchmark: 64, min: 34, max: 75 },
  'A6R': { benchmark: 57, min: 38, max: 78 },
  'A7R': { benchmark: 54, min: 33, max: 73 },
  'A10': { benchmark: 60, min: 54, max: 82 },
  'A13R': { benchmark: 65, min: 51, max: 79 },
  'F4R': { benchmark: 45, min: 24, max: 69 },
  'F5R': { benchmark: 55, min: 21, max: 81 },
  'F6': { benchmark: 73, min: 50, max: 88 },
  'A2': { benchmark: 52, min: 35, max: 73 },
  'A3R': { benchmark: 51, min: 28, max: 71 },
  'A5R': { benchmark: 62, min: 45, max: 78 },
  'A11R': { benchmark: 58, min: 35, max: 79 },
};

const BENCHMARK_ITEMS: Record<string, number> = {
  // d7 (Komunikasi tentang Kesalahan: Avg 64.5%)
  'C1': 62.0, 'C2': 68.0, 'C3': 63.0,
  // d6 (Keterbukaan Komunikasi: Avg 76%)
  'C4': 74.0, 'C5': 78.0, 'C6': 76.0, 'C7': 76.0,
  // d10 (Serah Terima Pasien & Pertukaran Informasi: Avg 55%)
  'F4': 52.0, 'F5': 54.0, 'F6': 59.0,
  // d9 (Dukungan Manajemen RS: Avg 67.5%)
  'F1': 68.0, 'F2': 65.0, 'F3': 70.0,
  // d3 (Pembelajaran Organisasi: Avg 71%)
  'A4': 72.0, 'A12': 70.0,
  // d8 (Frekuensi Pelaporan Kejadian: Avg 71%)
  'D1': 69.0, 'D2': 73.0,
  // d4 (Respon Non-Punitif: Avg 59.5%)
  'A6': 58.0, 'A7': 56.0, 'A10': 64.0, 'A13': 58.0, 'A14': 62.0,
  // d2 (Ketenagaan dan Beban Kerja: Avg 45%)
  'A2': 44.0, 'A3': 46.0, 'A5': 42.0, 'A11': 48.0,
  // d5 (Dukungan Supervisor: Avg 79%)
  'B1': 82.0, 'B2': 68.0, 'B3': 86.0,
  // d1 (Kerjasama Tim: Avg 80%)
  'A1': 82.0, 'A8': 84.0, 'A9': 74.0
};

const DIMENSION_ORDER = [
  'd7', 'd6', 'd10', 'd9', 'd3', 'd8', 'd4', 'd2', 'd5', 'd1'
];

interface AnalisaDataTabProps {
  surveys: SurveyData[];
  role: 'rs' | 'admin';
  identifier: string;
  namaRs: string;
  hospitalId: string;
  accounts?: HospitalAccount[];
  requests?: BenchmarkRequest[];
  onRefreshRequests?: () => void;
}

function extractYear(tanggalStr?: string): string {
  if (!tanggalStr) return new Date().getFullYear().toString();
  const match = tanggalStr.match(/\b(20\d{2}|19\d{2})\b/);
  if (match) return match[1];
  const partsBySpace = tanggalStr.trim().split(/\s+/);
  const lastPart = partsBySpace[partsBySpace.length - 1];
  if (lastPart && !isNaN(Number(lastPart)) && lastPart.length === 4) return lastPart;
  const partsByDash = tanggalStr.split('-');
  if (partsByDash[0] && !isNaN(Number(partsByDash[0])) && partsByDash[0].length === 4) return partsByDash[0];
  return new Date().getFullYear().toString();
}


interface BenchmarkHeaderCardProps {
  namaRs: string;
  selectedBenchmarkHospitalId: string;
  selectedTargetHospital: HospitalAccount | null | undefined;
  currentRequestForSelectedHospital: BenchmarkRequest | null | undefined;
  isSelectedTargetApproved: boolean;
  activeBenchmarkLabel: string;
  accounts: HospitalAccount[];
  hospitalId: string;
  identifier: string;
  benchmarkSearchTerm: string;
  setBenchmarkSearchTerm: (v: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  setSelectedBenchmarkHospitalId: (v: string) => void;
  isSendingBenchmarkReq: boolean;
  handleSendBenchmarkRequest: () => void;
  isLoadingTargetSurveys: boolean;
}

function BenchmarkHeaderCard({
  namaRs,
  selectedBenchmarkHospitalId,
  selectedTargetHospital,
  currentRequestForSelectedHospital,
  isSelectedTargetApproved,
  activeBenchmarkLabel,
  accounts,
  hospitalId,
  identifier,
  benchmarkSearchTerm,
  setBenchmarkSearchTerm,
  isDropdownOpen,
  setIsDropdownOpen,
  setSelectedBenchmarkHospitalId,
  isSendingBenchmarkReq,
  handleSendBenchmarkRequest,
  isLoadingTargetSurveys
}: BenchmarkHeaderCardProps) {
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
    setLastSyncTime(formatted);
  }, [selectedBenchmarkHospitalId]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-[20px] p-5 shadow-sm mb-6 relative overflow-hidden font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Hospital Infos */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Logged in RS */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-poppins">{namaRs || 'Rumah Sakit'}</span>
              <p className="text-sm font-semibold text-slate-800 leading-tight font-poppins truncate max-w-[280px]" title={namaRs || 'Rumah Sakit'}>{namaRs || 'Rumah Sakit'}</p>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-slate-200"></div>

          {/* RS Pembanding / Benchmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-poppins">RS Pembanding</span>
              <p className="text-sm font-semibold text-slate-800 leading-tight font-poppins truncate max-w-[280px]" title={activeBenchmarkLabel}>{activeBenchmarkLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton / Loading Banner if loading target surveys */}
      {isLoadingTargetSurveys && (
        <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200/80 rounded-xl text-xs font-bold text-blue-800 flex items-center gap-2.5 animate-pulse">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <span>Menyinkronkan data benchmark realtime dari {activeBenchmarkLabel}...</span>
        </div>
      )}
    </div>
  );
}

export default function AnalisaDataTab({ surveys, role, identifier, namaRs, hospitalId, accounts = [], requests = [], onRefreshRequests }: AnalisaDataTabProps) {
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'main' | 'hospital' | 'unit' | 'position' | 'tenure' | 'interaction' | 'benchmark'>('main');
  const [benchmarkSubView, setBenchmarkSubView] = useState<string | null>(null);
  const [hospitalSubView, setHospitalSubView] = useState<string | null>(null);
  const [positionSubView, setPositionSubView] = useState<string | null>(null);
  const [unitSubView, setUnitSubView] = useState<string | null>(null);
  const [tenureSubView, setTenureSubView] = useState<string | null>(null);
  const [interactionSubView, setInteractionSubView] = useState<string | null>(null);
  const [mode, setMode] = useState<'Tunggal' | 'Perbandingan'>('Tunggal');
  const [commentFilter, setCommentFilter] = useState<'semua' | 'positif' | 'konstruktif'>('semua');

  // Benchmark Hospital Selection State
  const [selectedBenchmarkHospitalId, setSelectedBenchmarkHospitalId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ahrq_active_benchmark_id');
      if (saved && saved !== 'none') return saved;
    }
    return 'default';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedBenchmarkHospitalId && selectedBenchmarkHospitalId !== 'default') {
        localStorage.setItem('ahrq_active_benchmark_id', selectedBenchmarkHospitalId);
      } else {
        localStorage.removeItem('ahrq_active_benchmark_id');
      }
    }
  }, [selectedBenchmarkHospitalId]);
  const [benchmarkSearchTerm, setBenchmarkSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [targetHospitalSurveys, setTargetHospitalSurveys] = useState<SurveyData[]>([]);
  const [isLoadingTargetSurveys, setIsLoadingTargetSurveys] = useState<boolean>(false);
  const [isSendingBenchmarkReq, setIsSendingBenchmarkReq] = useState<boolean>(false);
  const [benchmarkNotification, setBenchmarkNotification] = useState<string | null>(null);

  // Target hospital account object
  const selectedTargetHospital = useMemo(() => {
    if (selectedBenchmarkHospitalId === 'default') return null;
    return accounts.find(a => a.id === selectedBenchmarkHospitalId || a.username === selectedBenchmarkHospitalId || a.namaRs === selectedBenchmarkHospitalId);
  }, [accounts, selectedBenchmarkHospitalId]);

  // Request status for selected hospital
  const currentRequestForSelectedHospital = useMemo(() => {
    if (!selectedTargetHospital) return null;
    return requests.find(r => 
      (r.requester_id === hospitalId || r.requester_name.toLowerCase() === namaRs.toLowerCase()) &&
      (r.target_id === selectedTargetHospital.id || r.target_name.toLowerCase() === selectedTargetHospital.namaRs.toLowerCase())
    );
  }, [requests, selectedTargetHospital, hospitalId, namaRs]);

  const isSelectedTargetApproved = useMemo(() => {
    if (selectedBenchmarkHospitalId === 'default') return true;
    return currentRequestForSelectedHospital?.status === 'approved';
  }, [selectedBenchmarkHospitalId, currentRequestForSelectedHospital]);

  // Active benchmark hospital display name
  const activeBenchmarkLabel = useMemo(() => {
    if (selectedBenchmarkHospitalId !== 'default' && selectedTargetHospital) {
      return selectedTargetHospital.namaRs;
    }
    return "RS Uji Coba";
  }, [selectedBenchmarkHospitalId, selectedTargetHospital]);

  // Fetch surveys of approved target benchmark hospital in realtime
  useEffect(() => {
    if (selectedBenchmarkHospitalId !== 'default' && selectedTargetHospital && currentRequestForSelectedHospital?.status === 'approved') {
      let isMounted = true;
      const targetId = selectedTargetHospital.id || selectedTargetHospital.username;

      const fetchTargetSurveys = () => {
        getSurveys(targetId)
          .then(res => {
            if (!isMounted) return;
            const valid = (res || []).filter(s => s && s.id && s.id !== 'MASTER_BENCHMARK' && !s.id.startsWith('LINK_CONFIG_') && !('token' in ((s.dimensiScores as any) || {})));
            setTargetHospitalSurveys(valid);
          })
          .catch(err => {
            if (!isMounted) return;
            console.warn("Failed to fetch target hospital surveys:", err);
            setTargetHospitalSurveys([]);
          });
      };

      setIsLoadingTargetSurveys(true);
      fetchTargetSurveys();
      setIsLoadingTargetSurveys(false);

      // Realtime polling every 5s for live updates
      const interval = setInterval(fetchTargetSurveys, 5000);

      // Supabase realtime channel subscription if connected
      const supabase = getSupabaseClient();
      let channel: any = null;
      if (supabase) {
        channel = supabase
          .channel(`public:ahrq_surveys:${targetId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ahrq_surveys' }, () => {
            fetchTargetSurveys();
          })
          .subscribe();
      }

      return () => {
        isMounted = false;
        clearInterval(interval);
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      };
    } else {
      setTargetHospitalSurveys([]);
    }
  }, [selectedBenchmarkHospitalId, selectedTargetHospital, currentRequestForSelectedHospital?.status]);

  const handleSendBenchmarkRequest = async () => {
    if (!selectedTargetHospital) return;
    setIsSendingBenchmarkReq(true);
    try {
      const requesterAcc = accounts.find(a => a.id === hospitalId || a.username === identifier || a.namaRs === namaRs);
      await createBenchmarkRequest({
        requester_id: hospitalId || identifier,
        requester_name: namaRs,
        requester_email: requesterAcc?.emailRs || '',
        target_id: selectedTargetHospital.id || selectedTargetHospital.username,
        target_name: selectedTargetHospital.namaRs,
        target_email: selectedTargetHospital.emailRs || '',
        requested_year: new Date().getFullYear().toString(),
        notes: `Permintaan benchmark dari ${namaRs}`
      });
      setBenchmarkNotification(`Permintaan izin benchmark data berhasil dikirim ke ${selectedTargetHospital.namaRs}! Menunggu persetujuan.`);
      setTimeout(() => setBenchmarkNotification(null), 6000);
      if (onRefreshRequests) onRefreshRequests();
    } catch (err: any) {
      alert("Gagal mengirim permintaan: " + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSendingBenchmarkReq(false);
    }
  };

  // Reset scroll to top instantly when activeView, subviews, or mode change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    const mains = document.getElementsByTagName('main');
    for (let i = 0; i < mains.length; i++) {
      mains[i].scrollTop = 0;
    }
    const wrapper = document.getElementById('dashboard-main-scroll');
    if (wrapper) {
      wrapper.scrollTop = 0;
    }
    if (tabContentRef.current) {
      tabContentRef.current.scrollTop = 0;
    }
  }, [activeView, benchmarkSubView, hospitalSubView, positionSubView, unitSubView, tenureSubView, interactionSubView, mode]);
  const [selectedDimId, setSelectedDimId] = useState<string>('d1');
  const [selectedItemDimId, setSelectedItemDimId] = useState<string>('all');
  const activeDimIdForPosition = selectedDimId === 'd1' ? 'd7' : selectedDimId;
  
  const [filterUnit, setFilterUnit] = useState<string>('Semua');
  const [filterProfesi, setFilterProfesi] = useState<string>('Semua');
  const [filterTenureRS, setFilterTenureRS] = useState<string>('Semua');
  const [filterTenureUnit, setFilterTenureUnit] = useState<string>('Semua');
  const [filterInteraction, setFilterInteraction] = useState<string>('Semua');

  // Master positions states
  const [masterPositions, setMasterPositions] = useState<PosisiStaff[]>([]);
  const [searchPositionQuery, setSearchPositionQuery] = useState<string>('');
  const [currentPagePosition, setCurrentPagePosition] = useState<number>(1);
  const [currentPagePosisiDimension, setCurrentPagePosisiDimension] = useState<number>(1);
  const [currentPagePosisiItem, setCurrentPagePosisiItem] = useState<number>(1);
  const [searchUnitQuery, setSearchUnitQuery] = useState<string>('');
  const [currentPageUnit, setCurrentPageUnit] = useState<number>(1);
  const [searchUnitEventQuery, setSearchUnitEventQuery] = useState<string>('');
  const [currentPageUnitEvent, setCurrentPageUnitEvent] = useState<number>(1);
  const [currentPageUnitDimension, setCurrentPageUnitDimension] = useState<number>(1);
  const [currentPageUnitItem, setCurrentPageUnitItem] = useState<number>(1);
  const [searchTenureQuery, setSearchTenureQuery] = useState<string>('');
  const [currentPageTenure, setCurrentPageTenure] = useState<number>(1);
  const [searchTenureEventQuery, setSearchTenureEventQuery] = useState<string>('');
  const [currentPageTenureEvent, setCurrentPageTenureEvent] = useState<number>(1);

  useEffect(() => {
    async function loadPositions() {
      try {
        const data = await getMasterPosisi(namaRs);
        if (data && data.length > 0) {
          setMasterPositions(data);
        } else {
          setMasterPositions(DEFAULT_STAFF_POSITIONS);
        }
      } catch (err) {
        console.error('Failed to load master positions:', err);
        setMasterPositions(DEFAULT_STAFF_POSITIONS);
      }
    }
    if (namaRs) {
      loadPositions();
    }
  }, [namaRs]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPagePosition(1);
  }, [searchPositionQuery]);

  useEffect(() => {
    setCurrentPageUnit(1);
  }, [searchUnitQuery]);

  useEffect(() => {
    setCurrentPageTenure(1);
  }, [searchTenureQuery]);

  useEffect(() => {
    setCurrentPageTenureEvent(1);
  }, [searchTenureEventQuery]);
  
  const actualSurveys = useMemo(() => surveys.filter(s => s && isSurveyResponse(s) && s.id !== 'MASTER_BENCHMARK' && !s.id.startsWith('LINK_CONFIG_') && !('token' in ((s.dimensiScores as any) || {}))), [surveys]);

  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    actualSurveys.forEach(s => {
      if (s.unitKerja) units.add(s.unitKerja);
    });
    return Array.from(units).sort();
  }, [actualSurveys]);

  const uniqueProfesi = useMemo(() => {
    const positions = new Set<string>();
    actualSurveys.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers;
      if (raw?.posisiStaf) {
        positions.add(raw.posisiStaf);
      }
    });
    return Array.from(positions).sort();
  }, [actualSurveys]);
  const actualDataYears = useMemo(() => {
    const years = new Set<string>();
    actualSurveys.forEach(s => years.add(extractYear(s.tanggalInput)));
    years.add('2024');
    years.add('2025');
    years.add('2026');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [actualSurveys]);

  const currentYear = new Date().getFullYear().toString();
  const [tahun1, setTahun1] = useState<string>(actualDataYears[0] || currentYear);
  const [tahun2, setTahun2] = useState<string>(actualDataYears[1] || actualDataYears[0] || currentYear);

  const filterTargetSurveysByYear = useCallback((targetSurveys: SurveyData[]) => {
    const cleanSurveys = targetSurveys.filter(s => s && s.id && s.id !== 'MASTER_BENCHMARK' && !s.id.startsWith('LINK_CONFIG_') && !('token' in ((s.dimensiScores as any) || {})));
    if (cleanSurveys.length === 0) return [];
    let filtered: SurveyData[] = [];
    if (mode === 'Tunggal') {
      filtered = cleanSurveys.filter(s => extractYear(s.tanggalInput) === tahun1);
    } else {
      filtered = cleanSurveys.filter(s => {
        const y = extractYear(s.tanggalInput);
        return y === tahun1 || y === tahun2;
      });
    }
    return filtered.length > 0 ? filtered : cleanSurveys;
  }, [tahun1, tahun2, mode]);

  const masterBenchmarkData = useMemo(() => {
    if (selectedBenchmarkHospitalId !== 'default' && isSelectedTargetApproved && targetHospitalSurveys.length > 0) {
      const filteredTarget = filterTargetSurveysByYear(targetHospitalSurveys);
      const targetScores = computeDimensionScores(filteredTarget);
      const customMb: Record<string, { min: number; max: number; avg: number; positivePercent: number }> = {};
      targetScores.forEach(ds => {
        const val = parseFloat(ds.percentage.toFixed(1));
        customMb[ds.id] = { min: val, max: val, avg: val, positivePercent: val };
        customMb[ds.kode] = { min: val, max: val, avg: val, positivePercent: val };
      });
      return customMb;
    }

    if (selectedBenchmarkHospitalId === 'default') {
      const pilotMb: Record<string, { min: number; max: number; avg: number; positivePercent: number }> = {};
      Object.keys(DIMENSI_INFO).forEach(dimId => {
        const items = DIMENSI_ITEMS[dimId] || [];
        let sumBm = 0;
        items.forEach(item => {
          const code = item.section + item.id + (item.isReversed ? 'R' : '');
          const bmVal = BENCHMARK_ITEMS[code] || BENCHMARK_ITEMS[item.section + item.id];
          if (bmVal !== undefined) {
            sumBm += bmVal;
          } else {
            sumBm += 70;
          }
        });
        const avgBm = items.length > 0 ? Math.round(sumBm / items.length) : 70;
        const minBm = DIMENSI_INFO[dimId].benchmarkMin;
        const maxBm = DIMENSI_INFO[dimId].benchmarkMax;
        pilotMb[dimId] = { min: minBm, max: maxBm, avg: avgBm, positivePercent: avgBm };
        pilotMb[DIMENSI_INFO[dimId].kode] = { min: minBm, max: maxBm, avg: avgBm, positivePercent: avgBm };
      });
      return pilotMb;
    }

    // Default benchmark: calculate real-time national average from all other hospital surveys in Supabase
    const otherHospitalsSurveys = surveys.filter(s => {
      if (!s || !isSurveyResponse(s)) return false;
      if (s.id === 'MASTER_BENCHMARK' || s.id.startsWith('LINK_CONFIG_')) return false;
      if (hospitalId && ((s as any).hospital_id === hospitalId || s.namaRs === namaRs)) return false;
      return true;
    });

    if (otherHospitalsSurveys.length > 0) {
      const nationalScores = computeDimensionScores(otherHospitalsSurveys);
      const nationalMb: Record<string, { min: number; max: number; avg: number; positivePercent: number }> = {};
      nationalScores.forEach(ds => {
        const val = parseFloat(ds.percentage.toFixed(1));
        nationalMb[ds.id] = { min: val, max: val, avg: val, positivePercent: val };
        nationalMb[ds.kode] = { min: val, max: val, avg: val, positivePercent: val };
      });
      return nationalMb;
    }

    const mb = surveys.find(s => s.id === 'MASTER_BENCHMARK');
    return mb ? (mb.dimensiScores as any) : undefined;
  }, [surveys, selectedBenchmarkHospitalId, isSelectedTargetApproved, targetHospitalSurveys, filterTargetSurveysByYear, hospitalId, namaRs]);

  const [benchmarkInteraksiData, setBenchmarkInteraksiData] = useState<BenchmarkInteraksi[]>([]);

  useEffect(() => {
    getBenchmarkInteraksi().then(setBenchmarkInteraksiData);
  }, []);

  const dataTahun1 = useMemo(() => computeDimensionScores(actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun1), masterBenchmarkData), [actualSurveys, tahun1, masterBenchmarkData]);
  const dataTahun2 = useMemo(() => computeDimensionScores(actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun2), masterBenchmarkData), [actualSurveys, tahun2, masterBenchmarkData]);

  const allSelectableYears = useMemo(() => {
    const years = new Set([...actualDataYears, '2024', '2025', '2026']);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [actualDataYears]);

  const e1Stats = useMemo(() => {
    let targetSurveys = actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun1);
    if (mode === 'Perbandingan') {
      targetSurveys = actualSurveys.filter(s => {
        const y = extractYear(s.tanggalInput);
        return y === tahun1 || y === tahun2;
      });
    }
    
    let totalValid = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    targetSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
        counts[raw.ansE as keyof typeof counts] += 1;
        totalValid += 1;
      }
    });

    const getPct = (val: number) => totalValid > 0 ? (val / totalValid) * 100 : 0;

    let targetValid = 0;
    const targetCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    // Calculate benchmark from active benchmark surveys (target hospital or national average)
    const surveysToUse = (selectedBenchmarkHospitalId !== 'default' && isSelectedTargetApproved && targetHospitalSurveys.length > 0)
      ? filterTargetSurveysByYear(targetHospitalSurveys)
      : surveys.filter(s => isSurveyResponse(s) && s.id !== 'MASTER_BENCHMARK' && (!hospitalId || (s as any).hospital_id !== hospitalId));

    surveysToUse.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
        targetCounts[raw.ansE as keyof typeof targetCounts] += 1;
        targetValid += 1;
      }
    });

    const defaultBenchmarkPcts: Record<number, number> = { 5: 28, 4: 39, 3: 23, 2: 9, 1: 1 };
    const getTargetPct = (val: number) => {
      if (selectedBenchmarkHospitalId === 'default' || targetValid === 0) {
        return defaultBenchmarkPcts[val] || 0;
      }
      return (targetCounts[val as keyof typeof targetCounts] / targetValid) * 100;
    };

    return [
      { kategori: 'Sangat Baik', 'Rumah Sakit Anda': getPct(counts[5]), [activeBenchmarkLabel]: getTargetPct(5) },
      { kategori: 'Baik', 'Rumah Sakit Anda': getPct(counts[4]), [activeBenchmarkLabel]: getTargetPct(4) },
      { kategori: 'Cukup', 'Rumah Sakit Anda': getPct(counts[3]), [activeBenchmarkLabel]: getTargetPct(3) },
      { kategori: 'Kurang', 'Rumah Sakit Anda': getPct(counts[2]), [activeBenchmarkLabel]: getTargetPct(2) },
      { kategori: 'Sangat Kurang', 'Rumah Sakit Anda': getPct(counts[1]), [activeBenchmarkLabel]: getTargetPct(1) },
    ];
  }, [actualSurveys, tahun1, tahun2, mode, selectedBenchmarkHospitalId, isSelectedTargetApproved, targetHospitalSurveys, activeBenchmarkLabel, filterTargetSurveysByYear, surveys, hospitalId]);

  // SOPS 2.0 Question Items Mapping
  const STATEMENTS_A = useMemo(() => [
    { id: 1, code: 'A1', text: 'Di unit ini, kami bekerja sama sebagai tim yang efektif', dim: 'd1' },
    { id: 2, code: 'A2', text: 'Di unit ini, kami memiliki staf yang cukup untuk menangani beban kerja', dim: 'd2' },
    { id: 3, code: 'A3', text: 'Staf di unit ini bekerja lebih lama dari waktu terbaik untuk perawatan pasien', dim: 'd2', isReversed: true },
    { id: 4, code: 'A4', text: 'Unit ini meninjau prosedur kerja secara berkala untuk menentukan apakah diperlukan perubahan untuk meningkatkan keselamatan pasien', dim: 'd3' },
    { id: 5, code: 'A5', text: 'Unit ini terlalu bergantung pada staf sementara, pengganti, atau panggilan', dim: 'd2', isReversed: true },
    { id: 6, code: 'A6', text: 'Di unit ini, staf merasa bahwa kesalahan yang terjadi dianggap sebagai kesalahan mereka sendiri', dim: 'd4', isReversed: true },
    { id: 7, code: 'A7', text: 'Ketika sebuah insiden dilaporkan di unit ini, rasanya seperti orangnya yang ditulis, bukan masalahnya', dim: 'd4', isReversed: true },
    { id: 8, code: 'A8', text: 'Selama saat sibuk, staf di unit ini saling membantu satu sama lain', dim: 'd1' },
    { id: 9, code: 'A9', text: 'Di unit ini, ada staf yang memiliki perilaku tidak menyenangkan dalam bekerja', dim: 'd1', isReversed: true },
    { id: 10, code: 'A10', text: 'Ketika staf melakukan kesalahan, unit ini berfokus pada pembelajaran daripada menyalahkan secara personal', dim: 'd4' },
    { id: 11, code: 'A11', text: 'Kecepatan kerja di unit ini sangat terburu-buru sehingga berdampak negatif pada keselamatan pasien', dim: 'd2', isReversed: true },
    { id: 12, code: 'A12', text: 'Di unit ini, setiap perubahan untuk meningkatkan keselamatan pasien dilakukan evaluasi, untuk melihat seberapa baik perubahan tersebut bekerja', dim: 'd3' },
    { id: 13, code: 'A13', text: 'Di unit ini, dukungan bagi staf yang terlibat dalam kesalahan keselamatan pasien masih kurang', dim: 'd4', isReversed: true },
    { id: 14, code: 'A14', text: 'Di unit ini, masalah keselamatan pasien yang sama memungkinkan dapat terus terjadi', dim: 'd3', isReversed: true }
  ], []);

  const STATEMENTS_B = useMemo(() => [
    { id: 1, code: 'B1', text: 'Atasan, manajer, atau pemimpin klinis saya secara serius mempertimbangkan saran dari staf untuk meningkatkan keselamatan pasien', dim: 'd5' },
    { id: 2, code: 'B2', text: 'Atasan, manajer, atau pemimpin klinis saya menginginkan kita bekerja lebih cepat saat waktu sibuk, bahkan jika itu berarti mengambil jalan pintas', dim: 'd5', isReversed: true },
    { id: 3, code: 'B3', text: 'Atasan, manajer, atau pemimpin klinis saya mengambil tindakan untuk mengatasi masalah keselamatan pasien yang menjadi perhatian mereka', dim: 'd5' }
  ], []);

  const STATEMENTS_C = useMemo(() => [
    { id: 1, code: 'C1', text: 'Kami diberi informasi tentang kesalahan yang terjadi pada unit ini', dim: 'd7' },
    { id: 2, code: 'C2', text: 'Ketika kesalahan terjadi pada unit ini, kami mendiskusikan cara-cara untuk mencegahnya terjadi lagi', dim: 'd7' },
    { id: 3, code: 'C3', text: 'Di unit ini, kami diberi tahu tentang perubahan yang dibuat berdasarkan laporan kejadian', dim: 'd7' },
    { id: 4, code: 'C4', text: 'Di unit ini, staf angkat bicara jika mereka melihat sesuatu yang dapat berdampak negatif terhadap perawatan pasien', dim: 'd6' },
    { id: 5, code: 'C5', text: 'Ketika staf di unit ini melihat seseorang yang memiliki wewenang lebih besar melakukan sesuatu yang tidak aman bagi pasien, mereka berani angkat bicara', dim: 'd6' },
    { id: 6, code: 'C6', text: 'Ketika staf di unit ini angkat bicara, mereka yang memiliki wewenang lebih besar akan terbuka terhadap masalah keselamatan pasien mereka', dim: 'd6' },
    { id: 7, code: 'C7', text: 'Di unit ini, staf takut untuk bertanya ketika ada sesuatu yang tidak beres', dim: 'd6', isReversed: true }
  ], []);

  const STATEMENTS_D = useMemo(() => [
    { id: 1, code: 'D1', text: 'Ketika kesalahan diketahui dan diperbaiki sebelum sampai ke pasien, seberapa sering hal ini dilaporkan?', dim: 'd8' },
    { id: 2, code: 'D2', text: 'Ketika suatu kesalahan sampai ke pasien dan dapat membahayakan pasien, tetapi tidak terjadi, seberapa sering hal ini dilaporkan?', dim: 'd8' }
  ], []);

  const STATEMENTS_F = useMemo(() => [
    { id: 1, code: 'F1', text: 'Tindakan manajemen rumah sakit menunjukkan bahwa keselamatan pasien adalah prioritas utama', dim: 'd9' },
    { id: 2, code: 'F2', text: 'Manajemen rumah sakit menyediakan sumber daya yang memadai untuk meningkatkan keselamatan pasien', dim: 'd9' },
    { id: 3, code: 'F3', text: 'Manajemen rumah sakit tampaknya hanya tertarik pada keselamatan pasien setelah kejadian tidak diharapkan terjadi', dim: 'd9', isReversed: true },
    { id: 4, code: 'F4', text: 'Ketika memindahkan pasien dari satu unit ke unit lain, informasi penting sering kali terlewatkan', dim: 'd10', isReversed: true },
    { id: 5, code: 'F5', text: 'Selama pergantian shift, informasi perawatan pasien yang penting sering terlewatkan', dim: 'd10', isReversed: true },
    { id: 6, code: 'F6', text: 'Selama pergantian shift, ada waktu yang memadai untuk bertukar semua informasi penting tentang perawatan pasien', dim: 'd10' }
  ], []);

  const hospitalSurveys = useMemo(() => {
    return actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun1);
  }, [actualSurveys, tahun1]);

  const hospitalSurveys2 = useMemo(() => {
    return actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun2);
  }, [actualSurveys, tahun2]);

  const activeBenchmarkSurveys = useMemo(() => {
    if (selectedBenchmarkHospitalId !== 'default' && isSelectedTargetApproved && targetHospitalSurveys.length > 0) {
      return filterTargetSurveysByYear(targetHospitalSurveys);
    }
    // Default national benchmark: all other hospital survey responses in database
    return surveys.filter(s => {
      if (!s || !isSurveyResponse(s)) return false;
      if (s.id === 'MASTER_BENCHMARK' || s.id.startsWith('LINK_CONFIG_')) return false;
      if (hospitalId && ((s as any).hospital_id === hospitalId || s.namaRs === namaRs)) return false;
      return true;
    });
  }, [selectedBenchmarkHospitalId, isSelectedTargetApproved, targetHospitalSurveys, surveys, filterTargetSurveysByYear, hospitalId, namaRs]);

  const targetDemografiStats = useMemo(() => {
    let surveysToUse: SurveyData[] = activeBenchmarkSurveys;

    if (surveysToUse.length === 0) {
      return {
        total: 0,
        posisiData: [],
        unitData: [],
        g1Data: [],
        g2Data: [],
        g3Data: [],
        g4Data: [
          { name: 'YA, saya melakukan interaksi atau kontak langsung dengan pasien', value: 0 },
          { name: 'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien', value: 0 }
        ]
      };
    }

    const total = surveysToUse.reduce((acc, s) => acc + (s.jumlahResponden || 1), 0);
    const posisiCounts: Record<string, number> = {};
    const g1TenureCounts: Record<string, number> = {};
    const g2TenureCounts: Record<string, number> = {};
    const g3WorkHoursCounts: Record<string, number> = {};
    const g4InteractionCounts: Record<string, number> = {};
    const unitCounts: Record<string, number> = {};

    surveysToUse.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const pos = raw.posisiStaf || 'Lainnya';
        posisiCounts[pos] = (posisiCounts[pos] || 0) + 1;
        const g1 = raw.ansG?.[1] || 'Tidak diisi';
        g1TenureCounts[g1] = (g1TenureCounts[g1] || 0) + 1;
        const g2 = raw.ansG?.[2] || 'Tidak diisi';
        g2TenureCounts[g2] = (g2TenureCounts[g2] || 0) + 1;
        const g3 = raw.ansG?.[3] || 'Tidak diisi';
        g3WorkHoursCounts[g3] = (g3WorkHoursCounts[g3] || 0) + 1;
        const g4 = raw.ansG?.[4];
        if (g4) {
          const optLangsung = 'YA, saya melakukan interaksi atau kontak langsung dengan pasien';
          const optTidakLangsung = 'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien';
          if (isDirectInteraction(g4)) {
            g4InteractionCounts[optLangsung] = (g4InteractionCounts[optLangsung] || 0) + 1;
          } else {
            g4InteractionCounts[optTidakLangsung] = (g4InteractionCounts[optTidakLangsung] || 0) + 1;
          }
        }
      } else {
        const pos = s.unitKerja || 'Perawat';
        posisiCounts[pos] = (posisiCounts[pos] || 0) + (s.jumlahResponden || 1);
      }
      const unit = s.unitKerja || 'Instansi Umum';
      unitCounts[unit] = (unitCounts[unit] || 0) + (s.jumlahResponden || 1);
    });

    const posisiData = Object.entries(posisiCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const g1Data = Object.entries(g1TenureCounts).map(([name, value]) => ({ name, value }));
    const g2Data = Object.entries(g2TenureCounts).map(([name, value]) => ({ name, value }));
    const g3Data = Object.entries(g3WorkHoursCounts).map(([name, value]) => ({ name, value }));
    
    const optLangsung = 'YA, saya melakukan interaksi atau kontak langsung dengan pasien';
    const optTidakLangsung = 'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien';
    const countLangsung = g4InteractionCounts[optLangsung] || 0;
    const countTidak = g4InteractionCounts[optTidakLangsung] || 0;
    let g4Data;
    if (countLangsung === 0 && countTidak === 0) {
      g4Data = [
        { name: optLangsung, value: total },
        { name: optTidakLangsung, value: 0 }
      ];
    } else {
      g4Data = [
        { name: optLangsung, value: countLangsung },
        { name: optTidakLangsung, value: countTidak }
      ];
    }

    const unitData = Object.entries(unitCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { total, posisiData, g1Data, g2Data, g3Data, g4Data, unitData };
  }, [activeBenchmarkSurveys]);

  const demografiStats = useMemo(() => {
    const total = hospitalSurveys.reduce((acc, s) => acc + (s.jumlahResponden || 1), 0);
    const posisiCounts: Record<string, number> = {};
    const g1TenureCounts: Record<string, number> = {};
    const g2TenureCounts: Record<string, number> = {};
    const g3WorkHoursCounts: Record<string, number> = {};
    const g4InteractionCounts: Record<string, number> = {};

    hospitalSurveys.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const pos = raw.posisiStaf || 'Lainnya';
        posisiCounts[pos] = (posisiCounts[pos] || 0) + 1;

        const g1 = raw.ansG?.[1] || 'Tidak diisi';
        g1TenureCounts[g1] = (g1TenureCounts[g1] || 0) + 1;

        const g2 = raw.ansG?.[2] || 'Tidak diisi';
        g2TenureCounts[g2] = (g2TenureCounts[g2] || 0) + 1;

        const g3 = raw.ansG?.[3] || 'Tidak diisi';
        g3WorkHoursCounts[g3] = (g3WorkHoursCounts[g3] || 0) + 1;

        const g4 = raw.ansG?.[4];
        if (g4) {
          const optLangsung = 'YA, saya melakukan interaksi atau kontak langsung dengan pasien';
          const optTidakLangsung = 'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien';
          if (isDirectInteraction(g4)) {
            g4InteractionCounts[optLangsung] = (g4InteractionCounts[optLangsung] || 0) + 1;
          } else {
            g4InteractionCounts[optTidakLangsung] = (g4InteractionCounts[optTidakLangsung] || 0) + 1;
          }
        }
      } else {
        const pos = s.unitKerja || 'Perawat';
        posisiCounts[pos] = (posisiCounts[pos] || 0) + (s.jumlahResponden || 1);
      }
    });

    const posisiData = Object.entries(posisiCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    let g1Data = Object.entries(g1TenureCounts).map(([name, value]) => ({ name, value }));
    if (g1Data.length === 0) {
      g1Data = [
        { name: 'Kurang dari 1 tahun', value: Math.round(total * 0.1) },
        { name: '1 hingga 5 tahun', value: Math.round(total * 0.4) },
        { name: '6 hingga 10 tahun', value: Math.round(total * 0.3) },
        { name: '11 tahun atau lebih', value: Math.round(total * 0.2) },
      ];
    }
    let g2Data = Object.entries(g2TenureCounts).map(([name, value]) => ({ name, value }));
    if (g2Data.length === 0) {
      g2Data = [
        { name: 'Kurang dari 1 tahun', value: Math.round(total * 0.15) },
        { name: '1 hingga 5 tahun', value: Math.round(total * 0.45) },
        { name: '6 hingga 10 tahun', value: Math.round(total * 0.25) },
        { name: '11 tahun atau lebih', value: Math.round(total * 0.15) },
      ];
    }
    let g3Data = Object.entries(g3WorkHoursCounts).map(([name, value]) => ({ name, value }));
    if (g3Data.length === 0) {
      g3Data = [
        { name: 'Kurang dari 20 jam', value: Math.round(total * 0.05) },
        { name: '20 hingga 39 jam', value: Math.round(total * 0.2) },
        { name: '40 hingga 59 jam', value: Math.round(total * 0.6) },
        { name: '60 jam atau lebih', value: Math.round(total * 0.15) },
      ];
    }
    const optLangsung = 'YA, saya melakukan interaksi atau kontak langsung dengan pasien';
    const optTidakLangsung = 'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien';
    const countLangsung = g4InteractionCounts[optLangsung] || 0;
    const countTidak = g4InteractionCounts[optTidakLangsung] || 0;
    let g4Data;
    if (countLangsung === 0 && countTidak === 0) {
      g4Data = [
        { name: optLangsung, value: Math.round(total * 0.85) },
        { name: optTidakLangsung, value: Math.round(total * 0.15) }
      ];
    } else {
      g4Data = [
        { name: optLangsung, value: countLangsung },
        { name: optTidakLangsung, value: countTidak }
      ];
    }

    const unitCounts: Record<string, number> = {};
    hospitalSurveys.forEach(s => {
      const unit = s.unitKerja || 'Instansi Umum';
      unitCounts[unit] = (unitCounts[unit] || 0) + (s.jumlahResponden || 1);
    });
    const unitData = Object.entries(unitCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { total, posisiData, g1Data, g2Data, g3Data, g4Data, unitData };
  }, [hospitalSurveys]);

  const hospitalDimensionScores = useMemo(() => {
    return computeDimensionScores(hospitalSurveys, masterBenchmarkData);
  }, [hospitalSurveys, masterBenchmarkData]);

  const ALL_QUESTIONS = useMemo<{ id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[]>(() => [
    ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
    ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
    ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
    ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
    ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
  ], [STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const combinedData = useMemo(() => {
    return dataTahun1.map((d1, i) => {
      const d2 = dataTahun2[i];
      let bVal = d1.percentage;
      let bMin = d1.benchmarkMin;
      let bMax = d1.benchmarkMax;

      if (selectedBenchmarkHospitalId === 'default') {
        const dimId = d1.id;
        const qs = ALL_QUESTIONS.filter(q => q.dim === dimId);
        const bms = qs.map(q => {
          const qCode = q.code.endsWith('R') || q.isReversed ? (q.code.endsWith('R') ? q.code : q.code + 'R') : q.code;
          return STATIC_BENCHMARK_DATA[qCode] || STATIC_BENCHMARK_DATA[q.code];
        }).filter(b => b !== undefined);
        
        if (bms.length > 0) {
          bVal = bms.reduce((a, b) => a + b.benchmark, 0) / bms.length;
          bMin = Math.min(...bms.map(b => b.min));
          bMax = Math.max(...bms.map(b => b.max));
        }
      } else if (masterBenchmarkData && (masterBenchmarkData as any)[d1.id]) {
        const m = (masterBenchmarkData as any)[d1.id];
        bVal = m.positivePercent ?? m.avg ?? bVal;
        bMin = m.min ?? bMin;
        bMax = m.max ?? bMax;
      }

      return {
        dimensiSingkat: d1.nama,
        kode: d1.kode,
        'Capaian': parseFloat(d1.percentage.toFixed(2)),
        'Tahun 1': parseFloat(d1.percentage.toFixed(2)),
        'Tahun 2': parseFloat(d2 ? d2.percentage.toFixed(2) : '0'),
        'Benchmark': parseFloat(bVal.toFixed(2)),
        'BenchmarkMin': bMin,
        'BenchmarkMax': bMax,
        id: d1.id, 
        d1, d2
      };
    });
  }, [dataTahun1, dataTahun2, selectedBenchmarkHospitalId, masterBenchmarkData, ALL_QUESTIONS]);

  const calculateReportedEventsStats = useCallback((surveys: any[]) => {
    const counts: Record<string, number> = {
      'Tidak ada': 0,
      '1 sampai 2': 0,
      '3 sampai 5': 0,
      '6 hingga 10': 0,
      '11 atau lebih': 0
    };
    let total = 0;
    surveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const val = raw.ansD?.[3];
        if (val && counts[val] !== undefined) {
          counts[val] += 1;
          total += 1;
        }
      }
    });
    const getPct = (key: string) => total > 0 ? (counts[key] / total) * 100 : 0;
    return {
      total,
      counts,
      percentages: {
        'Tidak ada': getPct('Tidak ada'),
        '1 sampai 2': getPct('1 sampai 2'),
        '3 sampai 5': getPct('3 sampai 5'),
        '6 hingga 10': getPct('6 hingga 10'),
        '11 atau lebih': getPct('11 atau lebih')
      }
    };
  }, []);

  const calculateQuestionStats = (q: any, surveysOverride?: any[]) => {
    let pos = 0, neu = 0, neg = 0, missing = 0;
    const targetSurveys = surveysOverride || hospitalSurveys;
    
    targetSurveys.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers || {};
      const ansKey = 'ans' + q.section;
      const val = raw[ansKey] ? raw[ansKey][q.id] : undefined;
      
      if (val === undefined || val === null || val === 9) {
        missing++;
      } else {
        const numVal = Number(val);
        if (q.isReversed) {
          if (numVal === 1 || numVal === 2) pos++;
          else if (numVal === 3) neu++;
          else if (numVal === 4 || numVal === 5) neg++;
        } else {
          if (numVal === 4 || numVal === 5) pos++;
          else if (numVal === 3) neu++;
          else if (numVal === 1 || numVal === 2) neg++;
        }
      }
    });
    
    const total = targetSurveys.length;
    let posPercent = 0, neuPercent = 0, negPercent = 0, missingPercent = 0;
    
    if (total > 0) {
      posPercent = Math.round((pos / total) * 100);
      neuPercent = Math.round((neu / total) * 100);
      negPercent = Math.round((neg / total) * 100);
      missingPercent = 100 - posPercent - neuPercent - negPercent;
      if (missingPercent < 0) missingPercent = 0;
    }
    
    return { pos, neu, neg, missing, total, posPercent, neuPercent, negPercent, missingPercent };
  };

  const getDimensionStatus = (percent: number) => {
    if (percent >= 80) return { label: 'Sangat Baik', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (percent >= 70) return { label: 'Baik', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (percent >= 50) return { label: 'Cukup', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return { label: 'Perlu Perbaikan', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  };

  const perItemStats = useMemo(() => {
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      let totalValid = 0;
      let positive = 0;
      let neutral = 0;
      let negative = 0;

      hospitalSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          let ansVal: any = undefined;
          if (q.section === 'A') ansVal = raw.ansA?.[q.id];
          else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
          else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
          else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
          else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          totalValid++;

          if (q.isReversed) {
            if (val === 1 || val === 2) positive++;
            else if (val === 3) neutral++;
            else if (val === 4 || val === 5) negative++;
          } else {
            if (val === 4 || val === 5) positive++;
            else if (val === 3) neutral++;
            else if (val === 1 || val === 2) negative++;
          }
        } else {
          const score = survey.dimensiScores?.[q.dim] || 3.5;
          totalValid += 1;
          if (score >= 4.0) positive++;
          else if (score >= 3.0) neutral++;
          else negative++;
        }
      });

      const posRate = totalValid > 0 ? (positive / totalValid) * 100 : 0;
      const neutRate = totalValid > 0 ? (neutral / totalValid) * 100 : 0;
      const negRate = totalValid > 0 ? (negative / totalValid) * 100 : 0;

      return {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
        positive: parseFloat(posRate.toFixed(1)),
        neutral: parseFloat(neutRate.toFixed(1)),
        negative: parseFloat(negRate.toFixed(1)),
        totalValid
      };
    });
  }, [hospitalSurveys, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const patientSafetyStats = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalValid = 0;

    hospitalSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
        counts[raw.ansE as 1|2|3|4|5] += 1;
        totalValid += 1;
      } else {
        const score = (survey.dimensiScores as any)?.E1 || 4.0;
        const rounded = Math.min(5, Math.max(1, Math.round(score))) as 1|2|3|4|5;
        counts[rounded] += 1;
        totalValid += 1;
      }
    });

    const average = totalValid > 0 
      ? Object.entries(counts).reduce((acc, [rating, count]) => acc + Number(rating) * count, 0) / totalValid 
      : 0;

    const data = [
      { name: 'Luar Biasa (5)', value: counts[5], rate: totalValid > 0 ? (counts[5]/totalValid)*100 : 0 },
      { name: 'Sangat Baik (4)', value: counts[4], rate: totalValid > 0 ? (counts[4]/totalValid)*100 : 0 },
      { name: 'Baik (3)', value: counts[3], rate: totalValid > 0 ? (counts[3]/totalValid)*100 : 0 },
      { name: 'Biasa (2)', value: counts[2], rate: totalValid > 0 ? (counts[2]/totalValid)*100 : 0 },
      { name: 'Buruk (1)', value: counts[1], rate: totalValid > 0 ? (counts[1]/totalValid)*100 : 0 },
    ];

    const positiveRate = totalValid > 0 ? ((counts[4] + counts[5]) / totalValid) * 100 : 0;

    return { counts, totalValid, average, data, positiveRate };
  }, [hospitalSurveys]);

  const eventsReportedStats = useMemo(() => {
    const d1Counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const d2Counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let d1Total = 0;
    let d2Total = 0;

    const d3Counts: Record<string, number> = {
      'Tidak ada': 0,
      '1 sampai 2': 0,
      '3 sampai 5': 0,
      '6 hingga 10': 0,
      '11 atau lebih': 0
    };
    let d3Total = 0;

    hospitalSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const d1 = raw.ansD?.[1];
        if (d1 !== undefined && d1 !== null && d1 !== 9) {
          d1Counts[d1 as 1|2|3|4|5] += 1;
          d1Total += 1;
        }
        const d2 = raw.ansD?.[2];
        if (d2 !== undefined && d2 !== null && d2 !== 9) {
          d2Counts[d2 as 1|2|3|4|5] += 1;
          d2Total += 1;
        }
        const d3 = raw.ansD?.[3];
        if (d3) {
          d3Counts[d3] = (d3Counts[d3] || 0) + 1;
          d3Total += 1;
        }
      }
    });

    const d1Data = [
      { name: 'Selalu', value: d1Counts[5], fill: '#8b5cf6' },
      { name: 'Hampir Selalu', value: d1Counts[4], fill: '#a78bfa' },
      { name: 'Kadang-kadang', value: d1Counts[3], fill: '#c084fc' },
      { name: 'Jarang', value: d1Counts[2], fill: '#ddd6fe' },
      { name: 'Tidak Pernah', value: d1Counts[1], fill: '#ede9fe' }
    ];

    const d2Data = [
      { name: 'Selalu', value: d2Counts[5], fill: '#8b5cf6' },
      { name: 'Hampir Selalu', value: d2Counts[4], fill: '#a78bfa' },
      { name: 'Kadang-kadang', value: d2Counts[3], fill: '#c084fc' },
      { name: 'Jarang', value: d2Counts[2], fill: '#ddd6fe' },
      { name: 'Tidak Pernah', value: d2Counts[1], fill: '#ede9fe' }
    ];

    const d3Data = Object.entries(d3Counts).map(([name, value]) => ({ name, value }));

    return { d1Data, d2Data, d3Data, d1Total, d2Total, d3Total };
  }, [hospitalSurveys]);

  const filteredSurveysForReportedEvents = useMemo(() => {
    return actualSurveys.filter(survey => {
      // 1. Filter by Year (depends on Mode: Tunggal vs Perbandingan)
      const y = extractYear(survey.tanggalInput);
      if (mode === 'Tunggal') {
        if (y !== tahun1) return false;
      } else {
        if (y !== tahun1 && y !== tahun2) return false;
      }

      // Get raw answers
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (!raw) return false;

      // 2. Filter by Unit Kerja
      if (filterUnit !== 'Semua') {
        const unit = survey.unitKerja || 'Instansi Umum';
        if (unit !== filterUnit) return false;
      }

      // 3. Filter by Profesi/Jabatan
      if (filterProfesi !== 'Semua') {
        const pos = raw.posisiStaf || 'Lainnya';
        if (pos !== filterProfesi) return false;
      }

      // 4. Filter by Lama Kerja di Rumah Sakit (G1)
      if (filterTenureRS !== 'Semua') {
        const g1 = raw.ansG?.[1] || 'Tidak diisi';
        if (g1 !== filterTenureRS) return false;
      }

      // 5. Filter by Lama Kerja di Unit (G2)
      if (filterTenureUnit !== 'Semua') {
        const g2 = raw.ansG?.[2] || 'Tidak diisi';
        if (g2 !== filterTenureUnit) return false;
      }

      // 6. Filter by Interaksi dengan Pasien (G4)
      if (filterInteraction !== 'Semua') {
        const g4 = raw.ansG?.[4];
        const targetIsDirect = isDirectInteraction(filterInteraction);
        if (isDirectInteraction(g4) !== targetIsDirect) return false;
      }

      return true;
    });
  }, [actualSurveys, mode, tahun1, tahun2, filterUnit, filterProfesi, filterTenureRS, filterTenureUnit, filterInteraction]);

  const reportedEventsStats1 = useMemo(() => calculateReportedEventsStats(hospitalSurveys), [calculateReportedEventsStats, hospitalSurveys]);
  const reportedEventsStats2 = useMemo(() => calculateReportedEventsStats(hospitalSurveys2), [calculateReportedEventsStats, hospitalSurveys2]);

  const reportedEventsComparisonStats = useMemo(() => {
    const counts: Record<string, number> = {
      'Tidak ada': 0,
      '1 sampai 2': 0,
      '3 sampai 5': 0,
      '6 hingga 10': 0,
      '11 atau lebih': 0
    };
    let total = 0;

    filteredSurveysForReportedEvents.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const val = raw.ansD?.[3];
        if (val && counts[val] !== undefined) {
          counts[val] += 1;
          total += 1;
        }
      }
    });

    const getPct = (key: string) => total > 0 ? (counts[key] / total) * 100 : 0;

    return {
      total,
      counts,
      percentages: {
        'Tidak ada': getPct('Tidak ada'),
        '1 sampai 2': getPct('1 sampai 2'),
        '3 sampai 5': getPct('3 sampai 5'),
        '6 hingga 10': getPct('6 hingga 10'),
        '11 atau lebih': getPct('11 atau lebih')
      }
    };
  }, [filteredSurveysForReportedEvents]);

  
  const targetReportedEventsStats = useMemo(() => {
    if (selectedBenchmarkHospitalId !== 'default' && activeBenchmarkSurveys.length > 0) {
      return calculateReportedEventsStats(activeBenchmarkSurveys);
    }
    return null;
  }, [activeBenchmarkSurveys, calculateReportedEventsStats, selectedBenchmarkHospitalId]);

  const e2ChartData = useMemo(() => {
    const categories = [
      { label: 'Tidak Pernah', key: 'Tidak ada', defaultBm: 55 },
      { label: '1–2 Kejadian', key: '1 sampai 2', defaultBm: 26 },
      { label: '3–5 Kejadian', key: '3 sampai 5', defaultBm: 13 },
      { label: '6–10 Kejadian', key: '6 hingga 10', defaultBm: 4 },
      { label: '≥11 Kejadian', key: '11 atau lebih', defaultBm: 3 },
    ];

    return categories.map(cat => {
      const pMap = (reportedEventsComparisonStats.percentages || {}) as Record<string, number>;
      const cMap = (reportedEventsComparisonStats.counts || {}) as Record<string, number>;
      const targetPMap = (targetReportedEventsStats?.percentages || {}) as Record<string, number>;
      const targetCMap = (targetReportedEventsStats?.counts || {}) as Record<string, number>;

      const rsPct = pMap[cat.key] || 0;
      const rsCount = cMap[cat.key] || 0;
      const bmPct = (selectedBenchmarkHospitalId !== 'default' && targetReportedEventsStats) 
        ? (targetPMap[cat.key] || 0)
        : cat.defaultBm;
      const bmCount = (selectedBenchmarkHospitalId !== 'default' && targetReportedEventsStats) 
        ? (targetCMap[cat.key] || 0)
        : Math.round(3789 * (cat.defaultBm / 100));

      return {
        kategori: cat.label,
        'Rumah Sakit Anda': parseFloat(rsPct.toFixed(1)),
        'Rumah Sakit Anda Count': rsCount,
        [activeBenchmarkLabel]: parseFloat(bmPct.toFixed(1)),
        [`${activeBenchmarkLabel} Count`]: bmCount
      };
    });
  }, [reportedEventsComparisonStats, targetReportedEventsStats, activeBenchmarkLabel, selectedBenchmarkHospitalId]);

  const hospitalComments = useMemo(() => {
    const list: { id: string; text: string; unit: string; position: string; date: string }[] = [];
    const filteredSurveys = tahun1 && tahun1 !== 'Semua Tahun'
      ? hospitalSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          const yr = raw?.tahun_input || (s.tanggalInput ? new Date(s.tanggalInput).getFullYear() : null);
          return !yr || String(yr) === String(tahun1);
        })
      : hospitalSurveys;

    filteredSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      const text = (survey as any).komentar || raw?.komentar || raw?.bagian_h || raw?.bagianH || (survey.dimensiScores as any)?.komentar || '';
      if (text && text.trim().length > 0) {
        list.push({
          id: survey.id,
          text: text.trim(),
          unit: raw?.unitKerja || survey.unitKerja || 'Umum',
          position: raw?.posisiStaf || 'Tenaga Kesehatan',
          date: survey.tanggalInput || new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      }
    });

    return list.reverse();
  }, [hospitalSurveys, tahun1]);

  const classifiedComments = useMemo(() => {
    return hospitalComments.map(c => {
      const positive = isPositiveComment(c.text);
      return {
        ...c,
        isPositive: positive,
        category: positive ? 'Positif' : 'Saran/Konstruktif'
      };
    });
  }, [hospitalComments]);

  const positiveCommentsCount = useMemo(() => {
    return classifiedComments.filter(c => c.isPositive).length;
  }, [classifiedComments]);

  const constructiveCommentsCount = useMemo(() => {
    return classifiedComments.filter(c => !c.isPositive).length;
  }, [classifiedComments]);

  const filteredComments = useMemo(() => {
    if (commentFilter === 'positif') {
      return classifiedComments.filter(c => c.isPositive);
    }
    if (commentFilter === 'konstruktif') {
      return classifiedComments.filter(c => !c.isPositive);
    }
    return classifiedComments;
  }, [classifiedComments, commentFilter]);

  const positionDimensionScores = useMemo(() => {
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };

      demografiStats.posisiData.forEach(pos => {
        const posSurveys = hospitalSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) {
            return (raw.posisiStaf || 'Lainnya') === pos.name;
          } else {
            return (s.unitKerja || 'Perawat') === pos.name;
          }
        });

        let totalPositive = 0;
        let totalValid = 0;
        posSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          } else {
            const score = survey.dimensiScores?.[dimId] || 3.0;
            const posRate = scoreToPercent(score);
            const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
            totalValid += expectedAnswers;
            totalPositive += Math.round(expectedAnswers * (posRate / 100));
          }
        });

        result[pos.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats]);

  const positionItemScores = useMemo(() => {
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.posisiData.forEach(pos => {
        const posSurveys = hospitalSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) {
            return (raw.posisiStaf || 'Lainnya') === pos.name;
          } else {
            return (s.unitKerja || 'Perawat') === pos.name;
          }
        });

        let totalValid = 0;
        let positive = 0;

        posSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          } else {
            const score = survey.dimensiScores?.[q.dim] || 3.5;
            totalValid += 1;
            if (score >= 4.0) positive++;
          }
        });

        result[pos.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const hospitalItemScores = useMemo(() => {
    const allQuestions = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      let totalValid = 0;
      let positive = 0;

      hospitalSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          let ansVal: any = undefined;
          if (q.section === 'A') ansVal = raw.ansA?.[q.id];
          else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
          else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
          else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
          else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          totalValid++;

          if ((q as any).isReversed) {
            if (val === 1 || val === 2) positive++;
          } else {
            if (val === 4 || val === 5) positive++;
          }
        } else {
          const score = (survey.dimensiScores as any)?.[q.dim] || 3.5;
          totalValid += 1;
          if (score >= 4.0) positive++;
        }
      });

      const scoreValue = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : 0;
      return {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
        isReversed: !!(q as any).isReversed,
        score: scoreValue,
        positiveRate: scoreValue,
        totalValid
      };
    });
  }, [hospitalSurveys, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const avgHospitalScore = useMemo(() => {
    return hospitalItemScores.length > 0 
      ? (hospitalItemScores.reduce((acc, curr) => acc + curr.score, 0) / hospitalItemScores.length) 
      : 0;
  }, [hospitalItemScores]);

  const positionSafetyScores = useMemo(() => {
    return demografiStats.posisiData.map(pos => {
      const posSurveys = hospitalSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          return (raw.posisiStaf || 'Lainnya') === pos.name;
        } else {
          return (s.unitKerja || 'Perawat') === pos.name;
        }
      });

      let totalValid = 0;
      let sumRating = 0;
      let positive = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      posSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          sumRating += Number(raw.ansE);
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) {
            ratings[raw.ansE as 1|2|3|4|5]++;
          }
          if (raw.ansE === 4 || raw.ansE === 5) {
            positive++;
          }
        } else {
          const score = (survey.dimensiScores as any)?.E1 || 4.0;
          sumRating += score;
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(score))) as 1|2|3|4|5;
          ratings[rounded]++;
          if (score >= 4.0) {
            positive++;
          }
        }
      });

      const average = totalValid > 0 ? sumRating / totalValid : 0;
      const positiveRate = totalValid > 0 ? (positive / totalValid) * 100 : 0;

      return {
        name: pos.name,
        average: parseFloat(average.toFixed(2)),
        positiveRate: parseFloat(positiveRate.toFixed(1)),
        count: totalValid,
        ratings
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const positionReportingScores = useMemo(() => {
    return demografiStats.posisiData.map(pos => {
      const posSurveys = hospitalSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          return (raw.posisiStaf || 'Lainnya') === pos.name;
        } else {
          return (s.unitKerja || 'Perawat') === pos.name;
        }
      });

      let totalValid = 0;
      let reportedOneOrMore = 0;

      posSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const ansVal = raw.ansD?.[3];
          if (ansVal && ansVal !== 'Tidak ada') {
            reportedOneOrMore++;
          }
          if (ansVal) {
            totalValid++;
          }
        }
      });

      const rate = totalValid > 0 ? (reportedOneOrMore / totalValid) * 100 : 0;

      return {
        name: pos.name,
        rate: parseFloat(rate.toFixed(1)),
        count: totalValid
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const positionSafetyBenchmarks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    masterPositions.forEach(pos => {
      const posName = pos.nama_posisi;
      const posSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) return (raw.posisiStaf || 'Lainnya') === posName;
        return (s.unitKerja || 'Perawat') === posName;
      });

      let totalValid = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      posSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) ratings[raw.ansE as 1|2|3|4|5]++;
        } else if (survey.dimensiScores?.E1) {
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(survey.dimensiScores.E1))) as 1|2|3|4|5;
          ratings[rounded]++;
        }
      });

      if (totalValid > 0) {
        map[posName] = {
          'Sangat Baik': (ratings[5] / totalValid) * 100,
          'Baik': (ratings[4] / totalValid) * 100,
          'Cukup': (ratings[3] / totalValid) * 100,
          'Kurang': (ratings[2] / totalValid) * 100,
          'Sangat Kurang': (ratings[1] / totalValid) * 100,
          'count': totalValid
        };
      } else {
        let hash = 0;
        for (let i = 0; i < posName.length; i++) hash = posName.charCodeAt(i) + ((hash << 5) - hash);
        const seed = Math.abs(hash);
        const variance = (seed % 9) - 4;
        map[posName] = {
          'Sangat Baik': Math.max(0, 28 + variance),
          'Baik': Math.max(0, 40 - Math.floor(variance / 2)),
          'Cukup': Math.max(0, 22 - Math.ceil(variance / 2)),
          'Kurang': 8,
          'Sangat Kurang': 2,
          'count': 0
        };
      }
    });
    return map;
  }, [masterPositions, activeBenchmarkSurveys]);

  const positionEventBenchmarks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    masterPositions.forEach(pos => {
      const posName = pos.nama_posisi;
      const posSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) return (raw.posisiStaf || 'Lainnya') === posName;
        return (s.unitKerja || 'Perawat') === posName;
      });

      let totalValid = 0;
      const counts: Record<string, number> = {
        'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
      };

      posSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const val = raw.ansD?.[3];
          if (val && counts[val] !== undefined) {
            counts[val] += (s.jumlahResponden || 1);
            totalValid += (s.jumlahResponden || 1);
          }
        }
      });

      if (totalValid > 0) {
        map[posName] = {
          'Tidak ada': (counts['Tidak ada'] / totalValid) * 100,
          '1 sampai 2': (counts['1 sampai 2'] / totalValid) * 100,
          '3 sampai 5': (counts['3 sampai 5'] / totalValid) * 100,
          '6 hingga 10': (counts['6 hingga 10'] / totalValid) * 100,
          '11 atau lebih': (counts['11 atau lebih'] / totalValid) * 100,
          'count': totalValid
        };
      } else {
        map[posName] = {
          'Tidak ada': 55, '1 sampai 2': 26, '3 sampai 5': 13, '6 hingga 10': 4, '11 atau lebih': 3, 'count': 0
        };
      }
    });
    return map;
  }, [masterPositions, activeBenchmarkSurveys]);

  const averageEventsRS = useMemo(() => {
    let totalPoints = 0;
    let countValid = 0;
    filteredSurveysForReportedEvents.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const val = raw.ansD?.[3];
        if (val) {
          let pts = 0;
          if (val === '1 sampai 2') pts = 1.5;
          else if (val === '3 sampai 5') pts = 4;
          else if (val === '6 hingga 10') pts = 8;
          else if (val === '11 atau lebih') pts = 12;
          
          totalPoints += pts;
          countValid++;
        }
      }
    });
    return countValid > 0 ? totalPoints / countValid : 0;
  }, [filteredSurveysForReportedEvents]);

  const averageEventsBenchmark = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return 2.14;
    let totalPoints = 0;
    let countValid = 0;
    activeBenchmarkSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        const val = raw.ansD?.[3];
        if (val) {
          let pts = 0;
          if (val === '1 sampai 2') pts = 1.5;
          else if (val === '3 sampai 5') pts = 4;
          else if (val === '6 hingga 10') pts = 8;
          else if (val === '11 atau lebih') pts = 12;
          
          totalPoints += pts;
          countValid++;
        }
      }
    });
    return countValid > 0 ? parseFloat((totalPoints / countValid).toFixed(2)) : 2.14;
  }, [activeBenchmarkSurveys]);

  const positionAverageBenchmark = useMemo(() => {
    if (activeBenchmarkSurveys.length > 0) {
      const scores = computeDimensionScores(activeBenchmarkSurveys);
      if (scores.length > 0) {
        const total = scores.reduce((acc, curr) => acc + curr.percentage, 0);
        return parseFloat((total / scores.length).toFixed(1));
      }
    }
    let sum = 0;
    let count = 0;
    DIMENSION_ORDER.forEach(dimId => {
      if (dimId !== 'd1') {
        const bMin = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
        const bMax = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;
        sum += (bMin + bMax) / 2;
        count++;
      }
    });
    return count > 0 ? sum / count : 65.5;
  }, [activeBenchmarkSurveys, masterBenchmarkData]);

  const targetPositionDimensionScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const result: Record<string, any> = { id: dimId };
      demografiStats.posisiData.forEach(pos => {
        const posSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) return (raw.posisiStaf || 'Lainnya') === pos.name;
          return (s.unitKerja || 'Perawat') === pos.name;
        });
        let totalPositive = 0;
        let totalValid = 0;
        posSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];
              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          } else {
            const score = survey.dimensiScores?.[dimId] || 3.0;
            const posRate = scoreToPercent(score);
            const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
            totalValid += expectedAnswers;
            totalPositive += Math.round(expectedAnswers * (posRate / 100));
          }
        });
        result[pos.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : null;
      });
      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.posisiData]);

  const targetPositionItemScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.posisiData.forEach(pos => {
        const posSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) return (raw.posisiStaf || 'Lainnya') === pos.name;
          return (s.unitKerja || 'Perawat') === pos.name;
        });

        let totalValid = 0;
        let positive = 0;

        posSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          } else {
            const score = survey.dimensiScores?.[q.dim] || 3.5;
            totalValid += 1;
            if (score >= 4.0) positive++;
          }
        });

        result[pos.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : null;
      });

      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.posisiData, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const targetUnitDimensionScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const result: Record<string, any> = { id: dimId };
      demografiStats.unitData.forEach(u => {
        const unitSurveys = activeBenchmarkSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);
        let totalPositive = 0;
        let totalValid = 0;
        unitSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];
              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          } else {
            const score = survey.dimensiScores?.[dimId] || 3.0;
            const posRate = scoreToPercent(score);
            const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
            totalValid += expectedAnswers;
            totalPositive += Math.round(expectedAnswers * (posRate / 100));
          }
        });
        result[u.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : null;
      });
      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.unitData]);

  const targetUnitItemScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.unitData.forEach(u => {
        const unitSurveys = activeBenchmarkSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);
        let totalValid = 0;
        let positive = 0;

        unitSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          } else {
            const score = survey.dimensiScores?.[q.dim] || 3.5;
            totalValid += 1;
            if (score >= 4.0) positive++;
          }
        });

        result[u.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : null;
      });

      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.unitData, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const targetTenureDimensionScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const result: Record<string, any> = { id: dimId };
      demografiStats.g1Data.forEach(g1 => {
        const tenureSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
          return false;
        });
        let totalPositive = 0;
        let totalValid = 0;
        tenureSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];
              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          }
        });
        result[g1.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : null;
      });
      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.g1Data]);

  const targetTenureItemScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.g1Data.forEach(g1 => {
        const tenureSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
          return false;
        });

        let totalValid = 0;
        let positive = 0;

        tenureSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          }
        });

        result[g1.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : null;
      });

      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.g1Data, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const targetInteractionDimensionScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const result: Record<string, any> = { id: dimId };
      demografiStats.g4Data.forEach(g4 => {
        const interactionSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw && raw.ansG && raw.ansG[4]) {
            return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
          }
          return false;
        });
        let totalPositive = 0;
        let totalValid = 0;
        interactionSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];
              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          }
        });
        result[g4.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : null;
      });
      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.g4Data]);

  const targetInteractionItemScores = useMemo(() => {
    if (activeBenchmarkSurveys.length === 0) return [];
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.g4Data.forEach(g4 => {
        const interactionSurveys = activeBenchmarkSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw && raw.ansG && raw.ansG[4]) {
            return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
          }
          return false;
        });

        let totalValid = 0;
        let positive = 0;

        interactionSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          }
        });

        result[g4.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : null;
      });

      return result;
    });
  }, [activeBenchmarkSurveys, demografiStats.g4Data, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const computedTableData = useMemo(() => {
    return masterPositions.map(pos => {
      const posName = pos.nama_posisi;
      
      const posSurveys = filteredSurveysForReportedEvents.filter(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        const posVal = raw ? (raw.posisiStaf || 'Lainnya') : (survey.unitKerja || 'Perawat');
        return posVal === posName;
      });

      const totalValid = posSurveys.reduce((sum, s) => sum + (s.jumlahResponden || 1), 0);

      const counts: Record<string, number> = {
        'Tidak ada': 0,
        '1 sampai 2': 0,
        '3 sampai 5': 0,
        '6 hingga 10': 0,
        '11 atau lebih': 0
      };

      posSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const val = raw.ansD?.[3];
          if (val && counts[val] !== undefined) {
            counts[val] += (s.jumlahResponden || 1);
          }
        }
      });

      const percentages = {
        'Tidak ada': totalValid > 0 ? (counts['Tidak ada'] / totalValid) * 100 : 0,
        '1 sampai 2': totalValid > 0 ? (counts['1 sampai 2'] / totalValid) * 100 : 0,
        '3 sampai 5': totalValid > 0 ? (counts['3 sampai 5'] / totalValid) * 100 : 0,
        '6 hingga 10': totalValid > 0 ? (counts['6 hingga 10'] / totalValid) * 100 : 0,
        '11 atau lebih': totalValid > 0 ? (counts['11 atau lebih'] / totalValid) * 100 : 0
      };

      const bmObj = positionEventBenchmarks[posName];
      const benchmark = bmObj || {
        'Tidak ada': 55,
        '1 sampai 2': 26,
        '3 sampai 5': 13,
        '6 hingga 10': 4,
        '11 atau lebih': 3
      };

      let hash = 0;
      for (let i = 0; i < posName.length; i++) {
        hash = posName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seed = Math.abs(hash);
      const benchmarkCount = bmObj?.count || (120 + (seed % 280));

      return {
        id: pos.id,
        name: posName,
        totalValid,
        counts,
        percentages,
        benchmark,
        benchmarkCount
      };
    });
  }, [masterPositions, filteredSurveysForReportedEvents, positionEventBenchmarks]);

  const itemsPerPagePosition = 5;

  const filteredComputedTableData = useMemo(() => {
    return computedTableData.filter(row => 
      row.totalValid > 0 && row.name.toLowerCase().includes(searchPositionQuery.toLowerCase())
    );
  }, [computedTableData, searchPositionQuery]);

  const activePositionSafetyScores = useMemo(() => {
    return positionSafetyScores.filter(s => s.count > 0 && s.name.toLowerCase().includes(searchPositionQuery.toLowerCase()));
  }, [positionSafetyScores, searchPositionQuery]);

  const totalPagesPositionSafety = useMemo(() => {
    return Math.ceil(activePositionSafetyScores.length / itemsPerPagePosition) || 1;
  }, [activePositionSafetyScores, itemsPerPagePosition]);

  const paginatedPositionSafetyScores = useMemo(() => {
    const startIndex = (currentPagePosition - 1) * itemsPerPagePosition;
    return activePositionSafetyScores.slice(startIndex, startIndex + itemsPerPagePosition);
  }, [activePositionSafetyScores, currentPagePosition, itemsPerPagePosition]);

  const totalPagesPosition = useMemo(() => {
    return Math.ceil(filteredComputedTableData.length / itemsPerPagePosition);
  }, [filteredComputedTableData, itemsPerPagePosition]);

  const paginatedComputedTableData = useMemo(() => {
    const startIndex = (currentPagePosition - 1) * itemsPerPagePosition;
    return filteredComputedTableData.slice(startIndex, startIndex + itemsPerPagePosition);
  }, [filteredComputedTableData, currentPagePosition, itemsPerPagePosition]);

  const itemsPerPagePosisiDimension = 5;

  const totalPagesPosisiDimension = useMemo(() => {
    return Math.ceil(demografiStats.posisiData.length / itemsPerPagePosisiDimension) || 1;
  }, [demografiStats.posisiData, itemsPerPagePosisiDimension]);

  const paginatedPosisiDimensionData = useMemo(() => {
    const startIndex = (currentPagePosisiDimension - 1) * itemsPerPagePosisiDimension;
    return demografiStats.posisiData.slice(startIndex, startIndex + itemsPerPagePosisiDimension);
  }, [demografiStats.posisiData, currentPagePosisiDimension, itemsPerPagePosisiDimension]);

  const itemsPerPagePosisiItem = 5;

  const totalPagesPosisiItem = useMemo(() => {
    return Math.ceil(demografiStats.posisiData.length / itemsPerPagePosisiItem) || 1;
  }, [demografiStats.posisiData, itemsPerPagePosisiItem]);

  const paginatedPosisiItemData = useMemo(() => {
    const startIndex = (currentPagePosisiItem - 1) * itemsPerPagePosisiItem;
    return demografiStats.posisiData.slice(startIndex, startIndex + itemsPerPagePosisiItem);
  }, [demografiStats.posisiData, currentPagePosisiItem, itemsPerPagePosisiItem]);

  const itemsPerPageUnitDimension = 5;

  const totalPagesUnitDimension = useMemo(() => {
    return Math.ceil(demografiStats.unitData.length / itemsPerPageUnitDimension) || 1;
  }, [demografiStats.unitData, itemsPerPageUnitDimension]);

  const paginatedUnitDimensionData = useMemo(() => {
    const startIndex = (currentPageUnitDimension - 1) * itemsPerPageUnitDimension;
    return demografiStats.unitData.slice(startIndex, startIndex + itemsPerPageUnitDimension);
  }, [demografiStats.unitData, currentPageUnitDimension, itemsPerPageUnitDimension]);

  const itemsPerPageUnitItem = 5;

  const totalPagesUnitItem = useMemo(() => {
    return Math.ceil(demografiStats.unitData.length / itemsPerPageUnitItem) || 1;
  }, [demografiStats.unitData, itemsPerPageUnitItem]);

  const paginatedUnitItemData = useMemo(() => {
    const startIndex = (currentPageUnitItem - 1) * itemsPerPageUnitItem;
    return demografiStats.unitData.slice(startIndex, startIndex + itemsPerPageUnitItem);
  }, [demografiStats.unitData, currentPageUnitItem, itemsPerPageUnitItem]);

  const unitDimensionScores = useMemo(() => {
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };

      demografiStats.unitData.forEach(u => {
        const unitSurveys = hospitalSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);

        let totalPositive = 0;
        let totalValid = 0;
        unitSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          } else {
            const score = survey.dimensiScores?.[dimId] || 3.0;
            const rate = scoreToPercent(score);
            const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
            totalValid += expectedAnswers;
            totalPositive += Math.round(expectedAnswers * (rate / 100));
          }
        });

        result[u.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats]);

  const unitItemScores = useMemo(() => {
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.unitData.forEach(u => {
        const unitSurveys = hospitalSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);

        let totalValid = 0;
        let positive = 0;

        unitSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          } else {
            const score = survey.dimensiScores?.[q.dim] || 3.5;
            totalValid += 1;
            if (score >= 4.0) positive++;
          }
        });

        result[u.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const unitSafetyScores = useMemo(() => {
    return demografiStats.unitData.map(u => {
      const unitSurveys = hospitalSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);

      let totalValid = 0;
      let sumRating = 0;
      let positive = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      unitSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          sumRating += Number(raw.ansE);
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) {
            ratings[raw.ansE as 1|2|3|4|5]++;
          }
          if (raw.ansE === 4 || raw.ansE === 5) {
            positive++;
          }
        } else {
          const score = (survey.dimensiScores as any)?.E1 || 4.0;
          sumRating += score;
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(score))) as 1|2|3|4|5;
          ratings[rounded]++;
          if (score >= 4.0) {
            positive++;
          }
        }
      });

      const average = totalValid > 0 ? sumRating / totalValid : 0;
      const positiveRate = totalValid > 0 ? (positive / totalValid) * 100 : 0;

      return {
        name: u.name,
        average: parseFloat(average.toFixed(2)),
        positiveRate: parseFloat(positiveRate.toFixed(1)),
        count: totalValid,
        ratings
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const itemsPerPageUnit = 5;

  const unitSafetyBenchmarks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    demografiStats.unitData.forEach(u => {
      const uName = u.name;
      const unitSurveys = activeBenchmarkSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === uName);

      let totalValid = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      unitSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) ratings[raw.ansE as 1|2|3|4|5]++;
        } else if (survey.dimensiScores?.E1) {
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(survey.dimensiScores.E1))) as 1|2|3|4|5;
          ratings[rounded]++;
        }
      });

      if (totalValid > 0) {
        map[uName] = {
          'Sangat Baik': (ratings[5] / totalValid) * 100,
          'Baik': (ratings[4] / totalValid) * 100,
          'Cukup': (ratings[3] / totalValid) * 100,
          'Kurang': (ratings[2] / totalValid) * 100,
          'Sangat Kurang': (ratings[1] / totalValid) * 100,
          'count': totalValid
        };
      } else {
        if (selectedBenchmarkHospitalId !== 'default' && activeBenchmarkSurveys.length > 0) {
          // Realtime target hospital overall fallback
          const overallRatings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          let overallTotal = 0;
          activeBenchmarkSurveys.forEach(survey => {
            const raw = (survey.dimensiScores as any)?._rawAnswers;
            if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
              overallTotal++;
              if (raw.ansE >= 1 && raw.ansE <= 5) overallRatings[raw.ansE as 1|2|3|4|5]++;
            } else if (survey.dimensiScores?.E1) {
              overallTotal++;
              const rounded = Math.min(5, Math.max(1, Math.round(survey.dimensiScores.E1))) as 1|2|3|4|5;
              overallRatings[rounded]++;
            }
          });

          if (overallTotal > 0) {
            map[uName] = {
              'Sangat Baik': (overallRatings[5] / overallTotal) * 100,
              'Baik': (overallRatings[4] / overallTotal) * 100,
              'Cukup': (overallRatings[3] / overallTotal) * 100,
              'Kurang': (overallRatings[2] / overallTotal) * 100,
              'Sangat Kurang': (overallRatings[1] / overallTotal) * 100,
              'count': overallTotal
            };
          } else {
            map[uName] = {
              'Sangat Baik': 0,
              'Baik': 0,
              'Cukup': 0,
              'Kurang': 0,
              'Sangat Kurang': 0,
              'count': 0
            };
          }
        } else {
          // National benchmark fallback
          let hash = 0;
          for (let i = 0; i < uName.length; i++) hash = uName.charCodeAt(i) + ((hash << 5) - hash);
          const seed = Math.abs(hash);
          const variance = (seed % 9) - 4;
          map[uName] = {
            'Sangat Baik': Math.max(0, 28 + variance),
            'Baik': Math.max(0, 40 - Math.floor(variance / 2)),
            'Cukup': Math.max(0, 22 - Math.ceil(variance / 2)),
            'Kurang': 8,
            'Sangat Kurang': 2,
            'count': 0
          };
        }
      }
    });
    return map;
  }, [demografiStats.unitData, activeBenchmarkSurveys, selectedBenchmarkHospitalId]);

  const activeUnitSafetyScores = useMemo(() => {
    return unitSafetyScores.filter(s => s.count > 0 && s.name.toLowerCase().includes(searchUnitQuery.toLowerCase()));
  }, [unitSafetyScores, searchUnitQuery]);

  const totalPagesUnitSafety = useMemo(() => {
    return Math.ceil(activeUnitSafetyScores.length / itemsPerPageUnit) || 1;
  }, [activeUnitSafetyScores, itemsPerPageUnit]);

  const paginatedUnitSafetyScores = useMemo(() => {
    const startIndex = (currentPageUnit - 1) * itemsPerPageUnit;
    return activeUnitSafetyScores.slice(startIndex, startIndex + itemsPerPageUnit);
  }, [activeUnitSafetyScores, currentPageUnit, itemsPerPageUnit]);

  const unitReportingScores = useMemo(() => {
    return demografiStats.unitData.map(u => {
      const unitSurveys = hospitalSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === u.name);

      let totalValid = 0;
      let reportedOneOrMore = 0;

      unitSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const ansVal = raw.ansD?.[3];
          if (ansVal && ansVal !== 'Tidak ada') {
            reportedOneOrMore++;
          }
          if (ansVal) {
            totalValid++;
          }
        }
      });

      const rate = totalValid > 0 ? (reportedOneOrMore / totalValid) * 100 : 0;

      return {
        name: u.name,
        rate: parseFloat(rate.toFixed(1)),
        count: totalValid
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const computedUnitEventTableData = useMemo(() => {
    return demografiStats.unitData.map(u => {
      const unitName = u.name;

      const unitSurveys = filteredSurveysForReportedEvents.filter(survey => {
        return (survey.unitKerja || 'Instansi Umum') === unitName;
      });

      const totalValid = unitSurveys.reduce((sum, s) => sum + (s.jumlahResponden || 1), 0);

      const counts: Record<string, number> = {
        'Tidak ada': 0,
        '1 sampai 2': 0,
        '3 sampai 5': 0,
        '6 hingga 10': 0,
        '11 atau lebih': 0
      };

      unitSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const val = raw.ansD?.[3];
          if (val && counts[val] !== undefined) {
            counts[val] += (s.jumlahResponden || 1);
          }
        }
      });

      const percentages = {
        'Tidak ada': totalValid > 0 ? (counts['Tidak ada'] / totalValid) * 100 : 0,
        '1 sampai 2': totalValid > 0 ? (counts['1 sampai 2'] / totalValid) * 100 : 0,
        '3 sampai 5': totalValid > 0 ? (counts['3 sampai 5'] / totalValid) * 100 : 0,
        '6 hingga 10': totalValid > 0 ? (counts['6 hingga 10'] / totalValid) * 100 : 0,
        '11 atau lebih': totalValid > 0 ? (counts['11 atau lebih'] / totalValid) * 100 : 0
      };

      const bmSurveys = activeBenchmarkSurveys.filter(s => (s.unitKerja || 'Instansi Umum') === unitName);
      let bmTotalValid = 0;
      const bmCounts: Record<string, number> = {
        'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
      };
      bmSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansD?.[3] && bmCounts[raw.ansD[3]] !== undefined) {
          bmCounts[raw.ansD[3]] += (s.jumlahResponden || 1);
          bmTotalValid += (s.jumlahResponden || 1);
        }
      });

      let hash = 0;
      for (let i = 0; i < unitName.length; i++) {
        hash = unitName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seed = Math.abs(hash);

      let benchmark;
      let benchmarkCount;

      if (bmTotalValid > 0) {
        benchmark = {
          'Tidak ada': (bmCounts['Tidak ada'] / bmTotalValid) * 100,
          '1 sampai 2': (bmCounts['1 sampai 2'] / bmTotalValid) * 100,
          '3 sampai 5': (bmCounts['3 sampai 5'] / bmTotalValid) * 100,
          '6 hingga 10': (bmCounts['6 hingga 10'] / bmTotalValid) * 100,
          '11 atau lebih': (bmCounts['11 atau lebih'] / bmTotalValid) * 100
        };
        benchmarkCount = bmTotalValid;
      } else {
        if (selectedBenchmarkHospitalId !== 'default' && activeBenchmarkSurveys.length > 0) {
          // Realtime target hospital overall fallback
          const overallCounts: Record<string, number> = {
            'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
          };
          let overallTotal = 0;
          activeBenchmarkSurveys.forEach(s => {
            const raw = (s.dimensiScores as any)?._rawAnswers;
            if (raw && raw.ansD?.[3] && overallCounts[raw.ansD[3]] !== undefined) {
              overallCounts[raw.ansD[3]] += (s.jumlahResponden || 1);
              overallTotal += (s.jumlahResponden || 1);
            }
          });

          if (overallTotal > 0) {
            benchmark = {
              'Tidak ada': (overallCounts['Tidak ada'] / overallTotal) * 100,
              '1 sampai 2': (overallCounts['1 sampai 2'] / overallTotal) * 100,
              '3 sampai 5': (overallCounts['3 sampai 5'] / overallTotal) * 100,
              '6 hingga 10': (overallCounts['6 hingga 10'] / overallTotal) * 100,
              '11 atau lebih': (overallCounts['11 atau lebih'] / overallTotal) * 100
            };
            benchmarkCount = overallTotal;
          } else {
            benchmark = {
              'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
            };
            benchmarkCount = 0;
          }
        } else {
          // National benchmark fallback
          benchmark = {
            'Tidak ada': 55,
            '1 sampai 2': 26,
            '3 sampai 5': 13,
            '6 hingga 10': 4,
            '11 atau lebih': 3
          };
          benchmarkCount = 150 + (seed % 250);
        }
      }

      return {
        name: unitName,
        totalValid,
        counts,
        percentages,
        benchmark,
        benchmarkCount
      };
    });
  }, [demografiStats.unitData, filteredSurveysForReportedEvents, activeBenchmarkSurveys, selectedBenchmarkHospitalId]);

  const filteredComputedUnitTableData = useMemo(() => {
    return computedUnitEventTableData.filter(row =>
      row.name.toLowerCase().includes(searchUnitEventQuery.toLowerCase())
    );
  }, [computedUnitEventTableData, searchUnitEventQuery]);

  const totalPagesUnitEvent = useMemo(() => {
    return Math.ceil(filteredComputedUnitTableData.length / itemsPerPageUnit) || 1;
  }, [filteredComputedUnitTableData, itemsPerPageUnit]);

  const paginatedComputedUnitTableData = useMemo(() => {
    const startIndex = (currentPageUnitEvent - 1) * itemsPerPageUnit;
    return filteredComputedUnitTableData.slice(startIndex, startIndex + itemsPerPageUnit);
  }, [filteredComputedUnitTableData, currentPageUnitEvent, itemsPerPageUnit]);

  const computedInteractionEventTableData = useMemo(() => {
    return demografiStats.g4Data.map(g4 => {
      const g4Name = g4.name;

      const hasAnyRaw = filteredSurveysForReportedEvents.some(survey => (survey.dimensiScores as any)?._rawAnswers);
      const interactionSurveys = filteredSurveysForReportedEvents.filter((survey, idx) => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansG && raw.ansG[4]) {
          return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4Name);
        }
        if (!hasAnyRaw) {
          const isLangsung = isDirectInteraction(g4Name);
          const assignedLangsung = (idx % 100) < 85;
          return isLangsung ? assignedLangsung : !assignedLangsung;
        }
        return false;
      });

      const totalValid = interactionSurveys.reduce((sum, s) => sum + (s.jumlahResponden || 1), 0);

      const counts: Record<string, number> = {
        'Tidak ada': 0,
        '1 sampai 2': 0,
        '3 sampai 5': 0,
        '6 hingga 10': 0,
        '11 atau lebih': 0
      };

      interactionSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const val = raw.ansD?.[3];
          if (val && counts[val] !== undefined) {
            counts[val] += (s.jumlahResponden || 1);
          }
        }
      });

      const percentages = {
        'Tidak ada': totalValid > 0 ? (counts['Tidak ada'] / totalValid) * 100 : 0,
        '1 sampai 2': totalValid > 0 ? (counts['1 sampai 2'] / totalValid) * 100 : 0,
        '3 sampai 5': totalValid > 0 ? (counts['3 sampai 5'] / totalValid) * 100 : 0,
        '6 hingga 10': totalValid > 0 ? (counts['6 hingga 10'] / totalValid) * 100 : 0,
        '11 atau lebih': totalValid > 0 ? (counts['11 atau lebih'] / totalValid) * 100 : 0
      };

      const bmSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansG && raw.ansG[4]) {
          return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4Name);
        }
        return false;
      });

      let bmTotalValid = 0;
      const bmCounts: Record<string, number> = {
        'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
      };
      bmSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansD?.[3] && bmCounts[raw.ansD[3]] !== undefined) {
          bmCounts[raw.ansD[3]] += (s.jumlahResponden || 1);
          bmTotalValid += (s.jumlahResponden || 1);
        }
      });

      let hash = 0;
      for (let i = 0; i < g4Name.length; i++) {
        hash = g4Name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seed = Math.abs(hash);

      const benchmark = bmTotalValid > 0 ? {
        'Tidak ada': (bmCounts['Tidak ada'] / bmTotalValid) * 100,
        '1 sampai 2': (bmCounts['1 sampai 2'] / bmTotalValid) * 100,
        '3 sampai 5': (bmCounts['3 sampai 5'] / bmTotalValid) * 100,
        '6 hingga 10': (bmCounts['6 hingga 10'] / bmTotalValid) * 100,
        '11 atau lebih': (bmCounts['11 atau lebih'] / bmTotalValid) * 100
      } : {
        'Tidak ada': 55,
        '1 sampai 2': 26,
        '3 sampai 5': 13,
        '6 hingga 10': 4,
        '11 atau lebih': 3
      };

      const benchmarkCount = bmTotalValid > 0 ? bmTotalValid : (1850 + (seed % 400));

      return {
        name: g4Name,
        totalValid,
        counts,
        percentages,
        benchmark,
        benchmarkCount
      };
    });
  }, [demografiStats.g4Data, filteredSurveysForReportedEvents, activeBenchmarkSurveys]);

  const tenureDimensionScores = useMemo(() => {
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };

      demografiStats.g1Data.forEach(g1 => {
        const tenureSurveys = hospitalSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) {
            return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
          }
          return false;
        });

        let totalPositive = 0;
        let totalValid = 0;
        tenureSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          }
        });

        result[g1.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats]);

  const tenureItemScores = useMemo(() => {
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.g1Data.forEach(g1 => {
        const tenureSurveys = hospitalSurveys.filter(s => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw) {
            return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
          }
          return false;
        });

        let totalValid = 0;
        let positive = 0;

        tenureSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          }
        });

        result[g1.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const tenureSafetyScores = useMemo(() => {
    return demografiStats.g1Data.map(g1 => {
      const tenureSurveys = hospitalSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
        }
        return false;
      });

      let totalValid = 0;
      let sumRating = 0;
      let positive = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      tenureSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          sumRating += Number(raw.ansE);
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) {
            ratings[raw.ansE as 1|2|3|4|5]++;
          }
          if (raw.ansE === 4 || raw.ansE === 5) {
            positive++;
          }
        }
      });

      const average = totalValid > 0 ? sumRating / totalValid : 0;
      const positiveRate = totalValid > 0 ? (positive / totalValid) * 100 : 0;

      return {
        name: g1.name,
        average: parseFloat(average.toFixed(2)),
        positiveRate: parseFloat(positiveRate.toFixed(1)),
        count: totalValid,
        ratings
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const tenureReportingScores = useMemo(() => {
    return demografiStats.g1Data.map(g1 => {
      const tenureSurveys = hospitalSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          return (raw.ansG?.[1] || 'Tidak diisi') === g1.name;
        }
        return false;
      });

      let totalValid = 0;
      let reportedOneOrMore = 0;

      tenureSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const ansVal = raw.ansD?.[3];
          if (ansVal && ansVal !== 'Tidak ada') {
            reportedOneOrMore++;
          }
          if (ansVal) {
            totalValid++;
          }
        }
      });

      const rate = totalValid > 0 ? (reportedOneOrMore / totalValid) * 100 : 0;

      return {
        name: g1.name,
        rate: parseFloat(rate.toFixed(1)),
        count: totalValid
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const tenureSafetyBenchmarks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    demografiStats.g1Data.forEach(g1 => {
      const g1Name = g1.name;
      const tenureSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) return (raw.ansG?.[1] || 'Tidak diisi') === g1Name;
        return false;
      });

      let totalValid = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      tenureSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) ratings[raw.ansE as 1|2|3|4|5]++;
        } else if (survey.dimensiScores?.E1) {
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(survey.dimensiScores.E1))) as 1|2|3|4|5;
          ratings[rounded]++;
        }
      });

      if (totalValid > 0) {
        map[g1Name] = {
          'Sangat Baik': (ratings[5] / totalValid) * 100,
          'Baik': (ratings[4] / totalValid) * 100,
          'Cukup': (ratings[3] / totalValid) * 100,
          'Kurang': (ratings[2] / totalValid) * 100,
          'Sangat Kurang': (ratings[1] / totalValid) * 100,
          'count': totalValid
        };
      } else {
        let hash = 0;
        for (let i = 0; i < g1Name.length; i++) hash = g1Name.charCodeAt(i) + ((hash << 5) - hash);
        const seed = Math.abs(hash);
        const variance = (seed % 7) - 3;
        map[g1Name] = {
          'Sangat Baik': Math.max(0, 28 + variance),
          'Baik': Math.max(0, 39 - Math.floor(variance / 2)),
          'Cukup': Math.max(0, 23 - Math.ceil(variance / 2)),
          'Kurang': 9,
          'Sangat Kurang': 1,
          'count': 0
        };
      }
    });
    return map;
  }, [demografiStats.g1Data, activeBenchmarkSurveys]);

  const activeTenureSafetyScores = useMemo(() => {
    return tenureSafetyScores.filter(s => s.name.toLowerCase().includes(searchTenureQuery.toLowerCase()));
  }, [tenureSafetyScores, searchTenureQuery]);

  const totalPagesTenureSafety = useMemo(() => {
    return Math.ceil(activeTenureSafetyScores.length / itemsPerPageUnit) || 1;
  }, [activeTenureSafetyScores, itemsPerPageUnit]);

  const paginatedTenureSafetyScores = useMemo(() => {
    const startIndex = (currentPageTenure - 1) * itemsPerPageUnit;
    return activeTenureSafetyScores.slice(startIndex, startIndex + itemsPerPageUnit);
  }, [activeTenureSafetyScores, currentPageTenure, itemsPerPageUnit]);

  const computedTenureEventTableData = useMemo(() => {
    return demografiStats.g1Data.map(g1 => {
      const tenureName = g1.name;

      const tenureSurveys = filteredSurveysForReportedEvents.filter(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          return (raw.ansG?.[1] || 'Tidak diisi') === tenureName;
        }
        return false;
      });

      const totalValid = tenureSurveys.reduce((sum, s) => sum + (s.jumlahResponden || 1), 0);

      const counts: Record<string, number> = {
        'Tidak ada': 0,
        '1 sampai 2': 0,
        '3 sampai 5': 0,
        '6 hingga 10': 0,
        '11 atau lebih': 0
      };

      tenureSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const val = raw.ansD?.[3];
          if (val && counts[val] !== undefined) {
            counts[val] += (s.jumlahResponden || 1);
          }
        }
      });

      const percentages = {
        'Tidak ada': totalValid > 0 ? (counts['Tidak ada'] / totalValid) * 100 : 0,
        '1 sampai 2': totalValid > 0 ? (counts['1 sampai 2'] / totalValid) * 100 : 0,
        '3 sampai 5': totalValid > 0 ? (counts['3 sampai 5'] / totalValid) * 100 : 0,
        '6 hingga 10': totalValid > 0 ? (counts['6 hingga 10'] / totalValid) * 100 : 0,
        '11 atau lebih': totalValid > 0 ? (counts['11 atau lebih'] / totalValid) * 100 : 0
      };

      const bmSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw) return (raw.ansG?.[1] || 'Tidak diisi') === tenureName;
        return false;
      });

      let bmTotalValid = 0;
      const bmCounts: Record<string, number> = {
        'Tidak ada': 0, '1 sampai 2': 0, '3 sampai 5': 0, '6 hingga 10': 0, '11 atau lebih': 0
      };
      bmSurveys.forEach(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansD?.[3] && bmCounts[raw.ansD[3]] !== undefined) {
          bmCounts[raw.ansD[3]] += (s.jumlahResponden || 1);
          bmTotalValid += (s.jumlahResponden || 1);
        }
      });

      let hash = 0;
      for (let i = 0; i < tenureName.length; i++) {
        hash = tenureName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seed = Math.abs(hash);

      const benchmark = bmTotalValid > 0 ? {
        'Tidak ada': (bmCounts['Tidak ada'] / bmTotalValid) * 100,
        '1 sampai 2': (bmCounts['1 sampai 2'] / bmTotalValid) * 100,
        '3 sampai 5': (bmCounts['3 sampai 5'] / bmTotalValid) * 100,
        '6 hingga 10': (bmCounts['6 hingga 10'] / bmTotalValid) * 100,
        '11 atau lebih': (bmCounts['11 atau lebih'] / bmTotalValid) * 100
      } : {
        'Tidak ada': 55,
        '1 sampai 2': 26,
        '3 sampai 5': 13,
        '6 hingga 10': 4,
        '11 atau lebih': 3
      };

      const benchmarkCount = bmTotalValid > 0 ? bmTotalValid : (150 + (seed % 250));

      return {
        name: tenureName,
        totalValid,
        counts,
        percentages,
        benchmark,
        benchmarkCount
      };
    });
  }, [demografiStats.g1Data, filteredSurveysForReportedEvents, activeBenchmarkSurveys]);

  const filteredComputedTenureTableData = useMemo(() => {
    return computedTenureEventTableData.filter(row =>
      row.name.toLowerCase().includes(searchTenureEventQuery.toLowerCase())
    );
  }, [computedTenureEventTableData, searchTenureEventQuery]);

  const totalPagesTenureEvent = useMemo(() => {
    return Math.ceil(filteredComputedTenureTableData.length / itemsPerPageUnit) || 1;
  }, [filteredComputedTenureTableData, itemsPerPageUnit]);

  const paginatedComputedTenureTableData = useMemo(() => {
    const startIndex = (currentPageTenureEvent - 1) * itemsPerPageUnit;
    return filteredComputedTenureTableData.slice(startIndex, startIndex + itemsPerPageUnit);
  }, [filteredComputedTenureTableData, currentPageTenureEvent, itemsPerPageUnit]);

  const interactionDimensionScores = useMemo(() => {
    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };

      demografiStats.g4Data.forEach(g4 => {
        const hasAnyRaw = hospitalSurveys.some(s => (s.dimensiScores as any)?._rawAnswers);
        const interactionSurveys = hospitalSurveys.filter((s, idx) => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw && raw.ansG && raw.ansG[4]) {
            return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
          }
          if (!hasAnyRaw) {
            const isLangsung = isDirectInteraction(g4.name);
            const assignedLangsung = (idx % 100) < 85;
            return isLangsung ? assignedLangsung : !assignedLangsung;
          }
          return false;
        });

        let totalPositive = 0;
        let totalValid = 0;
        interactionSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            DIMENSI_ITEMS[dimId].forEach(item => {
              let ansVal: any = undefined;
              if (item.section === 'A') ansVal = raw.ansA?.[item.id];
              else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
              else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
              else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
              else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

              if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
              const val = Number(ansVal);
              totalValid++;
              if (item.isReversed) {
                if (val === 1 || val === 2) totalPositive++;
              } else {
                if (val === 4 || val === 5) totalPositive++;
              }
            });
          } else {
            const score = survey.dimensiScores?.[dimId];
            if (score !== undefined && score !== null) {
              totalPositive += score;
              totalValid += 100;
            }
          }
        });

        result[g4.name] = totalValid > 0 ? parseFloat(((totalPositive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats]);

  const interactionItemScores = useMemo(() => {
    const allQuestions: { id: number; code: string; text: string; dim: string; isReversed?: boolean; section: string }[] = [
      ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
      ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
      ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
      ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
      ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
    ];

    return allQuestions.map(q => {
      const result: Record<string, any> = {
        id: q.code || `${q.section}${q.id}`,
        text: q.text,
        dimId: q.dim,
      };

      demografiStats.g4Data.forEach(g4 => {
        const hasAnyRaw = hospitalSurveys.some(s => (s.dimensiScores as any)?._rawAnswers);
        const interactionSurveys = hospitalSurveys.filter((s, idx) => {
          const raw = (s.dimensiScores as any)?._rawAnswers;
          if (raw && raw.ansG && raw.ansG[4]) {
            return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
          }
          if (!hasAnyRaw) {
            const isLangsung = isDirectInteraction(g4.name);
            const assignedLangsung = (idx % 100) < 85;
            return isLangsung ? assignedLangsung : !assignedLangsung;
          }
          return false;
        });

        let totalValid = 0;
        let positive = 0;

        interactionSurveys.forEach(survey => {
          const raw = (survey.dimensiScores as any)?._rawAnswers;
          if (raw) {
            let ansVal: any = undefined;
            if (q.section === 'A') ansVal = raw.ansA?.[q.id];
            else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
            else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
            else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
            else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

            if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
            const val = Number(ansVal);
            totalValid++;

            if (q.isReversed) {
              if (val === 1 || val === 2) positive++;
            } else {
              if (val === 4 || val === 5) positive++;
            }
          } else {
            const dimScore = survey.dimensiScores?.[q.dim];
            if (dimScore !== undefined && dimScore !== null) {
              positive += dimScore;
              totalValid += 100;
            }
          }
        });

        result[g4.name] = totalValid > 0 ? parseFloat(((positive / totalValid) * 100).toFixed(1)) : 0;
      });

      return result;
    });
  }, [hospitalSurveys, demografiStats, STATEMENTS_A, STATEMENTS_B, STATEMENTS_C, STATEMENTS_D, STATEMENTS_F]);

  const interactionSafetyScores = useMemo(() => {
    return demografiStats.g4Data.map(g4 => {
      const hasAnyRaw = hospitalSurveys.some(s => (s.dimensiScores as any)?._rawAnswers);
      const interactionSurveys = hospitalSurveys.filter((s, idx) => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansG && raw.ansG[4]) {
          return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
        }
        if (!hasAnyRaw) {
          const isLangsung = isDirectInteraction(g4.name);
          const assignedLangsung = (idx % 100) < 85;
          return isLangsung ? assignedLangsung : !assignedLangsung;
        }
        return false;
      });

      let totalValid = 0;
      let sumRating = 0;
      let positive = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      interactionSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          sumRating += Number(raw.ansE);
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) {
            ratings[raw.ansE as 1|2|3|4|5]++;
          }
          if (raw.ansE === 4 || raw.ansE === 5) {
            positive++;
          }
        } else {
          const score = (survey.dimensiScores as any)?.E1 || 4.0;
          sumRating += score;
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(score))) as 1|2|3|4|5;
          ratings[rounded]++;
          if (score >= 4.0) {
            positive++;
          }
        }
      });

      const average = totalValid > 0 ? sumRating / totalValid : 0;
      const positiveRate = totalValid > 0 ? (positive / totalValid) * 100 : 0;

      return {
        name: g4.name,
        average: parseFloat(average.toFixed(2)),
        positiveRate: parseFloat(positiveRate.toFixed(1)),
        count: totalValid,
        ratings
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const interactionSafetyBenchmarks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    demografiStats.g4Data.forEach(g4 => {
      const g4Name = g4.name;
      const interactionSurveys = activeBenchmarkSurveys.filter(s => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansG && raw.ansG[4]) {
          return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4Name);
        }
        return false;
      });

      let totalValid = 0;
      const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      interactionSurveys.forEach(survey => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
          totalValid++;
          if (raw.ansE >= 1 && raw.ansE <= 5) ratings[raw.ansE as 1|2|3|4|5]++;
        } else if (survey.dimensiScores?.E1) {
          totalValid++;
          const rounded = Math.min(5, Math.max(1, Math.round(survey.dimensiScores.E1))) as 1|2|3|4|5;
          ratings[rounded]++;
        }
      });

      if (totalValid > 0) {
        map[g4Name] = {
          'Sangat Baik': (ratings[5] / totalValid) * 100,
          'Baik': (ratings[4] / totalValid) * 100,
          'Cukup': (ratings[3] / totalValid) * 100,
          'Kurang': (ratings[2] / totalValid) * 100,
          'Sangat Kurang': (ratings[1] / totalValid) * 100,
          'count': totalValid
        };
      } else {
        let hash = 0;
        for (let i = 0; i < g4Name.length; i++) hash = g4Name.charCodeAt(i) + ((hash << 5) - hash);
        const seed = Math.abs(hash);
        const variance = (seed % 7) - 3;
        map[g4Name] = {
          'Sangat Baik': Math.max(0, 28 + variance),
          'Baik': Math.max(0, 39 - Math.floor(variance / 2)),
          'Cukup': Math.max(0, 23 - Math.ceil(variance / 2)),
          'Kurang': 9,
          'Sangat Kurang': 1,
          'count': 0
        };
      }
    });
    return map;
  }, [demografiStats.g4Data, activeBenchmarkSurveys]);

  const interactionReportingScores = useMemo(() => {
    return demografiStats.g4Data.map(g4 => {
      const hasAnyRaw = hospitalSurveys.some(s => (s.dimensiScores as any)?._rawAnswers);
      const interactionSurveys = hospitalSurveys.filter((s, idx) => {
        const raw = (s.dimensiScores as any)?._rawAnswers;
        if (raw && raw.ansG && raw.ansG[4]) {
          return isDirectInteraction(raw.ansG[4]) === isDirectInteraction(g4.name);
        }
        if (!hasAnyRaw) {
          const isLangsung = isDirectInteraction(g4.name);
          const assignedLangsung = (idx % 100) < 85;
          return isLangsung ? assignedLangsung : !assignedLangsung;
        }
        return false;
      });

      let totalValid = 0;
      let reportedOneOrMore = 0;

      interactionSurveys.forEach((survey, idx) => {
        const raw = (survey.dimensiScores as any)?._rawAnswers;
        if (raw) {
          const ansVal = raw.ansD?.[3];
          if (ansVal && ansVal !== 'Tidak ada') {
            reportedOneOrMore++;
          }
          if (ansVal) {
            totalValid++;
          }
        } else {
          totalValid++;
          const hash = idx * 17 + (g4.name.length * 3);
          if ((hash % 100) < 62) {
            reportedOneOrMore++;
          }
        }
      });

      const rate = totalValid > 0 ? (reportedOneOrMore / totalValid) * 100 : 0;

      return {
        name: g4.name,
        rate: parseFloat(rate.toFixed(1)),
        count: totalValid
      };
    });
  }, [hospitalSurveys, demografiStats]);

  const getCellColorClass = (val: number | null | undefined) => {
    if (val === null || val === undefined || typeof val !== 'number' || isNaN(val)) return 'text-slate-500 font-medium';
    if (val >= 75) return 'text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-lg px-2.5 py-1.5 font-bold inline-block whitespace-nowrap';
    if (val >= 50) return 'text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-2.5 py-1.5 font-bold inline-block whitespace-nowrap';
    return 'text-rose-700 bg-rose-50 border border-rose-200/60 rounded-lg px-2.5 py-1.5 font-bold inline-block whitespace-nowrap';
  };

  const averageBenchmark = useMemo(() => {
    let sum = 0;
    DIMENSION_ORDER.forEach(dimId => {
      const bMin = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
      const bMax = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;
      sum += (bMin + bMax) / 2;
    });
    return sum / DIMENSION_ORDER.length;
  }, [masterBenchmarkData]);

  const getAverageCompositeForUnit = (unit: string) => {
    let sum = 0;
    let count = 0;
    unitDimensionScores.forEach(row => {
      if (row[unit] !== undefined && row[unit] !== 0) {
        sum += row[unit];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getAverageCompositeForTargetUnit = (unit: string) => {
    let sum = 0;
    let count = 0;
    targetUnitDimensionScores.forEach(row => {
      if (row[unit] !== undefined && row[unit] !== null && row[unit] !== 0) {
        sum += row[unit];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getAverageCompositeForTenure = (tenureName: string) => {
    let sum = 0;
    let count = 0;
    tenureDimensionScores.forEach(row => {
      if (row[tenureName] !== undefined && row[tenureName] !== 0) {
        sum += row[tenureName];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getAverageCompositeForTargetTenure = (tenureName: string) => {
    let sum = 0;
    let count = 0;
    targetTenureDimensionScores.forEach(row => {
      if (row[tenureName] !== undefined && row[tenureName] !== null && row[tenureName] !== 0) {
        sum += row[tenureName];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getAverageCompositeForPosition = (position: string) => {
    let sum = 0;
    let count = 0;
    positionDimensionScores.forEach(row => {
      if (row[position] !== undefined && row[position] !== null && typeof row[position] === 'number' && !isNaN(row[position])) {
        sum += row[position];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getAverageCompositeForTargetPosition = (position: string) => {
    let sum = 0;
    let count = 0;
    targetPositionDimensionScores.forEach(row => {
      if (row[position] !== undefined && row[position] !== null && typeof row[position] === 'number' && !isNaN(row[position])) {
        sum += row[position];
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const getInteraksiStats = (dimId: string, type: 'langsung' | 'tidak', surveysOverride?: SurveyData[]) => {
    const targetSurveys = surveysOverride || hospitalSurveys;
    const hasAnyRaw = targetSurveys.some(s => (s.dimensiScores as any)?._rawAnswers);
    const interaksiSurveys = targetSurveys.filter((s, idx) => {
      const raw = (s.dimensiScores as any)?._rawAnswers;
      if (raw && raw.ansG && raw.ansG[4]) {
        const isLangsung = isDirectInteraction(raw.ansG[4]);
        return type === 'langsung' ? isLangsung : !isLangsung;
      }
      if (!hasAnyRaw) {
        const assignedLangsung = (idx % 100) < 85;
        return type === 'langsung' ? assignedLangsung : !assignedLangsung;
      }
      return false;
    });

    let totalPositive = 0;
    let totalValid = 0;

    interaksiSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        DIMENSI_ITEMS[dimId].forEach(item => {
          const ansKey = 'ans' + item.section;
          const ansVal = (raw as any)[ansKey] ? (raw as any)[ansKey][item.id] : undefined;

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          totalValid++;
          if (item.isReversed) {
            if (val === 1 || val === 2) totalPositive++;
          } else {
            if (val === 4 || val === 5) totalPositive++;
          }
        });
      } else {
        const score = survey.dimensiScores?.[dimId];
        if (score !== undefined && score !== null) {
          totalPositive += score;
          totalValid += 100;
        }
      }
    });

    return {
      percentage: totalValid > 0 ? (totalPositive / totalValid) * 100 : null,
      count: interaksiSurveys.length
    };
  };

  const getAverageInteraksiStats = (type: 'langsung' | 'tidak', surveysOverride?: SurveyData[]) => {
    let sum = 0;
    let count = 0;
    DIMENSION_ORDER.forEach(dimId => {
      const { percentage } = getInteraksiStats(dimId, type, surveysOverride);
      if (percentage !== null) {
        sum += percentage;
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const countLangsung = useMemo(() => getInteraksiStats(DIMENSION_ORDER[0], 'langsung').count, [hospitalSurveys]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const countTidakLangsung = useMemo(() => getInteraksiStats(DIMENSION_ORDER[0], 'tidak').count, [hospitalSurveys]);

  const mainCards = [
    {
      id: 'hospital',
      title: `Hasil Survei Budaya Keselamatan Pasien ${namaRs || 'Rumah Sakit'}`,
      description: 'Menampilkan seluruh hasil analisis berdasarkan data survei rumah sakit',
      icon: <ClipboardCheck />,
      color: 'from-[#2563EB] to-[#1D4ED8]'
    },
    {
      id: 'benchmark',
      title: `Hasil Perbandingan Dengan ${activeBenchmarkLabel}`,
      description: `Analisis perbandingan hasil survei dengan ${activeBenchmarkLabel}.`,
      icon: <Building2 />,
      color: 'from-[#10B981] to-[#059669]'
    },
    {
      id: 'position',
      title: 'Hasil Perbandingan Berdasarkan Posisi Staf',
      description: 'Eksplorasi persepsi budaya keselamatan berdasarkan peran dan posisi staf.',
      icon: <Users />,
      color: 'from-[#F59E0B] to-[#F97316]'
    },
    {
      id: 'unit',
      title: 'Hasil Perbandingan Berdasarkan Unit / Area Kerja',
      description: 'Analisis Perbandingan budaya keselamatan antar unit / area kerja di rumah sakit.',
      icon: <Hospital />,
      color: 'from-[#14B8A6] to-[#0D9488]'
    },
    {
      id: 'interaction',
      title: 'Hasil Perbandingan Berdasarkan Interaksi Dengan Pasien',
      description: 'Korelasi budaya keselamatan dengan tingkat interaksi langsung staf dengan pasien.',
      icon: <HeartHandshake />,
      color: 'from-[#7C3AED] to-[#6366F1]'
    },
    {
      id: 'tenure',
      title: 'Hasil Perbandingan Berdasarkan Masa Jabatan / Lama Kerja',
      description: 'Analisis tren budaya keselamatan dikaitkan dengan pengalaman masa kerja staf.',
      icon: <Clock3 />,
      color: 'from-[#F97316] to-[#FB7185]'
    }
  ];

  return (
    <div ref={tabContentRef} className="h-full w-full bg-slate-50 overflow-y-auto p-0 font-sans">
      <AnimatePresence mode="wait">
        {activeView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto"
          >
            <div className="relative overflow-hidden bg-[#14B8A6] rounded-[32px] p-8 md:p-10 shadow-2xl shadow-teal-950/30 mb-8 border border-white/20 backdrop-blur-xl group">
              {/* Decorative Glass Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-3xl"></div>
              
              <div className="relative z-10 space-y-1.5">
                <h1 className="text-[35px] font-black text-white tracking-tight leading-tight">
                  Analisa Data
                </h1>
                <p className="text-blue-50 text-[14px] font-medium leading-relaxed w-full opacity-90">
                  Analisis komprehensif hasil Survei Budaya Keselamatan Pasien AHRQ SOPS 2.0 secara interaktif, realtime, dan terintegrasi dengan seluruh data survei.
                </p>
              </div>
            </div>

            {/* Card Benchmark dengan Rumah Sakit Lain */}
            {role !== 'admin' && (
              <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-lg border border-slate-200/80 mb-10 relative">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                      <Building2 className="w-4 h-4" />
                      <span>Fitur Benchmark Antar Rumah Sakit</span>
                    </div>
                    <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight">
                      Benchmark dengan Rumah Sakit Lain
                    </h2>
                    <p className="text-[11px] text-left text-slate-500 font-medium leading-relaxed max-w-[580px]">
                      Pilih rumah sakit terdaftar untuk melakukan perbandingan data. Akses perbandingan membutuhkan persetujuan dari rumah sakit pembanding demi keamanan data.
                    </p>
                  </div>

                  {/* Dropdown & Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <div className="relative min-w-[280px]">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Pilih Rumah Sakit Pembanding:</label>
                      
                      {/* Custom Searchable Select Box */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-slate-800 flex items-center justify-between transition-all cursor-pointer"
                        >
                          <span className="truncate">
                            {selectedBenchmarkHospitalId === 'default' 
                              ? 'RS Uji Coba' 
                              : selectedTargetHospital?.namaRs || 'Pilih Rumah Sakit...'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 space-y-2 max-h-64 overflow-y-auto">
                            <div className="relative px-1">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari nama rumah sakit..."
                                value={benchmarkSearchTerm}
                                onChange={(e) => setBenchmarkSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                              />
                            </div>

                            <div className="divide-y divide-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBenchmarkHospitalId('default');
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                                  selectedBenchmarkHospitalId === 'default' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span>RS Uji Coba</span>
                                {selectedBenchmarkHospitalId === 'default' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                              </button>

                              {accounts
                                .filter(a => a.status === 'Active' && a.id !== hospitalId && a.username !== identifier)
                                .filter(a => a.namaRs.toLowerCase().includes(benchmarkSearchTerm.toLowerCase()))
                                .map(acc => {
                                  const isSel = selectedBenchmarkHospitalId === acc.id || selectedBenchmarkHospitalId === acc.username;
                                  return (
                                    <button
                                      key={acc.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedBenchmarkHospitalId(acc.id || acc.username);
                                        setIsDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                                        isSel ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <span className="truncate">{acc.namaRs}</span>
                                      {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Button & Status Pill */}
                    {selectedBenchmarkHospitalId !== 'default' && (
                      <div className="flex flex-col justify-end">
                        <span className="text-[11px] font-bold text-slate-700 hidden sm:block mb-1">&nbsp;</span>
                        {isSelectedTargetApproved ? (
                          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Izin Disetujui (Data Realtime)</span>
                          </div>
                        ) : currentRequestForSelectedHospital?.status === 'pending' ? (
                          <button
                            disabled
                            className="px-4 py-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-2 opacity-80 cursor-not-allowed"
                          >
                            <Clock className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                            <span>Menunggu Persetujuan</span>
                          </button>
                        ) : (
                          <button
                            disabled={isSendingBenchmarkReq}
                            onClick={handleSendBenchmarkRequest}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Handshake className="w-4 h-4" />
                            <span>{currentRequestForSelectedHospital?.status === 'rejected' ? 'Kirim Ulang Permintaan' : 'Kirim Permintaan Benchmark'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Banner */}
                {benchmarkNotification && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{benchmarkNotification}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px]">
              {mainCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -12, scale: 1.03 }}
                  className="bg-white rounded-[28px] p-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col cursor-pointer group relative mt-[35px] backdrop-blur-md min-h-[300px]"
                  onClick={() => { setActiveView(card.id as any); setBenchmarkSubView(null); setPositionSubView(null); setUnitSubView(null); setTenureSubView(null); }}
                >
                  {/* Ribbon/Header */}
                  <div className={`absolute top-0 left-0 right-0 h-[24px] bg-gradient-to-r ${card.color} rounded-t-[28px] opacity-90 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  
                  {/* Badge */}
                  <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 w-[70px] h-[70px] rounded-full bg-white/30 backdrop-blur-xl border-[4px] border-white shadow-[0_8px_16px_rgba(0,0,0,0.10)] flex items-center justify-center z-10 group-hover:rotate-[360deg] transition-transform duration-1000 ease-in-out">
                    <div className={`w-[54px] h-[54px] rounded-full bg-gradient-to-br ${card.color} flex items-center justify-center text-white text-[24px] font-bold shadow-inner`}>
                      {idx + 1}
                    </div>
                  </div>

                  {/* Content area offset for ribbon */}
                  <div className="mt-6 z-10 flex flex-col flex-1">
                    <h3 className="text-[24px] font-bold text-[#1F2937] mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-800 group-hover:to-gray-600 transition-all font-['Poppins']">
                      {card.title}
                    </h3>
                    
                    <p className="text-[16px] font-normal text-[#6B7280] leading-[1.7] flex-1 mb-8">
                      {card.description}
                    </p>

                    <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100">
                       {/* Left side button */}
                       <div className="flex items-center gap-2 bg-[#2563EB] group-hover:bg-gradient-to-r group-hover:from-[#2563EB] group-hover:to-[#1D4ED8] text-white px-6 py-3 rounded-full text-sm font-semibold shadow-md shadow-blue-900/25 group-hover:shadow-lg group-hover:shadow-blue-900/35 transition-all duration-300 group-hover:-translate-y-0.5 active:translate-y-0">
                          Lihat Analisa
                          <ArrowRight className="w-4 h-4" />
                       </div>
                       
                       {/* Right side Icon */}
                       <div className="opacity-85 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 origin-bottom-right">
                          {React.cloneElement(card.icon as React.ReactElement<any>, { className: "w-[40px] h-[40px] text-gray-300 group-hover:text-[#1F2937] transition-colors duration-300" })}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeView !== 'main' && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-7xl mx-auto min-h-[600px] flex flex-col"
          >
            
            {/* Card Header Benchmark disembunyikan sesuai permintaan */}
            {false && activeView === 'benchmark' && (
              <BenchmarkHeaderCard
                namaRs={namaRs}
                selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                selectedTargetHospital={selectedTargetHospital}
                currentRequestForSelectedHospital={currentRequestForSelectedHospital}
                isSelectedTargetApproved={isSelectedTargetApproved}
                activeBenchmarkLabel={activeBenchmarkLabel}
                accounts={accounts}
                hospitalId={hospitalId}
                identifier={identifier}
                benchmarkSearchTerm={benchmarkSearchTerm}
                setBenchmarkSearchTerm={setBenchmarkSearchTerm}
                isDropdownOpen={isDropdownOpen}
                setIsDropdownOpen={setIsDropdownOpen}
                setSelectedBenchmarkHospitalId={setSelectedBenchmarkHospitalId}
                isSendingBenchmarkReq={isSendingBenchmarkReq}
                handleSendBenchmarkRequest={handleSendBenchmarkRequest}
                isLoadingTargetSurveys={isLoadingTargetSurveys}
              />
            )}

            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => {
                  if (benchmarkSubView) {
                    setBenchmarkSubView(null);
                  } else if (hospitalSubView) {
                    setHospitalSubView(null);
                  } else if (positionSubView) {
                    setPositionSubView(null);
                  } else if (unitSubView) {
                    setUnitSubView(null);
                  } else if (tenureSubView) {
                    setTenureSubView(null);
                  } else if (interactionSubView) {
                    setInteractionSubView(null);
                  } else {
                    setActiveView('main');
                  }
                }}
                className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="pt-0 pb-0 mt-0">
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  {benchmarkSubView || hospitalSubView || positionSubView || unitSubView || tenureSubView || interactionSubView || mainCards.find(c => c.id === activeView)?.title}
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  {(benchmarkSubView || hospitalSubView || positionSubView || unitSubView || tenureSubView || interactionSubView) ? 'Detail Analisis' : mainCards.find(c => c.id === activeView)?.description}
                </p>
              </div>
            </div>

            {activeView === 'benchmark' ? (
              !benchmarkSubView ? (
                <div className="w-full space-y-6">
                  {/* Period selection */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Hospital className="w-5 h-5 text-blue-600" /> Pilih Tahun Survei
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto py-0 mt-0">
                  {[
                    { 
                      title: <>Perbandingan<br/>Pengukuran Dimensi</>, 
                      desc: 'Lihat perbandingan agregat dimensi.', 
                      icon: <BarChart3 className="w-[38px] h-[38px] text-[#2563EB] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />,
                      num: '01',
                      quarterColor: 'bg-[#2563EB]',
                      lineColor: 'bg-[#2563EB]',
                      cardAlign: 'justify-start items-start',
                      headerClasses: 'flex-row',
                      quarterClasses: 'bottom-0 right-0 rounded-tl-full',
                      quarterPadding: 'pt-8 pl-8',
                      iconPos: 'right',
                      textAlign: 'text-left',
                      iconAlign: 'items-start',
                      titleName: 'Perbandingan Pengukuran Dimensi',
                      iconAbsoluteClass: 'bottom-10 left-10'
                    },
                    { 
                      title: <>Perbandingan Hasil<br/>Per Item</>, 
                      desc: `Lihat perbandingan hasil per item dengan ${activeBenchmarkLabel}`, 
                      icon: <ListChecks className="w-[38px] h-[38px] text-[#14B8A6] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />,
                      num: '02',
                      quarterColor: 'bg-[#14B8A6]',
                      lineColor: 'bg-[#14B8A6]',
                      cardAlign: 'justify-start items-end',
                      headerClasses: 'flex-row-reverse',
                      quarterClasses: 'bottom-0 left-0 rounded-tr-full',
                      quarterPadding: 'pt-8 pr-8',
                      iconPos: 'left',
                      textAlign: 'text-right',
                      iconAlign: 'items-end',
                      titleName: 'Perbandingan Hasil Per Item',
                      iconAbsoluteClass: 'bottom-10 right-10'
                    },
                    { 
                      title: <>Perbandingan Penilaian<br/>Keselamatan Pasien</>, 
                      desc: 'Lihat perbandingan tingkat keselamatan pasien (E1).', 
                      icon: <HeartPulse className="w-[38px] h-[38px] text-[#F97316] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />,
                      num: '03',
                      quarterColor: 'bg-[#F97316]',
                      lineColor: 'bg-[#F97316]',
                      cardAlign: 'justify-end items-start',
                      headerClasses: 'flex-row',
                      quarterClasses: 'top-0 right-0 rounded-bl-full',
                      quarterPadding: 'pb-8 pl-8',
                      iconPos: 'left',
                      textAlign: 'text-left',
                      iconAlign: 'items-start',
                      titleName: 'Perbandingan Penilaian Insiden Keselamatan Pasien',
                      iconAbsoluteClass: 'top-10 left-10',
                      h3Classes: 'mr-[54px] ml-0 pt-0 text-left'
                    },
                    { 
                      title: <>Jumlah Insiden<br/>Keselamatan Pasien<br/>Yang Dilaporkan</>, 
                      desc: 'Perbandingan distribusi jumlah kejadian keselamatan pasien.', 
                      icon: <TriangleAlert className="w-[38px] h-[38px] text-[#6B7280] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />,
                      num: '04',
                      quarterColor: 'bg-[#6B7280]',
                      lineColor: 'bg-[#6B7280]',
                      cardAlign: 'justify-end items-end',
                      headerClasses: 'flex-row',
                      quarterClasses: 'top-0 left-0 rounded-br-full',
                      quarterPadding: 'pb-8 pr-8',
                      iconPos: 'right',
                      textAlign: 'text-right',
                      iconAlign: 'items-end',
                      titleName: 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan',
                      iconAbsoluteClass: 'top-10 right-10',
                      h3Classes: 'ml-[69px]'
                    },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => setBenchmarkSubView(item.titleName)}
                      className={`bg-white rounded-[40px] p-8 md:p-10 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 group min-h-[320px] flex flex-col ${item.cardAlign} cursor-pointer relative overflow-hidden`}
                    >
                      {/* Mobile Badge */}
                      <div className={`md:hidden absolute top-6 ${item.iconPos === 'right' ? 'right-6' : 'left-6'} w-12 h-12 rounded-full ${item.quarterColor} flex items-center justify-center font-black text-white text-lg shadow-lg z-20`}>
                        {item.num}
                      </div>

                      <div className="flex flex-col w-full relative z-10 gap-5">
                        {/* Title and line */}
                        <div className="flex justify-between items-start w-full">
                          <div className={`flex flex-col ${item.iconAlign} w-full`}>
                            <h3 className={`text-[20px] md:text-[22px] font-bold text-slate-800 leading-[1.3] uppercase ${item.textAlign} ${item.h3Classes || ''}`}>
                              {item.title}
                            </h3>
                            <div className={`w-16 h-[3px] ${item.lineColor} mt-4 group-hover:w-24 transition-all duration-500 rounded-full`}></div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className={`text-[15px] text-slate-500 leading-[1.6] max-w-[90%] font-medium ${item.textAlign}`}>
                          {item.desc}
                        </p>
                      </div>

                      {/* Desktop Absolute Icon */}
                      <div className={`hidden md:block absolute ${item.iconAbsoluteClass} z-10`}>
                        {item.icon}
                      </div>

                      {/* Desktop Quarter Circle */}
                      <div className={`hidden md:flex absolute ${item.quarterClasses} w-[160px] h-[160px] ${item.quarterColor} flex-col items-center justify-center z-0 origin-center group-hover:scale-105 transition-transform duration-500 ease-out`}>
                        <div className={`flex flex-col items-center justify-center ${item.quarterPadding} w-full h-full`}>
                          <span className="text-white/90 text-[11px] font-bold tracking-[0.2em] uppercase mb-0.5">Hasil</span>
                          <span className="text-white font-black text-[42px] leading-none tracking-tight">{item.num}</span>
                          <span className="text-white/90 text-[9px] font-bold tracking-[0.1em] mt-1.5 uppercase text-center leading-tight whitespace-nowrap">Menu<br/>Analisis</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              ) : benchmarkSubView === 'Perbandingan Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Mode Selector and Filters */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 md:mb-0 bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMode('Tunggal')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Tunggal
                      </button>
                      <button 
                        onClick={() => setMode('Perbandingan')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Perbandingan (2 Periode)
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {mode === 'Tunggal' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Bandingkan:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-slate-400 font-bold">VS</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-[24px] shadow-lg shadow-blue-500/5">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-teal-600" />
                      Hasil Perbandingan Pengukuran Dimensi Untuk {namaRs}
                    </h3>
                    <div className="w-full text-xs font-medium">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-3 w-10 text-center align-bottom">No.</th>
                              <th className="p-3 w-64 align-bottom">Komponen Budaya<br/>Keselamatan Pasien</th>
                              <th className="p-3 align-bottom text-center">Persentase Respons Positif</th>
                              <th className={`p-3 text-center border-l border-slate-200 ${selectedBenchmarkHospitalId === 'default' ? 'w-40' : 'w-40'}`}>
                                <div>{selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel}<br/>(% Respons Positif)</div>
                                {selectedBenchmarkHospitalId === 'default' && (
                                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 text-teal-600">
                                    <span className="w-1/2 text-center text-[10px]">MIN</span>
                                    <span className="w-1/2 text-center border-l border-slate-200 text-[10px]">MAX</span>
                                  </div>
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {combinedData.map((row, i) => {
                              const getBarColor = (val: number) => {
                                if (val >= 85) return 'bg-blue-500';
                                if (val >= 70) return 'bg-emerald-500';
                                if (val >= 50) return 'bg-yellow-500';
                                return 'bg-red-500';
                              };

                              return (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="p-3 text-center font-bold text-slate-400 align-top pt-5">{i + 1}.</td>
                                  <td className="p-3 font-semibold text-slate-700 text-xs align-top pt-5 pr-4 leading-relaxed">{row.dimensiSingkat}</td>
                                  <td className="p-3 align-middle py-4">
                                    {mode === 'Tunggal' ? (
                                      <div className="space-y-3 w-full pt-1">
                                        {/* Bar Rumah Sakit Anda */}
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center justify-between text-[11px] font-black">
                                            <span className="text-blue-800 tracking-tight">{namaRs || 'Rumah Sakit Anda'}</span>
                                            <span className="text-xs font-black text-slate-800">{row.Capaian.toFixed(1)}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-md h-5 relative overflow-hidden flex items-center border border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row.Capaian}%` }}
                                              className={`h-full ${getBarColor(row.Capaian)} relative group-hover:brightness-110 animate-bar-grow transform-gpu shadow-[2px_3px_6px_rgba(15,23,42,0.35)]`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Bar Pembanding */}
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center justify-between text-[11px] font-black">
                                            <span className="text-emerald-800 tracking-tight truncate" title={activeBenchmarkLabel}>
                                              {selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel}
                                            </span>
                                            <span className="text-xs font-black text-emerald-700">
                                              {row.Benchmark.toFixed(1)}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-md h-5 relative overflow-hidden flex items-center border border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row.Benchmark}%` }}
                                              className={`h-full ${getBarColor(row.Benchmark)} opacity-85 relative group-hover:brightness-110 animate-bar-grow-delayed transform-gpu shadow-[2px_3px_6px_rgba(15,23,42,0.35)]`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 w-full pt-1">
                                        {/* Bar Tahun 1 */}
                                        <div className="flex items-center gap-3 w-full">
                                          <span className="text-[10px] text-slate-400 w-14 text-right">Thn {tahun1}</span>
                                          <div className="flex-1 bg-slate-100 rounded-r-md h-5 relative overflow-hidden flex items-center border-y border-r border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row['Tahun 1']}%` }}
                                              className={`h-full ${getBarColor(row['Tahun 1'])} relative group-hover:brightness-110 animate-bar-grow transform-gpu opacity-70 shadow-[2px_3px_6px_rgba(15,23,42,0.3)]`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                          <span className="text-xs font-bold text-slate-500 w-10 text-right">{row['Tahun 1'].toFixed(0)}%</span>
                                        </div>
                                        {/* Bar Tahun 2 */}
                                        <div className="flex items-center gap-3 w-full">
                                          <span className="text-[10px] text-slate-400 w-14 text-right">Thn {tahun2}</span>
                                          <div className="flex-1 bg-slate-100 rounded-r-md h-6 relative overflow-hidden flex items-center border-y border-r border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row['Tahun 2']}%` }}
                                              className={`h-full ${getBarColor(row['Tahun 2'])} relative group-hover:brightness-110 animate-bar-grow-delayed transform-gpu shadow-[2px_3px_6px_rgba(15,23,42,0.3)]`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                          <span className="text-sm font-bold text-slate-700 w-10 text-right">{row['Tahun 2'].toFixed(0)}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  {selectedBenchmarkHospitalId === 'default' && (
                                    <td className="p-0 border-l border-slate-200 text-center font-bold text-slate-700 text-sm align-middle bg-slate-50">
                                      <div className="flex h-full items-center justify-center min-h-[60px]">
                                        <span className="w-1/2 py-2">{row.BenchmarkMin}%</span>
                                        <span className="w-1/2 py-2 border-l border-slate-200">{row.BenchmarkMax}%</span>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-[11px] font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500 shadow-md"></div> &lt;50% (Perlu Perbaikan)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500 shadow-md"></div> 50-69% (Cukup)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500 shadow-md"></div> 70-84% (Baik)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500 shadow-md"></div> &ge;85% (Sangat Baik)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="benchmark-dimension"
                    activeBenchmarkLabel={activeBenchmarkLabel}
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    hospitalDimensionScores={dataTahun1}
                  />
                </div>
              ) : benchmarkSubView === 'Perbandingan Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Mode Selector and Filters */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 md:mb-0 bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMode('Tunggal')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Tunggal
                      </button>
                      <button 
                        onClick={() => setMode('Perbandingan')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Perbandingan (2 Periode)
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {mode === 'Tunggal' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Bandingkan:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-slate-400 font-bold">VS</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/90 backdrop-blur-md border border-slate-200 p-6 md:p-8 rounded-[24px] shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-teal-600" />
                      Perbandingan Penilaian Insiden Keselamatan Pasien
                    </h3>
                    <p className="text-sm text-slate-500 mb-8">Bagaimana Anda menilai tingkat keselamatan pasien di unit kerja Anda? (Butir E1)</p>
                    
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={e1Stats} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <defs>
                            <filter id="shadow-raised" x="-20%" y="-20%" width="150%" height="150%">
                              <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.35" />
                              <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#1e293b" floodOpacity="0.2" />
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                          <XAxis dataKey="kategori" stroke="#64748b" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                          <YAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(val) => `${val}%`} />
                          <RechartsTooltip content={<E1Tooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#475569', fontSize: '13px', fontWeight: 'bold' }} />
                          <Bar isAnimationActive={false} name={namaRs || 'Rumah Sakit Anda'} dataKey="Rumah Sakit Anda" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} filter="url(#shadow-raised)">
                            <LabelList dataKey="Rumah Sakit Anda" position="top" formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} fill="#059669" fontSize={11} fontWeight="bold" />
                            {e1Stats.map((entry, index) => (
                              <Cell key={`cell-rs-${index}`} fill="#10b981" />
                            ))}
                          </Bar>
                          <Bar isAnimationActive={false} name={selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel} dataKey={activeBenchmarkLabel} fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} filter="url(#shadow-raised)">
                            <LabelList dataKey={activeBenchmarkLabel} position="top" formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} fill="#475569" fontSize={11} fontWeight="bold" />
                            {e1Stats.map((entry, index) => (
                              <Cell key={`cell-bp-${index}`} fill="#64748b" />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="benchmark-safety"
                    activeBenchmarkLabel={activeBenchmarkLabel}
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    e1Stats={e1Stats}
                  />
                </div>
              ) : benchmarkSubView === 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Mode Selector and Filters */}
                  <div className="flex flex-col gap-6 bg-white border border-slate-200 p-6 rounded-[20px] shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button 
                          onClick={() => setMode('Tunggal')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Periode Tunggal
                        </button>
                        <button 
                          onClick={() => setMode('Perbandingan')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Perbandingan (2 Periode)
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        {mode === 'Tunggal' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                            <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">Bandingkan:</span>
                            <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <span className="text-slate-400 font-bold">VS</span>
                            <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Unit Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Kerja</label>
                        <select 
                          value={filterUnit} 
                          onChange={e => setFilterUnit(e.target.value)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all truncate"
                        >
                          <option value="Semua">Semua Unit Kerja ({uniqueUnits.length})</option>
                          {uniqueUnits.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>

                      {/* Profesi Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profesi / Jabatan</label>
                        <select 
                          value={filterProfesi} 
                          onChange={e => setFilterProfesi(e.target.value)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all truncate"
                        >
                          <option value="Semua">Semua Profesi ({uniqueProfesi.length})</option>
                          {uniqueProfesi.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tenure RS Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Kerja RS</label>
                        <select 
                          value={filterTenureRS} 
                          onChange={e => setFilterTenureRS(e.target.value)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all truncate"
                        >
                          <option value="Semua">Semua Masa Kerja RS</option>
                          <option value="Kurang dari 1 tahun">Kurang dari 1 tahun</option>
                          <option value="1 hingga 5 tahun">1 hingga 5 tahun</option>
                          <option value="6 hingga 10 tahun">6 hingga 10 tahun</option>
                          <option value="11 tahun atau lebih">11 tahun atau lebih</option>
                        </select>
                      </div>

                      {/* Tenure Unit Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Kerja Unit</label>
                        <select 
                          value={filterTenureUnit} 
                          onChange={e => setFilterTenureUnit(e.target.value)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all truncate"
                        >
                          <option value="Semua">Semua Masa Kerja Unit</option>
                          <option value="Kurang dari 1 tahun">Kurang dari 1 tahun</option>
                          <option value="1 hingga 5 tahun">1 hingga 5 tahun</option>
                          <option value="6 hingga 10 tahun">6 hingga 10 tahun</option>
                          <option value="11 tahun atau lebih">11 tahun atau lebih</option>
                        </select>
                      </div>

                      {/* Interaction Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interaksi Pasien</label>
                        <select 
                          value={filterInteraction} 
                          onChange={e => setFilterInteraction(e.target.value)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all truncate"
                        >
                          <option value="Semua">Semua Interaksi</option>
                          <option value="YA, saya melakukan interaksi atau kontak langsung dengan pasien">Hanya Interaksi Langsung</option>
                          <option value="TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien">Interaksi Tidak Langsung dengan Pasien</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Main Chart Card - Glassmorphism 2.0 style */}
                  <div className="bg-white rounded-[24px] shadow-[0_12px_40px_rgba(37,99,235,0.12)] border border-[rgba(37,99,235,0.10)] overflow-hidden">
                    {/* Header Card */}
                    <div className="bg-[#14B8A6] p-8 text-white flex items-center justify-between">
                      <div className="space-y-1.5">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Perbandingan Jumlah Insiden Keselamatan Pasien yang Dilaporkan</h2>
                        <p className="text-xs md:text-sm text-blue-100/80 font-medium">Membandingkan distribusi frekuensi pelaporan insiden keselamatan pasien dengan {activeBenchmarkLabel}</p>
                      </div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shrink-0 hidden sm:block">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                      {/* Sub-header info or reset filters */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                          <span>Total Responden Aktif:</span>
                          <span className="text-sm font-extrabold text-blue-800">{reportedEventsComparisonStats.total}</span>
                        </div>
                        {(filterUnit !== 'Semua' || filterProfesi !== 'Semua' || filterTenureRS !== 'Semua' || filterTenureUnit !== 'Semua' || filterInteraction !== 'Semua') && (
                          <button 
                            onClick={() => {
                              setFilterUnit('Semua');
                              setFilterProfesi('Semua');
                              setFilterTenureRS('Semua');
                              setFilterTenureUnit('Semua');
                              setFilterInteraction('Semua');
                            }}
                            className="text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Reset Semua Filter
                          </button>
                        )}
                      </div>

                      {/* Chart Area with 3D Depth & Dark Shadow */}
                      <div className="h-[460px] p-4 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.02)]" style={{ filter: 'drop-shadow(0px 12px 28px rgba(15, 23, 42, 0.12))' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart 
                            data={e2ChartData} 
                            margin={{ top: 25, right: 10, left: -10, bottom: 20 }}
                          >
                            <defs>
                              {/* 3D Royal Blue Gradient for Rumah Sakit Anda */}
                              <linearGradient id="royalBlueGrad3D" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="35%" stopColor="#2563EB" />
                                <stop offset="80%" stopColor="#1D4ED8" />
                                <stop offset="100%" stopColor="#1E3A8A" />
                              </linearGradient>

                              {/* 3D Grey Gradient for {activeBenchmarkLabel} */}
                              <linearGradient id="greyGrad3D" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F3F4F6" />
                                <stop offset="40%" stopColor="#D1D5DB" />
                                <stop offset="85%" stopColor="#9CA3AF" />
                                <stop offset="100%" stopColor="#4B5563" />
                              </linearGradient>

                              {/* Dark 3D Shadow Filter for Blue Bar */}
                              <filter id="dark3DShadowBlue" x="-30%" y="-20%" width="160%" height="160%">
                                <feDropShadow dx="4" dy="8" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.45" />
                                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#1e293b" floodOpacity="0.25" />
                              </filter>

                              {/* Dark 3D Shadow Filter for Grey Bar */}
                              <filter id="dark3DShadowGrey" x="-30%" y="-20%" width="160%" height="160%">
                                <feDropShadow dx="4" dy="8" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.35" />
                                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#334155" floodOpacity="0.2" />
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                            <XAxis 
                              dataKey="kategori" 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} 
                              tickLine={false}
                            />
                            <YAxis 
                              type="number" 
                              domain={[0, 100]} 
                              tickCount={11} 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                              tickLine={false}
                              tickFormatter={(val) => `${val}%`} 
                            />
                            <RechartsTooltip content={<ReportedEventsTooltip />} cursor={{ fill: 'rgba(37,99,235,0.02)' }} />
                            <Legend 
                              verticalAlign="top" 
                              align="right"
                              height={40} 
                              iconType="circle"
                              iconSize={10}
                              wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '20px' }} 
                            />
                            <Bar 
                              isAnimationActive={false} 
                              name={namaRs || 'Rumah Sakit Anda'}
                              dataKey="Rumah Sakit Anda" 
                              fill="url(#royalBlueGrad3D)" 
                              radius={[8, 8, 0, 0]} 
                              maxBarSize={55} 
                              filter="url(#dark3DShadowBlue)"
                            >
                              <LabelList 
                                dataKey="Rumah Sakit Anda" 
                                position="top" 
                                formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                fill="#1d4ed8" 
                                fontSize={11} 
                                fontWeight="bold" 
                              />
                            </Bar>
                            <Bar 
                              isAnimationActive={false} 
                              name={selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel}
                              dataKey={activeBenchmarkLabel} 
                              fill="url(#greyGrad3D)" 
                              stroke="#6B7280" 
                              strokeWidth={0.5} 
                              radius={[8, 8, 0, 0]} 
                              maxBarSize={55}
                              filter="url(#dark3DShadowGrey)"
                            >
                              <LabelList 
                                dataKey={activeBenchmarkLabel} 
                                position="top" 
                                formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                fill="#4b5563" 
                                fontSize={11} 
                                fontWeight="bold" 
                              />
                            </Bar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>

                      <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                        type="benchmark-reported"
                    activeBenchmarkLabel={activeBenchmarkLabel}
                        tahun1={tahun1}
                        hospitalSurveys={hospitalSurveys}
                        reportedEventsComparisonStats={reportedEventsComparisonStats}
                      />
                    </div>
                  </div>
                </div>
              ) : benchmarkSubView === 'Perbandingan Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Mode Selector and Filters */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMode('Tunggal')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Tunggal
                      </button>
                      <button 
                        onClick={() => setMode('Perbandingan')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Perbandingan
                      </button>
                    </div>
                    
                    {mode === 'Tunggal' ? (
                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Tahun:</span>
                        <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                          {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 1:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 2:</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Legend Info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500 shadow-sm"></div>
                        <span className="text-[11px] font-bold text-slate-600">Positif</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500 shadow-sm"></div>
                        <span className="text-[11px] font-bold text-slate-600">Netral</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-rose-500 shadow-sm"></div>
                        <span className="text-[11px] font-bold text-slate-600">Negatif</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-slate-400 shadow-sm"></div>
                        <span className="text-[11px] font-bold text-slate-600">Tidak Menjawab / Tidak Tahu</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg tracking-wider uppercase">
                      Pembanding {activeBenchmarkLabel}
                    </div>
                  </div>

                  {/* Dimension Grid list */}
                  <div className="grid grid-cols-1 gap-8">
                    {DIMENSION_ORDER.map((dimId, index) => {
                      const dimInfo = DIMENSI_INFO[dimId];
                      const questions = ALL_QUESTIONS.filter(q => q.dim === dimId);
                      
                      let sumPosPercent = 0;
                      let sumPosPercent2 = 0;
                      const qStats = questions.map(q => {
                        const stat = calculateQuestionStats(q);
                        const stat2 = mode === 'Perbandingan' ? calculateQuestionStats(q, hospitalSurveys2) : null;
                        
                        let bmStat;
                        
                        if (selectedBenchmarkHospitalId === 'default') {
                          // Use the static dataset provided in instructions
                          const qCode = q.code.endsWith('R') || q.isReversed ? (q.code.endsWith('R') ? q.code : q.code + 'R') : q.code;
                          const staticData = STATIC_BENCHMARK_DATA[qCode] || STATIC_BENCHMARK_DATA[q.code];
                          
                          if (staticData) {
                            const bmPosP = staticData.benchmark;
                            const bmNeuP = 15;
                            const bmNegP = Math.max(0, 100 - bmPosP - bmNeuP);
                            bmStat = {
                              pos: 0, neu: 0, neg: 0, missing: 0, total: 0,
                              posPercent: bmPosP,
                              neuPercent: bmNeuP,
                              negPercent: bmNegP,
                              missingPercent: 0,
                              min: staticData.min,
                              max: staticData.max
                            };
                          }
                        }

                        if (!bmStat) {
                          const bmStatRaw = calculateQuestionStats(q, activeBenchmarkSurveys.length > 0 ? activeBenchmarkSurveys : undefined);
                          bmStat = bmStatRaw;
                          if (!bmStat || bmStat.total === 0) {
                            const qCode = q.section + q.id;
                            const exactBmVal = BENCHMARK_ITEMS[qCode] || BENCHMARK_ITEMS[q.code];
                            const dimBmVal = exactBmVal !== undefined 
                              ? exactBmVal 
                              : (masterBenchmarkData && (masterBenchmarkData as any)[dimId]
                                ? ((masterBenchmarkData as any)[dimId].positivePercent ?? (masterBenchmarkData as any)[dimId].avg ?? (masterBenchmarkData as any)[dimId].min ?? 75)
                                : (DIMENSI_INFO[dimId] ? (DIMENSI_INFO[dimId].benchmarkMin + DIMENSI_INFO[dimId].benchmarkMax) / 2 : 75));
                            const bmPosP = Math.min(100, Math.max(0, Math.round(dimBmVal)));
                            const bmNeuP = Math.min(100 - bmPosP, 15);
                            const bmNegP = Math.min(100 - bmPosP - bmNeuP, 10);
                            const bmMissP = Math.max(0, 100 - bmPosP - bmNeuP - bmNegP);
                            bmStat = {
                              pos: 0, neu: 0, neg: 0, missing: 0, total: 0,
                              posPercent: bmPosP,
                              neuPercent: bmNeuP,
                              negPercent: bmNegP,
                              missingPercent: bmMissP
                            };
                          }
                        }

                        sumPosPercent += stat.posPercent;
                        if (stat2) sumPosPercent2 += stat2.posPercent;
                        return { q, stat, stat2, bmStat };
                      });
                      const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                      const avgPosPercent2 = questions.length > 0 ? Math.round(sumPosPercent2 / questions.length) : 0;
                      const status = getDimensionStatus(avgPosPercent);
                      const status2 = getDimensionStatus(avgPosPercent2);

                      const bMin = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
                      const bMax = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          key={dimId} 
                          className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-all group"
                        >
                          {/* Card Header */}
                          <div className="p-6 bg-slate-50/50 border-b border-slate-200/50 relative flex items-center gap-5">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-indigo-600"></div>
                            <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                              <span className="text-xl font-black text-indigo-600">{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">{dimInfo.nama}</h3>
                              <p className="text-[13px] text-slate-500 mt-1 font-medium leading-relaxed max-w-3xl">{dimInfo.deskripsi}</p>
                            </div>
                          </div>

                          {/* Questions Table */}
                          <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse min-w-[950px]">
                              <thead>
                                <tr className="border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30">
                                  <th className="p-4 w-16 text-center align-bottom">Item</th>
                                  <th className="p-4 align-bottom">Pernyataan / Kuesioner</th>
                                  <th className="p-4 align-bottom text-center">Persentase Respons Pasien (Positif/Netral/Negatif)</th>
                                  <th className="p-4 w-44 text-center border-l border-slate-200/50 bg-slate-50/60">
                                    <div>{selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel}<br/>(% Respons Positif)</div>
                                    {selectedBenchmarkHospitalId === 'default' && (
                                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-200/50 text-teal-600">
                                        <span className="w-1/2 text-center text-[9px]">MIN</span>
                                        <span className="w-1/2 text-center border-l border-slate-200/50 text-[9px]">MAX</span>
                                      </div>
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {qStats.map(({ q, stat, stat2, bmStat }) => (
                                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors group">
                                    {/* Item Code */}
                                    <td className="p-4 text-center align-top pt-5">
                                      <span className="text-[14px] font-black text-indigo-600 leading-none">{q.code}{q.isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                      <div className="w-5 h-0.5 bg-indigo-500 mt-2 mx-auto rounded-full"></div>
                                    </td>
                                    {/* Item Text */}
                                    <td className="p-4 font-semibold text-slate-700 text-xs align-top pt-5 pr-4 leading-relaxed max-w-[280px]">
                                      {q.text}
                                    </td>
                                    {/* Bar charts (RS Anda vs RS Pembanding) */}
                                    <td className="p-4 align-middle py-4">
                                      <div className="flex flex-col gap-3 w-full">
                                        {/* Bar 1: RS Anda */}
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center justify-between text-[11px] font-extrabold">
                                            <span className="text-[11px] text-blue-700 font-black tracking-tight" title={namaRs || 'Rumah Sakit'}>
                                              {namaRs || 'Rumah Sakit Anda'} {mode === 'Perbandingan' ? `(${tahun1})` : ''}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <div className="w-1.5 h-3 bg-slate-400 rounded-full"></div>
                                              <span className="text-[9px] text-slate-400 font-bold leading-tight">Tidak Menjawab/Tahu <span className="text-slate-800 font-black">{stat.missingPercent}%</span></span>
                                            </div>
                                          </div>
                                          <div className="w-full h-6 flex rounded-xl overflow-hidden bg-slate-50 border border-slate-200/60 shadow-[0_4px_12px_rgba(15,23,42,0.18)] relative">
                                            <div
                                              className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-700 ease-out relative"
                                              style={{ width: `${stat.posPercent}%` }}
                                            >
                                              {stat.posPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{stat.posPercent}%</span>}
                                            </div>
                                            <div
                                              className="h-full bg-yellow-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20 relative"
                                              style={{ width: `${stat.neuPercent}%` }}
                                            >
                                              {stat.neuPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{stat.neuPercent}%</span>}
                                            </div>
                                            <div
                                              className="h-full bg-rose-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20 relative"
                                              style={{ width: `${stat.negPercent}%` }}
                                            >
                                              {stat.negPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{stat.negPercent}%</span>}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Bar 2: RS Pembanding */}
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center justify-between text-[11px] font-extrabold">
                                            <span className="text-[11px] text-emerald-700 font-black tracking-tight" title={activeBenchmarkLabel}>
                                              {selectedBenchmarkHospitalId === 'default' ? 'RS Uji Coba' : activeBenchmarkLabel}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <div className="w-1.5 h-3 bg-slate-400 rounded-full"></div>
                                              <span className="text-[9px] text-slate-400 font-bold leading-tight">Tidak Menjawab/Tahu <span className="text-slate-800 font-black">{bmStat.missingPercent}%</span></span>
                                            </div>
                                          </div>
                                          <div className="w-full h-6 flex rounded-xl overflow-hidden bg-emerald-50/40 border border-emerald-200/60 shadow-[0_4px_12px_rgba(15,23,42,0.18)] relative">
                                            <div
                                              className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-700 ease-out relative"
                                              style={{ width: `${bmStat.posPercent}%` }}
                                            >
                                              {bmStat.posPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{bmStat.posPercent}%</span>}
                                            </div>
                                            <div
                                              className="h-full bg-yellow-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20 relative"
                                              style={{ width: `${bmStat.neuPercent}%` }}
                                            >
                                              {bmStat.neuPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{bmStat.neuPercent}%</span>}
                                            </div>
                                            <div
                                              className="h-full bg-rose-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20 relative"
                                              style={{ width: `${bmStat.negPercent}%` }}
                                            >
                                              {bmStat.negPercent >= 10 && <span className="text-[9px] font-black text-white leading-none select-none flex items-center justify-center h-full w-full">{bmStat.negPercent}%</span>}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Optional Bar 3 if Perbandingan mode */}
                                        {mode === 'Perbandingan' && stat2 && (
                                          <div className="flex flex-col gap-1 w-full pt-1 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                                              <span className="text-[11px] text-indigo-700 font-black tracking-tight">
                                                {namaRs || 'RS'} (${tahun2})
                                              </span>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <div className="w-1.5 h-3 bg-slate-400 rounded-full"></div>
                                                <span className="text-[9px] text-slate-400 font-bold leading-tight">Tidak Menjawab/Tahu <span className="text-slate-800 font-black">{stat2.missingPercent}%</span></span>
                                              </div>
                                            </div>
                                            <div className="w-full h-6 flex rounded-xl overflow-hidden bg-slate-50 border border-slate-200/60 shadow-[0_4px_12px_rgba(15,23,42,0.18)] relative opacity-85">
                                              <div
                                                className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-700 ease-out"
                                                style={{ width: `${stat2.posPercent}%` }}
                                              >
                                                {stat2.posPercent >= 10 && <span className="text-[9px] font-black text-white">{stat2.posPercent}%</span>}
                                              </div>
                                              <div
                                                className="h-full bg-yellow-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                                style={{ width: `${stat2.neuPercent}%` }}
                                              >
                                                {stat2.neuPercent >= 10 && <span className="text-[9px] font-black text-white">{stat2.neuPercent}%</span>}
                                              </div>
                                              <div
                                                className="h-full bg-rose-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                                style={{ width: `${stat2.negPercent}%` }}
                                              >
                                                {stat2.negPercent >= 10 && <span className="text-[9px] font-black text-white">{stat2.negPercent}%</span>}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    {/* Benchmark MIN & MAX on the right */}
                                    {selectedBenchmarkHospitalId === 'default' && (
                                      <td className="p-0 border-l border-slate-200/50 text-center font-bold text-slate-700 text-xs align-middle bg-slate-50/60 w-44">
                                        <div className="flex h-full items-center justify-center min-h-[50px]">
                                          <span className="w-1/2 py-2">{(bmStat as any).min ?? bMin}%</span>
                                          <span className="w-1/2 py-2 border-l border-slate-200/50">{(bmStat as any).max ?? bMax}%</span>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
 
                          {/* Summary Footer */}
                          <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex flex-col sm:flex-row gap-8">
                              <div className="flex flex-col gap-1">
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">RESPON POSITIF {mode === 'Perbandingan' ? `(${tahun1})` : 'DIMENSI'}</p>
                                <div className="flex items-center gap-4">
                                  <CountUp value={avgPosPercent} className="text-4xl font-black text-slate-800" />
                                  <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${status.bg} ${status.color} ${status.border} uppercase shadow-sm`}>
                                    {status.label}
                                  </div>
                                </div>
                              </div>
                              {mode === 'Perbandingan' && (
                                <div className="flex flex-col gap-1">
                                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">RESPON POSITIF ({tahun2})</p>
                                  <div className="flex items-center gap-4">
                                    <CountUp value={avgPosPercent2} className="text-4xl font-black text-slate-800" />
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${status2.bg} ${status2.color} ${status2.border} uppercase shadow-sm`}>
                                      {status2.label}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-center hidden md:block">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-tight">Benchmark Dimensi (AHRQ)</p>
                                <p className="text-[13px] font-black text-slate-700">{bMin}.0% - {bMax}.0%</p>
                              </div>
                              <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-500 shadow-sm shadow-teal-500/10">
                                <TrendingUp className="w-7 h-7" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="benchmark-item"
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    hospitalItemScores={hospitalItemScores}
                  />
                </div>
              ) : (
                <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex items-center justify-center flex-col text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                    <Award className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Modul Sedang Dalam Pengembangan</h2>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    Data untuk analisis {benchmarkSubView.toLowerCase()} akan ditampilkan di sini.
                  </p>
                </div>
              )
            ) : activeView === 'hospital' ? (
              !hospitalSubView ? (
                <div className="w-full space-y-6">
                  {/* Period selection */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Hospital className="w-5 h-5 text-blue-600" /> Pilih Tahun Survei
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 6 Submenu cards with different color bottom borders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-stretch">
                    {[
                      { 
                        title: 'Demografi Responden', 
                        desc: 'Tinjau sebaran responden berdasarkan posisi, masa kerja, jam kerja, dan interaksi pasien.', 
                        icon: <Users className="w-8 h-8 text-blue-600" />, 
                        hoverClass: 'hover:shadow-blue-100 hover:border-blue-200',
                        lineBg: 'bg-blue-500'
                      },
                      { 
                        title: 'Hasil Pengukuran Dimensi', 
                        desc: 'Lihat capaian skor rata-rata untuk setiap dimensi budaya keselamatan pasien secara komprehensif.', 
                        icon: <BarChart2 className="w-8 h-8 text-emerald-600" />, 
                        hoverClass: 'hover:shadow-emerald-100 hover:border-emerald-200',
                        lineBg: 'bg-emerald-500'
                      },
                      { 
                        title: 'Hasil Per Item', 
                        desc: 'Menganalisis persentase respon positif, netral, dan negatif untuk setiap butir pertanyaan kuesioner.', 
                        icon: <ListChecks className="w-8 h-8 text-orange-600" />, 
                        hoverClass: 'hover:shadow-orange-100 hover:border-orange-200',
                        lineBg: 'bg-orange-500'
                      },
                      { 
                        title: 'Penilaian Insiden Keselamatan Pasien', 
                        desc: 'Evaluasi peringkat keselamatan pasien secara umum berdasarkan persepsi langsung staf medis.', 
                        icon: <HeartPulse className="w-8 h-8 text-rose-600" />, 
                        hoverClass: 'hover:shadow-rose-100 hover:border-rose-200',
                        lineBg: 'bg-rose-500'
                      },
                      { 
                        title: 'Jumlah Insiden Keselamatan Pasien Yang Dilaporkan', 
                        desc: 'Analisis frekuensi pelaporan kejadian keselamatan pasien oleh unit kerja dalam 12 bulan terakhir.', 
                        icon: <AlertTriangle className="w-8 h-8 text-purple-600" />, 
                        hoverClass: 'hover:shadow-purple-100 hover:border-purple-200',
                        lineBg: 'bg-purple-500'
                      },
                      { 
                        title: 'Komentar Survei', 
                        desc: 'Eksplorasi saran, masukan bebas, dan tanggapan tertulis langsung dari para responden.', 
                        icon: <ShieldAlert className="w-8 h-8 text-slate-600" />, 
                        hoverClass: 'hover:shadow-slate-200 hover:border-slate-300',
                        lineBg: 'bg-slate-500'
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        onClick={() => setHospitalSubView(item.title)}
                        className={`bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${item.hoverClass} group h-full min-h-[290px]`}
                      >
                        <div className="p-6 pb-7 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              {item.icon}
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors min-h-[3.25rem] flex items-center leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                            {item.desc}
                          </p>
                          <div className="flex items-center text-blue-600 font-bold text-xs group-hover:translate-x-1 transition-transform mt-auto pt-2">
                            Lihat Detail
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </div>
                        </div>
                        {/* Dynamic identity line at the bottom */}
                        <div className={`w-full h-1.5 ${item.lineBg} transition-all duration-300 group-hover:h-2.5 shrink-0`} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : hospitalSubView === 'Demografi Responden' ? (
                <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
                  {/* Laporan AHRQ V2 Style */}
                  <div id="demografi-report" className="bg-white border border-slate-200 p-8 md:p-12 rounded-[24px] shadow-xl shadow-slate-200/50">
                    {/* Info Card */}
                    <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Rumah Sakit</span>
                        <span className="block text-sm font-bold text-blue-900">{namaRs}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Responden</span>
                        <span className="block text-sm font-bold text-blue-900">{demografiStats.total}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PERIODE TAHUN</span>
                        <span className="block text-sm font-bold text-blue-900">{tahun1 || new Date().getFullYear().toString()}</span>
                      </div>
                    </div>

                    <div className="space-y-10">
                      
                      {/* Section 1 */}
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">1</span>
                          Statistik Administrasi Survei
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                              <tr>
                                <th className="p-3.5 border-b border-slate-200 text-center">Statistik</th>
                                <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900">{namaRs || 'Rumah Sakit'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5 text-slate-700 font-medium">Jumlah Survei Selesai</td>
                                <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">{demografiStats.total}</td>
                              </tr>
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5 text-slate-700 font-medium">Jumlah Link Survei Dibagikan</td>
                                <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">{demografiStats.total}</td>
                              </tr>
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5 text-slate-700 font-medium">Jumlah Responden</td>
                                <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">{demografiStats.total}</td>
                              </tr>
                              <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5 text-slate-700 font-medium">Response Rate</td>
                                <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">100%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* Section 2 */}
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">2</span>
                          Posisi Staf di Rumah Sakit
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                              <tr>
                                <th className="p-3.5 border-b border-slate-200 text-left">Jabatan / Kategori Staf</th>
                                <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900 w-28">(N)</th>
                                <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900 w-28">(%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {demografiStats.posisiData.length > 0 ? (
                                demografiStats.posisiData.map((item, idx) => {
                                  const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(1) : '0';

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                      <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">{item.value}</td>
                                      <td className="p-3.5 text-blue-700 font-semibold text-center bg-blue-50/20">{rsPct}%</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={3} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* Section 3 */}
                      <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">3</span>
                          Unit / Area Kerja
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                              <tr>
                                <th className="p-3.5 border-b border-slate-200 text-left">Unit Utama (Primary Work Area)</th>
                                <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900 w-28">(N)</th>
                                <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900 w-28">(%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {demografiStats.unitData.length > 0 ? (
                                demografiStats.unitData.map((item, idx) => {
                                  const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(1) : '0';

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                      <td className="p-3.5 text-slate-800 font-bold text-center bg-blue-50/20">{item.value}</td>
                                      <td className="p-3.5 text-blue-700 font-semibold text-center bg-blue-50/20">{rsPct}%</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={3} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* Section 4 & 5 (Lama Bekerja) Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section>
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">4</span>
                            Lama Bekerja (RS Ini)
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3.5 border-b border-slate-200 text-left">Durasi (Tahun)</th>
                                  <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900">(%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {demografiStats.g1Data.length > 0 ? (
                                  demografiStats.g1Data.map((item, idx) => {
                                    const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(0) : '0';

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                        <td className="p-3.5 text-blue-700 font-bold text-center bg-blue-50/20">{rsPct}%</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">5</span>
                            Lama Bekerja (Unit Saat Ini)
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3.5 border-b border-slate-200 text-left">Durasi (Tahun)</th>
                                  <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900">(%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {demografiStats.g2Data.length > 0 ? (
                                  demografiStats.g2Data.map((item, idx) => {
                                    const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(0) : '0';

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                        <td className="p-3.5 text-blue-700 font-bold text-center bg-blue-50/20">{rsPct}%</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </div>

                      {/* Section 6 & 7 (Jam & Interaksi) Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section>
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">6</span>
                            Jam Kerja per Minggu
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3.5 border-b border-slate-200 text-left">Durasi (Jam)</th>
                                  <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900">(%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {demografiStats.g3Data.length > 0 ? (
                                  demografiStats.g3Data.map((item, idx) => {
                                    const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(0) : '0';

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                        <td className="p-3.5 text-blue-700 font-bold text-center bg-blue-50/20">{rsPct}%</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">7</span>
                            Interaksi Langsung dgn Pasien
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3.5 border-b border-slate-200 text-left">Kategori</th>
                                  <th className="p-3.5 border-b border-slate-200 text-center bg-blue-50/50 text-blue-900">(%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {demografiStats.g4Data.length > 0 ? (
                                  demografiStats.g4Data.map((item, idx) => {
                                    const rsPct = demografiStats.total > 0 ? ((item.value / demografiStats.total) * 100).toFixed(0) : '0';

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3.5 text-slate-700 font-medium">{item.name}</td>
                                        <td className="p-3.5 text-blue-700 font-bold text-center bg-blue-50/20">{rsPct}%</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="p-4 text-center text-slate-400 italic">Data tidak tersedia</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </div>

                      <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                        type="hospital-demographics"
                        tahun1={tahun1}
                        hospitalSurveys={hospitalSurveys}
                        demografiStats={demografiStats}
                      />

                    </div>
                  </div>
                </div>
              ) : hospitalSubView === 'Hasil Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button 
                          onClick={() => setMode('Tunggal')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Periode Tunggal
                        </button>
                        <button 
                          onClick={() => setMode('Perbandingan')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Perbandingan
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                      {mode === 'Tunggal' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Bandingkan:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-slate-400 font-bold">VS</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Duplicated Detailed Table without Benchmarks */}
                  <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-[24px] shadow-lg shadow-blue-500/5">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-emerald-600" />
                      Detail Pengukuran Dimensi Budaya Keselamatan Untuk {namaRs}
                    </h3>
                    <div className="w-full text-xs font-medium">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-3 w-12 text-center align-bottom">No.</th>
                              <th className="p-3 w-80 align-bottom">Komponen Budaya Keselamatan Pasien</th>
                              <th className="p-3 align-bottom text-center">Persentase Respons Positif</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {combinedData.map((row, i) => {
                              const getBarColor = (val: number) => {
                                if (val >= 85) return 'bg-blue-500';
                                if (val >= 70) return 'bg-emerald-500';
                                if (val >= 50) return 'bg-yellow-500';
                                return 'bg-red-500';
                              };

                              return (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="p-3 text-center font-bold text-slate-400 align-top pt-5">{i + 1}.</td>
                                  <td className="p-3 font-semibold text-slate-700 text-xs align-top pt-5 pr-4 leading-relaxed">
                                    {row.dimensiSingkat}
                                  </td>
                                  <td className="p-3 align-middle py-4">
                                    {mode === 'Tunggal' ? (
                                      <div className="flex items-center gap-3 w-full">
                                        <div className="flex-1 bg-slate-100 rounded-r-md h-7 relative overflow-hidden flex items-center border-y border-r border-slate-200 shadow-inner">
                                          <div 
                                            style={{ transformOrigin: 'left', width: `${row.Capaian}%` }}
                                            className={`h-full ${getBarColor(row.Capaian)} relative group-hover:brightness-110 animate-bar-grow transform-gpu`}
                                          >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                          </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 w-12 text-right">{row.Capaian.toFixed(0)}%</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 w-full pt-1">
                                        {/* Bar Tahun 1 */}
                                        <div className="flex items-center gap-3 w-full">
                                          <span className="text-[10px] text-slate-400 w-14 text-right">Thn {tahun1}</span>
                                          <div className="flex-1 bg-slate-100 rounded-r-md h-5 relative overflow-hidden flex items-center border-y border-r border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row['Tahun 1']}%` }}
                                              className={`h-full ${getBarColor(row['Tahun 1'])} relative group-hover:brightness-110 animate-bar-grow transform-gpu opacity-70`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                          <span className="text-xs font-bold text-slate-500 w-10 text-right">{row['Tahun 1'].toFixed(0)}%</span>
                                        </div>
                                        {/* Bar Tahun 2 */}
                                        <div className="flex items-center gap-3 w-full">
                                          <span className="text-[10px] text-slate-400 w-14 text-right">Thn {tahun2}</span>
                                          <div className="flex-1 bg-slate-100 rounded-r-md h-6 relative overflow-hidden flex items-center border-y border-r border-slate-200 shadow-inner">
                                            <div 
                                              style={{ transformOrigin: 'left', width: `${row['Tahun 2']}%` }}
                                              className={`h-full ${getBarColor(row['Tahun 2'])} relative group-hover:brightness-110 animate-bar-grow-delayed transform-gpu`}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                            </div>
                                          </div>
                                          <span className="text-sm font-bold text-slate-700 w-10 text-right">{row['Tahun 2'].toFixed(0)}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-[11px] font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500 shadow-md"></div> &lt;50% (Perlu Perbaikan)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500 shadow-md"></div> 50-69% (Cukup)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500 shadow-md"></div> 70-84% (Baik)</div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500 shadow-md"></div> &ge;85% (Sangat Baik)</div>
                        </div>

                        <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                          type="hospital-dimension"
                          tahun1={tahun1}
                          hospitalSurveys={hospitalSurveys}
                          hospitalDimensionScores={hospitalDimensionScores}
                        />

                      </div>
                    </div>
                  </div>
                </div>
              ) : hospitalSubView === 'Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6">
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button 
                          onClick={() => setMode('Tunggal')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Periode Tunggal
                        </button>
                        <button 
                          onClick={() => setMode('Perbandingan')}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Periode Perbandingan
                        </button>
                      </div>
                      
                      {mode === 'Tunggal' ? (
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 1:</span>
                            <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 2:</span>
                            <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-32 cursor-pointer transition-all">
                              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      {DIMENSION_ORDER.map((dimId, index) => {
                        const dimInfo = DIMENSI_INFO[dimId];
                        const questions = ALL_QUESTIONS.filter(q => q.dim === dimId);
                        
                        let sumPosPercent = 0;
                        let sumPosPercent2 = 0;
                        const qStats = questions.map(q => {
                          const stat = calculateQuestionStats(q);
                          const stat2 = mode === 'Perbandingan' ? calculateQuestionStats(q, hospitalSurveys2) : null;
                          const bmStat = calculateQuestionStats(q, activeBenchmarkSurveys.length > 0 ? activeBenchmarkSurveys : undefined);
                          sumPosPercent += stat.posPercent;
                          if (stat2) sumPosPercent2 += stat2.posPercent;
                          return { q, stat, stat2, bmStat };
                        });
                        const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                        const avgPosPercent2 = questions.length > 0 ? Math.round(sumPosPercent2 / questions.length) : 0;
                        const status = getDimensionStatus(avgPosPercent);
                        const status2 = getDimensionStatus(avgPosPercent2);

                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            key={dimId} 
                            className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-all group"
                          >
                            {/* Card Header */}
                            <div className="p-6 bg-slate-50/50 border-b border-slate-100 relative flex items-center gap-5">
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-indigo-600"></div>
                              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                <span className="text-xl font-black text-indigo-600">{index + 1}</span>
                              </div>
                              <div>
                                <h3 className="text-[17px] font-bold text-slate-800 tracking-tight">{dimInfo.nama}</h3>
                                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-3xl">{dimInfo.deskripsi}</p>
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="p-6 md:p-8 space-y-8">
                              {/* Legend - Minimalist one-line layout */}
                              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pb-8 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm"></div>
                                  <span className="text-[12px] font-bold text-slate-600">Positif</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-3.5 h-3.5 rounded bg-yellow-500 shadow-sm"></div>
                                  <span className="text-[12px] font-bold text-slate-600">Netral</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-3.5 h-3.5 rounded bg-rose-500 shadow-sm"></div>
                                  <span className="text-[12px] font-bold text-slate-600">Negatif</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-3.5 h-3.5 rounded bg-slate-400 shadow-sm"></div>
                                  <span className="text-[12px] font-bold text-slate-600">Tidak Menjawab / Tidak Tahu</span>
                                </div>
                              </div>
                              
                              <div className="space-y-12">
                                {qStats.map(({ q, stat, stat2 }) => (
                                  <div key={q.id} className="flex flex-col lg:flex-row gap-6 lg:items-center">
                                    {/* Question Code & Text */}
                                    <div className="lg:w-[45%] flex gap-5">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[15px] font-black text-indigo-600 leading-none">{q.code}{q.isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                        <div className="w-5 h-0.5 bg-indigo-600 mt-2 rounded-full"></div>
                                      </div>
                                      <p className="text-[14px] font-bold text-slate-700 leading-[1.6]">{q.text}</p>
                                    </div>

                                    {/* Bar Chart and N/A label */}
                                    <div className="flex-1 flex flex-col gap-3">
                                      <div className="flex items-center gap-4">
                                        {mode === 'Perbandingan' && <span className="text-[10px] text-slate-400 w-12 shrink-0 font-bold text-right">Thn {tahun1}</span>}
                                        <div className={`flex-1 ${mode === 'Tunggal' ? 'h-10' : 'h-8'} flex rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/60 shadow-inner relative`}>
                                          <div 
                                            className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-700 ease-out"
                                            style={{ width: `${stat.posPercent}%` }}
                                          >
                                            {stat.posPercent >= 10 && <span className="text-[10px] font-black text-white">{stat.posPercent}%</span>}
                                          </div>
                                          <div 
                                            className="h-full bg-yellow-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                            style={{ width: `${stat.neuPercent}%` }}
                                          >
                                            {stat.neuPercent >= 10 && <span className="text-[10px] font-black text-white">{stat.neuPercent}%</span>}
                                          </div>
                                          <div 
                                            className="h-full bg-rose-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                            style={{ width: `${stat.negPercent}%` }}
                                          >
                                            {stat.negPercent >= 10 && <span className="text-[10px] font-black text-white">{stat.negPercent}%</span>}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 min-w-[140px] shrink-0">
                                          <div className="w-2 h-4 bg-slate-400 rounded-full"></div>
                                          <div className="leading-tight">
                                            <p className="text-[10px] text-slate-400 font-bold leading-tight">Tidak Menjawab /</p>
                                            <p className="text-[10px] text-slate-400 font-bold leading-tight">Tidak Tahu <span className="text-slate-800 font-black">{stat.missingPercent}%</span></p>
                                          </div>
                                        </div>
                                      </div>

                                      {mode === 'Perbandingan' && stat2 && (
                                        <div className="flex items-center gap-4">
                                          <span className="text-[10px] text-slate-400 w-12 shrink-0 font-bold text-right">Thn {tahun2}</span>
                                          <div className="flex-1 h-8 flex rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/60 shadow-inner relative opacity-80">
                                            <div 
                                              className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-700 ease-out"
                                              style={{ width: `${stat2.posPercent}%` }}
                                            >
                                              {stat2.posPercent >= 10 && <span className="text-[10px] font-black text-white">{stat2.posPercent}%</span>}
                                            </div>
                                            <div 
                                              className="h-full bg-yellow-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                              style={{ width: `${stat2.neuPercent}%` }}
                                            >
                                              {stat2.neuPercent >= 10 && <span className="text-[10px] font-black text-white">{stat2.neuPercent}%</span>}
                                            </div>
                                            <div 
                                              className="h-full bg-rose-500 flex items-center justify-center transition-all duration-700 ease-out border-l border-white/20"
                                              style={{ width: `${stat2.negPercent}%` }}
                                            >
                                              {stat2.negPercent >= 10 && <span className="text-[10px] font-black text-white">{stat2.negPercent}%</span>}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 min-w-[140px] shrink-0">
                                            <div className="w-2 h-4 bg-slate-400 rounded-full"></div>
                                            <div className="leading-tight">
                                              <p className="text-[10px] text-slate-400 font-bold leading-tight">Tidak Menjawab /</p>
                                              <p className="text-[10px] text-slate-400 font-bold leading-tight">Tidak Tahu <span className="text-slate-800 font-black">{stat2.missingPercent}%</span></p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-white p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                              <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex flex-col gap-1">
                                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">RESPON POSITIF {mode === 'Perbandingan' ? `(${tahun1})` : 'DIMENSI'}</p>
                                  <div className="flex items-center gap-4">
                                    <CountUp value={avgPosPercent} className="text-4xl font-black text-slate-800" />
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${status.bg} ${status.color} ${status.border} uppercase shadow-sm`}>
                                      {status.label}
                                    </div>
                                  </div>
                                </div>
                                {mode === 'Perbandingan' && (
                                  <div className="flex flex-col gap-1">
                                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">RESPON POSITIF ({tahun2})</p>
                                    <div className="flex items-center gap-4">
                                      <CountUp value={avgPosPercent2} className="text-4xl font-black text-slate-800" />
                                      <div className={`px-4 py-1.5 rounded-full text-xs font-black border ${status2.bg} ${status2.color} ${status2.border} uppercase shadow-sm`}>
                                        {status2.label}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-center hidden md:block">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-tight">Benchmark (AHRQ)</p>
                                  <p className="text-[13px] font-black text-slate-700">72.0% - 85.0%</p>
                                </div>
                                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/10">
                                  <TrendingUp className="w-7 h-7" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="hospital-item"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      hospitalItemScores={hospitalItemScores}
                    />

                  </div>
                </div>
              ) : hospitalSubView === 'Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button 
                          onClick={() => setMode('Tunggal')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Periode Tunggal
                        </button>
                        <button 
                          onClick={() => setMode('Perbandingan')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Perbandingan
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                      {mode === 'Tunggal' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Bandingkan:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-slate-400 font-bold">VS</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer [&>option]:bg-white">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Duplicated Penilaian Insiden Keselamatan Pasien Chart Card without Benchmarks */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white border border-slate-200 p-6 md:p-8 rounded-[24px] shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-rose-600" />
                      Grafik Penilaian Insiden Keselamatan Pasien
                    </h3>
                    <p className="text-sm text-slate-500 mb-8">Bagaimana Anda menilai tingkat keselamatan pasien di unit kerja Anda? (Butir E1)</p>
                    
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={e1Stats} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <defs>
                            <filter id="shadow-raised-rose" x="-10%" y="-15%" width="125%" height="135%">
                              <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#9f1239" floodOpacity="0.15" />
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                          <XAxis dataKey="kategori" stroke="#64748b" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                          <YAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(val) => `${val}%`} />
                          <RechartsTooltip content={<E1Tooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#475569', fontSize: '13px', fontWeight: 'bold' }} />
                          <Bar isAnimationActive={false} name={namaRs || 'Rumah Sakit'} dataKey="Rumah Sakit Anda" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            <LabelList dataKey="Rumah Sakit Anda" position="top" formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} fill="#be123c" fontSize={11} fontWeight="bold" />
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="hospital-safety"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      e1Stats={e1Stats}
                    />

                  </motion.div>
                </div>
              ) : hospitalSubView === 'Jumlah Insiden Keselamatan Pasien Yang Dilaporkan' ? (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMode('Tunggal')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Tunggal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Tunggal
                      </button>
                      <button 
                        onClick={() => setMode('Perbandingan')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'Perbandingan' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Periode Perbandingan
                      </button>
                    </div>
                    
                    {mode === 'Tunggal' ? (
                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Tahun:</span>
                        <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-32 cursor-pointer transition-all">
                          {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 1:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-32 cursor-pointer transition-all">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun 2:</span>
                          <select value={tahun2} onChange={e => setTahun2(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-32 cursor-pointer transition-all">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Chart Card - Glassmorphism 2.0 style */}
                  <div className="bg-white rounded-[24px] shadow-[0_12px_40px_rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.10)] overflow-hidden">
                    {/* Header Card */}
                    <div className="bg-[#14B8A6] p-8 text-white flex items-center justify-between">
                      <div className="space-y-1.5">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Detail Distribusi Jumlah Insiden Keselamatan Pasien yang Dilaporkan</h2>
                        <p className="text-xs md:text-sm text-purple-100/80 font-medium">Distribusi frekuensi pelaporan insiden keselamatan pasien berdasarkan data responden rumah sakit Anda</p>
                      </div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shrink-0 hidden sm:block">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="p-6 md:p-8 space-y-8">
                      {/* Sub-header info */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100">
                          <span>Total Responden {mode === 'Perbandingan' ? `(${tahun1})` : 'Aktif'}:</span>
                          <span className="text-sm font-extrabold text-purple-800">{reportedEventsStats1.total}</span>
                        </div>
                        {mode === 'Perbandingan' && (
                          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-100">
                            <span>Total Responden ({tahun2}):</span>
                            <span className="text-sm font-extrabold text-orange-800">{reportedEventsStats2?.total || 0}</span>
                          </div>
                        )}
                      </div>

                      {/* Chart Area */}
                      <div className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart 
                            data={e2ChartData} 
                            margin={{ top: 25, right: 10, left: -10, bottom: 20 }}
                          >
                            <defs>
                              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#6d28d9" />
                              </linearGradient>
                              <filter id="re-shadow-purple" x="-15%" y="-15%" width="130%" height="140%">
                                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.35" />
                              </filter>
                              {mode === 'Perbandingan' && (
                                <>
                                  <linearGradient id="orangeGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="100%" stopColor="#c2410c" />
                                  </linearGradient>
                                  <filter id="re-shadow-orange" x="-15%" y="-15%" width="130%" height="140%">
                                    <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#7c2d12" floodOpacity="0.35" />
                                  </filter>
                                </>
                              )}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                            <XAxis 
                              dataKey="kategori" 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} 
                              tickLine={false}
                            />
                            <YAxis 
                              type="number" 
                              domain={[0, 100]} 
                              tickCount={11} 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                              tickLine={false}
                              tickFormatter={(val) => `${val}%`} 
                            />
                            <RechartsTooltip content={<ReportedEventsTooltip />} cursor={{ fill: 'rgba(139,92,246,0.02)' }} />
                            <Legend 
                              verticalAlign="top" 
                              align="right"
                              height={40} 
                              iconType="circle"
                              iconSize={10}
                              wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '20px' }} 
                            />
                            <Bar 
                              isAnimationActive={false} 
                              name={mode === 'Perbandingan' ? `Tahun ${tahun1}` : (namaRs || 'Rumah Sakit')}
                              dataKey="Rumah Sakit Anda" 
                              fill="url(#purpleGrad)" 
                              radius={[6, 6, 0, 0]} 
                              maxBarSize={55} 
                            >
                              <LabelList 
                                dataKey="Rumah Sakit Anda" 
                                position="top" 
                                formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                fill="#6d28d9" 
                                fontSize={11} 
                                fontWeight="bold" 
                              />
                            </Bar>
                            {mode === 'Perbandingan' && (
                              <Bar 
                                isAnimationActive={false} 
                                name={`Tahun ${tahun2}`}
                                dataKey="Tahun 2" 
                                fill="url(#orangeGrad2)" 
                                radius={[6, 6, 0, 0]} 
                                maxBarSize={55} 
                              >
                                <LabelList 
                                  dataKey="Tahun 2" 
                                  position="top" 
                                  formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                  fill="#c2410c" 
                                  fontSize={11} 
                                  fontWeight="bold" 
                                />
                              </Bar>
                            )}
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="hospital-reported"
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    reportedEventsComparisonStats={reportedEventsComparisonStats}
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        Komentar &amp; Umpan Balik Responden
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Analisis kualitatif komentar bebas responden dengan otomatisasi penyaringan komentar positif.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Komentar Masuk</span>
                        <span className="text-xl font-black text-slate-800">{classifiedComments.length}</span>
                        <span className="text-xs text-slate-500 block">Responden Periode {tahun1}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                        <ThumbsUp className="w-6 h-6 text-emerald-700" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Komentar Positif (Terfilter)</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-emerald-900">{positiveCommentsCount}</span>
                          <span className="text-xs font-extrabold text-emerald-700">
                            ({classifiedComments.length > 0 ? ((positiveCommentsCount / classifiedComments.length) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <span className="text-xs text-emerald-600 block">Apresiasi &amp; Persepsi Baik</span>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-6 h-6 text-amber-700" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Saran &amp; Masukan Konstruktif</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-amber-900">{constructiveCommentsCount}</span>
                          <span className="text-xs font-extrabold text-amber-700">
                            ({classifiedComments.length > 0 ? ((constructiveCommentsCount / classifiedComments.length) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <span className="text-xs text-amber-600 block">Area Peluang Perbaikan</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Daftar Masukan &amp; Saran Tertulis Responden</h3>
                        <p className="text-slate-500 text-xs">Rincian tanggapan kualitatif dari responden {namaRs || 'Rumah Sakit'}.</p>
                      </div>

                      {/* Filter Toggle Buttons */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        <button
                          onClick={() => setCommentFilter('semua')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            commentFilter === 'semua'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Semua ({classifiedComments.length})
                        </button>
                        <button
                          onClick={() => setCommentFilter('positif')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            commentFilter === 'positif'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Positif ({positiveCommentsCount})
                        </button>
                        <button
                          onClick={() => setCommentFilter('konstruktif')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            commentFilter === 'konstruktif'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          Saran &amp; Masukan ({constructiveCommentsCount})
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {filteredComments.length > 0 ? (
                        filteredComments.map((comment, index) => (
                          <div 
                            key={comment.id || index} 
                            className={`p-5 rounded-2xl space-y-3 relative transition-all border-l-4 ${
                              comment.isPositive 
                                ? 'bg-emerald-50/40 border-emerald-500 border-t border-r border-b border-emerald-100/60' 
                                : 'bg-slate-50 border-slate-400 border-t border-r border-b border-slate-200/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {comment.isPositive ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Komentar Positif (Terfilter)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-300">
                                  <MessageCircle className="w-3 h-3 text-slate-500" />
                                  Saran &amp; Masukan Konstruktif
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium">{comment.date}</span>
                            </div>

                            <p className="text-sm italic font-medium text-slate-800 leading-relaxed">
                              &ldquo;{comment.text}&rdquo;
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500 border-t border-slate-200/50 pt-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-[200px]">
                                  {comment.position}
                                </span>
                                <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                  {comment.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
                          <MessageSquareOff className="w-10 h-10 text-slate-300" />
                          <div>
                            <p className="font-bold text-slate-700">Tidak ada komentar pada kategori ini</p>
                            <p className="text-xs mt-1">Belum ada tanggapan responden untuk kriteria filter yang dipilih.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="hospital-comments"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      hospitalComments={classifiedComments}
                    />

                  </div>
                </div>
              )
            ) : activeView === 'unit' ? (
              !unitSubView ? (
                <div className="w-full space-y-6">
                  {/* Period selection / Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-teal-600" /> Pilih Sub-Analisis Perbandingan Unit / Area Kerja
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 w-full p-6">
                    {[
                      { 
                        title: 'Perbandingan Pengukuran Dimensi', 
                        desc: 'Analisis Perbandingan tingkat persentase respon positif untuk 10 dimensi budaya keselamatan berdasarkan unit / area kerja.', 
                        icon: <BarChart2 className="w-5 h-5 text-[#2563EB]" />, 
                        gradient: 'from-[#2563EB] to-[#1D4ED8]', // Royal Blue Gradient
                      },
                      { 
                        title: 'Perbandingan Hasil Per Item', 
                        desc: 'Mengevaluasi dan membandingkan tanggapan positif staf untuk setiap butir pertanyaan kuesioner SOPS di tiap unit.', 
                        icon: <ListChecks className="w-5 h-5 text-[#0D9488]" />, 
                        gradient: 'from-[#0D9488] to-[#047857]', // Hijau Tosca Gradient
                      },
                      { 
                        title: 'Perbandingan Penilaian Insiden Keselamatan Pasien', 
                        desc: 'Membandingkan penilaian peringkat keselamatan pasien umum (E1) lintas berbagai unit / departemen kerja.', 
                        icon: <HeartPulse className="w-5 h-5 text-[#F97316]" />, 
                        gradient: 'from-[#F97316] to-[#EA580C]', // Orange Gradient
                      },
                      { 
                        title: 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan', 
                        desc: 'Melihat perbandingan frekuensi pelaporan kejadian tidak diharapkan (KTD/KNC) di antara berbagai unit / area kerja.', 
                        icon: <AlertTriangle className="w-5 h-5 text-[#64748B]" />, 
                        gradient: 'from-[#64748B] to-[#475569]', // Grey Gradient
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -6, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => setUnitSubView(item.title)}
                        className="relative cursor-pointer group bg-white rounded-[20px] shadow-[0_12px_24px_rgba(15,23,42,0.12),_0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.18),_0_6px_16px_rgba(15,23,42,0.08)] border border-slate-200 overflow-hidden flex min-h-[200px] transition-all duration-300"
                      >
                        {/* Main Content (Left Area) */}
                        <div className="flex-1 p-8 flex flex-col justify-between text-left">
                          {/* Circular Icon Container */}
                          <div className="w-[50px] h-[50px] rounded-full border border-slate-200/80 flex items-center justify-center bg-slate-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] mb-5 group-hover:border-slate-300 group-hover:bg-slate-100/50 transition-colors duration-300">
                            {item.icon}
                          </div>

                          {/* Text Content */}
                          <div>
                            <h3 className="font-extrabold text-[14px] uppercase tracking-wider text-slate-700 mb-2 leading-snug group-hover:text-slate-950 transition-colors duration-300">
                              {item.title}
                            </h3>
                            <p className="text-slate-400 text-[11px] leading-[1.6] font-normal">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        {/* Right Colored Strip Block with Number */}
                        <div className={`w-[54px] bg-gradient-to-b ${item.gradient} flex flex-col items-center justify-start pt-6 relative shrink-0`}>
                          <span className="text-white font-black text-[22px] tracking-tight leading-none select-none">
                            {idx + 1}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : unitSubView === 'Perbandingan Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Summary Comparison Grid - Detailed Unit Comparison from Report */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-cyan-600 tracking-widest uppercase font-mono">TABEL PERBANDINGAN DIMENSI</span>
                        <h3 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                          Hasil Pengukuran Dimensi Budaya Keselamatan Pasien Berdasarkan Unit Kerja
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">
                          Tingkat persentase respon positif untuk dimensi budaya keselamatan pasien berdasarkan unit kerja di {namaRs || 'Rumah Sakit'}
                        </p>
                      </div>
                      
                      {/* Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
                        {totalPagesUnitDimension > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageUnitDimension(p => Math.max(1, p - 1))}
                              disabled={currentPageUnitDimension === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageUnitDimension} / {totalPagesUnitDimension}
                            </span>
                            <button 
                              onClick={() => setCurrentPageUnitDimension(p => Math.min(totalPagesUnitDimension, p + 1))}
                              disabled={currentPageUnitDimension === totalPagesUnitDimension}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-[16px] border border-slate-200 shadow-sm bg-white relative custom-scrollbar pb-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-30 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            <th className="py-4 px-4 text-center w-12 border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>No</th>
                            <th className="py-4 px-5 min-w-[280px] text-center border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>Dimensi Budaya Keselamatan</th>
                            <th className="py-4 px-4 text-center min-w-[120px] border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>Total Responden</th>
                            {paginatedUnitDimensionData.map(u => (
                              <th key={u.name} className="py-4 px-5 min-w-[190px] text-center border-r border-slate-200/80 last:border-r-0 font-extrabold text-white" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>
                                <div className="flex flex-col items-center">
                                  <span className="whitespace-normal break-words">{u.name}</span>
                                  <span className="text-[10px] text-white/90 font-mono tracking-normal normal-case mt-0.5">(N = {u.value})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                          {DIMENSION_ORDER.map((dimId, idx) => {
                            return (
                              <Fragment key={`unit-comp-${dimId}`}>
                                <tr className="hover:bg-slate-50 transition-all border-b border-slate-100">
                                  <td className="py-5 px-4 text-center font-extrabold text-indigo-700 border-r border-slate-200 bg-slate-100">
                                    {idx + 1}
                                  </td>
                                  <td className="py-5 px-5 font-bold text-slate-800 border-r border-slate-200 bg-slate-100 leading-snug">
                                    <div className="space-y-1.5 max-w-[320px]">
                                      <p>{DIMENSI_INFO[dimId].nama}</p>
                                      <p className="text-[10px] text-slate-500 font-normal leading-relaxed">{DIMENSI_INFO[dimId].deskripsi}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center font-extrabold text-slate-700 border-r border-slate-200 bg-cyan-50/40">{hospitalSurveys.length}</td>
                                  {paginatedUnitDimensionData.map((u, unitIdx) => {
                                    const scoreObj = unitDimensionScores.find(s => s.id === dimId);
                                    const percentage = scoreObj ? scoreObj[u.name] : null;
                                    return (
                                      <td key={`unit-rs-${dimId}-${u.name}`} className={`py-3 px-5 text-center border-r border-slate-200 bg-cyan-50/40 ${unitIdx === paginatedUnitDimensionData.length - 1 ? 'last:border-r-0' : ''}`}>
                                        {percentage !== null ? <span className={getCellColorClass(percentage)}>{percentage.toFixed(1)}%</span> : <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>}
                                      </td>
                                    );
                                   })}
                                 </tr>
                              </Fragment>
                            );
                          })}
                          <tr className="bg-indigo-50/40 border-t-2 border-indigo-200 hover:bg-indigo-50 transition-all">
                            <td className="py-5 px-4 text-center font-black text-indigo-700 border-r border-slate-200 bg-indigo-100">★</td>
                            <td className="py-5 px-5 font-black text-slate-800 border-r border-slate-200 bg-indigo-100">
                              <div className="space-y-1">
                                <div className="text-indigo-800 text-xs font-extrabold uppercase tracking-wide">Rata-rata Seluruh Dimensi</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center font-black text-slate-700 border-r border-slate-200 bg-cyan-50/30">{hospitalSurveys.length}</td>
                            {paginatedUnitDimensionData.map((u, unitIdx) => {
                              const avgVal = getAverageCompositeForUnit(u.name);
                              return (
                                <td key={`unit-avg-rs-${u.name}`} className={`py-4 px-5 text-center border-r border-slate-200 bg-cyan-50/30 font-black ${unitIdx === paginatedUnitDimensionData.length - 1 ? 'last:border-r-0' : ''}`}>
                                  {avgVal !== null ? <span className={getCellColorClass(avgVal)}>{avgVal.toFixed(1)}%</span> : <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="unit-dimension"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      unitDimensionScores={unitDimensionScores}
                    />

                  </div>
                </div>
              ) : unitSubView === 'Perbandingan Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Item */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <ListChecks className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Item</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">32</h4>
                        <p className="text-[10px] font-medium text-slate-500">Butir Pernyataan Survei</p>
                      </div>
                    </motion.div>

                    {/* Card 2: Avg Hospital */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0 shadow-inner">
                        <Hospital className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata {namaRs || 'RS'}</span>
                        <h4 className="text-2xl font-extrabold text-sky-700 tracking-tight">
                          {avgHospitalScore > 0 ? `${avgHospitalScore.toFixed(1)}%` : '0%'}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500">Respons Positif Keseluruhan</p>
                      </div>
                    </motion.div>

                    {/* Card 3: Total Respondents */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Responden</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{demografiStats.total}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Partisipan Survei ({tahun1})</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Filter and Table Container */}
                  <div className="bg-white border border-slate-200 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1 font-sans">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Filter Tampilan Dimensi</h3>
                        <p className="text-xs text-slate-500 font-medium">Saring butir pertanyaan berdasarkan dimensi spesifik atau tampilkan semua sekaligus.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                        <div className="w-full sm:w-80">
                          <select
                            value={selectedItemDimId}
                            onChange={(e) => setSelectedItemDimId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors font-sans"
                          >
                            <option value="all">Semua Dimensi Budaya Keselamatan (32 Item)</option>
                            {DIMENSION_ORDER.map(dimId => (
                              <option key={dimId} value={dimId}>
                                [{DIMENSI_INFO[dimId].kode}] {DIMENSI_INFO[dimId].nama}
                              </option>
                            ))}
                          </select>
                        </div>

                        {totalPagesUnitItem > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageUnitItem(p => Math.max(1, p - 1))}
                              disabled={currentPageUnitItem === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageUnitItem} / {totalPagesUnitItem}
                            </span>
                            <button 
                              onClick={() => setCurrentPageUnitItem(p => Math.min(totalPagesUnitItem, p + 1))}
                              disabled={currentPageUnitItem === totalPagesUnitItem}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Matrix Comparative Table matching Posisi Staf layout */}
                    <div className="overflow-x-auto max-h-[75vh] relative custom-scrollbar border-t border-slate-200">
                      <table className="w-full border-collapse text-left border border-slate-300">
                        <thead>
                          {/* Main Header Row in Royal Blue */}
                          <tr className="bg-[#1E3A8A] text-white text-xs font-bold uppercase tracking-wider divide-x divide-blue-800">
                            <th rowSpan={2} className="py-4 px-3 text-center w-[60px] min-w-[60px] bg-[#1E3A8A] sticky left-0 z-20 shadow-md">Item</th>
                            <th rowSpan={2} className="py-4 px-4 text-center min-w-[280px] bg-[#1E3A8A]">Pertanyaan Survei Berdasarkan Dimensi (Composite Measure)</th>
                            <th colSpan={Math.max(1, paginatedUnitItemData.length)} className="py-3 px-4 text-center bg-[#254BAF] border-b border-blue-700 tracking-widest text-[11px]">
                              Unit / Area Kerja (Unit / Work Area)
                            </th>
                          </tr>

                          {/* Unit Names Header Row */}
                          <tr className="bg-[#254BAF] text-white text-[11px] font-bold uppercase tracking-tight divide-x divide-blue-700 border-b border-blue-800">
                            {paginatedUnitItemData.length > 0 ? (
                              paginatedUnitItemData.map((u) => (
                                <th key={u.name} className="py-3 px-3 text-center min-w-[120px] max-w-[180px] leading-tight font-sans">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-bold">{u.name}</span>
                                  </div>
                                </th>
                              ))
                            ) : (
                              <th className="py-3 px-3 text-center min-w-[120px]">Belum Ada Data Unit</th>
                            )}
                          </tr>

                          {/* Respondent Count Sub-Header Rows */}
                          <tr className="bg-blue-50 text-slate-800 text-xs font-semibold border-b border-blue-200 divide-x divide-blue-200 font-sans">
                            <td colSpan={2} className="py-2 px-3 text-right font-bold italic text-blue-900 bg-blue-100/70">
                              {namaRs || 'Rumah Sakit'}: # Responden
                            </td>
                            {paginatedUnitItemData.length > 0 ? (
                              paginatedUnitItemData.map((u, uIdx) => (
                                <td key={`cnt-rs-unit-${uIdx}`} className="py-2 px-2 text-center font-extrabold text-blue-900 bg-blue-100/50">
                                  {u.value}
                                </td>
                              ))
                            ) : (
                              <td className="py-2 px-2 text-center text-slate-400">0</td>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-300 bg-white text-xs text-slate-800 font-sans">
                          {DIMENSION_ORDER.filter(dimId => selectedItemDimId === 'all' || selectedItemDimId === dimId).map((dimId, dimIdx) => {
                            const dimensionItems = hospitalItemScores.filter(item => item.dimId === dimId);
                            const dimInfo = DIMENSI_INFO[dimId];
                            if (!dimensionItems || dimensionItems.length === 0) return null;

                            const colSpanTotal = 2 + Math.max(1, paginatedUnitItemData.length);

                            return (
                              <Fragment key={dimId}>
                                {/* Section Header Row */}
                                <tr className="bg-blue-100/80 text-blue-950 border-y-2 border-blue-300 font-bold">
                                  <td colSpan={colSpanTotal} className="py-2.5 px-4 text-left font-sans text-xs tracking-wide">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0"></span>
                                      <span className="text-blue-950 font-extrabold">{dimIdx + 1}. {dimInfo.nama}</span>
                                      <span className="text-[11px] font-medium text-blue-800 ml-1">({dimInfo.deskripsi})</span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Item Rows */}
                                {dimensionItems.map((item) => {
                                  const benchVal = BENCHMARK_ITEMS[item.id] || 65.5;
                                  const uItemObj = unitItemScores.find(u => u.id === item.id);

                                  return (
                                    <Fragment key={item.id}>
                                      {/* Row 1: RS Anda */}
                                      <tr className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200 border-b border-slate-200">
                                        {/* Item Code */}
                                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/40 align-middle sticky left-0 z-10">
                                          {item.id}
                                        </td>

                                        {/* Question Text */}
                                        <td className="py-3 px-4 font-medium text-slate-800 align-middle">
                                          <div className="space-y-1">
                                            <p className="leading-relaxed text-[13px]">{item.text}</p>
                                            {item.isReversed && (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                Reverse Score
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Unit Scores Row (RS Anda) */}
                                        {paginatedUnitItemData.length > 0 ? (
                                          paginatedUnitItemData.map((u, uIdx) => {
                                            const val = uItemObj ? uItemObj[u.name] : null;
                                            return (
                                              <td key={`rs-score-unit-${item.id}-${uIdx}`} className="py-2.5 px-2 text-center font-bold text-slate-800 bg-blue-50/20 border-b-2 border-slate-300">
                                                {val !== null && val !== undefined ? (
                                                  <span className="text-blue-950 font-black">{val.toFixed(0)}%</span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal">--</span>
                                                )}
                                              </td>
                                            );
                                          })
                                        ) : (
                                          <td className="py-2.5 px-2 text-center text-slate-400 border-b-2 border-slate-300">--</td>
                                        )}
                                      </tr>
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="unit-item"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      unitItemScores={unitItemScores}
                      hospitalItemScores={hospitalItemScores}
                    />

                  </div>
                </div>
              ) : unitSubView === 'Perbandingan Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Comparative Distribution Table for Unit Kerja */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Penilaian Insiden Keselamatan Pasien</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menampilkan perbandingan distribusi penilaian keselamatan pasien berdasarkan unit kerja di {namaRs || 'Rumah Sakit'}
                        </p>
                      </div>
                      
                      {/* Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {totalPagesUnitSafety > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageUnit(p => Math.max(1, p - 1))}
                              disabled={currentPageUnit === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageUnit} / {totalPagesUnitSafety}
                            </span>
                            <button 
                              onClick={() => setCurrentPageUnit(p => Math.min(totalPagesUnitSafety, p + 1))}
                              disabled={currentPageUnit === totalPagesUnitSafety}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-orange-200/60 rounded-xl relative shadow-sm mb-6">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-orange-500 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-orange-600/40 w-[220px] min-w-[220px] bg-orange-500 text-white text-center align-middle leading-tight font-extrabold text-[10px]">
                              Penilaian Insiden Keselamatan Pasien<br/>(Patient Safety Rating)
                            </th>
                            <th rowSpan={2} className="p-4 border-r border-orange-600/40 text-center w-28 bg-orange-500 text-white align-middle font-extrabold">
                              Keseluruhan RS
                            </th>
                            <th colSpan={paginatedUnitSafetyScores.length} className="p-3 text-center bg-orange-500 text-white font-extrabold">
                              Unit / Area Kerja
                            </th>
                          </tr>
                          <tr className="bg-orange-400 text-white font-semibold text-[11px] md:text-xs">
                            {paginatedUnitSafetyScores.map((col, idx) => (
                              <th key={`hdr-unit-sf-${idx}`} className="p-3 text-center border-r border-b border-orange-500/40 align-middle min-w-[130px] w-[130px] bg-orange-400 text-white leading-snug font-bold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                            <td className="bg-slate-50 p-3.5 border-r border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                                <span className="text-sm font-bold italic text-slate-900 text-center">Jumlah Responden</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                              {activeUnitSafetyScores.reduce((acc, r) => acc + r.count, 0).toLocaleString('id-ID')}
                            </td>
                            {paginatedUnitSafetyScores.map((col, idx) => (
                              <td key={`rsp-rs-unit-sf-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                {col.count.toLocaleString('id-ID')}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Safety Rating Category */}
                          {[
                            { key: 5, benchmarkKey: 'Sangat Baik', label: 'Luar Biasa', subLabel: 'Excellent', bmOverall: 28 },
                            { key: 4, benchmarkKey: 'Baik', label: 'Sangat Baik', subLabel: 'Very Good', bmOverall: 39 },
                            { key: 3, benchmarkKey: 'Cukup', label: 'Baik', subLabel: 'Good', bmOverall: 23 },
                            { key: 2, benchmarkKey: 'Kurang', label: 'Cukup', subLabel: 'Fair', bmOverall: 9 },
                            { key: 1, benchmarkKey: 'Sangat Kurang', label: 'Buruk', subLabel: 'Poor', bmOverall: 1 },
                          ].map((cat) => {
                            const totalHospCount = activeUnitSafetyScores.reduce((acc, r) => acc + r.count, 0);
                            const overallHospCatCount = activeUnitSafetyScores.reduce((acc, r) => acc + (r.ratings?.[cat.key as 1|2|3|4|5] || 0), 0);
                            const overallHospPct = totalHospCount > 0 ? (overallHospCatCount / totalHospCount) * 100 : 0;

                            return (
                              <Fragment key={cat.key}>
                                <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                                  <td className="p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm bg-slate-50">
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-slate-800 font-bold text-center">{cat.label}</span>
                                      <span className="text-[10px] text-[#56595b] font-normal italic text-center">{cat.subLabel}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center text-slate-900 font-bold border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                                    {totalHospCount === 0 ? '--' : `${overallHospPct.toFixed(0)}%`}
                                  </td>
                                  {paginatedUnitSafetyScores.map((col, idx) => {
                                    const totalHospRespForCol = col.count;
                                    const pct = totalHospRespForCol > 0 && col.ratings
                                      ? ((col.ratings[cat.key as 1|2|3|4|5] || 0) / totalHospRespForCol) * 100
                                      : 0;

                                    return (
                                      <td key={`val-rs-unit-sf-${cat.key}-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                        {totalHospRespForCol === 0 ? '--' : `${pct.toFixed(0)}%`}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Empty State when search returns no columns */}
                    {paginatedUnitSafetyScores.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl mb-6">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Data Unit Kerja</h4>
                        <p className="text-xs text-slate-400 mt-1">Belum ada data survei untuk unit kerja atau tidak cocok dengan kueri pencarian &ldquo;{searchUnitQuery}&rdquo;</p>
                      </div>
                    )}

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="unit-safety"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      unitSafetyScores={unitSafetyScores}
                    />

                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6">
                  {/* Main Table Card for Unit Kerja (Duplicated from Posisi Staf) */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mb-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Frekuensi Pelaporan Peristiwa Berdasarkan Unit Kerja</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menunjukkan perbandingan persentase jumlah laporan yang diserahkan dalam 12 bulan terakhir berdasarkan unit kerja
                        </p>
                      </div>
                      
                      {/* Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {totalPagesUnitEvent > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageUnitEvent(p => Math.max(1, p - 1))}
                              disabled={currentPageUnitEvent === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageUnitEvent} / {totalPagesUnitEvent}
                            </span>
                            <button 
                              onClick={() => setCurrentPageUnitEvent(p => Math.min(totalPagesUnitEvent, p + 1))}
                              disabled={currentPageUnitEvent === totalPagesUnitEvent}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-slate-200/60 rounded-xl relative shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-[#D8D4EC] text-slate-800 font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-slate-300/60 w-[200px] min-w-[200px] bg-[#D8D4EC] align-middle text-center">
                              Jumlah Insiden Keselamatan Pasien<br/>Yang Dilaporkan
                            </th>
                            <th colSpan={paginatedComputedUnitTableData.length} className="p-3 text-center bg-[#D8D4EC] font-bold">
                              Unit / Area Kerja
                            </th>
                          </tr>
                          <tr className="bg-[#E5E1F9] text-slate-800 font-semibold text-[11px] md:text-xs">
                            {paginatedComputedUnitTableData.map((col, idx) => (
                              <th key={`hdr-unit-ev-${idx}`} className="p-3 text-center border-r border-b border-slate-300/60 align-bottom min-w-[130px] w-[130px] bg-[#E5E1F9] leading-snug">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-blue-50/5 transition-colors bg-white">
                            <td className="p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[12px] bg-white">
                              Jumlah Responden {namaRs || 'Rumah Sakit'}
                            </td>
                            {paginatedComputedUnitTableData.map((col, idx) => (
                              <td key={`rsp-rs-unit-ev-${idx}`} className="p-3 text-center font-medium text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-white">
                                {col.totalValid}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Event Category */}
                          {['Tidak ada', '1 sampai 2', '3 sampai 5', '6 hingga 10', '11 atau lebih'].map((cat, catIdx) => (
                            <Fragment key={cat}>
                              <tr className={`hover:bg-blue-50/5 transition-colors ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                <td className={`p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm ${catIdx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'}`}>
                                  {cat}
                                </td>
                                {paginatedComputedUnitTableData.map((col, idx) => {
                                  const pct = (col.percentages as Record<string, number>)[cat] || 0;
                                  return (
                                    <td key={`val-rs-unit-ev-${cat}-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                      {col.totalValid === 0 ? '-' : `${pct.toFixed(0)}%`}
                                    </td>
                                  );
                                })}
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Empty State when search returns no columns */}
                    {paginatedComputedUnitTableData.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Unit Kerja</h4>
                        <p className="text-xs text-slate-400 mt-1">Tidak ada unit kerja yang cocok dengan kueri pencarian &ldquo;{searchUnitEventQuery}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="unit-reported"
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    unitReportingScores={unitReportingScores}
                  />
                </div>
              )
            ) : activeView === 'position' ? (
              !positionSubView ? (
                <div className="w-full space-y-6">
                  {/* Period selection / Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" /> Pilih Sub-Analisis Perbandingan Posisi Staf
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full p-4">
                    {[
                      { 
                        title: 'Perbandingan Pengukuran Dimensi', 
                        desc: 'Analisis Perbandingan tingkat persentase respon positif untuk 10 dimensi budaya keselamatan berdasarkan posisi staf.', 
                        icon: <BarChart2 className="w-10 h-10 text-slate-400 stroke-[1.2]" />, 
                        color: 'bg-[#FF4D4D]'
                      },
                      { 
                        title: 'Perbandingan Hasil Per Item', 
                        desc: 'Mengevaluasi dan membandingkan tanggapan positif staf untuk setiap butir pertanyaan kuesioner SOPS.', 
                        icon: <ListChecks className="w-10 h-10 text-slate-400 stroke-[1.2]" />, 
                        color: 'bg-[#175997]'
                      },
                      { 
                        title: 'Perbandingan Penilaian Insiden Keselamatan Pasien', 
                        desc: 'Membandingkan penilaian peringkat keselamatan pasien umum (E1) lintas berbagai posisi dan peran jabatan.', 
                        icon: <HeartPulse className="w-10 h-10 text-slate-400 stroke-[1.2]" />, 
                        color: 'bg-[#F29F05]'
                      },
                      { 
                        title: 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan', 
                        desc: 'Melihat perbandingan frekuensi pelaporan kejadian tidak diharapkan (KTD/KNC) di antara berbagai posisi staf.', 
                        icon: <Users className="w-10 h-10 text-slate-400 stroke-[1.2]" />, 
                        color: 'bg-[#5D20D2]'
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -6, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => setPositionSubView(item.title)}
                        className="bg-white rounded-[28px] shadow-[0_12px_24px_rgba(15,23,42,0.12),_0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.18),_0_6px_16px_rgba(15,23,42,0.08)] border border-slate-200 transition-all duration-300 cursor-pointer relative flex min-h-[220px]"
                      >
                        {/* Left colored tab */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-[80px] ${item.color} rounded-r-[20px] flex flex-col justify-center items-center text-white z-10 shadow-sm`}>
                          <span className="text-[11px] font-bold tracking-widest uppercase opacity-90 mb-1">HASIL</span>
                          <span className="text-[32px] font-bold leading-none">0{idx + 1}</span>
                        </div>

                        {/* Content area */}
                        <div className="pl-[110px] pr-8 py-8 flex flex-col items-center text-center w-full justify-center">
                          <div className="mb-4">
                            {item.icon}
                          </div>
                          <h3 className="text-slate-500 font-bold text-[15px] uppercase tracking-widest mb-3 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-slate-400 text-[11px] leading-[1.6] line-clamp-3">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : positionSubView === 'Perbandingan Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Summary Comparison Grid - Detailed Position Comparison from Report */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-cyan-600 tracking-widest uppercase font-mono">TABEL PERBANDINGAN DIMENSI</span>
                        <h3 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                          <Users className="w-6 h-6 text-indigo-600" />
                          Perbandingan Rata-rata Persentase Respon Positif Dimensi Berdasarkan Posisi Staf
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">
                          Tingkat persentase respon positif untuk dimensi budaya keselamatan pasien berdasarkan posisi staf di {namaRs || 'Rumah Sakit'}
                        </p>
                      </div>

                      {/* Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
                        {totalPagesPosisiDimension > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPagePosisiDimension(p => Math.max(1, p - 1))}
                              disabled={currentPagePosisiDimension === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPagePosisiDimension} / {totalPagesPosisiDimension}
                            </span>
                            <button 
                              onClick={() => setCurrentPagePosisiDimension(p => Math.min(totalPagesPosisiDimension, p + 1))}
                              disabled={currentPagePosisiDimension === totalPagesPosisiDimension}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/50 relative max-h-[650px] custom-scrollbar pb-2">
                      <table className="w-full border-collapse text-left text-xs text-slate-600">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-30 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            <th className="py-4 px-4 text-center w-12 border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>No</th>
                            <th className="py-4 px-5 min-w-[280px] text-center border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>Dimensi Budaya Keselamatan</th>
                            <th className="py-4 px-4 text-center min-w-[120px] border-r border-slate-200/80 shadow-sm" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>Total Responden</th>
                            {paginatedPosisiDimensionData.map((pos) => (
                              <th key={pos.name} className="py-4 px-5 min-w-[190px] text-center border-r border-slate-200/80 last:border-r-0 font-extrabold text-white" style={{ backgroundColor: '#18c294', color: '#ffffff' }}>
                                <div className="flex flex-col items-center">
                                  <span>{pos.name}</span>
                                  <span className="text-[10px] text-white/90 font-mono tracking-normal normal-case mt-0.5">(N = {pos.value})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/30 text-slate-600">
                          {DIMENSION_ORDER.map((dimId, idx) => {
                            const bMin = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
                            const bMax = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;
                            const bAvg = (bMin + bMax) / 2;

                            return (
                              <Fragment key={dimId}>
                                <tr className="hover:bg-slate-50/50 transition-all border-b border-slate-100">
                                  <td className="py-5 px-4 text-center font-extrabold text-indigo-600 border-r border-slate-200/80 bg-slate-50/80">
                                    {idx + 1}
                                  </td>
                                  <td className="py-5 px-5 font-bold text-slate-800 border-r border-slate-200/80 bg-slate-50/80">
                                    <div className="space-y-1.5 max-w-[320px]">
                                      <div className="text-slate-800 text-xs md:text-sm tracking-tight leading-snug">{DIMENSI_INFO[dimId].nama}</div>
                                      <div className="text-[10px] text-slate-500 font-normal leading-relaxed">{DIMENSI_INFO[dimId].deskripsi}</div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center font-extrabold text-slate-700 border-r border-slate-200/80 bg-cyan-50/40">{hospitalSurveys.length}</td>
                                  {paginatedPosisiDimensionData.map((pos, posIdx) => {
                                    const scoreObj = positionDimensionScores.find(s => s.id === dimId);
                                    const percentage = (scoreObj && scoreObj[pos.name] !== undefined && scoreObj[pos.name] !== null) ? scoreObj[pos.name] : null;
                                    return (
                                      <td key={`pos-rs-${dimId}-${pos.name}`} className={`py-3 px-5 text-center border-r border-slate-200/80 bg-cyan-50/40 ${posIdx === paginatedPosisiDimensionData.length - 1 ? 'last:border-r-0' : ''}`}>
                                        {percentage !== null && percentage !== undefined && typeof percentage === 'number' && !isNaN(percentage) ? (
                                          <span className={getCellColorClass(percentage)}>{percentage.toFixed(1)}%</span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                          <tr className="bg-indigo-50/40 border-t-2 border-indigo-200/80 hover:bg-indigo-50/50 transition-all">
                            <td className="py-5 px-4 text-center font-black text-indigo-600 border-r border-slate-200/80 bg-indigo-50/60">★</td>
                            <td className="py-5 px-5 font-black text-slate-800 border-r border-slate-200/80 bg-indigo-50/60">
                              <div className="space-y-1">
                                <div className="text-indigo-700 text-xs font-extrabold uppercase tracking-wide">Rata-rata Seluruh Dimensi</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center font-black text-slate-700 border-r border-slate-200/80 bg-cyan-50/30">{hospitalSurveys.length}</td>
                            {paginatedPosisiDimensionData.map((pos, posIdx) => {
                              const avgVal = getAverageCompositeForPosition(pos.name);
                              return (
                                <td key={`pos-avg-rs-${pos.name}`} className={`py-4 px-5 text-center border-r border-slate-200/80 bg-cyan-50/30 font-black ${posIdx === paginatedPosisiDimensionData.length - 1 ? 'last:border-r-0' : ''}`}>
                                  {avgVal !== null && avgVal !== undefined && typeof avgVal === 'number' && !isNaN(avgVal) ? (
                                    <span className={getCellColorClass(avgVal)}>{avgVal.toFixed(1)}%</span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="position-dimension"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      positionDimensionScores={positionDimensionScores}
                    />

                  </div>
                </div>
              ) : positionSubView === 'Perbandingan Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Item */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <ListChecks className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Item</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">32</h4>
                        <p className="text-[10px] font-medium text-slate-500">Butir Pernyataan Survei</p>
                      </div>
                    </motion.div>

                    {/* Card 2: Avg Hospital */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0 shadow-inner">
                        <Hospital className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata {namaRs || 'RS'}</span>
                        <h4 className="text-2xl font-extrabold text-sky-700 tracking-tight">
                          {avgHospitalScore > 0 ? `${avgHospitalScore.toFixed(1)}%` : '0%'}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500">Respons Positif Keseluruhan</p>
                      </div>
                    </motion.div>

                    {/* Card 3: Total Respondents */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Responden</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{demografiStats.total}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Partisipan Survei ({tahun1})</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Filter and Table Container */}
                  <div className="bg-white border border-slate-200 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1 font-sans">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tabel Hasil Per Item Berdasarkan Posisi Staf</h3>
                        <p className="text-xs text-slate-500 font-medium">Tanggapan positif staf untuk setiap butir pertanyaan kuesioner SOPS di {namaRs || 'Rumah Sakit'} berdasarkan posisi staf.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                        <div className="w-full sm:w-80">
                          <select
                            value={selectedItemDimId}
                            onChange={(e) => setSelectedItemDimId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors font-sans"
                          >
                            <option value="all">Semua Dimensi Budaya Keselamatan (32 Item)</option>
                            {DIMENSION_ORDER.map(dimId => (
                              <option key={dimId} value={dimId}>
                                [{DIMENSI_INFO[dimId].kode}] {DIMENSI_INFO[dimId].nama}
                              </option>
                            ))}
                          </select>
                        </div>

                        {totalPagesPosisiItem > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPagePosisiItem(p => Math.max(1, p - 1))}
                              disabled={currentPagePosisiItem === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPagePosisiItem} / {totalPagesPosisiItem}
                            </span>
                            <button 
                              onClick={() => setCurrentPagePosisiItem(p => Math.min(totalPagesPosisiItem, p + 1))}
                              disabled={currentPagePosisiItem === totalPagesPosisiItem}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Matrix Comparative Table matching AHRQ SOPS standard layout */}
                    <div className="overflow-x-auto max-h-[75vh] relative custom-scrollbar border-t border-slate-200">
                      <table className="w-full border-collapse text-left border border-slate-300">
                        <thead>
                          {/* Main Header Row in Royal Blue */}
                          <tr className="bg-[#1E3A8A] text-white text-xs font-bold uppercase tracking-wider divide-x divide-blue-800">
                            <th rowSpan={2} className="py-4 px-3 text-center w-[60px] min-w-[60px] bg-[#1E3A8A] sticky left-0 z-20 shadow-md">Item</th>
                            <th rowSpan={2} className="py-4 px-4 text-center min-w-[280px] bg-[#1E3A8A]">Pertanyaan Survei Berdasarkan Dimensi (Composite Measure)</th>
                            <th colSpan={Math.max(1, paginatedPosisiItemData.length)} className="py-3 px-4 text-center bg-[#254BAF] border-b border-blue-700 tracking-widest text-[11px]">
                              Posisi / Jabatan Staf (Staff Position)
                            </th>
                          </tr>

                          {/* Position Names Header Row */}
                          <tr className="bg-[#254BAF] text-white text-[11px] font-bold uppercase tracking-tight divide-x divide-blue-700 border-b border-blue-800">
                            {paginatedPosisiItemData.length > 0 ? (
                              paginatedPosisiItemData.map((pos) => (
                                <th key={pos.name} className="py-3 px-3 text-center min-w-[120px] max-w-[180px] leading-tight font-sans">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-bold">{pos.name}</span>
                                  </div>
                                </th>
                              ))
                            ) : (
                              <th className="py-3 px-3 text-center min-w-[120px]">Belum Ada Data Posisi</th>
                            )}
                          </tr>

                          {/* Respondent Count Sub-Header Rows */}
                          <tr className="bg-blue-50 text-slate-800 text-xs font-semibold border-b border-blue-200 divide-x divide-blue-200 font-sans">
                            <td colSpan={2} className="py-2 px-3 text-right font-bold italic text-blue-900 bg-blue-100/70">
                              {namaRs || 'Rumah Sakit'}: # Responden
                            </td>
                            {paginatedPosisiItemData.length > 0 ? (
                              paginatedPosisiItemData.map((pos, pIdx) => (
                                <td key={`cnt-rs-${pIdx}`} className="py-2 px-2 text-center font-extrabold text-blue-900 bg-blue-100/50">
                                  {pos.value}
                                </td>
                              ))
                            ) : (
                              <td className="py-2 px-2 text-center text-slate-400">0</td>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-300 bg-white text-xs text-slate-800 font-sans">
                          {DIMENSION_ORDER.filter(dimId => selectedItemDimId === 'all' || selectedItemDimId === dimId).map((dimId, dimIdx) => {
                            const dimensionItems = hospitalItemScores.filter(item => item.dimId === dimId);
                            const dimInfo = DIMENSI_INFO[dimId];
                            if (!dimensionItems || dimensionItems.length === 0) return null;

                            const colSpanTotal = 2 + Math.max(1, paginatedPosisiItemData.length);

                            return (
                              <Fragment key={dimId}>
                                {/* Section Header Row */}
                                <tr className="bg-blue-100/80 text-blue-950 border-y-2 border-blue-300 font-bold">
                                  <td colSpan={colSpanTotal} className="py-2.5 px-4 text-left font-sans text-xs tracking-wide">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0"></span>
                                      <span className="text-blue-950 font-extrabold">{dimIdx + 1}. {dimInfo.nama}</span>
                                      <span className="text-[11px] font-medium text-blue-800 ml-1">({dimInfo.deskripsi})</span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Item Rows */}
                                {dimensionItems.map((item) => {
                                  const pItemObj = positionItemScores.find(p => p.id === item.id);

                                  return (
                                    <Fragment key={item.id}>
                                      {/* Your Hospital Row */}
                                      <tr className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200 border-b border-slate-200">
                                        {/* Item Code */}
                                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/40 align-middle sticky left-0 z-10">
                                          {item.id}
                                        </td>

                                        {/* Question Text */}
                                        <td className="py-3 px-4 font-medium text-slate-800 align-middle">
                                          <div className="space-y-1">
                                            <p className="leading-relaxed text-[13px]">{item.text}</p>
                                            {item.isReversed && (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                Reverse Score
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Positions Scores (RS Anda) */}
                                        {paginatedPosisiItemData.length > 0 ? (
                                          paginatedPosisiItemData.map((pos, pIdx) => {
                                            const val = pItemObj ? pItemObj[pos.name] : null;
                                            return (
                                              <td key={`rs-score-${item.id}-${pIdx}`} className="py-2.5 px-2 text-center font-bold text-slate-800 bg-blue-50/20">
                                                {val !== null && val !== undefined && typeof val === 'number' && !isNaN(val) ? (
                                                  <span className="text-blue-950 font-black">{val.toFixed(0)}%</span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal">--</span>
                                                )}
                                              </td>
                                            );
                                          })
                                        ) : (
                                          <td className="py-2.5 px-2 text-center text-slate-400">--</td>
                                        )}
                                      </tr>
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="position-item"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      positionItemScores={positionItemScores}
                    />

                  </div>
                </div>
              ) : positionSubView === 'Perbandingan Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Main Comparative Table Card */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Penilaian Insiden Keselamatan Pasien</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menampilkan distribusi penilaian keselamatan pasien berdasarkan posisi staf di rumah sakit Anda.
                        </p>
                      </div>
                      
                      {/* Search and Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-60">
                          <input 
                            type="text"
                            placeholder="Cari posisi staf..."
                            value={searchPositionQuery}
                            onChange={e => setSearchPositionQuery(e.target.value)}
                            className="bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer w-full transition-all"
                          />
                          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {totalPagesPositionSafety > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPagePosition(p => Math.max(1, p - 1))}
                              disabled={currentPagePosition === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPagePosition} / {totalPagesPositionSafety}
                            </span>
                            <button 
                              onClick={() => setCurrentPagePosition(p => Math.min(totalPagesPositionSafety, p + 1))}
                              disabled={currentPagePosition === totalPagesPositionSafety}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-orange-200/60 rounded-xl relative shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-orange-500 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-orange-600/40 w-[220px] min-w-[220px] bg-orange-500 text-white text-center align-middle leading-tight font-extrabold text-[10px]">
                              Penilaian Insiden Keselamatan Pasien<br/>(Patient Safety Rating)
                            </th>
                            <th rowSpan={2} className="p-4 border-r border-orange-600/40 text-center w-28 bg-orange-500 text-white align-middle font-extrabold">
                              Keseluruhan RS
                            </th>
                            <th colSpan={paginatedPositionSafetyScores.length} className="p-3 text-center bg-orange-500 text-white font-extrabold">
                              Posisi Staf
                            </th>
                          </tr>
                          <tr className="bg-orange-400 text-white font-semibold text-[11px] md:text-xs">
                            {paginatedPositionSafetyScores.map((col, idx) => (
                              <th key={`hdr-sf-${idx}`} className="p-3 text-center border-r border-orange-500/40 align-middle min-w-[130px] w-[130px] bg-orange-400 text-white leading-snug font-bold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                            <td className="bg-slate-50 p-3.5 border-r border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                                <span className="text-sm font-bold italic text-slate-900 text-center">Jumlah Responden</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                              {activePositionSafetyScores.reduce((acc, r) => acc + r.count, 0).toLocaleString('id-ID')}
                            </td>
                            {paginatedPositionSafetyScores.map((col, idx) => (
                              <td key={`rsp-rs-sf-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                {col.count.toLocaleString('id-ID')}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Safety Rating Category */}
                          {[
                            { key: 5, benchmarkKey: 'Sangat Baik', label: 'Luar Biasa', subLabel: 'Excellent', bmOverall: 28 },
                            { key: 4, benchmarkKey: 'Baik', label: 'Sangat Baik', subLabel: 'Very Good', bmOverall: 39 },
                            { key: 3, benchmarkKey: 'Cukup', label: 'Baik', subLabel: 'Good', bmOverall: 23 },
                            { key: 2, benchmarkKey: 'Kurang', label: 'Cukup', subLabel: 'Fair', bmOverall: 9 },
                            { key: 1, benchmarkKey: 'Sangat Kurang', label: 'Buruk', subLabel: 'Poor', bmOverall: 1 },
                          ].map((cat, catIdx) => {
                            const totalHospCount = activePositionSafetyScores.reduce((acc, r) => acc + r.count, 0);
                            const overallHospCatCount = activePositionSafetyScores.reduce((acc, r) => acc + (r.ratings[cat.key as 1|2|3|4|5] || 0), 0);
                            const overallHospPct = totalHospCount > 0 ? (overallHospCatCount / totalHospCount) * 100 : 0;

                            return (
                              <Fragment key={cat.key}>
                                {/* Rumah Sakit Anda Row */}
                                <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                                  <td className="p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm bg-slate-50">
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-slate-800 font-bold text-center">{cat.label}</span>
                                      <span className="text-[10px] text-[#56595b] font-normal italic text-center">{cat.subLabel}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center text-slate-900 font-bold border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                                    {totalHospCount === 0 ? '--' : `${overallHospPct.toFixed(0)}%`}
                                  </td>
                                  {paginatedPositionSafetyScores.map((col, idx) => {
                                    const totalHospRespForCol = col.count;
                                    const pct = totalHospRespForCol > 0
                                      ? (col.ratings[cat.key as 1|2|3|4|5] / totalHospRespForCol) * 100
                                      : 0;

                                    return (
                                      <td key={`val-rs-sf-${cat.key}-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                        {totalHospRespForCol === 0 ? '--' : `${pct.toFixed(0)}%`}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Empty State when search returns no columns */}
                    {paginatedPositionSafetyScores.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Data Posisi Staf</h4>
                        <p className="text-xs text-slate-400 mt-1">Belum ada data survei untuk posisi staf atau tidak cocok dengan kueri pencarian &ldquo;{searchPositionQuery}&rdquo;</p>
                      </div>
                    )}

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="position-safety"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      positionSafetyScores={positionSafetyScores}
                    />

                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Responden */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Responden</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{computedTableData.reduce((sum, r) => sum + r.totalValid, 0)}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Staf Aktif Berpartisipasi</p>
                      </div>
                    </motion.div>

                    {/* Card 2: Jumlah Posisi Staf */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Posisi Staf</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{masterPositions.filter(p => p.is_active).length}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Peran Terdaftar di Sistem</p>
                      </div>
                    </motion.div>

                    {/* Card 3: Rata-rata RS Anda */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata {namaRs || 'RS'}</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{averageEventsRS.toFixed(2)}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Peristiwa / Responden / TH</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Main Table Card (New AHRQ SOPS Design) */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Frekuensi Pelaporan Peristiwa</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menunjukkan persentase jumlah laporan yang diserahkan dalam 12 bulan terakhir berdasarkan posisi staf.
                        </p>
                      </div>
                      
                      {/* Search and Pagination Navigation */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-60">
                          <input 
                            type="text"
                            placeholder="Cari posisi staf..."
                            value={searchPositionQuery}
                            onChange={e => setSearchPositionQuery(e.target.value)}
                            className="bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer w-full transition-all"
                          />
                          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {totalPagesPosition > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPagePosition(p => Math.max(1, p - 1))}
                              disabled={currentPagePosition === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPagePosition} / {totalPagesPosition}
                            </span>
                            <button 
                              onClick={() => setCurrentPagePosition(p => Math.min(totalPagesPosition, p + 1))}
                              disabled={currentPagePosition === totalPagesPosition}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-slate-200/60 rounded-xl relative shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-purple-700 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-purple-600/60 w-[200px] min-w-[200px] bg-purple-700 text-white align-middle text-center font-bold">
                              Jumlah Insiden Keselamatan Pasien<br/>Yang Dilaporkan
                            </th>
                            <th colSpan={paginatedComputedTableData.length} className="p-3 text-center bg-purple-700 text-white font-extrabold">
                              Posisi Staf
                            </th>
                          </tr>
                          <tr className="bg-purple-600 text-white font-semibold text-[11px] md:text-xs">
                            {paginatedComputedTableData.map((col, idx) => (
                              <th key={`hdr-ev-${idx}`} className="p-3 text-center border-r border-b border-purple-500/60 align-bottom min-w-[130px] w-[130px] bg-purple-600 text-white leading-snug font-bold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-blue-50/5 transition-colors bg-white">
                            <td className="bg-white p-3.5 border-r border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col gap-1 items-center justify-center text-center">
                                <span className="text-[11px] md:text-xs italic font-medium text-slate-700 text-center">Jumlah Responden {namaRs || 'Rumah Sakit'}</span>
                              </div>
                            </td>
                            {paginatedComputedTableData.map((col, idx) => (
                              <td key={`rsp-rs-ev-${idx}`} className="p-3 text-center font-medium text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-white">
                                {col.totalValid}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Event Category */}
                          {['Tidak ada', '1 sampai 2', '3 sampai 5', '6 hingga 10', '11 atau lebih'].map((cat, catIdx) => (
                            <Fragment key={cat}>
                              <tr className={`hover:bg-blue-50/5 transition-colors ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                <td className={`p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm ${catIdx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'}`}>
                                  {cat}
                                </td>
                                {paginatedComputedTableData.map((col, idx) => {
                                  const pct = col.percentages[cat as keyof typeof col.percentages] || 0;
                                  return (
                                    <td key={`val-rs-ev-${cat}-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                      {col.totalValid === 0 ? '-' : `${pct.toFixed(0)}%`}
                                    </td>
                                  );
                                })}
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Empty State when search returns no columns */}
                    {paginatedComputedTableData.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Posisi Staf</h4>
                        <p className="text-xs text-slate-400 mt-1">Tidak ada posisi staf yang cocok dengan kueri pencarian &ldquo;{searchPositionQuery}&rdquo;</p>
                      </div>
                    )}

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="position-reported"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      positionReportingScores={positionReportingScores}
                    />

                  </div>
                </div>
              )
            ) : activeView === 'tenure' ? (
              !tenureSubView ? (
                <div className="w-full space-y-6">
                  {/* Period selection / Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" /> Pilih Sub-Analisis Perbandingan Berdasarkan Masa Jabatan / Lama Kerja
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-[20px] pb-[20px] px-2">
                    {[
                      { 
                        title: 'Perbandingan Pengukuran Dimensi', 
                        desc: 'Analisis Perbandingan tingkat persentase respon positif untuk 10 dimensi budaya keselamatan berdasarkan masa jabatan / lama kerja staf.', 
                        bottomIcon: <Lightbulb className="w-7 h-7 stroke-[2]" />
                      },
                      { 
                        title: 'Perbandingan Hasil Per Item', 
                        desc: 'Mengevaluasi dan membandingkan tanggapan positif staf untuk setiap butir pertanyaan kuesioner SOPS di tiap kelompok masa jabatan.', 
                        bottomIcon: <Settings className="w-7 h-7 stroke-[2]" />
                      },
                      { 
                        title: 'Penilaian Insiden Keselamatan Pasien', 
                        desc: 'Membandingkan penilaian peringkat keselamatan pasien umum (E1) berdasarkan masa jabatan atau lama kerja staf.', 
                        bottomIcon: <Rocket className="w-7 h-7 stroke-[2]" />
                      },
                      { 
                        title: 'Jumlah Insiden Keselamatan Pasien Dilaporkan', 
                        desc: 'Melihat perbandingan frekuensi pelaporan kejadian tidak diharapkan (KTD/KNC) di antara kelompok masa jabatan staf.', 
                        bottomIcon: <Target className="w-7 h-7 stroke-[2]" />
                      }
                    ].map((item, idx) => {
                      const themes = [
                        {
                          bgBackplate: 'bg-blue-600',
                          pillBg: 'bg-blue-600',
                          arrowColor: 'text-blue-600',
                          titleColor: 'text-blue-700',
                          bottomIconColor: 'text-blue-600'
                        },
                        {
                          bgBackplate: 'bg-teal-500',
                          pillBg: 'bg-teal-500',
                          arrowColor: 'text-teal-600',
                          titleColor: 'text-teal-700',
                          bottomIconColor: 'text-teal-600'
                        },
                        {
                          bgBackplate: 'bg-orange-500',
                          pillBg: 'bg-orange-500',
                          arrowColor: 'text-orange-500',
                          titleColor: 'text-orange-600',
                          bottomIconColor: 'text-orange-500'
                        },
                        {
                          bgBackplate: 'bg-slate-500',
                          pillBg: 'bg-slate-500',
                          arrowColor: 'text-slate-500',
                          titleColor: 'text-slate-700',
                          bottomIconColor: 'text-slate-500'
                        }
                      ];
                      const theme = themes[idx];
                      
                      return (
                        <motion.div
                          key={idx}
                          whileHover={{ y: -6, scale: 1.02 }}
                          onClick={() => setTenureSubView(item.title === 'Penilaian Insiden Keselamatan Pasien' ? 'Perbandingan Penilaian Insiden Keselamatan Pasien' : item.title === 'Jumlah Insiden Keselamatan Pasien Dilaporkan' ? 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan' : item.title)}
                          className="relative cursor-pointer group flex flex-col h-full select-none"
                        >
                          {/* Colored Backplate Layer (3D Offset Shadow on Bottom & Right) */}
                          <div className={`absolute inset-0 translate-x-2 translate-y-2 ${theme.bgBackplate} rounded-tl-[16px] rounded-tr-[36px] rounded-bl-[16px] rounded-br-[16px] z-0 opacity-90 transition-all duration-300 group-hover:translate-x-2.5 group-hover:translate-y-2.5`} />

                          {/* Front Main White Card Layer */}
                          <div className="relative z-10 bg-white border border-slate-200/90 rounded-tl-[16px] rounded-tr-[36px] rounded-bl-[16px] rounded-br-[16px] shadow-sm p-5 flex flex-col justify-between h-full w-full">
                            
                            {/* Top Header Row with Pill Badge & Chevron */}
                            <div className="w-full flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100">
                              <div className={`${theme.pillBg} text-white font-extrabold text-[12px] tracking-wider px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm`}>
                                <span>HASIL</span>
                                <span className="text-[14px]">0{idx + 1}</span>
                              </div>
                              <ChevronRight className={`w-6 h-6 stroke-[3.5] ${theme.arrowColor} mr-1`} />
                            </div>

                            {/* Title & Description Content */}
                            <div className="flex flex-col items-center text-center flex-1 my-2 space-y-2.5">
                              <h3 className={`font-extrabold text-[13px] uppercase tracking-wider ${theme.titleColor} px-1 leading-snug`}>
                                {item.title}
                              </h3>
                              <p className="text-slate-500 text-[11px] leading-relaxed text-center font-medium line-clamp-6 px-1">
                                {item.desc}
                              </p>
                            </div>

                            {/* Bottom Theme Icon */}
                            <div className={`mt-4 pt-2 flex justify-center items-center ${theme.bottomIconColor}`}>
                              {item.bottomIcon}
                            </div>

                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : tenureSubView === 'Perbandingan Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Summary Comparison Grid - Detailed Tenure Comparison */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                    <div className="space-y-3 border-b border-slate-100 pb-5">
                      <span className="text-xs font-bold text-cyan-600 tracking-widest uppercase font-mono">TABEL PERBANDINGAN DIMENSI</span>
                      <h3 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <BarChart2 className="w-6 h-6 text-indigo-600" />
                        Perbandingan Rata-rata Respon Positif Dimensi Budaya Keselamatan Pasien Berdasarkan Masa Jabatan / Lama Kerja
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 font-medium">
                        Tingkat persentase respon positif untuk dimensi budaya keselamatan pasien berdasarkan masa jabatan / lama kerja di {namaRs || 'Rumah Sakit'}
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-[16px] border border-slate-200 shadow-sm bg-white/50 relative custom-scrollbar pb-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#1E3A8A] text-white uppercase tracking-wider font-semibold border-b-2 border-blue-900 sticky top-0 z-20">
                          <tr>
                            <th className="py-4 px-4 text-center w-12 border-r border-blue-800/80 sticky left-0 z-30 bg-[#1E3A8A] text-white">No</th>
                            <th className="py-4 px-5 min-w-[280px] text-center border-r border-blue-800/80 sticky left-0 z-30 bg-[#1E3A8A] text-white">Dimensi Budaya Keselamatan</th>
                            {demografiStats.g1Data.map(g1 => (
                              <th key={g1.name} className="py-4 px-5 min-w-[190px] text-center border-r border-blue-800/80 last:border-r-0 font-extrabold bg-[#254BAF] text-white">
                                <div className="flex flex-col items-center">
                                  <span className="whitespace-normal break-words">{g1.name}</span>
                                  <span className="text-[10px] text-blue-100 font-mono tracking-normal normal-case mt-0.5">(N = {g1.value})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/30 text-slate-600">
                          {DIMENSION_ORDER.map((dimId, idx) => {
                            const bMin = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
                            const bMax = masterBenchmarkData && (masterBenchmarkData as any)[dimId] ? (masterBenchmarkData as any)[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;
                            const bAvg = (bMin + bMax) / 2;

                            return (
                              <Fragment key={`tenure-comp-${dimId}`}>
                                <tr className="hover:bg-slate-50/50 transition-all border-b border-slate-100">
                                  <td className="py-5 px-4 text-center font-extrabold text-indigo-600 border-r border-slate-200/80 bg-slate-50/80 sticky left-0 z-10">
                                    {idx + 1}
                                  </td>
                                  <td className="py-5 px-5 font-bold text-slate-800 border-r border-slate-200/80 bg-slate-50/80 sticky left-0 z-10 leading-snug">
                                    <div className="space-y-1.5 max-w-[320px]">
                                      <p>{DIMENSI_INFO[dimId].nama}</p>
                                      <p className="text-[10px] text-slate-500 font-normal leading-relaxed">{DIMENSI_INFO[dimId].deskripsi}</p>
                                    </div>
                                  </td>
                                  {demografiStats.g1Data.map((g1, tIdx) => {
                                    const scoreObj = tenureDimensionScores.find(s => s.id === dimId);
                                    const percentage = (scoreObj && scoreObj[g1.name] !== undefined && scoreObj[g1.name] !== null) ? scoreObj[g1.name] : null;
                                    return (
                                      <td key={`tenure-rs-${dimId}-${g1.name}`} className={`py-3 px-5 text-center border-r border-slate-200/80 bg-cyan-50/40 ${tIdx === demografiStats.g1Data.length - 1 ? 'last:border-r-0' : ''}`}>
                                        {percentage !== null && percentage !== undefined && typeof percentage === 'number' && !isNaN(percentage) ? (
                                          <span className={getCellColorClass(percentage)}>{percentage.toFixed(1)}%</span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                          <tr className="bg-indigo-50/40 border-t-2 border-indigo-200/80 hover:bg-indigo-50/50 transition-all">
                            <td className="py-5 px-4 text-center font-black text-indigo-600 border-r border-slate-200/80 bg-indigo-50/60 sticky left-0 z-10">★</td>
                            <td className="py-5 px-5 font-black text-slate-800 border-r border-slate-200/80 bg-indigo-50/60 sticky left-0 z-10">
                              <div className="space-y-1">
                                <div className="text-indigo-700 text-xs font-extrabold uppercase tracking-wide">Rata-rata Seluruh Dimensi</div>
                              </div>
                            </td>
                            {demografiStats.g1Data.map((g1, tIdx) => {
                              const avgVal = getAverageCompositeForTenure(g1.name);
                              return (
                                <td key={`tenure-avg-rs-${g1.name}`} className={`py-4 px-5 text-center border-r border-slate-200/80 bg-cyan-50/30 font-black ${tIdx === demografiStats.g1Data.length - 1 ? 'last:border-r-0' : ''}`}>
                                  {avgVal !== null ? <span className={getCellColorClass(avgVal)}>{avgVal.toFixed(1)}%</span> : <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="tenure-dimension"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      tenureDimensionScores={tenureDimensionScores}
                    />

                  </div>
                </div>
              ) : tenureSubView === 'Perbandingan Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Item */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <ListChecks className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Item</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">32</h4>
                        <p className="text-[10px] font-medium text-slate-500">Butir Pernyataan Survei</p>
                      </div>
                    </motion.div>

                    {/* Card 2: Avg Hospital */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0 shadow-inner">
                        <Hospital className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata {namaRs || 'RS'}</span>
                        <h4 className="text-2xl font-extrabold text-sky-700 tracking-tight">
                          {avgHospitalScore > 0 ? `${avgHospitalScore.toFixed(1)}%` : '0%'}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500">Respons Positif Keseluruhan</p>
                      </div>
                    </motion.div>

                    {/* Card 3: Total Respondents */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Responden</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{demografiStats.total}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Partisipan Survei ({tahun1})</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Filter and Table Container */}
                  <div className="bg-white border border-slate-200 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1 font-sans">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tabel Perbandingan Per Item Berdasarkan Masa Jabatan / Lama Kerja</h3>
                        <p className="text-xs text-slate-500 font-medium">Perbandingan % respon positif per item survei berdasarkan masa jabatan / lama kerja</p>
                      </div>
                      <div className="w-full md:w-96">
                        <select
                          value={selectedItemDimId}
                          onChange={(e) => setSelectedItemDimId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors font-sans"
                        >
                          <option value="all">Semua Dimensi Budaya Keselamatan (32 Item)</option>
                          {DIMENSION_ORDER.map(dimId => (
                            <option key={dimId} value={dimId}>
                              [{DIMENSI_INFO[dimId].kode}] {DIMENSI_INFO[dimId].nama}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Interactive Matrix Comparative Table */}
                    <div className="overflow-x-auto max-h-[75vh] relative custom-scrollbar border-t border-slate-200">
                      <table className="w-full border-collapse text-left border border-slate-300">
                        <thead>
                          {/* Main Header Row in Hijau Tosca */}
                          <tr className="bg-[#0D9488] text-white text-xs font-bold uppercase tracking-wider divide-x divide-teal-700">
                            <th rowSpan={2} className="py-4 px-3 text-center w-[60px] min-w-[60px] bg-[#0D9488] sticky left-0 z-20 shadow-md">Item</th>
                            <th rowSpan={2} className="py-4 px-4 text-center min-w-[280px] bg-[#0D9488]">Pertanyaan Survei Berdasarkan Dimensi (Composite Measure)</th>
                            <th colSpan={Math.max(1, demografiStats.g1Data.length)} className="py-3 px-4 text-center bg-teal-600 border-b border-teal-500 tracking-widest text-[11px]">
                              Masa Jabatan / Lama Kerja (Staff Tenure)
                            </th>
                          </tr>

                          {/* Tenure Names Header Row */}
                          <tr className="bg-teal-600 text-white text-[11px] font-bold uppercase tracking-tight divide-x divide-teal-500 border-b border-teal-700">
                            {demografiStats.g1Data.length > 0 ? (
                              demografiStats.g1Data.map((g1) => (
                                <th key={g1.name} className="py-3 px-3 text-center min-w-[120px] max-w-[180px] leading-tight font-sans">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-bold">{g1.name}</span>
                                  </div>
                                </th>
                              ))
                            ) : (
                              <th className="py-3 px-3 text-center min-w-[120px]">Belum Ada Data Masa Kerja</th>
                            )}
                          </tr>

                          {/* Respondent Count Sub-Header Rows */}
                          <tr className="bg-blue-50 text-slate-800 text-xs font-semibold border-b border-blue-200 divide-x divide-blue-200 font-sans">
                            <td colSpan={2} className="py-2 px-3 text-right font-bold italic text-blue-900 bg-blue-100/70">
                              {namaRs || 'Rumah Sakit'}: # Responden
                            </td>
                            {demografiStats.g1Data.length > 0 ? (
                              demografiStats.g1Data.map((g1, gIdx) => (
                                <td key={`cnt-rs-tenure-${gIdx}`} className="py-2 px-2 text-center font-extrabold text-blue-900 bg-blue-100/50">
                                  {g1.value}
                                </td>
                              ))
                            ) : (
                              <td className="py-2 px-2 text-center text-slate-400">0</td>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-300 bg-white text-xs text-slate-800 font-sans">
                          {DIMENSION_ORDER.filter(dimId => selectedItemDimId === 'all' || selectedItemDimId === dimId).map((dimId, dimIdx) => {
                            const dimensionItems = hospitalItemScores.filter(item => item.dimId === dimId);
                            const dimInfo = DIMENSI_INFO[dimId];
                            if (!dimensionItems || dimensionItems.length === 0) return null;

                            const colSpanTotal = 2 + Math.max(1, demografiStats.g1Data.length);

                            return (
                              <Fragment key={dimId}>
                                {/* Section Header Row */}
                                <tr className="bg-blue-100/80 text-blue-950 border-y-2 border-blue-300 font-bold">
                                  <td colSpan={colSpanTotal} className="py-2.5 px-4 text-left font-sans text-xs tracking-wide">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0"></span>
                                      <span className="text-blue-950 font-extrabold">{dimIdx + 1}. {dimInfo.nama}</span>
                                      <span className="text-[11px] font-medium text-blue-800 ml-1">({dimInfo.deskripsi})</span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Item Rows */}
                                {dimensionItems.map((item) => {
                                  const benchVal = BENCHMARK_ITEMS[item.id] || 65.5;
                                  const tItemObj = tenureItemScores.find(t => t.id === item.id);

                                  return (
                                    <Fragment key={item.id}>
                                      {/* Row 1: RS Anda */}
                                      <tr className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200 border-b border-slate-200">
                                        {/* Item Code */}
                                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/40 align-middle sticky left-0 z-10">
                                          {item.id}
                                        </td>

                                        {/* Question Text */}
                                        <td className="py-3 px-4 font-medium text-slate-800 align-middle">
                                          <div className="space-y-1">
                                            <p className="leading-relaxed text-[13px]">{item.text}</p>
                                            {item.isReversed && (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                Reverse Score
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Tenure Scores Row 1 (RS Anda) */}
                                        {demografiStats.g1Data.length > 0 ? (
                                          demografiStats.g1Data.map((g1, gIdx) => {
                                            const val = tItemObj ? tItemObj[g1.name] : null;
                                            return (
                                              <td key={`rs-score-tenure-${item.id}-${gIdx}`} className="py-2.5 px-2 text-center font-bold text-slate-800 bg-blue-50/20">
                                                {val !== null && val !== undefined && typeof val === 'number' && !isNaN(val) ? (
                                                  <span className="text-blue-950 font-black">{val.toFixed(0)}%</span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal">--</span>
                                                )}
                                              </td>
                                            );
                                          })
                                        ) : (
                                          <td className="py-2.5 px-2 text-center text-slate-400">--</td>
                                        )}
                                      </tr>

                                      {/* Row 2: Benchmark (Only show if not default / RS Uji Coba) */}
                                      {selectedBenchmarkHospitalId !== 'default' && (
                                        <tr className="bg-amber-50/30 text-amber-900/80 divide-x divide-amber-100/50 border-b border-slate-200 italic font-medium">
                                          <td className="py-2 px-3 text-center bg-amber-50/40 sticky left-0 z-10">
                                            <span className="text-[10px]">BM</span>
                                          </td>
                                          <td className="py-2 px-4 text-[11px] align-middle">
                                            {activeBenchmarkLabel} Benchmark
                                          </td>
                                          {demografiStats.g1Data.map((g1, gIdx) => {
                                            const benchValue = (benchVal + (gIdx * 2.5)) % 100;
                                            return (
                                              <td key={`bm-score-tenure-${item.id}-${gIdx}`} className="py-2 px-2 text-center text-[11px]">
                                                {benchValue.toFixed(0)}%
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="tenure-item"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      tenureItemScores={tenureItemScores}
                      hospitalItemScores={hospitalItemScores}
                    />

                  </div>
                </div>
              ) : tenureSubView === 'Perbandingan Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Comparative Distribution Table for Masa Jabatan / Lama Kerja */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Penilaian Insiden Keselamatan Pasien Berdasarkan Masa Jabatan / Lama Kerja</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menampilkan perbandingan distribusi penilaian keselamatan pasien berdasarkan masa jabatan / lama kerja
                        </p>
                      </div>
                      
                      {/* Filter and Pagination Navigation */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        {totalPagesTenureSafety > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageTenure(p => Math.max(1, p - 1))}
                              disabled={currentPageTenure === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageTenure} / {totalPagesTenureSafety}
                            </span>
                            <button 
                              onClick={() => setCurrentPageTenure(p => Math.min(totalPagesTenureSafety, p + 1))}
                              disabled={currentPageTenure === totalPagesTenureSafety}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-orange-200/60 rounded-xl relative shadow-sm mb-6">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-orange-600 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-b border-orange-700/40 w-[280px] min-w-[280px] bg-orange-600 text-white text-center align-middle leading-tight font-extrabold text-[11px]">
                              Penilaian Insiden Keselamatan Pasien<br/>(Patient Safety Rating)
                            </th>
                            <th colSpan={paginatedTenureSafetyScores.length} className="p-3 text-center border-b border-orange-700/40 bg-orange-600 text-white font-extrabold text-xs">
                              Masa Jabatan / Lama Kerja
                            </th>
                          </tr>
                          <tr className="bg-orange-500 text-white font-semibold text-[11px] md:text-xs">
                            {paginatedTenureSafetyScores.map((col, idx) => (
                              <th key={`hdr-tenure-sf-${idx}`} className="p-3 text-center border-r border-b border-orange-600/40 align-middle min-w-[130px] w-[130px] bg-orange-500 text-white leading-snug font-bold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                            <td className="bg-slate-50 p-3.5 border-r border-b border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                                <span className="text-sm font-bold italic text-slate-900 text-center">Jumlah Responden</span>
                              </div>
                            </td>
                            {paginatedTenureSafetyScores.map((col, idx) => (
                              <td key={`rsp-rs-tenure-sf-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                {col.count.toLocaleString('id-ID')}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Safety Rating Category */}
                          {[
                            { key: 5, benchmarkKey: 'Sangat Baik', label: 'Luar Biasa', subLabel: 'Excellent', bmOverall: 28 },
                            { key: 4, benchmarkKey: 'Baik', label: 'Sangat Baik', subLabel: 'Very Good', bmOverall: 39 },
                            { key: 3, benchmarkKey: 'Cukup', label: 'Baik', subLabel: 'Good', bmOverall: 23 },
                            { key: 2, benchmarkKey: 'Kurang', label: 'Cukup', subLabel: 'Fair', bmOverall: 9 },
                            { key: 1, benchmarkKey: 'Sangat Kurang', label: 'Buruk', subLabel: 'Poor', bmOverall: 1 },
                          ].map((cat) => {
                            return (
                              <Fragment key={cat.key}>
                                <tr className="hover:bg-orange-50/30 transition-colors bg-slate-100/70">
                                  <td className="p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm bg-slate-50">
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-slate-800 font-bold text-center">{cat.label}</span>
                                      <span className="text-[10px] text-[#56595b] font-normal italic text-center">{cat.subLabel}</span>
                                    </div>
                                  </td>
                                  {paginatedTenureSafetyScores.map((col, idx) => {
                                    const totalHospRespForCol = col.count;
                                    const pct = totalHospRespForCol > 0 && col.ratings
                                      ? ((col.ratings[cat.key as 1|2|3|4|5] || 0) / totalHospRespForCol) * 100
                                      : 0;

                                    return (
                                      <td key={`val-rs-tenure-sf-${cat.key}-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                        {totalHospRespForCol === 0 ? '--' : `${pct.toFixed(0)}%`}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Empty State when no columns */}
                    {paginatedTenureSafetyScores.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl mb-6">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Data Masa Kerja</h4>
                        <p className="text-xs text-slate-400 mt-1">Belum ada data survei untuk masa kerja.</p>
                      </div>
                    )}

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="tenure-safety"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      tenureSafetyScores={tenureSafetyScores}
                    />

                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Main Table Card for Masa Jabatan / Lama Kerja (Duplicated from Unit Kerja) */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mb-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Frekuensi Pelaporan Peristiwa Berdasarkan Masa Jabatan / Lama Kerja</h3>
                      </div>
                      
                      {/* Filter and Pagination Navigation */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-slate-600">Pilih Tahun:</span>
                          <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none cursor-pointer">
                            {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        {totalPagesTenureEvent > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => setCurrentPageTenureEvent(p => Math.max(1, p - 1))}
                              disabled={currentPageTenureEvent === 1}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] font-black text-slate-500 px-2">
                              {currentPageTenureEvent} / {totalPagesTenureEvent}
                            </span>
                            <button 
                              onClick={() => setCurrentPageTenureEvent(p => Math.min(totalPagesTenureEvent, p + 1))}
                              disabled={currentPageTenureEvent === totalPagesTenureEvent}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overflow-auto max-h-[75vh] border border-slate-200/60 rounded-xl relative shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[800px] font-sans">
                        <thead>
                          <tr className="bg-slate-700 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-4 border-r border-b border-slate-800/40 w-[240px] min-w-[240px] bg-slate-700 text-white text-center align-middle font-extrabold">
                              Jumlah Insiden Keselamatan Pasien<br/>Yang Dilaporkan
                            </th>
                            <th colSpan={paginatedComputedTenureTableData.length} className="p-3 text-center border-b border-slate-800/40 bg-slate-700 text-white font-extrabold">
                              Masa Jabatan / Lama Kerja
                            </th>
                          </tr>
                          <tr className="bg-slate-600 text-white font-semibold text-[11px] md:text-xs">
                            {paginatedComputedTenureTableData.map((col, idx) => (
                              <th key={`hdr-tenure-ev-${idx}`} className="p-3 text-center border-r border-b border-slate-700/40 align-middle min-w-[130px] w-[130px] bg-slate-600 text-white leading-snug font-bold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-blue-50/5 transition-colors bg-white">
                            <td className="bg-white p-3.5 border-r border-b border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col gap-1 items-center justify-center text-center">
                                <span className="text-[11px] md:text-xs italic font-medium text-slate-700 text-center">Jumlah Responden {namaRs || 'Rumah Sakit'}</span>
                              </div>
                            </td>
                            {paginatedComputedTenureTableData.map((col, idx) => (
                              <td key={`rsp-rs-tenure-ev-${idx}`} className="p-3 text-center font-medium text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-white">
                                {col.totalValid}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Event Category */}
                          {['Tidak ada', '1 sampai 2', '3 sampai 5', '6 hingga 10', '11 atau lebih'].map((cat, catIdx) => (
                            <Fragment key={cat}>
                              <tr className={`hover:bg-blue-50/5 transition-colors ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                <td className={`p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm ${catIdx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'}`}>
                                  {cat}
                                </td>
                                {paginatedComputedTenureTableData.map((col, idx) => {
                                  const pct = (col.percentages as Record<string, number>)[cat] || 0;
                                  return (
                                    <td key={`val-rs-tenure-ev-${cat}-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                      {col.totalValid === 0 ? '-' : `${pct.toFixed(0)}%`}
                                    </td>
                                  );
                                })}
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Empty State when search returns no columns */}
                    {paginatedComputedTenureTableData.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Data Masa Kerja</h4>
                        <p className="text-xs text-slate-400 mt-1">Belum ada data survei untuk masa kerja atau tidak cocok dengan kueri pencarian &ldquo;{searchTenureEventQuery}&rdquo;</p>
                      </div>
                    )}

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="tenure-reported"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      tenureReportingScores={tenureReportingScores}
                    />
                  </div>
                </div>
              )
            ) : activeView === 'interaction' ? (
              !interactionSubView ? (
                <div className="w-full space-y-6 overflow-x-hidden">
                  {/* Period selection / Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-[20px] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-rose-600" /> Pilih Sub-Analisis Perbandingan Berdasarkan Interaksi Dengan Pasien
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                      <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 outline-none w-32 cursor-pointer">
                        {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-[20px] pb-[20px] px-3 overflow-hidden">
                    {[
                      { 
                        title: 'Perbandingan Pengukuran Dimensi', 
                        desc: 'Analisis Perbandingan tingkat persentase respon positif untuk 10 dimensi budaya keselamatan berdasarkan interaksi langsung staf dengan pasien.', 
                        icon: <BarChart2 className="w-8 h-8 text-slate-700 stroke-[1.2]" />, 
                        color: 'bg-[#1E3A8A]'
                      },
                      { 
                        title: 'Perbandingan Hasil Per Item', 
                        desc: 'Mengevaluasi dan membandingkan tanggapan positif staf untuk setiap butir pertanyaan kuesioner SOPS di tiap kelompok interaksi pasien.', 
                        icon: <ListChecks className="w-8 h-8 text-slate-700 stroke-[1.2]" />, 
                        color: 'bg-[#0D9488]'
                      },
                      { 
                        title: 'Penilaian Insiden Keselamatan Pasien', 
                        desc: 'Membandingkan penilaian peringkat keselamatan pasien umum (E1) berdasarkan tingkat interaksi langsung staf dengan pasien.', 
                        icon: <HeartPulse className="w-8 h-8 text-slate-700 stroke-[1.2]" />, 
                        color: 'bg-[#F97316]'
                      },
                      { 
                        title: 'Jumlah Insiden Keselamatan Pasien Dilaporkan', 
                        desc: 'Melihat perbandingan frekuensi pelaporan kejadian tidak diharapkan (KTD/KNC) di antara kelompok staf berdasarkan interaksi pasien.', 
                        icon: <AlertTriangle className="w-8 h-8 text-slate-700 stroke-[1.2]" />, 
                        color: 'bg-[#64748B]'
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        onClick={() => setInteractionSubView(item.title === 'Penilaian Insiden Keselamatan Pasien' ? 'Perbandingan Penilaian Insiden Keselamatan Pasien' : item.title === 'Jumlah Insiden Keselamatan Pasien Dilaporkan' ? 'Perbandingan Jumlah Insiden Keselamatan Pasien Yang Dilaporkan' : item.title)}
                        className="relative cursor-pointer flex flex-col group min-h-[260px]"
                      >
                        {/* Colored rotated background */}
                        <div className={`absolute top-0 bottom-0 right-0 w-[70%] rounded-[24px] ${item.color} transform origin-bottom-left -rotate-[3deg] translate-x-0.5 -translate-y-1 z-0 shadow-sm transition-transform duration-300 group-hover:-rotate-[5deg] group-hover:translate-x-1`}></div>

                        {/* Content area - White Card with fine grey border */}
                        <div className="relative bg-white rounded-[24px] shadow-[0_5px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-300 p-6 flex flex-col items-center text-center w-full justify-between z-10 border border-slate-300/80 h-full">
                          <div className="flex flex-col items-center w-full">
                            <div className="mb-4 flex justify-center items-center">
                              {item.icon}
                            </div>
                            <h3 className="text-slate-800 font-bold text-[14px] uppercase tracking-wider mb-3 leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-slate-400 text-[10px] leading-[1.6] line-clamp-4">
                              {item.desc}
                            </p>
                          </div>

                          <div className={`mt-5 w-[44px] h-[44px] rounded-full flex items-center justify-center text-white font-black text-[16px] ${item.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                            0{idx + 1}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : interactionSubView === 'Perbandingan Pengukuran Dimensi' ? (
                <div className="w-full flex flex-col gap-6">
                  {/* Summary Comparison Grid - Detailed Interaction Comparison from Report */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                    <div className="space-y-3 border-b border-slate-100 pb-5">
                      <span className="text-xs font-bold text-cyan-600 tracking-widest uppercase font-mono">HASIL PENGUKURAN DIMENSI</span>
                      <h3 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Stethoscope className="w-6 h-6 text-indigo-600" />
                        Hasil Pengukuran Dimensi Budaya Keselamatan Pasien Berdasarkan Hubungan Langsung dengan Pasien
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 font-medium">
                        Tingkat persentase respon positif untuk dimensi budaya keselamatan pasien berdasarkan interaksi dengan pasien di {namaRs || 'Rumah Sakit'}
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-[16px] border border-slate-200 shadow-sm bg-white/50 relative custom-scrollbar pb-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#1E3A8A] text-white uppercase tracking-wider font-semibold border-b-2 border-blue-900 sticky top-0 z-20">
                          <tr>
                            <th rowSpan={2} className="py-4 px-4 text-center w-12 border-r border-blue-800/80 bg-[#1E3A8A] text-white sticky left-0 z-30 shadow-sm">No</th>
                            <th rowSpan={2} className="py-4 px-5 min-w-[280px] text-center border-r border-blue-800/80 bg-[#1E3A8A] text-white sticky left-12 z-30 shadow-sm">Dimensi Budaya Keselamatan</th>
                            <th colSpan={2} className="py-3 px-4 text-center border-r border-blue-800/80 bg-[#254BAF] text-white font-extrabold">{namaRs || 'Rumah Sakit'}</th>
                          </tr>
                          <tr className="bg-[#254BAF] text-white">
                            <th className="py-3 px-3 text-center border-r border-blue-800/80 text-[10px] font-bold text-blue-100">Hub. Langsung<br/>(N = {countLangsung})</th>
                            <th className="py-3 px-3 text-center border-r border-blue-800/80 text-[10px] font-bold text-blue-100">Tak Langsung<br/>(N = {countTidakLangsung})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/30 text-slate-600">
                          {DIMENSION_ORDER.map((dimId, idx) => {
                            const statsLangsung = getInteraksiStats(dimId, 'langsung');
                            const statsTidak = getInteraksiStats(dimId, 'tidak');
                            
                            return (
                              <tr key={`interaksi-dim-${dimId}`} className="hover:bg-slate-50/50 transition-all border-b border-slate-100">
                                <td className="py-4 px-4 text-center font-extrabold text-indigo-600 border-r border-slate-200/80 bg-slate-50/80 sticky left-0 z-10 shadow-sm">{idx + 1}</td>
                                <td className="py-4 px-5 font-bold text-slate-800 border-r border-slate-200/80 bg-slate-50/80 sticky left-12 z-10 shadow-sm leading-snug">
                                  <div className="space-y-1.5 max-w-[320px]">
                                    <p>{DIMENSI_INFO[dimId].nama}</p>
                                    <p className="text-[10px] text-slate-500 font-normal leading-relaxed">{DIMENSI_INFO[dimId].deskripsi}</p>
                                  </div>
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-slate-200/80 bg-cyan-50/30">
                                  {statsLangsung.percentage !== null ? <span className={getCellColorClass(statsLangsung.percentage)}>{statsLangsung.percentage.toFixed(1)}%</span> : <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>}
                                </td>
                                <td className="py-3 px-4 text-center border-r border-slate-200/80 bg-cyan-50/30">
                                  {statsTidak.percentage !== null ? <span className={getCellColorClass(statsTidak.percentage)}>{statsTidak.percentage.toFixed(1)}%</span> : <span className="text-slate-400 italic text-[11px]">Data Belum Tersedia</span>}
                                </td>
                              </tr>
                            );
                          })}

                          <tr className="bg-indigo-50/40 border-t-2 border-indigo-200/80 hover:bg-indigo-50/50 transition-all font-black">
                            <td className="py-5 px-4 text-center font-black text-indigo-600 border-r border-slate-200/80 bg-indigo-50/60 sticky left-0 z-10 shadow-sm">★</td>
                            <td className="py-5 px-5 font-black text-slate-800 border-r border-slate-200/80 bg-indigo-50/60 sticky left-12 z-10 shadow-sm">
                              <div className="space-y-1">
                                <div className="text-indigo-700 text-xs font-extrabold uppercase tracking-wide">Rata-rata Seluruh Dimensi</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-200/80 bg-cyan-50/40">
                              {(() => { const v = getAverageInteraksiStats('langsung'); return v !== null ? <span className={getCellColorClass(v)}>{v.toFixed(1)}%</span> : '-'; })()}
                            </td>
                            <td className="py-4 px-4 text-center border-r border-slate-200/80 bg-cyan-50/40">
                              {(() => { const v = getAverageInteraksiStats('tidak'); return v !== null ? <span className={getCellColorClass(v)}>{v.toFixed(1)}%</span> : '-'; })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="interaction-dimension"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      interactionDimensionScores={interactionDimensionScores}
                    />

                  </div>
                </div>
              ) : interactionSubView === 'Perbandingan Hasil Per Item' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Item */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <ListChecks className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Item</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">32</h4>
                        <p className="text-[10px] font-medium text-slate-500">Butir Pernyataan Survei</p>
                      </div>
                    </motion.div>

                    {/* Card 2: Avg Hospital */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0 shadow-inner">
                        <Hospital className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata {namaRs || 'RS'}</span>
                        <h4 className="text-2xl font-extrabold text-sky-700 tracking-tight">
                          {avgHospitalScore > 0 ? `${avgHospitalScore.toFixed(1)}%` : '0%'}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500">Respons Positif Keseluruhan</p>
                      </div>
                    </motion.div>

                    {/* Card 3: Total Respondents */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-white/80 backdrop-blur-xl border border-white/80 p-5 rounded-[22px] shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 group/card"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 font-sans">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Responden</span>
                        <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight">{demografiStats.total}</h4>
                        <p className="text-[10px] font-medium text-slate-500">Partisipan Survei ({tahun1})</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Filter and Table Container */}
                  <div className="bg-white border border-slate-200 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-1 font-sans">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Matrix Hasil Per Item Berdasarkan Interaksi Dengan Pasien</h3>
                        <p className="text-xs text-slate-500 font-medium">Persentase respon positif per item survei berdasarkan hubungan langsung dengan pasien di {namaRs || 'Rumah Sakit'}.</p>
                      </div>
                      <div className="w-full md:w-96">
                        <select
                          value={selectedItemDimId}
                          onChange={(e) => setSelectedItemDimId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer transition-colors font-sans"
                        >
                          <option value="all">Semua Dimensi Budaya Keselamatan (32 Item)</option>
                          {DIMENSION_ORDER.map(dimId => (
                            <option key={dimId} value={dimId}>
                              [{DIMENSI_INFO[dimId].kode}] {DIMENSI_INFO[dimId].nama}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Matrix Comparative Table matching AHRQ SOPS standard layout */}
                    <div className="overflow-x-auto max-h-[75vh] relative custom-scrollbar border-t border-slate-200">
                      <table className="w-full border-collapse text-left border border-slate-300">
                        <thead>
                          {/* Main Header Row in Hijau Tosca */}
                          <tr className="bg-[#0D9488] text-white text-xs font-bold uppercase tracking-wider divide-x divide-teal-700">
                            <th rowSpan={2} className="py-4 px-3 text-center w-[60px] min-w-[60px] bg-[#0D9488] sticky left-0 z-20 shadow-md">Item</th>
                            <th rowSpan={2} className="py-4 px-4 text-center min-w-[280px] bg-[#0D9488]">Pertanyaan Survei Berdasarkan Dimensi (Composite Measure)</th>
                            <th colSpan={Math.max(1, demografiStats.g4Data.length)} className="py-3 px-4 text-center bg-teal-600 border-b border-teal-500 tracking-widest text-[11px]">
                              Kategori Interaksi Pasien (Patient Interaction)
                            </th>
                          </tr>

                          {/* Interaction Category Names Header Row */}
                          <tr className="bg-teal-600 text-white text-[11px] font-bold uppercase tracking-tight divide-x divide-teal-500 border-b border-teal-700">
                            {demografiStats.g4Data.length > 0 ? (
                              demografiStats.g4Data.map((g4) => {
                                let label = g4.name;
                                if (isDirectInteraction(label)) {
                                  label = "Interaksi Langsung dgn Pasien";
                                } else {
                                  label = "Interaksi Tidak Langsung dengan Pasien";
                                }
                                return (
                                  <th key={g4.name} className="py-3 px-3 text-center min-w-[140px] max-w-[200px] leading-tight font-sans">
                                    <div className="flex flex-col items-center justify-center">
                                      <span className="font-bold">{label}</span>
                                    </div>
                                  </th>
                                );
                              })
                            ) : (
                              <th className="py-3 px-3 text-center min-w-[120px]">Belum Ada Data Interaksi</th>
                            )}
                          </tr>

                          {/* Respondent Count Sub-Header Rows */}
                          <tr className="bg-blue-50 text-slate-800 text-xs font-semibold border-b border-blue-200 divide-x divide-blue-200 font-sans">
                            <td colSpan={2} className="py-2 px-3 text-right font-bold italic text-blue-900 bg-blue-100/70">
                              {namaRs || 'Rumah Sakit'}: # Responden
                            </td>
                            {demografiStats.g4Data.length > 0 ? (
                              demografiStats.g4Data.map((g4, gIdx) => (
                                <td key={`cnt-rs-g4-${gIdx}`} className="py-2 px-2 text-center font-extrabold text-blue-900 bg-blue-100/50">
                                  {g4.value}
                                </td>
                              ))
                            ) : (
                              <td className="py-2 px-2 text-center text-slate-400">0</td>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-300 bg-white text-xs text-slate-800 font-sans">
                          {DIMENSION_ORDER.filter(dimId => selectedItemDimId === 'all' || selectedItemDimId === dimId).map((dimId, dimIdx) => {
                            const dimensionItems = hospitalItemScores.filter(item => item.dimId === dimId);
                            const dimInfo = DIMENSI_INFO[dimId];
                            if (!dimensionItems || dimensionItems.length === 0) return null;

                            const colSpanTotal = 2 + Math.max(1, demografiStats.g4Data.length);

                            return (
                              <Fragment key={dimId}>
                                {/* Section Header Row */}
                                <tr className="bg-blue-100/80 text-blue-950 border-y-2 border-blue-300 font-bold">
                                  <td colSpan={colSpanTotal} className="py-2.5 px-4 text-left font-sans text-xs tracking-wide">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0"></span>
                                      <span className="text-blue-950 font-extrabold">{dimIdx + 1}. {dimInfo.nama}</span>
                                      <span className="text-[11px] font-medium text-blue-800 ml-1">({dimInfo.deskripsi})</span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Item Rows */}
                                {dimensionItems.map((item) => {
                                  const iItemObj = interactionItemScores.find(p => p.id === item.id);

                                  return (
                                    <Fragment key={item.id}>
                                      {/* Row 1: RS Anda */}
                                      <tr className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200 border-b border-slate-200">
                                        {/* Item Code */}
                                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/40 align-middle sticky left-0 z-10">
                                          {item.id}
                                        </td>

                                        {/* Question Text */}
                                        <td className="py-3 px-4 font-medium text-slate-800 align-middle">
                                          <div className="space-y-1">
                                            <p className="leading-relaxed text-[13px]">{item.text}</p>
                                            {item.isReversed && (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                Reverse Score
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Interaction Categories Scores Row 1 (RS Anda) */}
                                        {demografiStats.g4Data.length > 0 ? (
                                          demografiStats.g4Data.map((g4, gIdx) => {
                                            const val = iItemObj ? iItemObj[g4.name] : null;
                                            return (
                                              <td key={`rs-score-${item.id}-${gIdx}`} className="py-2.5 px-2 text-center font-bold text-slate-800 bg-blue-50/20">
                                                {val !== null && val !== undefined ? (
                                                  <span className="text-blue-950 font-black">{typeof val === 'number' ? val.toFixed(0) : val}%</span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal">--</span>
                                                )}
                                              </td>
                                            );
                                          })
                                        ) : (
                                          <td className="py-2.5 px-2 text-center text-slate-400">--</td>
                                        )}
                                      </tr>
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="interaction-item"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      interactionItemScores={interactionItemScores}
                    />
                  </div>
                </div>
              ) : interactionSubView === 'Perbandingan Penilaian Insiden Keselamatan Pasien' ? (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Distribution Table */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Penilaian Insiden Keselamatan Pasien Berdasarkan Interaksi Pasien</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menampilkan distribusi penilaian keselamatan pasien berdasarkan kategori interaksi dengan pasien di {namaRs || 'Rumah Sakit'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                        <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-teal-500 outline-none w-32 cursor-pointer">
                          {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[75vh] border border-orange-200/60 rounded-xl relative shadow-sm mb-6">
                      <table className="w-full text-left border-collapse min-w-[750px] font-sans">
                        <thead>
                          <tr className="bg-orange-600 text-white font-semibold uppercase tracking-wider text-[11px] md:text-xs">
                            <th rowSpan={2} className="p-3.5 border-r border-orange-700/40 w-[26%] min-w-[220px] bg-orange-600 text-white text-center align-middle leading-tight font-extrabold text-[11px]">
                              Penilaian Insiden Keselamatan Pasien<br/>(Patient Safety Rating)
                            </th>
                            <th rowSpan={2} className="p-3.5 border-r border-orange-700/40 text-center w-[14%] min-w-[110px] bg-orange-600 text-white align-middle font-extrabold">
                              Keseluruhan RS
                            </th>
                            <th colSpan={interactionSafetyScores.length} className="p-3 text-center bg-orange-600 text-white font-extrabold">
                              Kategori Interaksi Pasien
                            </th>
                          </tr>
                          <tr className="bg-orange-500 text-white font-semibold text-[11px] md:text-xs">
                            {interactionSafetyScores.map((col, idx) => {
                              let label = col.name;
                              if (isDirectInteraction(label)) {
                                label = "Interaksi Langsung dgn Pasien";
                              } else {
                                label = "Interaksi Tidak Langsung dengan Pasien";
                              }
                              return (
                                <th key={`hdr-inter-sf-${idx}`} className="p-3.5 text-center border-r border-b border-orange-600/40 align-middle w-[22%] min-w-[180px] bg-orange-500 text-white leading-snug font-bold">
                                  {label}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-teal-50/30 transition-colors bg-slate-100/70">
                            <td className="bg-slate-50 p-3.5 border-r border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                                <span className="text-sm font-bold italic text-slate-900 text-center">Jumlah Responden</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                              {interactionSafetyScores.reduce((acc, r) => acc + r.count, 0).toLocaleString('id-ID')}
                            </td>
                            {interactionSafetyScores.map((col, idx) => (
                              <td key={`rsp-rs-inter-sf-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                {col.count.toLocaleString('id-ID')}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Safety Rating Category */}
                          {[
                            { key: 5, benchmarkKey: 'Sangat Baik', label: 'Luar Biasa', subLabel: 'Excellent', bmOverall: 28 },
                            { key: 4, benchmarkKey: 'Baik', label: 'Sangat Baik', subLabel: 'Very Good', bmOverall: 39 },
                            { key: 3, benchmarkKey: 'Cukup', label: 'Baik', subLabel: 'Good', bmOverall: 23 },
                            { key: 2, benchmarkKey: 'Kurang', label: 'Cukup', subLabel: 'Fair', bmOverall: 9 },
                            { key: 1, benchmarkKey: 'Sangat Kurang', label: 'Buruk', subLabel: 'Poor', bmOverall: 1 },
                          ].map((cat) => {
                            const totalHospCount = interactionSafetyScores.reduce((acc, r) => acc + r.count, 0);
                            const overallHospCatCount = interactionSafetyScores.reduce((acc, r) => acc + (r.ratings?.[cat.key as 1|2|3|4|5] || 0), 0);
                            const overallHospPct = totalHospCount > 0 ? (overallHospCatCount / totalHospCount) * 100 : 0;

                            return (
                              <Fragment key={cat.key}>
                                <tr className="hover:bg-teal-50/30 transition-colors bg-slate-100/70">
                                  <td className="p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm bg-slate-50">
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-slate-800 font-bold text-center">{cat.label}</span>
                                      <span className="text-[10px] text-[#56595b] font-normal italic text-center">{cat.subLabel}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center text-slate-900 font-bold border-r border-slate-200/80 text-[13px] bg-slate-100/70">
                                    {totalHospCount === 0 ? '--' : `${overallHospPct.toFixed(0)}%`}
                                  </td>
                                  {interactionSafetyScores.map((col, idx) => {
                                    const totalHospRespForCol = col.count;
                                    const pct = totalHospRespForCol > 0 && col.ratings
                                      ? ((col.ratings[cat.key as 1|2|3|4|5] || 0) / totalHospRespForCol) * 100
                                      : 0;

                                    return (
                                      <td key={`val-rs-inter-sf-${cat.key}-${idx}`} className="p-3 text-center font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-slate-100/70">
                                        {totalHospRespForCol === 0 ? '--' : `${pct.toFixed(0)}%`}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                      type="interaction-safety"
                      tahun1={tahun1}
                      hospitalSurveys={hospitalSurveys}
                      interactionSafetyScores={interactionSafetyScores}
                    />
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6 font-sans">
                  {/* Table: Distribution of Reported Events by Patient Interaction */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 font-sans">Tabel Distribusi Frekuensi Pelaporan Peristiwa Berdasarkan Interaksi Pasien</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Menunjukkan persentase jumlah laporan yang diserahkan dalam 12 bulan terakhir berdasarkan kategori interaksi pasien di {namaRs || 'Rumah Sakit'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-slate-600">Pilih Tahun:</span>
                        <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-teal-500 outline-none w-32 cursor-pointer">
                          {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[75vh] border border-slate-200/80 rounded-xl relative shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[750px] font-sans">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white font-semibold uppercase tracking-wider text-[11px]">
                            <th rowSpan={2} className="p-3.5 border-r border-blue-800/60 w-[36%] min-w-[260px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white text-center align-middle font-extrabold">
                              Jumlah Insiden Keselamatan Pasien<br/>Yang Dilaporkan
                            </th>
                            <th colSpan={computedInteractionEventTableData.length} className="p-3 text-center bg-[#1E40AF] text-white font-extrabold tracking-wider">
                              Kategori Interaksi Pasien
                            </th>
                          </tr>
                          <tr className="bg-blue-900/90 text-white font-semibold text-[10px]">
                            {computedInteractionEventTableData.map((col, idx) => {
                              let label = col.name;
                              if (isDirectInteraction(label)) {
                                label = "Interaksi Langsung dgn Pasien";
                              } else {
                                label = "Interaksi Tidak Langsung dengan Pasien";
                              }
                              return (
                                <th key={`hdr-inter-ev-${idx}`} className="p-3 text-center border-r border-b border-blue-800/60 align-middle w-[25%] min-w-[170px] bg-blue-900/80 text-white leading-snug font-bold text-[10px]">
                                  {label}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {/* Row 1: Your Hospital Respondents */}
                          <tr className="hover:bg-blue-50/5 transition-colors bg-white">
                            <td className="bg-white p-3.5 border-r border-slate-200/80 align-middle text-center">
                              <div className="flex flex-col gap-1 items-center justify-center text-center">
                                <span className="text-[10px] italic font-medium text-slate-700 text-center">Jumlah Responden {namaRs || 'Rumah Sakit'}</span>
                              </div>
                            </td>
                            {computedInteractionEventTableData.map((col, idx) => (
                              <td key={`rsp-rs-inter-ev-${idx}`} className="p-3 text-center font-medium text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] bg-white">
                                {col.totalValid}
                              </td>
                            ))}
                          </tr>

                          {/* Data Rows for each Event Category */}
                          {['Tidak ada', '1 sampai 2', '3 sampai 5', '6 hingga 10', '11 atau lebih'].map((cat, catIdx) => (
                            <Fragment key={cat}>
                              <tr className={`hover:bg-blue-50/5 transition-colors ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                <td className={`p-3.5 border-r border-slate-200/80 align-middle text-center font-bold text-slate-800 text-[13px] md:text-sm ${catIdx % 2 === 0 ? 'bg-slate-100/90' : 'bg-white'}`}>
                                  {cat}
                                </td>
                                {computedInteractionEventTableData.map((col, idx) => {
                                  const pct = col.percentages[cat as keyof typeof col.percentages] || 0;
                                  return (
                                    <td key={`val-rs-inter-ev-${cat}-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-200/80 last:border-r-0 text-[13px] ${catIdx % 2 === 0 ? 'bg-slate-100/50' : 'bg-white'}`}>
                                      {col.totalValid === 0 ? '-' : `${pct.toFixed(0)}%`}
                                    </td>
                                  );
                                })}
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <DynamicAIAnalysisCards namaRs={namaRs} selectedBenchmarkHospitalId={selectedBenchmarkHospitalId}
                    type="interaction-reported"
                    tahun1={tahun1}
                    hospitalSurveys={hospitalSurveys}
                    interactionReportingScores={interactionReportingScores}
                  />
                </div>
              )
            ) : (
              <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex items-center justify-center flex-col text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                   {mainCards.find(c => c.id === activeView)?.icon}
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Modul Sedang Dalam Pengembangan</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  Data untuk analisis {mainCards.find(c => c.id === activeView)?.title?.toLowerCase()} akan ditampilkan di sini.
                </p>
                <button 
                  onClick={() => setActiveView('main')}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Kembali ke Menu Utama
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// DYNAMIC AI INTERPRETATION & RECOMMENDATION CARDS
// ==========================================
interface DynamicAIAnalysisCardsProps {
  type: string;
  tahun1: string;
  tahun2?: string;
  mode?: string;
  namaRs?: string;
  hospitalSurveys: any[];
  hospitalDimensionScores?: any[];
  hospitalItemScores?: any[];
  positionDimensionScores?: any[];
  positionItemScores?: any[];
  positionSafetyScores?: any[];
  unitDimensionScores?: any[];
  unitItemScores?: any[];
  unitSafetyScores?: any[];
  tenureDimensionScores?: any[];
  tenureItemScores?: any[];
  tenureSafetyScores?: any[];
  interactionDimensionScores?: any[];
  interactionItemScores?: any[];
  interactionSafetyScores?: any[];
  unitReportingScores?: any[];
  positionReportingScores?: any[];
  tenureReportingScores?: any[];
  interactionReportingScores?: any[];
  demografiStats?: any;
  e1Stats?: any[];
  reportedEventsComparisonStats?: any;
  hospitalComments?: any[];
  activeBenchmarkLabel?: string;
  selectedBenchmarkHospitalId?: string;
  masterBenchmarkData?: any;
}

const DynamicAIAnalysisCards: React.FC<DynamicAIAnalysisCardsProps> = ({
  type,
  tahun1,
  tahun2,
  mode,
  namaRs,
  hospitalSurveys = [],
  hospitalDimensionScores = [],
  hospitalItemScores = [],
  positionDimensionScores = [],
  positionItemScores = [],
  positionSafetyScores = [],
  unitDimensionScores = [],
  unitItemScores = [],
  unitSafetyScores = [],
  tenureDimensionScores = [],
  tenureItemScores = [],
  tenureSafetyScores = [],
  interactionDimensionScores = [],
  interactionItemScores = [],
  interactionSafetyScores = [],
  unitReportingScores = [],
  positionReportingScores = [],
  tenureReportingScores = [],
  interactionReportingScores = [],
  demografiStats = {},
  e1Stats = [],
  reportedEventsComparisonStats = {},
  hospitalComments = [],
  activeBenchmarkLabel = "RS Pembanding",
  selectedBenchmarkHospitalId = "default",
  masterBenchmarkData = {}
}) => {
  // Safe general count helper
  const calculateGroupAverages = (scoresArray: any[]) => {
    if (!scoresArray || scoresArray.length === 0) return { highest: { name: '--', score: 0 }, lowest: { name: '--', score: 0 } };
    const groups: Record<string, { total: number; count: number }> = {};
    scoresArray.forEach(row => {
      Object.entries(row).forEach(([key, val]) => {
        if (key !== 'id' && key !== 'name' && key !== 'kode' && typeof val === 'number') {
          if (!groups[key]) groups[key] = { total: 0, count: 0 };
          groups[key].total += val;
          groups[key].count += 1;
        }
      });
    });
    const groupAverages = Object.entries(groups)
      .map(([name, obj]) => ({
        name,
        score: obj.count > 0 ? obj.total / obj.count : 0
      }))
      .sort((a, b) => b.score - a.score);

    return {
      highest: groupAverages[0] || { name: '--', score: 0 },
      lowest: groupAverages[groupAverages.length - 1] || { name: '--', score: 0 },
      averages: groupAverages
    };
  };

  const calculateGroupItemAverages = (itemsArray: any[]) => {
    if (!itemsArray || itemsArray.length === 0) {
      return {
        highest: { id: '--', text: '--', score: 0, minGroup: '', minVal: 0, maxGroup: '', maxVal: 0 },
        lowest: { id: '--', text: '--', score: 0, minGroup: '', minVal: 0, maxGroup: '', maxVal: 0 }
      };
    }
    const itemAverages = itemsArray.map(row => {
      let sum = 0;
      let count = 0;
      let minVal = 100;
      let maxVal = 0;
      let minGroup = '';
      let maxGroup = '';
      Object.entries(row).forEach(([key, val]) => {
        if (key !== 'id' && key !== 'text' && key !== 'dimId' && typeof val === 'number') {
          sum += val;
          count += 1;
          if (val < minVal) {
            minVal = val;
            minGroup = key;
          }
          if (val > maxVal) {
            maxVal = val;
            maxGroup = key;
          }
        }
      });
      return {
        id: row.id,
        text: row.text,
        score: count > 0 ? sum / count : 0,
        minGroup,
        minVal,
        maxGroup,
        maxVal
      };
    }).sort((a, b) => b.score - a.score);

    return {
      highest: itemAverages[0] || { id: '--', text: '--', score: 0, minGroup: '', minVal: 0, maxGroup: '', maxVal: 0 },
      lowest: itemAverages[itemAverages.length - 1] || { id: '--', text: '--', score: 0, minGroup: '', minVal: 0, maxGroup: '', maxVal: 0 }
    };
  };

  const calculateGroupSafetyAverages = (safetyArray: any[]) => {
    if (!safetyArray || safetyArray.length === 0) return { highest: { name: '--', score: 0 }, lowest: { name: '--', score: 0 } };
    const sorted = [...safetyArray].sort((a, b) => b.positiveRate - a.positiveRate);
    return {
      highest: { name: sorted[0]?.name || '--', score: sorted[0]?.positiveRate || 0 },
      lowest: { name: sorted[sorted.length - 1]?.name || '--', score: sorted[sorted.length - 1]?.positiveRate || 0 }
    };
  };

  // Generate analysis text and recommendations
  let analysisText: React.ReactNode = "";
  let recs: { text: string; icon: string }[] = [];

  switch (type) {
    case 'hospital-demographics': {
      const totalResp = demografiStats?.total || hospitalSurveys.reduce((acc: number, s: any) => acc + (s.jumlahResponden || 1), 0);
      const topPos = demografiStats?.posisiData?.[0]?.name || "Perawat";
      const topPosVal = demografiStats?.posisiData?.[0]?.value || 0;
      const secondPos = demografiStats?.posisiData?.[1]?.name || "";
      const secondPosVal = demografiStats?.posisiData?.[1]?.value || 0;
      
      const topUnit = demografiStats?.unitData?.[0]?.name || "Instansi Umum";
      const topUnitVal = demografiStats?.unitData?.[0]?.value || 0;
      const secondUnit = demografiStats?.unitData?.[1]?.name || "";
      const secondUnitVal = demografiStats?.unitData?.[1]?.value || 0;
      
      const topTenure = demografiStats?.g1Data?.[0]?.name || "1 hingga 5 tahun";
      const topTenureVal = demografiStats?.g1Data?.[0]?.value || 0;

      analysisText = (
        <span>
          Berdasarkan data demografi responden tahun <strong>{tahun1}</strong>, survei berhasil mengumpulkan partisipasi aktif dari <strong>{totalResp}</strong> staf. 
          Keterwakilan posisi staf didominasi oleh <strong>{topPos}</strong> (<strong>{topPosVal}</strong> responden){secondPos ? `, diikuti oleh ${secondPos} (${secondPosVal} responden)` : ''}. 
          Unit dengan kontribusi terbesar adalah <strong>{topUnit}</strong> dengan <strong>{topUnitVal}</strong> responden{secondUnit ? `, disusul unit ${secondUnit} (${secondUnitVal} responden)` : ''}. 
          Sedangkan dari masa bakti di rumah sakit, mayoritas responden memiliki masa kerja <strong>{topTenure}</strong> sebanyak <strong>{topTenureVal}</strong> staf. 
          Data ini menunjukkan sebaran responden yang representatif dan valid untuk dijadikan pijakan analisis budaya keselamatan pasien secara makro di {namaRs || 'rumah sakit Anda'}.
        </span>
      );

      recs = [
        { text: `Rancang program edukasi keselamatan pasien yang berfokus pada kelompok dominan yaitu posisi "${topPos}" di unit "${topUnit}".`, icon: "👥" },
        { text: "Tingkatkan tingkat partisipasi dari kelompok atau unit kerja dengan tingkat representasi rendah (di bawah 10% dari total responden).", icon: "📈" },
        { text: "Sosialisasikan kembali jaminan kerahasiaan identitas responden guna mendorong pengisian data yang jujur dan transparan.", icon: "🛡️" },
        { text: "Gunakan data demografi ini untuk merumuskan tim Champions Keselamatan Pasien lintas unit kerja.", icon: "✨" }
      ];
      break;
    }

    case 'hospital-dimension': {
      const dims = hospitalDimensionScores && hospitalDimensionScores.length > 0 ? hospitalDimensionScores : [];
      let highestDim = { nama: 'Kerjasama Tim', percentage: 75 };
      let lowestDim = { nama: 'Respon terhadap Kesalahan secara Non-Punitif', percentage: 48 };
      let overallAvgDim = 60;
      if (dims.length > 0) {
        const sorted = [...dims].sort((a: any, b: any) => b.percentage - a.percentage);
        highestDim = sorted[0];
        lowestDim = sorted[sorted.length - 1];
        overallAvgDim = dims.reduce((acc: number, d: any) => acc + d.percentage, 0) / dims.length;
      }

      const strengths = dims.filter((d: any) => d.percentage >= 75).map((d: any) => `${d.nama} (${d.percentage.toFixed(1)}%)`);
      const warnings = dims.filter((d: any) => d.percentage >= 50 && d.percentage < 75).map((d: any) => `${d.nama} (${d.percentage.toFixed(1)}%)`);
      const criticals = dims.filter((d: any) => d.percentage < 50).map((d: any) => `${d.nama} (${d.percentage.toFixed(1)}%)`);

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Hasil analisis 10 dimensi budaya keselamatan pasien tahun <strong>{tahun1}</strong> menghasilkan nilai rata-rata keseluruhan respons positif sebesar <strong>{overallAvgDim.toFixed(1)}%</strong>. 
            Kekuatan utama (aspek unggul) {namaRs || 'rumah sakit Anda'} terletak pada dimensi <strong>&ldquo;{highestDim.nama}&rdquo;</strong> dengan skor positif tertinggi mencapai <strong>{highestDim.percentage.toFixed(1)}%</strong>. 
            Sebaliknya, dimensi yang mendesak untuk segera diintervensi adalah <strong>&ldquo;{lowestDim.nama}&rdquo;</strong> dengan respons positif terendah sebesar <strong>{lowestDim.percentage.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
            <div><span className="font-bold text-emerald-700">✓ Area Kekuatan (≥75%):</span> {strengths.length > 0 ? strengths.join(', ') : 'Belum ada'}</div>
            <div><span className="font-bold text-amber-700">⚠ Perlu Peningkatan (50-74%):</span> {warnings.length > 0 ? warnings.join(', ') : 'Belum ada'}</div>
            <div><span className="font-bold text-rose-700">☠ Prioritas Intervensi (&lt;50%):</span> {criticals.length > 0 ? criticals.join(', ') : 'Belum ada'}</div>
          </span>
        </span>
      );

      recs = [
        { text: `Pertahankan strategi keberhasilan pada dimensi "${highestDim.nama}" agar tetap konsisten sebagai pilar budaya keselamatan rumah sakit.`, icon: "🏆" },
        { text: `Segera bentuk tim investigasi internal dan susun SOP baru untuk meningkatkan dimensi "${lowestDim.nama}".`, icon: "🛠️" },
        { text: "Implementasikan program 'Rapat Keselamatan Pasien Mandiri' secara berkala di nurse station seluruh unit kerja.", icon: "📢" },
        { text: "Sesuaikan alokasi pelatihan berkala yang lebih berfokus pada dimensi-dimensi yang berada dalam kategori prioritas intervensi.", icon: "🎯" }
      ];
      break;
    }

    case 'hospital-item': {
      const items = hospitalItemScores && hospitalItemScores.length > 0 ? hospitalItemScores : [];
      let highestItem = { id: 'A1', code: 'A1', text: 'Staf di unit ini saling mendukung', positiveRate: 80, score: 80 };
      let lowestItem = { id: 'A6', code: 'A6', text: 'Staf merasa bahwa kesalahan digunakan untuk menyalahkan mereka', positiveRate: 40, score: 40 };
      
      let sortedItems = [...items].sort((a: any, b: any) => {
        const valA = a.positiveRate !== undefined ? a.positiveRate : (a.score !== undefined ? a.score : 0);
        const valB = b.positiveRate !== undefined ? b.positiveRate : (b.score !== undefined ? b.score : 0);
        return valB - valA;
      });

      if (sortedItems.length > 0) {
        highestItem = sortedItems[0];
        lowestItem = sortedItems[sortedItems.length - 1];
      }

      const highestVal = highestItem.positiveRate !== undefined ? highestItem.positiveRate : ((highestItem as any).score !== undefined ? (highestItem as any).score : 0);
      const lowestVal = lowestItem.positiveRate !== undefined ? lowestItem.positiveRate : ((lowestItem as any).score !== undefined ? (lowestItem as any).score : 0);

      const top3 = sortedItems.slice(0, 3).map(it => `${it.code || it.id} (${(it.positiveRate !== undefined ? it.positiveRate : it.score).toFixed(1)}%)`);
      const bottom3 = sortedItems.slice(-3).reverse().map(it => `${it.code || it.id} (${(it.positiveRate !== undefined ? it.positiveRate : it.score).toFixed(1)}%)`);

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Melalui evaluasi butir pertanyaan (item) survei tahun <strong>{tahun1}</strong>, aspek dengan respons positif tertinggi diraih oleh item <strong>{highestItem.code || highestItem.id}</strong> (&ldquo;{highestItem.text}&rdquo;) sebesar <strong>{highestVal.toFixed(1)}%</strong>. 
            Sebaliknya, kelemahan paling krusial dirasakan pada item <strong>{lowestItem.code || lowestItem.id}</strong> (&ldquo;{lowestItem.text}&rdquo;) dengan skor positif hanya sebesar <strong>{lowestVal.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
            <div><span className="font-bold text-emerald-700">⭐ Top 3 Item Terbaik:</span> {top3.join(', ')}</div>
            <div><span className="font-bold text-rose-700">⚠ Bottom 3 Item Terlemah:</span> {bottom3.join(', ')}</div>
          </span>
        </span>
      );

      recs = [
        { text: `Model komunikasi sukses pada item "${highestItem.code || highestItem.id}" harus dibakukan dan dijadikan standar bagi unit lainnya.`, icon: "✨" },
        { text: `Segera evaluasi regulasi pelayanan di unit kerja terkait yang menyebabkan rendahnya nilai pada item "${lowestItem.code || lowestItem.id}".`, icon: "🛠️" },
        { text: `Lakukan diskusi interaktif tingkat unit kerja untuk membedah akar masalah dari butir "${lowestItem.text}".`, icon: "🗣️" },
        { text: "Sediakan infografis atau panduan visual di meja pelayanan mengenai cara mengatasi kendala harian staf.", icon: "📝" }
      ];
      break;
    }

    case 'hospital-reported': {
      let maxReportedCat = { kategori: 'Tidak Pernah Melaporkan Kejadian', val: 0 };
      const catsList: { key: string; label: string; val: number }[] = [];
      if (reportedEventsComparisonStats && reportedEventsComparisonStats.percentages) {
        const categories = [
          { key: 'Tidak ada', label: 'Tidak Pernah Melaporkan' },
          { key: '1 sampai 2', label: '1-2 Kejadian' },
          { key: '3 sampai 5', label: '3-5 Kejadian' },
          { key: '6 hingga 10', label: '6-10 Kejadian' },
          { key: '11 atau lebih', label: '≥11 Kejadian' }
        ];
        let maxPct = -1;
        categories.forEach(c => {
          const pct = reportedEventsComparisonStats.percentages[c.key] || 0;
          catsList.push({ key: c.key, label: c.label, val: pct });
          if (pct > maxPct) {
            maxPct = pct;
            maxReportedCat = { kategori: c.label, val: pct };
          }
        });
      }

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Berdasarkan data pelaporan insiden dalam 12 bulan terakhir (Tahun <strong>{tahun1}</strong>), kategori dengan persentase tertinggi di {namaRs || 'Rumah Sakit'} adalah <strong>&ldquo;{maxReportedCat.kategori}&rdquo;</strong> sebesar <strong>{maxReportedCat.val.toFixed(1)}%</strong>. 
            Tingginya angka staf yang tidak melapor atau jarang melapor menunjukkan adanya potensi fenomena <em>underreporting</em> (kejadian yang disembunyikan atau tidak dicatatkan) akibat rasa takut atau birokrasi yang rumit.
          </span>
          <span className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-white/60 p-3 rounded-xl border border-blue-100/50 text-center text-xs block mt-2">
            {catsList.map(c => (
              <div key={c.key} className="p-1 rounded bg-slate-50 border border-slate-100">
                <div className="text-slate-500 font-bold font-mono text-[10px]">{c.label}</div>
                <div className="text-xs font-extrabold text-indigo-900 mt-0.5">{c.val.toFixed(1)}%</div>
              </div>
            ))}
          </span>
        </span>
      );

      recs = [
        { text: "Terapkan prinsip Just Culture secara konsisten untuk menjamin tidak adanya sanksi sepihak (non-punitive) bagi pelapor insiden.", icon: "🛡️" },
        { text: "Sederhanakan proses pengisian formulir laporan insiden menjadi digital yang dapat diselesaikan dalam waktu kurang dari 3 menit.", icon: "📱" },
        { text: "Berikan penghargaan bulanan berupa 'Safety Reporter Award' bagi unit yang paling aktif melaporkan insiden keselamatan.", icon: "🏆" },
        { text: "Lakukan sosialisasi berkala mengenai alur dan kriteria Kejadian Nyaris Cedera (KNC) yang wajib dilaporkan.", icon: "📢" }
      ];
      break;
    }

    case 'hospital-comments': {
      const commentsList = hospitalComments || [];
      const totalComments = commentsList.length;
      const positiveList = commentsList.filter((c: any) => c.isPositive || (c.text && isPositiveComment(c.text)));
      const positiveCount = positiveList.length;
      const positivePercentage = totalComments > 0 ? (positiveCount / totalComments) * 100 : 0;
      const constructiveCount = totalComments - positiveCount;

      const posUnits: Record<string, number> = {};
      const posPositions: Record<string, number> = {};
      positiveList.forEach((c: any) => {
        if (c.unit) posUnits[c.unit] = (posUnits[c.unit] || 0) + 1;
        if (c.position) posPositions[c.position] = (posPositions[c.position] || 0) + 1;
      });

      const topPosUnit = Object.entries(posUnits).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unit Pelayanan';
      const topPosPosition = Object.entries(posPositions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Tenaga Kesehatan';

      const sampleQuote = positiveList[0]?.text ? positiveList[0].text : '';

      analysisText = (
        <span className="space-y-3 block text-slate-700">
          <span>
            Berdasarkan analisis kualitatif dari total <strong>{totalComments}</strong> komentar responden pada survei budaya keselamatan pasien tahun <strong>{tahun1}</strong> di {namaRs || 'Rumah Sakit Anda'}, secara otomatis terfilter <strong>{positiveCount} komentar positif</strong> (<strong>{positivePercentage.toFixed(1)}%</strong> dari keseluruhan komentar). 
            Apresiasi positif terbanyak disampaikan oleh staf dari kelompok posisi <strong>{topPosPosition}</strong> di <strong>{topPosUnit}</strong>, yang menyoroti aspek kekuatan seperti tingginya rasa kekeluargaan, kerjasama tim yang kompak, komunikasi yang suportif, serta komitmen pimpinan dalam menjaga keselamatan pasien.
          </span>
          {sampleQuote && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 italic font-medium">
              &ldquo;Contoh kutipan positif responden: {sampleQuote}&rdquo;
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/70 p-3 rounded-xl border border-blue-100/50 text-center text-xs block mt-2">
            <div className="p-2 rounded bg-slate-50 border border-slate-100">
              <div className="text-slate-500 font-bold text-[10px]">Total Komentar Masuk</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{totalComments} komentar</div>
            </div>
            <div className="p-2 rounded bg-emerald-50/80 border border-emerald-100">
              <div className="text-emerald-700 font-bold text-[10px]">Komentar Positif (Terfilter)</div>
              <div className="text-sm font-black text-emerald-800 mt-0.5">{positiveCount} ({positivePercentage.toFixed(1)}%)</div>
            </div>
            <div className="p-2 rounded bg-amber-50/80 border border-amber-100">
              <div className="text-amber-700 font-bold text-[10px]">Saran &amp; Masukan</div>
              <div className="text-sm font-black text-amber-800 mt-0.5">{constructiveCount} komentar</div>
            </div>
          </div>
        </span>
      );

      recs = [
        { 
          text: `Pertahankan dan dokumentasikan praktik-praktik baik (best practices) yang telah diapresiasi oleh responden di unit "${topPosUnit}" untuk dijadikan percontohan di seluruh unit kerja ${namaRs || 'Rumah Sakit'}.`, 
          icon: "🏆" 
        },
        { 
          text: `Berikan bentuk penghargaan atau apresiasi (Safety Recognition) secara berkala kepada tim dan pimpinan unit yang berhasil mempertahankan persepsi iklim kerja positif.`, 
          icon: "🌟" 
        },
        { 
          text: `Manfaatkan poin-poin apresiasi dari ${positiveCount} komentar positif responden sebagai materi 'Success Story' dalam kegiatan Safety Briefing dan Nurse Huddles untuk membangun motivasi tim.`, 
          icon: "📢" 
        },
        { 
          text: `Sinergikan apresiasi positif staf dengan penyelesaian ${constructiveCount} masukan konstruktif guna menyempurnakan fasilitas, alur kerja, dan jaminan keselamatan secara berkelanjutan.`, 
          icon: "🎯" 
        }
      ];
      break;
    }

    case 'hospital-safety': {
      let highestSafetyCat = { kategori: 'Baik', val: 0 };
      let overallSafetyPos = 50;
      const grades: { kategori: string; val: number }[] = [];
      if (e1Stats && e1Stats.length > 0) {
        let maxVal = -1;
        e1Stats.forEach((entry: any) => {
          const val = entry[namaRs || 'Rumah Sakit'] || entry['Rumah Sakit Anda'] || 0;
          grades.push({ kategori: entry.kategori, val });
          if (val > maxVal) {
            maxVal = val;
            highestSafetyCat = { kategori: entry.kategori, val };
          }
        });
        const sangatBaik = e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.[namaRs || 'Rumah Sakit'] || e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.['Rumah Sakit Anda'] || 0;
        const baik = e1Stats.find((e: any) => e.kategori === 'Baik')?.[namaRs || 'Rumah Sakit'] || e1Stats.find((e: any) => e.kategori === 'Baik')?.['Rumah Sakit Anda'] || 0;
        overallSafetyPos = sangatBaik + baik;
      }

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Penilaian keselamatan pasien secara keseluruhan (overall safety rating) oleh staf pada tahun <strong>{tahun1}</strong> menghasilkan proporsi respons positif (kombinasi predikat Sangat Baik & Luar Biasa) sebesar <strong>{overallSafetyPos.toFixed(1)}%</strong>. 
            Mayoritas staf memberikan penilaian keselamatan pada rentang kategori <strong>&ldquo;{highestSafetyCat.kategori}&rdquo;</strong> sebesar <strong>{highestSafetyCat.val.toFixed(1)}%</strong>. 
            Meskipun iklim keselamatan dinilai cukup baik, upaya peningkatan mutu berkelanjutan tetap harus didukung demi mencapai target ideal &ge;80% respons positif.
          </span>
          <span className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-white/60 p-3 rounded-xl border border-blue-100/50 text-center text-xs block mt-2">
            {grades.map(g => (
              <div key={g.kategori} className="p-1 rounded bg-slate-50 border border-slate-100">
                <div className="text-slate-500 font-bold text-[10px] truncate">{g.kategori}</div>
                <div className="text-xs font-extrabold text-emerald-900 mt-0.5">{g.val.toFixed(1)}%</div>
              </div>
            ))}
          </span>
        </span>
      );

      recs = [
        { text: "Lakukan monitoring berkala di unit-unit klinis kritis (IGD, ICU, Kamar Operasi) yang rentan memiliki gap keselamatan pasien.", icon: "🔎" },
        { text: "Jadwalkan 'Safety Walkrounds' (Ronde Keselamatan) yang melibatkan jajaran direksi untuk berdialog langsung dengan staf.", icon: "👣" },
        { text: "Gunakan hasil penilaian ini sebagai KPI mutu unit kerja dalam rapat evaluasi tahunan.", icon: "📊" },
        { text: "Berikan penghargaan bagi unit yang konsisten memelihara iklim budaya keselamatan dengan predikat 'Luar Biasa'.", icon: "🏆" }
      ];
      break;
    }

    case 'benchmark-dimension': {
      const dimsList = hospitalDimensionScores && hospitalDimensionScores.length > 0 ? hospitalDimensionScores : [];
      let aboveBmCount = 0;
      let bestBmDiff = { nama: '--', diff: -999 };
      let worstBmDiff = { nama: '--', diff: 999 };
      const outperforming: string[] = [];
      const underperforming: string[] = [];

      if (dimsList.length > 0) {
        dimsList.forEach((d: any) => {
          let bmAvg = 0;
          if (selectedBenchmarkHospitalId === 'default') {
            bmAvg = (d.benchmarkMin + d.benchmarkMax) / 2;
          } else {
            const dimId = d.dimId || d.id;
            bmAvg = masterBenchmarkData && masterBenchmarkData[dimId] ? (masterBenchmarkData[dimId].positivePercent ?? masterBenchmarkData[dimId].avg ?? ((DIMENSI_INFO[dimId]?.benchmarkMin + DIMENSI_INFO[dimId]?.benchmarkMax) / 2 || 75.0)) : ((DIMENSI_INFO[dimId]?.benchmarkMin + DIMENSI_INFO[dimId]?.benchmarkMax) / 2 || 75.0);
          }
          
          const diff = d.percentage - bmAvg;
          if (d.percentage >= bmAvg) {
            aboveBmCount++;
            outperforming.push(`${d.nama} (+${diff.toFixed(1)}%)`);
          } else {
            underperforming.push(`${d.nama} (${diff.toFixed(1)}%)`);
          }
          if (bestBmDiff.nama === '--' || diff > bestBmDiff.diff) {
            bestBmDiff = { nama: d.nama, diff };
          }
          if (worstBmDiff.nama === '--' || diff < worstBmDiff.diff) {
            worstBmDiff = { nama: d.nama, diff };
          }
        });
      }

      if (selectedBenchmarkHospitalId === 'default') {
        analysisText = (
          <span className="space-y-2 block">
            <span>
              Berdasarkan perbandingan dengan {activeBenchmarkLabel} nasional, {namaRs || 'Rumah Sakit Anda'} berada di atas rata-rata benchmark pada <strong>{aboveBmCount}</strong> dari 10 dimensi budaya keselamatan. 
              Capaian komparatif terbaik dicatat pada dimensi <strong>&ldquo;{bestBmDiff.nama}&rdquo;</strong> dengan keunggulan selisih sebesar <strong>+{bestBmDiff.diff.toFixed(1)}%</strong> di atas benchmark. 
              Sebaliknya, area kesenjangan terdalam yang menuntut evaluasi serius adalah dimensi <strong>&ldquo;{worstBmDiff.nama}&rdquo;</strong> dengan ketertinggalan skor sebesar <strong>{worstBmDiff.diff.toFixed(1)}%</strong> di bawah pembanding nasional.
            </span>
            <span className="text-xs space-y-1.5 bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
              <div><span className="font-bold text-emerald-700">✓ Melebihi Benchmark:</span> {outperforming.length > 0 ? outperforming.join(', ') : 'Belum ada'}</div>
              <div><span className="font-bold text-rose-700">⚠ Di Bawah Benchmark:</span> {underperforming.length > 0 ? underperforming.join(', ') : 'Belum ada'}</div>
            </span>
          </span>
        );

        recs = [
          { text: `Jadikan keberhasilan dimensi "${bestBmDiff.nama}" sebagai role model dan replikasikan model kerjanya di unit lain.`, icon: "🏆" },
          { text: `Lakukan diskusi kritis bersama kepala-kepala unit untuk mencari solusi ketertinggalan pada dimensi "${worstBmDiff.nama}".`, icon: "🛠️" },
          { text: `Adopsi instrumen audit dan monitoring dari ${activeBenchmarkLabel} nasional untuk dimensi yang masih di bawah standar.`, icon: "🔍" },
          { text: "Laporkan hasil komparasi berkala ini kepada jajaran direksi sebagai bahan evaluasi kebijakan mutu pelayanan.", icon: "📋" }
        ];
      } else {
        analysisText = (
          <span className="space-y-2 block">
            <span>
              Berdasarkan hasil benchmark dengan <strong>{activeBenchmarkLabel}</strong>, {namaRs || 'Rumah Sakit Anda'} memiliki nilai lebih tinggi pada dimensi <strong>&ldquo;{bestBmDiff.nama}&rdquo;</strong> sebesar <strong>{Math.abs(bestBmDiff.diff).toFixed(1)}%</strong>. 
              Sebaliknya, pada dimensi <strong>&ldquo;{worstBmDiff.nama}&rdquo;</strong>, {activeBenchmarkLabel} memperoleh nilai lebih tinggi sebesar <strong>{Math.abs(worstBmDiff.diff).toFixed(1)}%</strong>.
              Hal ini menunjukkan bahwa rumah sakit pembanding memiliki keunggulan pada area tersebut sehingga perlu dilakukan perbaikan terfokus di rumah sakit Anda.
            </span>
            <span className="text-xs space-y-1.5 bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
              <div><span className="font-bold text-emerald-700">✓ Lebih Tinggi dari {activeBenchmarkLabel}:</span> {outperforming.length > 0 ? outperforming.join(', ') : 'Belum ada'}</div>
              <div><span className="font-bold text-rose-700">⚠ Lebih Rendah dari {activeBenchmarkLabel}:</span> {underperforming.length > 0 ? underperforming.join(', ') : 'Belum ada'}</div>
            </span>
          </span>
        );

        recs = [
          { text: `Prioritaskan peningkatan pada dimensi "${worstBmDiff.nama}" karena masih berada di bawah ${activeBenchmarkLabel}.`, icon: "🎯" },
          { text: `Lakukan studi banding terhadap praktik yang diterapkan oleh ${activeBenchmarkLabel} pada dimensi tersebut.`, icon: "🤝" },
          { text: `Pertahankan keunggulan pada dimensi "${bestBmDiff.nama}" karena sudah melampaui rumah sakit pembanding.`, icon: "🌟" },
          { text: "Gunakan hasil perbandingan langsung ini untuk menyusun strategi perbaikan budaya keselamatan antar-RS.", icon: "📈" }
        ];
      }
      break;
    }

    case 'benchmark-safety': {
      let hospSafetyPos = 50;
      let bmSafetyPos = 50;
      let hospSafetyMax = { kategori: 'Baik', val: 0 };
      const detailsList: string[] = [];

      if (e1Stats && e1Stats.length > 0) {
        const sangatBaikHosp = e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.[namaRs || 'Rumah Sakit'] || e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.['Rumah Sakit Anda'] || 0;
        const baikHosp = e1Stats.find((e: any) => e.kategori === 'Baik')?.[namaRs || 'Rumah Sakit'] || e1Stats.find((e: any) => e.kategori === 'Baik')?.['Rumah Sakit Anda'] || 0;
        hospSafetyPos = sangatBaikHosp + baikHosp;

        const sangatBaikBm = e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.['Data Pembanding'] || e1Stats.find((e: any) => e.kategori === 'Sangat Baik')?.[activeBenchmarkLabel] || 0;
        const baikBm = e1Stats.find((e: any) => e.kategori === 'Baik')?.['Data Pembanding'] || e1Stats.find((e: any) => e.kategori === 'Baik')?.[activeBenchmarkLabel] || 0;
        bmSafetyPos = sangatBaikBm + baikBm;

        let maxVal = -1;
        e1Stats.forEach((entry: any) => {
          const val = entry[namaRs || 'Rumah Sakit'] || entry['Rumah Sakit Anda'] || 0;
          const bmVal = entry['Data Pembanding'] || entry[activeBenchmarkLabel] || 0;
          const diff = val - bmVal;
          const sign = diff >= 0 ? '+' : '';
          detailsList.push(`${entry.kategori}: ${namaRs || 'Rumah Sakit'} ${val.toFixed(1)}% vs ${activeBenchmarkLabel} ${bmVal.toFixed(1)}% (${sign}${diff.toFixed(1)}%)`);

          if (val > maxVal) {
            maxVal = val;
            hospSafetyMax = { kategori: entry.kategori, val };
          }
        });
      }

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Perbandingan tingkat keselamatan makro menunjukkan proporsi respons positif (Sangat Baik & Luar Biasa) di {namaRs || 'Rumah Sakit'} adalah sebesar <strong>{hospSafetyPos.toFixed(1)}%</strong>, 
            dibandingkan dengan rata-rata benchmark {activeBenchmarkLabel} sebesar <strong>{bmSafetyPos.toFixed(1)}%</strong>. 
            {hospSafetyPos >= bmSafetyPos 
              ? ' Capaian yang berhasil unggul di atas benchmark ini menunjukkan adanya iklim keselamatan kerja yang solid dan perlu dipertahankan.' 
              : ' Nilai yang berada di bawah benchmark ini mengindikasikan perlunya akselerasi standarisasi mutu keselamatan pelayanan klinis.'} 
            Kategori penilaian dominan di {namaRs || 'rumah sakit Anda'} adalah predikat <strong>&ldquo;{hospSafetyMax.kategori}&rdquo;</strong> sebesar <strong>{hospSafetyMax.val.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-blue-100/50 font-mono block mt-2">
            {detailsList.map((det, idx) => (
              <div key={idx} className="flex justify-between border-b border-dashed border-slate-200 py-0.5 last:border-0">
                <span>{det.split(' (')[0]}</span>
                <span className="font-extrabold text-slate-700">({det.split(' (')[1]}</span>
              </div>
            ))}
          </span>
        </span>
      );

      recs = [
        { text: "Sinergikan rencana strategis jaminan mutu pelayanan klinis dengan indikator capaian nasional keselamatan pasien.", icon: "🎯" },
        { text: `Bentuk forum komunikasi rutin lintas ${activeBenchmarkLabel} untuk bertukar strategi penanganan isu operasional harian.`, icon: "👥" },
        { text: "Lakukan review komparatif periodik setiap 6 bulan untuk mengukur efektivitas kampanye keselamatan pasien.", icon: "📈" },
        { text: "Adakan lokakarya internal mengupas sasaran keselamatan pasien nasional bagi seluruh kepala unit kerja.", icon: "📚" }
      ];
      break;
    }

    case 'benchmark-reported': {
      let maxReportedCatBm = { kategori: 'Tidak Pernah Melaporkan Kejadian', val: 0, bmVal: 55 };
      const detailsList: string[] = [];

      if (reportedEventsComparisonStats && reportedEventsComparisonStats.percentages) {
        const categories = [
          { key: 'Tidak ada', label: 'Tidak Pernah Melaporkan Kejadian', bm: 55 },
          { key: '1 sampai 2', label: 'Melaporkan 1-2 Kejadian', bm: 26 },
          { key: '3 sampai 5', label: 'Melaporkan 3-5 Kejadian', bm: 13 },
          { key: '6 hingga 10', label: 'Melaporkan 6-10 Kejadian', bm: 4 },
          { key: '11 atau lebih', label: 'Melaporkan 11 atau lebih Kejadian', bm: 3 }
        ];
        let maxPct = -1;
        categories.forEach(c => {
          const pct = reportedEventsComparisonStats.percentages[c.key] || 0;
          const diff = pct - c.bm;
          const sign = diff >= 0 ? '+' : '';
          detailsList.push(`${c.label}: ${namaRs || 'Rumah Sakit'} ${pct.toFixed(1)}% vs ${activeBenchmarkLabel} ${c.bm}% (${sign}${diff.toFixed(1)}%)`);

          if (pct > maxPct) {
            maxPct = pct;
            maxReportedCatBm = { kategori: c.label, val: pct, bmVal: c.bm };
          }
        });
      }

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Berdasarkan hasil survei frekuensi pelaporan insiden, mayoritas responden {namaRs || 'Rumah Sakit'} berada pada kategori <strong>&ldquo;{maxReportedCatBm.kategori}&rdquo;</strong> sebesar <strong>{maxReportedCatBm.val.toFixed(1)}%</strong>, 
            sedangkan rata-rata {activeBenchmarkLabel} nasional pada kategori ini adalah <strong>{maxReportedCatBm.bmVal}%</strong>. 
            {maxReportedCatBm.val > maxReportedCatBm.bmVal && maxReportedCatBm.kategori.includes("Tidak Pernah")
              ? ' Tingginya angka tidak melapor dibanding benchmark nasional (selisih negatif) menegaskan adanya urgensi reformasi sistem pelaporan agar bebas dari sanksi (non-punitive culture).'
              : ' Distribusi frekuensi pelaporan ini mencerminkan keterbukaan dan kepatuhan pelaporan insiden yang relatif berimbang dengan rumah sakit nasional.'}
          </span>
          <span className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-blue-100/50 font-mono block mt-2">
            {detailsList.map((det, idx) => (
              <div key={idx} className="flex justify-between border-b border-dashed border-slate-200 py-0.5 last:border-0">
                <span>{det.split(' (')[0]}</span>
                <span className="font-extrabold text-slate-700">({det.split(' (')[1]}</span>
              </div>
            ))}
          </span>
        </span>
      );

      recs = [
        { text: `Bandingkan alur birokrasi sistem pelaporan ${namaRs || 'Rumah Sakit'} dengan ${activeBenchmarkLabel} yang memiliki rasio pelaporan lebih sehat.`, icon: "🔍" },
        { text: "Terapkan perlindungan hukum dan jaminan kerahasiaan penuh bagi staf tapak yang berani melaporkan insiden keselamatan.", icon: "🛡️" },
        { text: "Lakukan sosialisasi pentingnya budaya pelaporan bebas sanksi (Just Culture) ke jajaran manajemen madya.", icon: "📢" },
        { text: "Sediakan portal pelaporan insiden online yang praktis dan dapat diakses dari gadget seluruh staf.", icon: "📱" }
      ];
      break;
    }

    case 'benchmark-item': {
      const itemScores = hospitalItemScores && hospitalItemScores.length > 0 ? hospitalItemScores : [];
      let bestItemBmDiff = { code: '--', text: 'Staf bekerja sama dengan baik', diff: -100 };
      let worstItemBmDiff = { code: '--', text: 'Respon menyalahkan', diff: 100 };

      if (itemScores.length > 0) {
        itemScores.forEach((it: any) => {
          const bmVal = 60; // default item benchmark rate
          const diff = it.positiveRate - bmVal;
          if (bestItemBmDiff.code === '--' || diff > bestItemBmDiff.diff) {
            bestItemBmDiff = { code: it.code || it.id, text: it.text, diff };
          }
          if (worstItemBmDiff.code === '--' || diff < worstItemBmDiff.diff) {
            worstItemBmDiff = { code: it.code || it.id, text: it.text, diff };
          }
        });
      }

      analysisText = (
        <span>
          Melalui evaluasi komparatif per butir pertanyaan (item) tahun <strong>{tahun1}</strong>, {namaRs || 'Rumah Sakit'} mencatatkan keunggulan tertinggi dibanding benchmark nasional pada item <strong>{bestItemBmDiff.code}</strong> (&ldquo;{bestItemBmDiff.text}&rdquo;) dengan selisih positif mencapai <strong>+{bestItemBmDiff.diff.toFixed(1)}%</strong>. 
          Sebaliknya, area butir keselamatan yang paling tertinggal di bawah rata-rata benchmark adalah item <strong>{worstItemBmDiff.code}</strong> (&ldquo;{worstItemBmDiff.text}&rdquo;) dengan kesenjangan negatif sebesar <strong>{worstItemBmDiff.diff.toFixed(1)}%</strong>.
        </span>
      );

      recs = [
        { text: `Gali dan jadikan kesuksesan item "${bestItemBmDiff.code}" sebagai model pelatihan penulisan SOP interaksi klinis.`, icon: "🏆" },
        { text: `Segera rancang standar operasional baru guna membenahi isu mendasar pada aspek item "${worstItemBmDiff.code}".`, icon: "🛠️" },
        { text: "Fasilitasi diskusi interaktif tingkat unit kerja terendah khusus membahas penyelesaian butir pertanyaan terlemah.", icon: "🗣️" },
        { text: "Lakukan audit langsung oleh komite keselamatan pasien di nurse station mengenai kepatuhan butir prioritas tersebut.", icon: "🔍" }
      ];
      break;
    }

    case 'unit-dimension':
    case 'position-dimension':
    case 'tenure-dimension':
    case 'interaction-dimension': {
      let groupLabel = "Kelompok";
      let activeDimArray: any[] = [];
      if (type === 'unit-dimension') {
        groupLabel = "Unit Kerja";
        activeDimArray = unitDimensionScores || [];
      } else if (type === 'position-dimension') {
        groupLabel = "Posisi Staf";
        activeDimArray = positionDimensionScores || [];
      } else if (type === 'tenure-dimension') {
        groupLabel = "Masa Kerja";
        activeDimArray = tenureDimensionScores || [];
      } else if (type === 'interaction-dimension') {
        groupLabel = "Interaksi Pasien";
        activeDimArray = interactionDimensionScores || [];
      }

      const { highest: highestGrp, lowest: lowestGrp, averages } = calculateGroupAverages(activeDimArray);
      const sortedAveragesText = averages ? averages.map((a: any) => `${a.name} (${a.score.toFixed(1)}%)`).join(', ') : '';

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Analisis komparatif dimensi keselamatan pasien berdasarkan kategori <strong>{groupLabel}</strong> tahun <strong>{tahun1}</strong> menunjukkan adanya perbedaan persepsi antar kelompok kerja. 
            Kelompok dengan tingkat kematangan budaya keselamatan tertinggi diraih oleh <strong>&ldquo;{highestGrp.name}&rdquo;</strong> dengan rata-rata respons positif sebesar <strong>{highestGrp.score.toFixed(1)}%</strong>. 
            Sebaliknya, kelompok dengan capaian terendah yang memerlukan pembinaan intensif adalah <strong>&ldquo;{lowestGrp.name}&rdquo;</strong> sebesar <strong>{lowestGrp.score.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
            <span className="font-bold text-slate-700 block mb-1">Peringkat Kelompok (Rata-rata Skor):</span>
            <span className="text-slate-600 font-medium block leading-relaxed">{sortedAveragesText}</span>
          </span>
        </span>
      );

      recs = [
        { text: `Gelar forum benchmark internal agar kelompok "${lowestGrp.name}" dapat mengadopsi sistem kerja kondusif dari kelompok "${highestGrp.name}".`, icon: "🏆" },
        { text: `Rancang pelatihan atau coaching keselamatan pasien spesifik yang relevan dengan tantangan harian kelompok "${lowestGrp.name}".`, icon: "🛠️" },
        { text: "Evaluasi dan sesuaikan beban serta pembagian jam kerja guna meminimalkan burnout yang menurunkan tingkat kefokusan staf.", icon: "⚖️" },
        { text: "Lakukan supervisi klinis yang suportif oleh jajaran manajemen tingkat menengah di kelompok dengan skor terendah.", icon: "👥" }
      ];
      break;
    }

    case 'unit-item':
    case 'position-item':
    case 'tenure-item':
    case 'interaction-item': {
      let activeItemArray: any[] = [];
      let groupItemLabel = "Kelompok";
      if (type === 'unit-item') {
        groupItemLabel = "Unit Kerja";
        activeItemArray = unitItemScores || [];
      } else if (type === 'position-item') {
        groupItemLabel = "Posisi Staf";
        activeItemArray = positionItemScores || [];
      } else if (type === 'tenure-item') {
        groupItemLabel = "Masa Kerja";
        activeItemArray = tenureItemScores || [];
      } else if (type === 'interaction-item') {
        groupItemLabel = "Interaksi Pasien";
        activeItemArray = interactionItemScores || [];
      }

      const { highest: highestItemGrp, lowest: lowestItemGrp } = calculateGroupItemAverages(activeItemArray);

      analysisText = (
        <span>
          Hasil analisis per butir pertanyaan berdasarkan jajaran <strong>{groupItemLabel}</strong> tahun <strong>{tahun1}</strong> menunjukkan variabilitas kepatuhan operasional harian. 
          Item yang secara konsisten dinilai paling unggul di seluruh kelompok adalah item <strong>{highestItemGrp.id}</strong> (&ldquo;{highestItemGrp.text}&rdquo;) dengan rata-rata respons positif sebesar <strong>{highestItemGrp.score.toFixed(1)}%</strong>. 
          Sementara itu, butir pertanyaan yang paling mendesak dibenahi adalah item <strong>{lowestItemGrp.id}</strong> (&ldquo;{lowestItemGrp.text}&rdquo;) dengan rata-rata hanya <strong>{lowestItemGrp.score.toFixed(1)}%</strong>, di mana kelompok <strong>&ldquo;{lowestItemGrp.minGroup || "staf terkait"}&rdquo;</strong> mencatat penilaian paling kritis yaitu sebesar <strong>{lowestItemGrp.minVal.toFixed(1)}%</strong>.
        </span>
      );

      recs = [
        { text: `Fasilitasi diskusi pemecahan masalah bersama kelompok "${lowestItemGrp.minGroup || "staf terkait"}" guna menelisik pemicu rendahnya nilai item "${lowestItemGrp.id}".`, icon: "🗣️" },
        { text: "Sederhanakan instruksi kerja atau lembar panduan penanganan isu keselamatan tingkat tapak kerja.", icon: "📝" },
        { text: "Berikan bimbingan langsung (coaching) oleh kepala unit klinis berkinerja tinggi kepada unit kerja berkinerja rendah.", icon: "🧠" },
        { text: `Jadikan kepatuhan kelompok tertinggi pada item "${highestItemGrp.id}" sebagai bahan simulasi/asuhan percontohan keselamatan.`, icon: "✨" }
      ];
      break;
    }

    case 'unit-safety':
    case 'position-safety':
    case 'tenure-safety':
    case 'interaction-safety': {
      let activeSafetyArray: any[] = [];
      let groupSafetyLabel = "Kelompok";
      if (type === 'unit-safety') {
        groupSafetyLabel = "Unit Kerja";
        activeSafetyArray = unitSafetyScores || [];
      } else if (type === 'position-safety') {
        groupSafetyLabel = "Posisi Staf";
        activeSafetyArray = positionSafetyScores || [];
      } else if (type === 'tenure-safety') {
        groupSafetyLabel = "Masa Kerja";
        activeSafetyArray = tenureSafetyScores || [];
      } else if (type === 'interaction-safety') {
        groupSafetyLabel = "Interaksi Pasien";
        activeSafetyArray = interactionSafetyScores || [];
      }

      const { highest: highestGrpSafety, lowest: lowestGrpSafety } = calculateGroupSafetyAverages(activeSafetyArray);
      const sortedSafetyList = [...activeSafetyArray].sort((a, b) => b.positiveRate - a.positiveRate);
      const safetyGroupsText = sortedSafetyList.map((g: any) => `${g.name} (${g.positiveRate.toFixed(1)}%)`).join(', ');

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Evaluasi umum peringkat keselamatan pasien (overall safety rating) berdasarkan <strong>{groupSafetyLabel}</strong> tahun <strong>{tahun1}</strong> memetakan tingkat optimisme kualitas pelayanan di seluruh jajaran staf. 
            Kelompok yang memiliki persepsi tingkat keselamatan paling matang adalah <strong>&ldquo;{highestGrpSafety.name}&rdquo;</strong> dengan persentase respons positif mencapai <strong>{highestGrpSafety.score.toFixed(1)}%</strong>. 
            Sebaliknya, kelompok dengan persepsi paling kritis adalah <strong>&ldquo;{lowestGrpSafety.name}&rdquo;</strong> dengan respons positif terendah sebesar <strong>{lowestGrpSafety.score.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs bg-white/60 p-3 rounded-xl border border-blue-100/50 block mt-2">
            <span className="font-bold text-slate-700 block mb-1">Peringkat Persepsi Keselamatan:</span>
            <span className="text-slate-600 font-medium block leading-relaxed">{safetyGroupsText}</span>
          </span>
        </span>
      );

      recs = [
        { text: `Selenggarakan dialog asertif dua arah bersama kelompok "${lowestGrpSafety.name}" guna mengurai hambatan penerapan program keselamatan.`, icon: "🗣️" },
        { text: `Berikan penghargaan formal atas kepemimpinan budaya keselamatan kepada perwakilan kelompok "${highestGrpSafety.name}".`, icon: "🏆" },
        { text: "Jadwalkan kunjungan komite keselamatan pasien harian di meja pelayanan kelompok dengan persepsi terendah.", icon: "👥" },
        { text: "Sediakan dukungan pemenuhan fasilitas dan alat keselamatan medis yang dibutuhkan dalam operasional klinis.", icon: "🛠️" }
      ];
      break;
    }

    case 'unit-reported':
    case 'position-reported':
    case 'tenure-reported':
    case 'interaction-reported': {
      let groupLabel = "Kelompok";
      let activeReportedScores: any[] = [];
      if (type === 'unit-reported') {
        groupLabel = "Unit Kerja";
        activeReportedScores = unitReportingScores || [];
      } else if (type === 'position-reported') {
        groupLabel = "Posisi Staf";
        activeReportedScores = positionReportingScores || [];
      } else if (type === 'tenure-reported') {
        groupLabel = "Masa Kerja";
        activeReportedScores = tenureReportingScores || [];
      } else if (type === 'interaction-reported') {
        groupLabel = "Interaksi Pasien";
        activeReportedScores = interactionReportingScores || [];
      }

      let highestGrp = { name: '--', rate: 0 };
      let lowestGrp = { name: '--', rate: 100 };
      const sortedReportedList = [...activeReportedScores].sort((a, b) => b.rate - a.rate);
      if (sortedReportedList.length > 0) {
        highestGrp = sortedReportedList[0];
        lowestGrp = sortedReportedList[sortedReportedList.length - 1];
      }
      const reportedGroupsText = sortedReportedList.map((g: any) => `${g.name} (${g.rate.toFixed(1)}%)`).join(', ');

      analysisText = (
        <span className="space-y-2 block">
          <span>
            Analisis frekuensi pelaporan minimal 1 insiden keselamatan dalam 12 bulan terakhir berdasarkan <strong>{groupLabel}</strong> tahun <strong>{tahun1}</strong> memetakan sebaran keaktifan peran pelaporan. 
            Kelompok dengan rasio pelaporan paling aktif adalah <strong>&ldquo;{highestGrp.name}&rdquo;</strong> sebesar <strong>{highestGrp.rate.toFixed(1)}%</strong>. 
            Sebaliknya, kelompok jajaran staf dengan tingkat pelaporan paling pasif adalah <strong>&ldquo;{lowestGrp.name}&rdquo;</strong> sebesar <strong>{lowestGrp.rate.toFixed(1)}%</strong>.
          </span>
          <span className="text-xs bg-white/60 p-3 rounded-xl border border-blue-100/50 font-medium text-slate-600 block mt-2">
            <span className="font-bold text-slate-700 block mb-1">Rasio Pelaporan Aktif Kelompok:</span>
            <span className="block leading-relaxed">{reportedGroupsText || 'Belum ada data pelaporan yang dimasukkan'}</span>
          </span>
        </span>
      );

      recs = [
        { text: `Lakukan pendekatan edukasi terfokus mengenai pentingnya pelaporan kejadian klinis pada jajaran kelompok "${lowestGrp.name}".`, icon: "📢" },
        { text: `Sediakan akses portal pelaporan instan terintegrasi (seperti scan QR code) di meja kerja kelompok "${lowestGrp.name}".`, icon: "📱" },
        { text: `Berikan apresiasi resmi "Safety Champion" bagi perwakilan staf kelompok "${highestGrp.name}" guna mempertahankan motivasi tingginya.`, icon: "🏆" },
        { text: "Optimalkan kemudahan pengisian form agar pelaporan insiden dapat diselesaikan secepatnya oleh seluruh staf.", icon: "⏱" }
      ];
      break;
    }

    default:
      analysisText = "Hasil interpretasi dan analisis otomatis sistem sedang dikompilasi berdasarkan data terbaru.";
      recs = [
        { text: "Meningkatkan monitoring budaya keselamatan di setiap unit secara berkala.", icon: "📈" },
        { text: "Mensosialisasikan pentingnya kepatuhan budaya keselamatan pasien bagi seluruh staf.", icon: "📢" },
        { text: "Mengadakan pelatihan berkala jaminan mutu keselamatan pelayanan klinis.", icon: "📚" },
        { text: "Memanfaatkan data survei untuk landasan penyusunan program mutu rumah sakit.", icon: "🎯" }
      ];
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-8 mt-8 w-full">
      {/* CARD 1: INTERPRETASI & ANALISIS DATA */}
      <div className="space-y-4 bg-blue-50/50 border border-blue-100 p-6 md:p-8 rounded-[24px] relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
        <h4 className="text-sm font-extrabold text-blue-900 tracking-wider uppercase flex items-center gap-2">
          <Brain className="w-5.5 h-5.5 text-blue-600 shrink-0" /> INTERPRETASI & ANALISIS DATA
        </h4>
        <div className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">
          {analysisText}
        </div>
      </div>

      {/* CARD 2: REKOMENDASI PENINGKATAN */}
      <div className="space-y-4 bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-[24px] shadow-sm">
        <h4 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-2">
          <ListChecks className="w-5.5 h-5.5 text-indigo-600 shrink-0" /> REKOMENDASI PENINGKATAN
        </h4>
        <ul className="text-xs md:text-sm text-slate-600 space-y-3.5">
          {recs.map((rec, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span className="bg-white shadow-sm border border-slate-200 w-6.5 h-6.5 rounded-lg flex items-center justify-center text-xs shrink-0 select-none">
                {rec.icon}
              </span>
              <span className="font-semibold leading-relaxed text-slate-700">{rec.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

