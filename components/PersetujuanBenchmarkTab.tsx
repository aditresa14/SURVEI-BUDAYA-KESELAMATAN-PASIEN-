'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  RotateCcw, 
  Trash2, 
  Search, 
  Building2, 
  Mail, 
  Calendar, 
  AlertCircle,
  FileText,
  History,
  Check,
  X,
  HelpCircle,
  Activity,
  User,
  ShieldAlert,
  Play
} from 'lucide-react';
import { 
  BenchmarkRequest, 
  BenchmarkAuditLog, 
  updateBenchmarkRequestStatus, 
  deleteBenchmarkRequest,
  getBenchmarkAuditLogs,
  addBenchmarkAuditLog 
} from '../lib/db';

interface PersetujuanBenchmarkTabProps {
  currentHospitalId: string;
  currentHospitalName: string;
  currentHospitalEmail?: string;
  requests: BenchmarkRequest[];
  onRefresh: (newData?: BenchmarkRequest[]) => void;
}

export default function PersetujuanBenchmarkTab({
  currentHospitalId,
  currentHospitalName,
  currentHospitalEmail,
  requests = [],
  onRefresh
}: PersetujuanBenchmarkTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'history' | 'audit'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<BenchmarkRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [auditLogs, setAuditLogs] = useState<BenchmarkAuditLog[]>([]);

  // Custom states for Glassmorphism 2.0 confirmation popups
  const [revokeTarget, setRevokeTarget] = useState<BenchmarkRequest | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<BenchmarkRequest | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load audit logs on mount & subtab change
  const loadAuditLogs = useCallback(async () => {
    if (currentHospitalId === 'admin') {
      setAuditLogs([]);
      return;
    }
    const logs = await getBenchmarkAuditLogs(currentHospitalId || currentHospitalName);
    setAuditLogs(logs);
  }, [currentHospitalId, currentHospitalName]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs, activeSubTab]);

  // Check if current logged-in hospital is the target (not requester) of the benchmark request
  const isTargetOfReq = useCallback((req: BenchmarkRequest) => {
    if (currentHospitalId === 'admin') return false;
    
    const matchesTarget = req.target_id === currentHospitalId || 
                          req.target_name.toLowerCase() === currentHospitalName.toLowerCase();
    const isRequester = req.requester_id === currentHospitalId || 
                        req.requester_name.toLowerCase() === currentHospitalName.toLowerCase();
    
    return matchesTarget && !isRequester;
  }, [currentHospitalId, currentHospitalName]);

  // Filter incoming requests (where current hospital is target_id or target_name)
  const incomingRequests = useMemo(() => {
    if (currentHospitalId === 'admin') return [];
    return requests.filter(r => {
      const isPending = r.status === 'pending';
      return isPending && isTargetOfReq(r);
    });
  }, [requests, isTargetOfReq, currentHospitalId]);

  // Filter history requests (strictly requests where current hospital is target or requester)
  const historyRequests = useMemo(() => {
    if (currentHospitalId === 'admin') return [];
    return requests.filter(r => {
      const isRelated = r.requester_id === currentHospitalId || 
                        r.target_id === currentHospitalId ||
                        r.requester_name.toLowerCase() === currentHospitalName.toLowerCase() ||
                        r.target_name.toLowerCase() === currentHospitalName.toLowerCase();
      if (!isRelated) return false;

      const matchesSearch = r.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.target_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [requests, searchQuery, currentHospitalId, currentHospitalName]);

  const filteredAuditLogs = useMemo(() => {
    if (currentHospitalId === 'admin') return [];
    return auditLogs.filter(l => {
      const isRelated = l.requester_id === currentHospitalId || 
                        l.target_id === currentHospitalId ||
                        l.requester_name.toLowerCase() === currentHospitalName.toLowerCase() ||
                        l.target_name.toLowerCase() === currentHospitalName.toLowerCase();
      if (!isRelated) return false;

      return l.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.target_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.action_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.performed_by.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [auditLogs, searchQuery, currentHospitalId, currentHospitalName]);

  const handleApprove = async (req: BenchmarkRequest) => {
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updatedReq: BenchmarkRequest = {
        ...req,
        status: 'approved',
        notes: actionNotes || 'Disetujui untuk perbandingan data benchmark',
        decided_at: now,
        decided_by: currentHospitalName,
        updated_at: now
      };
      
      const nextRequests = requests.map(r => r.id === req.id ? updatedReq : r);
      onRefresh(nextRequests); // Optimistic UI update!

      await updateBenchmarkRequestStatus(req.id, 'approved', currentHospitalName, actionNotes || 'Disetujui untuk perbandingan data benchmark');
      showNotification(`Permintaan benchmark dari ${req.requester_name} berhasil DISETUJUI.`, 'success');
      setSelectedRequestForDetail(null);
      setActionNotes('');
      loadAuditLogs();
    } catch (err) {
      console.error(err);
      showNotification('Gagal memproses persetujuan. Coba lagi.', 'error');
      onRefresh(); // Revert cache on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (req: BenchmarkRequest) => {
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updatedReq: BenchmarkRequest = {
        ...req,
        status: 'rejected',
        notes: actionNotes || 'Ditolak oleh rumah sakit tujuan',
        decided_at: now,
        decided_by: currentHospitalName,
        updated_at: now
      };
      
      const nextRequests = requests.map(r => r.id === req.id ? updatedReq : r);
      onRefresh(nextRequests); // Optimistic UI update!

      await updateBenchmarkRequestStatus(req.id, 'rejected', currentHospitalName, actionNotes || 'Ditolak oleh rumah sakit tujuan');
      showNotification(`Permintaan benchmark dari ${req.requester_name} DITOLAK.`, 'success');
      setSelectedRequestForDetail(null);
      setActionNotes('');
      loadAuditLogs();
    } catch (err) {
      console.error(err);
      showNotification('Gagal memproses penolakan.', 'error');
      onRefresh(); // Revert cache on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updatedReq: BenchmarkRequest = {
        ...revokeTarget,
        status: 'revoked',
        notes: 'Persetujuan dicabut oleh rumah sakit tujuan',
        decided_at: now,
        decided_by: currentHospitalName,
        updated_at: now
      };
      
      const nextRequests = requests.map(r => r.id === revokeTarget.id ? updatedReq : r);
      onRefresh(nextRequests); // Optimistic UI update!

      await updateBenchmarkRequestStatus(revokeTarget.id, 'revoked', currentHospitalName, 'Persetujuan dicabut oleh rumah sakit tujuan');
      showNotification(`Persetujuan benchmark untuk ${revokeTarget.requester_name} telah DICABUT.`, 'success');
      setRevokeTarget(null);
      loadAuditLogs();
    } catch (err) {
      console.error(err);
      showNotification('Gagal mencabut persetujuan.', 'error');
      onRefresh(); // Revert cache on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateConfirm = async () => {
    if (!reactivateTarget) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updatedReq: BenchmarkRequest = {
        ...reactivateTarget,
        status: 'approved',
        notes: 'Akses diaktifkan kembali oleh rumah sakit tujuan',
        decided_at: now,
        decided_by: currentHospitalName,
        updated_at: now
      };
      
      const nextRequests = requests.map(r => r.id === reactivateTarget.id ? updatedReq : r);
      onRefresh(nextRequests); // Optimistic UI update!

      await updateBenchmarkRequestStatus(reactivateTarget.id, 'approved', currentHospitalName, 'Akses diaktifkan kembali oleh rumah sakit tujuan');
      
      await addBenchmarkAuditLog({
        requester_id: reactivateTarget.requester_id,
        requester_name: reactivateTarget.requester_name,
        target_id: reactivateTarget.target_id,
        target_name: reactivateTarget.target_name,
        action: 'reactivated',
        action_label: 'Benchmark diaktifkan kembali',
        performed_by: currentHospitalName,
        notes: 'Akses benchmark diaktifkan kembali secara realtime'
      });

      showNotification(`Akses benchmark untuk ${reactivateTarget.requester_name} berhasil DIAKTIFKAN KEMBALI.`, 'success');
      setReactivateTarget(null);
      loadAuditLogs();
    } catch (err) {
      console.error(err);
      showNotification('Gagal mengaktifkan kembali akses.', 'error');
      onRefresh(); // Revert cache on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsProcessing(true);
    try {
      const nextRequests = requests.filter(r => r.id !== deleteTargetId);
      onRefresh(nextRequests); // Optimistic UI update!

      await deleteBenchmarkRequest(deleteTargetId);
      showNotification('Riwayat berhasil dihapus.', 'success');
      setDeleteTargetId(null);
      loadAuditLogs();
    } catch (err) {
      console.error(err);
      showNotification('Gagal menghapus riwayat.', 'error');
      onRefresh(); // Revert cache on error
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (currentHospitalId === 'admin') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 max-w-2xl mx-auto my-8 font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Kerahasiaan Data Benchmark Terjaga</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sesuai dengan kebijakan privasi dan hak akses sistem, <strong>Administrator Utama tidak memiliki wewenang untuk melihat, membaca, atau mengelola permintaan benchmark antar rumah sakit</strong>.
        </p>
        <p className="text-xs text-slate-500">
          Permintaan dan persetujuan benchmark hanya dikelola secara langsung oleh dua pihak rumah sakit yang saling berhubungan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#14B8A6] text-white p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden border border-teal-500/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Persetujuan Benchmark Data</h1>
            <p className="text-slate-300 text-sm max-w-[668px] w-full leading-relaxed" style={{ fontSize: '14px', width: '668px' }}>
              Kelola izin berbagi data hasil survei budaya keselamatan pasien secara realtime. Data {currentHospitalName || 'Rumah Sakit'} aman dan hanya dapat dibandingkan oleh rumah sakit lain setelah disetujui.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 shrink-0">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider block">Akun Rumah Sakit</span>
              <span className="text-sm font-bold text-white block truncate max-w-[200px]">{currentHospitalName || 'Rumah Sakit'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'incoming'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Permintaan Masuk</span>
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat & Kelola Akses ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-300" />
            <span>Audit Log Benchmark ({auditLogs.length})</span>
          </button>
        </div>

        {/* Search filter for history & audit */}
        {(activeSubTab === 'history' || activeSubTab === 'audit') && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari rumah sakit / aktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-sans"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'incoming' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-800">Daftar Permintaan Benchmark Menunggu Persetujuan</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Pending: <strong className="text-blue-700">{incomingRequests.length}</strong>
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Tidak Ada Permintaan Menunggu</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Saat ini tidak ada rumah sakit lain yang mengajukan permintaan izin benchmark data kepada {currentHospitalName || 'Rumah Sakit'}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Rumah Sakit Pemohon</th>
                    <th className="py-3.5 px-4">Email Kontak</th>
                    <th className="py-3.5 px-4">Tanggal Permintaan</th>
                    <th className="py-3.5 px-4 text-center">Tahun Data</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center min-w-[200px]">Aksi Persetujuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {incomingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span>{req.requester_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.requester_email || 'Tidak tersedia'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-blue-700">
                        {req.requested_year}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          Menunggu Persetujuan
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedRequestForDetail(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            Lihat Detail
                          </button>

                          <button
                            onClick={() => handleApprove(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Setujui
                          </button>

                          <button
                            onClick={() => handleReject(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeSubTab === 'history' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-800">Riwayat Permintaan & Kelola Akses Benchmark</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Riwayat: <strong className="text-indigo-700">{historyRequests.length}</strong>
            </span>
          </div>

          {historyRequests.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Belum Ada Riwayat</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Riwayat permintaan yang Anda kirim atau terima akan tercatat di sini beserta status keputusan dan tanggalnya.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">RS Pemohon</th>
                    <th className="py-3.5 px-4">RS Tujuan</th>
                    <th className="py-3.5 px-4">Tanggal Permintaan</th>
                    <th className="py-3.5 px-4">Tanggal Keputusan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Pengambil Keputusan</th>
                    <th className="py-3.5 px-4 text-center min-w-[210px]">Aksi & Kelola Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {historyRequests.map((req) => {
                    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                    let label: string = req.status;

                    if (req.status === 'approved') {
                      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                      label = "Disetujui";
                    } else if (req.status === 'rejected') {
                      badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
                      label = "Ditolak";
                    } else if (req.status === 'pending') {
                      badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
                      label = "Menunggu";
                    } else if (req.status === 'revoked') {
                      badgeClass = "bg-slate-200 text-slate-800 border-slate-300";
                      label = "Akses Dicabut";
                    }

                    const isTarget = isTargetOfReq(req);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {req.requester_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-900">
                          {req.target_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(req.decided_at)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {req.decided_by || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedRequestForDetail(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Lihat Detail Permintaan"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              Detail
                            </button>

                            {req.status === 'approved' && isTarget && (
                              <button
                                onClick={() => setRevokeTarget(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Cabut persetujuan agar RS pemohon tidak dapat melihat data benchmark lagi"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Cabut Akses
                              </button>
                            )}

                            {req.status === 'revoked' && isTarget && (
                              <button
                                onClick={() => setReactivateTarget(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Aktifkan kembali akses benchmark"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Aktifkan Kembali
                              </button>
                            )}

                            {req.status === 'pending' && isTarget && (
                              <>
                                <button
                                  onClick={() => handleApprove(req)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleReject(req)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Tolak
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => setDeleteTargetId(req.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Hapus riwayat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Audit Log Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-800">Audit Log & Riwayat Aktivitas Benchmark</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Catatan: <strong className="text-emerald-700">{filteredAuditLogs.length}</strong>
            </span>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Belum Ada Catatan Audit Log</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Seluruh aktivitas pembuatan, persetujuan, penolakan, pencabutan, dan reaktivasi benchmark akan tercatat secara otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Waktu Aktivitas</th>
                    <th className="py-3.5 px-4">Jenis Aktivitas</th>
                    <th className="py-3.5 px-4">RS Pemohon</th>
                    <th className="py-3.5 px-4">RS Tujuan</th>
                    <th className="py-3.5 px-4">Pelaku Tindakan</th>
                    <th className="py-3.5 px-4">Catatan / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {filteredAuditLogs.map((log) => {
                    let actionBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (log.action === 'created') actionBadge = "bg-blue-100 text-blue-800 border-blue-300";
                    if (log.action === 'approved') actionBadge = "bg-emerald-100 text-emerald-800 border-emerald-300";
                    if (log.action === 'rejected') actionBadge = "bg-rose-100 text-rose-800 border-rose-300";
                    if (log.action === 'revoked') actionBadge = "bg-amber-100 text-amber-800 border-amber-300";
                    if (log.action === 'reactivated') actionBadge = "bg-teal-100 text-teal-800 border-teal-300";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${actionBadge}`}>
                            {log.action_label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {log.requester_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-900">
                          {log.target_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <strong className="font-semibold">{log.performed_by}</strong>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 italic">
                          {log.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail & Action Modal */}
      <AnimatePresence>
        {selectedRequestForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 font-sans"
            >
              {/* Modal Header */}
              <div className="p-5 bg-[#14B8A6] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-emerald-400 rounded-xl border border-blue-400/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Detail Permintaan Benchmark</h3>
                    <p className="text-xs text-blue-200">Informasi lengkap permohonan akses data survei</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequestForDetail(null)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Nama Rumah Sakit Pemohon:</span>
                    <strong className="text-slate-900 text-sm block">{selectedRequestForDetail.requester_name}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Nama Rumah Sakit Tujuan:</span>
                    <strong className="text-indigo-900 text-sm block">{selectedRequestForDetail.target_name}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Tanggal Permintaan:</span>
                    <strong className="text-slate-800 block">{formatDate(selectedRequestForDetail.created_at)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Status Akses:</span>
                    <strong className={`text-xs uppercase font-bold px-2 py-0.5 rounded-md inline-block ${
                      selectedRequestForDetail.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      selectedRequestForDetail.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      selectedRequestForDetail.status === 'revoked' ? 'bg-slate-200 text-slate-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedRequestForDetail.status === 'approved' ? 'Disetujui' :
                       selectedRequestForDetail.status === 'rejected' ? 'Ditolak' :
                       selectedRequestForDetail.status === 'revoked' ? 'Akses Dicabut' :
                       'Menunggu Persetujuan'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Tanggal Berakhir Akses:</span>
                    <strong className="text-blue-700 block">{selectedRequestForDetail.expires_at || '1 Tahun (Dapat diperpanjang / dicabut)'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Tahun Data Yang Diminta:</span>
                    <strong className="text-indigo-700 block">{selectedRequestForDetail.requested_year}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Jenis Data Yang Akan Dibandingkan:</span>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-900 space-y-1">
                    <p className="font-bold text-blue-950">
                      {selectedRequestForDetail.data_type || 'Kuesioner Budaya Keselamatan Pasien AHRQ SOPS® v2.0'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">10 Dimensi Utama</span>
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">Per Item Pertanyaan</span>
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">Posisi Staf</span>
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">Unit / Area Kerja</span>
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">Interaksi Pasien</span>
                      <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-800">Masa Kerja</span>
                    </div>
                  </div>
                </div>

                {selectedRequestForDetail.notes && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-700 block">Catatan Tambahan:</span>
                    <p className="text-slate-600">{selectedRequestForDetail.notes}</p>
                  </div>
                )}

                {isTargetOfReq(selectedRequestForDetail) && selectedRequestForDetail.status === 'pending' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Catatan / Pesan Keputusan (Opsional):</label>
                    <textarea
                      rows={2}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Contoh: Disetujui untuk perbandingan evaluasi mutu bersama..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedRequestForDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                {isTargetOfReq(selectedRequestForDetail) && selectedRequestForDetail.status === 'pending' && (
                  <>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleReject(selectedRequestForDetail)}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleApprove(selectedRequestForDetail)}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Setujui
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Glassmorphism 2.0 Revoke Access Modal */}
        {revokeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative max-w-md w-full p-8 text-center rounded-2xl border border-white/40 backdrop-blur-2xl bg-white/45 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-saturate-150 overflow-hidden"
            >
              {/* Decorative radial gradients for Glassmorphism 2.0 feel */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Visual indicator */}
                <div className="w-16 h-16 bg-rose-500/15 text-rose-600 rounded-full flex items-center justify-center mb-5 border border-rose-500/20 shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <h3 className="font-extrabold text-[10px] text-rose-600 uppercase tracking-widest mb-2">Konfirmasi Pemutusan Izin</h3>
                
                {/* Main required text */}
                <h4 className="font-black text-slate-800 text-base leading-snug tracking-tight mb-4 px-2">
                  APAKAH ANDA AKAN MEMUTUS AKSES UNTUK BECHMARKING DATA
                </h4>

                {/* Additional context */}
                <div className="bg-slate-900/5 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-950/5 text-xs text-slate-700 font-medium mb-6 w-full">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Rumah Sakit Pemohon</span>
                  {revokeTarget.requester_name}
                </div>

                {/* Buttons (YA and TIDAK) */}
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setRevokeTarget(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-700 font-bold text-[11px] tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    TIDAK
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={handleRevokeConfirm}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-[11px] tracking-wider uppercase transition-all shadow-md hover:shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    YA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reactivate Access Modal */}
        {reactivateTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative max-w-md w-full p-8 text-center rounded-2xl border border-white/40 backdrop-blur-2xl bg-white/45 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-saturate-150 overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-500/20 shadow-inner">
                  <Play className="w-8 h-8" />
                </div>

                <h3 className="font-extrabold text-[10px] text-emerald-600 uppercase tracking-widest mb-2">Konfirmasi Pengaktifan Kembali</h3>
                
                <h4 className="font-black text-slate-800 text-base leading-snug tracking-tight mb-4 px-2">
                  AKTIFKAN KEMBALI AKSES BENCHMARK DATA UNTUK {reactivateTarget.requester_name.toUpperCase()}?
                </h4>

                <div className="flex items-center gap-3 w-full mt-4">
                  <button
                    onClick={() => setReactivateTarget(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-700 font-bold text-[11px] tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    TIDAK
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={handleReactivateConfirm}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[11px] tracking-wider uppercase transition-all shadow-md hover:shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    YA, AKTIFKAN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Glassmorphism 2.0 Delete History Modal */}
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative max-w-md w-full p-8 text-center rounded-2xl border border-white/40 backdrop-blur-2xl bg-white/45 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-saturate-150 overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-red-500/15 text-red-600 rounded-full flex items-center justify-center mb-5 border border-red-500/20 shadow-inner">
                  <Trash2 className="w-8 h-8" />
                </div>

                <h3 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-2">Hapus Catatan</h3>
                
                <h4 className="font-black text-slate-800 text-base leading-snug tracking-tight mb-6 px-2">
                  APAKAH ANDA AKAN MENGHAPUS RIWAYAT BENCHMARK DATA INI?
                </h4>

                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-700 font-bold text-[11px] tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    TIDAK
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={handleDeleteConfirm}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-[11px] tracking-wider uppercase transition-all shadow-md hover:shadow-red-600/20 cursor-pointer disabled:opacity-50"
                  >
                    YA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
