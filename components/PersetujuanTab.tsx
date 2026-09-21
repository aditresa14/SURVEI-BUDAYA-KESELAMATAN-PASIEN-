'use client';

import { useState } from 'react';
import { 
  Building2, 
  Check, 
  X, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  Database, 
  Copy,
  Lock,
  Unlock,
  Trash2,
  Archive,
  RefreshCw,
  History,
  Search,
  Filter,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { 
  HospitalAccount, 
  updateHospitalAccountStatus, 
  disableHospitalAccount,
  activateHospitalAccount,
  archiveHospitalAccount,
  restoreHospitalAccount,
  deleteHospitalAccountPermanently,
  getAccountAuditLogs,
  AccountAuditLog,
  getEmailNotifications
} from '../lib/db';
import useSWR from 'swr';

interface PersetujuanTabProps {
  accounts: HospitalAccount[];
  onMutateAccounts: () => void;
}

export default function PersetujuanTab({ accounts, onMutateAccounts }: PersetujuanTabProps) {
  const [activeTab, setActiveTab] = useState<'management' | 'audit' | 'emails'>('management');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Active' | 'Disabled' | 'Rejected' | 'Archived'>('all');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // Modals & Active Account Selectors
  const [selectedAccount, setSelectedAccount] = useState<HospitalAccount | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [accountToApprove, setAccountToApprove] = useState<HospitalAccount | null>(null);

  const [accountToReject, setAccountToReject] = useState<HospitalAccount | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [accountToDisable, setAccountToDisable] = useState<HospitalAccount | null>(null);
  const [disableReason, setDisableReason] = useState('');

  const [accountToActivate, setAccountToActivate] = useState<HospitalAccount | null>(null);
  const [accountToRestore, setAccountToRestore] = useState<HospitalAccount | null>(null);

  const [accountToDelete, setAccountToDelete] = useState<HospitalAccount | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // SWR for Real-time Account Audit Logs
  const { data: auditLogs = [], mutate: mutateAuditLogs } = useSWR('account_audit_logs', getAccountAuditLogs, {
    fallbackData: [],
    refreshInterval: 3000
  });

  // SWR for Real-time Email Logs
  const { data: emailLogs = [], mutate: mutateEmails } = useSWR('email_logs', getEmailNotifications, {
    fallbackData: [],
    refreshInterval: 3000
  });

  const sqlMigration = `ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'Aktif';
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.account_audit_logs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    hospital_name TEXT NOT NULL,
    action TEXT NOT NULL,
    action_label TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS public.email_notifications (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

NOTIFY pgrst, reload_schema;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigration);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Helper notice clear
  const clearAlerts = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  // 1. Handle Approve
  const handleApprove = async () => {
    if (!accountToApprove) return;
    setActionLoading(true);
    clearAlerts();

    try {
      await updateHospitalAccountStatus(accountToApprove.id, 'Active', 'Administrator Pusat');
      setSuccessMsg(`Akun ${accountToApprove.namaRs} berhasil disetujui dan diaktifkan.`);
      setAccountToApprove(null);
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyetujui akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Handle Reject
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountToReject) return;
    if (!rejectReason.trim()) {
      setErrorMsg('Mohon masukkan alasan penolakan.');
      return;
    }

    setActionLoading(true);
    clearAlerts();

    try {
      await updateHospitalAccountStatus(accountToReject.id, 'Rejected', 'Administrator Pusat', rejectReason.trim());
      setSuccessMsg(`Pendaftaran akun ${accountToReject.namaRs} telah ditolak.`);
      setAccountToReject(null);
      setRejectReason('');
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menolak akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Handle Disable
  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountToDisable) return;

    setActionLoading(true);
    clearAlerts();

    try {
      await disableHospitalAccount(accountToDisable.id, 'Administrator Pusat', disableReason.trim() || undefined);
      setSuccessMsg(`Akun ${accountToDisable.namaRs} telah dinonaktifkan. Sesi login pengguna langsung diakhiri.`);
      setAccountToDisable(null);
      setDisableReason('');
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menonaktifkan akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Handle Activate
  const handleActivate = async () => {
    if (!accountToActivate) return;
    setActionLoading(true);
    clearAlerts();

    try {
      await activateHospitalAccount(accountToActivate.id, 'Administrator Pusat');
      setSuccessMsg(`Akun ${accountToActivate.namaRs} telah diaktifkan kembali. Rumah sakit dapat langsung login.`);
      setAccountToActivate(null);
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengaktifkan akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Handle Restore
  const handleRestore = async () => {
    if (!accountToRestore) return;
    setActionLoading(true);
    clearAlerts();

    try {
      await restoreHospitalAccount(accountToRestore.id, 'Administrator Pusat');
      setSuccessMsg(`Akun ${accountToRestore.namaRs} telah dipulihkan dari arsip dan siap digunakan.`);
      setAccountToRestore(null);
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulihkan akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Handle Delete (Soft Delete vs Hard Delete)
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountToDelete) return;

    if (deleteMode === 'hard' && confirmDeleteInput.trim() !== 'HAPUS') {
      setErrorMsg('Ketik persis "HAPUS" untuk mengonfirmasi penghapusan permanen.');
      return;
    }

    setActionLoading(true);
    clearAlerts();

    try {
      if (deleteMode === 'soft') {
        await archiveHospitalAccount(accountToDelete.id, 'Administrator Pusat', deleteReason.trim() || undefined);
        setSuccessMsg(`Akun ${accountToDelete.namaRs} berhasil diarsipkan (soft delete). Login diblokir dan data tersimpan aman.`);
      } else {
        await deleteHospitalAccountPermanently(accountToDelete.id, 'Administrator Pusat');
        setSuccessMsg(`Akun ${accountToDelete.namaRs} beserta seluruh data survei dan hasilnya telah dihapus secara permanen.`);
      }

      setAccountToDelete(null);
      setConfirmDeleteInput('');
      setDeleteReason('');
      onMutateAccounts();
      mutateAuditLogs();
      mutateEmails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus akun.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.namaRs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.penanggungJawab && acc.penanggungJawab.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.kotaKab && acc.kotaKab.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return acc.status === statusFilter;
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearchTerm) return true;
    const q = auditSearchTerm.toLowerCase();
    return (
      log.hospital_name?.toLowerCase().includes(q) ||
      log.action_label?.toLowerCase().includes(q) ||
      log.performed_by?.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q)
    );
  });

  // Stats summary for accounts
  const totalPending = accounts.filter(a => a.status === 'Pending').length;
  const totalActive = accounts.filter(a => a.status === 'Active').length;
  const totalDisabled = accounts.filter(a => a.status === 'Disabled').length;
  const totalArchivedOrRejected = accounts.filter(a => a.status === 'Archived' || a.status === 'Rejected').length;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Persetujuan & Manajemen Akun Rumah Sakit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pusat verifikasi pendaftaran, kontrol keaktifan, reset/nonaktifkan akun, hapus/arsipkan, dan audit log aktivitas terintegrasi Supabase
          </p>
        </div>

        {/* Top Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('management')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'management'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Manajemen Akun
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Aktivitas ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Log Email ({emailLogs.length})
          </button>
        </div>
      </div>

      {/* Stats summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-yellow-200 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Menunggu Approval</span>
            <span className="text-xl font-extrabold text-yellow-600 mt-0.5 block">{totalPending} RS</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Akun Aktif</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">{totalActive} RS</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Akun Nonaktif</span>
            <span className="text-xl font-extrabold text-amber-600 mt-0.5 block">{totalDisabled} RS</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Arsip / Ditolak</span>
            <span className="text-xl font-extrabold text-slate-700 mt-0.5 block">{totalArchivedOrRejected} RS</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            {errorMsg}
          </div>

          {(errorMsg.toLowerCase().includes('schema cache') || 
            errorMsg.toLowerCase().includes('column') || 
            errorMsg.toLowerCase().includes('account_audit_logs') || 
            errorMsg.toLowerCase().includes('does not exist')) && (
            <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Skema Database Supabase Audit & Status Akun</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sistem otomatis mendukung fallback. Namun untuk performa optimal pada database Supabase Anda, silakan eksekusi SQL editor berikut:
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold px-1">
                  <span>MIGRASI SQL SUPABASE:</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin!' : 'Salin SQL'}
                  </button>
                </div>

                <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-indigo-200 overflow-x-auto max-h-40 leading-relaxed">
                  {sqlMigration}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: MANAJEMEN AKUN */}
      {activeTab === 'management' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden space-y-4">
          
          {/* Controls Bar: Search & Status Filter */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Nama RS, Username, Wilayah..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Semua Status ({accounts.length})</option>
                <option value="Pending">Menunggu Approval ({totalPending})</option>
                <option value="Active">Akun Aktif ({totalActive})</option>
                <option value="Disabled">Akun Nonaktif ({totalDisabled})</option>
                <option value="Rejected">Permohonan Ditolak</option>
                <option value="Archived">Akun Diarsipkan</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto">
            {filteredAccounts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Building2 className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs">Tidak ada data akun rumah sakit yang sesuai filter.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs text-slate-700 divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center w-12">No</th>
                    <th className="p-4">Nama RS / Wilayah</th>
                    <th className="p-4">Username & Kontak</th>
                    <th className="p-4 text-center">Status Persetujuan</th>
                    <th className="p-4 text-center">Status Akun</th>
                    <th className="p-4 text-center">Tgl Registrasi</th>
                    <th className="p-4 text-center">Terakhir Login</th>
                    <th className="p-4 text-center">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc, index) => (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="p-4 text-center font-bold text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{acc.namaRs}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {acc.kotaKab || '-'}, {acc.provinsi || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-indigo-600 font-bold text-xs">{acc.username}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {acc.emailRs || acc.penanggungJawab || '-'}
                        </div>
                      </td>
                      
                      {/* Status Persetujuan */}
                      <td className="p-4 text-center">
                        {acc.status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full font-bold text-[10px] border border-yellow-200">
                            <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> Menunggu
                          </span>
                        ) : acc.status === 'Rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Disetujui
                          </span>
                        )}
                      </td>

                      {/* Status Akun */}
                      <td className="p-4 text-center">
                        {acc.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-[10px] border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Aktif
                          </span>
                        ) : acc.status === 'Disabled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-extrabold text-[10px] border border-amber-300 shadow-2xs">
                            <Lock className="w-3 h-3 text-amber-600" /> Nonaktif
                          </span>
                        ) : acc.status === 'Archived' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-extrabold text-[10px] border border-slate-300">
                            <Archive className="w-3 h-3 text-slate-500" /> Diarsipkan
                          </span>
                        ) : acc.status === 'Pending' ? (
                          <span className="text-[10px] text-slate-400 italic">Belum Aktif</span>
                        ) : (
                          <span className="text-[10px] text-red-400 italic">Ditolak</span>
                        )}
                      </td>

                      {/* Tanggal Registrasi */}
                      <td className="p-4 text-center font-mono text-[11px] text-slate-600">
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>

                      {/* Terakhir Login */}
                      <td className="p-4 text-center font-mono text-[11px] text-slate-600">
                        {acc.last_login ? new Date(acc.last_login).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : (
                          <span className="text-slate-400 italic text-[10px]">Belum login</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Detail button */}
                          <button
                            onClick={() => {
                              setSelectedAccount(acc);
                              setIsDetailOpen(true);
                            }}
                            title="Lihat Detail Profil & Kredensial"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval / Rejection buttons for Pending accounts */}
                          {acc.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => setAccountToApprove(acc)}
                                disabled={actionLoading}
                                title="Setujui & Aktifkan Akun"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAccountToReject(acc)}
                                disabled={actionLoading}
                                title="Tolak Pendaftaran"
                                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Disable button for Active accounts */}
                          {acc.status === 'Active' && (
                            <button
                              onClick={() => setAccountToDisable(acc)}
                              disabled={actionLoading}
                              title="Nonaktifkan Akun"
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] shadow-2xs"
                            >
                              <Lock className="w-3 h-3" /> Nonaktifkan
                            </button>
                          )}

                          {/* Activate button for Disabled accounts */}
                          {acc.status === 'Disabled' && (
                            <button
                              onClick={() => setAccountToActivate(acc)}
                              disabled={actionLoading}
                              title="Aktifkan Kembali Akun"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] shadow-2xs"
                            >
                              <Unlock className="w-3 h-3" /> Aktifkan
                            </button>
                          )}

                          {/* Restore button for Archived accounts */}
                          {acc.status === 'Archived' && (
                            <button
                              onClick={() => setAccountToRestore(acc)}
                              disabled={actionLoading}
                              title="Pulihkan Akun dari Arsip"
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <RefreshCw className="w-3 h-3" /> Pulihkan
                            </button>
                          )}

                          {/* Delete / Archive button for non-pending accounts */}
                          {acc.status !== 'Pending' && (
                            <button
                              onClick={() => {
                                setAccountToDelete(acc);
                                setDeleteMode('soft');
                                setConfirmDeleteInput('');
                                setDeleteReason('');
                              }}
                              disabled={actionLoading}
                              title="Hapus atau Arsipkan Akun"
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors cursor-pointer border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG RIWAYAT AKTIVITAS AKUN */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Riwayat Aktivitas & Audit Log Akun
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mencatat secara teratur setiap tindakan Administrator Utama (Persetujuan, Aktivasi, Penonaktifan, Soft Delete, Hard Delete, Pemulihan)
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                placeholder="Cari log aktivitas..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <History className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs">Belum ada catatan aktivitas audit log akun.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs text-slate-700 divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Waktu & Tanggal</th>
                    <th className="p-3">Nama Rumah Sakit</th>
                    <th className="p-3 text-center">Jenis Aktivitas</th>
                    <th className="p-3">Dilakukan Oleh</th>
                    <th className="p-3">Alasan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{log.hospital_name}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          log.action === 'approved' || log.action === 'activated'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.action === 'disabled'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : log.action === 'archived'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : log.action === 'deleted'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : log.action === 'restored'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {log.action_label}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{log.performed_by}</td>
                      <td className="p-3 text-slate-600 max-w-xs italic">{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOG EMAIL NOTIFIKASI */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Riwayat Notifikasi Email & Log Database
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Daftar otomatis email notifikasi yang dikirimkan oleh sistem ke Admin Utama maupun pihak Rumah Sakit.
            </p>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
            {emailLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Belum ada email yang dikirim oleh sistem.</p>
            ) : (
              emailLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                    log.type === 'admin_notification' 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                      : log.type === 'approval' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-sm">{log.subject}</p>
                      <p className="text-[10px] text-slate-500">
                        <strong>Kepada:</strong> <span className="text-indigo-600">{log.to_email}</span> • 
                        <strong> Tipe:</strong> <span className="uppercase text-slate-700 font-mono font-bold text-[9px] ml-1">{log.type}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-normal">
                    {log.body}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Detail Akun Rumah Sakit */}
      {isDetailOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Detail Akun & Kredensial Rumah Sakit
              </h3>
              <button 
                onClick={() => { setIsDetailOpen(false); setSelectedAccount(null); }}
                className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70dvh] overflow-y-auto">
              
              {/* Status Header Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status Persetujuan</span>
                  <div className="mt-1">
                    {selectedAccount.status === 'Pending' ? (
                      <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-yellow-200">
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Menunggu Persetujuan
                      </span>
                    ) : selectedAccount.status === 'Rejected' ? (
                      <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-red-200">
                        <XCircle className="w-3.5 h-3.5" /> Ditolak
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block sm:text-right">Status Keaktifan Akun</span>
                  <div className="mt-1">
                    {selectedAccount.status === 'Active' ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Aktif
                      </span>
                    ) : selectedAccount.status === 'Disabled' ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-amber-300">
                        <Lock className="w-3.5 h-3.5" /> Nonaktif
                      </span>
                    ) : selectedAccount.status === 'Archived' ? (
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-slate-300">
                        <Archive className="w-3.5 h-3.5" /> Diarsipkan
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Pending/Ditolak</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid 1: Identitas Fasyankes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                  <MapPin className="w-3.5 h-3.5" /> 1. Identitas Fasyankes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400">Nama Rumah Sakit:</span>
                    <p className="font-bold text-sm text-slate-800">{selectedAccount.namaRs}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Kode Fasyankes (RS):</span>
                    <p className="font-bold text-sm text-slate-800">{selectedAccount.kodeRs || '-'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="text-slate-400">Alamat Lengkap:</span>
                    <p className="font-medium text-slate-700">{selectedAccount.alamatRs}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Provinsi:</span>
                    <p className="font-bold text-slate-700">{selectedAccount.provinsi || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Kota / Kabupaten:</span>
                    <p className="font-bold text-slate-700">{selectedAccount.kotaKab || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Grid 2: Penanggung Jawab */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                  <User className="w-3.5 h-3.5" /> 2. Penanggung Jawab & Kontak Resmi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400">Nama Penanggung Jawab:</span>
                    <p className="font-bold text-sm text-slate-800">{selectedAccount.penanggungJawab || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Jabatan:</span>
                    <p className="font-bold text-slate-700">{selectedAccount.jabatan || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Nomor WhatsApp:</span>
                    <p className="font-bold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAccount.noWhatsapp || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Email Resmi RS:</span>
                    <p className="font-bold text-slate-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAccount.emailRs || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 3: Kredensial & Log Sesi */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 3. Kredensial & Riwayat Login
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400">Username Login:</span>
                    <p className="font-mono font-bold text-sm text-indigo-600">{selectedAccount.username}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Password:</span>
                    <p className="font-bold text-slate-400">•••••••• (Tersimpan Terenkripsi)</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Tanggal Registrasi:</span>
                    <p className="font-medium text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAccount.created_at ? new Date(selectedAccount.created_at).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Terakhir Login:</span>
                    <p className="font-medium text-slate-700 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAccount.last_login ? new Date(selectedAccount.last_login).toLocaleString('id-ID') : 'Belum pernah login'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => { setIsDetailOpen(false); setSelectedAccount(null); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DIALOG NONAKTIFKAN AKUN */}
      {accountToDisable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-amber-50">
              <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" /> Nonaktifkan Akun Rumah Sakit
              </h3>
              <button 
                onClick={() => { setAccountToDisable(null); setDisableReason(''); }}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisableSubmit}>
              <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
                <p>
                  Apakah Anda yakin ingin menonaktifkan akun:
                </p>
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 font-bold text-sm text-center">
                  {accountToDisable.namaRs}
                </div>
                
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]">
                  <p className="font-bold text-slate-800">Dampak Penonaktifan:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Status akun berubah menjadi <strong className="text-amber-700">Nonaktif</strong>.</li>
                    <li>Akses login ke portal rumah sakit langsung <strong>diblokir</strong>.</li>
                    <li>Sesi login aktif akan <strong>diakhiri secara otomatis (force logout)</strong>.</li>
                    <li>Pengguna tidak dapat mengakses aplikasi sampai akun diaktifkan kembali.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Alasan Penonaktifan (Opsional):</label>
                  <textarea
                    rows={3}
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    placeholder="Contoh: Perbaikan data fasyankes atau permohonan penonaktifan internal."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setAccountToDisable(null); setDisableReason(''); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {actionLoading ? 'Memproses...' : 'Nonaktifkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIALOG AKTIFKAN AKUN */}
      {accountToActivate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="font-bold text-emerald-900 text-base flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-600" /> Aktifkan Akun Rumah Sakit
              </h3>
              <button 
                onClick={() => setAccountToActivate(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-xs text-slate-600 leading-relaxed text-center space-y-3">
              <p>Apakah Anda yakin ingin mengaktifkan kembali akun:</p>
              <p className="font-bold text-sm text-slate-800 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                {accountToActivate.namaRs}
              </p>
              <p className="text-[11px] text-slate-500">
                Pengguna dapat login kembali tanpa perlu registrasi ulang. Seluruh data survei dan riwayat sebelumnya tetap tersedia utuh.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setAccountToActivate(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer w-full"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 w-full flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                {actionLoading ? 'Memproses...' : 'Aktifkan Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DIALOG HAPUS AKUN (DUAL MODE: SOFT DELETE VS HARD DELETE 2-STAGE) */}
      {accountToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-red-900 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" /> Opsi Penghapusan Akun
              </h3>
              <button 
                onClick={() => { setAccountToDelete(null); setConfirmDeleteInput(''); }}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit}>
              <div className="p-6 space-y-5 text-xs text-slate-700">
                
                <div className="p-3 bg-red-100/60 border border-red-200 rounded-xl">
                  <span className="text-red-900 font-bold block">Rumah Sakit Target:</span>
                  <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{accountToDelete.namaRs}</span>
                </div>

                {/* Delete Mode Selector */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 text-xs block">Pilih Metode Penghapusan:</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: Soft Delete / Archive */}
                    <label 
                      onClick={() => setDeleteMode('soft')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        deleteMode === 'soft' 
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Archive className="w-4 h-4 text-indigo-600" /> Arsipkan (Soft Delete)
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                        Akses login diblokir. Seluruh data tetap tersimpan untuk audit & dapat dipulihkan kapan saja.
                      </p>
                    </label>

                    {/* Option B: Hard Delete */}
                    <label 
                      onClick={() => setDeleteMode('hard')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        deleteMode === 'hard' 
                          ? 'border-red-600 bg-red-50/50 ring-2 ring-red-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-red-700">
                        <Trash2 className="w-4 h-4 text-red-600" /> Hapus Permanen
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                        Menghapus seluruh profil, akun login, survei, dan hasil analisa secara menyeluruh & atomik.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Soft Delete Reason Field */}
                {deleteMode === 'soft' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Alasan Pengarsipan (Opsional):</label>
                    <textarea
                      rows={2}
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Contoh: Akun tidak aktif lebih dari 1 tahun."
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Hard Delete 2-Stage Confirmation Field */}
                {deleteMode === 'hard' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2 text-red-800">
                      <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
                      <div className="space-y-1">
                        <p className="font-bold">Konfirmasi Penghapusan Permanen (2-Tahap)</p>
                        <p className="text-[11px] leading-relaxed text-red-700">
                          Tindakan ini bersifat <strong>permanen</strong> dan <strong>tidak dapat dibatalkan</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-800 block">
                        Ketik <span className="text-red-700 font-mono font-black">HAPUS</span> di bawah ini untuk mengonfirmasi:
                      </label>
                      <input
                        type="text"
                        value={confirmDeleteInput}
                        onChange={(e) => setConfirmDeleteInput(e.target.value)}
                        placeholder="Ketik HAPUS"
                        className="w-full bg-white border border-red-300 rounded-xl px-3.5 py-2 font-mono font-bold text-sm text-center outline-none focus:ring-2 focus:ring-red-500 tracking-wider"
                      />
                    </div>
                  </div>
                )}

              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setAccountToDelete(null); setConfirmDeleteInput(''); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || (deleteMode === 'hard' && confirmDeleteInput.trim() !== 'HAPUS')}
                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    deleteMode === 'hard' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {deleteMode === 'hard' ? <Trash2 className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  {actionLoading ? 'Memproses...' : deleteMode === 'hard' ? 'Hapus Permanen' : 'Arsipkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DIALOG REJECT PENDAFTARAN */}
      {accountToReject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-red-900 text-base">Alasan Penolakan Pendaftaran Akun</h3>
              <button 
                onClick={() => { setAccountToReject(null); setRejectReason(''); }}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 leading-normal">
                  <p>Anda menolak permohonan pendaftaran untuk <strong>{accountToReject.namaRs}</strong>. Rumah Sakit akan otomatis menerima notifikasi email alasan penolakan.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Alasan Penolakan <span className="text-red-600">*</span></label>
                  <textarea
                    required
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Mohon gunakan email resmi instansi rumah sakit dan sertakan nomor SK penanggung jawab yang sah."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setAccountToReject(null); setRejectReason(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Memproses...' : 'Tolak & Kirim Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DIALOG APPROVE AKUN */}
      {accountToApprove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Setujui Pendaftaran
              </h3>
              <button 
                onClick={() => setAccountToApprove(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-xs text-slate-600 leading-relaxed text-center space-y-3">
              <p>Apakah Anda yakin ingin menyetujui pendaftaran akun untuk:</p>
              <p className="font-bold text-sm text-slate-800 p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200">
                {accountToApprove.namaRs}
              </p>
              <p className="text-[11px] text-slate-500">
                Akun akan langsung diaktifkan dan sistem akan otomatis mengirimi email persetujuan ke rumah sakit.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setAccountToApprove(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer w-full"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 w-full"
              >
                {actionLoading ? 'Memproses...' : 'Setuju & Aktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
