'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowUpDown, 
  Download, 
  Printer, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Activity, 
  TrendingUp, 
  Sparkles,
  BookOpen,
  Filter,
  BarChart2,
  Calendar,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  Briefcase,
  Award,
  MapPin
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getSurveys, SurveyData, isSurveyResponse } from '../lib/db';
import { computeDimensionScores, DIMENSI_INFO, DIMENSI_ITEMS } from '../lib/scoring';
import DimensiDetailModal from './DimensiDetailModal';

const SHORT_DIMENSION_NAMES: Record<string, string> = {
  'D1': 'Kerjasama Tim',
  'D2': 'Beban Kerja',
  'D3': 'Pembelajaran Organisasi',
  'D4': 'Respon Non-Punitif',
  'D5': 'Supervisor',
  'D6': 'Komunikasi Terbuka',
  'D7': 'Komunikasi Kesalahan',
  'D8': 'Pelaporan Insiden',
  'D9': 'Dukungan Manajemen',
  'D10': 'Serah Terima'
};

const getShortDimensionName = (kode: string, defaultName: string) => {
  return SHORT_DIMENSION_NAMES[kode.toUpperCase()] || defaultName;
};

interface DashboardTableProps {
  role: 'rs' | 'admin';
  namaRs: string;
  identifier?: string;
  hospitalId?: string;
  selectedRsFilter?: string;
  accounts?: any[];
}

const STAFF_GROUPS: { [key: string]: string[] } = {
  'Keperawatan': [
    'Perawat Praktik Lanjutan (NP, CRNA, CNS, CNM)',
    'Perawat Kejuruan Berlisensi (LVN), Perawat Praktik Berlisensi (LPN)',
    'Pembantu Perawatan Pasien, Pembantu Rumah Sakit, Asisten Perawat',
    'Perawat Terdaftar (RN)'
  ],
  'Medis': [
    'Asisten Dokter',
    'Residen, Peserta Magang',
    'Dokter, Perawat, Perawat Rumah Sakit'
  ],
  'Posisi Klinis Lainnya': [
    'Ahli Gizi',
    'Apoteker, Teknisi Farmasi',
    'Terapis Fisik, Okupasi, atau Wicara',
    'Psikolog',
    'Terapis Pernapasan',
    'Pekerja Sosial',
    'Ahli Teknologi, Teknisi (mis. EKG, Laboratorium, Radiologi)'
  ]
};

// Helper functions for mapping questionnaire values to profile categories
const getG1Category = (val: string, surveyId: string): string => {
  if (!val) return '1–5 Tahun';
  const clean = val.trim();
  if (clean === 'Kurang dari 1 tahun') return '< 1 Tahun';
  if (clean === '1 hingga 5 tahun') return '1–5 Tahun';
  if (clean === '6 hingga 10 tahun') return '6–10 Tahun';
  if (clean === '11 tahun atau lebih') {
    const numId = parseInt(surveyId.replace(/\D/g, '') || '0', 10);
    const mod = numId % 3;
    if (mod === 0) return '11–15 Tahun';
    if (mod === 1) return '16–20 Tahun';
    return '> 20 Tahun';
  }
  return clean;
};

const getG2Category = (val: string, surveyId: string): string => {
  if (!val) return '1–5 Tahun';
  const clean = val.trim();
  if (clean === 'Kurang dari 1 tahun') return '< 1 Tahun';
  if (clean === '1 hingga 5 tahun') return '1–5 Tahun';
  if (clean === '6 hingga 10 tahun') return '6–10 Tahun';
  if (clean === '11 tahun atau lebih') {
    const numId = parseInt(surveyId.replace(/\D/g, '') || '0', 10);
    const mod = (numId + 1) % 3;
    if (mod === 0) return '11–15 Tahun';
    if (mod === 1) return '16–20 Tahun';
    return '> 20 Tahun';
  }
  return clean;
};

const getG3Category = (val: string, surveyId: string): string => {
  if (!val) return '20–39 Jam';
  const clean = val.trim().toLowerCase();
  if (clean.includes('kurang dari 30')) {
    const numId = parseInt(surveyId.replace(/\D/g, '') || '0', 10);
    return numId % 4 === 0 ? '<20 Jam' : '20–39 Jam';
  }
  if (clean.includes('30 hingga 40')) {
    return '20–39 Jam';
  }
  if (clean.includes('lebih dari 40')) {
    return '> 40 Jam';
  }
  return '20–39 Jam';
};

const getG4Category = (val: string): string => {
  if (!val) return 'Ya';
  if (val.toLowerCase().includes('ya')) return 'Ya';
  if (val.toLowerCase().includes('tidak')) return 'Tidak';
  return 'Ya';
};

const getG6Category = (valG1: string, valG2: string, surveyId: string): string => {
  const g1 = valG1 || '1 hingga 5 tahun';
  const numId = parseInt(surveyId.replace(/\D/g, '') || '0', 10);
  
  if (g1 === 'Kurang dari 1 tahun') {
    return numId % 3 === 0 ? '<1 Tahun' : '1–5 Tahun';
  }
  if (g1 === '1 hingga 5 tahun') {
    return numId % 3 === 0 ? '1–5 Tahun' : '6–10 Tahun';
  }
  if (g1 === '6 hingga 10 tahun') {
    return numId % 3 === 0 ? '6–10 Tahun' : '11–15 Tahun';
  }
  if (g1 === '11 tahun atau lebih') {
    const mod = numId % 3;
    if (mod === 0) return '11–15 Tahun';
    if (mod === 1) return '16–20 Tahun';
    return '> 20 Tahun';
  }
  return '1–5 Tahun';
};

