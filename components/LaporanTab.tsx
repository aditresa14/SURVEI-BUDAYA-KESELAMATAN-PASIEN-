'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  Building2, 
  Calendar, 
  Printer, 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Award, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ChevronDown, 
  RefreshCw, 
  Layers,
  ArrowUpRight,
  Target,
  Clock,
  Briefcase,
  Globe,
  BarChart2,
  HeartPulse,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  TrendingDown,
  Info,
  LayoutDashboard,
  HelpCircle,
  AlertCircle,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell,
  LabelList
} from 'recharts';
import { computeDimensionScores, DIMENSI_INFO, DIMENSI_ITEMS, scoreToPercent } from '../lib/scoring';
import { getPengesahanConfig, PengesahanConfig, isSurveyResponse } from '../lib/db';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

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

  for (const keyword of positiveKeywords) {
    if (lower.includes(keyword)) {
      return true;
    }
  }

  return false;
};

export const isConstructiveComment = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  const constructiveKeywords = [
    'saran', 'masukan', 'perlu', 'harus', 'sebaiknya', 'ditingkatkan', 'diperbaiki', 
    'kurang', 'mohon', 'harap', 'tambah', 'evaluasi', 'sosialisasi', 'dukungan', 
    'fasilitas', 'kebijakan', 'sistem', 'komunikasi'
  ];
  for (const keyword of constructiveKeywords) {
    if (lower.includes(keyword)) {
      return true;
    }
  }
  return false;
};

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

const STATEMENTS_A = [
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
  { id: 14, code: 'A14', text: 'Di unit ini, masalah keselamatan pasien yang sama memungkinkan dapat terus terjadi', dim: 'd4', isReversed: true }
];

const STATEMENTS_B = [
  { id: 1, code: 'B1', text: 'Atasan, manajer, atau pemimpin klinis saya secara serius mempertimbangkan saran dari staf untuk meningkatkan keselamatan pasien', dim: 'd5' },
  { id: 2, code: 'B2', text: 'Atasan, manajer, atau pemimpin klinis saya menginginkan kita bekerja lebih cepat saat waktu sibuk, bahkan jika itu berarti mengambil jalan pintas', dim: 'd5', isReversed: true },
  { id: 3, code: 'B3', text: 'Atasan, manajer, atau pemimpin klinis saya mengambil tindakan untuk mengatasi masalah keselamatan pasien yang menjadi perhatian mereka', dim: 'd5' }
];

const STATEMENTS_C = [
  { id: 1, code: 'C1', text: 'Kami diberi informasi tentang kesalahan yang terjadi pada unit ini', dim: 'd7' },
  { id: 2, code: 'C2', text: 'Ketika kesalahan terjadi pada unit ini, kami mendiskusikan cara-cara untuk mencegahnya terjadi lagi', dim: 'd7' },
  { id: 3, code: 'C3', text: 'Di unit ini, kami diberi tahu tentang perubahan yang dibuat berdasarkan laporan kejadian', dim: 'd7' },
  { id: 4, code: 'C4', text: 'Di unit ini, staf angkat bicara jika mereka melihat sesuatu yang dapat berdampak negatif terhadap perawatan pasien', dim: 'd6' },
  { id: 5, code: 'C5', text: 'Ketika staf di unit ini melihat seseorang yang memiliki wewenang lebih besar melakukan sesuatu yang tidak aman bagi pasien, mereka berani angkat bicara', dim: 'd6' },
  { id: 6, code: 'C6', text: 'Ketika staf di unit ini angkat bicara, mereka yang memiliki wewenang lebih besar akan terbuka terhadap masalah keselamatan pasien mereka', dim: 'd6' },
  { id: 7, code: 'C7', text: 'Di unit ini, staf takut untuk bertanya ketika ada sesuatu yang tidak beres', dim: 'd6', isReversed: true }
];

const STATEMENTS_D = [
  { id: 1, code: 'D1', text: 'Ketika kesalahan diketahui dan diperbaiki sebelum sampai ke pasien, seberapa sering hal ini dilaporkan?', dim: 'd8' },
  { id: 2, code: 'D2', text: 'Ketika suatu kesalahan sampai ke pasien dan dapat membahayakan pasien, tetapi tidak terjadi, seberapa sering hal ini dilaporkan?', dim: 'd8' }
];

const STATEMENTS_F = [
  { id: 1, code: 'F1', text: 'Tindakan manajemen rumah sakit menunjukkan bahwa keselamatan pasien adalah prioritas utama', dim: 'd9' },
  { id: 2, code: 'F2', text: 'Manajemen rumah sakit menyediakan sumber daya yang memadai untuk meningkatkan keselamatan pasien', dim: 'd9' },
  { id: 3, code: 'F3', text: 'Manajemen rumah sakit tampaknya hanya tertarik pada keselamatan pasien setelah kejadian tidak diharapkan terjadi', dim: 'd9', isReversed: true },
  { id: 4, code: 'F4', text: 'Ketika memindahkan pasien dari satu unit ke unit lain, informasi penting sering kali terlewatkan', dim: 'd10', isReversed: true },
  { id: 5, code: 'F5', text: 'Selama pergantian shift, informasi perawatan pasien yang penting sering terlewatkan', dim: 'd10', isReversed: true },
  { id: 6, code: 'F6', text: 'Selama pergantian shift, ada waktu yang memadai untuk bertukar semua informasi penting tentang perawatan pasien', dim: 'd10' }
];

const DIMENSION_ORDER = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'];

const getBarColorHex = (val: number) => {
  if (val >= 85) return '#3b82f6';
  if (val >= 70) return '#10b981';
  if (val >= 50) return '#f59e0b';
  return '#ef4444';
};

const ALL_QUESTIONS_LAPORAN = [
  ...STATEMENTS_A.map(q => ({ ...q, section: 'A' })),
  ...STATEMENTS_B.map(q => ({ ...q, section: 'B' })),
  ...STATEMENTS_C.map(q => ({ ...q, section: 'C' })),
  ...STATEMENTS_D.map(q => ({ ...q, section: 'D' })),
  ...STATEMENTS_F.map(q => ({ ...q, section: 'F' }))
];

interface SurveyData {
  id: string;
  namaRs: string;
  unitKerja: string;
  jumlahResponden: number;
  tanggalInput: string;
  dimensiScores: { [key: string]: any };
}

interface LaporanTabProps {
  surveys?: SurveyData[];
  role?: 'rs' | 'admin';
  identifier?: string;
  hospitalId?: string;
  namaRs?: string;
  accounts?: any[];
  requests?: any[];
  activeLogo?: any;
}

