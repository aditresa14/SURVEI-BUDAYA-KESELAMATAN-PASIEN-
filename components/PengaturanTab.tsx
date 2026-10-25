'use client';

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  UploadCloud, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Trash2, 
  Loader2, 
  Check, 
  AlertCircle,
  Link as LinkIcon,
  HelpCircle,
  Database,
  Key,
  Copy,
  RefreshCw,
  Wifi,
  WifiOff,
  Terminal,
  Eye,
  EyeOff,
  X,
  Mail,
  Phone,
  User,
  Building2,
  MapPin,
  Lock,
  Edit,
  FileCheck,
  FileText,
  Calendar,
  Award,
  UserCheck,
  HardDrive,
  Folder,
  FolderCheck,
  Download
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { saveWallpaper, clearWallpaper, WallpaperData } from '../lib/wallpaper';
import { saveLogo, clearLogo, LogoData } from '../lib/logo';
import { saveHeaderImage, clearHeaderImage, HeaderImageData } from '../lib/headerBanner';
import { isSupabaseConnected, testSupabaseConnection } from '../lib/supabase';
import { 
  syncAllLocalDataToSupabase, 
  getHospitalAccountByUsername, 
  updateHospitalProfile, 
  HospitalAccount, 
  getMasterBenchmark, 
  saveMasterBenchmark, 
  getBenchmarkInteraksi, 
  saveBenchmarkInteraksi, 
  BenchmarkInteraksi,
  getPengesahanConfig,
  savePengesahanConfig,
  PengesahanConfig,
  SurveyData
} from '../lib/db';
import { DIMENSI_INFO } from '../lib/scoring';
import { BarChart2, Users, Sparkles } from 'lucide-react';
import MasterPosisiTab from './MasterPosisiTab';
import MasterUnitTab from './MasterUnitTab';

interface PengaturanTabProps {
  role?: 'admin' | 'rs';
  identifier?: string;
  namaRs: string;
  onUpdateRsName: (name: string) => void;
  onResetData: () => void;
  activeWallpaper: WallpaperData | null;
  onUpdateWallpaper: (wallpaper: WallpaperData | null) => void;
  activeLogo: LogoData | null;
  onUpdateLogo: (logo: LogoData | null) => void;
  activeHeaderImage?: HeaderImageData | null;
  onUpdateHeaderImage?: (headerImage: HeaderImageData | null) => void;
  surveys?: SurveyData[];
}

