'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search,
  Save, 
  Sparkles, 
  ClipboardCheck, 
  Users, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  CheckCircle2, 
  User, 
  MapPin, 
  MessageSquare, 
  Check, 
  TrendingUp, 
  FileText,
  AlertCircle,
  Clock,
  Database,
  CloudLightning,
  ShieldAlert,
  ArrowRight,
  X,
  RotateCcw,
  BookOpen,
  Share2,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConnected, getSupabaseClient } from '../lib/supabase';
import { getMasterPosisi, PosisiStaff, getMasterUnit, UnitKerja } from '../lib/db';
import { mutate } from 'swr';

interface RippleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'style'> {
  isSelected?: boolean;
  shakeOnHover?: boolean;
}

const RippleButton: React.FC<RippleButtonProps> = ({ 
  onClick, 
  className, 
  isSelected, 
  shakeOnHover,
  children, 
  ...props 
}) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; size: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.5;
      const newRipple = { x, y, size, id: Date.now() + Math.random() };
      setRipples((prev) => [...prev, newRipple]);
    }
    if (onClick) {
      onClick(e);
    }
  };

  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => Date.now() - r.id < 600));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <motion.button
      ref={buttonRef as any}
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      whileHover={shakeOnHover ? {
        y: -4,
        rotate: [0, -0.6, 0.6, -0.6, 0],
        transition: { duration: 0.3, ease: "easeInOut" }
      } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
      className={`relative overflow-hidden ${className || ''}`}
      {...props}
    >
      <span className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        {children}
      </span>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.1, 0.8, 0.3, 1] }}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.45)' : 'rgba(16, 185, 129, 0.3)',
            width: ripple.size,
            height: ripple.size,
            top: ripple.y - ripple.size / 2,
            left: ripple.x - ripple.size / 2,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}
    </motion.button>
  );
};

interface SurveyData {
  id: string;
  namaRs: string;
  unitKerja: string;
  jumlahResponden: number;
  tanggalInput: string;
  komentar?: string;
  dimensiScores: { [key: string]: any }; // Scores 1-5
}

interface InputDataTabProps {
  currentRsName: string;
  identifier: string;
  hospitalId?: string;
  isPublic?: boolean;
  onSaveSurvey: (survey: SurveyData) => Promise<any> | void;
  surveys?: SurveyData[];
}

const DIMENSI_AHRQ = [
  { id: 'd7', nama: 'Komunikasi tentang Kesalahan', desc: 'Sejauh mana staf diberi tahu tentang kesalahan yang terjadi di unit, dan mendiskusikan cara mencegahnya.' },
  { id: 'd6', nama: 'Keterbukaan Komunikasi', desc: 'Staf bebas berbicara jika melihat sesuatu yang dapat berdampak buruk pada pasien dan berani bertanya kepada atasan.' },
  { id: 'd10', nama: 'Serah Terima Pasien & Pertukaran Informasi', desc: 'Pemberian informasi penting tentang perawatan pasien yang hilang atau terdistorsi saat pergantian shift atau transfer unit.' },
  { id: 'd9', nama: 'Dukungan Manajemen RS terhadap Keselamatan Pasien', desc: 'Manajemen rumah sakit menciptakan iklim kerja yang memprioritaskan keselamatan pasien di atas target lainnya.' },
  { id: 'd3', nama: 'Pembelajaran Organisasi & Peningkatan Berkelanjutan', desc: 'Sejauh mana kesalahan mengarah pada perubahan positif dan efektivitas perubahan dievaluasi.' },
  { id: 'd8', nama: 'Frekuensi Pelaporan Kejadian Keselamatan Pasien', desc: 'Sejauh mana jenis kesalahan tertentu dilaporkan, baik sebelum berdampak pada pasien maupun sesudahnya.' },
  { id: 'd4', nama: 'Respon terhadap Kesalahan secara Non-Punitif', desc: 'Staf merasa bahwa kesalahan tidak digunakan untuk menyalahkan atau menghukum mereka secara pribadi.' },
  { id: 'd2', nama: 'Ketenagaan dan Beban Kerja', desc: 'Kecukupan jumlah staf untuk menangani beban kerja dan apakah jam kerja sesuai untuk keselamatan pasien.' },
  { id: 'd5', nama: 'Dukungan Supervisor/Manajer untuk Keselamatan', desc: 'Sejauh mana supervisor mengapresiasi staf karena mengikuti prosedur keselamatan dan tidak mendesak penyelesaian tugas dengan mengabaikan keselamatan.' },
  { id: 'd1', nama: 'Kerjasama Tim', desc: 'Sejauh mana staf bekerja sama, saling mendukung, dan memperlakukan satu sama lain dengan hormat.' },
];