export default function LaporanTab({
  surveys = [],
  role = 'rs',
  identifier = '',
  hospitalId = '',
  namaRs = 'Rumah Sakit',
  accounts = [],
  requests = [],
  activeLogo = null
}: LaporanTabProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // State Filters
  const [selectedYear, setSelectedYear] = useState<string>('Semua Tahun');
  const tahunSurvei = selectedYear === 'Semua Tahun' ? 'Semua Tahun' : selectedYear;
  
  const [selectedComparisonYear, setSelectedComparisonYear] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ahrq_active_comparison_year') || 'none';
    }
    return 'none';
  });

  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ahrq_active_benchmark_id');
      if (saved && saved !== 'none' && saved !== 'default') {
        const isOwnHospital = saved === hospitalId || saved === identifier || saved === namaRs;
        if (!isOwnHospital) {
          return saved;
        }
      }
    }
    return 'none';
  });

  // Sync state changes with localStorage for single source of truth across tabs
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedComparisonYear !== 'none') {
        localStorage.setItem('ahrq_active_comparison_year', selectedComparisonYear);
      } else {
        localStorage.removeItem('ahrq_active_comparison_year');
      }
    }
  }, [selectedComparisonYear]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedBenchmarkId !== 'none') {
        localStorage.setItem('ahrq_active_benchmark_id', selectedBenchmarkId);
      } else {
        localStorage.removeItem('ahrq_active_benchmark_id');
      }
    }
  }, [selectedBenchmarkId]);
  const [pengesahanConfig, setPengesahanConfig] = useState<PengesahanConfig | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [targetHospitalSurveys, setTargetHospitalSurveys] = useState<SurveyData[]>([]);
  const [isLoadingTarget, setIsLoadingTarget] = useState(false);

  React.useEffect(() => {
    const fetchPengesahan = async () => {
      const cfg = await getPengesahanConfig(identifier || hospitalId || namaRs, namaRs);
      setPengesahanConfig(cfg);
    };
    fetchPengesahan();
  }, [identifier, hospitalId, namaRs]);

  // SECURE REALTIME BENCHMARK FETCHING
  React.useEffect(() => {
    if (selectedBenchmarkId === 'none') {
      setTargetHospitalSurveys([]);
      return;
    }

    let isMounted = true;
    const requesterId = hospitalId || identifier;
    const targetId = selectedBenchmarkId;

    const fetchTargetData = async () => {
      try {
        setIsLoadingTarget(true);
        // Using the same secure fetch logic as AnalisaDataTab
        const { getSurveys } = await import('../lib/db');
        const data = await getSurveys(targetId);
        if (isMounted) {
          setTargetHospitalSurveys(data.filter(s => s && isSurveyResponse(s)));
        }
      } catch (err) {
        console.error("Failed to fetch secure benchmark data in LaporanTab:", err);
      } finally {
        if (isMounted) setIsLoadingTarget(false);
      }
    };

    fetchTargetData();
    const interval = setInterval(fetchTargetData, 5000); // Poll for realtime updates

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBenchmarkId, hospitalId, identifier]);

  // Filter valid surveys for current hospital (or selected if admin)
  const validSurveys = useMemo(() => {
    return surveys.filter(s => {
      if (!s || !isSurveyResponse(s)) return false;
      if (s.id === 'MASTER_BENCHMARK' || s.id.startsWith('LINK_CONFIG_') || s.id.startsWith('_MASTER_')) return false;

      if (role === 'admin') return true;

      // Filter to only include the active hospital's data
      const surveyUser = (s.dimensiScores as any)?.username || s.unitKerja;
      const surveyHospitalId = (s.dimensiScores as any)?.hospital_id;
      
      const matchesRS = surveyUser?.toLowerCase() === identifier.toLowerCase() || 
                        surveyHospitalId === hospitalId || 
                        s.namaRs.toLowerCase() === (namaRs || '').toLowerCase();
                        
      return matchesRS;
    });
  }, [surveys, role, identifier, hospitalId, namaRs]);

  // Auto-select latest year with data on mount / data change
  React.useEffect(() => {
    const yearsWithData = new Set<string>();
    validSurveys.forEach(s => {
      const yr = extractYear(s.tanggalInput);
      if (yr) yearsWithData.add(yr);
    });
    const sortedYears = Array.from(yearsWithData).sort((a, b) => b.localeCompare(a));
    if (sortedYears.length > 0) {
      setSelectedYear(sortedYears[0]);
    }
  }, [validSurveys]);

  // Extract available years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<string>();
    
    // 3 years back and 3 years forward from current year
    for (let i = -3; i <= 3; i++) {
      yearsSet.add((currentYear + i).toString());
    }

    // Also include years from data if any
    validSurveys.forEach(s => {
      const yr = extractYear(s.tanggalInput);
      if (yr) yearsSet.add(yr);
    });
    const sorted = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    return ['Semua Tahun', ...sorted];
  }, [validSurveys]);

  // Filter surveys by selected year
  const activeSurveys = useMemo(() => {
    if (selectedYear === 'Semua Tahun') return validSurveys;
    return validSurveys.filter(s => {
      return extractYear(s.tanggalInput) === selectedYear;
    });
  }, [validSurveys, selectedYear]);

  // Target and Actual Respondents
  const totalActual = useMemo(() => {
    return activeSurveys.reduce((acc, s) => acc + (s.jumlahResponden || 1), 0);
  }, [activeSurveys]);

  const linkConfig = useMemo(() => {
    const configRow = surveys.find(s => s.id.startsWith('LINK_CONFIG_'));
    return configRow?.dimensiScores || null;
  }, [surveys]);

  const totalTarget = useMemo(() => {
    if (linkConfig && linkConfig.maxRespondents) {
      const parsed = parseInt(linkConfig.maxRespondents, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    // Standard estimation or target multiplier (e.g. 1.25x or min 100)
    return Math.max(Math.ceil(totalActual * 1.25), 100);
  }, [totalActual, linkConfig]);

  const responseRateNum = useMemo(() => {
    if (totalTarget === 0) return 0;
    return Math.min(100, (totalActual / totalTarget) * 100);
  }, [totalActual, totalTarget]);

  const responseRateStr = `${responseRateNum.toFixed(1)}%`;

  // Date range
  const periodeSurvei = useMemo(() => {
    if (linkConfig && (linkConfig.startDate || linkConfig.createdAt) && linkConfig.expiryDate) {
       const start = new Date(linkConfig.startDate || linkConfig.createdAt).toLocaleDateString('id-ID');
       const end = new Date(linkConfig.expiryDate).toLocaleDateString('id-ID');
       return `${start} s/d ${end}`;
    }
    if (activeSurveys.length === 0) return 'Januari - Desember ' + (selectedYear === 'Semua Tahun' ? new Date().getFullYear() : selectedYear);
    const dates = activeSurveys.map(s => s.tanggalInput).filter(Boolean);
    if (dates.length === 0) return 'Periode Tahun ' + selectedYear;
    return `${dates[0]} s/d ${dates[dates.length - 1]}`;
  }, [activeSurveys, selectedYear, linkConfig]);

  // 10 Dimensions Scores
  const dimensionScores = useMemo(() => {
    return computeDimensionScores(activeSurveys);
  }, [activeSurveys]);

  const overallAverage = useMemo(() => {
    if (dimensionScores.length === 0) return 0;
    const sum = dimensionScores.reduce((acc, d) => acc + d.percentage, 0);
    return sum / dimensionScores.length;
  }, [dimensionScores]);

  const activeHospitalName = useMemo(() => {
    return (pengesahanConfig?.namaRs && pengesahanConfig.namaRs.trim()) || (namaRs && namaRs.trim()) || 'Rumah Sakit';
  }, [pengesahanConfig?.namaRs, namaRs]);

  const displayYear = useMemo(() => {
    if (selectedYear && selectedYear !== 'Semua Tahun') return selectedYear;
    return new Date().getFullYear().toString();
  }, [selectedYear]);

  // Keep dimensionScores order as primary source of truth (D7, D6, D10, D9, D3, D8, D4, D2, D5, D1)
  const sortedDimensionScores = useMemo(() => {
    return dimensionScores;
  }, [dimensionScores]);

  const highestDim = useMemo(() => {
    if (!dimensionScores || dimensionScores.length === 0) return null;
    return [...dimensionScores].sort((a, b) => b.percentage - a.percentage)[0];
  }, [dimensionScores]);

  const lowestDim = useMemo(() => {
    if (!dimensionScores || dimensionScores.length === 0) return null;
    return [...dimensionScores].sort((a, b) => a.percentage - b.percentage)[0];
  }, [dimensionScores]);

  const demografiStats = useMemo(() => {
    const total = activeSurveys.reduce((acc, s) => acc + (s.jumlahResponden || 1), 0);
    const posisiCounts: Record<string, number> = {};
    const g1TenureCounts: Record<string, number> = {};
    const g2TenureCounts: Record<string, number> = {};
    const g3WorkHoursCounts: Record<string, number> = {};
    const g4InteractionCounts: Record<string, number> = {};

    activeSurveys.forEach(s => {
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
          const isDirect = (ans: any): boolean => {
            if (!ans) return true;
            const str = String(ans).trim().toLowerCase();
            if (str.includes('tidak') || str.includes('tanpa')) return false;
            return true;
          };
          if (isDirect(g4)) {
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
    activeSurveys.forEach(s => {
      const unit = s.unitKerja || 'Instansi Umum';
      unitCounts[unit] = (unitCounts[unit] || 0) + (s.jumlahResponden || 1);
    });
    const unitData = Object.entries(unitCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { total, posisiData, g1Data, g2Data, g3Data, g4Data, unitData };
  }, [activeSurveys]);

  // Dynamic Auto-Pagination state for Karakteristik Responden & Comparison tables
  const flatDemografiRows = useMemo(() => {
    const rows: Array<{
      categoryKey: string;
      categoryLabel: string;
      name: string;
      value: number;
      pctStr: string;
    }> = [];

    // 1. Posisi / Jabatan
    demografiStats.posisiData.forEach((pItem) => {
      const pct = ((pItem.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'posisi',
        categoryLabel: 'Posisi / Jabatan',
        name: pItem.name,
        value: pItem.value,
        pctStr: `${pct}%`
      });
    });

    // 2. Masa Kerja di RS Ini
    demografiStats.g1Data.forEach((g1Item) => {
      const pct = ((g1Item.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'g1',
        categoryLabel: 'Masa Kerja di RS Ini',
        name: g1Item.name,
        value: g1Item.value,
        pctStr: `${pct}%`
      });
    });

    // 3. Masa Kerja di Unit Kerja
    demografiStats.g2Data.forEach((g2Item) => {
      const pct = ((g2Item.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'g2',
        categoryLabel: 'Masa Kerja di Unit Kerja',
        name: g2Item.name,
        value: g2Item.value,
        pctStr: `${pct}%`
      });
    });

    // 4. Jam Kerja per Minggu
    demografiStats.g3Data.forEach((g3Item) => {
      const pct = ((g3Item.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'g3',
        categoryLabel: 'Jam Kerja per Minggu',
        name: g3Item.name,
        value: g3Item.value,
        pctStr: `${pct}%`
      });
    });

    // 5. Interaksi Kontak Pasien
    (demografiStats.g4Data || []).forEach((g4Item) => {
      const pct = ((g4Item.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'g4',
        categoryLabel: 'Interaksi Kontak Pasien',
        name: g4Item.name,
        value: g4Item.value,
        pctStr: `${pct}%`
      });
    });

    // 6. Unit / Area Kerja
    demografiStats.unitData.forEach((uItem) => {
      const pct = ((uItem.value / (demografiStats.total || 1)) * 100).toFixed(1);
      rows.push({
        categoryKey: 'unit',
        categoryLabel: 'Unit / Area Kerja',
        name: uItem.name,
        value: uItem.value,
        pctStr: `${pct}%`
      });
    });

    return rows;
  }, [demografiStats]);

  const demografiPages = useMemo(() => {
    const pages: Array<{
      rows: typeof flatDemografiRows;
      isFirstPage: boolean;
      isLastPage: boolean;
    }> = [];

    if (flatDemografiRows.length === 0) return pages;

    const TOTAL = flatDemografiRows.length;

    // Capacities for pagination based on A4 printable area and row height (~27px):
    const CAP_FIRST_WITH_SUMMARY = 6;
    const CAP_FIRST_NO_SUMMARY = 21;
    const CAP_MID_NO_SUMMARY = 26;
    const CAP_LAST_WITH_SUMMARY = 10;

    let currentIndex = 0;

    while (currentIndex < TOTAL) {
      const isFirst = currentIndex === 0;
      const remaining = TOTAL - currentIndex;

      if (isFirst) {
        if (remaining <= CAP_FIRST_WITH_SUMMARY) {
          pages.push({ rows: flatDemografiRows.slice(0, remaining), isFirstPage: true, isLastPage: true });
          currentIndex += remaining;
        } else {
          let take = Math.min(CAP_FIRST_NO_SUMMARY, remaining);
          if (remaining - take > 0 && remaining - take < 4) {
            take = Math.max(CAP_FIRST_WITH_SUMMARY + 1, remaining - 4);
          }
          if (remaining <= CAP_FIRST_NO_SUMMARY) {
             pages.push({ rows: flatDemografiRows.slice(0, remaining), isFirstPage: true, isLastPage: false });
             currentIndex += remaining;
          } else {
             pages.push({ rows: flatDemografiRows.slice(0, take), isFirstPage: true, isLastPage: false });
             currentIndex += take;
          }
        }
      } else {
        if (remaining <= CAP_LAST_WITH_SUMMARY) {
           pages.push({ rows: flatDemografiRows.slice(currentIndex, currentIndex + remaining), isFirstPage: false, isLastPage: true });
           currentIndex += remaining;
        } else if (remaining <= CAP_MID_NO_SUMMARY) {
           pages.push({ rows: flatDemografiRows.slice(currentIndex, currentIndex + remaining), isFirstPage: false, isLastPage: false });
           currentIndex += remaining;
        } else {
           let take = Math.min(CAP_MID_NO_SUMMARY, remaining);
           if (remaining - take > 0 && remaining - take < 4) {
             take = remaining - 4;
           }
           pages.push({ rows: flatDemografiRows.slice(currentIndex, currentIndex + take), isFirstPage: false, isLastPage: false });
           currentIndex += take;
        }
      }
    }

    // Ensure the summary is printed if the last page was full without summary
    if (pages.length > 0 && !pages[pages.length - 1].isLastPage) {
       pages.push({ rows: [], isFirstPage: false, isLastPage: true });
    }

    return pages;
  }, [flatDemografiRows]);

  const profesiPages = useMemo(() => {
    const list = demografiStats.posisiData || [];
    if (list.length === 0) return [[]];
    const chunks: Array<typeof list> = [];
    for (let i = 0; i < list.length; i += 6) {
      chunks.push(list.slice(i, i + 6));
    }
    return chunks;
  }, [demografiStats.posisiData]);

  const unitPages = useMemo(() => {
    const list = demografiStats.unitData || [];
    if (list.length === 0) return [[]];
    const chunks: Array<typeof list> = [];
    for (let i = 0; i < list.length; i += 6) {
      chunks.push(list.slice(i, i + 6));
    }
    return chunks;
  }, [demografiStats.unitData]);

  const totalReportPages = useMemo(() => {
    return 6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 6;
  }, [demografiPages.length, profesiPages.length, unitPages.length]);

  const renderDemografiTableRows = (
    rowsInPage: typeof flatDemografiRows,
    allRows: typeof flatDemografiRows
  ) => {
    const blocks: Array<{
      categoryKey: string;
      categoryLabel: string;
      rows: typeof rowsInPage;
      startIndexInAllRows: number;
    }> = [];

    rowsInPage.forEach((row) => {
      const indexInAll = allRows.findIndex(
        (r) =>
          r.categoryKey === row.categoryKey &&
          r.name === row.name &&
          r.value === row.value
      );

      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock && lastBlock.categoryKey === row.categoryKey) {
        lastBlock.rows.push(row);
      } else {
        blocks.push({
          categoryKey: row.categoryKey,
          categoryLabel: row.categoryLabel,
          rows: [row],
          startIndexInAllRows: indexInAll
        });
      }
    });

    return blocks.flatMap((block, blockIdx) => {
      const isContinuedFromBefore =
        block.startIndexInAllRows > 0 &&
        allRows[block.startIndexInAllRows - 1].categoryKey === block.categoryKey;

      const categoryDisplayName = isContinuedFromBefore
        ? `${block.categoryLabel} (Lanjutan)`
        : block.categoryLabel;

      return block.rows.map((rItem, rIdx) => {
        return (
          <tr
            key={`${rItem.categoryKey}-${blockIdx}-${rIdx}`}
            className={rIdx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'}
          >
            {rIdx === 0 && (
              <td
                rowSpan={block.rows.length}
                className="py-2 px-2.5 font-bold text-slate-900 border-r border-b border-slate-200 align-top w-[22%] break-words text-[9px] text-left bg-white"
                style={{ verticalAlign: 'top', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
              >
                <div className="font-bold text-slate-900 leading-tight">
                  {categoryDisplayName}
                </div>
              </td>
            )}
            <td 
              className="py-1.5 px-2.5 border-r border-b border-slate-200 text-slate-700 w-[48%] break-words text-[9px] text-left"
              style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
            >
              {rItem.name}
            </td>
            <td 
              className="py-1.5 px-2 border-r border-b border-slate-200 text-center font-bold text-slate-900 w-[15%] text-[9px]"
              style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
            >
              {rItem.value}
            </td>
            <td 
              className="py-1.5 px-2 border-b border-slate-200 text-center font-bold text-teal-700 w-[15%] text-[9px]"
              style={{ borderBottom: '1px solid #e2e8f0' }}
            >
              {rItem.pctStr}
            </td>
          </tr>
        );
      });
    });
  };

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

      activeSurveys.forEach(survey => {
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
  }, [activeSurveys]);

  const avgHospitalScore = useMemo(() => {
    return hospitalItemScores.length > 0 
      ? (hospitalItemScores.reduce((acc, curr) => acc + curr.score, 0) / hospitalItemScores.length) 
      : 0;
  }, [hospitalItemScores]);

  const calculateQuestionStats = useCallback((q: any) => {
    let pos = 0, neu = 0, neg = 0, missing = 0;
    
    activeSurveys.forEach(s => {
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
    
    const total = activeSurveys.length;
    let posPercent = 0, neuPercent = 0, negPercent = 0, missingPercent = 0;
    
    if (total > 0) {
      posPercent = Math.round((pos / total) * 100);
      neuPercent = Math.round((neu / total) * 100);
      negPercent = Math.round((neg / total) * 100);
      missingPercent = 100 - posPercent - neuPercent - negPercent;
      if (missingPercent < 0) missingPercent = 0;
    }
    
    return { pos, neu, neg, missing, total, posPercent, neuPercent, negPercent, missingPercent };
  }, [activeSurveys]);

  const getDimensionStatus = (percent: number) => {
    if (percent >= 80) return { label: 'Sangat Baik', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (percent >= 70) return { label: 'Baik', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (percent >= 50) return { label: 'Cukup', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Perlu Perbaikan', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const positionDimensionScores = useMemo(() => {
    const dimStatsMap: Record<string, Record<string, { positive: number; valid: number }>> = {};
    Object.keys(DIMENSI_INFO).forEach(dimId => {
      dimStatsMap[dimId] = {};
      demografiStats.posisiData.forEach(pos => {
        dimStatsMap[dimId][pos.name] = { positive: 0, valid: 0 };
      });
    });

    activeSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      const posName = raw ? (raw.posisiStaf || 'Lainnya') : (survey.unitKerja || 'Perawat');

      Object.keys(DIMENSI_INFO).forEach(dimId => {
        if (!dimStatsMap[dimId][posName]) {
          dimStatsMap[dimId][posName] = { positive: 0, valid: 0 };
        }
        const target = dimStatsMap[dimId][posName];

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
            target.valid++;
            if (item.isReversed) {
              if (val === 1 || val === 2) target.positive++;
            } else {
              if (val === 4 || val === 5) target.positive++;
            }
          });
        } else {
          const score = (survey.dimensiScores as any)?.[dimId] || 3.0;
          const posRate = scoreToPercent(score);
          const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
          target.valid += expectedAnswers;
          target.positive += Math.round(expectedAnswers * (posRate / 100));
        }
      });
    });

    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };
      demografiStats.posisiData.forEach(pos => {
        const stat = dimStatsMap[dimId]?.[pos.name];
        result[pos.name] = stat && stat.valid > 0 ? parseFloat(((stat.positive / stat.valid) * 100).toFixed(1)) : 0;
      });
      return result;
    });
  }, [activeSurveys, demografiStats.posisiData]);

  const unitDimensionScores = useMemo(() => {
    const dimStatsMap: Record<string, Record<string, { positive: number; valid: number }>> = {};
    Object.keys(DIMENSI_INFO).forEach(dimId => {
      dimStatsMap[dimId] = {};
      demografiStats.unitData.forEach(u => {
        dimStatsMap[dimId][u.name] = { positive: 0, valid: 0 };
      });
    });

    activeSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      const unitName = survey.unitKerja || 'Instansi Umum';

      Object.keys(DIMENSI_INFO).forEach(dimId => {
        if (!dimStatsMap[dimId][unitName]) {
          dimStatsMap[dimId][unitName] = { positive: 0, valid: 0 };
        }
        const target = dimStatsMap[dimId][unitName];

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
            target.valid++;
            if (item.isReversed) {
              if (val === 1 || val === 2) target.positive++;
            } else {
              if (val === 4 || val === 5) target.positive++;
            }
          });
        } else {
          const score = (survey.dimensiScores as any)?.[dimId] || 3.0;
          const posRate = scoreToPercent(score);
          const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
          target.valid += expectedAnswers;
          target.positive += Math.round(expectedAnswers * (posRate / 100));
        }
      });
    });

    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };
      demografiStats.unitData.forEach(u => {
        const stat = dimStatsMap[dimId]?.[u.name];
        result[u.name] = stat && stat.valid > 0 ? parseFloat(((stat.positive / stat.valid) * 100).toFixed(1)) : 0;
      });
      return result;
    });
  }, [activeSurveys, demografiStats.unitData]);

  const tenureDimensionScores = useMemo(() => {
    const dimStatsMap: Record<string, Record<string, { positive: number; valid: number }>> = {};
    Object.keys(DIMENSI_INFO).forEach(dimId => {
      dimStatsMap[dimId] = {};
      demografiStats.g1Data.forEach(g1 => {
        dimStatsMap[dimId][g1.name] = { positive: 0, valid: 0 };
      });
    });

    activeSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (!raw) return;
      const g1Name = raw.ansG?.[1] || 'Tidak diisi';

      Object.keys(DIMENSI_INFO).forEach(dimId => {
        if (!dimStatsMap[dimId][g1Name]) {
          dimStatsMap[dimId][g1Name] = { positive: 0, valid: 0 };
        }
        const target = dimStatsMap[dimId][g1Name];

        DIMENSI_ITEMS[dimId].forEach(item => {
          let ansVal: any = undefined;
          if (item.section === 'A') ansVal = raw.ansA?.[item.id];
          else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
          else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
          else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
          else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          target.valid++;
          if (item.isReversed) {
            if (val === 1 || val === 2) target.positive++;
          } else {
            if (val === 4 || val === 5) target.positive++;
          }
        });
      });
    });

    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };
      demografiStats.g1Data.forEach(g1 => {
        const stat = dimStatsMap[dimId]?.[g1.name];
        result[g1.name] = stat && stat.valid > 0 ? parseFloat(((stat.positive / stat.valid) * 100).toFixed(1)) : 0;
      });
      return result;
    });
  }, [activeSurveys, demografiStats.g1Data]);

  const workHoursDimensionScores = useMemo(() => {
    const dimStatsMap: Record<string, Record<string, { positive: number; valid: number }>> = {};
    Object.keys(DIMENSI_INFO).forEach(dimId => {
      dimStatsMap[dimId] = {};
      demografiStats.g3Data.forEach(g3 => {
        dimStatsMap[dimId][g3.name] = { positive: 0, valid: 0 };
      });
    });

    activeSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (!raw) return;
      const g3Name = raw.ansG?.[3] || 'Tidak diisi';

      Object.keys(DIMENSI_INFO).forEach(dimId => {
        if (!dimStatsMap[dimId][g3Name]) {
          dimStatsMap[dimId][g3Name] = { positive: 0, valid: 0 };
        }
        const target = dimStatsMap[dimId][g3Name];

        DIMENSI_ITEMS[dimId].forEach(item => {
          let ansVal: any = undefined;
          if (item.section === 'A') ansVal = raw.ansA?.[item.id];
          else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
          else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
          else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
          else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          target.valid++;
          if (item.isReversed) {
            if (val === 1 || val === 2) target.positive++;
          } else {
            if (val === 4 || val === 5) target.positive++;
          }
        });
      });
    });

    return Object.keys(DIMENSI_INFO).map(dimId => {
      const info = DIMENSI_INFO[dimId];
      const result: Record<string, any> = {
        id: dimId,
        name: info.nama,
        kode: info.kode,
      };
      demografiStats.g3Data.forEach(g3 => {
        const stat = dimStatsMap[dimId]?.[g3.name];
        result[g3.name] = stat && stat.valid > 0 ? parseFloat(((stat.positive / stat.valid) * 100).toFixed(1)) : 0;
      });
      return result;
    });
  }, [activeSurveys, demografiStats.g3Data]);

  const previousYear = useMemo(() => {
    if (selectedComparisonYear !== 'none') return selectedComparisonYear;
    return null;
  }, [selectedComparisonYear]);

  const priorYearScores = useMemo(() => {
    if (!previousYear) return null;
    const priorSurveys = validSurveys.filter(s => s.tanggalInput && s.tanggalInput.includes(previousYear));
    if (priorSurveys.length === 0) return null;
    return computeDimensionScores(priorSurveys);
  }, [previousYear, validSurveys]);

  const itemLevelStrengths = useMemo(() => {
    return [...hospitalItemScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [hospitalItemScores]);

  const itemLevelWeaknesses = useMemo(() => {
    return [...hospitalItemScores]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [hospitalItemScores]);

  // Demographics Breakdown mapped directly from real-time demografiStats
  const demographics = useMemo(() => {
    const total = demografiStats.total || 1;
    
    const formatDataArray = (dataArr: { name: string; value: number }[]) => {
      return dataArr.map(item => ({
        category: item.name,
        count: item.value,
        percentage: `${((item.value / total) * 100).toFixed(1)}%`
      }));
    };

    return {
      profesi: formatDataArray(demografiStats.posisiData),
      masaKerja: formatDataArray(demografiStats.g1Data),
      masaKerjaUnit: formatDataArray(demografiStats.g2Data),
      jamKerja: formatDataArray(demografiStats.g3Data),
      interaksiKontak: formatDataArray(demografiStats.g4Data || []),
      unitKerja: formatDataArray(demografiStats.unitData),
      g4Data: formatDataArray(demografiStats.g4Data || [])
    };
  }, [demografiStats]);

  const demografiNarrative = useMemo(() => {
    const totalResp = demografiStats.total;
    const topPos = demografiStats.posisiData?.[0]?.name || "Perawat";
    const topPosVal = demografiStats.posisiData?.[0]?.value || 0;
    const secondPos = demografiStats.posisiData?.[1]?.name || "";
    const secondPosVal = demografiStats.posisiData?.[1]?.value || 0;
    
    const topUnit = demografiStats.unitData?.[0]?.name || "Instansi Umum";
    const topUnitVal = demografiStats.unitData?.[0]?.value || 0;
    const secondUnit = demografiStats.unitData?.[1]?.name || "";
    const secondUnitVal = demografiStats.unitData?.[1]?.value || 0;
    
    const topTenure = demografiStats.g1Data?.[0]?.name || "1 hingga 5 tahun";
    const topTenureVal = demografiStats.g1Data?.[0]?.value || 0;

    return {
      totalResp,
      topPos,
      topPosVal,
      secondPos,
      secondPosVal,
      topUnit,
      topUnitVal,
      secondUnit,
      secondUnitVal,
      topTenure,
      topTenureVal
    };
  }, [demografiStats]);

  // Overall Safety Rating Distribution
  const safetyRatingData = useMemo(() => {
    let sangatBaik = 0, baik = 0, cukup = 0, kurang = 0, sangatKurang = 0;
    let totalValid = 0;

    activeSurveys.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers || (s as any)._rawAnswers;
      const cnt = s.jumlahResponden || 1;
      
      let val: number | null = null;
      if (raw && raw.ansE !== undefined && raw.ansE !== null && raw.ansE !== 9) {
        if (typeof raw.ansE === 'number') {
          val = raw.ansE;
        } else if (typeof raw.ansE === 'string') {
          const parsed = parseInt(raw.ansE, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) val = parsed;
        } else if (typeof raw.ansE === 'object' && raw.ansE !== null) {
          const v = raw.ansE[1] || raw.ansE['1'] || Object.values(raw.ansE)[0];
          const parsed = parseInt(String(v), 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) val = parsed;
        }
      }

      if (val === null && (s as any).ansE !== undefined && (s as any).ansE !== null) {
        const parsed = parseInt(String((s as any).ansE), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) val = parsed;
      }

      if (val !== null && val >= 1 && val <= 5) {
        totalValid += cnt;
        if (val === 5) sangatBaik += cnt;
        else if (val === 4) baik += cnt;
        else if (val === 3) cukup += cnt;
        else if (val === 2) kurang += cnt;
        else if (val === 1) sangatKurang += cnt;
      } else {
        const scoreE1 = (s.dimensiScores as any)?.E1;
        if (typeof scoreE1 === 'number' && scoreE1 > 0) {
          totalValid += cnt;
          const rounded = Math.min(5, Math.max(1, Math.round(scoreE1)));
          if (rounded === 5) sangatBaik += cnt;
          else if (rounded === 4) baik += cnt;
          else if (rounded === 3) cukup += cnt;
          else if (rounded === 2) kurang += cnt;
          else if (rounded === 1) sangatKurang += cnt;
        }
      }
    });

    if (totalValid === 0) {
      // Fallback default distribution matching AnalisaDataTab default benchmark
      const total = totalActual || 100;
      sangatBaik = Math.round(total * 0.28);
      baik = Math.round(total * 0.39);
      cukup = Math.round(total * 0.23);
      kurang = Math.round(total * 0.09);
      sangatKurang = Math.max(0, total - (sangatBaik + baik + cukup + kurang));
      totalValid = total;
    }

    const sangBaikPct = totalValid > 0 ? (sangatBaik / totalValid) * 100 : 0;
    const baikPct = totalValid > 0 ? (baik / totalValid) * 100 : 0;
    const cukupPct = totalValid > 0 ? (cukup / totalValid) * 100 : 0;
    const kurangPct = totalValid > 0 ? (kurang / totalValid) * 100 : 0;
    const sangatKurangPct = totalValid > 0 ? (sangatKurang / totalValid) * 100 : 0;
    const positivePct = sangBaikPct + baikPct;

    return {
      totalValid,
      distribution: [
        { name: 'Sangat Baik', count: sangatBaik, percentageVal: sangBaikPct, percentage: `${sangBaikPct.toFixed(1)}%` },
        { name: 'Baik', count: baik, percentageVal: baikPct, percentage: `${baikPct.toFixed(1)}%` },
        { name: 'Cukup', count: cukup, percentageVal: cukupPct, percentage: `${cukupPct.toFixed(1)}%` },
        { name: 'Kurang', count: kurang, percentageVal: kurangPct, percentage: `${kurangPct.toFixed(1)}%` },
        { name: 'Sangat Kurang', count: sangatKurang, percentageVal: sangatKurangPct, percentage: `${sangatKurangPct.toFixed(1)}%` }
      ],
      positivePct
    };
  }, [activeSurveys, totalActual]);

  // Reported Events Distribution (Integrated with D3: Jumlah Insiden Keselamatan Pasien Yang Dilaporkan)
  const reportedEventsData = useMemo(() => {
    let tda = 0, r12 = 0, r35 = 0, r610 = 0, r11p = 0;
    let totalValid = 0;

    activeSurveys.forEach(s => {
      const raw = (s.dimensiScores as any)?._rawAnswers || (s as any)._rawAnswers;
      const cnt = s.jumlahResponden || 1;
      let val: any = null;
      if (raw) {
        val = raw.ansD?.[3] || raw.ansD?.[1] || raw.ansD;
      }
      if (val !== null && val !== undefined) {
        totalValid += cnt;
        if (val === 'Tidak ada' || val === 'Tidak Pernah' || val === 1 || val === '1') {
          tda += cnt;
        } else if (val === '1 sampai 2' || val === '1–2 Kejadian' || val === 2 || val === '2') {
          r12 += cnt;
        } else if (val === '3 sampai 5' || val === '3–5 Kejadian' || val === 3 || val === '3') {
          r35 += cnt;
        } else if (val === '6 hingga 10' || val === '6 sampai 10' || val === '6–10 Kejadian' || val === 4 || val === '4') {
          r610 += cnt;
        } else if (val === '11 atau lebih' || val === '≥11 Kejadian' || val === 5 || val === '5') {
          r11p += cnt;
        } else {
          tda += Math.round(cnt * 0.55);
          r12 += Math.round(cnt * 0.26);
          r35 += Math.round(cnt * 0.13);
          r610 += Math.round(cnt * 0.04);
          r11p += Math.max(0, cnt - Math.round(cnt * 0.98));
        }
      } else {
        tda += Math.round(cnt * 0.55);
        r12 += Math.round(cnt * 0.26);
        r35 += Math.round(cnt * 0.13);
        r610 += Math.round(cnt * 0.04);
        r11p += Math.max(0, cnt - Math.round(cnt * 0.98));
      }
    });

    const total = (tda + r12 + r35 + r610 + r11p) || totalActual || 1;
    const reportedAnyPct = total > 0 ? (((total - tda)) / total) * 100 : 0;

    return {
      distribution: [
        { name: 'Tidak Pernah', count: tda, percentageVal: (tda / total) * 100, percentage: `${((tda / total) * 100).toFixed(1)}%` },
        { name: '1–2 Kejadian', count: r12, percentageVal: (r12 / total) * 100, percentage: `${((r12 / total) * 100).toFixed(1)}%` },
        { name: '3–5 Kejadian', count: r35, percentageVal: (r35 / total) * 100, percentage: `${((r35 / total) * 100).toFixed(1)}%` },
        { name: '6–10 Kejadian', count: r610, percentageVal: (r610 / total) * 100, percentage: `${((r610 / total) * 100).toFixed(1)}%` },
        { name: '≥11 Kejadian', count: r11p, percentageVal: (r11p / total) * 100, percentage: `${((r11p / total) * 100).toFixed(1)}%` }
      ],
      reportedAnyPct
    };
  }, [activeSurveys, totalActual]);

  const safetyRatingHighestCat = useMemo(() => {
    if (!safetyRatingData.distribution || safetyRatingData.distribution.length === 0) {
      return { name: 'Baik', count: 0, percentage: '0%' };
    }
    let maxItem = safetyRatingData.distribution[0];
    safetyRatingData.distribution.forEach(item => {
      if (item.count > maxItem.count) {
        maxItem = item;
      }
    });
    return maxItem;
  }, [safetyRatingData]);

  const reportedEventsHighestCat = useMemo(() => {
    if (!reportedEventsData.distribution || reportedEventsData.distribution.length === 0) {
      return { name: 'Tidak Pernah', count: 0, percentage: '0%' };
    }
    let maxItem = reportedEventsData.distribution[0];
    reportedEventsData.distribution.forEach(item => {
      if (item.count > maxItem.count) {
        maxItem = item;
      }
    });
    return maxItem;
  }, [reportedEventsData]);

  // Strengths (≥75%), Areas for Improvement (<50%), Moderate (50-74%)
  const getDimensionStrengthInterpretasi = (id: string, name: string, pct: number) => {
    switch (id) {
      case 'd1': return 'Staf merasakan koordinasi dan solidaritas internal unit kerja terjalin sangat baik.';
      case 'd2': return 'Alokasi ketenagaan dan ritme kerja dinilai memadai dalam mendukung pelayanan yang aman.';
      case 'd3': return 'Adanya kemauan kolektif untuk belajar dari kesalahan dan memperbaiki proses pelayanan.';
      case 'd4': return 'Tercipta suasana kerja non-punitif di mana kesalahan ditangani secara konstruktif.';
      case 'd5': return 'Kepala ruangan dan pimpinan unit dinilai mendukung dan mengapresiasi penerapan prinsip keselamatan pasien.';
      case 'd6': return 'Staf merasa aman dan berani angkat bicara jika menemukan potensi bahaya keselamatan pasien.';
      case 'd7': return 'Umpan balik dan diskusi evaluasi pasca-kejadian berjalan secara terbuka dan konsisten.';
      case 'd8': return 'Tingkat kesadaran dan keaktifan staf dalam melaporkan insiden keselamatan pasien sangat tinggi.';
      case 'd9': return 'Manajemen rumah sakit terbukti menempatkan keselamatan pasien sebagai prioritas utama organisasi.';
      case 'd10': return 'Proses transfer informasi dan serah terima pasien antar-unit/shift berlangsung efektif dan akurat.';
      default: return `Staf merasakan koordinasi dan komitmen budaya keselamatan yang terjalin sangat baik pada dimensi ini (${pct.toFixed(1)}%).`;
    }
  };

  const getDimensionImprovementInterpretasi = (id: string, name: string, pct: number) => {
    switch (id) {
      case 'd1': return 'Masih terdapat hambatan koordinasi dan kolaborasi antar-staf dalam unit kerja saat beban tinggi.';
      case 'd2': return 'Beban kerja yang tinggi, keterbatasan staf, dan tempo kerja yang tergesa-gesa dirasakan menjadi faktor risiko terjadinya kesalahan pelayanan.';
      case 'd3': return 'Evaluasi kejadian belum sepenuhnya ditindaklanjuti menjadi perbaikan sistemik yang berkelanjutan.';
      case 'd4': return 'Masih ada persepsi atau rasa takut disalahkan (punitive atmosphere) di kalangan staf saat terjadi insiden keselamatan pasien.';
      case 'd5': return 'Dukungan dan respons kepemimpinan klinis terhadap isu keselamatan pasien di unit belum dirasakan optimal oleh staf.';
      case 'd6': return 'Staf masih ragu atau enggan angkat bicara saat melihat tindakan yang berisiko keselamatan pasien.';
      case 'd7': return 'Penyampaian umpan balik dan informasi perbaikan pasca-laporan insiden belum menjangkau seluruh staf.';
      case 'd8': return 'Masih terdapat kecenderungan under-reporting untuk kejadian nyaris cedera (KNC) maupun kondisi potensial cedera (KPC).';
      case 'd9': return 'Komitmen dan alokasi sumber daya manajemen untuk keselamatan pasien dirasakan perlu ditingkatkan secara nyata.';
      case 'd10': return 'Informasi penting mengenai kondisi pasien masih berpotensi terlewat saat pergantian shift atau transfer antar-unit.';
      default: return `Capaian respon positif (${pct.toFixed(1)}%) masih di bawah target minimal AHRQ (<50%) dan memerlukan perhatian prioritas.`;
    }
  };

  const strengths = useMemo(() => {
    return dimensionScores
      .filter(d => d.percentage >= 75)
      .map(d => ({
        kode: d.kode,
        nama: d.nama,
        id: d.id,
        percentage: d.percentage,
        interpretasi: getDimensionStrengthInterpretasi(d.id, d.nama, d.percentage)
      }));
  }, [dimensionScores]);

  const improvements = useMemo(() => {
    return dimensionScores
      .filter(d => d.percentage < 50)
      .map(d => ({
        kode: d.kode,
        nama: d.nama,
        id: d.id,
        percentage: d.percentage,
        interpretasi: getDimensionImprovementInterpretasi(d.id, d.nama, d.percentage)
      }));
  }, [dimensionScores]);

  const moderates = useMemo(() => {
    return dimensionScores
      .filter(d => d.percentage >= 50 && d.percentage < 75)
      .map(d => ({
        kode: d.kode,
        nama: d.nama,
        id: d.id,
        percentage: d.percentage,
        interpretasi: `Capaian ${d.percentage.toFixed(1)}% berada pada tingkat sedang yang membutuhkan penguatan konsistensi di tingkat unit.`
      }));
  }, [dimensionScores]);

  // Dynamic Strategic Recommendations
  const recommendations = useMemo(() => {
    const shortTerm: string[] = [];
    const midTerm: string[] = [];
    const longTerm: string[] = [];

    // Tailored based on low scores
    const d4 = dimensionScores.find(d => d.kode === 'D4');
    const d2 = dimensionScores.find(d => d.kode === 'D2');
    const d8 = dimensionScores.find(d => d.kode === 'D8');
    const d10 = dimensionScores.find(d => d.kode === 'D10');

    if (!d4 || d4.percentage < 60) {
      shortTerm.push('Sosialisasikan secara masif prinsip Just Culture dan jaminan non-punitif dalam pelaporan insiden keselamatan pasien.');
      midTerm.push('Lakukan audit internal terhadap tindak lanjut laporan insiden agar staf merasakan manfaat nyata dari pelaporan.');
    } else {
      shortTerm.push('Pertahankan sosialisasi rutin mengenai pentingnya keterbukaan komunikasi keselamatan.');
    }

    if (!d2 || d2.percentage < 60) {
      shortTerm.push('Lakukan evaluasi ulang beban kerja (workload analysis) pada unit kerja dengan tingkat kesibukan tinggi.');
      midTerm.push('Atur ulang jadwal shift dan rotasi staf untuk mencegah kelelahan fisik (burnout) yang meningkatkan risiko kesalahan.');
    }

    if (!d8 || d8.percentage < 60) {
      shortTerm.push('Sederhanakan formulir dan alur pelaporan insiden agar dapat diakses dengan cepat secara digital.');
    }

    if (!d10 || d10.percentage < 60) {
      midTerm.push('Terapkan metode komunikasi standar (seperti SBAR / TBLK) secara ketat pada setiap prosedur serah terima pasien.');
    }

    // Default fallbacks if list is short
    if (shortTerm.length < 2) {
      shortTerm.push('Adakan rapat evaluasi rutin komite keselamatan pasien bersama jajaran kepemimpinan medis.');
    }
    if (midTerm.length < 2) {
      midTerm.push('Sediakan program pelatihan interprofesi berkala mengenai keselamatan pasien untuk seluruh staf klinis.');
    }
    longTerm.push('Integrasikan indikator budaya keselamatan pasien dalam evaluasi kinerja tahunan seluruh unit kerja.');
    longTerm.push('Laksanakan pengadaan infrastruktur digital pendukung keselamatan pasien secara berkesinambungan.');

    return {
      jangkaPendek: shortTerm,
      jangkaMenengah: midTerm,
      jangkaPanjang: longTerm
    };
  }, [dimensionScores]);

  // Qualitative Comments Analysis
  const commentsStats = useMemo(() => {
    let total = 0;
    let positiveCount = 0;
    const posUnits: Record<string, number> = {};
    const posPositions: Record<string, number> = {};

    activeSurveys.forEach(survey => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      const text = (survey as any).komentar || raw?.komentar || raw?.bagian_h || raw?.bagianH || (survey.dimensiScores as any)?.komentar || '';
      
      if (text && typeof text === 'string' && text.trim().length > 0) {
        total++;
        if (isPositiveComment(text)) {
          positiveCount++;
          const unitName = raw?.unitKerja || survey.unitKerja || 'Umum';
          const posName = raw?.posisiStaf || 'Tenaga Kesehatan';
          posUnits[unitName] = (posUnits[unitName] || 0) + 1;
          posPositions[posName] = (posPositions[posName] || 0) + 1;
        }
      }
    });

    const topPosUnit = Object.entries(posUnits).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unit Pelayanan';
    const topPosPosition = Object.entries(posPositions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Tenaga Kesehatan';

    const constructiveCount = total - positiveCount;
    const positivePercentage = total > 0 ? (positiveCount / total) * 100 : 0;
    const constructivePercentage = total > 0 ? (constructiveCount / total) * 100 : 0;

    const currentYearStr = selectedYear === 'Semua Tahun' ? new Date().getFullYear().toString() : selectedYear;

    const analysisText = `Berdasarkan analisis kualitatif dari total ${total} komentar responden pada survei budaya keselamatan pasien tahun ${currentYearStr} di ${activeHospitalName}, secara otomatis terfilter ${positiveCount} komentar positif (${positivePercentage.toFixed(1)}% dari keseluruhan komentar). Apresiasi positif terbanyak disampaikan oleh staf dari kelompok posisi ${topPosPosition} di ${topPosUnit}, yang menyoroti aspek kekuatan seperti tingginya rasa kekeluargaan, kerjasama tim yang kompak, komunikasi yang suportif, serta komitmen pimpinan dalam menjaga keselamatan pasien.`;

    const recs = [
      `Pertahankan dan dokumentasikan praktik-praktik baik (best practices) yang telah diapresiasi oleh responden di unit "${topPosUnit}" untuk dijadikan percontohan di seluruh unit kerja ${activeHospitalName}.`,
      `Berikan bentuk penghargaan atau apresiasi (Safety Recognition) secara berkala kepada tim dan pimpinan unit yang berhasil mempertahankan persepsi iklim kerja positif.`,
      `Manfaatkan poin-poin apresiasi dari ${positiveCount} komentar positif responden sebagai materi 'Success Story' dalam kegiatan Safety Briefing dan Nurse Huddles untuk membangun motivasi tim.`,
      `Sinergikan apresiasi positif staf dengan penyelesaian ${constructiveCount} masukan konstruktif guna menyempurnakan fasilitas, alur kerja, dan jaminan keselamatan secara berkelanjutan.`
    ];

    return {
      total,
      positive: positiveCount,
      constructive: constructiveCount,
      positivePercentage: parseFloat(positivePercentage.toFixed(1)),
      constructivePercentage: parseFloat(constructivePercentage.toFixed(1)),
      recommendations: recs,
      analysisText
    };
  }, [activeSurveys, activeHospitalName, selectedYear]);

  // Benchmark Approved Hospitals List
  const approvedBenchmarkHospitals = useMemo(() => {
    return accounts.filter(a => a.namaRs && a.namaRs !== activeHospitalName);
  }, [accounts, activeHospitalName]);

  const selectedBenchmarkHospital = useMemo(() => {
    if (selectedBenchmarkId === 'none') return null;
    return accounts.find(a => a.id === selectedBenchmarkId || a.username === selectedBenchmarkId) || null;
  }, [accounts, selectedBenchmarkId]);

  // Prevent benchmark from ever being the logged-in hospital
  React.useEffect(() => {
    if (
      selectedBenchmarkId !== 'none' &&
      (selectedBenchmarkId === hospitalId ||
        selectedBenchmarkId === identifier ||
        selectedBenchmarkId === namaRs ||
        (selectedBenchmarkHospital &&
          (selectedBenchmarkHospital.id === hospitalId ||
            selectedBenchmarkHospital.username === identifier ||
            selectedBenchmarkHospital.namaRs.toLowerCase() === namaRs.toLowerCase())))
    ) {
      setSelectedBenchmarkId('none');
    }
  }, [hospitalId, identifier, namaRs, selectedBenchmarkId, selectedBenchmarkHospital]);

  // Request status for selected hospital
  const currentRequestForSelectedHospital = useMemo(() => {
    if (!selectedBenchmarkHospital) return null;
    return requests.find(r => 
      (r.requester_id === hospitalId || r.requester_name.toLowerCase() === namaRs.toLowerCase()) &&
      (r.target_id === selectedBenchmarkHospital.id || r.target_name.toLowerCase() === selectedBenchmarkHospital.namaRs.toLowerCase())
    );
  }, [requests, selectedBenchmarkHospital, hospitalId, namaRs]);

  const benchmarkData = useMemo(() => {
    if (!selectedBenchmarkHospital || targetHospitalSurveys.length === 0) return null;
    
    // Filter target surveys by selected year if applicable
    const filteredTarget = targetHospitalSurveys.filter(s => {
      if (selectedYear === 'Semua Tahun') return true;
      return s.tanggalInput && s.tanggalInput.includes(selectedYear);
    });

    const targetScores = computeDimensionScores(filteredTarget);

    return dimensionScores.map(d => {
      const bench = targetScores.find(ts => ts.kode === d.kode);
      const benchPct = bench ? bench.percentage : d.benchmarkMin;
      return {
        kode: d.kode,
        nama: d.nama,
        rsPct: d.percentage,
        benchPct,
        diff: d.percentage - benchPct
      };
    });
  }, [selectedBenchmarkHospital, targetHospitalSurveys, dimensionScores, selectedYear]);

  // Year Comparison Data
  const yearComparisonData = useMemo(() => {
    if (availableYears.length <= 2) return null;
    const yearScores: { year: string; average: number }[] = [];
    availableYears.filter(y => y !== 'Semua Tahun').forEach(year => {
      const yrSurveys = validSurveys.filter(s => s.tanggalInput && s.tanggalInput.includes(year));
      if (yrSurveys.length > 0) {
        const yrDim = computeDimensionScores(yrSurveys);
        const avg = yrDim.reduce((acc, d) => acc + d.percentage, 0) / yrDim.length;
        yearScores.push({ year, average: avg });
      }
    });
    return yearScores.sort((a, b) => a.year.localeCompare(b.year));
  }, [availableYears, validSurveys]);

  // Unduh / Cetak Laporan PDF via html2canvas-pro & jsPDF engine (100% identik dengan tampilan di aplikasi tanpa pergeseran layout)
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });

    const prevZoom = zoomLevel;
    // Temporarily reset zoom to 100% so elements are rendered at canonical 1:1 scale
    if (zoomLevel !== 100) {
      setZoomLevel(100);
    }

    // Scroll parent window to top to ensure clean viewport geometry and prevent scroll clipping
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0 });
    }

    // Allow DOM to settle and ensure all fonts (Poppins) are loaded
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
    // Give enough time (450ms) for zoom and layout states to fully settle without animation delay
    await new Promise(resolve => setTimeout(resolve, 450));

    try {
      const pageElements = Array.from(document.querySelectorAll<HTMLElement>('#print-area .word-page'));
      if (!pageElements || pageElements.length === 0) {
        throw new Error('Tidak ada halaman laporan yang ditemukan.');
      }

      const totalPages = pageElements.length;
      setExportProgress({ current: 1, total: totalPages });

      const firstIsLandscape = pageElements[0].classList.contains('word-page-landscape');
      const pdf = new jsPDF({
        orientation: firstIsLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.setProperties({
        title: `Laporan Survei Budaya Keselamatan Pasien - ${activeHospitalName}`,
        subject: 'AHRQ Hospital Survey on Patient Safety Culture (SOPS) Version 2.0',
        author: activeHospitalName || 'Rumah Sakit',
        keywords: 'AHRQ, SOPS 2.0, Keselamatan Pasien, Patient Safety Culture',
        creator: 'Sistem Survei Budaya Keselamatan Pasien AHRQ SOPS 2.0'
      });

      for (let i = 0; i < totalPages; i++) {
        const pageEl = pageElements[i];
        setExportProgress({ current: i + 1, total: totalPages });

        const isLandscape = pageEl.classList.contains('word-page-landscape');
        const targetWidth = isLandscape ? 1123 : 794;

        // Render page with 2.5x high-res scale to ensure extremely sharp, vector-like typography and graphics
        // We do NOT manually override coordinate variables (x, y, scrollX, scrollY, windowHeight, width, height)
        // to let html2canvas calculate the bounding rectangles of pages naturally without scroll/offset shifts!
        const canvas = await html2canvas(pageEl, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 30000,
          windowWidth: targetWidth, // Force exact width matching A4 portrait/landscape layout
          onclone: (clonedDoc, clonedEl) => {
            // 1. Inject Poppins and print-color-adjust css into cloned document
            const styleEl = clonedDoc.createElement('style');
            styleEl.textContent = `
              @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');
              * {
                font-family: 'Poppins', var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .word-page {
                box-shadow: none !important;
                border: none !important;
              }
            `;
            clonedDoc.head.appendChild(styleEl);

            // 2. Clear borders and shadows on all pages in the cloned document for a clean PDF look
            const allPages = clonedDoc.querySelectorAll('.word-page');
            allPages.forEach((p: any) => {
              p.style.boxShadow = 'none';
              p.style.border = 'none';
              p.style.margin = '0 auto';
            });

            // 3. Force instant, animation-free layout reset in cloned printArea
            const printArea = clonedDoc.getElementById('print-area');
            if (printArea) {
              printArea.style.transform = 'none';
              printArea.style.webkitTransform = 'none';
              printArea.style.transition = 'none';
            }

            // 4. Synchronize all SVG and Recharts charts inner contents & styles from live DOM to cloned DOM
            const origSvgs = pageEl.querySelectorAll('svg');
            const clonedSvgs = clonedEl.querySelectorAll('svg');
            origSvgs.forEach((origSvg, idx) => {
              const clSvg = clonedSvgs[idx];
              if (clSvg) {
                clSvg.innerHTML = origSvg.innerHTML; // Copy full pre-rendered SVG pathways
                const rect = origSvg.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  clSvg.setAttribute('width', String(Math.round(rect.width)));
                  clSvg.setAttribute('height', String(Math.round(rect.height)));
                  clSvg.style.width = `${Math.round(rect.width)}px`;
                  clSvg.style.height = `${Math.round(rect.height)}px`;
                }
              }
            });

            // 5. Ensure all SVG and Recharts text elements explicitly use Poppins font
            const svgTexts = clonedEl.querySelectorAll('svg text, .recharts-text, .recharts-surface text');
            svgTexts.forEach((el: any) => {
              el.style.fontFamily = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            });

            // 6. Ensure recharts containers retain full width & height
            const rechartsContainers = clonedEl.querySelectorAll('.recharts-responsive-container');
            rechartsContainers.forEach((el: any) => {
              el.style.width = '100%';
              el.style.height = '100%';
            });
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;

        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }

        // Use high-quality default compression to maintain crystal-clear text and zero blurring (avoid 'FAST')
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      const safeHospitalName = (activeHospitalName || 'RS').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeYear = selectedYear === 'Semua Tahun' ? new Date().getFullYear() : selectedYear;
      const docTitle = `Laporan_Survei_Budaya_Keselamatan_Pasien_${safeHospitalName}_${safeYear}.pdf`;

      pdf.save(docTitle);
    } catch (err) {
      console.error('Error exporting PDF via html2canvas-pro/jsPDF:', err);
      window.print();
    } finally {
      if (prevZoom !== 100) {
        setZoomLevel(prevZoom);
      }
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* CONTROL BAR - MATCHING ANALISA DATA HEADER CARD DESIGN */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="print:hidden max-w-7xl mx-auto"
      >
        <div className="relative overflow-hidden bg-[#14B8A6] rounded-[32px] p-8 md:p-10 shadow-2xl shadow-teal-950/30 mb-8 border border-white/20 backdrop-blur-xl group">
          {/* Decorative Ambient Glass Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-1.5">
            <h1 className="text-[35px] font-black text-white tracking-tight leading-tight">
              Laporan Survei Budaya Keselamatan Pasien
            </h1>
            <p className="text-teal-50 text-[14px] font-medium leading-relaxed w-full opacity-90">
              Menampilkan laporan resmi hasil Survei Budaya Keselamatan Pasien AHRQ SOPS v2.0 secara realtime berdasarkan data survei yang telah tersimpan.
            </p>
          </div>
        </div>

        {/* Action Bar Below Header - Tosca Glassmorphism 2.0 Single Row */}
        <div className="flex flex-wrap items-center justify-start gap-3 bg-teal-500/15 backdrop-blur-md border border-white/30 rounded-[20px] p-3 shadow-[0_8px_32px_0_rgba(20,184,166,0.15)] mb-10 overflow-x-auto hide-scrollbar">
          
          {/* 1. Pilih Tahun */}
          <div className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-teal-200/30 rounded-xl px-3.5 h-[42px] text-xs font-bold text-teal-900 transition-all shadow-sm backdrop-blur-md shrink-0">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-teal-800 font-medium whitespace-nowrap">Tahun:</span>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-extrabold text-teal-950 outline-none cursor-pointer focus:ring-0 pr-1"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* 2. Perbandingan Periode */}
          <div className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-teal-200/30 rounded-xl px-3.5 h-[42px] text-xs font-bold text-teal-900 transition-all shadow-sm backdrop-blur-md shrink-0">
            <RefreshCw className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-teal-800 font-medium whitespace-nowrap">Perbandingan Periode:</span>
            <select 
              value={selectedComparisonYear} 
              onChange={e => setSelectedComparisonYear(e.target.value)}
              className="bg-transparent font-extrabold text-teal-950 outline-none cursor-pointer focus:ring-0 pr-1 max-w-[140px]"
            >
              <option value="none">Tanpa Perbandingan</option>
              {availableYears.filter(y => y !== 'Semua Tahun' && y !== selectedYear).map(y => (
                <option key={y} value={y}>vs {y}</option>
              ))}
            </select>
          </div>

          {/* 3. Benchmark Rumah Sakit */}
          <div className={`flex items-center gap-2 border rounded-xl px-3.5 h-[42px] text-xs font-bold transition-all shadow-sm backdrop-blur-md shrink-0 ${selectedBenchmarkId !== 'none' ? 'bg-teal-500/20 border-teal-500/40 text-teal-900' : 'bg-white/60 hover:bg-white/80 border-teal-200/30 text-teal-900'}`}>
            <Building2 className={`w-4 h-4 shrink-0 text-teal-600`} />
            <span className={`${selectedBenchmarkId !== 'none' ? 'text-teal-900' : 'text-teal-800'} font-medium whitespace-nowrap`}>Benchmark RS:</span>
            <select 
              value={selectedBenchmarkId} 
              onChange={e => setSelectedBenchmarkId(e.target.value)}
              className={`bg-transparent font-extrabold outline-none cursor-pointer focus:ring-0 pr-1 max-w-[160px] truncate text-teal-950`}
            >
              <option value="none">Benchmark RS</option>
              {accounts.filter(a => a.role === 'rs' && a.id !== (hospitalId || identifier)).map(rs => {
                const isApproved = requests.some(r => 
                  (r.requester_id === hospitalId || r.requester_name.toLowerCase() === namaRs.toLowerCase()) &&
                  (r.target_id === rs.id || r.target_name.toLowerCase() === rs.namaRs.toLowerCase()) &&
                  r.status === 'approved'
                );
                return (
                  <option key={rs.id} value={rs.id}>
                    {rs.namaRs} {isApproved ? '✓' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Spacer to push zoom and download to the right on large screens */}
          <div className="flex-1 hidden xl:block"></div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-white/60 hover:bg-white/80 border border-teal-200/30 rounded-xl p-1 h-[42px] text-xs font-bold text-teal-900 transition-all shadow-sm backdrop-blur-md shrink-0">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/40 active:scale-95 transition-all cursor-pointer text-teal-850 font-bold"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 stroke-[2.5] text-teal-600" />
              <span className="hidden sm:inline">Zoom Out</span>
            </button>
            
            <button 
              onClick={() => setZoomLevel(100)}
              className="px-3 py-1.5 text-[11px] font-black text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-md transition-all cursor-pointer mx-1"
              title="Reset Zoom (100%)"
            >
              {zoomLevel}%
            </button>

            <button 
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/40 active:scale-95 transition-all cursor-pointer text-teal-850 font-bold"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 stroke-[2.5] text-teal-600" />
              <span className="hidden sm:inline">Zoom In</span>
            </button>
          </div>

          {/* Download Dokumen PDF */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              title="Unduh / Cetak Laporan PDF"
              className="flex items-center gap-2 px-4 h-[42px] bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-75 disabled:cursor-not-allowed border border-rose-400/50 rounded-xl shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 font-bold text-xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>
                    {exportProgress && exportProgress.total > 0 
                      ? `Menyiapkan PDF (${exportProgress.current}/${exportProgress.total})...` 
                      : 'Menyiapkan PDF...'}
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-white" />
                  <span>Unduh PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @page page-landscape {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          aside, nav, header, .print\\:hidden, .no-print {
            display: none !important;
          }
          #print-area {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            transform: none !important;
          }
          .print-page, .word-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            padding-top: 2.2cm !important;
            padding-bottom: 2cm !important;
            padding-left: 2.5cm !important;
            padding-right: 2cm !important;
            box-sizing: border-box !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .print-page.word-page-landscape, .word-page.word-page-landscape {
            page: page-landscape !important;
            width: 297mm !important;
            min-height: 210mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            padding-top: 1.8cm !important;
            padding-bottom: 1.8cm !important;
            padding-left: 2.2cm !important;
            padding-right: 2.2cm !important;
          }
          .print-page.cover-page, .word-page.cover-page {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
          }
          section, article, table, tr, .card, .chart-container, .recharts-wrapper, .recharts-surface, .keep-together {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 100% !important;
            min-height: 180px !important;
          }
          .recharts-text, svg text {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
        }
        .preview-container {
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.04);
          border-radius: 1rem;
        }
        .word-page {
          width: 794px;
          height: 1123px;
          min-height: 1123px;
          max-height: 1123px;
          background-color: white;
          box-sizing: border-box;
          padding-top: 83px;
          padding-bottom: 76px;
          padding-left: 94px;
          padding-right: 76px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 8px -2px rgba(15, 23, 42, 0.04);
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .word-page.cover-page {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          position: relative !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        .word-page.word-page-landscape {
          width: 1123px !important;
          height: 794px !important;
          min-height: 794px !important;
          max-height: 794px !important;
          padding-top: 68px !important;
          padding-bottom: 68px !important;
          padding-left: 83px !important;
          padding-right: 83px !important;
        }
      ` }} />

      {/* Benchmark Access Status Alert */}
      {selectedBenchmarkId !== 'none' && selectedBenchmarkHospital && (
        <AnimatePresence mode="wait">
          {!currentRequestForSelectedHospital ? (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 shadow-sm mx-4"
            >
              <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-semibold">Izin Akses Diperlukan</p>
                <p className="text-xs text-blue-600 font-medium">Anda belum meminta izin benchmark ke {selectedBenchmarkHospital.namaRs}. Silakan ajukan permintaan di tab <strong>Analisa Data</strong>.</p>
              </div>
            </motion.div>
          ) : currentRequestForSelectedHospital.status === 'pending' ? (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 shadow-sm mx-4"
            >
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-semibold">Menunggu Persetujuan</p>
                <p className="text-xs text-amber-600 font-medium">Permintaan benchmark Anda ke {selectedBenchmarkHospital.namaRs} sedang menunggu persetujuan.</p>
              </div>
            </motion.div>
          ) : currentRequestForSelectedHospital.status === 'rejected' ? (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 shadow-sm mx-4"
            >
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-rose-800 font-semibold">Akses Benchmark Ditolak</p>
                <p className="text-xs text-rose-600 font-medium">Rumah Sakit tujuan telah menolak permintaan benchmark data Anda.</p>
              </div>
            </motion.div>
          ) : currentRequestForSelectedHospital.status === 'revoked' ? (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm mx-4"
            >
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-slate-800 font-semibold">Akses Benchmark Dicabut</p>
                <p className="text-xs text-slate-600 font-medium text-balance">Akses Benchmark telah dicabut oleh Rumah Sakit tujuan.</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* DOCUMENT PAPER DISPLAY CONTAINER (A4 SEPARATED SHEETS) */}
      <div className="w-full preview-container rounded-2xl p-4 sm:p-8 flex flex-col items-center gap-8 overflow-x-auto">
        <div 
          ref={printRef}
          id="print-area"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: 'top center'
          }}
          className="flex flex-col items-center gap-8 print:gap-0 font-sans leading-relaxed w-full max-w-[297mm] transition-transform duration-200"
        >

 {/* LEMBAR 1: COVER PAGE */}
          <div className="w-full flex flex-col items-center">
            <div 
              className="word-page cover-page print-page bg-white relative overflow-hidden flex flex-col justify-between select-none"
              style={{ width: '794px', height: '1123px', minHeight: '1123px' }}
            >
              
               {/* BACKGROUND VECTOR GEOMETRICS (Top Right Lines + Bottom Right Diagonal Teal Polygon & Stripes) */}
              <div className="absolute top-0 left-0 pointer-events-none z-0" style={{ width: '794px', height: '1123px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" className="w-full h-full" viewBox="0 0 800 1130" preserveAspectRatio="none" fill="none" style={{ width: '794px', height: '1123px' }}>
                  {/* Top-Right Corner Accent Lines */}
                  <line x1="580" y1="0" x2="800" y2="220" stroke="#007a78" strokeWidth="2.5" opacity="0.4" />
                  <line x1="620" y1="0" x2="800" y2="180" stroke="#007a78" strokeWidth="12" opacity="0.85" />
                  <line x1="680" y1="0" x2="800" y2="120" stroke="#007a78" strokeWidth="22" opacity="0.15" />

                  {/* Main Teal Polygon Cutting Diagonally */}
                  {/* Layer 1: Dark Teal Shadow Base */}
                  <path d="M 0 1130 L 0 960 L 800 250 L 800 1130 Z" fill="#005250" />
                  
                  {/* Layer 2: Main Deep Teal Polygon */}
                  <path d="M 0 1130 L 0 990 L 800 280 L 800 1130 Z" fill="#007a78" />

                  {/* Layer 3: Dark Accent Bottom-Right Wedge */}
                  <path d="M 200 1130 L 800 630 L 800 1130 Z" fill="#004846" opacity="0.6" />

                  {/* Parallel Diagonal Accent Stripes along the slope edge */}
                  {/* Thick Stripe 1 */}
                  <line x1="0" y1="945" x2="800" y2="235" stroke="#007a78" strokeWidth="18" />
                  {/* White Gap Line */}
                  <line x1="0" y1="922" x2="800" y2="212" stroke="#ffffff" strokeWidth="6" />
                  {/* Thin Accent Stripe 2 */}
                  <line x1="0" y1="906" x2="800" y2="196" stroke="#007a78" strokeWidth="4" />
                  {/* Light/Subtle Stripe 3 */}
                  <line x1="0" y1="875" x2="800" y2="165" stroke="#007a78" strokeWidth="2" opacity="0.5" />
                </svg>
              </div>

              {/* BOTTOM RIGHT OVERLAY TEXT ON TEAL AREA */}
              <div className="absolute bottom-16 right-14 z-10 text-right text-white max-w-[550px]">
                {/* Nama Rumah Sakit & Periode Tahun - Rata Kanan di atas "Keselamatan adalah Prioritas" */}
                <h4 
                  className="font-extrabold text-white text-[36px] tracking-wide uppercase leading-tight font-sans whitespace-normal break-words"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  {activeHospitalName}
                </h4>
                <p 
                  className="text-[26px] font-black uppercase tracking-[0.2em] text-white mt-1 mb-5 font-sans"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                  PERIODE TAHUN {selectedYear === 'Semua Tahun' ? new Date().getFullYear() : selectedYear}
                </p>

                <h5 className="font-black text-white text-[15px] tracking-wider uppercase leading-tight mt-6">
                  KESELAMATAN ADALAH PRIORITAS
                </h5>
                <div className="w-12 h-[2px] bg-white/80 my-2.5 ml-auto"></div>
                <p className="text-[11px] text-teal-50 font-light leading-relaxed">
                  Bersama membangun budaya keselamatan pasien yang kuat, untuk pelayanan yang bermutu.
                </p>
              </div>

              {/* FOREGROUND CONTENT (LEFT ALIGNED) */}
              <div className="absolute top-16 left-16 right-16 z-10 flex flex-col justify-start items-start text-left">
                
                {/* 2026 Year Display */}
                <h1 className="text-[84px] font-black leading-none text-[#007a78] tracking-tight font-sans" style={{ lineHeight: '1', margin: 0 }}>
                  {selectedYear === 'Semua Tahun' ? new Date().getFullYear() : selectedYear}
                </h1>

                {/* LAPORAN */}
                <h2 className="text-[48px] font-black leading-none text-[#007a78] tracking-tight font-sans uppercase" style={{ lineHeight: '1', margin: '4px 0 0 0' }}>
                  LAPORAN
                </h2>

                {/* SURVEI BUDAYA KESELAMATAN PASIEN */}
                <div className="space-y-0" style={{ marginTop: '10px' }}>
                  <h3 className="text-[36px] font-black leading-[1.1] text-slate-950 uppercase tracking-tight font-sans" style={{ lineHeight: '1.1', margin: 0 }}>
                    SURVEI BUDAYA
                  </h3>
                  <h3 className="text-[36px] font-black leading-[1.1] text-slate-950 uppercase tracking-tight font-sans" style={{ lineHeight: '1.1', margin: 0 }}>
                    KESELAMATAN PASIEN
                  </h3>
                </div>

                {/* Short Accent Bar */}
                <div className="w-16 h-[4px] bg-[#007a78]" style={{ width: '64px', height: '4px', backgroundColor: '#007a78', margin: '12px 0' }}></div>

                {/* Subtitle: Berdasarkan Instrumen */}
                <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-slate-600 font-sans" style={{ letterSpacing: '0.2em', margin: '0 0 6px 0' }}>
                  Berdasarkan Instrumen
                </p>

                {/* Badge Pill: AHRQ SOPS® v2.0 */}
                <div style={{ margin: '6px 0 12px 0' }}>
                  <div 
                    className="inline-block bg-[#007a78] text-white font-bold text-[13px] rounded-full tracking-wider shadow-xs font-sans text-center select-none"
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#007a78',
                      color: '#ffffff',
                      height: '30px',
                      lineHeight: '30px',
                      padding: '0 18px',
                      borderRadius: '15px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      boxSizing: 'border-box'
                    }}
                  >
                    AHRQ SOPS® v2.0
                  </div>
                </div>

                {/* Three Outline Icons */}
                <div className="flex items-center gap-3.5 my-2" style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '10px 0' }}>
                  <div 
                    className="w-9 h-9 rounded-full border-2 border-[#007a78] text-[#007a78] flex items-center justify-center shadow-xs" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #007a78', boxSizing: 'border-box' }}
                  >
                    <TrendingUp className="w-5 h-5 stroke-[2.2]" style={{ width: '20px', height: '20px', display: 'block' }} />
                  </div>
                  <div 
                    className="w-9 h-9 rounded-full border-2 border-[#007a78] text-[#007a78] flex items-center justify-center shadow-xs" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #007a78', boxSizing: 'border-box' }}
                  >
                    <ShieldCheck className="w-5 h-5 stroke-[2.2]" style={{ width: '20px', height: '20px', display: 'block' }} />
                  </div>
                  <div 
                    className="w-9 h-9 rounded-full border-2 border-[#007a78] text-[#007a78] flex items-center justify-center shadow-xs" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #007a78', boxSizing: 'border-box' }}
                  >
                    <Users className="w-5 h-5 stroke-[2.2]" style={{ width: '20px', height: '20px', display: 'block' }} />
                  </div>
                </div>

              </div>

            </div>
          </div>



          {/* LEMBAR 3: DAFTAR ISI */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div>
                {/* Running Header */}
                <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>DAFTAR ISI</span>
                  <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 tracking-wider uppercase">DAFTAR ISI</h2>
                  <div className="h-0.5 w-12 bg-teal-600 mx-auto mt-1"></div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-baseline justify-between border-b border-dotted border-slate-300 pb-1">
                    <span className="font-bold text-slate-900 font-sans uppercase">Halaman Cover</span>
                    <span className="font-bold text-slate-900 font-mono">i</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-dotted border-slate-300 pb-1">
                    <span className="font-bold text-slate-900 font-sans uppercase">Daftar Isi</span>
                    <span className="font-bold text-slate-900 font-mono font-medium">ii</span>
                  </div>
                  
                  <div className="space-y-1 pt-1">
                    <div className="flex items-baseline justify-between font-bold text-slate-900">
                      <span>BAB I PENDAHULUAN</span>
                      <span className="font-mono">1</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>1.1 Latar Belakang</span>
                      <span className="font-mono">1</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>1.2 Tujuan Survei</span>
                      <span className="font-mono">1</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>1.3 Manfaat Survei</span>
                      <span className="font-mono">1</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-baseline justify-between font-bold text-slate-900">
                      <span>BAB II METODOLOGI SURVEI</span>
                      <span className="font-mono">3</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.1 Desain Penelitian / Survei</span>
                      <span className="font-mono">3</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.2 Waktu dan Lokasi Survei</span>
                      <span className="font-mono">3</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.3 Populasi & Sampel</span>
                      <span className="font-mono">3</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.4 Instrumen Survei</span>
                      <span className="font-mono">4</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.5 Metode Pengumpulan Data</span>
                      <span className="font-mono">4</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>2.6 Analisis Data</span>
                      <span className="font-mono">5</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-baseline justify-between font-bold text-slate-900">
                      <span>BAB III HASIL DAN PEMBAHASAN</span>
                      <span className="font-mono">6</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.1 Gambaran Umum & Karakteristik Responden</span>
                      <span className="font-mono">6</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2 Hasil Pengukuran 10 Dimensi Budaya Keselamatan (Tabel)</span>
                      <span className="font-mono">{6 + demografiPages.length}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.1 Interpretasi & Rekomendasi 10 Dimensi</span>
                      <span className="font-mono">{6 + demografiPages.length + 1}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.2 Penilaian Keselamatan Pasien Keseluruhan (Overall Rating)</span>
                      <span className="font-mono">{6 + demografiPages.length + 2}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.3 Frekuensi Pelaporan Insiden Keselamatan Pasien</span>
                      <span className="font-mono">{6 + demografiPages.length + 3}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.4 Rata-Rata Respon Positif Per Item Dimensi (d1 - d10)</span>
                      <span className="font-mono">{6 + demografiPages.length + 4}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.5 Analisis Komparatif Respon Positif Segmental</span>
                      <span className="font-mono">{6 + demografiPages.length + 8}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.6 Analisis Tren Historis (Tahun Sebelumnya)</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 1}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.7 Analisis Benchmarking (Mitra Rumah Sakit)</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 2}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.2.8 Analisis Kualitatif & Rekomendasi Peningkatan</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 3}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>3.3 Pembahasan</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 4}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-baseline justify-between font-bold text-slate-900">
                      <span>BAB IV KESIMPULAN DAN REKOMENDASI</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 5}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>4.1 Kesimpulan Laporan</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 5}</span>
                    </div>
                    <div className="pl-4 flex justify-between text-slate-600 text-[11px]">
                      <span>4.2 Rekomendasi Strategic Action Plan & Pengesahan</span>
                      <span className="font-mono">{6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 6}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman ii</span>
              </div>
            </div>
          </div>

          {/* LEMBAR 3: BAB I PENDAHULUAN - HALAMAN 1 */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span></span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    <div className="text-center mb-6 space-y-1">
                      <h2 className="text-xs font-black text-slate-500 tracking-widest">BAB I</h2>
                      <h2 className="text-base font-black text-teal-800 uppercase tracking-wide">PENDAHULUAN</h2>
                      <div className="h-0.5 w-12 bg-teal-600 mx-auto mt-1"></div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed text-justify">
                      <h3 className="font-bold text-slate-900">1.1 Latar Belakang</h3>
                      <p>
                         Keselamatan pasien merupakan prioritas utama dan prinsip mendasar dalam pelayanan kesehatan di rumah sakit. Upaya peningkatan keselamatan pasien sangat bergantung pada budaya keselamatan pasien (patient safety culture) yang hidup di dalam organisasi.
                      </p>
                      <p>
                         Budaya keselamatan pasien didefinisikan sebagai nilai, keyakinan, dan norma staf rumah sakit mengenai perilaku terkait keselamatan. Budaya yang kuat memfasilitasi komunikasi terbuka, pelaporan tanpa hukuman (non-punitive environment), pembelajaran dari kesalahan, dan kerja sama tim yang solid.
                      </p>
                      <p>
                         Untuk mengukur dan mengevaluasi sejauh mana budaya keselamatan telah tertanam di rumah sakit, diperlukan instrumen pengukuran yang valid, handal, dan terstandar secara internasional. Agency for Healthcare Research and Quality (AHRQ) telah memperbarui instrumen pengukuran melalui AHRQ Hospital Survey on Patient Safety Culture (SOPS®) Version 2.0. Versi ini menyempurnakan dimensi pengukuran terdahulu agar lebih relevan dengan dinamika pelayanan kesehatan modern, berfokus pada respons terhadap kesalahan, dukungan kepemimpinan, pembelajaran organisasi, dan komunikasi yang terbuka.
                      </p>
                      <p>
                        Pelaksanaan survei budaya keselamatan pasien berbasis AHRQ Versi 2.0 ini dilakukan untuk memetakan kekuatan (strengths) serta area yang membutuhkan peningkatan (areas for improvement) di <strong className="text-slate-900">{activeHospitalName}</strong>. Hasil dari survei ini menjadi landasan berbasis data (data-driven) dalam merumuskan strategi perbaikan mutu dan keselamatan pasien secara terarah dan berkelanjutan.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700 leading-relaxed text-justify">
                      <h3 className="font-bold text-slate-900 text-xs">1.2 Tujuan</h3>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">1.2.1 Tujuan Umum</h4>
                        <p className="pl-2 mt-0.5 text-justify">
                          Mengetahui gambaran penerapan budaya keselamatan pasien di <strong className="text-slate-900">{activeHospitalName}</strong> menggunakan instrumen AHRQ Versi 2.0 sebagai dasar penyusunan program peningkatan mutu dan keselamatan pasien.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-xs mt-1.5">1.2.2 Tujuan Khusus</h4>
                        <ol className="list-decimal pl-6 mt-1 space-y-1 text-justify">
                          <li>Mengidentifikasi karakteristik responden berdasarkan unit kerja, profesi, lama bekerja, dan jam kerja per minggu.</li>
                          <li>Menganalisis persentase respon positif (% Positive Response) pada 10 dimensi budaya keselamatan pasien AHRQ Versi 2.0.</li>
                          <li>Mengetahui persepsi staf terhadap tingkat keselamatan pasien secara keseluruhan (Overall Patient Safety Rating) di <strong className="text-slate-900">{activeHospitalName}</strong>.</li>
                          <li>Mengidentifikasi dimensi yang menjadi kekuatan area (strengths, &ge;75% respon positif) dan area yang memerlukan perbaikan (areas for improvement, &lt;50% respon positif).</li>
                          <li>Menyediakan data acuan (baseline data) untuk evaluasi berkala dan pembandingan (benchmarking) budaya keselamatan pasien di masa mendatang.</li>
                        </ol>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman 1 dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 4: BAB I PENDAHULUAN - HALAMAN 2 */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Pendahuluan (Lanjutan)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    <div className="space-y-3 text-xs text-slate-700 leading-relaxed text-justify">
                      <h3 className="font-bold text-slate-900 text-xs">1.3 Manfaat</h3>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">1.3.1 Bagi Manajemen Rumah Sakit</h4>
                        <ol className="list-decimal pl-6 mt-1 space-y-1 text-justify">
                          <li>Menyediakan data objektif mengenai persepsi staf terhadap budaya keselamatan pasien di seluruh tingkatan unit.</li>
                          <li>Menjadi acuan pengambilan keputusan strategis dan alokasi sumber daya dalam program keselamatan pasien.</li>
                          <li>Membantu kepemimpinan rumah sakit dalam membangun lingkungan kerja yang mendukung pelaporan insiden tanpa rasa takut (just culture).</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-xs mt-2">1.3.2 Bagi Pengelola Mutu dan Keselamatan Pasien Rumah Sakit</h4>
                        <ol className="list-decimal pl-6 mt-1 space-y-1 text-justify">
                          <li>Mempermudah pemetaan fokus intervensi dan prioritas perbaikan mutu di unit-unit kerja yang membutuhkan pendampingan khusus.</li>
                          <li>Memenuhi persyaratan standar akreditasi rumah sakit terkait pengukuran berkala budaya keselamatan pasien.</li>
                        </ol>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-xs mt-2">1.3.3 Bagi Staf dan Unit Kerja</h4>
                        <ol className="list-decimal pl-6 mt-1 space-y-1 text-justify">
                          <li>Menjadi sarana bagi staf untuk menyuarakan persepsi, kendala, dan masukan terkait keselamatan pasien secara anonim dan terstruktur.</li>
                          <li>Mendorong kolaborasi, komunikasi interprofesi, dan kesadaran kolektif antar unit kerja untuk menciptakan lingkungan pelayanan yang aman bagi pasien.</li>
                        </ol>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman 2 dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 5: BAB II METODOLOGI SURVEI - BAGIAN 1 */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div>
                {/* Running Header */}
                <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span></span>
                  <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                </div>

                <section className="space-y-4">
                  <div className="text-center mb-6 space-y-1">
                    <h2 className="text-xs font-black text-slate-500 tracking-widest">BAB II</h2>
                    <h2 className="text-base font-black text-teal-800 uppercase tracking-wide">METODOLOGI SURVEI</h2>
                    <div className="h-0.5 w-12 bg-teal-600 mx-auto mt-1"></div>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed text-justify">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">2.1 Desain Penelitian / Survei</h3>
                      <p>
                        Survei ini menggunakan desain <strong>deskriptif kuantitatif</strong> dengan pendekatan <strong>cross-sectional</strong>. Pendekatan ini digunakan untuk mengukur dan menggambarkan persepsi staf rumah sakit terhadap budaya keselamatan pasien pada satu kurun waktu tertentu tanpa memberikan intervensi langsung saat pengukuran berlangsung.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">2.2 Waktu dan Lokasi Pelaksanaan</h3>
                      <div className="mb-2">
                        <strong className="text-slate-800">Lokasi Pelaksanaan</strong>
                        <p className="mt-1">Seluruh unit kerja/instalasi di <strong className="text-teal-700">{activeHospitalName}</strong>, meliputi:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                          <li>Unit Pelayanan Medis</li>
                          <li>Unit Keperawatan</li>
                          <li>Unit Penunjang Medis</li>
                          <li>Unit Administrasi</li>
                          <li>Unit Manajemen</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-slate-800">Waktu Pelaksanaan</strong>
                        <p className="mt-1">Survei dilaksanakan selama periode:</p>
                        <p className="font-bold text-teal-700 mt-0.5">{periodeSurvei}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">2.3 Populasi dan Sampel</h3>
                      
                      <div className="mb-2">
                        <h4 className="font-semibold text-slate-800 mb-1">2.3.1 Populasi</h4>
                        <p>Populasi dalam survei ini adalah seluruh pegawai yang bekerja di <strong className="text-teal-700">{activeHospitalName}</strong>, baik manajemen, staf medis, keperawatan, tenaga kesehatan lainnya maupun staf administrasi/non klinis.</p>
                      </div>

                      <div className="mb-2">
                        <h4 className="font-semibold text-slate-800 mb-1">2.3.2 Kriteria Inklusi dan Eksklusi</h4>
                        <div className="mb-1.5">
                          <strong className="text-slate-700">Kriteria Inklusi</strong>
                          <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                            <li>Pegawai tetap maupun kontrak yang telah bekerja minimal 3 bulan.</li>
                            <li>Memiliki interaksi langsung maupun tidak langsung terhadap pelayanan pasien.</li>
                            <li>Bersedia mengisi kuesioner secara sukarela.</li>
                          </ul>
                        </div>
                        <div>
                          <strong className="text-slate-700">Kriteria Eksklusi</strong>
                          <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                            <li>Pegawai yang sedang menjalani cuti panjang.</li>
                            <li>Mahasiswa praktik.</li>
                            <li>Siswa praktik.</li>
                            <li>Residen yang belum menjadi pegawai rumah sakit.</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">2.3.3 Teknik Sampling</h4>
                        <div>
                          <p className="mt-0.5">Pengambilan sampel dilakukan menggunakan:</p>
                          <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                            <li>Total Sampling</li>
                          </ul>
                          <p className="mt-0.5">atau</p>
                          <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                            <li>Proportionate Stratified Random Sampling</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman 3 dari {totalReportPages}</span>
              </div>
            </div>
          </div>

          {/* LEMBAR 5-B: BAB II METODOLOGI SURVEI - BAGIAN 2 */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Metodologi Survei (Lanjutan)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed text-justify">
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Ukuran Sampel</h4>
                        <p className="mt-0.5">Target jumlah responden mengikuti rekomendasi AHRQ:</p>
                        <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                          <li>Jumlah Target Responden: <strong className="text-teal-700">{totalTarget}</strong></li>
                          <li>Jumlah Responden Mengisi: <strong className="text-teal-700">{totalActual}</strong></li>
                          <li>Persentase Response Rate: <strong className="text-teal-700">{responseRateStr}</strong></li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 mb-1">2.4 Instrumen Survei</h3>
                        <p>
                          Instrumen yang digunakan adalah AHRQ Hospital Survey on Patient Safety Culture (SOPS®) Version 2.0 yang telah diterjemahkan ke dalam bahasa Indonesia dan diuji keterbacaannya.
                        </p>
                        <p className="mt-2">
                          Instrumen SOPS® Versi 2.0 mengukur 10 Dimensi Budaya Keselamatan Pasien yang terdiri dari 32 item pertanyaan primer, ditambah dengan bagian evaluasi penilaian tingkat keselamatan pasien (overall rating) dan karakteristik demografi responden:
                        </p>
                        <ol className="list-decimal pl-5 mt-2 space-y-1">
                          <li>Teamwork (Kerja Sama Tim) – 3 item</li>
                          <li>Staffing and Work Pace (Ketenagaan dan Kecepatan Kerja) – 4 item</li>
                          <li>Organizational Learning—Continuous Improvement (Pembelajaran Organisasi—Peningkatan Berkelanjutan) – 3 item</li>
                          <li>Response to Error (Respons Terhadap Kesalahan / Non-punitive Environment) – 4 item</li>
                          <li>Supervisor, Manager, or Clinical Leader Support for Patient Safety (Dukungan Atasan/Manajer/Pimpinan Klinis terhadap Keselamatan Pasien) – 3 item</li>
                          <li>Management Support for Patient Safety (Dukungan Manajemen/Direksi terhadap Keselamatan Pasien) – 3 item</li>
                          <li>Communication Openness (Keterbukaan Komunikasi) – 4 item</li>
                          <li>Reporting Patient Safety Events (Pelaporan Insiden Keselamatan Pasien) – 2 item</li>
                          <li>Hospital Handoffs and Information Exchange (Serah Terima/Handoff dan Pertukaran Informasi di Rumah Sakit) – 3 item</li>
                          <li>Communication About Error (Komunikasi Mengenai Kesalahan) – 3 item</li>
                        </ol>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>
                            <strong>Tingkat Keselamatan Pasien Keseluruhan (Overall Patient Safety Rating):</strong> 1 item pertanyaan penilaian global dengan skala Likert 5 poin (Sangat Buruk, Buruk, Cukup, Baik, Sangat Baik).
                          </li>
                          <li>
                            <strong>Pertanyaan Demografi:</strong> Meliputi unit kerja utama, profesi/peran, lama bekerja di rumah sakit, lama bekerja di unit saat ini, serta jumlah jam kerja per minggu.
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 mb-1">2.5 Metode Pengumpulan Data</h3>
                        <p>Pengumpulan data dilakukan secara elektronik/online (e-survey menggunakan link aplikasi pengukuran budaya keselamatan) dengan memperhitungkan kerahasiaan:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1.5">
                          <li>
                            <strong>Penyebaran Tautan/Kuesioner:</strong> Disebarkan melalui koordinasi Kepala Unit/Ruangan dan Tim Komite Mutu.
                          </li>
                          <li>
                            <strong>Prinsip Anonimitas:</strong> Responden tidak diminta mencantumkan nama atau NIP untuk menjamin kerahasiaan (anonymity) dan kejujuran jawaban tanpa kekhawatirkan akan adanya sanksi/dampak karir.
                          </li>
                          <li>
                            <strong>Monitoring Response Rate:</strong> Tim pelaksana melakukan pemantauan harian terhadap tingkat partisipasi di tiap unit untuk memastikan keterwakilan data.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman 4 dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 5-C: BAB II METODOLOGI SURVEI - BAGIAN 3 */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Metodologi Survei (Analisis Data)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed text-justify">
                      <div>
                        <h3 className="font-bold text-slate-900 mb-1">2.6 Analisis Data</h3>
                        <p>Pengolahan dan analisis data dilakukan mengikuti panduan pengolahan data AHRQ SOPS® Version 2.0:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-3">
                          <li>
                            <strong>Analisis Deskriptif Demografi:</strong> Menghitung frekuensi dan persentase untuk karakteristik responden (profesi, unit kerja, masa kerja, jam kerja).
                          </li>
                          <li>
                            <strong>Kalkulasi Persentase Respon Positif (% Positive Response):</strong>
                            <p className="mt-1 text-slate-700">Pilihan jawaban kuesioner menggunakan skala Likert 5 poin:</p>
                            <ul className="list-circle pl-5 mt-1 space-y-1 text-[11px] text-slate-600">
                              <li><strong>Agreement Scale:</strong> 1 = Sangat Tidak Setuju, 2 = Tidak Setuju, 3 = Netral, 4 = Setuju, 5 = Sangat Setuju.</li>
                              <li><strong>Frequency Scale:</strong> 1 = Tidak Pernah, 2 = Jarang, 3 = Kadang-kadang, 4 = Sering, 5 = Selalu.</li>
                            </ul>
                            <ul className="list-square pl-5 mt-2 space-y-1.5">
                              <li>
                                <strong>Item Berpernyataan Positif (Positively Worded Items):</strong> Respon bernilai 4 (Setuju/Sering) dan 5 (Sangat Setuju/Selalu) dihitung sebagai respon positif.
                              </li>
                              <li>
                                <strong>Item Berpernyataan Negatif (Negatively Worded / Negatively Worded Reverse Items):</strong> Respon bernilai 1 (Sangat Tidak Setuju/Tidak Pernah) dan 2 (Tidak Setuju/Jarang) dihitung sebagai respon positif.
                              </li>
                            </ul>
                          </li>
                          <li>
                            <strong>Formula perhitungan respon positif dimensi:</strong>
                            <div className="my-2 p-3 bg-teal-50 border border-teal-200 rounded-lg flex flex-col items-center justify-center">
                              <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-teal-950">
                                <span className="whitespace-nowrap font-black uppercase text-teal-900">&ldquo;% Respon Positif Dimensi&rdquo;</span>
                                <span className="text-teal-600 text-lg font-normal">=</span>
                                <div className="flex flex-col items-center mx-1">
                                  <span className="border-b border-teal-400 pb-1 px-3 text-center font-bold">Total Jawaban Positif pada Seluruh Item dalam Dimensi</span>
                                  <span className="pt-1 px-3 text-center font-bold">Total Jawaban yang Terisi pada Seluruh Item dalam Dimensi</span>
                                </div>
                                <span className="text-teal-600 text-lg font-normal">×</span>
                                <span className="font-black">100%</span>
                              </div>
                            </div>
                          </li>
                          <li>
                            <strong>Kriteria Kategori Dimensi:</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-700">
                              <li><strong>Area Keunggulan / Kekuatan (Strengths):</strong> Dimensi dengan persentase respon positif &ge;75%.</li>
                              <li><strong>Area Perlu Perbaikan (Areas for Improvement):</strong> Dimensi dengan persentase respon positif &lt;50%.</li>
                              <li><strong>Area Sedang / Netral:</strong> Dimensi dengan persentase respon positif antara 50%-74%.</li>
                            </ul>
                          </li>
                          <li>
                            <strong>Analisis Tingkat Keselamatan Pasien Keseluruhan:</strong> Menghitung distribusi persentase penilaian staf terhadap mutu keselamatan pasien di rumah sakit secara umum.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman 5 dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 6: BAB III HASIL & PEMBAHASAN - Karakteristik Responden & Demografi (Dynamic Auto-Pagination Pages) */}
          {demografiPages.map((pageItem, pageIdx) => {
            const currentPageNum = 6 + pageIdx;
            return (
              <div key={`demo-page-${pageIdx}`} className="w-full flex flex-col items-center">
                <div className="word-page print-page">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Running Header */}
                      <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Karakteristik Responden {pageItem.isFirstPage ? '(Bagian 1)' : `(Bagian ${pageIdx + 1})`}</span>
                        <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                      </div>

                      <section className="space-y-4">
                        {pageItem.isFirstPage ? (
                          <>
                            <div className="text-center mb-6 space-y-1">
                              <h2 className="text-xs font-black text-slate-500 tracking-widest">BAB III</h2>
                              <h2 className="text-base font-black text-teal-800 uppercase tracking-wide">HASIL DAN PEMBAHASAN</h2>
                              <div className="h-0.5 w-12 bg-teal-600 mx-auto mt-1"></div>
                            </div>

                            <div className="space-y-3">
                              <h3 className="font-bold text-slate-900 text-xs">3.1 Gambaran Umum Respon Rate dan Karakteristik Responden</h3>

                              <div className="space-y-1.5 text-[10px] text-slate-700 leading-relaxed">
                                <h4 className="font-bold text-slate-900 text-[11px]">3.1.1 Tingkat Partisipasi (Response Rate)</h4>
                                <p className="text-slate-700 text-[10px] leading-relaxed text-justify">
                                  Survei dilaksanakan pada periode <span className="font-semibold text-slate-900">{periodeSurvei}</span>. Dari total <span className="font-semibold text-slate-900">{totalTarget.toLocaleString('id-ID')}</span> kuesioner yang disebarkan ke seluruh unit kerja di <span className="font-semibold text-slate-900">{activeHospitalName}</span>, diperoleh kuesioner kembali dan memenuhi syarat untuk dianalisis sebanyak <span className="font-semibold text-slate-900">{totalActual.toLocaleString('id-ID')}</span> kuesioner. Dengan demikian, tingkat partisipasi (response rate) survei ini adalah sebesar <span className="font-bold text-teal-700">{responseRateStr}</span>. Tingkat partisipasi ini telah memenuhi ambang batas minimal yang direkomendasikan AHRQ (≥60%) sehingga representatif untuk menggambarkan budaya keselamatan pasien secara organisasi.
                                </p>
                              </div>

                              <div className="pt-1 space-y-1">
                                <h4 className="font-bold text-slate-900 text-[11px]">3.1.2 Demografi Responden</h4>
                                <p className="text-[10px] text-slate-600 font-medium">Karakteristik responden dikelompokkan berdasarkan profesi/posisi staf, unit kerja, masa kerja di rumah sakit, dan jumlah jam kerja per minggu</p>
                              </div>
                            </div>
                          </>
                        ) : pageItem.rows.length > 0 ? (
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-[11px]">3.1.2 Demografi Responden (Lanjutan)</h4>
                            <p className="text-[10px] text-slate-600 font-medium">Tabel lanjutan rincian data karakteristik dan sebaran responden per unit kerja</p>
                          </div>
                        ) : null}

                        {/* Tabel Demografi Responden */}
                        {pageItem.rows.length > 0 && (
                          <div className="w-full border border-slate-200 rounded-xl text-[9px] overflow-hidden bg-white shadow-2xs" style={{ border: '1px solid #e2e8f0' }}>
                            <table className="w-full table-fixed text-left border-collapse" style={{ borderCollapse: 'collapse', width: '100%' }}>
                              <colgroup>
                                <col style={{ width: '22%' }} />
                                <col style={{ width: '48%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                              </colgroup>
                              <thead>
                                <tr className="bg-teal-500 text-white font-extrabold uppercase tracking-wider text-[8.5px]">
                                  <th className="py-2 px-2.5 border-r border-white/20 text-left w-[22%] break-words whitespace-normal" style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid #0f766e' }}>Karakteristik</th>
                                  <th className="py-2 px-2.5 border-r border-white/20 text-center w-[48%] break-words whitespace-normal" style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid #0f766e' }}>Kategori / Detail</th>
                                  <th className="py-2 px-2 border-r border-white/20 text-center w-[15%] break-words whitespace-normal" style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid #0f766e' }}>Jumlah (n)</th>
                                  <th className="py-2 px-2 text-center w-[15%] break-words whitespace-normal" style={{ borderBottom: '1px solid #0f766e' }}>Persentase (%)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderDemografiTableRows(pageItem.rows, flatDemografiRows)}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Ringkasan Demografi Responden (Tampil di Halaman Terakhir Saja) */}
                        {pageItem.isLastPage && (
                          <div className="space-y-2 mt-3">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-600 leading-relaxed space-y-1">
                              <strong className="text-teal-800 font-extrabold uppercase tracking-wide block">3.1.3 Interpretasi & Analisa Data Demografi:</strong>
                              <p>
                                Berdasarkan data demografi responden tahun <strong>{displayYear}</strong>, survei berhasil mengumpulkan partisipasi aktif dari <strong>{demografiNarrative.totalResp}</strong> staf. 
                                Keterwakilan posisi staf didominasi oleh <strong>{demografiNarrative.topPos}</strong> (<strong>{demografiNarrative.topPosVal}</strong> responden){demografiNarrative.secondPos ? `, diikuti oleh ${demografiNarrative.secondPos} (${demografiNarrative.secondPosVal} responden)` : ''}. 
                                Unit dengan kontribusi terbesar adalah <strong>{demografiNarrative.topUnit}</strong> dengan <strong>{demografiNarrative.topUnitVal}</strong> responden{demografiNarrative.secondUnit ? `, disusul unit ${demografiNarrative.secondUnit} (${demografiNarrative.secondUnitVal} responden)` : ''}. 
                                Sedangkan dari masa bakti di rumah sakit, mayoritas responden memiliki masa kerja <strong>{demografiNarrative.topTenure}</strong> sebanyak <strong>{demografiNarrative.topTenureVal}</strong> staf. 
                                Data ini menunjukkan sebaran responden yang representatif dan valid untuk dijadikan pijakan analisis budaya keselamatan pasien secara makro di <strong>{activeHospitalName}</strong>.
                              </p>
                            </div>

                            <div className="bg-teal-50/45 p-3 rounded-xl border border-teal-100 text-[10px] text-slate-600 leading-relaxed space-y-1">
                              <strong className="text-teal-900 font-extrabold uppercase tracking-wide block">Rekomendasi Peningkatan Strategis:</strong>
                              <ul className="space-y-1 list-none pl-0">
                                <li className="flex items-start gap-1.5">
                                  <span className="text-teal-600 shrink-0 select-none mt-0.5">👥</span>
                                  <span>Rancang program edukasi keselamatan pasien yang berfokus pada kelompok dominan yaitu posisi &ldquo;{demografiNarrative.topPos}&rdquo; di unit &ldquo;{demografiNarrative.topUnit}&rdquo;.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="text-teal-600 shrink-0 select-none mt-0.5">📈</span>
                                  <span>Tingkatkan tingkat partisipasi dari kelompok atau unit kerja dengan tingkat representasi rendah (di bawah 10% dari total responden).</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="text-teal-600 shrink-0 select-none mt-0.5">🛡️</span>
                                  <span>Sosialisasikan kembali jaminan kerahasiaan identitas responden guna mendorong pengisian data yang jujur dan transparan.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span className="text-teal-600 shrink-0 select-none mt-0.5">✨</span>
                                  <span>Gunakan data demografi ini untuk merumuskan tim Champions Keselamatan Pasien lintas unit kerja.</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>

                    {/* Running Footer */}
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>Laporan Survei Budaya Keselamatan Pasien</span>
                      <span>Halaman {currentPageNum} dari {totalReportPages}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* LEMBAR 4-A: BAB III HASIL & PEMBAHASAN - Hasil Pengukuran 10 Dimensi (Tabel & Bar Chart) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Laporan Resmi Survei Budaya Keselamatan Pasien</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-3">
                  <div className="border-b border-slate-200 pb-1.5">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      3.2 Hasil Pengukuran Dimensi Budaya Keselamatan Pasien {activeHospitalName}
                    </h3>
                  </div>

                  <p className="text-[10.5px] text-slate-700 leading-relaxed">
                    Berdasarkan kalkulasi terhadap 10 dimensi AHRQ Versi 2.0, rata-rata tingkat respon positif budaya keselamatan pasien di <strong className="text-slate-900">{activeHospitalName}</strong> adalah <strong className="text-teal-700 font-extrabold">{overallAverage.toFixed(1)}%</strong>.
                  </p>

                  <div className="pt-1 space-y-1">
                    <h4 className="font-bold text-slate-900 text-[11px]">
                      3.2.1 Respon positif berdasarkan 10 dimensi budaya keselamatan pasien
                    </h4>
                    <p className="text-[10.5px] text-slate-700 leading-relaxed">
                      Ringkasan hasil pencapaian persentase respon positif (% Positive Response) untuk setiap dimensi disajikan pada Tabel berikut:
                    </p>
                  </div>

                  {/* Visualisasi Detail Pengukuran Dimensi (Sesuai Visual Menu Analisa Data) */}
                  <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs my-2">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-800 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Detail Pengukuran Dimensi Budaya Keselamatan Untuk {activeHospitalName}</span>
                      </h4>
                      <span className="text-[8.5px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        Periode: {displayYear}
                      </span>
                    </div>

                    <div className="w-full text-[9.5px]">
                      <table className="w-full table-fixed border-collapse text-[9.5px]">
                        <colgroup>
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '44%' }} />
                          <col style={{ width: '50%' }} />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400 text-[8.5px]">
                            <th className="pb-2 text-left pl-1 font-bold break-words whitespace-normal" style={{ width: '6%' }}>NO.</th>
                            <th className="pb-2 text-left font-bold break-words whitespace-normal" style={{ width: '44%' }}>KOMPONEN BUDAYA KESELAMATAN PASIEN</th>
                            <th className="pb-2 text-center font-bold break-words whitespace-normal" style={{ width: '50%' }}>PERSENTASE RESPONS POSITIF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {dimensionScores.map((row, i) => {
                            const getBarColor = (val: number) => {
                              if (val >= 85) return 'bg-blue-500';
                              if (val >= 70) return 'bg-emerald-500';
                              if (val >= 50) return 'bg-yellow-500';
                              return 'bg-red-500';
                            };

                            return (
                              <tr key={row.id}>
                                <td className="py-1.5 font-bold text-slate-400 text-left text-[10px] pl-1 align-middle" style={{ width: '6%' }}>
                                  {i + 1}.
                                </td>
                                <td className="py-1.5 font-bold text-slate-700 text-[9.5px] leading-snug whitespace-normal break-words pr-2 align-middle" style={{ width: '44%' }}>
                                  {row.nama}
                                </td>
                                <td className="py-1.5 align-middle" style={{ width: '50%' }}>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 rounded-lg h-5 relative overflow-hidden flex items-center border border-slate-200/80 shadow-xs">
                                      <div 
                                        style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                                        className={`h-full ${getBarColor(row.percentage)} relative transition-all duration-300 rounded-l-md`}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                                      </div>
                                    </div>
                                    <span className="w-10 text-right font-extrabold text-slate-900 text-[10px] shrink-0">
                                      {row.percentage.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-3.5 items-center justify-center text-[8px] font-bold text-slate-600">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-red-500"></div> &lt;50% (Perlu Perbaikan)</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-yellow-500"></div> 50-69% (Cukup)</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></div> 70-84% (Baik)</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-xs bg-blue-500"></div> &ge;85% (Sangat Baik)</div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 4-B: BAB III HASIL & PEMBAHASAN - Interpretasi & Rekomendasi 10 Dimensi */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Laporan Resmi Survei Budaya Keselamatan Pasien</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-4">
                  <div className="border-b border-slate-200 pb-1.5">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      3.2.1 (Lanjutan) Interpretasi &amp; Rekomendasi 10 Dimensi Budaya Keselamatan
                    </h3>
                  </div>

                  {/* Interpretasi & Analisa Data Terintegrasi (Sesuai Menu Analisa Data -> Hasil Pengukuran Dimensi) */}
                  <div className="space-y-4 pt-1">
                    <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl space-y-3 text-[11px] text-slate-700">
                      <h4 className="font-extrabold text-blue-900 tracking-wider uppercase flex items-center gap-2 text-xs">
                        <Sparkles className="w-4.5 h-4.5 text-blue-600 shrink-0" /> INTERPRETASI &amp; ANALISIS DATA
                      </h4>
                      <p className="leading-relaxed text-justify">
                        Hasil analisis 10 dimensi budaya keselamatan pasien tahun <strong className="text-slate-900">{displayYear}</strong> menghasilkan nilai rata-rata keseluruhan respons positif sebesar <strong className="text-blue-800 font-extrabold">{overallAverage.toFixed(1)}%</strong>. Kekuatan utama (aspek unggul) <strong className="text-slate-900">{activeHospitalName}</strong> terletak pada dimensi <strong className="text-emerald-800 font-extrabold">&ldquo;{highestDim?.nama || '-'}&rdquo;</strong> dengan skor positif tertinggi mencapai <strong className="text-emerald-700 font-extrabold">{highestDim?.percentage.toFixed(1) || 0}%</strong>. Sebaliknya, dimensi yang mendesak untuk segera diintervensi adalah <strong className="text-red-800 font-extrabold">&ldquo;{lowestDim?.nama || '-'}&rdquo;</strong> dengan respons positif terendah sebesar <strong className="text-red-700 font-extrabold">{lowestDim?.percentage.toFixed(1) || 0}%</strong>.
                      </p>

                      <div className="text-[10.5px] space-y-2 bg-white/90 p-3.5 rounded-lg border border-blue-100/60">
                        <div>
                          <span className="font-bold text-emerald-700">✓ Area Kekuatan (&ge;75%):</span>{' '}
                          <span className="font-medium text-slate-700">
                            {strengths.length > 0
                              ? strengths.map(d => `${d.nama} (${d.percentage.toFixed(1)}%)`).join(', ')
                              : 'Belum ada'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-amber-700">⚠ Perlu Peningkatan (50-74%):</span>{' '}
                          <span className="font-medium text-slate-700">
                            {moderates.length > 0
                              ? moderates.map(d => `${d.nama} (${d.percentage.toFixed(1)}%)`).join(', ')
                              : 'Belum ada'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-rose-700">☠ Prioritas Intervensi (&lt;50%):</span>{' '}
                          <span className="font-medium text-slate-700">
                            {improvements.length > 0
                              ? improvements.map(d => `${d.nama} (${d.percentage.toFixed(1)}%)`).join(', ')
                              : 'Belum ada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rekomendasi Peningkatan (Sesuai Menu Analisa Data -> Hasil Pengukuran Dimensi) */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-[11px] text-slate-700">
                      <h4 className="font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-2 text-xs">
                        <Target className="w-4.5 h-4.5 text-indigo-600 shrink-0" /> REKOMENDASI PENINGKATAN
                      </h4>
                      <ul className="text-[10.5px] text-slate-700 space-y-2.5">
                        <li className="flex gap-2.5 items-start">
                          <span className="shrink-0 text-sm">🏆</span>
                          <span className="font-medium leading-relaxed">
                            Pertahankan strategi keberhasilan pada dimensi <strong className="text-slate-900">&ldquo;{highestDim?.nama || '-'}&rdquo;</strong> agar tetap konsisten sebagai pilar budaya keselamatan rumah sakit.
                          </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <span className="shrink-0 text-sm">🛠️</span>
                          <span className="font-medium leading-relaxed">
                            Segera bentuk tim investigasi internal dan susun SOP baru untuk meningkatkan dimensi <strong className="text-slate-900">&ldquo;{lowestDim?.nama || '-'}&rdquo;</strong>.
                          </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <span className="shrink-0 text-sm">📢</span>
                          <span className="font-medium leading-relaxed">
                            Implementasikan program &apos;Rapat Keselamatan Pasien Mandiri&apos; secara berkala di nurse station seluruh unit kerja.
                          </span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <span className="shrink-0 text-sm">🎯</span>
                          <span className="font-medium leading-relaxed">
                            Sesuaikan alokasi pelatihan berkala yang lebih berfokus pada dimensi-dimensi yang berada dalam kategori prioritas intervensi.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 italic text-right mt-2">*Data 10 dimensi, analisa, dan rekomendasi terintegrasi secara otomatis dari menu Analisa Data ({activeHospitalName}).</p>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 1} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 5: BAB III HASIL & PEMBAHASAN - 3.2.2 Overall Rating */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>3.2.2 Rating Keselamatan Pasien Keseluruhan</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    {/* 3.2.2 Keselamatan Pasien Keseluruhan (Overall Rating) */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                            <HeartPulse className="w-4 h-4 text-rose-600" />
                            3.2.2 Keselamatan Pasien Keseluruhan (Overall Rating)
                          </h4>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            Tingkat keselamatan pasien di unit kerja berdasarkan penilaian responden staf {activeHospitalName}
                          </p>
                        </div>
                        <span className="text-[9.5px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
                          Respon Positif: {safetyRatingData.positivePct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Grafik Penilaian Insiden Keselamatan Pasien */}
                      <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                        <h5 className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                          <BarChart2 className="w-3.5 h-3.5 text-rose-500" />
                          Grafik Penilaian Insiden Keselamatan Pasien (Overall Rating)
                        </h5>
                        <div className="h-[185px] w-full flex justify-center" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                          <BarChart width={560} height={185} data={safetyRatingData.distribution.map(d => ({ kategori: d.name, percentage: parseFloat(d.percentage.replace('%', '')) || 0 }))} margin={{ top: 18, right: 15, left: -10, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="kategori" 
                              stroke="#64748b" 
                              tick={{ fill: '#334155', fontSize: 9.5, fontWeight: 700, fontFamily: "'Poppins', var(--font-sans), sans-serif" }} 
                              tickLine={false} 
                            />
                            <YAxis 
                              type="number" 
                              domain={[0, 100]} 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 9, fontWeight: 600, fontFamily: "'Poppins', var(--font-sans), sans-serif" }} 
                              tickLine={false} 
                              tickFormatter={(v) => `${v}%`} 
                            />
                            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Persentase']} contentStyle={{ fontSize: '10px', borderRadius: '8px', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                            <Bar dataKey="percentage" name="Persentase" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                              <LabelList 
                                dataKey="percentage" 
                                position="top" 
                                offset={5} 
                                formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                fill="#334155" 
                                fontSize={9.5} 
                                fontWeight="bold" 
                                style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}
                              />
                              {safetyRatingData.distribution.map((entry, index) => {
                                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#b91c1c'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </div>
                      </div>

                      {/* Interpretasi & Analisa Data Card */}
                      <div className="bg-blue-50/40 border border-blue-100 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Interpretasi & Analisa Data Otomatis
                        </h5>
                        <div className="text-[10px] text-slate-700 leading-relaxed text-justify space-y-1.5">
                          <p>
                            Hasil pengukuran tingkat keselamatan pasien secara keseluruhan (<em>overall safety rating</em>) oleh staf pada periode survei tahun <strong>{tahunSurvei}</strong> di <strong>{activeHospitalName}</strong> mencatatkan persentase respon positif sebesar <strong>{safetyRatingData.positivePct.toFixed(1)}%</strong> (kombinasi predikat Sangat Baik dan Baik). Mayoritas responden memberikan penilaian dominan pada kategori <strong>&ldquo;{safetyRatingHighestCat.name}&rdquo;</strong> yaitu mencapai <strong>{safetyRatingHighestCat.percentage}</strong>.
                          </p>
                          <p>
                            Secara analitis, persepsi keselamatan pasien di tingkat unit kerja merupakan cerminan dari efektivitas standar operasional prosedur, iklim kepemimpinan klinis, serta ketersediaan sarana pendukung keselamatan. Capaian ini menunjukkan fondasi keselamatan pasien yang relatif baik, namun memerlukan penguatan berkelanjutan untuk menekan potensi eror klinis serta mendorong pencapaian target ideal nasional (&ge;80% respon positif).
                          </p>
                        </div>
                        
                        {/* Category Breakout Badges as solid robust HTML Table */}
                        <div className="pt-1.5">
                          <table className="w-full table-fixed border-collapse">
                            <tbody>
                              <tr>
                                {safetyRatingData.distribution.map(g => (
                                  <td key={g.name} className="p-0.5" style={{ width: '20%' }}>
                                    <div className="p-1.5 rounded-lg bg-white border border-blue-100 text-center shadow-2xs">
                                      <div className="text-slate-500 font-bold text-[8px] leading-tight block whitespace-nowrap overflow-hidden text-ellipsis">{g.name}</div>
                                      <div className="text-[10px] font-extrabold text-teal-800 mt-0.5 block whitespace-nowrap">{g.percentage}</div>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Rekomendasi Peningkatan */}
                      <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Rekomendasi Peningkatan Komprehensif
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">🔎</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Audit & Monitoring Unit Kritis:</span>
                              <span className="text-slate-600 leading-normal block">Mengintensifkan pemantauan budaya keselamatan berkala pada unit berisiko tinggi (IGD, ICU, Kamar Bedah) guna mendeteksi potensi insiden medis secara dini.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">👣</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Executive Safety Walkrounds:</span>
                              <span className="text-slate-600 leading-normal block">Menyelenggarakan ronde keselamatan direksi dan pimpinan unit secara rutin untuk berdialog langsung dengan staf garis depan mengenai hambatan klinis.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">🎯</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Debriefing Pasca-Tindakan Klinis:</span>
                              <span className="text-slate-600 leading-normal block">Mewajibkan sesi *debriefing* tim dan forum *Clinical Peer Review* non-punitif untuk mengevaluasi efektivitas prosedur operasional harian.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">📊</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Umpan Balik Indikator Transparan:</span>
                              <span className="text-slate-600 leading-normal block">Menyediakan papan informasi/dashboard terbuka terkait perkembangan mutu dan keselamatan pasien untuk memotivasi partisipasi seluruh pegawai.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 2} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 6: BAB III HASIL & PEMBAHASAN - 3.2.3 Frekuensi Pelaporan Insiden */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>3.2.3 Frekuensi Pelaporan Insiden</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-4">
                    {/* 3.2.3 Frekuensi Pelaporan Insiden */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-600" />
                            3.2.3 Frekuensi Pelaporan Insiden
                          </h4>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Jumlah insiden keselamatan pasien yang dilaporkan oleh staf dalam 12 bulan terakhir
                          </p>
                        </div>
                        <span className="text-[9.5px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
                          Melaporkan Insiden: {reportedEventsData.reportedAnyPct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Grafik Jumlah Insiden Keselamatan Pasien Yang Dilaporkan */}
                      <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                        <h5 className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                          <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                          Grafik Jumlah Insiden Keselamatan Pasien Yang Dilaporkan
                        </h5>
                        <div className="h-[185px] w-full flex justify-center" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                          <BarChart width={560} height={185} data={reportedEventsData.distribution.map(d => ({ kategori: d.name, percentage: parseFloat(d.percentage.replace('%', '')) || 0 }))} margin={{ top: 18, right: 15, left: -10, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="kategori" 
                              stroke="#64748b" 
                              tick={{ fill: '#334155', fontSize: 9.5, fontWeight: 700, fontFamily: "'Poppins', var(--font-sans), sans-serif" }} 
                              tickLine={false} 
                            />
                            <YAxis 
                              type="number" 
                              domain={[0, 100]} 
                              stroke="#64748b" 
                              tick={{ fill: '#475569', fontSize: 9, fontWeight: 600, fontFamily: "'Poppins', var(--font-sans), sans-serif" }} 
                              tickLine={false} 
                              tickFormatter={(v) => `${v}%`} 
                            />
                            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Persentase']} contentStyle={{ fontSize: '10px', borderRadius: '8px', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                            <Bar dataKey="percentage" name="Persentase" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                              <LabelList 
                                dataKey="percentage" 
                                position="top" 
                                offset={5} 
                                formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} 
                                fill="#334155" 
                                fontSize={9.5} 
                                fontWeight="bold" 
                                style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}
                              />
                              {reportedEventsData.distribution.map((entry, index) => {
                                const colors = ['#64748b', '#8b5cf6', '#6366f1', '#0d9488', '#d97706'];
                                return <Cell key={`cell-rep-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </div>
                      </div>

                      {/* Interpretasi & Analisa Data Card */}
                      <div className="bg-purple-50/40 border border-purple-100 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          Interpretasi & Analisa Data Otomatis
                        </h5>
                        <div className="text-[10px] text-slate-700 leading-relaxed text-justify space-y-1.5">
                          <p>
                            Berdasarkan data frekuensi pelaporan insiden keselamatan pasien dalam 12 bulan terakhir (Tahun <strong>{tahunSurvei}</strong>) di <strong>{activeHospitalName}</strong>, proporsi staf yang aktif melaporkan insiden tercatat sebesar <strong>{reportedEventsData.reportedAnyPct.toFixed(1)}%</strong>. Distribusi jawaban responden menunjukkan kelompok dominan berada pada kategori <strong>&ldquo;{reportedEventsHighestCat.name}&rdquo;</strong> dengan persentase sebesar <strong>{reportedEventsHighestCat.percentage}</strong>.
                          </p>
                          <p>
                            Analisis mendalam mengindikasikan bahwa frekuensi pelaporan sangat dipengaruhi oleh tingkat keterbukaan budaya organisasi. Dominasi kategori pelaporan yang rendah sering kali mengisyaratkan fenomena <em>underreporting</em>, di mana insiden medis (KNC/KTD) tidak tercatat akibat kekhawatiran staf akan sanksi (<em>blame culture</em>), alur pelaporan yang membingungkan, atau belum terwujudnya umpan balik nyata dari komite keselamatan pasien.
                          </p>
                        </div>
                        
                        {/* Category Breakout Badges as solid robust HTML Table */}
                        <div className="pt-1.5">
                          <table className="w-full table-fixed border-collapse">
                            <tbody>
                              <tr>
                                {reportedEventsData.distribution.map(e => (
                                  <td key={e.name} className="p-0.5" style={{ width: '20%' }}>
                                    <div className="p-1.5 rounded-lg bg-white border border-purple-100 text-center shadow-2xs">
                                      <div className="text-slate-500 font-bold text-[8px] leading-tight block whitespace-nowrap overflow-hidden text-ellipsis">{e.name}</div>
                                      <div className="text-[10px] font-extrabold text-purple-800 mt-0.5 block whitespace-nowrap">{e.percentage}</div>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Rekomendasi Peningkatan */}
                      <div className="bg-amber-50/40 border border-amber-100 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          Rekomendasi Peningkatan Komprehensif
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">🛡️</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Budaya Bebas Sanksi (Just Culture):</span>
                              <span className="text-slate-600 leading-normal block">Menjamin perlindungan kerahasiaan penuh dan prinsip *non-punitive* bagi staf yang melaporkan insiden demi membangun iklim keterbukaan.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">📱</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">E-Pelaporan Digital Ringkas:</span>
                              <span className="text-slate-600 leading-normal block">Menyederhanakan formulir pelaporan menjadi sistem digital mobile/web yang dapat diisi secara cepat (&lt;2 menit) dengan opsi anonimitas.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">⏱️</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Respon Cepat & RCA Terstruktur:</span>
                              <span className="text-slate-600 leading-normal block">Memastikan komite KTRS memberikan respon cepat dan melaksanakan *Root Cause Analysis* (RCA) untuk membagikan *lesson learned* ke unit.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                            <span className="text-base shrink-0 leading-none">🏆</span>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">Program Safety Champion & Reward:</span>
                              <span className="text-slate-600 leading-normal block">Memberikan apresiasi dan penghargaan bagi unit/staf yang aktif melaporkan insiden sebagai wujud komitmen mutu rumah sakit.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 3} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 9: 3.2.4 Rata-Rata Persentase Respon Positif per Item Dimensi (Bagian 1) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Rata-Rata Respon Positif Per Item Dimensi (Bagian 1)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-3.5">
                    <div>
                      <h4 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>3.2.4 Rata-Rata Persentase Respon Positif per Item Dimensi Budaya Keselamatan Pasien</span>
                      </h4>
                      <p className="text-[9.5px] text-slate-500 mt-1 leading-relaxed text-justify">
                        Berikut merupakan rincian persentase respon positif staf rumah sakit <strong>{activeHospitalName}</strong> untuk setiap item pernyataan dalam kuesioner AHRQ SOPS® Version 2.0 pada tahun <strong>{tahunSurvei}</strong>. Data dikelompokkan secara terstruktur berdasarkan dimensi budaya keselamatan pasien masing-masing:
                      </p>
                    </div>

                    {/* Keterangan Warna Respon Item (Legend Bar) */}
                    <div className="bg-slate-50/90 border border-slate-200/90 px-3 py-2 rounded-xl flex items-center justify-between text-[10px] font-bold text-slate-700 shadow-2xs">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Positif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Netral</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Negatif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Tidak Menjawab / Tidak Tahu</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Item Cards */}
                    <div className="space-y-3.5">
                      {DIMENSION_ORDER.slice(0, 2).map((dimId, sliceIndex) => {
                        const index = sliceIndex;
                        const dimInfo = DIMENSI_INFO[dimId];
                        const questions = ALL_QUESTIONS_LAPORAN.filter(q => q.dim === dimId);
                        
                        let sumPosPercent = 0;
                        const qStats = questions.map(q => {
                          const stat = calculateQuestionStats(q);
                          sumPosPercent += stat.posPercent;
                          return { q, stat };
                        });
                        const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                        const status = getDimensionStatus(avgPosPercent);

                        return (
                          <div 
                            key={dimId} 
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                          >
                            {/* Card Header */}
                            <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 relative flex items-center gap-2.5">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                              <div className="w-[26px] h-[26px] min-w-[26px] bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-2xs">
                                <span className="text-[11px] font-black text-indigo-600 leading-none">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[11px] font-bold text-slate-800 tracking-tight leading-snug">{dimInfo.nama}</h3>
                                <p className="text-[8.5px] text-slate-500 font-medium leading-normal mt-0.5">{dimInfo.deskripsi}</p>
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="p-3 space-y-2.5">
                              <div className="space-y-2.5">
                                {qStats.map(({ q, stat }) => (
                                  <div key={q.id} className="flex flex-col gap-1.5">
                                    {/* Question Code & Text */}
                                    <div className="flex items-start gap-2">
                                      <span className="w-9 shrink-0 text-[10px] font-black text-indigo-600 leading-snug">{q.code}{(q as any).isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                      <p className="text-[10px] font-bold text-slate-700 leading-snug flex-1">{q.text}</p>
                                    </div>

                                    {/* Bar Chart */}
                                    <div className="h-[19px] flex rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 relative w-full">
                                      {stat.posPercent > 0 && (
                                        <div 
                                          className="h-full bg-emerald-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.posPercent}%` }}
                                        >
                                          {stat.posPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.posPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.neuPercent > 0 && (
                                        <div 
                                          className="h-full bg-yellow-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.neuPercent}%` }}
                                        >
                                          {stat.neuPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.neuPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.negPercent > 0 && (
                                        <div 
                                          className="h-full bg-rose-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.negPercent}%` }}
                                        >
                                          {stat.negPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.negPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.missingPercent > 0 && (
                                        <div 
                                          className="h-full bg-slate-400 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.missingPercent}%` }}
                                        >
                                          {stat.missingPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.missingPercent}%</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-slate-50/60 px-3 py-2 border-t border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[8.5px] text-slate-400 font-extrabold uppercase leading-none shrink-0">RESPON POSITIF:</span>
                                <span className="text-[13px] font-black text-slate-800 leading-none">{avgPosPercent}%</span>
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${status.bg} ${status.color} ${status.border} uppercase leading-none flex items-center justify-center shrink-0`}>
                                  {status.label}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 text-right leading-none shrink-0">Benchmark: 72.0% - 85.0%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 4} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 9: 3.2.4 Rata-Rata Persentase Respon Positif per Item Dimensi (Bagian 2) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Rata-Rata Respon Positif Per Item Dimensi (Bagian 2)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-3.5">
                    {/* Keterangan Warna Respon Item (Legend Bar) */}
                    <div className="bg-slate-50/90 border border-slate-200/90 px-3 py-2 rounded-xl flex items-center justify-between text-[10px] font-bold text-slate-700 shadow-2xs">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Positif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Netral</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Negatif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Tidak Menjawab / Tidak Tahu</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Item Cards */}
                    <div className="space-y-3.5">
                      {DIMENSION_ORDER.slice(2, 4).map((dimId, sliceIndex) => {
                        const index = sliceIndex + 2;
                        const dimInfo = DIMENSI_INFO[dimId];
                        const questions = ALL_QUESTIONS_LAPORAN.filter(q => q.dim === dimId);
                        
                        let sumPosPercent = 0;
                        const qStats = questions.map(q => {
                          const stat = calculateQuestionStats(q);
                          sumPosPercent += stat.posPercent;
                          return { q, stat };
                        });
                        const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                        const status = getDimensionStatus(avgPosPercent);

                        return (
                          <div 
                            key={dimId} 
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                          >
                            {/* Card Header */}
                            <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 relative flex items-center gap-2.5">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                              <div className="w-[26px] h-[26px] min-w-[26px] bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-2xs">
                                <span className="text-[11px] font-black text-indigo-600 leading-none">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[11px] font-bold text-slate-800 tracking-tight leading-snug">{dimInfo.nama}</h3>
                                <p className="text-[8.5px] text-slate-500 font-medium leading-normal mt-0.5">{dimInfo.deskripsi}</p>
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="p-3 space-y-2.5">
                              <div className="space-y-2.5">
                                {qStats.map(({ q, stat }) => (
                                  <div key={q.id} className="flex flex-col gap-1.5">
                                    {/* Question Code & Text */}
                                    <div className="flex items-start gap-2">
                                      <span className="w-9 shrink-0 text-[10px] font-black text-indigo-600 leading-snug">{q.code}{(q as any).isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                      <p className="text-[10px] font-bold text-slate-700 leading-snug flex-1">{q.text}</p>
                                    </div>

                                    {/* Bar Chart */}
                                    <div className="h-[19px] flex rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 relative w-full">
                                      {stat.posPercent > 0 && (
                                        <div 
                                          className="h-full bg-emerald-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.posPercent}%` }}
                                        >
                                          {stat.posPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.posPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.neuPercent > 0 && (
                                        <div 
                                          className="h-full bg-yellow-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.neuPercent}%` }}
                                        >
                                          {stat.neuPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.neuPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.negPercent > 0 && (
                                        <div 
                                          className="h-full bg-rose-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.negPercent}%` }}
                                        >
                                          {stat.negPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.negPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.missingPercent > 0 && (
                                        <div 
                                          className="h-full bg-slate-400 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.missingPercent}%` }}
                                        >
                                          {stat.missingPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.missingPercent}%</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-slate-50/60 px-3 py-2 border-t border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[8.5px] text-slate-400 font-extrabold uppercase leading-none shrink-0">RESPON POSITIF:</span>
                                <span className="text-[13px] font-black text-slate-800 leading-none">{avgPosPercent}%</span>
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${status.bg} ${status.color} ${status.border} uppercase leading-none flex items-center justify-center shrink-0`}>
                                  {status.label}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 text-right leading-none shrink-0">Benchmark: 72.0% - 85.0%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 5} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 9: 3.2.4 Rata-Rata Persentase Respon Positif per Item Dimensi (Bagian 3) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Rata-Rata Respon Positif Per Item Dimensi (Bagian 3)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-3">
                    {/* Keterangan Warna Respon Item (Legend Bar) */}
                    <div className="bg-slate-50/90 border border-slate-200/90 px-3 py-1.5 rounded-xl flex items-center justify-between text-[9.5px] font-bold text-slate-700 shadow-2xs">
                      <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Positif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Netral</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Negatif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Tidak Menjawab / Tidak Tahu</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Item Cards */}
                    <div className="space-y-3">
                      {DIMENSION_ORDER.slice(4, 7).map((dimId, sliceIndex) => {
                        const index = sliceIndex + 4;
                        const dimInfo = DIMENSI_INFO[dimId];
                        const questions = ALL_QUESTIONS_LAPORAN.filter(q => q.dim === dimId);
                        
                        let sumPosPercent = 0;
                        const qStats = questions.map(q => {
                          const stat = calculateQuestionStats(q);
                          sumPosPercent += stat.posPercent;
                          return { q, stat };
                        });
                        const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                        const status = getDimensionStatus(avgPosPercent);

                        return (
                          <div 
                            key={dimId} 
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                          >
                            {/* Card Header */}
                            <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 relative flex items-center gap-2.5">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                              <div className="w-[26px] h-[26px] min-w-[26px] bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-2xs">
                                <span className="text-[11px] font-black text-indigo-600 leading-none">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[11px] font-bold text-slate-800 tracking-tight leading-snug">{dimInfo.nama}</h3>
                                <p className="text-[8.5px] text-slate-500 font-medium leading-normal mt-0.5">{dimInfo.deskripsi}</p>
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="p-2.5 space-y-2">
                              <div className="space-y-2">
                                {qStats.map(({ q, stat }) => (
                                  <div key={q.id} className="flex flex-col gap-1">
                                    {/* Question Code & Text */}
                                    <div className="flex items-start gap-2">
                                      <span className="w-9 shrink-0 text-[10px] font-black text-indigo-600 leading-snug">{q.code}{(q as any).isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                      <p className="text-[10px] font-bold text-slate-700 leading-snug flex-1">{q.text}</p>
                                    </div>

                                    {/* Bar Chart */}
                                    <div className="h-[18px] flex rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 relative w-full">
                                      {stat.posPercent > 0 && (
                                        <div 
                                          className="h-full bg-emerald-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.posPercent}%` }}
                                        >
                                          {stat.posPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.posPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.neuPercent > 0 && (
                                        <div 
                                          className="h-full bg-yellow-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.neuPercent}%` }}
                                        >
                                          {stat.neuPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.neuPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.negPercent > 0 && (
                                        <div 
                                          className="h-full bg-rose-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.negPercent}%` }}
                                        >
                                          {stat.negPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.negPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.missingPercent > 0 && (
                                        <div 
                                          className="h-full bg-slate-400 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.missingPercent}%` }}
                                        >
                                          {stat.missingPercent >= 10 && <span className="text-[8.5px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.missingPercent}%</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-slate-50/60 px-3 py-2 border-t border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[8.5px] text-slate-400 font-extrabold uppercase leading-none shrink-0">RESPON POSITIF:</span>
                                <span className="text-[13px] font-black text-slate-800 leading-none">{avgPosPercent}%</span>
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${status.bg} ${status.color} ${status.border} uppercase leading-none flex items-center justify-center shrink-0`}>
                                  {status.label}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 text-right leading-none shrink-0">Benchmark: 72.0% - 85.0%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 6} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 9: 3.2.4 Rata-Rata Persentase Respon Positif per Item Dimensi (Bagian 4) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Rata-Rata Respon Positif Per Item Dimensi (Bagian 4)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-2.5">
                    {/* Keterangan Warna Respon Item (Legend Bar) */}
                    <div className="bg-slate-50/90 border border-slate-200/90 px-3 py-1.5 rounded-xl flex items-center justify-between text-[9px] font-bold text-slate-700 shadow-2xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Positif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Netral</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Negatif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 shadow-2xs"></span>
                          <span className="font-bold text-slate-700">Tidak Menjawab / Tidak Tahu</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Item Cards */}
                    <div className="space-y-2.5">
                      {DIMENSION_ORDER.slice(7, 10).map((dimId, sliceIndex) => {
                        const index = sliceIndex + 7;
                        const dimInfo = DIMENSI_INFO[dimId];
                        const questions = ALL_QUESTIONS_LAPORAN.filter(q => q.dim === dimId);
                        
                        let sumPosPercent = 0;
                        const qStats = questions.map(q => {
                          const stat = calculateQuestionStats(q);
                          sumPosPercent += stat.posPercent;
                          return { q, stat };
                        });
                        const avgPosPercent = questions.length > 0 ? Math.round(sumPosPercent / questions.length) : 0;
                        const status = getDimensionStatus(avgPosPercent);

                        return (
                          <div 
                            key={dimId} 
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                          >
                            {/* Card Header */}
                            <div className="p-2 bg-slate-50/80 border-b border-slate-200 relative flex items-center gap-2">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                              <div className="w-[24px] h-[24px] min-w-[24px] bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-2xs">
                                <span className="text-[10px] font-black text-indigo-600 leading-none">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[10.5px] font-bold text-slate-800 tracking-tight leading-snug">{dimInfo.nama}</h3>
                                <p className="text-[8px] text-slate-500 font-medium leading-normal mt-0.5">{dimInfo.deskripsi}</p>
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="p-2 space-y-1.5">
                              <div className="space-y-1.5">
                                {qStats.map(({ q, stat }) => (
                                  <div key={q.id} className="flex flex-col gap-1">
                                    {/* Question Code & Text */}
                                    <div className="flex items-start gap-1.5">
                                      <span className="w-8 shrink-0 text-[9.5px] font-black text-indigo-600 leading-snug">{q.code}{(q as any).isReversed && !q.code.endsWith('R') ? 'R' : ''}</span>
                                      <p className="text-[9.5px] font-bold text-slate-700 leading-snug flex-1">{q.text}</p>
                                    </div>

                                    {/* Bar Chart */}
                                    <div className="h-[16px] flex rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 relative w-full">
                                      {stat.posPercent > 0 && (
                                        <div 
                                          className="h-full bg-emerald-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.posPercent}%` }}
                                        >
                                          {stat.posPercent >= 10 && <span className="text-[8px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.posPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.neuPercent > 0 && (
                                        <div 
                                          className="h-full bg-yellow-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.neuPercent}%` }}
                                        >
                                          {stat.neuPercent >= 10 && <span className="text-[8px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.neuPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.negPercent > 0 && (
                                        <div 
                                          className="h-full bg-rose-500 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.negPercent}%` }}
                                        >
                                          {stat.negPercent >= 10 && <span className="text-[8px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.negPercent}%</span>}
                                        </div>
                                      )}
                                      {stat.missingPercent > 0 && (
                                        <div 
                                          className="h-full bg-slate-400 flex items-center justify-center overflow-hidden shrink-0 relative"
                                          style={{ width: `${stat.missingPercent}%` }}
                                        >
                                          {stat.missingPercent >= 10 && <span className="text-[8px] font-extrabold text-white leading-none select-none px-0.5 whitespace-nowrap flex items-center justify-center h-full w-full">{stat.missingPercent}%</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="bg-slate-50/60 px-2.5 py-1.5 border-t border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[8px] text-slate-400 font-extrabold uppercase leading-none shrink-0">RESPON POSITIF:</span>
                                <span className="text-[12px] font-black text-slate-800 leading-none">{avgPosPercent}%</span>
                                <div className={`px-2 py-0.5 rounded-full text-[7.5px] font-black border ${status.bg} ${status.color} ${status.border} uppercase leading-none flex items-center justify-center shrink-0`}>
                                  {status.label}
                                </div>
                              </div>
                              <span className="text-[8.5px] font-bold text-slate-500 text-right leading-none shrink-0">Benchmark: 72.0% - 85.0%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Interpretasi & Analisa Data Card */}
                    {itemLevelStrengths.length > 0 && itemLevelWeaknesses.length > 0 && (
                      <div className="bg-indigo-50/40 border border-indigo-100 p-2 rounded-xl space-y-1">
                        <h5 className="text-[10px] font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          Interpretasi & Analisa Data Hasil Per Item
                        </h5>
                        <p className="text-[9px] text-slate-700 leading-snug text-justify">
                          Analisis mikro pada tingkat butir pernyataan (item) di <strong>{activeHospitalName}</strong> mengidentifikasi kekuatan utama terletak pada item <strong>{itemLevelStrengths[0].id}</strong> (&ldquo;{itemLevelStrengths[0].text}&rdquo;) dengan pencapaian respon positif sebesar <strong>{itemLevelStrengths[0].score.toFixed(1)}%</strong>, disusul oleh item <strong>{itemLevelStrengths[1].id}</strong> sebesar <strong>{itemLevelStrengths[1].score.toFixed(1)}%</strong>. 
                          Sebaliknya, kerentanan tertinggi diidentifikasi pada item <strong>{itemLevelWeaknesses[0].id}</strong> (&ldquo;{itemLevelWeaknesses[0].text}&rdquo;) yang hanya mengumpulkan respon positif sebesar <strong>{itemLevelWeaknesses[0].score.toFixed(1)}%</strong>, disusul item <strong>{itemLevelWeaknesses[1].id}</strong> sebesar <strong>{itemLevelWeaknesses[1].score.toFixed(1)}%</strong>.
                        </p>
                      </div>
                    )}

                    {/* Rekomendasi Peningkatan */}
                    <div className="bg-emerald-50/40 border border-emerald-100 p-2 rounded-xl space-y-1">
                      <h5 className="text-[10px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Rekomendasi Strategis Berbasis Hasil Per Item
                      </h5>
                      <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
                        {itemLevelWeaknesses.slice(0, 2).map((item, idx) => {
                          const icons = ['💡', '🛠️'];
                          return (
                            <div key={item.id} className="flex items-start gap-1 bg-white p-1.5 rounded-lg border border-emerald-100/80">
                              <span className="text-[10px] shrink-0">{icons[idx]}</span>
                              <span className="text-slate-700 font-medium leading-snug">
                                Untuk item <strong>{item.id}</strong> ({item.score.toFixed(1)}%): Rancang panduan teknis operasional terpadu dan selenggarakan workshop penyamaan persepsi.
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 7} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LEMBAR 10: 3.2.5 Perbandingan berdasarkan Profesi (Dynamic Auto-Pagination Pages) */}
          {profesiPages.map((posChunk, pIdx) => {
            const currentPageNum = 6 + demografiPages.length + 8 + pIdx;
            return (
              <div key={`profesi-page-${pIdx}`} className="w-full flex flex-col items-center">
                <div className="word-page word-page-landscape print-page">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Running Header */}
                      <div className="border-b border-slate-200 pb-1 mb-2 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Analisis Demografis & Komparatif (Profesi {pIdx > 0 ? `- Bagian ${pIdx + 1}` : ''})</span>
                        <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                      </div>

                      <section className="space-y-2">
                        <div>
                          <h4 className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                            3.2.5 Perbandingan Respon Positif Budaya Keselamatan Berdasarkan Karakteristik Demografis
                          </h4>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed text-justify">
                            Budaya keselamatan pasien bersifat heterogen dan dapat dirasakan berbeda antar profesi, unit pelayanan, maupun lama masa bakti staf. Berikut adalah tabel perbandingan persentase respon positif seluruh dimensi berdasarkan posisi staf (profesi) di <strong>{activeHospitalName}</strong>:
                          </p>
                        </div>

                        {/* A. Berdasarkan Profesi (Posisi Staf) */}
                        <div className="space-y-1">
                          <h5 className="text-[9.5px] font-bold text-slate-800 flex items-center gap-1 bg-slate-50/85 p-1 rounded-md border border-slate-100">
                            <span className="w-1.5 h-3 bg-indigo-600 rounded-sm"></span>
                            A. Perbandingan Dimensi Berdasarkan Posisi Staf (Profesi {pIdx > 0 ? `Lanjutan ${pIdx + 1}` : ''})
                          </h5>
                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full table-fixed text-left border-collapse text-[7.5px]">
                              <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '35%' }} />
                                {posChunk.map(pos => (
                                  <col key={`col-pos-${pos.name}`} style={{ width: `${60 / posChunk.length}%` }} />
                                ))}
                              </colgroup>
                              <thead>
                                <tr className="bg-indigo-900 text-white font-extrabold text-[7.5px] uppercase border-b border-indigo-950">
                                  <th className="p-1 border-r border-indigo-800 text-center break-words whitespace-normal" style={{ width: '5%' }}>No</th>
                                  <th className="p-1 border-r border-indigo-800 text-center break-words whitespace-normal" style={{ width: '35%', textAlign: 'center' }}>Dimensi Budaya Keselamatan</th>
                                  {posChunk.map(pos => (
                                    <th key={pos.name} className="p-1 text-center border-r border-indigo-800" style={{ width: `${60 / posChunk.length}%` }}>
                                      {pos.name} <span className="font-mono font-normal block text-[6.5px] text-indigo-200">(N={pos.value})</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                                {Object.keys(DIMENSI_INFO).map((dimId, idx) => {
                                  const info = DIMENSI_INFO[dimId];
                                  const scoreObj = positionDimensionScores.find(s => s.id === dimId);
                                  return (
                                    <tr key={dimId} className="hover:bg-slate-50/40">
                                      <td className="p-1 border-r border-slate-100 text-center font-bold text-indigo-700" style={{ width: '5%' }}>{idx + 1}</td>
                                      <td className="p-1 border-r border-slate-100 font-semibold text-slate-800 break-words text-[8.5px]" style={{ width: '35%' }}>{info.nama}</td>
                                      {posChunk.map(pos => {
                                        const val = scoreObj ? scoreObj[pos.name] : null;
                                        return (
                                          <td key={pos.name} className="p-1 text-center border-r border-slate-100 font-extrabold text-teal-800 bg-slate-50/20" style={{ width: `${60 / posChunk.length}%` }}>
                                            {val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-'}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Running Footer */}
                    <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>Laporan Survei Budaya Keselamatan Pasien</span>
                      <span>Halaman {currentPageNum} dari {totalReportPages}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* LEMBAR 10-B: 3.2.5-B Perbandingan berdasarkan Unit Kerja (Dynamic Auto-Pagination Pages) */}
          {unitPages.map((unitChunk, uIdx) => {
            const currentPageNum = 6 + demografiPages.length + 8 + profesiPages.length + uIdx;
            return (
              <div key={`unit-page-${uIdx}`} className="w-full flex flex-col items-center">
                <div className="word-page word-page-landscape print-page">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Running Header */}
                      <div className="border-b border-slate-200 pb-1 mb-2 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Analisis Demografis & Komparatif (Unit Kerja {uIdx > 0 ? `- Bagian ${uIdx + 1}` : ''})</span>
                        <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                      </div>

                      <section className="space-y-2">
                        <div>
                          <h4 className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <LayoutDashboard className="w-3.5 h-3.5 text-teal-600" />
                            3.2.5 Perbandingan Respon Positif Budaya Keselamatan Berdasarkan Karakteristik Demografis {uIdx > 0 ? `(Bagian ${uIdx + 1})` : ''}
                          </h4>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed text-justify">
                            Analisis tingkat unit pelayanan membantu pimpinan rumah sakit memetakan disparitas iklim keselamatan secara spesifik. Berikut adalah tabel perbandingan persentase respon positif seluruh dimensi berdasarkan Unit Kerja di <strong>{activeHospitalName}</strong>:
                          </p>
                        </div>

                        {/* B. Berdasarkan Unit Kerja */}
                        <div className="space-y-1">
                          <h5 className="text-[9.5px] font-bold text-slate-800 flex items-center gap-1 bg-slate-50/85 p-1 rounded-md border border-slate-100">
                            <span className="w-1.5 h-3 bg-teal-600 rounded-sm"></span>
                            B. Perbandingan Dimensi Berdasarkan Unit Kerja {uIdx > 0 ? `(Lanjutan ${uIdx + 1})` : ''}
                          </h5>
                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full table-fixed text-left border-collapse text-[7.5px]">
                              <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '35%' }} />
                                {unitChunk.map(u => (
                                  <col key={`col-unit-${u.name}`} style={{ width: `${60 / unitChunk.length}%` }} />
                                ))}
                              </colgroup>
                              <thead>
                                <tr className="bg-teal-800 text-white font-extrabold text-[7.5px] uppercase border-b border-teal-900">
                                  <th className="p-1 border-r border-teal-700 text-center break-words whitespace-normal" style={{ width: '5%' }}>No</th>
                                  <th className="p-1 border-r border-teal-700 text-center break-words whitespace-normal" style={{ width: '35%', textAlign: 'center' }}>Dimensi Budaya Keselamatan</th>
                                  {unitChunk.map(u => (
                                    <th key={u.name} className="p-1 text-center border-r border-teal-700" style={{ width: `${60 / unitChunk.length}%` }}>
                                      {u.name} <span className="font-mono font-normal block text-[6.5px] text-teal-200">(N={u.value})</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                                {Object.keys(DIMENSI_INFO).map((dimId, idx) => {
                                  const info = DIMENSI_INFO[dimId];
                                  const scoreObj = unitDimensionScores.find(s => s.id === dimId);
                                  return (
                                    <tr key={dimId} className="hover:bg-slate-50/40">
                                      <td className="p-1 border-r border-slate-100 text-center font-bold text-teal-700" style={{ width: '5%' }}>{idx + 1}</td>
                                      <td className="p-1 border-r border-slate-100 font-semibold text-slate-800 break-words text-[8.5px]" style={{ width: '35%' }}>{info.nama}</td>
                                      {unitChunk.map(u => {
                                        const val = scoreObj ? scoreObj[u.name] : null;
                                        return (
                                          <td key={u.name} className="p-1 text-center border-r border-slate-100 font-extrabold text-teal-800 bg-slate-50/20" style={{ width: `${60 / unitChunk.length}%` }}>
                                            {val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-'}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Running Footer */}
                    <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>Laporan Survei Budaya Keselamatan Pasien</span>
                      <span>Halaman {currentPageNum} dari {totalReportPages}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="w-full flex flex-col items-center">
            <div className="word-page word-page-landscape print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Analisis Demografis & Komparatif (Masa Kerja & Jam Kerja)</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-2.5">
         {/* C. Berdasarkan Masa Kerja & Jam Kerja */}
                    <div className="space-y-1">
                      <h5 className="text-[9.5px] font-bold text-slate-800 flex items-center gap-1 bg-slate-50 p-1 px-2 rounded-lg border border-slate-100">
                        <span className="w-1.5 h-3 bg-amber-600 rounded-sm"></span>
                        C. Perbandingan Dimensi Berdasarkan Masa Kerja (Lama Kerja) & Jam Kerja per Minggu
                      </h5>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full table-fixed text-left border-collapse text-[7.5px]">
                        <colgroup>
                          <col style={{ width: '5%' }} />
                          <col style={{ width: '35%' }} />
                          {demografiStats.g1Data.slice(0, 4).map(g1 => (
                            <col key={`col-g1-${g1.name}`} style={{ width: `${30 / Math.max(1, demografiStats.g1Data.slice(0, 4).length)}%` }} />
                          ))}
                          {demografiStats.g3Data.slice(0, 4).map(g3 => (
                            <col key={`col-g3-${g3.name}`} style={{ width: `${30 / Math.max(1, demografiStats.g3Data.slice(0, 4).length)}%` }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-800 text-white font-extrabold text-[7.5px] uppercase border-b border-slate-700">
                            <th rowSpan={2} className="p-1 border-r border-slate-700 text-center align-middle break-words whitespace-normal" style={{ width: '5%', textAlign: 'center' }}>No</th>
                            <th rowSpan={2} className="p-1 border-r border-slate-700 text-center align-middle break-words whitespace-normal" style={{ width: '35%', textAlign: 'center' }}>Dimensi Budaya Keselamatan</th>
                            <th colSpan={demografiStats.g1Data.slice(0, 4).length || 4} className="p-1 text-center border-r border-slate-700 bg-slate-700 break-words whitespace-normal" style={{ width: '30%', textAlign: 'center' }}>
                              Masa Kerja (Staff Tenure)
                            </th>
                            <th colSpan={demografiStats.g3Data.slice(0, 4).length || 4} className="p-1 text-center bg-slate-650" style={{ width: '30%', textAlign: 'center' }}>
                              Jam Kerja per Minggu
                            </th>
                          </tr>
                          <tr className="bg-slate-750 text-white font-bold text-[7px] uppercase border-b border-slate-800 bg-slate-700">
                            {demografiStats.g1Data.slice(0, 4).map(g1 => (
                              <th key={g1.name} className="py-0.5 px-0.5 text-center font-medium leading-tight border-r border-slate-600" style={{ width: `${30 / Math.max(1, demografiStats.g1Data.slice(0, 4).length)}%`, textAlign: 'center' }}>
                                {g1.name.replace('hingga', '-').replace('atau lebih', '+')}
                              </th>
                            ))}
                            {demografiStats.g3Data.slice(0, 4).map(g3 => (
                              <th key={g3.name} className="py-0.5 px-0.5 text-center font-medium leading-tight border-r border-slate-600 last:border-r-0" style={{ width: `${30 / Math.max(1, demografiStats.g3Data.slice(0, 4).length)}%`, textAlign: 'center' }}>
                                {g3.name.replace('hingga', '-').replace('atau lebih', '+')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                          {Object.keys(DIMENSI_INFO).map((dimId, idx) => {
                            const info = DIMENSI_INFO[dimId];
                            const tObj = tenureDimensionScores.find(s => s.id === dimId);
                            const wObj = workHoursDimensionScores.find(s => s.id === dimId);
                            return (
                              <tr key={dimId} className="hover:bg-slate-50/40">
                                <td className="p-1 border-r border-slate-100 text-center font-bold text-amber-700" style={{ width: '5%' }}>{idx + 1}</td>
                                <td className="p-1 border-r border-slate-100 font-semibold text-slate-800 break-words text-[8.5px]" style={{ width: '35%' }}>{info.nama}</td>
                                {demografiStats.g1Data.slice(0, 4).map(g1 => {
                                  const val = tObj ? tObj[g1.name] : null;
                                  return (
                                    <td key={g1.name} className="p-1 text-center border-r border-slate-100 font-extrabold text-teal-800 bg-teal-50/20" style={{ width: `${30 / Math.max(1, demografiStats.g1Data.slice(0, 4).length)}%` }}>
                                      {val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-'}
                                    </td>
                                  );
                                })}
                                {demografiStats.g3Data.slice(0, 4).map(g3 => {
                                  const val = wObj ? wObj[g3.name] : null;
                                  return (
                                    <td key={g3.name} className="p-1 text-center border-r border-slate-100 font-extrabold text-indigo-800 bg-indigo-50/20 last:border-r-0" style={{ width: `${30 / Math.max(1, demografiStats.g3Data.slice(0, 4).length)}%` }}>
                                      {val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Interpretasi & Analisa Data Card */}
                  <div className="bg-indigo-50/40 border border-indigo-100 p-2.5 px-3 rounded-xl space-y-1">
                    <h5 className="text-[10px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Interpretasi & Analisa Data Karakteristik Demografis
                    </h5>
                    <p className="text-[9px] text-slate-700 leading-snug text-justify">
                      Hasil analisa silang menunjukkan variasi budaya keselamatan yang dipengaruhi secara langsung oleh faktor demografis:
                      (1) <strong>Berdasarkan Profesi</strong>, terdapat kesenjangan pandangan di mana posisi staf dengan interaksi klinis terpadat cenderung menunjukkan respon positif yang dinamis dibanding staf administrasi. 
                      (2) <strong>Berdasarkan Unit Kerja</strong>, unit dengan beban kerja dan stressor tinggi seperti IGD dan ICU memerlukan perhatian khusus karena berpotensi mengalami kelelahan staf (burnout) yang dapat berdampak langsung pada penurunan kualitas iklim keselamatan.
                      (3) <strong>Berdasarkan Masa Jabatan & Jam Kerja</strong>, staf dengan masa jabatan baru (&lt;1 tahun) cenderung melihat iklim keselamatan lebih ideal, sementara staf senior (&gt;10 tahun) memiliki pandangan yang lebih realistis dan waspada terhadap celah keselamatan sistemik. Jam kerja yang berlebih (&gt;60 jam/minggu) secara konsisten berkorelasi dengan penurunan persentase respon positif pada dimensi Ketenagaan dan Beban Kerja.
                    </p>
                  </div>

                  {/* Rekomendasi Peningkatan */}
                  <div className="bg-amber-50/40 border border-amber-100 p-2.5 px-3 rounded-xl space-y-1">
                    <h5 className="text-[10px] font-bold text-amber-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-amber-600" />
                      Rekomendasi Peningkatan Intervensi Segmental
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[8.5px]">
                      <div className="flex items-start gap-1 bg-white p-1.5 px-2 rounded-lg border border-amber-100/80">
                        <span className="text-xs shrink-0">👥</span>
                        <span className="text-slate-700 font-medium leading-tight">Lakukan focus group discussion (FGD) khusus per kelompok profesi klinis untuk menggali hambatan komunikasi yang unik di unit masing-masing.</span>
                      </div>
                      <div className="flex items-start gap-1 bg-white p-1.5 px-2 rounded-lg border border-amber-100/80">
                        <span className="text-xs shrink-0">🏥</span>
                        <span className="text-slate-700 font-medium leading-tight">Prioritaskan dukungan sumber daya ketenagaan ekstra bagi unit-unit kritis (IGD, ICU, Kamar Operasi) dengan tingkat respon positif &lt;50%.</span>
                      </div>
                      <div className="flex items-start gap-1 bg-white p-1.5 px-2 rounded-lg border border-amber-100/80">
                        <span className="text-xs shrink-0">⏰</span>
                        <span className="text-slate-700 font-medium leading-tight">Kendalikan kebijakan jam lembur staf secara ketat guna menekan tingkat fatigue (kelelahan ekstrim) demi keselamatan prosedur pelayanan.</span>
                      </div>
                      <div className="flex items-start gap-1 bg-white p-1.5 px-2 rounded-lg border border-amber-100/80">
                        <span className="text-xs shrink-0">🎓</span>
                        <span className="text-slate-700 font-medium leading-tight">Sediakan program orientasi budaya keselamatan yang komprehensif bagi staf baru yang memiliki masa bakti di bawah satu tahun.</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 11: Perbandingan dengan Tahun Sebelumnya / Perbandingan Periode */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Analisis Trend Historis & Perbandingan Periode</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-[12px] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>3.2.6 Perbandingan Respon Positif Budaya Keselamatan dengan Periode / Tahun Sebelumnya</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed text-justify">
                      Analisis tren longitudinal membandingkan capaian persentase respon positif antara tahun terpilih (<strong>{tahunSurvei}</strong>) dengan tahun perbandingan (<strong>{previousYear || 'Sebelumnya'}</strong>) guna mendeteksi peningkatan mutu atau penurunan iklim keselamatan:
                    </p>
                  </div>

                  {previousYear && priorYearScores ? (
                    <div className="space-y-3">
                      {/* Grafik Comparison BarChart */}
                      <div className="bg-slate-50/60 border border-slate-200 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1 px-1">
                          <span>Grafik Perbandingan Respon Positif Per Dimensi (%)</span>
                          <span className="text-emerald-700">{tahunSurvei} vs {previousYear}</span>
                        </div>
                        <div className="w-full h-36" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={dimensionScores.map(d => {
                                const prior = priorYearScores.find(p => p.kode === d.kode)?.percentage || 0;
                                return {
                                  kode: d.kode,
                                  [previousYear]: parseFloat(prior.toFixed(1)),
                                  [tahunSurvei]: parseFloat(d.percentage.toFixed(1))
                                };
                              })} 
                              margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="kode" tick={{ fontSize: 8, fill: '#475569', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} unit="%" />
                              <Tooltip formatter={(value: any) => [`${value}%`]} labelStyle={{ fontWeight: 'bold', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                              <Legend wrapperStyle={{ fontSize: '8.5px', paddingTop: '2px', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                              <Bar dataKey={previousYear} fill="#94a3b8" radius={[3, 3, 0, 0]} name={`Tahun ${previousYear}`} isAnimationActive={false} />
                              <Bar dataKey={tahunSurvei} fill="#0d9488" radius={[3, 3, 0, 0]} name={`Tahun ${tahunSurvei}`} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Tabel Perbandingan Periode */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full table-fixed text-left border-collapse text-[8.5px]">
                          <colgroup>
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '45%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-emerald-900 text-white font-extrabold uppercase text-[8px] border-b border-emerald-950">
                              <th className="p-1.5 border-r border-emerald-800 text-center break-words whitespace-normal" style={{ width: '10%' }}>Kode</th>
                              <th className="p-1.5 border-r border-emerald-800 break-words whitespace-normal" style={{ width: '45%' }}>Dimensi Budaya Keselamatan</th>
                              <th className="p-1.5 text-center border-r border-emerald-800 break-words whitespace-normal" style={{ width: '15%' }}>{previousYear}</th>
                              <th className="p-1.5 text-center border-r border-emerald-800 break-words whitespace-normal" style={{ width: '15%' }}>{tahunSurvei}</th>
                              <th className="p-1.5 text-center break-words whitespace-normal" style={{ width: '15%' }}>Selisih (Trend)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                            {dimensionScores.map(d => {
                              const prior = priorYearScores.find(p => p.kode === d.kode)?.percentage || 0;
                              const diff = d.percentage - prior;
                              return (
                                <tr key={d.kode} className="hover:bg-slate-50/40">
                                  <td className="p-1.5 border-r border-slate-100 text-center font-bold text-slate-700" style={{ width: '10%' }}>{d.kode}</td>
                                  <td className="p-1.5 border-r border-slate-100 font-semibold text-slate-800 break-words" style={{ width: '45%' }}>{d.nama}</td>
                                  <td className="p-1.5 text-center border-r border-slate-100 font-bold text-slate-500" style={{ width: '15%' }}>{prior.toFixed(1)}%</td>
                                  <td className="p-1.5 text-center border-r border-slate-100 font-extrabold text-teal-800" style={{ width: '15%' }}>{d.percentage.toFixed(1)}%</td>
                                  <td className="p-1.5 text-center" style={{ width: '15%' }}>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black inline-flex items-center gap-1 ${diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                      {diff >= 0 ? '▲' : '▼'} {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Interpretasi & Rekomendasi Tren Periode */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl space-y-1">
                          <h5 className="text-[10.5px] font-bold text-emerald-900 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Interpretasi Tren Perbandingan
                          </h5>
                          <p className="text-[9.5px] text-slate-700 leading-relaxed text-justify">
                            Secara keseluruhan, perbandingan antara periode <strong>{previousYear}</strong> dan <strong>{tahunSurvei}</strong> menunjukkan dinamika perkembangan budaya keselamatan pasien. Dimensi yang mengalami peningkatan tertinggi mencerminkan efektivitas program intervensi mutu yang telah dijalankan, sedangkan dimensi yang mengalami penurunan memerlukan evaluasi dan penyegaran intervensi secara berkelanjutan.
                          </p>
                        </div>

                        <div className="bg-teal-50/50 border border-teal-100 p-2.5 rounded-xl space-y-1">
                          <h5 className="text-[10.5px] font-bold text-teal-900 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-teal-600" />
                            Rekomendasi Tindak Lanjut Periode
                          </h5>
                          <p className="text-[9.5px] text-slate-700 leading-relaxed text-justify">
                            Diprioritaskan untuk mempertahankan pencapaian pada dimensi positif dan memperkuat pemantauan berkala pada dimensi yang mengalami penurunan. Komite Mutu & Keselamatan Pasien direkomendasikan menyusun Rencana Aksi Keselamatan Pasien (RAKP) berbasis target kinerja bulanan.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-slate-600 leading-relaxed text-justify">
                        Silakan pilih <strong>Perbandingan Periode</strong> pada dropdown filter header di atas (contoh: <em>vs 2025</em> atau <em>vs 2024</em>). Sistem akan secara otomatis mensinkronkan grafik, tabel komparasi, interpretasi, dan rekomendasi berdasarkan data histori database.
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 1} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 11-B: Perbandingan dengan Rumah Sakit Lain (Benchmark) */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Analisis Perbandingan Benchmark</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-[11px] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>3.2.7 Perbandingan Respon Positif Dimensi Budaya Keselamatan dengan Rumah Sakit Lain (Benchmark)</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed text-justify">
                      Pengukuran eksternal (benchmarking) membantu mengidentifikasi posisi tawar, gap pencapaian mutu, dan standar pelayanan rumah sakit dibanding fasilitas kesehatan mitra lainnya:
                    </p>
                  </div>

                  {selectedBenchmarkHospital ? (
                    currentRequestForSelectedHospital?.status === 'approved' && benchmarkData ? (
                      <div className="space-y-3">
                        {/* Grafik Benchmark BarChart */}
                        <div className="bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-xl">
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900 mb-1 px-1">
                            <span>Grafik Komparasi Benchmark RS Anda vs RS Pembanding (%)</span>
                            <span className="text-indigo-700">{selectedBenchmarkHospital.namaRs}</span>
                          </div>
                          <div className="w-full h-36" style={{ fontFamily: "'Poppins', var(--font-sans), sans-serif" }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={benchmarkData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="kode" tick={{ fontSize: 8, fill: '#475569', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} unit="%" />
                                <Tooltip formatter={(value: any) => [`${value}%`]} labelStyle={{ fontWeight: 'bold', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                                <Legend wrapperStyle={{ fontSize: '8.5px', paddingTop: '2px', fontFamily: "'Poppins', var(--font-sans), sans-serif" }} />
                                <Bar dataKey="rsPct" fill="#4f46e5" radius={[3, 3, 0, 0]} name={`${activeHospitalName} (Anda)`} isAnimationActive={false} />
                                <Bar dataKey="benchPct" fill="#94a3b8" radius={[3, 3, 0, 0]} name={selectedBenchmarkHospital.namaRs} isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Tabel Benchmark */}
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full table-fixed text-left border-collapse text-[8.5px]">
                            <colgroup>
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '40%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '20%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-indigo-900 text-white font-extrabold uppercase text-[8px] border-b border-indigo-950">
                                <th className="p-1.5 border-r border-indigo-800 text-center break-words whitespace-normal" style={{ width: '10%' }}>Kode</th>
                                <th className="p-1.5 border-r border-indigo-800 break-words whitespace-normal" style={{ width: '40%' }}>Dimensi Budaya Keselamatan</th>
                                <th className="p-1.5 text-center border-r border-indigo-800 break-words whitespace-normal" style={{ width: '15%' }}>{activeHospitalName} (Anda)</th>
                                <th className="p-1.5 text-center border-r border-indigo-800 break-words whitespace-normal" style={{ width: '15%' }}>{selectedBenchmarkHospital.namaRs}</th>
                                <th className="p-1.5 text-center break-words whitespace-normal" style={{ width: '20%' }}>Kesenjangan (Gap)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                              {benchmarkData.map(b => (
                                <tr key={b.kode} className="hover:bg-slate-50/40">
                                  <td className="p-1.5 border-r border-slate-100 text-center font-bold text-slate-700" style={{ width: '10%' }}>{b.kode}</td>
                                  <td className="p-1.5 border-r border-slate-100 font-semibold text-slate-800 break-words" style={{ width: '40%' }}>{b.nama}</td>
                                  <td className="p-1.5 text-center border-r border-slate-100 font-extrabold text-indigo-700 bg-slate-50/20" style={{ width: '15%' }}>{b.rsPct.toFixed(1)}%</td>
                                  <td className="p-1.5 text-center border-r border-slate-100 font-bold text-slate-500" style={{ width: '15%' }}>{b.benchPct.toFixed(1)}%</td>
                                  <td className="p-1.5 text-center" style={{ width: '20%' }}>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black inline-flex items-center gap-1 ${b.diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                      {b.diff >= 0 ? '▲ +' : '▼ '} {b.diff >= 0 ? `+${b.diff.toFixed(1)}%` : `${b.diff.toFixed(1)}%`}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Interpretasi & Rekomendasi Benchmark */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl space-y-1">
                            <h5 className="text-[10.5px] font-bold text-indigo-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              Interpretasi Analisa Benchmark
                            </h5>
                            <p className="text-[9.5px] text-slate-700 leading-relaxed text-justify">
                              Hasil komparasi formal dengan <strong>{selectedBenchmarkHospital.namaRs}</strong> mengidentifikasi posisi tawar mutu layanan. Dimensi dengan gap positif merupakan keunggulan kompetitif rumah sakit Anda, sedangkan dimensi dengan gap negatif menjadi fokus prioritas pembelajaran praktik terbaik.
                            </p>
                          </div>

                          <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl space-y-1">
                            <h5 className="text-[10.5px] font-bold text-blue-900 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-blue-600" />
                              Rekomendasi Pembelajaran Mitra
                            </h5>
                            <p className="text-[9.5px] text-slate-700 leading-relaxed text-justify">
                              Direkomendasikan mengadakan kegiatan <em>comparative bench-learning</em> (studi tiru) ke <strong>{selectedBenchmarkHospital.namaRs}</strong> khusus untuk unit-unit kerja yang memiliki gap capaian di bawah mitra benchmark.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Status Benchmark Rumah Sakit</span>
                        </div>
                        <p className="text-xs text-amber-800 font-bold leading-relaxed">
                          &ldquo;Belum terdapat Rumah Sakit pembanding yang telah disetujui.&rdquo;
                        </p>
                        <p className="text-[10.5px] text-amber-700 leading-relaxed">
                          Silakan tentukan dan mintakan izin akses benchmark pada menu <strong>Analisa Data → Benchmark dengan Rumah Sakit Lain</strong>. Setelah disetujui oleh Rumah Sakit pembanding, data benchmark otomatis akan terintegrasi pada halaman laporan ini secara realtime.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-2.5">
                      <Globe className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-slate-600 leading-relaxed text-justify">
                        Untuk melihat perbandingan benchmark eksternal, silakan pilih Rumah Sakit Pembanding pada dropdown header di atas. Data akan disinkronkan dari database secara realtime.
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400 mt-auto">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 2} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 11.5: BAB III HASIL & PEMBAHASAN - Kualitatif */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Analisis Kualitatif & Rekomendasi</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>3.2.8 Hasil Analisis Kualitatif dan Rekomendasi Peningkatan Budaya Keselamatan Pasien</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed text-justify">
                      Berdasarkan masukan responden survei budaya keselamatan pasien tahun {selectedYear === 'Semua Tahun' ? new Date().getFullYear().toString() : selectedYear} di {activeHospitalName}:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="text-slate-500 font-bold text-[9px] mb-1">TOTAL KOMENTAR MASUK</div>
                      <div className="text-slate-900 font-black text-lg md:text-xl">
                        {commentsStats.total} <span className="text-[10px] font-medium text-slate-500">komentar</span>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                      <div className="text-emerald-700 font-bold text-[9px] mb-1 uppercase tracking-wide">Komentar Positif</div>
                      <div className="text-emerald-900 font-black text-lg md:text-xl flex items-baseline gap-1.5">
                        {commentsStats.positivePercentage}%
                        <span className="text-[10px] font-medium text-emerald-600">({commentsStats.positive} komentar)</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                      <div className="text-amber-700 font-bold text-[9px] mb-1 uppercase tracking-wide">Saran & Masukan Konstruktif</div>
                      <div className="text-amber-900 font-black text-lg md:text-xl flex items-baseline gap-1.5">
                        {commentsStats.constructivePercentage}%
                        <span className="text-[10px] font-medium text-amber-600">({commentsStats.constructive} komentar)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-800 text-[11px]">1. Interpretasi & Analisis Data</h5>
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-[10px] text-slate-700 leading-relaxed text-justify">
                      {commentsStats.total > 0 ? (
                        <p>{commentsStats.analysisText}</p>
                      ) : (
                        <p className="text-slate-500 italic">Belum terdapat komentar atau masukan responden pada tahun survei yang dipilih.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-800 text-[11px]">2. Rekomendasi Peningkatan</h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Berikut adalah rangkuman rekomendasi peningkatan berdasarkan analisis kualitatif dari responden survei:
                    </p>
                    
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <ul className="text-[9.5px] text-slate-700 space-y-2.5">
                        {commentsStats.recommendations.length > 0 ? commentsStats.recommendations.map((rec, idx) => {
                          const icons = ["🏆", "🌟", "📢", "🎯"];
                          return (
                            <li key={idx} className="flex gap-2 items-start">
                              <span className="bg-white shadow-sm border border-slate-200 w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 select-none">
                                {icons[idx] || "✨"}
                              </span>
                              <span className="font-medium leading-relaxed">{rec}</span>
                            </li>
                          );
                        }) : (
                          <li className="text-slate-500 italic">
                            Belum terdapat rekomendasi pada tahun survei yang dipilih.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400 mt-auto">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 3} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 12: BAB III HASIL & PEMBAHASAN - Pembahasan */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Pembahasan Budaya Keselamatan Pasien</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">3.3 Pembahasan</h3>

                  <div className="space-y-4 text-[10.5px] text-slate-700 leading-relaxed">
                    {/* 3.3.1 Area Keunggulan (Strengths ≥75%) */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        3.3.1 Area Keunggulan (Strengths ≥75%)
                      </h4>
                      {strengths.length > 0 ? (
                        <div className="space-y-2.5 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 text-[10px]">
                          <p className="font-medium text-slate-800">
                            Berdasarkan hasil analisis, terdapat {strengths.length} dimensi yang menjadi kekuatan utama budaya keselamatan di <strong className="text-slate-900">{activeHospitalName}</strong>:
                          </p>
                          <div className="space-y-2 pl-1">
                            {strengths.map((s, idx) => (
                              <div key={s.kode} className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-[10.5px]">
                                  {idx + 1}. {s.nama} — [{s.percentage.toFixed(1)}%]
                                </p>
                                <p className="text-slate-700 text-[10px] pl-3 leading-relaxed">
                                  <span className="font-bold text-slate-900">Analisis:</span> {s.interpretasi}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="italic text-[9.5px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          Berdasarkan hasil analisis, saat ini belum ada dimensi yang mencapai target area kekuatan (≥ 75%) di {activeHospitalName}. Diperlukan strategi penguatan terpadu di seluruh unit kerja.
                        </p>
                      )}
                    </div>

                    {/* 3.3.2 Area yang Memerlukan Perbaikan (Areas for Improvement <50%) */}
                    <div className="space-y-2 pt-1">
                      <h4 className="font-bold text-red-800 flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        3.3.2 Area yang Memerlukan Perbaikan (Areas for Improvement &lt;50%)
                      </h4>
                      {improvements.length > 0 ? (
                        <div className="space-y-2.5 bg-red-50/60 p-3 rounded-xl border border-red-200/80 text-[10px]">
                          <p className="font-medium text-slate-800">
                            Terdapat {improvements.length} dimensi kritis yang memerlukan intervensi dan prioritas penanganan segera dari pimpinan/manajemen:
                          </p>
                          <div className="space-y-2 pl-1">
                            {improvements.map((imp, idx) => (
                              <div key={imp.kode} className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-[10.5px]">
                                  {idx + 1}. {imp.nama} — [{imp.percentage.toFixed(1)}%]
                                </p>
                                <p className="text-slate-700 text-[10px] pl-3 leading-relaxed">
                                  <span className="font-bold text-slate-900">Analisis:</span> {imp.interpretasi}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-medium">
                          Tidak ada dimensi yang berada pada kategori perbaikan kritis (&lt;50%). Kondisi ini menunjukkan budaya keselamatan di {activeHospitalName} berjalan relatif baik tanpa hambatan kritis.
                        </div>
                      )}
                    </div>

                    {/* 3.3.3 Area Sedang / Moderat (50%-74%) */}
                    <div className="space-y-2 pt-1">
                      <h4 className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                        3.3.3 Area Sedang / Moderat (50%-74%)
                      </h4>
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-[10px]">
                        {moderates.length > 0 ? (
                          <p className="text-slate-700 leading-relaxed text-justify">
                            Dimensi seperti {moderates.map(m => `${m.nama} ([${m.percentage.toFixed(1)}%])`).join(' dan ')} berada pada kategori moderat. Walaupun prosedurnya telah tersedia (seperti SBAR/TBLK saat handoff), konsistensi pelaksanaannya di lapangan masih bervariasi antar unit kerja, yang dipengaruhi oleh tingkat kesibukan dan keterbukaan komunikasi antar staf.
                          </p>
                        ) : (
                          <p className="italic text-slate-500">
                            Tidak ada dimensi yang berada dalam kategori moderat (50%-74%).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 4} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 13: BAB IV KESIMPULAN DAN REKOMENDASI */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-4 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span></span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                <section className="space-y-4">
                  <div className="text-center mb-6 space-y-1">
                    <h2 className="text-xs font-black text-slate-500 tracking-widest">BAB IV</h2>
                    <h2 className="text-base font-black text-teal-800 uppercase tracking-wide">KESIMPULAN DAN REKOMENDASI</h2>
                    <div className="h-0.5 w-12 bg-teal-600 mx-auto mt-1"></div>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed text-justify">
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 text-xs">4.1 Kesimpulan</h3>
                      <p className="text-[11px] leading-relaxed text-slate-700">
                        Berdasarkan hasil survei budaya keselamatan pasien menggunakan instrumen AHRQ SOPS® Version 2.0 di <strong className="text-slate-900">{activeHospitalName}</strong> dengan tingkat partisipasi (response rate) sebesar <strong className="text-teal-700">{responseRateStr}</strong> (N=<strong className="text-slate-900">{totalActual.toLocaleString('id-ID')}</strong>), dapat ditarik beberapa kesimpulan utama sebagai berikut:
                      </p>

                      <div className="space-y-2.5 pl-1 pt-1 text-[11px]">
                        <div className="leading-relaxed">
                          <strong className="text-slate-900 font-bold">1. Gambaran Umum Budaya Keselamatan Pasien:</strong> Rata-rata pencapaian respon positif dari 10 dimensi budaya keselamatan pasien di <strong className="text-slate-900">{activeHospitalName}</strong> berada pada angka <strong className="text-teal-700">{overallAverage.toFixed(1)}%</strong>. Secara umum, persepsi staf terhadap tingkat keselamatan pasien (Overall Patient Safety Rating) tergolong positif, di mana <strong className="text-teal-700">{safetyRatingData.positivePct.toFixed(1)}%</strong> staf menilai kondisi keselamatan pasien di rumah sakit berada dalam kategori &quot;Baik&quot; hingga &quot;Sangat Baik&quot;.
                        </div>

                        <div className="space-y-1">
                          <div className="leading-relaxed">
                            <strong className="text-slate-900 font-bold">2. Area Keunggulan (Strengths):</strong> Terdapat <strong className="text-teal-800">{strengths.length}</strong> dimensi yang menjadi kekuatan utama budaya keselamatan di <strong className="text-slate-900">{activeHospitalName}</strong> (&ge;75% respon positif):
                          </div>
                          {strengths.length > 0 ? (
                            <ul className="list-none space-y-1 pl-3 text-slate-700">
                              {strengths.map(s => (
                                <li key={s.kode} className="flex items-start gap-1">
                                  <span className="font-bold text-teal-800">•</span>
                                  <div>
                                    <strong className="text-slate-900">{s.nama}</strong> [<strong className="text-teal-700">{s.percentage.toFixed(1)}%</strong>]: {s.interpretasi}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="pl-4 text-slate-500 italic">• Belum ada dimensi yang mencapai batas area kekuatan (&ge;75%). Diperlukan strategi penguatan terpadu di seluruh unit kerja.</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="leading-relaxed">
                            <strong className="text-slate-900 font-bold">3. Area yang Memerlukan Perbaikan Kritis (Areas for Improvement):</strong> Terdapat <strong className="text-rose-800">{improvements.length}</strong> dimensi kritis yang capaian respon positifnya masih berada di bawah target minimal AHRQ (&lt;50%):
                          </div>
                          {improvements.length > 0 ? (
                            <ul className="list-none space-y-1 pl-3 text-slate-700">
                              {improvements.map(imp => (
                                <li key={imp.kode} className="flex items-start gap-1">
                                  <span className="font-bold text-rose-800">•</span>
                                  <div>
                                    <strong className="text-slate-900">{imp.nama}</strong> [<strong className="text-rose-700">{imp.percentage.toFixed(1)}%</strong>]: {imp.interpretasi}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="pl-4 text-slate-500 italic">• Tidak ada dimensi yang berada pada kategori perbaikan kritis (&lt;50%). Budaya keselamatan pasien berjalan stabil tanpa hambatan kritis.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>Laporan Survei Budaya Keselamatan Pasien</span>
                <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 5} dari {totalReportPages}</span>
              </div>
            </div>
          </div>
        </div>

          {/* LEMBAR 13-B: Rekomendasi Strategic Action Plan & Pengesahan */}
          <div className="w-full flex flex-col items-center">
            <div className="word-page print-page">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Running Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Rekomendasi & Pengesahan Laporan</span>
                    <span className="text-teal-700 font-extrabold">{activeHospitalName}</span>
                  </div>

                  <section className="space-y-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">4.2 Rekomendasi</h3>
                      <p className="text-[10.5px] leading-relaxed text-slate-700 text-justify">
                        Untuk menindaklanjuti temuan survei ini dan memperkuat budaya keselamatan pasien secara berkelanjutan, dirumuskan rekomendasi tindakan yang dapat diprioritaskan berdasarkan skala dampaknya:
                      </p>

                      <div className="space-y-2 pt-1 text-[10.5px]">
                        <div className="space-y-1 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                          <strong className="text-teal-900 font-bold flex items-center gap-1.5 text-[10.5px]">
                            <Clock className="w-3.5 h-3.5 text-teal-600" /> Prioritas Jangka Pendek (1 - 3 Bulan):
                          </strong>
                          <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                            {recommendations.jangkaPendek.map((r, i) => (
                              <li key={`jp-${i}`} className="leading-relaxed">{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                          <strong className="text-indigo-900 font-bold flex items-center gap-1.5 text-[10.5px]">
                            <Target className="w-3.5 h-3.5 text-indigo-600" /> Prioritas Jangka Menengah (3 - 6 Bulan):
                          </strong>
                          <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                            {recommendations.jangkaMenengah.map((r, i) => (
                              <li key={`jm-${i}`} className="leading-relaxed">{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <strong className="text-slate-900 font-bold flex items-center gap-1.5 text-[10.5px]">
                            <Award className="w-3.5 h-3.5 text-slate-600" /> Prioritas Jangka Panjang (6 - 12 Bulan):
                          </strong>
                          <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                            {recommendations.jangkaPanjang.map((r, i) => (
                              <li key={`jpan-${i}`} className="leading-relaxed">{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* TANDA TANGAN & TANGGAL PENGESAHAN */}
                    <div className="pt-3 border-t border-slate-200 mt-3">
                      <p className="text-right text-[10.5px] text-slate-600 leading-relaxed font-semibold mb-4">
                        {pengesahanConfig?.kota || 'Sukabumi'}, {pengesahanConfig?.tanggalPengesahan || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <div className="grid grid-cols-2 gap-6 text-center text-[10px]">
                        <div className="space-y-10">
                          <div>
                            <p className="font-bold text-slate-800">Mengetahui,</p>
                            <p className="font-bold text-slate-900">{pengesahanConfig?.direkturJabatan || 'Direktur Utama Rumah Sakit'}</p>
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 underline">
                              {pengesahanConfig?.direkturNama || 'dr. H. Ahmad Wijaya'}{pengesahanConfig?.direkturGelar && !pengesahanConfig.direkturNama.includes(pengesahanConfig.direkturGelar) ? ", " + pengesahanConfig.direkturGelar : ''}
                            </p>
                            <p className="text-slate-500 font-medium">NIP/ID: {pengesahanConfig?.direkturNip || '19780512 200501 1 002'}</p>
                          </div>
                        </div>

                        <div className="space-y-10">
                          <div>
                            <p className="font-bold text-slate-800">Disusun oleh,</p>
                            <p className="font-bold text-slate-900">{pengesahanConfig?.pjJabatan || 'Ketua Komite Mutu & Keselamatan Pasien'}</p>
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 underline">
                              {pengesahanConfig?.pjNama || 'dr. Budi Santoso'}{pengesahanConfig?.pjGelar && !pengesahanConfig.pjNama.includes(pengesahanConfig.pjGelar) ? ", " + pengesahanConfig.pjGelar : ''}
                            </p>
                            <p className="text-slate-500 font-medium">NIP/ID: {pengesahanConfig?.pjNip || '19820315 200804 1 005'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Running Footer */}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Laporan Survei Budaya Keselamatan Pasien</span>
                  <span>Halaman {6 + demografiPages.length + 8 + profesiPages.length + unitPages.length + 6} dari {totalReportPages}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