export default function PengaturanTab({ 
  role = 'admin',
  identifier = '',
  namaRs, 
  onUpdateRsName, 
  onResetData,
  activeWallpaper,
  onUpdateWallpaper,
  activeLogo,
  onUpdateLogo,
  activeHeaderImage,
  onUpdateHeaderImage,
  surveys = []
}: PengaturanTabProps) {
  const [activeSettingsSection, setActiveSettingsSection] = useState<'profil' | 'posisi' | 'unit' | 'pengesahan' | 'backup'>('profil');
  // Benchmark state
  const [benchmarks, setBenchmarks] = useState<Record<string, { min: number, max: number }>>({});
  const [benchmarkInteraksi, setBenchmarkInteraksi] = useState<BenchmarkInteraksi[]>([]);
  const [isSavingBenchmark, setIsSavingBenchmark] = useState(false);
  const [isSavingBenchmarkInteraksi, setIsSavingBenchmarkInteraksi] = useState(false);

  useEffect(() => {
    if (role === 'admin') {
      const fetchBenchmark = async () => {
        const bm = await getMasterBenchmark();
        if (bm) {
          setBenchmarks(bm);
        } else {
          // prefill from DIMENSI_INFO
          const prefilled: Record<string, {min: number, max: number}> = {};
          Object.keys(DIMENSI_INFO).forEach(k => {
            prefilled[k] = { min: DIMENSI_INFO[k].benchmarkMin, max: DIMENSI_INFO[k].benchmarkMax };
          });
          setBenchmarks(prefilled);
        }
      };
      fetchBenchmark();
      
      const fetchBenchmarkInteraksi = async () => {
        const bmInteraksi = await getBenchmarkInteraksi();
        if (bmInteraksi && bmInteraksi.length > 0) {
          setBenchmarkInteraksi(bmInteraksi);
        } else {
          const initial = Object.keys(DIMENSI_INFO).map(dimId => ({
            id: `bm_int_${dimId}`,
            dimensi: dimId,
            dengan_pasien: 0,
            tanpa_pasien: 0
          }));
          setBenchmarkInteraksi(initial);
        }
      }
      fetchBenchmarkInteraksi();
    }
  }, [role]);

  const handleSaveBenchmark = async () => {
    setIsSavingBenchmark(true);
    try {
      await saveMasterBenchmark(benchmarks);
      showToast("✅ Master Benchmark berhasil disimpan.", "success");
    } catch (e: any) {
      showToast(`❌ Gagal menyimpan benchmark: ${e.message}`, "error");
    } finally {
      setIsSavingBenchmark(false);
    }
  };

  const handleSaveBenchmarkInteraksi = async () => {
    setIsSavingBenchmarkInteraksi(true);
    try {
      await saveBenchmarkInteraksi(benchmarkInteraksi);
      showToast("✅ Master Benchmark Interaksi berhasil disimpan.", "success");
    } catch (e: any) {
      showToast(`❌ Gagal menyimpan benchmark interaksi: ${e.message}`, "error");
    } finally {
      setIsSavingBenchmarkInteraksi(false);
    }
  };

  const handleBenchmarkInteraksiChange = (dimensi: string, field: 'dengan_pasien' | 'tanpa_pasien', value: string) => {
    const val = parseFloat(value);
    setBenchmarkInteraksi(prev => prev.map(item => {
      if (item.dimensi === dimensi) {
        return { ...item, [field]: isNaN(val) ? 0 : val };
      }
      return item;
    }));
  };

  const handleBenchmarkChange = (dimId: string, field: 'min' | 'max', value: string) => {
    const val = parseInt(value, 10);
    setBenchmarks(prev => ({
      ...prev,
      [dimId]: {
        ...prev[dimId],
        [field]: isNaN(val) ? 0 : val
      }
    }));
  };

  const [tempName, setTempName] = useState(namaRs);
  const [alamatRs, setAlamatRs] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kotaKab, setKotaKab] = useState('');
  const [kodePos, setKodePos] = useState('');
  const [emailRs, setEmailRs] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dbPassword, setDbPassword] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };
  
  useEffect(() => {
    if (identifier) {
      const fetchProfile = async () => {
        setIsFetchingProfile(true);
        try {
          const account = await getHospitalAccountByUsername(identifier);
          if (account) {
            setAccountId(account.id);
            setTempName(account.namaRs || '');
            setAlamatRs(account.alamatRs || '');
            setProvinsi(account.provinsi || '');
            setKotaKab(account.kotaKab || '');
            setKodePos(account.kodePos || '');
            setEmailRs(account.emailRs || '');
            setNoTelepon(account.noTelepon || '');
            setNoWhatsapp(account.noWhatsapp || '');
            setUsername(account.username || '');
            setDbPassword(account.password || '');
          }
        } catch (e) {
          console.error("Failed to fetch profile", e);
        } finally {
          setIsFetchingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [identifier]);

  // Wallpaper states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState('');
  const [wallpaperUrlType, setWallpaperUrlType] = useState<'image' | 'video'>('image');
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'url'>('upload');
  
  // Logo states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [activeLogoSubTab, setActiveLogoSubTab] = useState<'upload' | 'url'>('upload');

  // Header Banner Image states
  const [headerImageInput, setHeaderImageInput] = useState<string | null>(null);
  const [headerImagePosition, setHeaderImagePosition] = useState<'center' | 'center-right' | 'top-right' | 'bottom-right'>('center-right');
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [headerUploadError, setHeaderUploadError] = useState<string | null>(null);
  const [isHeaderImageDragOver, setIsHeaderImageDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const hasSupabase = isSupabaseConnected();

  useEffect(() => {
    if (activeHeaderImage) {
      setHeaderImageInput(activeHeaderImage.url);
      setHeaderImagePosition(activeHeaderImage.position || 'center-right');
    } else {
      setHeaderImageInput(null);
      setHeaderImagePosition('center-right');
    }
  }, [activeHeaderImage]);

  // Pengesahan Halaman State
  const [pengesahanForm, setPengesahanForm] = useState<PengesahanConfig>({
    namaRs: namaRs || '',
    logoRs: '',
    kota: 'Sukabumi',
    tanggalPengesahan: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    direkturNama: 'dr. H. Ahmad Wijaya',
    direkturGelar: '',
    direkturJabatan: 'Direktur Utama Rumah Sakit',
    direkturNipType: 'NIP',
    direkturNip: '19780512 200501 1 002',
    pjNama: 'dr. Budi Santoso',
    pjGelar: '',
    pjJabatan: 'Ketua Komite Mutu & Keselamatan Pasien',
    pjNipType: 'NIP',
    pjNip: '19820315 200804 1 005',
  });
  const [isSavingPengesahan, setIsSavingPengesahan] = useState(false);
  const [isFetchingPengesahan, setIsFetchingPengesahan] = useState(false);

  useEffect(() => {
    const fetchPengesahan = async () => {
      setIsFetchingPengesahan(true);
      try {
        const config = await getPengesahanConfig(identifier || namaRs, namaRs);
        setPengesahanForm(config);
      } catch (err) {
        console.warn("Gagal memuat konfigurasi pengesahan:", err);
      } finally {
        setIsFetchingPengesahan(false);
      }
    };
    fetchPengesahan();
  }, [identifier, namaRs]);

  const handleSavePengesahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pengesahanForm.namaRs.trim()) {
      showToast("❌ Nama Rumah Sakit tidak boleh kosong.", "error");
      return;
    }

    setIsSavingPengesahan(true);
    try {
      await savePengesahanConfig(identifier || namaRs, pengesahanForm);
      showToast("✅ Pengaturan Halaman Pengesahan berhasil disimpan. Perubahan ini berlaku khusus untuk Laporan Resmi pada menu Laporan Survei.", "success");
    } catch (err: any) {
      showToast(`❌ Gagal menyimpan Halaman Pengesahan: ${err.message || err}`, "error");
    } finally {
      setIsSavingPengesahan(false);
    }
  };

  // Google Drive & Backup States
  const [backupStats, setBackupStats] = useState<{
    gdriveMounted: boolean;
    gdriveBackupPath: string;
    gdriveFileExists?: boolean;
    realtimeBackupExists: boolean;
    realtimeBackupPath: string;
    lastModified: string | null;
    fileSizeKb: number;
    totalSurveys: number;
    totalAccounts: number;
  } | null>(null);
  const [isFetchingBackupStats, setIsFetchingBackupStats] = useState(false);
  const [isSyncingGdrive, setIsSyncingGdrive] = useState(false);
  const [gdriveSyncMsg, setGdriveSyncMsg] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackupStats = async () => {
    setIsFetchingBackupStats(true);
    try {
      const res = await fetch('/api/backup?getBackupStatus=true');
      if (res.ok) {
        const json = await res.json();
        setBackupStats(json);
      }
    } catch (e) {
      console.warn("Could not fetch backup stats", e);
    } finally {
      setIsFetchingBackupStats(false);
    }
  };

  useEffect(() => {
    if (role === 'admin') {
      fetchBackupStats();
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'admin' && activeSettingsSection === 'backup') {
      setActiveSettingsSection('profil');
    }
  }, [role, activeSettingsSection]);

  const handleSyncGdriveNow = async () => {
    setIsSyncingGdrive(true);
    setGdriveSyncMsg("");
    try {
      const res = await fetch('/api/backup?syncGdriveNow=true');
      const data = await res.json();
      if (res.ok && data.success) {
        setGdriveSyncMsg(data.message || "Sinkronisasi Berhasil! Database telah disalin langsung ke Google Drive (G:\\My Drive\\BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN)");
        showToast("✅ Berhasil menyinkronkan data ke Google Drive!", "success");
        fetchBackupStats();
      } else {
        showToast(`❌ ${data.error || "Gagal menyinkronkan ke Google Drive"}`, "error");
      }
    } catch (err: any) {
      showToast(`❌ Terjadi kesalahan: ${err.message || err}`, "error");
    } finally {
      setIsSyncingGdrive(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      showToast("⏳ Menyiapkan berkas cadangan database...", "success");
      const res = await fetch('/api/backup?exportAll=true');
      if (!res.ok) throw new Error("Gagal mengunduh cadangan");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      a.href = url;
      a.download = `BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("✅ Cadangan database berhasil diunduh!", "success");
      fetchBackupStats();
    } catch (err: any) {
      showToast(`❌ Gagal mengunduh berkas cadangan: ${err.message || err}`, "error");
    }
  };

  const handleRestoreBackupFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Apakah Anda yakin ingin memulihkan database dari berkas "${file.name}"? Data survei dan akun fasyankes akan disinkronkan kembali.`)) {
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', payload })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast("✅ Database survei berhasil dipulihkan secara menyeluruh!", "success");
        fetchBackupStats();
      } else {
        showToast(`❌ Gagal memulihkan database: ${resData.error || "Terjadi kesalahan"}`, "error");
      }
    } catch (err: any) {
      showToast(`❌ Format file cadangan tidak valid: ${err.message || err}`, "error");
    } finally {
      setIsRestoring(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  // Supabase integrations
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<null | { success: boolean; message: string; tableMissing: boolean }>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<null | { success: boolean; message: string; surveysSynced: number; accountsSynced: number; wallpaperSynced: boolean }>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) {
      showToast("❌ Nama RS tidak boleh kosong.", "error");
      return;
    }
    if (emailRs && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRs)) {
      showToast("❌ Format email tidak valid.", "error");
      return;
    }
    
    // Friendly phone regex that allows digits, spaces, dashes, parentheses, and leading '+'
    const phoneRegex = /^[0-9+\s\-()]+$/;
    if (noTelepon && !phoneRegex.test(noTelepon)) {
      showToast("❌ Nomor telepon tidak valid (hanya boleh angka, spasi, tanda hubung, tanda kurung, atau '+').", "error");
      return;
    }
    if (noWhatsapp && !phoneRegex.test(noWhatsapp)) {
      showToast("❌ Nomor WhatsApp tidak valid (hanya boleh angka, spasi, tanda hubung, tanda kurung, atau '+').", "error");
      return;
    }
    if (username.length < 3) {
      showToast("❌ Username minimal 3 karakter.", "error");
      return;
    }

    if (accountId) {
      setIsSavingProfile(true);
      try {
        const updates: Partial<HospitalAccount> = {
          namaRs: tempName.trim(),
          alamatRs: alamatRs.trim(),
          provinsi: provinsi.trim(),
          kotaKab: kotaKab.trim(),
          kodePos: kodePos.trim(),
          emailRs: emailRs.trim(),
          noTelepon: noTelepon.trim(),
          noWhatsapp: noWhatsapp.trim(),
          username: username.trim(),
        };

        await updateHospitalProfile(accountId, updates);
        onUpdateRsName(tempName.trim());
        setIsEditing(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
        showToast("✅ Profil berhasil diperbarui.", "success");
      } catch (err: any) {
        showToast(`❌ Gagal memperbarui profil: ${err.message || err}`, "error");
      } finally {
        setIsSavingProfile(false);
      }
    } else {
      // Fallback if not connected to Supabase or no accountId
      onUpdateRsName(tempName.trim());
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
      showToast("✅ Profil lokal berhasil diperbarui.", "success");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast("❌ Masukkan password lama Anda.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("❌ Password baru minimal 8 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("❌ Konfirmasi password baru tidak cocok.", "error");
      return;
    }

    if (accountId) {
      setIsSavingProfile(true);
      try {
        // Verify old password client-side
        const isMatch = await bcrypt.compare(oldPassword, dbPassword);
        if (!isMatch) {
          showToast("❌ Password lama yang Anda masukkan salah.", "error");
          setIsSavingProfile(false);
          return;
        }

        const updates = {
          password: newPassword,
        };
        const updatedAcc = await updateHospitalProfile(accountId, updates);
        if (updatedAcc.password) {
          setDbPassword(updatedAcc.password);
        }
        
        // Reset fields
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
        showToast("✅ Password berhasil diperbarui.", "success");
      } catch (err: any) {
        showToast(`❌ Gagal memperbarui password: ${err.message || err}`, "error");
      } finally {
        setIsSavingProfile(false);
      }
    } else {
      showToast("❌ Tidak dapat memperbarui password dalam mode lokal.", "error");
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnResult(null);
    try {
      const res = await testSupabaseConnection();
      setConnResult(res);
    } catch (e: any) {
      setConnResult({ success: false, message: e.message || String(e), tableMissing: false });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSyncData = async () => {
    if (!confirm('Apakah Anda yakin ingin menyinkronkan data kuesioner dan akun lokal ke database Supabase? Tindakan ini akan mengunggah data yang belum tersimpan di cloud.')) {
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllLocalDataToSupabase();
      setSyncResult(res);
    } catch (e: any) {
      setSyncResult({
        success: false,
        message: e.message || String(e),
        surveysSynced: 0,
        accountsSynced: 0,
        wallpaperSynced: false
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- SCRIPT SQL SCHEMA UNTUK SUPABASE SQL EDITOR --
-- Jalankan kode ini di tab "SQL Editor" pada dashboard Supabase Anda --

-- 1. Tabel Kuesioner AHRQ
CREATE TABLE IF NOT EXISTS ahrq_surveys (
  id TEXT PRIMARY KEY,
  nama_rs TEXT,
  unit_kerja TEXT,
  jumlah_responden INTEGER,
  tanggal_input TEXT,
  dimensi_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE ahrq_surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik Seluruhnya" ON ahrq_surveys;
CREATE POLICY "Akses Publik Seluruhnya" ON ahrq_surveys FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabel Pengaturan Aplikasi (Wallpaper, Logo, Banner, dll)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique_idx ON app_settings (key);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik Seluruhnya" ON app_settings;
CREATE POLICY "Akses Publik Seluruhnya" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 2b. Bucket Penyimpanan Media (Logos, Wallpapers, Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('wallpapers', 'wallpapers', true),
  ('dashboard', 'dashboard', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Media" ON storage.objects;
CREATE POLICY "Public Access Media" ON storage.objects FOR ALL USING (bucket_id IN ('logos', 'wallpapers', 'dashboard')) WITH CHECK (bucket_id IN ('logos', 'wallpapers', 'dashboard'));

-- 3. Tabel Akun Fasyankes
CREATE TABLE IF NOT EXISTS hospital_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  kode_rs TEXT,
  nama_rs TEXT,
  alamat_rs TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE hospital_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik Seluruhnya" ON hospital_accounts;
CREATE POLICY "Akses Publik Seluruhnya" ON hospital_accounts FOR ALL USING (true) WITH CHECK (true);

-- 4. Set Up Storage Bucket untuk Unggah Wallpaper
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallpapers', 'wallpapers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Membaca Publik" ON storage.objects;
CREATE POLICY "Membaca Publik" ON storage.objects FOR SELECT USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Mengunggah Publik" ON storage.objects;
CREATE POLICY "Mengunggah Publik" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Memperbarui Publik" ON storage.objects;
CREATE POLICY "Memperbarui Publik" ON storage.objects FOR UPDATE USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Menghapus Publik" ON storage.objects;
CREATE POLICY "Menghapus Publik" ON storage.objects FOR DELETE USING (bucket_id = 'wallpapers');

-- 5. Set Up Storage Bucket untuk Unggah Logo AHRQ
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Membaca Publik Logo" ON storage.objects;
CREATE POLICY "Membaca Publik Logo" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Mengunggah Publik Logo" ON storage.objects;
CREATE POLICY "Mengunggah Publik Logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Memperbarui Publik Logo" ON storage.objects;
CREATE POLICY "Memperbarui Publik Logo" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Menghapus Publik Logo" ON storage.objects;
CREATE POLICY "Menghapus Publik Logo" ON storage.objects FOR DELETE USING (bucket_id = 'logos');

-- 6. Set Up Storage Bucket untuk Unggah Banner Header
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dashboard', 'dashboard', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Membaca Publik Banner" ON storage.objects;
CREATE POLICY "Membaca Publik Banner" ON storage.objects FOR SELECT USING (bucket_id = 'dashboard');

DROP POLICY IF EXISTS "Mengunggah Publik Banner" ON storage.objects;
CREATE POLICY "Mengunggah Publik Banner" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dashboard');

DROP POLICY IF EXISTS "Memperbarui Publik Banner" ON storage.objects;
CREATE POLICY "Memperbarui Publik Banner" ON storage.objects FOR UPDATE USING (bucket_id = 'dashboard');

DROP POLICY IF EXISTS "Menghapus Publik Banner" ON storage.objects;
CREATE POLICY "Menghapus Publik Banner" ON storage.objects FOR DELETE USING (bucket_id = 'dashboard');`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');

    if (!isImage && !isVideo) {
      setUploadError('Format berkas tidak didukung. Harap unggah gambar (PNG, JPG, JPEG) atau video.');
      return;
    }

    if (isVideo && file.size > 15 * 1024 * 1024) {
      setUploadError('Ukuran video terlalu besar. Batas maksimal unggah video adalah 15MB.');
      return;
    }

    if (isImage && file.size > 15 * 1024 * 1024) {
      setUploadError('Ukuran gambar terlalu besar. Batas maksimal adalah 15MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const fileType = isVideo ? 'video' : 'image';
        
        try {
          const savedWp = await saveWallpaper(base64Data, fileType, file.name);
          onUpdateWallpaper(savedWp);
          showToast('✅ Wallpaper berhasil disimpan dan disinkronkan', 'success');
        } catch (err: any) {
          console.error("Gagal menyimpan berkas:", err);
          setUploadError(err?.message || 'Gagal menyimpan wallpaper ke sistem. Silakan coba lagi.');
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setUploadError('Gagal membaca berkas.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadError('Terjadi kesalahan saat memproses berkas.');
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallpaperUrlInput.trim()) return;

    if (wallpaperUrlInput.trim().match(/\.(mp4|webm)$/i)) {
      setUploadError('Tautan URL tidak boleh berupa video. Harap unggah video melalui tab "Unggah Berkas" dengan maksimal 15MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const savedWp = await saveWallpaper(wallpaperUrlInput.trim(), 'image', 'url_wallpaper');
      onUpdateWallpaper(savedWp);
      setWallpaperUrlInput('');
      showToast('✅ URL Wallpaper berhasil disimpan dan diterapkan', 'success');
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || 'Gagal menyimpan URL wallpaper.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearWallpaper = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus wallpaper kustom dan kembali ke latar belakang bawaan?')) {
      setIsUploading(true);
      try {
        await clearWallpaper();
        onUpdateWallpaper(null);
        showToast('✅ Wallpaper kustom berhasil dihapus', 'success');
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Logo handlers
  const handleLogoDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsLogoDragging(true);
  };

  const handleLogoDragLeave = () => {
    setIsLogoDragging(false);
  };

  const processLogoFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      setLogoUploadError('Format berkas tidak didukung. Harap unggah gambar (PNG, JPG, JPEG, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Ukuran gambar terlalu besar. Batas maksimal adalah 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        try {
          const savedLogo = await saveLogo(base64Data, file.name);
          onUpdateLogo(savedLogo);
          showToast('✅ Logo berhasil disimpan dan disinkronkan', 'success');
        } catch (err: any) {
          console.error("Gagal menyimpan logo:", err);
          setLogoUploadError(err?.message || 'Gagal menyimpan logo ke sistem. Silakan coba lagi.');
        } finally {
          setIsUploadingLogo(false);
        }
      };

      reader.onerror = () => {
        setLogoUploadError('Gagal membaca berkas.');
        setIsUploadingLogo(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setLogoUploadError('Terjadi kesalahan saat memproses berkas.');
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsLogoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processLogoFile(file);
    }
  };

  const handleLogoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processLogoFile(file);
    }
  };

  const handleLogoUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoUrlInput.trim()) return;

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const savedLogo = await saveLogo(logoUrlInput.trim(), 'url_logo');
      onUpdateLogo(savedLogo);
      setLogoUrlInput('');
      showToast('✅ URL Logo berhasil disimpan dan diterapkan', 'success');
    } catch (err: any) {
      console.error(err);
      setLogoUploadError(err?.message || 'Gagal menyimpan URL logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleClearLogo = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus logo kustom dan kembali menggunakan lambang bawaan?')) {
      setIsUploadingLogo(true);
      try {
        await clearLogo();
        onUpdateLogo(null);
        showToast('✅ Logo kustom berhasil dihapus', 'success');
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const handleHeaderFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setHeaderUploadError('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setHeaderUploadError('Format file tidak didukung. Harap unggah berkas berformat JPG, JPEG, PNG, atau WEBP.');
      return;
    }
    setHeaderUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setHeaderImageInput(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHeaderImage = async () => {
    if (role !== 'admin') {
      showToast('🚫 Akses Ditolak: Hanya Admin Utama yang dapat mengkonfigurasi Gambar Card Header.', 'error');
      return;
    }
    if (!headerImageInput) return;
    setIsUploadingHeader(true);
    setHeaderUploadError(null);
    try {
      const saved = await saveHeaderImage(headerImageInput, headerImagePosition, 'header_banner.png');
      onUpdateHeaderImage?.(saved);
      showToast('✅ Gambar Card Header berhasil diperbarui', 'success');
    } catch (err: any) {
      console.error('Gagal menyimpan gambar header:', err);
      setHeaderUploadError(err?.message || 'Gagal menyimpan gambar header.');
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const handleClearHeaderImage = async () => {
    if (role !== 'admin') return;
    if (confirm('Apakah Anda yakin ingin menghapus gambar Card Header Dashboard dan kembali menggunakan tampilan awal?')) {
      setIsUploadingHeader(true);
      try {
        await clearHeaderImage();
        onUpdateHeaderImage?.(null);
        setHeaderImageInput(null);
        setHeaderUploadError(null);
        showToast('✅ Gambar Card Header berhasil dihapus', 'success');
      } catch (err: any) {
        console.error('Gagal menghapus gambar header:', err);
      } finally {
        setIsUploadingHeader(false);
      }
    }
  };

  const handleCancelHeaderChanges = () => {
    if (activeHeaderImage) {
      setHeaderImageInput(activeHeaderImage.url);
      setHeaderImagePosition(activeHeaderImage.position || 'center-right');
    } else {
      setHeaderImageInput(null);
      setHeaderImagePosition('center-right');
    }
    setHeaderUploadError(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/85 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-lg shadow-blue-500/5">
        <div>
          <h2 className="text-[18px] md:text-[20px] font-semibold flex items-center gap-2 text-slate-800">
            <Settings className="w-5 h-5 text-indigo-600" /> Pengaturan Sistem
          </h2>
          <p className="text-[14px] text-slate-500 mt-1">Kelola profil fasyankes dan pengaturan sistem untuk mendukung pengelolaan Survei Budaya Keselamatan Pasien yang terintegrasi, aman, dan profesional</p>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-xs font-semibold rounded-xl flex items-center gap-2 animate-pulse">
          <Save className="w-4 h-4" /> Pengaturan profil fasyankes berhasil diperbarui!
        </div>
      )}

        {/* Toast notification component */}
        {toast.show && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border text-xs flex items-center gap-2 shadow-2xl transition-all transform-gpu duration-300 animate-fadeIn ${
            toast.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-600'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">{toast.message}</span>
          </div>
        )}

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSettingsSection('profil')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
            activeSettingsSection === 'profil'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
              : 'text-slate-500 border-transparent hover:text-slate-850 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Profil & Setelan</span>
        </button>
        <button
          onClick={() => setActiveSettingsSection('posisi')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
            activeSettingsSection === 'posisi'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
              : 'text-slate-500 border-transparent hover:text-slate-850 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Master Posisi Staf</span>
        </button>
        <button
          onClick={() => setActiveSettingsSection('unit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
            activeSettingsSection === 'unit'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
              : 'text-slate-500 border-transparent hover:text-slate-850 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Master Unit Kerja</span>
        </button>
        <button
          onClick={() => setActiveSettingsSection('pengesahan')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
            activeSettingsSection === 'pengesahan'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
              : 'text-slate-500 border-transparent hover:text-slate-850 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>Pengaturan Halaman Pengesahan</span>
        </button>
        {role === 'admin' && (
          <button
            onClick={() => setActiveSettingsSection('backup')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
              activeSettingsSection === 'backup'
                ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
                : 'text-slate-500 border-transparent hover:text-slate-850 hover:bg-slate-100'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Cadangan & Google Drive</span>
          </button>
        )}
      </div>

      {activeSettingsSection === 'profil' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identitas Rumah Sakit */}
        <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" /> Profil Fasyankes
            </h3>
            
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setShowChangePassword(false);
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all transform-gpu cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Perbarui Profil
              </button>
            )}
          </div>

          {isFetchingProfile ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500">Memuat profil fasyankes...</p>
            </div>
          ) : !isEditing ? (
            /* ================= READ ONLY MODE ================= */
            <div className="space-y-6">
              {/* Bagian 1: Informasi Fasyankes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">Informasi Rumah Sakit</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-[11px] text-slate-500">Nama Rumah Sakit / Instansi</span>
                    <p className="text-sm font-semibold text-slate-800">{tempName || '-'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium">Alamat Lengkap</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{alamatRs || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Provinsi</span>
                    <p className="text-xs font-medium text-slate-700">{provinsi || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Kota / Kabupaten</span>
                    <p className="text-xs font-medium text-slate-700">{kotaKab || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Kode Pos</span>
                    <p className="text-xs font-mono text-slate-700">{kodePos || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Informasi Kontak */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-600 tracking-wider uppercase">Informasi Kontak</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3 text-emerald-600" /> Email</span>
                    <p className="text-xs font-medium text-slate-700">{emailRs || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-600" /> No. Telepon</span>
                    <p className="text-xs font-medium text-slate-700">{noTelepon || '-'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-600" /> No. WhatsApp</span>
                    <p className="text-xs font-medium text-slate-700">{noWhatsapp || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Informasi Kredensial Akun */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-600 tracking-wider uppercase">Kredensial Akun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1"><User className="w-3 h-3 text-cyan-600" /> Username</span>
                    <p className="text-xs font-semibold text-slate-700 font-mono">{username || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3 text-cyan-600" /> Password</span>
                    <p className="text-xs text-slate-500 tracking-widest font-bold">••••••••</p>
                  </div>
                </div>
              </div>

              {/* Ubah Password Trigger Button */}
              {accountId && !showChangePassword && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(true)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all transform-gpu cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-cyan-650" /> Ubah Password Akun
                  </button>
                </div>
              )}

              {/* Ubah Password Form */}
              {showChangePassword && (
                <form onSubmit={handleUpdatePassword} className="border border-cyan-200 bg-cyan-50/50 p-4 rounded-xl space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h5 className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Formulir Ubah Password
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-medium">Password Lama</label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          required
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-cyan-500 transition-all transform-gpu outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-medium">Password Baru (Min. 8 Karakter)</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-cyan-500 transition-all transform-gpu outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 font-medium">Konfirmasi Password Baru</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-cyan-500 transition-all transform-gpu outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          setOldPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all transform-gpu cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all transform-gpu cursor-pointer"
                      >
                        {isSavingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Simpan Password
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ================= EDIT MODE ================= */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-indigo-600 tracking-wider uppercase border-b border-slate-200 pb-1">Ubah Informasi Rumah Sakit</h4>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Nama Rumah Sakit / Instansi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="Contoh: RSUD AL-MULK"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Alamat Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={alamatRs}
                    onChange={e => setAlamatRs(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="Jl. Merdeka No. 10..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-600 font-semibold">Provinsi</label>
                    <input
                      type="text"
                      value={provinsi}
                      onChange={e => setProvinsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                      placeholder="Contoh: Jawa Barat"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-600 font-semibold">Kota / Kabupaten</label>
                    <input
                      type="text"
                      value={kotaKab}
                      onChange={e => setKotaKab(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                      placeholder="Contoh: Bandung"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold">Kode Pos</label>
                  <input
                    type="text"
                    value={kodePos}
                    onChange={e => setKodePos(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="Contoh: 40123"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-emerald-600 tracking-wider uppercase border-b border-slate-200 pb-1">Ubah Informasi Kontak</h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailRs}
                    onChange={e => setEmailRs(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="email@rumahsakit.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={noTelepon}
                    onChange={e => setNoTelepon(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="Contoh: 021123456"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Nomor WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={noWhatsapp}
                    onChange={e => setNoWhatsapp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none"
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-cyan-600 tracking-wider uppercase border-b border-slate-200 pb-1">Ubah Kredensial Akun</h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-600" /> Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={role === 'rs'}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {role === 'rs' && <p className="text-[10px] text-slate-500">Username akun portal rumah sakit hanya dapat diubah oleh Admin Utama.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to database state
                    if (identifier) {
                      const resetFetch = async () => {
                        const account = await getHospitalAccountByUsername(identifier);
                        if (account) {
                          setTempName(account.namaRs || '');
                          setAlamatRs(account.alamatRs || '');
                          setProvinsi(account.provinsi || '');
                          setKotaKab(account.kotaKab || '');
                          setKodePos(account.kodePos || '');
                          setEmailRs(account.emailRs || '');
                          setNoTelepon(account.noTelepon || '');
                          setNoWhatsapp(account.noWhatsapp || '');
                          setUsername(account.username || '');
                        }
                      };
                      resetFetch();
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all transform-gpu cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all transform-gpu cursor-pointer"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                  {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Wallpaper Konfigurasi */}
        {role === 'admin' && (
          <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-600" /> Wallpaper Latar Belakang
              </h3>
            <p className="text-[12px] text-slate-500 mt-1">Ubah latar belakang halaman utama, login, dan landing page.</p>
          </div>

          {/* Sub-tab Selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveSubTab('upload')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all transform-gpu ${
                activeSubTab === 'upload' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unggah Berkas
            </button>
            <button
              onClick={() => setActiveSubTab('url')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all transform-gpu ${
                activeSubTab === 'url' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gunakan Tautan/URL
            </button>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {activeSubTab === 'upload' ? (
            /* Upload File Tab */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all transform-gpu flex flex-col items-center justify-center min-h-[160px] ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, video/mp4, video/webm"
                className="hidden"
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-600 font-medium">Sedang memproses dan menyinkronkan ke Supabase...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-100">
                    <UploadCloud className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700">
                    Tarik & Letakkan berkas di sini, atau <span className="text-indigo-600 underline">pilih berkas</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Mendukung gambar kustom (PNG, JPG, JPEG) hingga maks. 15MB atau video (MP4/WebM) hingga maks. 15MB.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Paste URL Tab */
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Tautan / URL Gambar Latar Belakang</label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://contoh.com/wallpaper.jpg"
                    value={wallpaperUrlInput}
                    onChange={e => setWallpaperUrlInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none text-slate-700 font-mono text-xs"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Masukkan tautan URL langsung ke gambar (PNG/JPG). Video latar belakang tidak lagi menggunakan tautan URL dan wajib diunggah secara langsung pada tab &quot;Unggah Berkas&quot; dengan batasan maksimal 15MB.
                </p>
              </div>
 
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading || !wallpaperUrlInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all transform-gpu cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Terapkan Tautan
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Active Wallpaper Preview & Management */}
          {activeWallpaper && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  {activeWallpaper.type === 'video' ? (
                    <>
                      <VideoIcon className="w-3.5 h-3.5 text-cyan-600" /> Video Aktif
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Gambar Aktif
                    </>
                  )}
                </span>
                <button
                  onClick={handleClearWallpaper}
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-500 transition-all transform-gpu text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Wallpaper
                </button>
              </div>

              {/* Live Thumbnail Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                {activeWallpaper.type === 'video' ? (
                  <video
                    src={activeWallpaper.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeWallpaper.url}
                    alt="Wallpaper preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 text-[9px] font-mono text-slate-200 max-w-[200px] truncate">
                  {activeWallpaper.url}
                </div>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[10.5px] text-slate-500 flex gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <p>
              Wallpaper kustom secara otomatis disinkronkan ke tabel <code className="text-indigo-600 font-mono font-bold">app_settings</code> dan media berkas disimpan ke dalam bucket <code className="text-indigo-600 font-mono font-bold">wallpapers</code> di Supabase Anda, serta disimpan di peramban secara otomatis sebagai cadangan instan.
            </p>
          </div>
        </div>
        )}

        {/* Logo AHRQ Konfigurasi */}
        {role === 'admin' && (
        <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-cyan-600 animate-pulse" /> Logo Instansi / AHRQ
            </h3>
            <p className="text-[12px] text-slate-500 mt-1">Ubah logo lambang instansi yang tampil di Side Bar dan Hero Section halaman utama.</p>
          </div>

          {/* Sub-tab Selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveLogoSubTab('upload')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all transform-gpu ${
                activeLogoSubTab === 'upload' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unggah Berkas
            </button>
            <button
              onClick={() => setActiveLogoSubTab('url')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all transform-gpu ${
                activeLogoSubTab === 'url' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gunakan Tautan/URL
            </button>
          </div>

          {logoUploadError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{logoUploadError}</span>
            </div>
          )}

          {activeLogoSubTab === 'upload' ? (
            /* Upload File Tab */
            <div
              onDragOver={handleLogoDragOver}
              onDragLeave={handleLogoDragLeave}
              onDrop={handleLogoDrop}
              onClick={() => logoFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all transform-gpu flex flex-col items-center justify-center min-h-[160px] ${
                isLogoDragging 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                ref={logoFileInputRef}
                onChange={handleLogoFileChange}
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                className="hidden"
              />
              
              {isUploadingLogo ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-600 font-medium">Sedang memproses dan menyinkronkan ke Supabase...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-100">
                    <UploadCloud className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700">
                    Tarik & Letakkan logo di sini, atau <span className="text-indigo-600 underline">pilih berkas</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Mendukung format gambar (PNG, JPG, JPEG, SVG) hingga maks. 5MB.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Paste URL Tab */
            <form onSubmit={handleLogoUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Tautan / URL Logo Baru</label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://contoh.com/logo.png"
                    value={logoUrlInput}
                    onChange={e => setLogoUrlInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all transform-gpu outline-none text-slate-700 font-mono text-xs"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Masukkan tautan URL langsung ke gambar logo instansi Anda (PNG/JPG/SVG).
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploadingLogo || !logoUrlInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all transform-gpu cursor-pointer"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Terapkan Tautan
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Active Logo Preview & Management */}
          {activeLogo && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Logo Aktif
                </span>
                <button
                  onClick={handleClearLogo}
                  disabled={isUploadingLogo}
                  className="text-red-600 hover:text-red-500 transition-all transform-gpu text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Logo
                </button>
              </div>

              {/* Live Thumbnail Preview */}
              <div className="relative p-4 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center min-h-[100px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeLogo.url}
                  alt="Logo preview"
                  className="max-h-[80px] w-auto object-contain"
                />
                <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 text-[9px] font-mono text-slate-200 max-w-[200px] truncate">
                  {activeLogo.url}
                </div>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[10.5px] text-slate-500 flex gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <p>
              Logo kustom secara otomatis disinkronkan ke tabel <code className="text-indigo-600 font-mono font-bold">app_settings</code> dan media berkas disimpan ke dalam bucket <code className="text-indigo-600 font-mono font-bold">logos</code> di Supabase Anda, serta disimpan di peramban secara otomatis sebagai cadangan instan.
            </p>
          </div>
        </div>
        )}

        {/* Banner / Gambar Card Header Dashboard Konfigurasi */}
        {role === 'admin' && (
        <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>Banner / Gambar Card Header Dashboard</span>
              </h3>
              <p className="text-[12px] text-slate-500 mt-1">
                Atur gambar visual khusus pada sisi kanan Card Header Dashboard utama untuk tampilan modern, elegan, dan profesional.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeHeaderImage && (
                <button
                  type="button"
                  onClick={handleClearHeaderImage}
                  disabled={isUploadingHeader}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Gambar
                </button>
              )}
            </div>
          </div>

          {headerUploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{headerUploadError}</span>
            </div>
          )}

          {/* Section A: Upload Controls & Position Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Box */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih / Unggah Berkas Gambar Banner
              </label>
              
              <input
                type="file"
                ref={headerFileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHeaderFileSelect(file);
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsHeaderImageDragOver(true);
                }}
                onDragLeave={() => setIsHeaderImageDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsHeaderImageDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleHeaderFileSelect(file);
                }}
                onClick={() => headerFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                  isHeaderImageDragOver
                    ? 'border-teal-500 bg-teal-50/50 scale-[1.01]'
                    : 'border-slate-200 hover:border-teal-500/60 bg-slate-50/50 hover:bg-teal-50/20'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-600">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {headerImageInput ? 'Ganti Gambar Card Header' : 'Unggah Gambar Card Header'}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Klik atau geser file ke sini. Format yang diperbolehkan: <strong className="text-slate-700">JPG, JPEG, PNG, WEBP</strong> (Maks. 5MB).
                  </p>
                  <p className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/50">
                    Rekomendasi Rasio Landscape: 16:9 atau 3:1
                  </p>
                </div>
              </div>
            </div>

            {/* Image Position Adjuster */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Sesuaikan Posisi Gambar Header
                </label>
                <p className="text-[11px] text-slate-500">
                  Tentukan titik fokus penyesuaian cropping gambar agar selalu tampil proporsional pada Card Header.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'center-right', label: 'Center Right (Default)' },
                  { id: 'center', label: 'Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-right', label: 'Bottom Right' }
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setHeaderImagePosition(pos.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      headerImagePosition === pos.id
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{pos.label}</span>
                    {headerImagePosition === pos.id && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section B: Live Card Header Preview */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Preview Card Header Dashboard</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Tampilan Langsung di Dashboard</span>
            </div>

            {/* Mini Card Header Simulation */}
            <div className="p-4 sm:p-6 rounded-[20px] bg-white/80 backdrop-blur-md border border-slate-200 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-[#5CC8C9]">Selamat Siang ☀️</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-extrabold text-[#2FA7A7]">
                  Hai, Sobat <span className="text-[#2FA7A7]">{namaRs || 'RS Sehat Abadi'}</span>
                </h4>
                <p className="text-xs sm:text-sm font-bold text-[#1E6F73] font-['Poppins',sans-serif]">
                  Selamat Datang di Aplikasi Sistem Survei Budaya Keselamatan Pasien
                </p>
              </div>

              <div className="w-full md:w-60 lg:w-72 shrink-0 relative self-stretch flex items-center">
                {headerImageInput ? (
                  <div className="relative w-full h-28 sm:h-32 overflow-hidden rounded-xl">
                    <div 
                      className="w-full h-full relative"
                      style={{
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 12%, rgba(0,0,0,0.9) 35%, black 100%)',
                        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 12%, rgba(0,0,0,0.9) 35%, black 100%)'
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={headerImageInput}
                        alt="Header preview"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: headerImagePosition === 'center'
                            ? 'center center'
                            : headerImagePosition === 'top-right'
                            ? 'right top'
                            : headerImagePosition === 'bottom-right'
                            ? 'right bottom'
                            : 'right center'
                        }}
                      />
                    </div>
                    {/* Soft Feather Overlays */}
                    <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/60 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-full h-28 sm:h-32 rounded-[16px] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-3 text-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[11px] font-semibold">Desain Bawaan (Tanpa Gambar)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelHeaderChanges}
              disabled={isUploadingHeader}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSaveHeaderImage}
              disabled={isUploadingHeader || !headerImageInput}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
            >
              {isUploadingHeader ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Gambar</span>
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Benchmark Konfigurasi */}
      {role === 'admin' && (
        <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Kelola Master Benchmark
              </h3>
              <p className="text-[12px] text-slate-500 mt-1">Atur nilai referensi rata-rata rumah sakit uji coba untuk setiap dimensi. Nilai ini akan tampil pada Grafik Capaian Dimensi.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveBenchmark}
              disabled={isSavingBenchmark}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all transform-gpu shadow-md shrink-0 cursor-pointer"
            >
              {isSavingBenchmark ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {isSavingBenchmark ? 'Menyimpan...' : 'Simpan Benchmark'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 w-8 text-center">No</th>
                  <th className="p-3">Dimensi Budaya Keselamatan Pasien</th>
                  <th className="p-3 w-28 text-center text-emerald-600">Min (%)</th>
                  <th className="p-3 w-28 text-center text-cyan-650">Max (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {Object.keys(DIMENSI_INFO).map((k, i) => (
                  <tr key={k} className="hover:bg-slate-100/50 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold">{i + 1}</td>
                    <td className="p-3 font-medium text-slate-800">{DIMENSI_INFO[k].nama}</td>
                    <td className="p-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={benchmarks[k]?.min ?? ''}
                          onChange={e => handleBenchmarkChange(k, 'min', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-emerald-600 font-mono focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={benchmarks[k]?.max ?? ''}
                          onChange={e => handleBenchmarkChange(k, 'max', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-cyan-600 font-mono focus:border-cyan-500 outline-none transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Benchmark Interaksi Konfigurasi */}
      {role === 'admin' && (
        <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Master Benchmark Bawaan (Interaksi)
              </h3>
              <p className="text-[12px] text-slate-500 mt-1">Atur nilai persentase rata-rata rumah sakit uji coba untuk perbandingan interaksi dengan pasien.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveBenchmarkInteraksi}
              disabled={isSavingBenchmarkInteraksi}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all transform-gpu shadow-md shrink-0 cursor-pointer"
            >
              {isSavingBenchmarkInteraksi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {isSavingBenchmarkInteraksi ? 'Menyimpan...' : 'Simpan Benchmark'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 w-8 text-center">No</th>
                  <th className="p-3">Dimensi Budaya Keselamatan Pasien</th>
                  <th className="p-3 w-32 text-center text-emerald-600">Berhubungan Langsung (%)</th>
                  <th className="p-3 w-32 text-center text-cyan-650">Tidak Berhubungan (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {benchmarkInteraksi.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold">{i + 1}</td>
                    <td className="p-3 font-medium text-slate-800">{DIMENSI_INFO[item.dimensi].nama}</td>
                    <td className="p-3">
                      <input
                        type="number" step="0.01"
                        value={item.dengan_pasien === 0 ? '' : item.dengan_pasien}
                        onChange={e => handleBenchmarkInteraksiChange(item.dimensi, 'dengan_pasien', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-emerald-600 font-mono focus:border-emerald-500 outline-none transition-colors"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number" step="0.01"
                        value={item.tanpa_pasien === 0 ? '' : item.tanpa_pasien}
                        onChange={e => handleBenchmarkInteraksiChange(item.dimensi, 'tanpa_pasien', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-cyan-600 font-mono focus:border-cyan-500 outline-none transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supabase Database Integration Settings */}
      {role === 'admin' && (
      <div className="bg-white backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
        <div>
          <h3 className="text-[16px] font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" /> Integrasi Database Supabase Cloud
          </h3>
          <p className="text-[12px] text-slate-500 mt-1">
            Gunakan database cloud Supabase untuk mengaktifkan sinkronisasi real-time instan dan penyimpanan permanen bagi seluruh unit kerja fasyankes Anda.
          </p>
        </div>

        {/* Database Connection Status Block */}
        <div className={`p-5 rounded-2xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          hasSupabase 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-start gap-3">
            {hasSupabase ? (
              <Wifi className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <WifiOff className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="font-bold text-sm">
                Status: {hasSupabase ? 'Koneksi Cloud Aktif' : 'Berjalan Secara Lokal (Luring)'}
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed max-w-xl">
                {hasSupabase 
                  ? 'Aplikasi terhubung dengan aman ke database cloud Supabase melalui variabel lingkungan sistem. Seluruh data kuesioner, akun RS, dan wallpaper akan disinkronkan secara otomatis.' 
                  : 'Aplikasi saat ini menyimpan semua data secara lokal pada peramban web Anda. Untuk mengaktifkan sinkronisasi database cloud otomatis, atur variabel lingkungan NEXT_PUBLIC_SUPABASE_URL AND NEXT_PUBLIC_SUPABASE_ANON_KEY di server.'
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConn}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 transition-all transform-gpu cursor-pointer"
            >
              {isTestingConn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> Menguji...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Uji Koneksi Database
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing || !hasSupabase}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/15 transition-all transform-gpu cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyinkronkan...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" /> Sinkronkan Data ke Cloud
                </>
              )}
            </button>
          </div>
        </div>

        {/* Connection results feedback */}
        {connResult && (
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-fadeIn ${
            connResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-750'
          }`}>
            {connResult.success ? <Wifi className="w-4 h-4 shrink-0 mt-0.5" /> : <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />}
            <div className="space-y-1">
              <span className="font-bold">{connResult.success ? 'Koneksi Berhasil' : 'Koneksi Gagal'}</span>
              <p className="opacity-95 leading-relaxed">{connResult.message}</p>
              {connResult.tableMissing && (
                <button
                  type="button"
                  onClick={() => setShowSqlSchema(true)}
                  className="mt-2 text-[10px] font-bold underline text-indigo-600 hover:text-indigo-800 block text-left cursor-pointer"
                >
                  Tampilkan Script Pembuatan Tabel (SQL Schema)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sync results feedback */}
        {syncResult && (
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-fadeIn ${
            syncResult.success 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">{syncResult.success ? 'Sinkronisasi Selesai' : 'Peringatan Sinkronisasi'}</span>
              <p className="opacity-95 leading-relaxed">{syncResult.message}</p>
              <div className="flex gap-4 pt-1 text-[11px] font-semibold text-slate-700">
                <span>📊 Survei Disalin: <strong className="text-emerald-600 font-mono">{syncResult.surveysSynced}</strong></span>
                <span>🔐 Akun RS Disalin: <strong className="text-emerald-600 font-mono">{syncResult.accountsSynced}</strong></span>
                <span>🖼️ Wallpaper: <strong className="text-emerald-600 font-mono">{syncResult.wallpaperSynced ? 'Disinkronkan' : 'Sesuai'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* SQL Schema collapsible section */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <button
            type="button"
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700 transition-all transform-gpu outline-none cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-600" />
              Tampilkan Script SQL Schema Pembuatan Tabel (Supabase)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {showSqlSchema ? '[Sembunyikan]' : '[Buka/Salin]'}
            </span>
          </button>

          {showSqlSchema && (
            <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50 text-[11px] text-slate-600">
              <p className="text-slate-500 leading-relaxed">
                Salin kode di bawah ini, buka panel <strong>SQL Editor</strong> di dashboard Supabase Anda, buat kueri baru (<strong>New Query</strong>), tempel kodenya, dan klik <strong>Run</strong>. Ini akan secara otomatis membuat seluruh tabel, mengaktifkan keamanan baris (RLS), dan membuat bucket penyimpanan wallpaper kustom.
              </p>

              <div className="relative">
                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono overflow-x-auto text-slate-200 max-h-64 ">
                  {`-- SCRIPT SQL SCHEMA UNTUK SUPABASE SQL EDITOR --
-- Jalankan kode ini di tab "SQL Editor" pada dashboard Supabase Anda --
 
-- 1. Tabel Kuesioner AHRQ
CREATE TABLE IF NOT EXISTS ahrq_surveys (
  id TEXT PRIMARY KEY,
  nama_rs TEXT,
  unit_kerja TEXT,
  jumlah_responden INTEGER,
  tanggal_input TEXT,
  dimensi_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE ahrq_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Seluruhnya" ON ahrq_surveys FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabel Pengaturan Aplikasi (Wallpaper, Logo, Banner, dll)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique_idx ON app_settings (key);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik Seluruhnya" ON app_settings;
CREATE POLICY "Akses Publik Seluruhnya" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 2b. Bucket Penyimpanan Media (Logos, Wallpapers, Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('wallpapers', 'wallpapers', true),
  ('dashboard', 'dashboard', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Media" ON storage.objects;
CREATE POLICY "Public Access Media" ON storage.objects FOR ALL USING (bucket_id IN ('logos', 'wallpapers', 'dashboard')) WITH CHECK (bucket_id IN ('logos', 'wallpapers', 'dashboard'));

-- 3. Tabel Akun Fasyankes
CREATE TABLE IF NOT EXISTS hospital_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  kode_rs TEXT,
  nama_rs TEXT,
  alamat_rs TEXT,
  password TEXT,
  provinsi TEXT,
  kota_kab TEXT,
  penanggung_jawab TEXT,
  jabatan TEXT,
  no_whatsapp TEXT,
  email_rs TEXT,
  status TEXT DEFAULT 'Pending',
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  rejection_reason TEXT,
  kode_pos TEXT,
  no_telepon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE hospital_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Seluruhnya" ON hospital_accounts FOR ALL USING (true) WITH CHECK (true);

-- 4. Set Up Storage Bucket untuk Unggah Wallpaper
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallpapers', 'wallpapers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Membaca Publik" ON storage.objects;
CREATE POLICY "Membaca Publik" ON storage.objects FOR SELECT USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Mengunggah Publik" ON storage.objects;
CREATE POLICY "Mengunggah Publik" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Memperbarui Publik" ON storage.objects;
CREATE POLICY "Memperbarui Publik" ON storage.objects FOR UPDATE USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Menghapus Publik" ON storage.objects;
CREATE POLICY "Menghapus Publik" ON storage.objects FOR DELETE USING (bucket_id = 'wallpapers');

-- 5. Set Up Storage Bucket untuk Unggah Logo AHRQ
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Membaca Publik Logo" ON storage.objects;
CREATE POLICY "Membaca Publik Logo" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Mengunggah Publik Logo" ON storage.objects;
CREATE POLICY "Mengunggah Publik Logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Memperbarui Publik Logo" ON storage.objects;
CREATE POLICY "Memperbarui Publik Logo" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Menghapus Publik Logo" ON storage.objects;
CREATE POLICY "Menghapus Publik Logo" ON storage.objects FOR DELETE USING (bucket_id = 'logos');`}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-850 flex items-center gap-1 transition-all transform-gpu cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-400" />}
                  {copiedSql ? 'Disalin!' : 'Salin SQL'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
        </>
      )}

      {activeSettingsSection === 'posisi' && (
        <MasterPosisiTab rsName={namaRs} surveys={surveys} />
      )}

      {activeSettingsSection === 'unit' && (
        <MasterUnitTab rsName={namaRs} surveys={surveys} />
      )}

      {activeSettingsSection === 'pengesahan' && (
        <form onSubmit={handleSavePengesahan} className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-[#14B8A6] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-600/50 border border-teal-400/30 text-xs font-semibold backdrop-blur-md">
                <FileCheck className="w-3.5 h-3.5 text-teal-200" /> Form Lembar Pengesahan Laporan Resmi
              </div>
              <h2 className="text-xl font-black tracking-tight">Pengaturan Halaman Pengesahan</h2>
              <p className="text-xs text-teal-100/80 max-w-2xl leading-relaxed">
                Kelola data Rumah Sakit, kota, tanggal pengesahan, identitas Direktur, dan Penanggung Jawab Survei. Perubahan data ini tersimpan khusus untuk Halaman Pengesahan dan Cover Laporan Resmi di menu Laporan Survei. Data ini tidak terintegrasi menjadi input responden serta tidak muncul di Dashboard maupun Analisa Data.
              </p>
            </div>
          </div>

          {isFetchingPengesahan ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Memuat data halaman pengesahan...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* CARD 1: DATA RUMAH SAKIT */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-5 lg:col-span-1">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600" /> Data Rumah Sakit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md">1 dari 3</span>
                </div>

                {/* Nama Rumah Sakit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Nama Rumah Sakit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.namaRs}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, namaRs: e.target.value }))}
                    placeholder="Contoh: RSUD Al-Mulk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-teal-500 transition-all outline-none"
                  />
                </div>

                {/* Kota */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" /> Kota Pengesahan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.kota}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, kota: e.target.value }))}
                    placeholder="Contoh: Sukabumi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-teal-500 transition-all outline-none"
                  />
                </div>

                {/* Tanggal Pengesahan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" /> Tanggal Pengesahan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.tanggalPengesahan}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, tanggalPengesahan: e.target.value }))}
                    placeholder="Contoh: 28 Juli 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-teal-500 transition-all outline-none"
                  />
                </div>
              </div>

              {/* CARD 2: DIREKTUR RUMAH SAKIT */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-5 lg:col-span-1">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" /> Direktur Rumah Sakit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">2 dari 3</span>
                </div>

                {/* Nama Direktur */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Nama Direktur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.direkturNama}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, direkturNama: e.target.value }))}
                    placeholder="Contoh: dr. H. Ahmad Wijaya"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  />
                </div>

                {/* Gelar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Gelar Akademik / Profesi
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </div>
                  <input
                    type="text"
                    value={pengesahanForm.direkturGelar || ''}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, direkturGelar: e.target.value }))}
                    placeholder="Kosongkan jika tidak ada (Contoh: MARS / Sp.A)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  />
                </div>

                {/* Jabatan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Jabatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.direkturJabatan}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, direkturJabatan: e.target.value }))}
                    placeholder="Contoh: Direktur Utama Rumah Sakit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  />
                </div>

                {/* NIP / ID Direktur */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Nomor Identitas <span className="text-rose-500">*</span>
                    </label>
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPengesahanForm(prev => ({ ...prev, direkturNipType: 'NIP' }))}
                        className={`px-2.5 py-1 rounded-md transition-all ${(pengesahanForm.direkturNipType || 'NIP') === 'NIP' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        NIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setPengesahanForm(prev => ({ ...prev, direkturNipType: 'ID' }))}
                        className={`px-2.5 py-1 rounded-md transition-all ${pengesahanForm.direkturNipType === 'ID' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        ID Pegawai
                      </button>
                    </div>
                  </div>
                  <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <div className="px-3 py-2.5 bg-slate-100/90 border-r border-slate-200 text-xs font-bold text-indigo-700 shrink-0 select-none flex items-center">
                      {(pengesahanForm.direkturNipType || 'NIP') === 'ID' ? 'ID :' : 'NIP :'}
                    </div>
                    <input
                      type="text"
                      required
                      value={pengesahanForm.direkturNip}
                      onChange={(e) => setPengesahanForm(prev => ({ ...prev, direkturNip: e.target.value }))}
                      placeholder={(pengesahanForm.direkturNipType || 'NIP') === 'ID' ? "Contoh: D00237 / PEG-104" : "Contoh: 19801109 200312 1 002"}
                      className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-800 font-mono transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: PENANGGUNG JAWAB SURVEI */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-5 lg:col-span-1">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Penanggung Jawab Survei
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">3 dari 3</span>
                </div>

                {/* Nama PJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Nama Penanggung Jawab <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.pjNama}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, pjNama: e.target.value }))}
                    placeholder="Contoh: dr. Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-emerald-500 transition-all outline-none"
                  />
                </div>

                {/* Gelar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Gelar Akademik / Profesi
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </div>
                  <input
                    type="text"
                    value={pengesahanForm.pjGelar || ''}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, pjGelar: e.target.value }))}
                    placeholder="Kosongkan jika tidak ada (Contoh: Sp.KP / S.Kep., Ns.)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-emerald-500 transition-all outline-none"
                  />
                </div>

                {/* Jabatan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Jabatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pengesahanForm.pjJabatan}
                    onChange={(e) => setPengesahanForm(prev => ({ ...prev, pjJabatan: e.target.value }))}
                    placeholder="Contoh: Ketua Komite Mutu & Keselamatan Pasien"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-emerald-500 transition-all outline-none"
                  />
                </div>

                {/* NIP / ID PJ */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Nomor Identitas <span className="text-rose-500">*</span>
                    </label>
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPengesahanForm(prev => ({ ...prev, pjNipType: 'NIP' }))}
                        className={`px-2.5 py-1 rounded-md transition-all ${(pengesahanForm.pjNipType || 'NIP') === 'NIP' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        NIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setPengesahanForm(prev => ({ ...prev, pjNipType: 'ID' }))}
                        className={`px-2.5 py-1 rounded-md transition-all ${pengesahanForm.pjNipType === 'ID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        ID Pegawai
                      </button>
                    </div>
                  </div>
                  <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <div className="px-3 py-2.5 bg-slate-100/90 border-r border-slate-200 text-xs font-bold text-emerald-700 shrink-0 select-none flex items-center">
                      {(pengesahanForm.pjNipType || 'NIP') === 'ID' ? 'ID :' : 'NIP :'}
                    </div>
                    <input
                      type="text"
                      required
                      value={pengesahanForm.pjNip}
                      onChange={(e) => setPengesahanForm(prev => ({ ...prev, pjNip: e.target.value }))}
                      placeholder={(pengesahanForm.pjNipType || 'NIP') === 'ID' ? "Contoh: D00237 / PEG-104" : "Contoh: 19890423 202203 1 004"}
                      className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-800 font-mono transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action Footer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Tersimpan di Supabase & otomatis terintegrasi ke seluruh laporan survei.</span>
            </div>
            
            <button
              type="submit"
              disabled={isSavingPengesahan || isFetchingPengesahan}
              className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer transform-gpu hover:scale-[1.01]"
            >
              {isSavingPengesahan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Pengaturan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Pengaturan Halaman Pengesahan
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 5. GOOGLE DRIVE & CADANGAN DATA SECTION */}
      {role === 'admin' && activeSettingsSection === 'backup' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  Pencadangan Data & Integrasi Google Drive
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Amankan seluruh data hasil survei responden, akun rumah sakit, pengesahan, dan master data ke Google Drive dan file cadangan lokal secara otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchBackupStats}
                disabled={isFetchingBackupStats}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer self-start md:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingBackupStats ? 'animate-spin' : ''}`} />
                Segarkan Status
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Backup</span>
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif Realtime
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Google Drive</span>
                <span className={`text-xs font-black flex items-center gap-1.5 mt-1 ${backupStats?.gdriveMounted ? 'text-blue-600' : 'text-amber-600'}`}>
                  {backupStats?.gdriveMounted ? 'G: Terhubung' : 'G: Belum Aktif'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ukuran Cadangan</span>
                <span className="text-xs font-black text-slate-700 mt-1 block">
                  {backupStats?.fileSizeKb ? `${backupStats.fileSizeKb} KB` : 'Tersinkron'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terakhir Disinkron</span>
                <span className="text-[11px] font-bold text-slate-700 mt-1 block truncate">
                  {backupStats?.lastModified ? new Date(backupStats.lastModified).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Hari ini'}
                </span>
              </div>
            </div>
          </div>

          {/* Google Drive Realtime Integration Card */}
          <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/60 border border-blue-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20 shrink-0 mt-0.5">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm sm:text-base text-blue-950">
                      Integrasi Google Drive Realtime (Drive G:)
                    </h4>
                    {backupStats?.gdriveMounted ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Drive G: Terhubung & Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                        Drive G: Belum Terdeteksi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Setiap kali Anda menambah data kuesioner survei, mengubah profil fasyankes, atau memperbarui pengaturan, sistem akan <strong>secara otomatis menduplikasi data ke Google Drive G: secara realtime</strong> tanpa perlu menunggu atau mengklik tombol apa pun.
                  </p>
                </div>
              </div>

              {/* Instant Manual Sync Button */}
              <button
                type="button"
                onClick={handleSyncGdriveNow}
                disabled={isSyncingGdrive}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 transform-gpu hover:scale-[1.01]"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingGdrive ? 'animate-spin' : ''}`} />
                {isSyncingGdrive ? "Menyinkronkan..." : "Sinkronkan ke Google Drive (G:) Sekarang"}
              </button>
            </div>

            {gdriveSyncMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{gdriveSyncMsg}</span>
              </div>
            )}

            {/* Folder location & Desktop Shortcut Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-xs">
              <div className="bg-white/85 border border-blue-200/70 rounded-xl p-4 shadow-2xs">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-blue-900 mb-1.5 flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-blue-600" /> Lokasi Penyimpanan Google Drive
                </p>
                <code className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-lg block break-all font-mono border border-slate-200">
                  G:\My Drive\BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN\
                </code>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  File <code>survei_database_latest.json</code> dan <code>survei_database_YYYY-MM-DD.json</code> otomatis selalu sinkron dan bisa dibuka/dipulihkan kapan saja di laptop mana pun.
                </p>
              </div>

              <div className="bg-white/85 border border-blue-200/70 rounded-xl p-4 shadow-2xs">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-blue-900 mb-1.5 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" /> Pencadangan Total Termasuk Koding Aplikasi
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Sudah tersedia shortcut <strong>BACKUP_SURVEI_KE_GDRIVE.bat</strong> di Desktop Anda. Cukup klik ganda (double-click) untuk mencadangkan seluruh kodingan dan data survei ke Google Drive menjadi berkas zip ringan dalam waktu beberapa detik tanpa perlu menyalin <code>node_modules</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Manual Backup Download & Restore Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Backup */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Unduh Cadangan Database (.JSON)</h4>
                    <p className="text-xs text-slate-500">Simpan berkas cadangan manual langsung ke komputer Anda</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-2">
                  Berkas ini berisi seluruh data kuesioner survei, akun fasyankes, konfigurasi tanda tangan pengesahan, dan master data. Berkas ini dapat digunakan sewaktu-waktu untuk memulihkan sistem jika terjadi kendala.
                </p>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Unduh Berkas Cadangan (.JSON)
                </button>
              </div>
            </div>

            {/* Restore Database */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Pemulihan Database (Restore)</h4>
                    <p className="text-xs text-slate-500">Pulihkan data dari berkas cadangan JSON yang sebelumnya disimpan</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-2">
                  Unggah berkas <code>.json</code> cadangan untuk mengembalikan seluruh data survei dan akun fasyankes. Sistem akan secara otomatis membuat backup pengaman sebelum proses pemulihan berjalan.
                </p>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-4">
                <input
                  type="file"
                  ref={backupFileInputRef}
                  onChange={handleRestoreBackupFile}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => backupFileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  {isRestoring ? "Memulihkan Database..." : "Pilih File Cadangan untuk Dipulihkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