const LIKERT_OPTIONS = [
  { value: 1, label: 'Sangat Tidak Setuju' },
  { value: 2, label: 'Tidak Setuju' },
  { value: 3, label: 'Netral' },
  { value: 4, label: 'Setuju' },
  { value: 5, label: 'Sangat Setuju' },
  { value: 9, label: 'Tidak Berlaku / Tidak Tahu' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Tidak Pernah' },
  { value: 2, label: 'Jarang' },
  { value: 3, label: 'Kadang-kadang' },
  { value: 4, label: 'Hampir Selalu' },
  { value: 5, label: 'Selalu' },
  { value: 9, label: 'Tidak Berlaku / Tidak Tahu' },
];

const WORK_UNITS = {
  'Beberapa Unit / Tidak Khusus': [
    { value: '1', label: 'Banyak unit rumah sakit yang berbeda, Tidak ada unit khusus' }
  ],
  'Unit Medis/Bedah': [
    { value: '2', label: 'Unit Medis/Bedah Gabungan' },
    { value: '3', label: 'Unit Medis (Non-Bedah)' },
    { value: '4', label: 'Unit Bedah' }
  ],
  'Unit Perawatan Pasien': [
    { value: '5', label: 'Kardiologi' },
    { value: '6', label: 'Unit Gawat Darurat, Observasi, Rawat Inap' },
    { value: '7', label: 'Gastroenterologi' },
    { value: '8', label: 'ICU (Semua Tipe Dewasa)' },
    { value: '9', label: 'Persalinan & Persalinan, Kebidanan & Kandungan' },
    { value: '10', label: 'Onkologi, Hematologi' },
    { value: '11', label: 'Pediatri (termasuk NICU, PICU)' },
    { value: '12', label: 'Psikiatri, Kesehatan Perilaku' },
    { value: '13', label: 'Pulmonologi' },
    { value: '14', label: 'Rehabilitasi, Pengobatan Fisik' },
    { value: '15', label: 'Telemetri' }
  ],
  'Layanan Bedah': [
    { value: '16', label: 'Anestesiologi' },
    { value: '17', label: 'Endoskopi, Kolonoskopi' },
    { value: '18', label: 'Pra Operasi, Ruang Operasi/Suite, PACU/Pasca Operasi, Peri Operasi' }
  ],
  'Layanan Klinis': [
    { value: '19', label: 'Patologi, Laboratorium' },
    { value: '20', label: 'Farmasi' },
    { value: '21', label: 'Radiologi, Pencitraan' },
    { value: '22', label: 'Terapi Pernapasan' },
    { value: '23', label: 'Layanan Sosial, Manajemen Kasus, Perencanaan Pemulangan' }
  ],
  'Administrasi & Manajemen': [
    { value: '24', label: 'Administrasi, Manajemen' },
    { value: '25', label: 'Layanan Keuangan, Penagihan' },
    { value: '26', label: 'Sumber Daya Manusia, Pelatihan' },
    { value: '27', label: 'Teknologi Informasi, Manajemen Informasi Kesehatan, Informatika Klinis' },
    { value: '28', label: 'Kualitas, Manajemen Risiko, Keselamatan Pasien' }
  ],
  'Layanan Dukungan': [
    { value: '29', label: 'Penerimaan/Pendaftaran' },
    { value: '30', label: 'Layanan Makanan, Diet' },
    { value: '31', label: 'Rumah Tangga, Layanan Lingkungan, Fasilitas' },
    { value: '32', label: 'Layanan Keamanan' },
    { value: '33', label: 'Transportasi' }
  ],
  'Lainnya': [
    { value: '34', label: 'Lainnya' }
  ]
};

const getFeedbackCategory = (val: number | undefined, isReversed: boolean = false) => {
  if (val === undefined || val === 9) return 'none';
  if (!isReversed) {
    if (val >= 4) return 'positive';
    if (val === 3) return 'neutral';
    return 'negative';
  } else {
    if (val <= 2) return 'positive';
    if (val === 3) return 'neutral';
    return 'negative';
  }
};

const getCardBgClass = (category: string) => {
  if (category === 'positive') {
    return 'bg-white border-emerald-200 shadow-xl shadow-slate-900/10 ring-1 ring-emerald-500/10 text-slate-800';
  }
  if (category === 'neutral') {
    return 'bg-white border-amber-200 shadow-xl shadow-slate-900/10 ring-1 ring-amber-500/10 text-slate-800';
  }
  if (category === 'negative') {
    return 'bg-white border-rose-200 shadow-xl shadow-slate-900/10 ring-1 ring-rose-500/10 text-slate-800';
  }
  return 'bg-white border-slate-200 shadow-xl shadow-slate-900/10 hover:border-slate-300 text-slate-800';
};

const getBadgeClass = (category: string) => {
  if (category === 'positive') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (category === 'neutral') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (category === 'negative') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-slate-50 text-slate-500 border border-slate-200';
};

const getDoneBadgeClass = (hasAnswer: boolean) => {
  if (hasAnswer) {
    return 'text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200';
  }
  return 'text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200';
};

const getLikertButtonClass = (isSelected: boolean, hasAnswer: boolean, optVal: number, optCategory: string) => {
  if (isSelected) {
    if (optVal === 9) {
      return 'bg-slate-600 border-slate-500 text-white shadow-lg shadow-slate-500/30 scale-103 font-bold';
    }
    if (optCategory === 'positive') {
      return 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-103 font-bold';
    }
    if (optCategory === 'neutral') {
      return 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30 scale-103 font-bold';
    }
    if (optCategory === 'negative') {
      return 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30 scale-103 font-bold';
    }
    return 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-103 font-bold';
  }
  
  if (hasAnswer) {
    return 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300';
  }
  
  if (optVal === 9) {
    return 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50';
  }
  
  return 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/30';
};

export function getPublicBaseUrl() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export default function InputDataTab({ currentRsName, identifier, hospitalId, isPublic, onSaveSurvey, surveys = [] }: InputDataTabProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [step, setStep] = useState(0); // 0: Identitas, 1-8: Bagian A-H, 9: Review, 10: Success
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [surveyLinkConfig, setSurveyLinkConfig] = useState<any>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // States for Tanggal & Tahun Pengisian
  const [tanggalPengisian, setTanggalPengisian] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [tahunPengisian, setTahunPengisian] = useState(() => new Date().getFullYear().toString());

  const handleTanggalChange = (val: string) => {
    setTanggalPengisian(val);
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        setTahunPengisian(parts[0]);
      }
    }
  };

  const handleTahunChange = (val: string) => {
    setTahunPengisian(val);
    if (val && val.length === 4 && !isNaN(Number(val))) {
      const parts = tanggalPengisian.split('-');
      if (parts.length === 3) {
        setTanggalPengisian(`${val}-${parts[1]}-${parts[2]}`);
      }
    }
  };

  const handleResetTanggal = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setTanggalPengisian(dateStr);
    setTahunPengisian(String(y));
  };

  // States for advanced configurations
  const [customDomain, setCustomDomain] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxRespondents, setMaxRespondents] = useState('');
  const [preventDuplicate, setPreventDuplicate] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Sync state when config loads
  useEffect(() => {
    if (surveyLinkConfig) {
      setCustomDomain(surveyLinkConfig.customDomain || '');
      setStartDate(surveyLinkConfig.startDate || '');
      setExpiryDate(surveyLinkConfig.expiryDate || '');
      setMaxRespondents(surveyLinkConfig.maxRespondents || '');
      setPreventDuplicate(surveyLinkConfig.preventDuplicate !== false);
    }
  }, [surveyLinkConfig]);

  const [responderName, setResponderName] = useState('');

  const parseDimensiScores = (scores: any) => {
    if (typeof scores === 'string') {
      try {
        return JSON.parse(scores);
      } catch (e) {
        console.error("Gagal parse dimensi_scores string", e);
        return {};
      }
    }
    return scores || {};
  };

  const loadSurveyLink = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsLoadingLink(true);
    try {
      const { data, error } = await supabase
        .from('ahrq_surveys')
        .select('*')
        .eq('nama_rs', '_LINK_CONFIG_')
        .eq('unit_kerja', identifier)
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        const latest = data[0];
        const scores = parseDimensiScores(latest.dimensi_scores);
        const actualCount = surveys.reduce((acc, curr) => acc + (curr.jumlahResponden || 1), 0);
        const countToUse = Math.max(scores.respondentCount || 0, actualCount);

        setSurveyLinkConfig({
          token: scores.token || latest.tanggal_input,
          isActive: latest.jumlah_responden === 1,
          createdAt: scores.createdAt || latest.created_at || new Date().toISOString(),
          startDate: scores.startDate || '',
          respondentCount: countToUse,
          expiryDate: scores.expiryDate || '',
          maxRespondents: scores.maxRespondents || '',
          preventDuplicate: scores.preventDuplicate !== false,
          customDomain: scores.customDomain || ''
        });
      } else {
        setSurveyLinkConfig(null);
      }
    } catch (e) {
      console.error('Error loading survey link config', e);
    } finally {
      setIsLoadingLink(false);
    }
  };

  const generateSurveyLink = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsLoadingLink(true);
    try {
      const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      // Delete existing configs to avoid cluttering/duplicate errors
      const { data: existing } = await supabase
        .from('ahrq_surveys')
        .select('id')
        .eq('nama_rs', '_LINK_CONFIG_')
        .eq('unit_kerja', identifier);

      if (existing && existing.length > 0) {
        const idsToDelete = existing.map((x: any) => x.id);
        await supabase
          .from('ahrq_surveys')
          .delete()
          .in('id', idsToDelete);
      }

      const todayDate = new Date().toISOString().split('T')[0]; // valid date YYYY-MM-DD
      const actualCount = surveys.reduce((acc, curr) => acc + (curr.jumlahResponden || 1), 0);
      const currentCount = Math.max(surveyLinkConfig?.respondentCount || 0, actualCount);

      const newConfig = {
        id: `LINK_CONFIG_${token}`,
        nama_rs: '_LINK_CONFIG_',
        unit_kerja: identifier,
        tanggal_input: todayDate,
        jumlah_responden: 1, // active
        dimensi_scores: {
          token: token,
          rsName: currentRsName,
          createdAt: new Date().toISOString(),
          respondentCount: currentCount,
          expiryDate: '',
          maxRespondents: '',
          preventDuplicate: true,
          customDomain: '',
          hospital_id: hospitalId || identifier,
          user_id: identifier,
          created_by: identifier,
          hospital_name: currentRsName
        }
      };

      const { error: genError } = await supabase
        .from('ahrq_surveys')
        .insert([newConfig]);

      if (genError) {
        console.error("Gagal generate config link:", genError);
      }
      
      setSurveyLinkConfig({
        token: token,
        isActive: true,
        createdAt: newConfig.dimensi_scores.createdAt,
        startDate: '',
        respondentCount: currentCount,
        expiryDate: '',
        maxRespondents: '',
        preventDuplicate: true,
        customDomain: ''
      });
    } catch (e) {
      console.error('Error generating link', e);
    } finally {
      setIsLoadingLink(false);
    }
  };

  const updateSurveyLinkConfig = async (fieldsToUpdate: any, showSuccessMsg: boolean = false) => {
    if (!surveyLinkConfig) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsLoadingLink(true);
    try {
      const mergedConfig = { ...surveyLinkConfig, ...fieldsToUpdate };
      const todayDate = new Date().toISOString().split('T')[0];
      
      const dbRow = {
        id: `LINK_CONFIG_${mergedConfig.token}`,
        nama_rs: '_LINK_CONFIG_',
        unit_kerja: identifier,
        tanggal_input: todayDate,
        jumlah_responden: mergedConfig.isActive ? 1 : 0,
        dimensi_scores: {
          token: mergedConfig.token,
          rsName: currentRsName,
          createdAt: mergedConfig.createdAt,
          startDate: mergedConfig.startDate || '',
          respondentCount: mergedConfig.respondentCount,
          expiryDate: mergedConfig.expiryDate || '',
          maxRespondents: mergedConfig.maxRespondents || '',
          preventDuplicate: mergedConfig.preventDuplicate !== false,
          customDomain: mergedConfig.customDomain || '',
          hospital_id: hospitalId || identifier,
          user_id: identifier,
          created_by: identifier,
          hospital_name: currentRsName
        }
      };

      const { error } = await supabase
        .from('ahrq_surveys')
        .upsert([dbRow]);

      if (!error) {
        setSurveyLinkConfig(mergedConfig);
        if (showSuccessMsg) {
          showNotification("Pengaturan tautan survei berhasil disimpan!", "success");
        }
      } else {
        console.error("Gagal melakukan update config link", error);
        showNotification(`Gagal menyimpan pengaturan link: ${error.message || 'Kesalahan database'}`, "error");
      }
    } catch (e) {
      console.error("Kesalahan saat mengupdate link config", e);
      showNotification("Terjadi kesalahan saat menyimpan pengaturan link", "error");
    } finally {
      setIsLoadingLink(false);
    }
  };

  const toggleSurveyLinkStatus = async () => {
    if (!surveyLinkConfig) return;
    await updateSurveyLinkConfig({ isActive: !surveyLinkConfig.isActive }, true);
  };

  useEffect(() => {
    if (showLinkModal && !surveyLinkConfig) {
      loadSurveyLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLinkModal]);

  const [posisiStaf, setPosisiStaf] = useState('');
  const [customPosisiStaf, setCustomPosisiStaf] = useState('');
  const [posisiMaster, setPosisiMaster] = useState<PosisiStaff[]>([]);
  const [posisiSearch, setPosisiSearch] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [customUnitKerja, setCustomUnitKerja] = useState('');
  const [unitMaster, setUnitMaster] = useState<UnitKerja[]>([]);
  const [unitSearch, setUnitSearch] = useState('');

  useEffect(() => {
    async function loadMasterData() {
      if (currentRsName) {
        const [posData, unitData] = await Promise.all([
          getMasterPosisi(currentRsName),
          getMasterUnit(currentRsName)
        ]);
        setPosisiMaster(posData);
        setUnitMaster(unitData);
      }
    }
    loadMasterData();

    const handleMasterUpdate = () => {
      loadMasterData();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('master_data_updated', handleMasterUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('master_data_updated', handleMasterUpdate);
      }
    };
  }, [currentRsName]);
  
  // Custom Select Modals
  const [isPosisiModalOpen, setIsPosisiModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  
  // Answers states
  const [ansA, setAnsA] = useState<{ [key: number]: number }>({});
  const [ansB, setAnsB] = useState<{ [key: number]: number }>({});
  const [ansC, setAnsC] = useState<{ [key: number]: number }>({});
  const [ansD, setAnsD] = useState<{ 1?: number; 2?: number; 3?: string }>({});
  const [ansE, setAnsE] = useState<number | undefined>(undefined);
  const [ansF, setAnsF] = useState<{ [key: number]: number }>({});
  const [ansG, setAnsG] = useState<{ 1?: string; 2?: string; 3?: string; 4?: string }>({});
  const [komentar, setKomentar] = useState('');

  // Auto-save notification state
  const [autoSavePulse, setAutoSavePulse] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTooltipId, setShowTooltipId] = useState<string | null>(null);

  // Derived safe key for local storage namespacing
  const draftKey = `sops_survey_draft_${(currentRsName || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // References for smooth scrolling
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const STATEMENTS_F = [
    { id: 1, code: 'F1', text: 'Tindakan manajemen rumah sakit menunjukkan bahwa keselamatan pasien adalah prioritas utama', dim: 'd9' },
    { id: 2, code: 'F2', text: 'Manajemen rumah sakit menyediakan sumber daya yang memadai untuk meningkatkan keselamatan pasien', dim: 'd9' },
    { id: 3, code: 'F3', text: 'Manajemen rumah sakit tampaknya hanya tertarik pada keselamatan pasien setelah kejadian tidak diharapkan terjadi', dim: 'd9', isReversed: true },
    { id: 4, code: 'F4', text: 'Ketika memindahkan pasien dari satu unit ke unit lain, informasi penting sering kali terlewatkan', dim: 'd10', isReversed: true },
    { id: 5, code: 'F5', text: 'Selama pergantian shift, informasi perawatan pasien yang penting sering terlewatkan', dim: 'd10', isReversed: true },
    { id: 6, code: 'F6', text: 'Selama pergantian shift, ada waktu yang memadai untuk bertukar semua informasi penting tentang perawatan pasien', dim: 'd10' }
  ];

  const activeRsName = currentRsName && currentRsName.trim() ? currentRsName : 'RSUD Al-Mulk';

  const SECTIONS = [
    { id: 0, label: 'Identitas', key: 'identitas' },
    { id: 1, label: 'Bagian A', key: 'A', title: 'Unit / Area Kerja Anda', desc: 'Seberapa jauh Anda setuju dengan pernyataan berikut tentang unit/area kerja utama Anda?' },
    { id: 2, label: 'Bagian B', key: 'B', title: 'Supervisor / Manajer Anda', desc: 'Pernyataan mengenai atasan langsung, manajer, atau pemimpin klinis Anda.' },
    { id: 3, label: 'Bagian C', key: 'C', title: 'Komunikasi', desc: 'Seberapa sering hal-hal berikut terjadi di unit atau area kerja Anda?' },
    { id: 4, label: 'Bagian D', key: 'D', title: 'Pelaporan Kejadian Keselamatan', desc: 'Kejadian dan pelaporan insiden keselamatan pasien di unit Anda.' },
    { id: 5, label: 'Bagian E', key: 'E', title: 'Peringkat Keselamatan Pasien', desc: 'Bagaimana Anda menilai unit/area kerja Anda dalam hal keselamatan pasien?' },
    { id: 6, label: 'Bagian F', key: 'F', title: activeRsName, desc: `Seberapa jauh Anda setuju dengan kondisi ${activeRsName} secara menyeluruh?` },
    { id: 7, label: 'Bagian G', key: 'G', title: 'Latar Belakang', desc: 'Informasi demografis dan lama bekerja untuk analisis orisinalitas.' },
    { id: 8, label: 'Bagian H', key: 'H', title: 'Komentar Anda', desc: 'Tuliskan masukan atau ulasan konstruktif demi kemajuan budaya keselamatan.' },
    { id: 9, label: 'Review', key: 'review' }
  ];



  // Automatically scroll to the top of the page / container when step changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      
      const mains = document.getElementsByTagName('main');
      for (let i = 0; i < mains.length; i++) {
        mains[i].scrollTop = 0;
      }

      const wrapper = document.getElementById('survey-main-wrapper');
      if (wrapper) {
        wrapper.scrollTop = 0;
      }
    }
  }, [step]);

  // Save draft whenever answers change
  const triggerAutoSave = (data: any) => {};

  // Auto-scroll to next question helper
  const scrollToQuestion = (nextId: string) => {
    setTimeout(() => {
      const element = questionRefs.current[nextId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 450);
  };

  // Questionnaire counters
  const totalQuestions = 39;
  const getAnsweredCount = () => {
    let count = 0;
    count += Object.keys(ansA).length;
    count += Object.keys(ansB).length;
    count += Object.keys(ansC).length;
    count += (ansD[1] ? 1 : 0) + (ansD[2] ? 1 : 0) + (ansD[3] ? 1 : 0);
    count += ansE ? 1 : 0;
    count += Object.keys(ansF).length;
    count += (ansG[1] ? 1 : 0) + (ansG[2] ? 1 : 0) + (ansG[3] ? 1 : 0) + (ansG[4] ? 1 : 0);
    count += komentar.trim() ? 1 : 0;
    return count;
  };

  const answeredCount = getAnsweredCount();
  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Helper to validate completeness of any step
  const getStepValidation = (s: number) => {
    switch (s) {
      case 0: {
        const isPosisiValid = Boolean(posisiStaf && (posisiStaf !== 'Lainnya' || customPosisiStaf.trim()));
        const isUnitValid = Boolean(unitKerja && (unitKerja !== 'Lainnya' || customUnitKerja.trim()));
        const isValid = isPosisiValid && isUnitValid;
        return {
          isValid,
          total: 2,
          answered: (isPosisiValid ? 1 : 0) + (isUnitValid ? 1 : 0),
          unanswered: (!isPosisiValid ? 1 : 0) + (!isUnitValid ? 1 : 0),
          firstUnansweredId: !isPosisiValid ? 'posisi-staf-select' : !isUnitValid ? 'unit-kerja-select' : null,
          unansweredQuestions: [] as string[]
        };
      }
      case 1: {
        const missing = STATEMENTS_A.filter(
          st => ansA[st.id] === undefined || ansA[st.id] === null
        );
        return {
          isValid: missing.length === 0,
          total: STATEMENTS_A.length,
          answered: STATEMENTS_A.length - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? `A-${missing[0].id}` : null,
          unansweredQuestions: missing.map(st => st.code)
        };
      }
      case 2: {
        const missing = STATEMENTS_B.filter(
          st => ansB[st.id] === undefined || ansB[st.id] === null
        );
        return {
          isValid: missing.length === 0,
          total: STATEMENTS_B.length,
          answered: STATEMENTS_B.length - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? `B-${missing[0].id}` : null,
          unansweredQuestions: missing.map(st => st.code)
        };
      }
      case 3: {
        const missing = STATEMENTS_C.filter(
          st => ansC[st.id] === undefined || ansC[st.id] === null
        );
        return {
          isValid: missing.length === 0,
          total: STATEMENTS_C.length,
          answered: STATEMENTS_C.length - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? `C-${missing[0].id}` : null,
          unansweredQuestions: missing.map(st => st.code)
        };
      }
      case 4: {
        const missing: { id: string; code: string }[] = [];
        if (ansD[1] === undefined || ansD[1] === null) missing.push({ id: 'D-1', code: 'D1' });
        if (ansD[2] === undefined || ansD[2] === null) missing.push({ id: 'D-2', code: 'D2' });
        if (!ansD[3]) missing.push({ id: 'D-3', code: 'D3' });
        return {
          isValid: missing.length === 0,
          total: 3,
          answered: 3 - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? missing[0].id : null,
          unansweredQuestions: missing.map(m => m.code)
        };
      }
      case 5: {
        const isAnswered = ansE !== undefined && ansE !== null;
        return {
          isValid: isAnswered,
          total: 1,
          answered: isAnswered ? 1 : 0,
          unanswered: isAnswered ? 0 : 1,
          firstUnansweredId: isAnswered ? null : 'E-1',
          unansweredQuestions: isAnswered ? [] : ['E1']
        };
      }
      case 6: {
        const missing = STATEMENTS_F.filter(
          st => ansF[st.id] === undefined || ansF[st.id] === null
        );
        return {
          isValid: missing.length === 0,
          total: STATEMENTS_F.length,
          answered: STATEMENTS_F.length - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? `F-${missing[0].id}` : null,
          unansweredQuestions: missing.map(st => st.code)
        };
      }
      case 7: {
        const missing: { id: string; code: string }[] = [];
        if (!ansG[1]) missing.push({ id: 'G-1', code: 'G1' });
        if (!ansG[2]) missing.push({ id: 'G-2', code: 'G2' });
        if (!ansG[3]) missing.push({ id: 'G-3', code: 'G3' });
        if (!ansG[4]) missing.push({ id: 'G-4', code: 'G4' });
        return {
          isValid: missing.length === 0,
          total: 4,
          answered: 4 - missing.length,
          unanswered: missing.length,
          firstUnansweredId: missing.length > 0 ? missing[0].id : null,
          unansweredQuestions: missing.map(m => m.code)
        };
      }
      case 8: {
        const isFilled = komentar.trim().length > 0;
        return {
          isValid: isFilled,
          total: 1,
          answered: isFilled ? 1 : 0,
          unanswered: isFilled ? 0 : 1,
          firstUnansweredId: isFilled ? null : 'H-1',
          unansweredQuestions: isFilled ? [] : ['H1']
        };
      }
      case 9: {
        const isAllAnswered = unansweredCount === 0;
        return {
          isValid: isAllAnswered,
          total: totalQuestions,
          answered: answeredCount,
          unanswered: unansweredCount,
          firstUnansweredId: null,
          unansweredQuestions: []
        };
      }
      default:
        return { isValid: true, total: 0, answered: 0, unanswered: 0, firstUnansweredId: null, unansweredQuestions: [] };
    }
  };

  const getProgressGradient = () => {
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    
    STATEMENTS_A.forEach(st => {
      const ans = ansA[st.id];
      const cat = getFeedbackCategory(ans, st.isReversed);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    });
    
    STATEMENTS_B.forEach(st => {
      const ans = ansB[st.id];
      const cat = getFeedbackCategory(ans, st.isReversed);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    });

    STATEMENTS_C.forEach(st => {
      const ans = ansC[st.id];
      const cat = getFeedbackCategory(ans, st.isReversed);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    });

    if (ansD[1]) {
      const cat = getFeedbackCategory(ansD[1], false);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    }
    if (ansD[2]) {
      const cat = getFeedbackCategory(ansD[2], false);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    }

    if (ansE) {
      const cat = getFeedbackCategory(ansE, false);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    }

    STATEMENTS_F.forEach(st => {
      const ans = ansF[st.id];
      const cat = getFeedbackCategory(ans, st.isReversed);
      if (cat === 'positive') positiveCount++;
      else if (cat === 'neutral') neutralCount++;
      else if (cat === 'negative') negativeCount++;
    });

    const total = positiveCount + neutralCount + negativeCount;
    if (total === 0) {
      return 'from-emerald-500 to-teal-400';
    }

    if (positiveCount > neutralCount && positiveCount > negativeCount) {
      return 'from-emerald-500 via-teal-400 to-cyan-500';
    } else if (neutralCount > positiveCount && neutralCount > negativeCount) {
      return 'from-amber-500 via-yellow-400 to-orange-500';
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      return 'from-rose-500 via-red-500 to-orange-500';
    }
    
    return 'from-emerald-500 via-teal-400 to-cyan-500';
  };

  // Scoring mapping helper
  const computeScores = () => {
    const getVal = (v: number | undefined, isReversed = false) => {
      if (v === undefined || v === 9) return null;
      return isReversed ? 6 - v : v;
    };

    const getAverage = (values: (number | null)[]) => {
      const valid = values.filter((v): v is number => v !== null);
      if (valid.length === 0) return 3; // neutral default
      const sum = valid.reduce((a, b) => a + b, 0);
      return Math.round((sum / valid.length) * 10) / 10;
    };

    return {
      d1: getAverage([getVal(ansA[1]), getVal(ansA[8]), getVal(ansA[9], true)]),
      d2: getAverage([getVal(ansA[2]), getVal(ansA[3], true), getVal(ansA[5], true), getVal(ansA[11], true)]),
      d3: getAverage([getVal(ansA[4]), getVal(ansA[12])]),
      d4: getAverage([getVal(ansA[6], true), getVal(ansA[7], true), getVal(ansA[10]), getVal(ansA[13], true), getVal(ansA[14], true)]),
      d5: getAverage([getVal(ansB[1]), getVal(ansB[2], true), getVal(ansB[3])]),
      d6: getAverage([getVal(ansC[4]), getVal(ansC[5]), getVal(ansC[6]), getVal(ansC[7], true)]),
      d7: getAverage([getVal(ansC[1]), getVal(ansC[2]), getVal(ansC[3])]),
      d8: getAverage([getVal(ansD[1]), getVal(ansD[2])]),
      d9: getAverage([getVal(ansF[1]), getVal(ansF[2]), getVal(ansF[3], true)]),
      d10: getAverage([getVal(ansF[4], true), getVal(ansF[5], true), getVal(ansF[6])]),
    };
  };

  const handleSelectOption = (section: string, id: number, val: number) => {
    if (section === 'A') {
      const updated = { ...ansA, [id]: val };
      setAnsA(updated);
      triggerAutoSave({ ansA: updated });
      scrollToQuestion(`A-${id + 1}`);
    } else if (section === 'B') {
      const updated = { ...ansB, [id]: val };
      setAnsB(updated);
      triggerAutoSave({ ansB: updated });
      scrollToQuestion(`B-${id + 1}`);
    } else if (section === 'C') {
      const updated = { ...ansC, [id]: val };
      setAnsC(updated);
      triggerAutoSave({ ansC: updated });
      scrollToQuestion(`C-${id + 1}`);
    } else if (section === 'F') {
      const updated = { ...ansF, [id]: val };
      setAnsF(updated);
      triggerAutoSave({ ansF: updated });
      scrollToQuestion(`F-${id + 1}`);
    }
  };

  const handleSelectD = (id: number, val: number) => {
    const updated = { ...ansD, [id]: val };
    setAnsD(updated);
    triggerAutoSave({ ansD: updated });
    scrollToQuestion(`D-${id + 1}`);
  };

  const handleSelectD3 = (val: string) => {
    const updated = { ...ansD };
    if (updated[3] === val) delete updated[3]; else updated[3] = val;
    setAnsD(updated);
    triggerAutoSave({ ansD: updated });
    if (updated[3]) scrollToQuestion('E-1');
  };

  const handleSelectE = (val: number) => {
    const updatedVal = ansE === val ? undefined : val;
    setAnsE(updatedVal);
    triggerAutoSave({ ansE: updatedVal });
    if (updatedVal) scrollToQuestion('F-1');
  };

  const handleSelectG = (id: number, val: string) => {
    const updated = { ...ansG } as any;
    if (updated[id] === val) delete updated[id]; else updated[id] = val;
    setAnsG(updated);
    triggerAutoSave({ ansG: updated });
    if (updated[id]) scrollToQuestion(`G-${id + 1}`);
  };

  const handleNextStep = () => {
    const val = getStepValidation(step);
    if (!val.isValid) {
      if (val.firstUnansweredId) {
        scrollToQuestion(val.firstUnansweredId);
      }
      return;
    }
    setStep(step + 1);
  };

  const handleRandomize = () => {
    // Quick populator
    const randomAnsA: { [key: number]: number } = {};
    STATEMENTS_A.forEach(s => {
      randomAnsA[s.id] = Math.random() > 0.35 ? (Math.random() > 0.5 ? 5 : 4) : 3;
    });
    const randomAnsB: { [key: number]: number } = {};
    STATEMENTS_B.forEach(s => {
      randomAnsB[s.id] = Math.random() > 0.3 ? 4 : 5;
    });
    const randomAnsC: { [key: number]: number } = {};
    STATEMENTS_C.forEach(s => {
      randomAnsC[s.id] = Math.random() > 0.4 ? 4 : 5;
    });
    const randomAnsF: { [key: number]: number } = {};
    STATEMENTS_F.forEach(s => {
      randomAnsF[s.id] = Math.random() > 0.3 ? 4 : 5;
    });

    const updated = {
      responderName: 'Dr. Wahyu Pratama, Sp.PD',
      posisiStaf: 'Dokter, Perawat, Perawat Rumah Sakit',
      unitKerja: 'Unit Gawat Darurat, Observasi, Rawat Inap',
      ansA: randomAnsA,
      ansB: randomAnsB,
      ansC: randomAnsC,
      ansD: { 1: 4, 2: 5, 3: '3 sampai 5' },
      ansE: 4,
      ansF: randomAnsF,
      ansG: {
        1: '1 hingga 5 tahun',
        2: '1 hingga 5 tahun',
        3: '30 hingga 40 jam per minggu',
        4: 'YA, saya melakukan interaksi atau kontak langsung dengan pasien'
      },
      komentar: 'Sistem evaluasi keselamatan terstruktur dengan sangat baik. Perlu pengawasan berkala terkait sirkulasi informasi serah terima.',
    };

    setResponderName(updated.responderName);
    setPosisiStaf(updated.posisiStaf);
    setUnitKerja(updated.unitKerja);
    setAnsA(updated.ansA);
    setAnsB(updated.ansB);
    setAnsC(updated.ansC);
    setAnsD(updated.ansD);
    setAnsE(updated.ansE);
    setAnsF(updated.ansF);
    setAnsG(updated.ansG);
    setKomentar(updated.komentar);
    setStep(9); // Directly to review
    triggerAutoSave(updated);
  };

  const handleResetForm = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan draf survei aktif?')) {
      setResponderName('');
      setPosisiStaf('');
      setUnitKerja('');
      setAnsA({});
      setAnsB({});
      setAnsC({});
      setAnsD({});
      setAnsE(undefined);
      setAnsF({});
      setAnsG({});
      setKomentar('');
      setStep(0);
      if (typeof window !== 'undefined') {
        
      }
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    // Simulate real cloud sync with Supabase / local
    const finalScores = computeScores();
    const finalPosisi = posisiStaf === 'Lainnya' && customPosisiStaf ? customPosisiStaf : posisiStaf;
    const finalUnit = unitKerja === 'Lainnya' && customUnitKerja ? customUnitKerja : unitKerja;
    
    const finalSurvey: SurveyData = {
      id: 'srv_' + Date.now(),
      namaRs: currentRsName,
      unitKerja: finalUnit || 'Instansi Umum',
      jumlahResponden: 1,
      tanggalInput: new Date(tanggalPengisian).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
      komentar: komentar ? komentar.trim() : '',
      dimensiScores: {
        ...finalScores,
        komentar: komentar ? komentar.trim() : '',
        _rawAnswers: {
          ansA,
          ansB,
          ansC,
          ansD,
          ansE,
          ansF,
          ansG,
          komentar: komentar ? komentar.trim() : '',
          posisiStaf: finalPosisi,
          unitKerja,
          namaRs: currentRsName,
          tanggalInput: new Date(tanggalPengisian).toISOString(),
          tanggal_input: tanggalPengisian,
          tahun_input: Number(tahunPengisian),
          tanggal_survei: tanggalPengisian
        }
      } as any
    };

    try {
      await onSaveSurvey(finalSurvey);
      try {
        await mutate(
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
      } catch (mutateErr) {
        console.warn("SWR mutation failed after survey submission:", mutateErr);
      }
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setStep(10); // Success step
      if (typeof window !== 'undefined') {
        
      }
    } catch (err: any) {
      console.error("Kesalahan menyimpan kuesioner:", err);
      setIsSubmitting(false);
      setShowConfirmModal(false);
      if (typeof window !== 'undefined') {
        alert("Gagal menyimpan kuesioner: " + (err.message || "Terjadi kesalahan sistem"));
      }
    }
  };

  // Light Theme Premium Style Helper Functions
  const getCardBgClass = (category: string) => {
    switch (category) {
      case 'positive':
        return 'bg-white/95 backdrop-blur-md border-emerald-500/30 shadow-xl shadow-slate-900/10 ring-1 ring-emerald-500/10';
      case 'neutral':
        return 'bg-white/95 backdrop-blur-md border-amber-500/30 shadow-xl shadow-slate-900/10 ring-1 ring-amber-500/10';
      case 'negative':
        return 'bg-white/95 backdrop-blur-md border-rose-500/30 shadow-xl shadow-slate-900/10 ring-1 ring-rose-500/10';
      default:
        return 'bg-white/95 backdrop-blur-md border-slate-200/80 shadow-xl shadow-slate-900/10 hover:border-slate-300';
    }
  };

  const getBadgeClass = (category: string) => {
    switch (category) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/60';
      case 'neutral':
        return 'bg-amber-50 text-amber-600 border border-amber-200/60';
      case 'negative':
        return 'bg-rose-50 text-rose-600 border border-rose-200/60';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-200';
    }
  };

  const getDoneBadgeClass = (isDone: boolean) => {
    if (isDone) {
      return (
        <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50/85 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 text-[10px] font-bold">
          <Check className="w-3.5 h-3.5" /> Selesai
        </span>
      );
    }
    return (
      <span className="text-red-500 flex items-center gap-1 bg-red-50/85 px-2.5 py-1.5 rounded-xl border border-red-200/60 text-[10px] font-bold">
        <AlertCircle className="w-3.5 h-3.5" /> Belum Dijawab
      </span>
    );
  };

  const getLikertButtonClass = (isSelected: boolean, hasAnswer: boolean, value: number, optCategory: string) => {
    if (isSelected) {
      if (value === 9) {
        return 'bg-slate-600 border-slate-600 text-white shadow-md shadow-slate-500/20 font-bold scale-[1.02]';
      }
      if (optCategory === 'positive') {
        return 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold scale-[1.02]';
      }
      if (optCategory === 'neutral') {
        return 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-500/20 font-bold scale-[1.02]';
      }
      if (optCategory === 'negative') {
        return 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20 font-bold scale-[1.02]';
      }
      return 'bg-emerald-600 border-emerald-600 text-white font-bold scale-[1.02]';
    }

    if (hasAnswer) {
      return 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50';
    }

    if (value === 9) {
      return 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50';
    }

    return 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20';
  };

  // Verification helper for highlight border
  const isQuestionUnanswered = (section: string, id: number) => {
    if (section === 'A') return !ansA[id];
    if (section === 'B') return !ansB[id];
    if (section === 'C') return !ansC[id];
    if (section === 'F') return !ansF[id];
    return false;
  };

  return (
    <div id="survey-main-wrapper" className="bg-transparent text-slate-800 min-h-screen rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl flex flex-col font-sans">
      
      {/* 1 & 2. PREMIUM STICKY HEADER & PROGRESS */}
      <div className="sticky top-0 z-30 p-4 md:p-6 pb-2">
        <header 
          id="survey-sticky-header" 
          className="bg-[#14B8A6] text-white border border-teal-500/30 shadow-xl shadow-teal-900/20 rounded-[24px] p-5 md:p-6 flex flex-col gap-5 relative overflow-hidden"
        >
          {/* Subtle gradient background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none" />

          {/* Top section: Title and Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="space-y-1">
              <h1 className="text-[20px] font-extrabold text-white leading-tight">
                Kuesioner Survei Budaya Keselamatan Pasien
              </h1>
              <p className="text-[11px] text-teal-100 font-semibold tracking-wider uppercase">
                AHRQ Hospital Survey on Patient Safety Culture Version 2.0
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Card Tanggal & Tahun Pengisian */}
              <div 
                id="date-year-picker-card" 
                className="flex items-center gap-2 bg-white border border-white/90 rounded-xl px-3 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.18),0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 h-[44px] hover:bg-slate-50 transition-all duration-300"
              >
                {/* Tanggal Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#21bf3e] shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-[#525b80] uppercase leading-none tracking-wider font-sans">Tanggal</span>
                    <input
                      type="date"
                      value={tanggalPengisian}
                      onChange={(e) => handleTanggalChange(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-extrabold text-[#2FA7A7] focus:outline-none w-[105px] h-4 cursor-pointer p-0 font-sans"
                    />
                  </div>
                </div>

                <div className="h-6 w-px bg-teal-100" />

                {/* Tahun Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#e89a13] shrink-0">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-[#525b80] uppercase leading-none tracking-wider font-sans">Tahun</span>
                    <select
                      value={tahunPengisian}
                      onChange={(e) => handleTahunChange(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-extrabold text-[#2FA7A7] focus:outline-none w-[55px] h-4 cursor-pointer p-0 font-sans"
                    >
                      {Array.from({ length: 15 }, (_, i) => {
                        const y = new Date().getFullYear() - 10 + i;
                        return <option key={y} value={y.toString()} className="text-slate-800 bg-white">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={handleResetTanggal}
                  title="Gunakan Tanggal Hari Ini"
                  className="p-1 text-[#454d60] hover:text-[#2FA7A7] hover:bg-teal-50 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <AnimatePresence>
                {autoSavePulse && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#2FA7A7] bg-white px-3 py-1.5 rounded-xl border border-white/80 shadow-md"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersimpan</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {!isPublic && (
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="flex items-center gap-2 bg-white hover:bg-teal-50 text-[#1E6F73] border border-white/90 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.18),0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#1E6F73]" />
                  Bagikan Link
                </button>
              )}
            </div>
          </div>

          {/* Bottom section: Progress Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full relative z-10 pt-2 gap-3 md:gap-6">
            <div className="shrink-0">
              <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                Progres Pengisian Kuesioner
              </h3>
            </div>
            
            <div className="flex items-center gap-3 flex-1 w-full">
              <span className="text-xs font-bold text-white/90 tabular-nums shrink-0">
                {answeredCount}/{totalQuestions}
              </span>
              <div className="flex-1 bg-black/20 h-3.5 rounded-full overflow-hidden relative shadow-inner border border-white/20">
                <div 
                  className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 h-full rounded-full transition-all transform-gpu duration-500 ease-out shadow-[0_0_12px_rgba(52,211,153,0.5)]" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-extrabold text-white w-10 text-right shrink-0 tabular-nums">
                {progressPercent}%
              </span>
            </div>
          </div>
        </header>
      </div>

      {/* Main content layout (Centered and Elegant) */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6">
        
        {/* CENTERED COMPONENT / WIZARD SCREEN */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header card for the current section */}
              {step > 0 && step < 9 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xl shadow-slate-900/10 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold rounded-full tracking-wide">
                      {SECTIONS[step].label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">{SECTIONS[step].title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed font-light">{SECTIONS[step].desc}</p>
                </div>
              )}

              {/* STEP 0: IDENTITAS */}
              {step === 0 && (
                <div className="space-y-6">
                  {/* PETUNJUK CARD (PREMIUM & MODERN) */}
                  <div className="bg-white rounded-3xl border border-emerald-300 ring-1 ring-emerald-500/10 p-6 md:p-8 shadow-xl shadow-slate-900/10 relative overflow-hidden space-y-6">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl shadow-sm">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase font-mono">INFORMASI SURVEI</span>
                        <h2 className="text-xl font-bold text-slate-800">Petunjuk Pengisian</h2>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      Survei ini meminta pendapat Anda tentang masalah keselamatan pasien, kesalahan medis, dan pelaporan kejadian di {activeRsName} dan akan memakan waktu sekitar 10-15 menit untuk menyelesaikannya. Jika ada pertanyaan yang tidak berlaku untuk Anda atau {activeRsName} atau Anda tidak tahu jawabannya, silakan pilih <span className="text-emerald-600 font-semibold">{`"Tidak Berlaku atau Tidak Tahu."`}</span>
                    </p>

                    {/* DEFINITION BOX (OUTLINED, PREMIUM GLOW) */}
                    <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 md:p-6 space-y-4 shadow-inner relative">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-sm" />
                        <p className="text-xs text-slate-600 leading-relaxed font-light">
                          <span className="text-emerald-600 font-bold underline decoration-emerald-500/30 underline-offset-4">{`"Keselamatan pasien"`}</span> didefinisikan sebagai penghindaran and pencegahan cedera pasien atau kejadian yang tidak diinginkan yang diakibatkan oleh proses pemberian layanan kesehatan.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-sm" />
                        <p className="text-xs text-slate-600 leading-relaxed font-light">
                          <span className="text-emerald-600 font-bold underline decoration-emerald-500/30 underline-offset-4">{`"Kejadian keselamatan pasien"`}</span> didefinisikan sebagai segala jenis kesalahan, kekeliruan, atau insiden yang berhubungan dengan perawatan kesehatan, terlepas dari apakah hal tersebut mengakibatkan cedera pada pasien atau tidak.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* IDENTIFIKASI PROFIL RESPONDEN */}
                  <div
                    className={`rounded-3xl border p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${
                      posisiStaf && unitKerja 
                        ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/10' 
                        : 'bg-white border-emerald-300 ring-1 ring-emerald-500/10'
                    }`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-600 tracking-wider font-mono">STEP 1</span>
                      <h2 className="text-2xl font-bold text-slate-800">Identifikasi Profil Responden</h2>
                      <p className="text-xs text-slate-500">Silakan masukkan identitas opsional Anda sebelum melangkah ke lembar kuesioner utama AHRQ.</p>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-600" /> Posisi Staf Anda di Rumah Sakit
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsPosisiModalOpen(true)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-left transition-all transform-gpu outline-none flex items-center justify-between hover:bg-slate-100/50"
                          >
                            <span className={posisiStaf ? 'text-slate-800' : 'text-slate-400'}>
                              {posisiStaf === 'Lainnya' && customPosisiStaf ? customPosisiStaf : (posisiStaf || 'Pilih Posisi Anda')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </button>
                          
                          <AnimatePresence>
                            {posisiStaf === 'Lainnya' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
                                <input
                                  type="text"
                                  value={customPosisiStaf}
                                  onChange={(e) => {
                                    setCustomPosisiStaf(e.target.value);
                                    triggerAutoSave({ customPosisiStaf: e.target.value });
                                  }}
                                  placeholder="Ketik nama jabatan Anda di sini..."
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-emerald-600" /> Unit / Area Kerja Utama Anda
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsUnitModalOpen(true)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-left transition-all transform-gpu outline-none flex items-center justify-between hover:bg-slate-100/50"
                          >
                            <span className={unitKerja ? 'text-slate-800' : 'text-slate-400'}>
                              {unitKerja === 'Lainnya' && customUnitKerja ? customUnitKerja : (unitKerja || 'Pilih Unit / Area Kerja')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </button>
                          
                          <AnimatePresence>
                            {unitKerja === 'Lainnya' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
                                <input
                                  type="text"
                                  value={customUnitKerja}
                                  onChange={(e) => {
                                    setCustomUnitKerja(e.target.value);
                                    triggerAutoSave({ customUnitKerja: e.target.value });
                                  }}
                                  placeholder="Ketik nama unit kerja Anda di sini..."
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <RippleButton
                        type="button"
                        onClick={() => {
                          const val0 = getStepValidation(0);
                          if (val0.isValid) setStep(1);
                        }}
                        disabled={!getStepValidation(0).isValid}
                        className={`px-6 py-3.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all transform-gpu ${
                          getStepValidation(0).isValid
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        Mulai Pengisian Kuesioner <ArrowRight className="w-4 h-4" />
                      </RippleButton>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: BAGIAN A */}
              {step === 1 && (
                <div className="space-y-6">
                  {STATEMENTS_A.map((st) => {
                    const ans = ansA[st.id];
                    const category = getFeedbackCategory(ans, st.isReversed);
                    return (
                      <div
                        key={st.id}
                        ref={(el) => { questionRefs.current[`A-${st.id}`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>{st.code}</span>
                            
                            {/* Hover tooltip for dimension */}
                            <div className="relative group">
                              <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200 cursor-pointer">
                                {DIMENSI_AHRQ.find(d => d.id === st.dim)?.nama || 'Dimensi'}
                              </span>
                              
                              {/* Tooltip text bubble */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-800 text-slate-100 text-[11px] rounded-xl shadow-lg z-50 leading-relaxed">
                                <span className="font-bold block mb-1">{DIMENSI_AHRQ.find(d => d.id === st.dim)?.nama}</span>
                                {DIMENSI_AHRQ.find(d => d.id === st.dim)?.desc}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">{st.text}</p>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {LIKERT_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, st.isReversed);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectOption('A', st.id, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: BAGIAN B */}
              {step === 2 && (
                <div className="space-y-6">
                  {STATEMENTS_B.map((st) => {
                    const ans = ansB[st.id];
                    const category = getFeedbackCategory(ans, st.isReversed);
                    return (
                      <div
                        key={st.id}
                        ref={(el) => { questionRefs.current[`B-${st.id}`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>{st.code}</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                              {DIMENSI_AHRQ.find(d => d.id === st.dim)?.nama || 'Dimensi'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">{st.text}</p>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {LIKERT_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, st.isReversed);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectOption('B', st.id, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 3: BAGIAN C */}
              {step === 3 && (
                <div className="space-y-6">
                  {STATEMENTS_C.map((st) => {
                    const ans = ansC[st.id];
                    const category = getFeedbackCategory(ans, st.isReversed);
                    return (
                      <div
                        key={st.id}
                        ref={(el) => { questionRefs.current[`C-${st.id}`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>{st.code}</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                              {DIMENSI_AHRQ.find(d => d.id === st.dim)?.nama || 'Dimensi'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">{st.text}</p>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {FREQUENCY_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, st.isReversed);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectOption('C', st.id, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 4: BAGIAN D */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* D1 */}
                  {(() => {
                    const ans = ansD[1];
                    const category = getFeedbackCategory(ans, false);
                    return (
                      <div
                        key="D-1"
                        ref={(el) => { questionRefs.current[`D-1`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>D1</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Pelaporan Kejadian</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800">Ketika kesalahan diketahui dan diperbaiki sebelum sampai ke pasien, seberapa sering hal ini dilaporkan?</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {FREQUENCY_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, false);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectD(1, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* D2 */}
                  {(() => {
                    const ans = ansD[2];
                    const category = getFeedbackCategory(ans, false);
                    return (
                      <div
                        key="D-2"
                        ref={(el) => { questionRefs.current[`D-2`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>D2</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Pelaporan Kejadian</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800">Ketika suatu kesalahan sampai ke pasien dan dapat membahayakan pasien, tetapi tidak terjadi, seberapa sering hal ini dilaporkan?</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {FREQUENCY_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, false);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectD(2, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* D3 */}
                  {(() => {
                    const ans = ansD[3];
                    const category = ans ? (ans === 'Tidak ada' ? 'neutral' : 'positive') : 'none';
                    return (
                      <div
                        key="D-3"
                        ref={(el) => { questionRefs.current[`D-3`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>D3</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Intensitas 12 Bulan Terakhir</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Berpartisipasi Melapor
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Belum Melapor
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800">Dalam 12 bulan terakhir, berapa banyak kejadian keselamatan pasien yang telah Anda laporkan?</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          {['Tidak ada', '1 sampai 2', '3 sampai 5', '6 hingga 10', '11 atau lebih'].map((choice, i) => {
                            const isSelected = ans === choice;
                            const choiceCategory = choice === 'Tidak ada' ? 'neutral' : 'positive';
                            return (
                              <RippleButton
                                key={i}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectD3(choice)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${
                                  isSelected 
                                    ? choiceCategory === 'positive'
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02] font-bold'
                                      : 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-500/20 scale-[1.02] font-bold'
                                    : ans !== undefined
                                      ? 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50'
                                      : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20'
                                }`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {choice}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 5: BAGIAN E */}
              {step === 5 && (
                <div className="space-y-6">
                  {(() => {
                    const ans = ansE;
                    const category = getFeedbackCategory(ans, false);
                    return (
                      <div
                        ref={(el) => { questionRefs.current[`E-1`] = el; }}
                        className={`rounded-3xl border p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>E1</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Peringkat Budaya Keselamatan</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-lg md:text-xl font-bold text-slate-800 leading-normal pt-2">Bagaimana Anda menilai unit/area kerja Anda dalam hal keselamatan pasien?</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {[
                            { val: 1, label: 'Buruk' },
                            { val: 2, label: 'Biasa' },
                            { val: 3, label: 'Baik' },
                            { val: 4, label: 'Sangat baik' },
                            { val: 5, label: 'Luar biasa' },
                          ].map((item) => {
                            const isSelected = ans === item.val;
                            const optCategory = getFeedbackCategory(item.val, false);
                            return (
                              <RippleButton
                                key={item.val}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectE(item.val)}
                                className={`p-6 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex flex-col justify-center items-center gap-3 ${getLikertButtonClass(isSelected, ans !== undefined, item.val, optCategory)}`}
                              >
                                <span className="text-sm font-bold flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-4 h-4" />}
                                  {item.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 6: BAGIAN F */}
              {step === 6 && (
                <div className="space-y-6">
                  {STATEMENTS_F.map((st) => {
                    const ans = ansF[st.id];
                    const category = getFeedbackCategory(ans, st.isReversed);
                    return (
                      <div
                        key={st.id}
                        ref={(el) => { questionRefs.current[`F-${st.id}`] = el; }}
                        className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 relative overflow-hidden ${getCardBgClass(category)}`}
                      >
                        {category === 'positive' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />}
                        {category === 'neutral' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />}
                        {category === 'negative' && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-red-500" />}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all transform-gpu duration-300 ${getBadgeClass(category)}`}>{st.code}</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                              {DIMENSI_AHRQ.find(d => d.id === st.dim)?.nama || 'Dimensi'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Response Quality Indicator */}
                            {category === 'positive' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Respon Positif
                              </span>
                            )}
                            {category === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Respon Netral
                              </span>
                            )}
                            {category === 'negative' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Respon Negatif
                              </span>
                            )}

                            {getDoneBadgeClass(!!ans)}
                          </div>
                        </div>

                        <p className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">{st.text}</p>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {LIKERT_OPTIONS.map((opt) => {
                            const isSelected = ans === opt.value;
                            const optCategory = getFeedbackCategory(opt.value, st.isReversed);
                            return (
                              <RippleButton
                                key={opt.value}
                                isSelected={isSelected}
                                shakeOnHover={true}
                                onClick={() => handleSelectOption('F', st.id, opt.value)}
                                className={`p-4 rounded-2xl border text-center transition-all transform-gpu duration-300 cursor-pointer flex items-center justify-center min-h-[64px] ${getLikertButtonClass(isSelected, ans !== undefined, opt.value, optCategory)}`}
                              >
                                <span className="text-xs leading-tight font-medium flex items-center justify-center gap-1.5">
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </span>
                              </RippleButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 7: BAGIAN G */}
              {step === 7 && (
                <div className="space-y-6">
                  {/* G1 */}
                  <div
                    ref={(el) => { questionRefs.current[`G-1`] = el; }}
                    className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 ${
                      ansG[1] 
                        ? 'bg-emerald-50/50 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/5' 
                        : 'bg-white/95 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ansG[1] ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>G1</span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Latar Belakang RS</span>
                      </div>
                      {getDoneBadgeClass(!!ansG[1])}
                    </div>
                    <p className="text-base md:text-lg font-bold text-slate-800">Sudah berapa lama Anda bekerja di rumah sakit ini?</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {['Kurang dari 1 tahun', '1 hingga 5 tahun', '6 hingga 10 tahun', '11 tahun atau lebih'].map((opt, i) => (
                        <RippleButton
                          key={i}
                          isSelected={ansG[1] === opt}
                          shakeOnHover={true}
                          onClick={() => handleSelectG(1, opt)}
                          className={`p-4 rounded-2xl border text-center transition-all transform-gpu cursor-pointer font-bold text-xs ${
                            ansG[1] === opt 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02] font-semibold' 
                              : ansG[1] !== undefined
                                ? 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20'
                          }`}
                        >
                          {opt}
                        </RippleButton>
                      ))}
                    </div>
                  </div>

                  {/* G2 */}
                  <div
                    ref={(el) => { questionRefs.current[`G-2`] = el; }}
                    className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 ${
                      ansG[2] 
                        ? 'bg-emerald-50/50 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/5' 
                        : 'bg-white/95 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ansG[2] ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>G2</span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Latar Belakang Unit</span>
                      </div>
                      {getDoneBadgeClass(!!ansG[2])}
                    </div>
                    <p className="text-base md:text-lg font-bold text-slate-800">Di rumah sakit ini, sudah berapa lama Anda bekerja di unit/area kerja saat ini?</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {['Kurang dari 1 tahun', '1 hingga 5 tahun', '6 hingga 10 tahun', '11 tahun atau lebih'].map((opt, i) => (
                        <RippleButton
                          key={i}
                          isSelected={ansG[2] === opt}
                          shakeOnHover={true}
                          onClick={() => handleSelectG(2, opt)}
                          className={`p-4 rounded-2xl border text-center transition-all transform-gpu cursor-pointer font-bold text-xs ${
                            ansG[2] === opt 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02] font-semibold' 
                              : ansG[2] !== undefined
                                ? 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20'
                          }`}
                        >
                          {opt}
                        </RippleButton>
                      ))}
                    </div>
                  </div>

                  {/* G3 */}
                  <div
                    ref={(el) => { questionRefs.current[`G-3`] = el; }}
                    className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 ${
                      ansG[3] 
                        ? 'bg-emerald-50/50 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/5' 
                        : 'bg-white/95 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ansG[3] ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>G3</span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Durasi Jam Kerja</span>
                      </div>
                      {getDoneBadgeClass(!!ansG[3])}
                    </div>
                    <p className="text-base md:text-lg font-bold text-slate-800">Biasanya, berapa jam per minggu Anda bekerja di rumah sakit ini?</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['Kurang dari 30 jam per minggu', '30 hingga 40 jam per minggu', 'Lebih dari 40 jam per minggu'].map((opt, i) => (
                        <RippleButton
                          key={i}
                          isSelected={ansG[3] === opt}
                          shakeOnHover={true}
                          onClick={() => handleSelectG(3, opt)}
                          className={`p-4 rounded-2xl border text-center transition-all transform-gpu cursor-pointer font-bold text-xs ${
                            ansG[3] === opt 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02] font-semibold' 
                              : ansG[3] !== undefined
                                ? 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20'
                          }`}
                        >
                          {opt}
                        </RippleButton>
                      ))}
                    </div>
                  </div>

                  {/* G4 */}
                  <div
                    ref={(el) => { questionRefs.current[`G-4`] = el; }}
                    className={`rounded-3xl border p-6 md:p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 ${
                      ansG[4] 
                        ? 'bg-emerald-50/50 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/5' 
                        : 'bg-white/95 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ansG[4] ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>G4</span>
                        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Interaksi Pasien</span>
                      </div>
                      {getDoneBadgeClass(!!ansG[4])}
                    </div>
                    <p className="text-base md:text-lg font-bold text-slate-800">Dalam posisi staf Anda, apakah Anda memiliki interaksi atau kontak langsung dengan pasien?</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'YA, saya melakukan interaksi atau kontak langsung dengan pasien',
                        'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien'
                      ].map((opt, i) => (
                        <RippleButton
                          key={i}
                          isSelected={ansG[4] === opt}
                          shakeOnHover={true}
                          onClick={() => handleSelectG(4, opt)}
                          className={`p-5 rounded-2xl border text-left transition-all transform-gpu cursor-pointer font-bold text-xs ${
                            ansG[4] === opt 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02] font-semibold' 
                              : ansG[4] !== undefined
                                ? 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-emerald-500/30 hover:bg-emerald-50/20'
                          }`}
                        >
                          {opt}
                        </RippleButton>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: BAGIAN H - KOMENTAR */}
              {step === 8 && (
                <div
                  ref={(el) => { questionRefs.current[`H-1`] = el; }}
                  className={`rounded-3xl border p-8 shadow-xl shadow-slate-900/10 transition-all transform-gpu duration-300 space-y-6 ${
                    komentar.trim() 
                      ? 'bg-emerald-50/50 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/5' 
                      : 'bg-white/95 border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        komentar.trim() ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>H1</span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">Ulasan & Konstruksi Masukan</span>
                    </div>
                    {getDoneBadgeClass(komentar.trim().length > 0)}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-800">Bagikan Komentar atau Pengalaman Anda</h3>
                    <p className="text-xs text-slate-500">Silakan berikan komentar Anda tentang bagaimana hal-hal yang dilakukan atau dapat dilakukan di {activeRsName} yang dapat mempengaruhi keselamatan pasien.</p>
                  </div>

                  <textarea
                    rows={5}
                    value={komentar}
                    onChange={(e) => {
                      setKomentar(e.target.value);
                      triggerAutoSave({ komentar: e.target.value });
                    }}
                    placeholder="Tulis ulasan, hambatan, atau ide perbaikan konstruktif Anda di sini secara rinci (atau pilih opsi cepat di bawah)..."
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none leading-relaxed text-slate-800 placeholder-slate-400"
                  />

                  {/* Pilihan Cepat Masukan */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pilihan Jawaban Cepat (Klik untuk langsung mengisi):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Tidak ada komentar atau saran tambahan.',
                        'Pertahankan sistem dan budaya keselamatan saat ini.',
                        'Perlu peningkatan koordinasi dan komunikasi antar unit kerja.',
                        'Fasilitas dan sarana penunjang keselamatan perlu ditingkatkan.',
                        'Perlu pelatihan berkala terkait keselamatan pasien untuk seluruh staf.'
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setKomentar(item);
                            triggerAutoSave({ komentar: item });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            komentar === item
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-[11px] text-emerald-800 leading-normal">
                      Ulasan masukan Anda akan diolah secara analitis kualitatif oleh tim manajemen fasyankes guna menentukan prioritas mitigasi insiden keselamatan pasien.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 9: REVIEW SECTION */}
              {step === 9 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-900/10 space-y-8">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-600 tracking-wider font-mono">KOMPILASI</span>
                    <h2 className="text-2xl font-bold text-slate-800">Review Sebelum Kirim Kuesioner</h2>
                    <p className="text-xs text-slate-500">Silakan tinjau seluruh kelengkapan jawaban kuesioner Anda untuk menjamin akurasi data budaya keselamatan.</p>
                  </div>

                  <hr className="border-slate-100" />

                  {unansweredCount > 0 ? (
                    <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-rose-800">Ditemukan {unansweredCount} Isian Belum Lengkap</h5>
                          <p className="text-[11px] text-rose-700 leading-normal mt-0.5">
                            Kuesioner belum dapat dikirim. Silakan lengkapi seluruh pertanyaan pada bagian berikut untuk memastikan kalkulasi budaya keselamatan valid:
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-200/60">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                          const val = getStepValidation(s);
                          if (val.isValid) return null;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setStep(s);
                                if (val.firstUnansweredId) {
                                  setTimeout(() => scrollToQuestion(val.firstUnansweredId!), 100);
                                }
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <span>{SECTIONS[s].label} ({val.unanswered} belum diisi)</span>
                              <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold">Luar biasa! Seluruh {totalQuestions} pertanyaan kuesioner berhasil terjawab dengan lengkap.</span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={unansweredCount > 0}
                      className={`flex-1 py-3.5 font-bold rounded-xl text-xs shadow-lg transition-all transform-gpu flex items-center justify-center gap-2 ${
                        unansweredCount > 0
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15 cursor-pointer active:scale-95'
                      }`}
                    >
                      <Save className="w-4 h-4" /> Kirim Jawaban Survei
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 10: SUCCESS SCREEN */}
              {step === 10 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xl shadow-slate-900/10 space-y-6 max-w-xl mx-auto my-6">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-emerald-600 tracking-widest uppercase font-mono">SINKRONISASI SELESAI</span>
                    <h2 className="text-2xl font-extrabold text-slate-800">Terima Kasih Banyak!</h2>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Kuesioner budaya keselamatan pasien Anda berhasil dikirim secara realtime dan diintegrasikan ke basis data cloud rumah sakit.
                    </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col gap-2 text-[11px] text-emerald-800 leading-relaxed text-left">
                    <div className="flex items-center gap-2 font-bold">
                      <Database className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Data Dimasukkan Ke Basis Data</span>
                    </div>
                    <p>Hasil entri kuesioner Anda akan segera dikompilasi secara dinamis pada tab <strong>Dashboard</strong>, <strong>Analisis Grafik</strong>, dan pembuatan laporan otomatis.</p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setResponderName('');
                        setPosisiStaf('');
                        setUnitKerja('');
                        setAnsA({});
                        setAnsB({});
                        setAnsC({});
                        setAnsD({});
                        setAnsE(undefined);
                        setAnsF({});
                        setAnsG({});
                        setKomentar('');
                        setStep(0);
                      }}
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all transform-gpu shadow-md shadow-emerald-600/10"
                    >
                      Input Survei Baru
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* 3. STICKY FOOTER NAVIGATION */}
      {step > 0 && step < 10 && (
      <footer id="survey-sticky-footer" className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-3 px-4 sm:px-6 md:px-8 flex justify-between items-end z-10 shadow-md">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0 || step === 10}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all transform-gpu flex items-center gap-1.5 ${
            step === 0 || step === 10
              ? 'text-slate-300 bg-slate-50 border border-slate-100 cursor-not-allowed'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Sebelumnya
        </button>

        {step < 9 ? (
          <div className="flex flex-col items-end gap-1">
            {(() => {
              const val = getStepValidation(step);
              if (!val.isValid) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (val.firstUnansweredId) scrollToQuestion(val.firstUnansweredId);
                    }}
                    title="Klik untuk langsung menuju pertanyaan yang belum diisi"
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/90 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs active:scale-95"
                  >
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>{val.unanswered} belum diisi (klik untuk isi)</span>
                  </button>
                );
              }
              return (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Lengkap ({val.answered}/{val.total})</span>
                </span>
              );
            })()}

            {(() => {
              const val = getStepValidation(step);
              return (
                <button
                  onClick={handleNextStep}
                  disabled={!val.isValid}
                  title={
                    !val.isValid
                      ? `Harap jawab ${val.unanswered} pertanyaan yang belum diisi di bagian ini sebelum melanjutkan`
                      : 'Lanjut ke bagian berikutnya'
                  }
                  className={`px-5 sm:px-6 py-2.5 sm:py-3 font-bold rounded-xl text-xs transition-all transform-gpu flex items-center gap-1.5 ${
                    val.isValid
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 cursor-pointer active:scale-95'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  }`}
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              );
            })()}
          </div>
        ) : step === 9 ? (
          <div className="flex flex-col items-end gap-1">
            {unansweredCount > 0 ? (
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50/90 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 whitespace-nowrap shadow-2xs">
                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>{unansweredCount} belum lengkap</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Semua terjawab</span>
              </span>
            )}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={unansweredCount > 0}
              title={unansweredCount > 0 ? `Masih ada ${unansweredCount} pertanyaan belum diisi` : 'Kirim Kuesioner'}
              className={`px-5 sm:px-6 py-2.5 sm:py-3 font-bold rounded-xl text-xs transition-all transform-gpu flex items-center gap-1.5 ${
                unansweredCount === 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10 cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              }`}
            >
              Kirim Kuesioner <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div />
        )}
      </footer>
      )}

      {/* FULLSCREEN MODALS FOR DROPDOWNS */}
      {mounted && createPortal(
        <AnimatePresence>
          {isPosisiModalOpen && (
            <motion.div
              key="posisi-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-50 flex flex-col z-[9999]"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
                <div className="flex justify-between items-center sticky top-0 bg-slate-50 p-4 -mx-6 -mt-6 mb-2 border-b border-slate-200 z-20 max-w-4xl mx-auto w-full">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600"/> Pilih Posisi Staf</h3>
                  <button type="button" onClick={() => setIsPosisiModalOpen(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 hover:text-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="max-w-4xl mx-auto w-full sticky top-[68px] z-10 bg-slate-50 pb-4 pt-2">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Cari posisi staf (nama jabatan atau kategori)..." 
                      value={posisiSearch}
                      onChange={(e) => setPosisiSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto w-full pt-0">
                  {(() => {
                    const filtered = posisiMaster.filter(p => 
                      p.is_active && 
                      (p.nama_posisi.toLowerCase().includes(posisiSearch.toLowerCase()) || p.kategori.toLowerCase().includes(posisiSearch.toLowerCase()))
                    );
                    const grouped = filtered.reduce((acc, curr) => {
                      if (!acc[curr.kategori]) acc[curr.kategori] = [];
                      acc[curr.kategori].push(curr);
                      return acc;
                    }, {} as Record<string, typeof posisiMaster>);

                    if (Object.keys(grouped).length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400">
                          <p>Tidak ada posisi staf yang cocok dengan &quot;{posisiSearch}&quot;.</p>
                        </div>
                      );
                    }

                    return Object.entries(grouped).map(([group, list], idx) => (
                      <div key={group} className={`space-y-3 ${idx === 0 ? 'mt-2' : 'mt-6'}`}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{group}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {list.map(pos => (
                            <button
                              type="button"
                              key={pos.id}
                              onClick={() => {
                                setPosisiStaf(pos.nama_posisi);
                                triggerAutoSave({ posisiStaf: pos.nama_posisi });
                                setIsPosisiModalOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all transform-gpu cursor-pointer ${
                                posisiStaf === pos.nama_posisi 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-sm' 
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {pos.nama_posisi}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {isUnitModalOpen && (
            <motion.div
              key="unit-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-50 flex flex-col z-[9999]"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
                <div className="flex justify-between items-center sticky top-0 bg-slate-50 p-4 -mx-6 -mt-6 mb-2 border-b border-slate-200 z-20 max-w-4xl mx-auto w-full">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600"/> Pilih Unit / Area Kerja</h3>
                  <button type="button" onClick={() => setIsUnitModalOpen(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 hover:text-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
                </div>

                <div className="max-w-4xl mx-auto w-full sticky top-[68px] z-10 bg-slate-50 pb-4 pt-2">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Cari unit..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto w-full pt-0">
                  {(() => {
                    const filtered = unitMaster.filter(u => 
                      u.is_active && 
                      (u.nama_unit.toLowerCase().includes(unitSearch.toLowerCase()) || 
                       u.kategori.toLowerCase().includes(unitSearch.toLowerCase()))
                    );
                    const grouped = filtered.reduce((acc, curr) => {
                      if (!acc[curr.kategori]) acc[curr.kategori] = [];
                      acc[curr.kategori].push(curr);
                      return acc;
                    }, {} as Record<string, typeof unitMaster>);

                    if (Object.keys(grouped).length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400">
                          <p>Tidak ada unit / area kerja yang cocok dengan &quot;{unitSearch}&quot;.</p>
                        </div>
                      );
                    }

                    return Object.entries(grouped).map(([group, list], idx) => (
                      <div key={group} className={`space-y-3 ${idx === 0 ? 'mt-2' : 'mt-6'}`}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{group}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {list.map(u => (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => {
                                setUnitKerja(u.nama_unit);
                                triggerAutoSave({ unitKerja: u.nama_unit });
                                setIsUnitModalOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all transform-gpu cursor-pointer ${
                                unitKerja === u.nama_unit 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-sm' 
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {u.nama_unit}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 4. CONFIRMATION DIALOG MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
              <motion.div
                key="confirm-modal-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Kirim Kuesioner Anda?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Apakah Anda yakin seluruh jawaban sudah benar? Seluruh data yang Anda masukkan akan disinkronisasikan langsung demi kalkulasi dimensi budaya keselamatan RS.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all transform-gpu cursor-pointer"
                  >
                    Kembali Periksa
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/15 transition-all transform-gpu flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Mengirim...</span>
                    ) : (
                      <>
                        <span>Ya, Kirim</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {showLinkModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5 my-8"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" /> Bagikan Link Survei
              </h2>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isLoadingLink ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
              </div>
            ) : !surveyLinkConfig ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-slate-600">Belum ada link survei publik yang dibuat untuk rumah sakit ini.</p>
                <button
                  onClick={generateSurveyLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all w-full cursor-pointer"
                >
                  Buat Link Survei Baru
                </button>
              </div>
            ) : (() => {
              const computedLink = `${getPublicBaseUrl()}/survey/${surveyLinkConfig.token}`;

              return (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tautan Publik Survei</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={computedLink} 
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-emerald-600 font-mono w-full outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(computedLink);
                          setIsCopied(true);
                          showNotification("Link survei berhasil disalin ke clipboard!", "success");
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 border border-slate-200 cursor-pointer"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {isCopied ? 'Tersalin' : 'Salin Link'}
                      </button>
                      <a 
                        href={`/survey/${surveyLinkConfig.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> Buka Link
                      </a>
                    </div>
                  </div>

                  {/* PREMIUM DIRECT SHARE - BAGIKAN MELALUI */}
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Bagikan Melalui</span>
                    <div className="grid grid-cols-2 gap-3">
                      {/* WhatsApp */}
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent('Mohon kesediaannya mengisi Survei Budaya Keselamatan Pasien: ' + computedLink)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-50 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-slate-200 hover:border-transparent transition-all duration-300 shadow-sm rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 font-medium active:scale-95"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-2.586c1.65.98 3.267 1.497 4.947 1.498 5.464 0 9.909-4.444 9.913-9.91.002-2.648-1.02-5.138-2.878-6.998-1.858-1.86-4.348-2.883-6.997-2.884-5.467 0-9.914 4.444-9.918 9.91-.001 1.77.476 3.5 1.38 5.02L2.015 21.91l5.485-1.437c-.302-.178-.58-.363-.853-.559zm10.153-7.033c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-white">WhatsApp</span>
                      </a>

                      {/* Telegram */}
                      <a 
                        href={`https://t.me/share/url?url=${encodeURIComponent(computedLink)}&text=${encodeURIComponent('Mohon kesediaannya mengisi Survei Budaya Keselamatan Pasien')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-50 hover:bg-[#0088cc] text-[#0088cc] hover:text-white border border-slate-200 hover:border-transparent transition-all duration-300 shadow-sm rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 font-medium active:scale-95"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.91 3.123c-.114-.627-.61-.986-1.18-.986-.23 0-.46.06-.67.16l-.03.013L.66 10.42c-.52.2-.66.69-.66 1.05 0 .37.21.73.66.9l4.58 1.673c.3.1.58.07.82-.09l12.44-8.03c.12-.08.26.04.17.15l-10 9.243c-.22.2-.33.48-.3.77l.54 5.37c.05.47.38.74.77.74.27 0 .52-.11.71-.3l2.87-2.65 4.39 3.22c.32.23.7.35 1.09.35.68 0 1.21-.49 1.28-1.17l3.12-17.123a1.43 1.43 0 00.01-.26z"/>
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-white">Telegram</span>
                      </a>

                      {/* Instagram */}
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(computedLink);
                          showNotification("Link berhasil disalin. Silakan tempel pada Bio, Story, atau Direct Message Instagram.", "success");
                          setTimeout(() => {
                            window.open("https://instagram.com", "_blank", "noopener,noreferrer");
                          }, 1500);
                        }}
                        className="bg-slate-50 hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] text-[#DD2A7B] hover:text-white border border-slate-200 hover:border-transparent transition-all duration-300 shadow-sm rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 font-medium active:scale-95 cursor-pointer"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051c-.059 1.28-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0 3.259-.014 3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-white">Instagram</span>
                      </button>

                      {/* Facebook */}
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(computedLink)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-50 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-slate-200 hover:border-transparent transition-all duration-300 shadow-sm rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 font-medium active:scale-95"
                      >
                        <svg className="w-6 h-6 transition-transform duration-200 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-white">Facebook</span>
                      </a>
                    </div>
                  </div>

                  {/* ADVANCED CONFIGURATION PANEL */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                    <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider border-b border-slate-200 pb-1.5 font-mono">Pengaturan Keamanan & Link</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periode Mulai</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periode Selesai / Masa Berlaku</label>
                        <input 
                          type="date" 
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Responden</label>
                      <input 
                        type="number" 
                        placeholder="Tanpa Batas" 
                        value={maxRespondents}
                        onChange={(e) => setMaxRespondents(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="text-[11px] font-bold text-slate-700 cursor-pointer select-none" htmlFor="prevent-dup-toggle">
                        Batasi 1 Pengisian per Perangkat
                      </label>
                      <input 
                        id="prevent-dup-toggle"
                        type="checkbox" 
                        checked={preventDuplicate}
                        onChange={(e) => setPreventDuplicate(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 bg-white focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    
                    {notification && (
                      <div className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                        notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{notification.message}</span>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        await updateSurveyLinkConfig({ customDomain, startDate, expiryDate, maxRespondents, preventDuplicate }, true);
                      }}
                      disabled={isLoadingLink}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoadingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isLoadingLink ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm text-slate-700 font-medium">Status Link</span>
                    <button 
                      onClick={toggleSurveyLinkStatus}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${surveyLinkConfig.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} cursor-pointer`}
                    >
                      {surveyLinkConfig.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </button>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Tanggal Dibuat:</span>
                      <span className="text-slate-700">{new Date(surveyLinkConfig.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jumlah Responden via Link:</span>
                      <span className="text-emerald-600 font-bold">{surveyLinkConfig.respondentCount} orang</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        if (confirm('Link lama akan dinonaktifkan secara permanen dan tidak dapat digunakan lagi. Lanjutkan?')) {
                          generateSurveyLink();
                        }
                      }}
                      className="w-full text-xs text-rose-600 hover:text-rose-500 font-semibold text-center py-2 transition-colors cursor-pointer"
                    >
                      Buat Ulang (Regenerate) Link
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] max-w-md w-[calc(100%-2rem)] p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                  : notification.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-200'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-sm leading-snug">
                {notification.message}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-200 shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