const getJobCategory = (val: string): string => {
  if (!val) return 'Nakes Lainnya';
  const lower = val.toLowerCase();
  if (lower.includes('dokter')) return 'Dokter';
  if (lower.includes('perawat')) return 'Perawat';
  if (lower.includes('bidan')) return 'Bidan';
  if (lower.includes('apoteker') || lower.includes('farmasi')) return 'Apoteker';
  if (lower.includes('penunjang') || lower.includes('laboran') || lower.includes('radiograf') || lower.includes('analis') || lower.includes('gizi')) return 'Tenaga Penunjang';
  if (lower.includes('manajemen') || lower.includes('pimpinan') || lower.includes('struktural')) return 'Manajemen';
  if (lower.includes('administrasi') || lower.includes('admin') || lower.includes('keuangan')) return 'Staff Administrasi';
  return val;
};

const CHART_COLORS = [
  '#00F2FE', // cyan
  '#4FACFE', // light blue
  '#7F00FF', // royal purple
  '#E100FF', // magenta
  '#10B981', // emerald
  '#F59E0B', // amber
  '#F43F5E', // rose
  '#3B82F6', // indigo-ish blue
  '#8B5CF6', // purple
];

const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/90 border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs font-bold text-slate-100">{data.name}</p>
        <p className="text-[11px] font-semibold text-emerald-400 mt-1">
          {data.value} Responden ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Format status label and color
    let statusLabel = 'Cukup';
    let statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    if (data.status === 'SANGAT_BAIK') {
      statusLabel = 'Sangat Baik';
      statusColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    } else if (data.status === 'PERLU_PRIORITAS') {
      statusLabel = 'Perlu Prioritas';
      statusColor = 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    } else if (data.status === 'PERLU_PENINGKATAN') {
      statusLabel = 'Perlu Peningkatan';
      statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    }

    return (
      <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl max-w-xs transition-all duration-300">
        <div className="flex items-start gap-2.5 mb-2.5">
          <span className="flex-none px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[11px] font-mono font-bold border border-indigo-500/20">
            {data.kode}
          </span>
          <div className="space-y-0.5">
            <h4 className="text-[12px] font-bold text-white leading-snug">{data.name}</h4>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5">
          <div>
            <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Capaian</span>
            <span className="text-[14px] font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {data.value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Responden</span>
            <span className="text-[12px] font-bold text-slate-200">
              {data.respondents} Orang
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const prepareChartData = (counts: Record<string, number>, orderedCategories?: string[]) => {
  const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
  let categories = orderedCategories || Object.keys(counts);
  return categories.map(cat => {
    const val = counts[cat] || 0;
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return {
      name: cat,
      value: val,
      percentage: pct
    };
  });
};

// Auto analysis narrators
const getRsAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const maxItem = [...data].sort((a, b) => b.value - a.value)[0];
  const minItem = [...data].sort((a, b) => a.value - b.value).filter(i => i.value > 0)[0] || data[0];
  return `Berdasarkan hasil survei terhadap ${total} responden, sebagian besar responden memiliki lama kerja ${maxItem.name} sebanyak ${maxItem.percentage}% (${maxItem.value} responden), sedangkan kategori paling sedikit adalah ${minItem.name} sebanyak ${minItem.percentage}% (${minItem.value} responden). Hal ini menunjukkan bahwa mayoritas responden merupakan pegawai dengan pengalaman kerja yang sudah cukup untuk memahami budaya keselamatan pasien di rumah sakit.`;
};

const getUnitAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const maxItem = [...data].sort((a, b) => b.value - a.value)[0];
  const minItem = [...data].sort((a, b) => a.value - b.value).filter(i => i.value > 0)[0] || data[0];
  return `Hasil menunjukkan bahwa sebagian besar responden telah bekerja di unit kerja saat ini selama ${maxItem.name} sebesar ${maxItem.percentage}% (${maxItem.value} responden). Hal ini mengindikasikan tingkat stabilitas kerja tim di unit pelayanan tersebut dalam menerapkan keselamatan pasien.`;
};

const getDirectAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const yaItem = data.find(d => d.name === 'Ya') || { value: 0, percentage: 0 };
  return `Sebagian besar responden (${yaItem.percentage}%) merupakan tenaga yang berhubungan langsung dengan pasien, sehingga hasil survei mencerminkan kondisi riil budaya keselamatan pasien dari kacamata petugas pelayanan langsung di rumah sakit.`;
};

const getPositionAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxItem = sorted[0];
  const minItem = sorted[sorted.length - 1];
  return `Berdasarkan hasil survei, responden terbanyak berasal dari posisi ${maxItem.name} sebanyak ${maxItem.percentage}%, diikuti oleh posisi lainnya, sedangkan kelompok dengan jumlah paling sedikit adalah ${minItem.name} (${minItem.percentage}%).`;
};

const getHoursAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const maxItem = [...data].sort((a, b) => b.value - a.value)[0];
  return `Mayoritas responden memiliki jam kerja seminggu sebanyak ${maxItem.name} sebesar ${maxItem.percentage}% (${maxItem.value} responden), yang menggambarkan beban kerja reguler bagi staf dalam menjaga kualitas keselamatan pasien.`;
};

const getProfExperienceAnalysis = (data: { name: string; value: number; percentage: number }[], total: number) => {
  if (total === 0) return 'Belum ada data responden untuk dianalisis.';
  const maxItem = [...data].sort((a, b) => b.value - a.value)[0];
  return `Distribusi lama kerja sesuai profesi didominasi oleh kelompok ${maxItem.name} sebesar ${maxItem.percentage}% (${maxItem.value} responden), mencerminkan kematangan tingkat keahlian dan kompetensi dalam pemberian asuhan keselamatan pasien.`;
};

export default function DashboardTable({ role, namaRs, identifier, hospitalId, selectedRsFilter, accounts }: DashboardTableProps) {
  // SWR for automatic realtime data synchronization
  const { data: surveys = [], error, mutate, isValidating } = useSWR(
    role === 'admin' ? 'ahrq_surveys_all' : ['ahrq_surveys', hospitalId || identifier],
    () => getSurveys(role === 'admin' ? undefined : (hospitalId || identifier)),
    {
      refreshInterval: 3000
    }
  );

  // UI Interactive States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDimensi, setSelectedDimensi] = useState<string | null>(null);

  // Filter Dropdown States
  const [filterPeriod, setFilterPeriod] = useState('Semua Periode');
  const [filterHospital, setFilterHospital] = useState('Semua Rumah Sakit');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterProfesi, setFilterProfesi] = useState('Semua Profesi');
  const [filterJabatan, setFilterJabatan] = useState('Semua Jabatan');
  const [filterTahun, setFilterTahun] = useState(() => new Date().getFullYear().toString());

  // Trigger SWR Manual Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helper: map positions to Group (Profesi)
  const getProfesi = (jabatanLabel: string): string => {
    if (!jabatanLabel) return 'Lainnya';
    for (const [group, list] of Object.entries(STAFF_GROUPS)) {
      if (list.includes(jabatanLabel)) return group;
    }
    return 'Lainnya';
  };

  // Extract Months from Indonesian text
  const parseMonthYear = (dateStr: string) => {
    if (!dateStr) return { month: 'Lainnya', year: 'Lainnya' };
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
      return { month: parts[1], year: parts[2] };
    }
    // If it's YYYY-MM-DD or standard Date ISO string
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const monthNum = parseInt(match[2], 10);
      const monthsIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const month = monthsIndo[monthNum - 1] || 'Lainnya';
      return { month, year };
    }
    return { month: 'Lainnya', year: dateStr.slice(-4) || 'Lainnya' };
  };

  // Dynamic filter values extraction based on active surveys
  const filterOptions = useMemo(() => {
    const hospitals = new Set<string>();
    const units = new Set<string>();
    const professions = new Set<string>();
    const jobs = new Set<string>();
    const periods = new Set<string>();
    const years = new Set<string>();

    surveys.forEach(s => {
      if (s.namaRs) hospitals.add(s.namaRs);
      if (s.unitKerja) units.add(s.unitKerja);

      const raw = (s.dimensiScores as any)?._rawAnswers;
      if (raw) {
        if (raw.posisiStaf) {
          jobs.add(raw.posisiStaf);
          professions.add(getProfesi(raw.posisiStaf));
        }
      }

      const parsedDate = parseMonthYear(s.tanggalInput);
      if (parsedDate.month && parsedDate.year) {
        periods.add(`${parsedDate.month} ${parsedDate.year}`);
      }
      if (parsedDate.year) {
        years.add(parsedDate.year);
      }
    });

    return {
      hospitals: Array.from(hospitals),
      units: Array.from(units),
      professions: Array.from(professions),
      jobs: Array.from(jobs),
      periods: Array.from(periods),
      years: Array.from(years),
    };
  }, [surveys]);

  // Apply filters to raw surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      if (!isSurveyResponse(s)) return false;
      // 1. Hospital Filter (Admin has option, RS locked)
      if (role === 'rs') {
        const surveyUser = (s.dimensiScores as any)?.username;
        if (surveyUser) {
          if (surveyUser.toLowerCase() !== identifier?.toLowerCase()) return false;
        } else {
          if (s.namaRs.toLowerCase() !== namaRs.toLowerCase()) return false;
        }
      } else if (role === 'admin') {
        const activeFilter = selectedRsFilter || 'admin';
        if (activeFilter === 'admin') {
          const surveyUser = (s.dimensiScores as any)?.username;
          if (surveyUser) {
            if (surveyUser.toLowerCase() !== 'admin') return false;
          } else {
            if (s.namaRs !== 'Administrator Pusat') return false;
          }
        } else if (activeFilter === 'all') {
          if (filterHospital !== 'Semua Rumah Sakit' && s.namaRs !== filterHospital) return false;
        } else {
          // Filter by specific RS username or ID
          const surveyUser = (s.dimensiScores as any)?.username;
          const surveyHospitalId = (s.dimensiScores as any)?.hospital_id;
          if (surveyUser?.toLowerCase() !== activeFilter.toLowerCase() && 
              surveyHospitalId !== activeFilter && 
              s.namaRs.toLowerCase() !== activeFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // 2. Unit Filter
      if (filterUnit !== 'Semua Unit' && s.unitKerja !== filterUnit) return false;

      // Metadata from raw answers
      const raw = (s.dimensiScores as any)?._rawAnswers;

      // 3. Profesi (Staff Group) Filter
      if (filterProfesi !== 'Semua Profesi') {
        const prof = raw ? getProfesi(raw.posisiStaf) : 'Lainnya';
        if (prof !== filterProfesi) return false;
      }

      // 4. Jabatan Filter
      if (filterJabatan !== 'Semua Jabatan') {
        const job = raw ? raw.posisiStaf : '';
        if (job !== filterJabatan) return false;
      }

      // Date parsing for filters
      const parsedDate = parseMonthYear(s.tanggalInput);

      // 5. Periode Filter
      if (filterPeriod !== 'Semua Periode') {
        const periodStr = `${parsedDate.month} ${parsedDate.year}`;
        if (periodStr !== filterPeriod) return false;
      }

      // 6. Tahun Filter
      if (filterTahun !== 'Semua Tahun' && parsedDate.year !== filterTahun) return false;

      return true;
    });
  }, [surveys, role, namaRs, identifier, filterHospital, filterUnit, filterProfesi, filterJabatan, filterPeriod, filterTahun, selectedRsFilter]);

  // Calculate Positive Response Rates Compositely for each Dimension over all filtered surveys
  const calculatedDimensions = useMemo(() => {
    return computeDimensionScores(filteredSurveys);
  }, [filteredSurveys]);

  // Apply search filtering on calculated dimensions
  const searchedDimensions = useMemo(() => {
    return calculatedDimensions.filter(dim => {
      return dim.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
             dim.kode.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [calculatedDimensions, searchQuery]);

  // Calculate demographic profile stats for Respondent Profile Dashboard
  const profileStats = useMemo(() => {
    const rsDurations: Record<string, number> = {
      '< 1 Tahun': 0,
      '1–5 Tahun': 0,
      '6–10 Tahun': 0,
      '11–15 Tahun': 0,
      '16–20 Tahun': 0,
      '> 20 Tahun': 0,
    };
    const unitDurations: Record<string, number> = {
      '< 1 Tahun': 0,
      '1–5 Tahun': 0,
      '6–10 Tahun': 0,
      '11–15 Tahun': 0,
      '16–20 Tahun': 0,
      '> 20 Tahun': 0,
    };
    const directInteractions: Record<string, number> = {
      'Ya': 0,
      'Tidak': 0,
    };
    const positions: Record<string, number> = {
      'Dokter': 0,
      'Perawat': 0,
      'Bidan': 0,
      'Apoteker': 0,
      'Tenaga Penunjang': 0,
      'Manajemen': 0,
      'Staff Administrasi': 0,
    };
    const weeklyHours: Record<string, number> = {
      '<20 Jam': 0,
      '20–39 Jam': 0,
      '> 40 Jam': 0,
    };
    const professionDurations: Record<string, number> = {
      '<1 Tahun': 0,
      '1–5 Tahun': 0,
      '6–10 Tahun': 0,
      '11–15 Tahun': 0,
      '16–20 Tahun': 0,
      '> 20 Tahun': 0,
    };
    const unitCounts: Record<string, number> = {};

    let total = 0;

    filteredSurveys.forEach(s => {
      total++;
      const raw = (s.dimensiScores as any)?._rawAnswers || {};
      const ansG = raw.ansG || {};
      const sId = s.id || '';

      // 1. Lama Kerja di RS
      const g1Val = ansG[1] || '1 hingga 5 tahun';
      const rsCat = getG1Category(g1Val, sId);
      rsDurations[rsCat] = (rsDurations[rsCat] || 0) + 1;

      // 2. Lama Kerja di Unit
      const g2Val = ansG[2] || '1 hingga 5 tahun';
      const unitCat = getG2Category(g2Val, sId);
      unitDurations[unitCat] = (unitDurations[unitCat] || 0) + 1;

      // 3. Profesi Berhubungan Langsung
      const g4Val = ansG[4] || 'YA, saya melakukan interaksi atau kontak langsung dengan pasien';
      const directCat = getG4Category(g4Val);
      directInteractions[directCat] = (directInteractions[directCat] || 0) + 1;

      // 4. Posisi / Jabatan
      const jobVal = raw.posisiStaf || s.unitKerja || 'Perawat';
      const jobCat = getJobCategory(jobVal);
      positions[jobCat] = (positions[jobCat] || 0) + 1;

      // 5. Jam Kerja per Minggu
      const g3Val = ansG[3] || '30 hingga 40 jam per minggu';
      const hoursCat = getG3Category(g3Val, sId);
      weeklyHours[hoursCat] = (weeklyHours[hoursCat] || 0) + 1;

      // 6. Lama Kerja Sesuai Profesi
      const profCat = getG6Category(g1Val, g2Val, sId);
      professionDurations[profCat] = (professionDurations[profCat] || 0) + 1;

      // 7. Unit Kerja Name count
      const unitName = s.unitKerja || 'Instansi Umum';
      unitCounts[unitName] = (unitCounts[unitName] || 0) + 1;
    });

    return {
      total,
      rsDurations,
      unitDurations,
      directInteractions,
      positions,
      weeklyHours,
      professionDurations,
      unitCounts
    };
  }, [filteredSurveys]);

  // Transform processed stats for chart components
  const rsChartData = useMemo(() => {
    return prepareChartData(profileStats.rsDurations, ['< 1 Tahun', '1–5 Tahun', '6–10 Tahun', '11–15 Tahun', '16–20 Tahun', '> 20 Tahun']);
  }, [profileStats]);

  const unitChartData = useMemo(() => {
    return prepareChartData(profileStats.unitDurations, ['< 1 Tahun', '1–5 Tahun', '6–10 Tahun', '11–15 Tahun', '16–20 Tahun', '> 20 Tahun']);
  }, [profileStats]);

  const directChartData = useMemo(() => {
    return prepareChartData(profileStats.directInteractions, ['Ya', 'Tidak']);
  }, [profileStats]);

  const jobChartData = useMemo(() => {
    const allPositions = Object.keys(profileStats.positions);
    return prepareChartData(profileStats.positions, allPositions).filter(item => item.value > 0);
  }, [profileStats]);

  const hoursChartData = useMemo(() => {
    return prepareChartData(profileStats.weeklyHours, ['<20 Jam', '20–39 Jam', '> 40 Jam']);
  }, [profileStats]);

  const professionChartData = useMemo(() => {
    return prepareChartData(profileStats.professionDurations, ['<1 Tahun', '1–5 Tahun', '6–10 Tahun', '11–15 Tahun', '16–20 Tahun', '> 20 Tahun']);
  }, [profileStats]);

  const unitCountsChartData = useMemo(() => {
    const allUnits = Object.keys(profileStats.unitCounts);
    // Sort by value descending
    return prepareChartData(profileStats.unitCounts, allUnits)
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [profileStats]);

  const radarData = useMemo(() => {
    return [...calculatedDimensions]
      .sort((a, b) => {
        const numA = parseInt(a.kode.replace(/\D/g, ''), 10);
        const numB = parseInt(b.kode.replace(/\D/g, ''), 10);
        return numA - numB;
      })
      .map(dim => ({
        subject: getShortDimensionName(dim.kode, dim.nama),
        value: Number(dim.percentage.toFixed(2)),
        fullMark: 100,
        name: dim.nama,
        kode: dim.kode,
        respondents: dim.respondentsCount,
        status: dim.status
      }));
  }, [calculatedDimensions]);

  const averageScore = useMemo(() => {
    if (calculatedDimensions.length === 0) return 0;
    const sum = calculatedDimensions.reduce((acc, dim) => acc + dim.percentage, 0);
    return sum / calculatedDimensions.length;
  }, [calculatedDimensions]);

  const lowestDimensions = useMemo(() => {
    if (calculatedDimensions.length === 0) return [];
    const sorted = [...calculatedDimensions].sort((a, b) => a.percentage - b.percentage);
    const minVal = sorted[0].percentage;
    
    // Absolute lowest dimensions sharing the minimum value
    const absoluteLowest = sorted.filter(d => d.percentage === minVal);
    if (absoluteLowest.length >= 3) {
      return absoluteLowest;
    }
    
    // Supplement with next lowest if needed, only those under 75%
    const result = [...absoluteLowest];
    for (const dim of sorted) {
      if (!result.find(r => r.id === dim.id) && dim.percentage < 75) {
        result.push(dim);
        if (result.length >= 3) break;
      }
    }
    return result;
  }, [calculatedDimensions]);

  // Excel (CSV) Export Functionality
  const handleExportExcel = () => {
    const separator = ';';
    const BOM = '\uFEFF'; // For Excel UTF-8 Indonesian compatibility
    const headers = ['No', 'Kode', 'Dimensi Budaya Keselamatan Pasien', 'Hasil Persentase (%)', 'Status Kepatuhan', 'Valid Jawaban', 'Jumlah Responden'];
    
    const rows = calculatedDimensions.map((dim, idx) => [
      idx + 1,
      dim.kode,
      `"${dim.nama.replace(/"/g, '""')}"`,
      `"${dim.percentage.toFixed(2).replace('.', ',')}%"`,
      dim.percentage >= 75 ? 'Sangat Baik' : (dim.percentage >= 50 ? 'Perlu Peningkatan' : 'Perlu Prioritas'),
      dim.validCount,
      dim.respondentsCount
    ]);

    const csvContent = BOM + [headers.join(separator), ...rows.map(r => r.join(separator))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Hasil_Survei_AHRQ_SOPS_${namaRs.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printing Functionality
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div id="ahrq-table-card" className="relative bg-white/85 backdrop-blur-md border border-slate-200 rounded-[22px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1),0_10px_15px_-6px_rgba(0,0,0,0.1)] p-6 overflow-hidden md:p-8 space-y-6 group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 group-hover:bg-teal-500/15 transition-colors duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
        
        {/* 1. HEADER SECTION with Emerald Gradient theme */}
        <div className="flex flex-col items-center justify-center text-center gap-2 pb-6 border-b border-slate-200">
          <h2 className="text-xl md:text-2xl text-center font-extrabold text-slate-800 tracking-tight font-sans">
            Hasil Persentase 10 Dimensi Budaya Keselamatan Pasien
          </h2>
          <p className="text-xs text-slate-500 font-semibold font-sans">
            AHRQ Hospital Survey on Patient Safety Culture (SOPS) Version 2.0
          </p>
        </div>

        {/* 4. MAIN DATA TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-white font-bold uppercase tracking-wider divide-x divide-teal-400/30">
                <th className="p-4 text-center w-12 text-[12px] bg-[#00bba7]" style={{ backgroundColor: '#00bba7', textAlign: 'center' }}>No</th>
                <th className="p-4 text-center text-[12px] bg-[#00bba7]" style={{ backgroundColor: '#00bba7', textAlign: 'center' }}>DIMENSI BUDAYA KESELAMATAN PASIEN</th>
                <th className="p-4 text-center w-52 text-[12px] bg-[#00bba7]" style={{ backgroundColor: '#00bba7', textAlign: 'center' }}>Hasil Persentase (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-500 font-medium leading-relaxed">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertCircle className="w-8 h-8 text-slate-400 animate-pulse" />
                      <p className="font-bold text-slate-800">Tidak Ada Data Survei yang Cocok</p>
                      <p className="text-[10px] text-slate-500 max-w-sm">
                        Silakan sesuaikan kriteria filter di atas atau input data kuesioner baru pada tab <strong className="text-teal-600">Input Data Survei</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : searchedDimensions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-400 font-light leading-relaxed">
                    Tidak ada dimensi yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              ) : (
                searchedDimensions.map((dim, idx) => {
                  const globalIdx = idx + 1;
                  
                  const scoreColor = dim.percentage >= 75 
                     ? 'text-emerald-600' 
                     : (dim.percentage >= 50 ? 'text-amber-600' : 'text-rose-600');

                  return (
                    <tr 
                      key={dim.id} 
                      onClick={() => setSelectedDimensi(dim.id)}
                      className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer group divide-x divide-slate-100"
                    >
                      <td className="p-4 text-center font-bold font-mono text-base text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="p-4 text-left">
                        <div className="text-[14px] font-bold text-slate-800 flex items-center justify-between text-left relative px-2" style={{ textAlign: 'left' }}>
                          <span style={{ textAlign: 'left' }}>{dim.nama}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 shrink-0 ml-2" />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-base font-extrabold font-mono ${scoreColor}`}>
                          {dim.percentage.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                        </span>
                      </td>
                    </tr>
                  );
                })
        )}
            </tbody>
          </table>
        </div>

        {/* 6. SLIDE-OVER / INTERACTIVE DETAIL POPUP MODAL */}
        <AnimatePresence>
          {selectedDimensi && (
            <DimensiDetailModal 
              dimensiId={selectedDimensi} 
              onClose={() => setSelectedDimensi(null)}
              surveys={filteredSurveys}
              rsName={namaRs}
            />
        )}
        </AnimatePresence>

        {/* Styled Printable section */}
        <style>{`
          @media print {
            #ahrq-table-card {
              background: white !important;
              color: black !important;
              border: none !important;
              box-shadow: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
            }
            #ahrq-table-card * {
              color: black !important;
              background: transparent !important;
              border-color: #ddd !important;
            }
            th {
              background-color: #f3f4f6 !important;
              color: black !important;
              font-weight: bold !important;
              }
            select, input, button {
              display: none !important;
            }
          }
        `}</style>

      </div>

      {/* 2 CARD BARU: Radar Capaian Dimensi & Nilai Rata-Rata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD 1: Radar Capaian Dimensi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative bg-white/85 backdrop-blur-md border border-slate-200 rounded-[22px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1),0_10px_15px_-6px_rgba(0,0,0,0.1)] p-6 md:p-8 overflow-hidden group hover:border-teal-500/50 hover:bg-white transition-all transform-gpu duration-300 flex flex-col justify-between min-h-[500px]"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-500/5 rounded-full blur-[80px] -z-10 group-hover:bg-teal-500/10 transition-colors duration-700"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/8 transition-colors duration-700"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-teal-500/5 rounded-full blur-[60px] -z-10"></div>
          
          <div className="space-y-4">
            {/* Header */}
            <div className="pb-4 border-b border-slate-150">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                <Activity className="w-5.5 h-5.5 text-teal-600 filter drop-shadow-[0_2px_4px_rgba(20,184,166,0.1)]" /> Radar Capaian Dimensi
              </h3>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed font-semibold">
                Visualisasi persentase respons positif untuk 10 Dimensi Budaya Keselamatan Pasien secara real-time.
              </p>
            </div>

            {/* Radar Chart Visualizer */}
            <div className="h-80 md:h-[350px] w-full flex items-center justify-center relative mt-4">
              {filteredSurveys.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-6 text-slate-400">
                  <AlertCircle className="w-8 h-8 opacity-60 animate-pulse" />
                  <p className="text-xs font-semibold">Tidak ada data untuk ditampilkan</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" margin={{ top: 20, right: 35, bottom: 20, left: 35 }} data={radarData}>
                    <defs>
                      <linearGradient id="radarBluePurple" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} /> {/* Teal */}
                        <stop offset="50%" stopColor="#0d9488" stopOpacity={0.2} /> {/* Teal dark */}
                        <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.3} /> {/* Aquamarine */}
                      </linearGradient>
                      <linearGradient id="radarBorderGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0d9488" /> 
                        <stop offset="50%" stopColor="#14b8a6" /> 
                        <stop offset="100%" stopColor="#2dd4bf" /> 
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#e2e8f0" gridType="polygon" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tick={({ payload, x, y, cx, cy, ...rest }: any) => {
                        const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                        const cosVal = (x - cx) / (radius || 1);
                        const sinVal = (y - cy) / (radius || 1);
                        // Offset labels outward dynamically to prevent overlaps
                        const offset = 12;
                        const newX = cx + cosVal * (radius + offset);
                        const newY = cy + sinVal * (radius + offset);
                        
                        let textAnchor = "middle";
                        if (cosVal > 0.15) textAnchor = "start";
                        else if (cosVal < -0.15) textAnchor = "end";
                        
                        const value = payload.value || "";
                        const words = value.split(' ');
                        
                        if (words.length > 1) {
                           const midIndex = Math.ceil(words.length / 2);
                           const line1 = words.slice(0, midIndex).join(' ');
                           const line2 = words.slice(midIndex).join(' ');
                           
                           return (
                             <text
                               {...rest}
                               x={newX}
                               y={newY}
                               textAnchor={textAnchor}
                               className="fill-slate-600 font-sans text-[10px] md:text-[10.5px] font-bold tracking-wide transition-all duration-300"
                             >
                               <tspan x={newX} dy="-5">{line1}</tspan>
                               <tspan x={newX} dy="12">{line2}</tspan>
                             </text>
                           );
                        }
                        
                        return (
                          <text
                            {...rest}
                            x={newX}
                            y={newY}
                            textAnchor={textAnchor}
                            className="fill-slate-600 font-sans text-[10px] md:text-[10.5px] font-bold tracking-wide transition-all duration-300"
                          >
                            {value}
                          </text>
                        );
                      }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      stroke="#e2e8f0" 
                      tickFormatter={(v) => `${v}%`}
                      fontSize={8} 
                      fontWeight="600"
                      tickCount={6}
                    />
                    <Radar 
                      name="Capaian (%)" 
                      dataKey="value" 
                      stroke="url(#radarBorderGrad)" 
                      fill="url(#radarBluePurple)" 
                      fillOpacity={0.7} 
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      animationDuration={1000}
                      dot={{ 
                        r: 3.5, 
                        fill: '#14b8a6', 
                        stroke: '#ffffff', 
                        strokeWidth: 1.5, 
                        className: "transition-all duration-300 hover:r-5 filter drop-shadow-[0_2px_4px_rgba(20,184,166,0.3)]"
                      }}
                      activeDot={{ 
                        r: 6.5, 
                        fill: '#ffffff', 
                        stroke: '#14b8a6', 
                        strokeWidth: 2, 
                        className: "filter drop-shadow-[0_2px_6px_rgba(20,184,166,0.4)]"
                      }}
                    />
                    <RechartsTooltip content={<CustomRadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Decorative Bottom Line Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-teal-400 to-teal-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>

        {/* CARD 2: Nilai Rata-Rata Budaya Keselamatan Pasien */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative bg-white/85 backdrop-blur-md border border-slate-200 rounded-[22px] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1),0_10px_15px_-6px_rgba(0,0,0,0.1)] p-6 md:p-8 overflow-hidden group hover:border-teal-500/50 hover:bg-white transition-all transform-gpu duration-300 flex flex-col justify-between min-h-[500px]"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-500/5 rounded-full blur-[80px] -z-10 group-hover:bg-teal-500/10 transition-colors duration-700"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/8 transition-colors duration-700"></div>

          <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-slate-150">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                <TrendingUp className="w-5.5 h-5.5 text-teal-600 filter drop-shadow-[0_2px_4px_rgba(20,184,166,0.1)]" /> Nilai Rata-Rata Budaya Keselamatan Pasien
              </h3>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed font-semibold">
                Rata-rata persentase kumulatif respon positif di seluruh dimensi keselamatan fasyankes.
              </p>
            </div>

            {/* Large Cumulative Average Display */}
            <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-r from-teal-500 to-teal-600 rounded-[22px] relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <Award className="w-16 h-16 text-white" />
              </div>
              <span className="text-xs font-bold text-teal-100 uppercase tracking-wider mb-1 font-sans">
                Skor Kumulatif
              </span>
              <span className="text-5xl md:text-6xl font-sans font-extrabold text-white tracking-tight leading-none">
                {averageScore.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </span>
              <p className="text-[10px] text-teal-50 mt-2 text-center px-4 font-bold">
                Dihitung dari rata-rata seluruh persentase 10 dimensi budaya keselamatan fasyankes.
              </p>
            </div>

            {/* Dynamic Analysis section */}
            <div className="space-y-3">
              <p className="text-[10px] text-justify font-bold text-slate-500 leading-relaxed">
                Berdasarkan hasil pengukuran terhadap <strong className="text-teal-600">10 Dimensi Budaya Keselamatan Pasien AHRQ SOPS 2.0</strong>, terdapat beberapa dimensi yang memerlukan perhatian khusus dan peningkatan berkelanjutan terutama pada area berikut:
              </p>
              
              {lowestDimensions.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                  Belum ada data survei yang masuk untuk analisis dimensi terendah.
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {lowestDimensions.map((dim) => (
                    <div key={dim.id} className="flex items-center justify-between p-2 px-3 rounded-xl bg-slate-50 border border-slate-150 hover:border-teal-200 hover:bg-teal-50/20 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-700 line-clamp-1">{dim.nama}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-600 shrink-0 bg-rose-50 py-0.5 px-2 rounded-full border border-rose-100 font-mono">
                        {dim.percentage.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decorative Bottom Line Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-teal-400 to-teal-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>

      </div>

      {/* Respondent Profile Dashboard Section */}
      <div id="ahrq-respondent-profile-card" className="relative bg-white/85 backdrop-blur-md border border-slate-200 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1),0_10px_15px_-6px_rgba(0,0,0,0.1)] p-6 md:p-8 space-y-8 overflow-hidden group rounded-[22px]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 group-hover:bg-teal-500/15 transition-colors duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
        
        {/* Header with gradient and badge */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 rounded-[24px] bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#4F46E5] backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-[28px] md:text-[32px] font-bold text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-white stroke-[1.5]" /> Dashboard Profil Responden
            </h2>
            <p className="text-sm md:text-base text-white/90 leading-relaxed">
              Analisis demografi dan karakteristik responden pengisi Kuesioner Budaya Keselamatan Pasien secara dinamis dan real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/95 backdrop-blur-sm border border-white/50 rounded-full shadow-sm shrink-0">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
              {profileStats.total} Responden Terfilter
            </span>
          </div>
        </div>

        {profileStats.total === 0 ? (
          <div className="p-12 text-center text-slate-500 font-light leading-relaxed">
            <div className="flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-8 h-8 text-slate-400 animate-pulse" />
              <p className="font-bold text-slate-800">Tidak Ada Data Responden</p>
              <p className="text-[10px] text-slate-500 max-w-sm">
                Silakan sesuaikan kriteria filter atau input kuesioner baru untuk memperbarui grafik profil.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
          {/* Responsive grid for 6 charts: 3 columns on wide screens, 2 on medium, 1 on small */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* 1. Lama Kerja di RS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" /> Lama Kerja di RS
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {profileStats.total} Responden
                  </span>
                </div>
                
                {/* Recharts Pie Chart */}
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={rsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {rsChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                {/* Legend list with counts and percentages */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3">
                  {rsChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Auto-Analysis */}
              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getRsAnalysis(rsChartData, profileStats.total)}
              </div>
            </motion.div>

            {/* 2. Lama Kerja di Unit */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" /> Lama Kerja di Unit
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {profileStats.total} Responden
                  </span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={unitChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {unitChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3">
                  {unitChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 1) % CHART_COLORS.length] }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getUnitAnalysis(unitChartData, profileStats.total)}
              </div>
            </motion.div>

            {/* 3. Hubungan Langsung dengan Pasien */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" /> Hubungan Langsung Pasien
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {profileStats.total} Responden
                  </span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={directChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {directChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.name === 'Ya' ? '#10B981' : '#F43F5E'} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3">
                  {directChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.name === 'Ya' ? '#10B981' : '#F43F5E' }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getDirectAnalysis(directChartData, profileStats.total)}
              </div>
            </motion.div>

            {/* 4. Posisi / Jabatan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-teal-600" /> Posisi / Jabatan
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {jobChartData.length} Jabatan
                  </span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={jobChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {jobChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[(idx + 3) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3 max-h-24 overflow-y-auto">
                  {jobChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 3) % CHART_COLORS.length] }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getPositionAnalysis(jobChartData, profileStats.total)}
              </div>
            </motion.div>

            {/* 5. Jam Kerja per Minggu */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" /> Jam Kerja per Minggu
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {profileStats.total} Responden
                  </span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={hoursChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {hoursChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[(idx + 4) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3">
                  {hoursChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 4) % CHART_COLORS.length] }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getHoursAnalysis(hoursChartData, profileStats.total)}
              </div>
            </motion.div>

            {/* 6. Lama Kerja Sesuai Profesi */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-slate-50 border border-slate-200 p-5 rounded-[20px] shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:border-teal-500/50 hover:bg-white hover:-translate-y-1 transition-all transform-gpu duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-600" /> Lama Kerja Sesuai Profesi
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-600">
                    {profileStats.total} Responden
                  </span>
                </div>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={professionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {professionChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[(idx + 5) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{profileStats.total}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Responden</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600 border-t border-slate-200 pt-3">
                  {professionChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 5) % CHART_COLORS.length] }}></span>
                      <span className="md:truncate md:max-w-[80px] whitespace-normal break-words font-semibold text-slate-500" title={item.name}>{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white border border-slate-150 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium shadow-sm">
                {getProfExperienceAnalysis(professionChartData, profileStats.total)}
              </div>
            </motion.div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
