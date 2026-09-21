'use client';

import { useState, useEffect } from 'react';
import { 
  LogIn, 
  ArrowLeft, 
  ShieldCheck, 
  ClipboardCheck, 
  Eye, 
  EyeOff, 
  Key, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Lock, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getHospitalAccounts, 
  updateLastLogin, 
  requestHospitalPasswordReset, 
  verifyResetTokenAndResetPassword 
} from '../lib/db';
import { LogoData } from '../lib/logo';

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (role: 'rs' | 'admin', identifier: string, name: string, hospitalId?: string) => void;
  onGoToRegister: () => void;
  registeredHospitals: Array<{ username: string; kodeRs: string; namaRs: string }>;
  activeLogo?: LogoData | null;
}

export default function LoginScreen({
  onBack,
  onLoginSuccess,
  onGoToRegister,
  registeredHospitals,
  activeLogo,
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'rs' | 'admin'>('rs');
  const [rsUsername, setRsUsername] = useState('');
  const [rsPassword, setRsPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showRsPassword, setShowRsPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [error, setError] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'success'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [forgotEmailHint, setForgotEmailHint] = useState<string | null>(null);

  // Password strength calculation helper
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Kosong', color: 'bg-slate-200', text: 'text-slate-400' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Lemah', color: 'bg-rose-500', text: 'text-rose-600' };
    if (score <= 3) return { score, label: 'Sedang', color: 'bg-amber-500', text: 'text-amber-600' };
    return { score, label: 'Sangat Kuat', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const handleOpenForgotPassword = () => {
    setForgotStep('request');
    setForgotIdentifier(rsUsername || '');
    setForgotToken('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotMessage(null);
    setForgotEmailHint(null);
    setShowForgotModal(true);
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotMessage({ text: 'Harap masukkan username atau email rumah sakit.', type: 'error' });
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);

    try {
      const res = await requestHospitalPasswordReset(forgotIdentifier);
      setForgotMessage({ text: res.message, type: 'info' });
      if (res.emailHint) {
        setForgotEmailHint(res.emailHint);
      }
      setForgotStep('verify');
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'Terjadi kesalahan sistem.', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotToken.trim()) {
      setForgotMessage({ text: 'Harap masukkan 6 digit kode verifikasi.', type: 'error' });
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotMessage({ text: 'Password baru minimal 8 karakter.', type: 'error' });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotMessage({ text: 'Konfirmasi password baru tidak cocok.', type: 'error' });
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);

    try {
      const res = await verifyResetTokenAndResetPassword(forgotIdentifier, forgotToken, forgotNewPassword);
      if (res.success) {
        setForgotStep('success');
        setForgotMessage({ text: res.message, type: 'success' });
        // Refresh hospital accounts cache
        const updatedAccounts = await getHospitalAccounts();
        setHospitals(updatedAccounts);
      } else {
        setForgotMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'Gagal mereset password.', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFinishReset = () => {
    setShowForgotModal(false);
    if (forgotIdentifier) {
      setRsUsername(forgotIdentifier);
    }
    setRsPassword('');
  };

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const data = await getHospitalAccounts();
        setHospitals(data);
      } catch (err) {
        console.error("Gagal memuat akun RS:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHospitals();
  }, [registeredHospitals]);

  const handleRsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rsUsername || !rsPassword) {
      setError('Username dan password harus diisi');
      return;
    }

    try {
      // Find the account by username (case-insensitive)
      const found = hospitals.find(
        h => h.username.toLowerCase() === rsUsername.toLowerCase().trim()
      );

      if (!found) {
        setError('Username Rumah Sakit tidak ditemukan.');
        return;
      }

      // Check Password
      let isMatch = false;
      if (found.password && (found.password.startsWith('$2a$') || found.password.startsWith('$2b$'))) {
        isMatch = await bcrypt.compare(rsPassword, found.password);
      } else {
        // Fallback check for plain text legacy accounts
        isMatch = found.password === rsPassword || found.kodeRs === rsPassword;
      }

      if (!isMatch) {
        setError('Password yang Anda masukkan salah.');
        return;
      }

      // Check Status
      const status = found.status || 'Active'; // Fallback for legacy accounts

      if (status === 'Pending') {
        setError('Akun Anda masih menunggu persetujuan Administrator.');
        return;
      }

      if (status === 'Rejected') {
        setError('Akun Anda belum disetujui. Silakan hubungi Administrator.');
        return;
      }

      if (status === 'Disabled') {
        setError('Akun rumah sakit Anda telah dinonaktifkan oleh Administrator. Silakan hubungi Admin Utama untuk informasi lebih lanjut.');
        return;
      }

      if (status === 'Archived') {
        setError('Akun rumah sakit Anda telah diarsipkan/dihapus oleh Administrator. Silakan hubungi Admin Utama untuk informasi lebih lanjut.');
        return;
      }

      // Record last login timestamp in Supabase
      updateLastLogin(found.id || found.username).catch(err => console.warn("Update last login error:", err));

      // Proceed on Active status
      onLoginSuccess('rs', found.username, found.namaRs, found.id);
    } catch (err) {
      console.error("Login error:", err);
      setError('Terjadi kesalahan koneksi saat login.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminUsername || !adminPassword) {
      setError('Username dan password harus diisi');
      return;
    }

    if (adminUsername === 'SURVEYRSAM' && adminPassword === '123456') {
      onLoginSuccess('admin', 'admin', 'Administrator Pusat');
    } else {
      setError('Username Admin Utama atau password salah');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col justify-center items-center md:items-start md:pl-16 lg:pl-28 p-6 relative overflow-hidden">
      {/* Decorative ambient glows for Glassmorphism depth */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      {/* Back button on the top-right corner */}
      <button
        onClick={onBack}
        className="absolute top-6 right-6 text-slate-800 hover:text-blue-700 flex items-center gap-2 text-sm font-black transition-all bg-white/50 hover:bg-white/80 backdrop-blur-2xl px-4 py-2.5 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Glassmorphism 2.0 Card */}
      <div className="w-full max-w-md bg-white/45 backdrop-blur-3xl rounded-[36px] border border-white/70 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.22),0_0_1px_1px_rgba(255,255,255,0.7)_inset] p-8 relative overflow-hidden group z-10">
        {/* Specular gloss glow inside card */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none"></div>
        {/* Shine effect sweep overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

        <div className="text-center space-y-4 mb-8 relative z-10">
          <div className="mx-auto p-0.5 bg-white text-blue-600 rounded-2xl border-2 border-teal-400 ring-2 ring-white shadow-md flex items-center justify-center shrink-0 w-20 h-20 overflow-hidden relative group/logo">
            <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/logo:opacity-100 transition-opacity"></div>
            {activeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeLogo.url} alt="AHRQ Logo" className="w-full h-full object-contain scale-125 p-1" />
            ) : (
              <ShieldCheck className="w-14 h-14 text-blue-600" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-[33px] font-sans font-black text-[#1E6F73] tracking-tight drop-shadow-sm">Selamat Datang</h2>
            <div className="text-[10px] sm:text-[10.5px] text-slate-700 font-extrabold uppercase tracking-wider leading-snug space-y-0.5">
              <p className="text-slate-600">SILAHKAN MASUK UNTUK MENGAKSES</p>
              <p className="text-[#45556c] font-black text-[11px] sm:text-[11.5px] tracking-tight">SISTEM SURVEI BUDAYA KESELAMATAN PASIEN</p>
              <p className="text-slate-600">MENGGUNAKAN INSTRUMEN AHRQ SOPS V2.0</p>
            </div>
          </div>
        </div>

        {/* Tab Selector with Glassmorphism 2.0 */}
        <div className="flex bg-slate-900/10 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/60 mb-6 relative z-10 shadow-inner">
          <button
            onClick={() => { setActiveTab('rs'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform-gpu cursor-pointer ${
              activeTab === 'rs' 
                ? 'bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] text-white shadow-[0_8px_20px_rgba(67,184,189,0.3)] ring-1 ring-white/50' 
                : 'text-slate-800 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            Portal Rumah Sakit
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform-gpu cursor-pointer ${
              activeTab === 'admin' 
                ? 'bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] text-white shadow-[0_8px_20px_rgba(67,184,189,0.3)] ring-1 ring-white/50' 
                : 'text-slate-800 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            Admin Utama
          </button>
        </div>

        <div className="relative z-10">
          {error && (
            <div className="mb-6 p-4 bg-red-500/15 backdrop-blur-xl border border-red-500/40 rounded-2xl text-[11px] text-red-700 text-center font-black uppercase tracking-tight shadow-sm animate-in fade-in zoom-in">
              {error}
            </div>
          )}

          {/* Hospital Login Form */}
          {activeTab === 'rs' && (
            <form onSubmit={handleRsSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Username Rumah Sakit</label>
                <input
                  type="text"
                  required
                  placeholder="Masukan Username"
                  value={rsUsername}
                  onChange={e => setRsUsername(e.target.value)}
                  className="w-full bg-white/60 backdrop-blur-2xl border border-white/70 rounded-2xl px-5 py-3.5 text-sm focus:bg-white/90 focus:border-[#43B8BD] focus:ring-4 focus:ring-[#43B8BD]/20 transition-all outline-none text-slate-900 placeholder-slate-500 font-bold shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Password</label>
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-[10px] font-bold text-[#1E6F73] hover:text-[#2FA7A7] hover:underline transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showRsPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan Password"
                    value={rsPassword}
                    onChange={e => setRsPassword(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-2xl border border-white/70 rounded-2xl px-5 py-3.5 text-sm focus:bg-white/90 focus:border-[#43B8BD] focus:ring-4 focus:ring-[#43B8BD]/20 transition-all outline-none text-slate-900 placeholder-slate-500 font-bold pr-14 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRsPassword(!showRsPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-[#43B8BD] transition-colors cursor-pointer"
                  >
                    {showRsPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-md shadow-teal-500/15 hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all transform-gpu cursor-pointer flex items-center justify-center gap-2 group ring-1 ring-white/40"
              >
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-1" /> Masuk ke Portal RS
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="text-[#2FA7A7] hover:text-[#1E6F73] text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white/50 hover:bg-white/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md inline-block"
                >
                  Daftar Akun Rumah Sakit
                </button>
              </div>
            </form>
          )}

          {/* Admin Login Form */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Username Admin Utama</label>
                <input
                  type="text"
                  required
                  placeholder="Masukan Username"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  className="w-full bg-white/60 backdrop-blur-2xl border border-white/70 rounded-2xl px-5 py-3.5 text-sm focus:bg-white/90 focus:border-[#43B8BD] focus:ring-4 focus:ring-[#43B8BD]/20 transition-all outline-none text-slate-900 placeholder-slate-500 font-bold shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-2xl border border-white/70 rounded-2xl px-5 py-3.5 text-sm focus:bg-white/90 focus:border-[#43B8BD] focus:ring-4 focus:ring-[#43B8BD]/20 transition-all outline-none text-slate-900 placeholder-slate-500 font-bold pr-14 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-[#43B8BD] transition-colors cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-md shadow-teal-500/15 hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all transform-gpu cursor-pointer flex items-center justify-center gap-2 group ring-1 ring-white/40"
              >
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-1" /> Masuk Admin Utama
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal (Glassmorphism 2.0) */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-800"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-3 bg-gradient-to-tr from-[#43B8BD] to-[#1E6F73] text-white rounded-2xl shadow-md shadow-teal-500/20">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Lupa Password Portal RS
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Atur ulang password akun rumah sakit Anda dengan verifikasi aman.
                  </p>
                </div>
              </div>

              {/* Alert message if any */}
              {forgotMessage && (
                <div
                  className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
                    forgotMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : forgotMessage.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-teal-50 text-teal-900 border border-teal-200'
                  }`}
                >
                  {forgotMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : forgotMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <Mail className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{forgotMessage.text}</span>
                </div>
              )}

              {/* STEP 1: Request OTP Code */}
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestResetCode} className="space-y-4">
                  <p className="text-sm text-justify text-slate-600 leading-relaxed">
                    Masukkan <strong>Username</strong> atau <strong>Email Rumah Sakit</strong> yang terdaftar saat registrasi. Sistem kami akan mengirimkan 6 digit kode verifikasi ke alamat email akun Anda.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Username / Email Rumah Sakit
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={e => setForgotIdentifier(e.target.value)}
                        placeholder="Contoh: rsudalmulk atau email@rs.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:bg-white focus:border-[#43B8BD] focus:ring-2 focus:ring-[#43B8BD]/20 transition-all outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" /> Kirim Kode OTP
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Verify OTP and Enter New Password */}
              {forgotStep === 'verify' && (
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                  {forgotEmailHint && (
                    <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 text-center font-mono">
                      Email Tujuan: <strong className="text-slate-800">{forgotEmailHint}</strong>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex justify-between items-center">
                      <span>Kode Verifikasi (6 Digit OTP)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Berlaku 15 Menit</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotToken}
                      onChange={e => setForgotToken(e.target.value.replace(/\D/g, ''))}
                      placeholder="Contoh: 849201"
                      className="w-full text-center tracking-[0.35em] font-mono text-base font-bold bg-slate-50 border border-slate-200 rounded-2xl py-3 focus:bg-white focus:border-[#43B8BD] focus:ring-2 focus:ring-[#43B8BD]/20 transition-all outline-none text-slate-800"
                    />
                  </div>

                  {/* Password Baru */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Password Baru (Min. 8 Karakter)
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        placeholder="Masukkan password baru"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:bg-white focus:border-[#43B8BD] focus:ring-2 focus:ring-[#43B8BD]/20 transition-all outline-none pr-12 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Live Strength Meter */}
                    {forgotNewPassword && (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Kekuatan Password:</span>
                          <span className={`font-bold ${calculatePasswordStrength(forgotNewPassword).text}`}>
                            {calculatePasswordStrength(forgotNewPassword).label}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${calculatePasswordStrength(forgotNewPassword).color} transition-all duration-300`}
                            style={{ width: `${(calculatePasswordStrength(forgotNewPassword).score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Konfirmasi Password Baru */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:bg-white focus:border-[#43B8BD] focus:ring-2 focus:ring-[#43B8BD]/20 transition-all outline-none pr-12 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {forgotConfirmPassword && (
                      <div className="text-[10px] flex items-center gap-1 font-semibold">
                        {forgotNewPassword === forgotConfirmPassword ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Password cocok
                          </span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Password belum cocok
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="py-3 px-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotToken || forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Simpan Password Baru
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success */}
              {forgotStep === 'success' && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">
                      Password Berhasil Diperbarui!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Akun rumah sakit Anda kini dapat diakses menggunakan password baru.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishReset}
                    className="w-full py-3.5 bg-gradient-to-r from-[#43B8BD] to-[#2FA7A7] hover:from-[#369C9F] hover:to-[#1E6F73] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Masuk ke Portal RS Sekarang
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Person Card - Modern Glassmorphism 2.0 */}
      <motion.a
        href="https://wa.me/6285722784507"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 flex items-center gap-3.5 p-4 bg-white/72 backdrop-blur-[18px] backdrop-saturate-[150%] border border-white/55 rounded-[18px] shadow-[0_12px_35px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.75)] hover:border-white/70 hover:bg-white/80 transition-all duration-300 cursor-pointer group select-none"
        style={{
          maxWidth: 'min(320px, calc(100vw - 32px))'
        }}
        aria-label="Hubungi Contact Person melalui WhatsApp"
      >
        <div className="shrink-0 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/30 transition-all duration-300">
          <svg
            className="w-6 h-6 text-emerald-500 fill-emerald-500 transition-transform duration-300 group-hover:scale-110"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.618-4.955c-.199-.099-1.18-.583-1.362-.649-.182-.065-.315-.099-.447.1-.133.197-.513.649-.629.78-.117.132-.234.148-.432.05-.199-.099-.838-.309-1.597-.984-.589-.526-.989-1.178-1.105-1.376-.117-.198-.012-.305.087-.403.09-.089.199-.232.299-.348.1-.116.133-.197.199-.33.066-.131.033-.247-.017-.348-.05-.1-.447-1.077-.612-1.47-.16-.389-.323-.335-.447-.34-.117-.006-.252-.007-.387-.007a.74.74 0 0 0-.537.25c-.182.197-.696.68-.696 1.658 0 .979.711 1.925.811 2.058.1.132 1.399 2.136 3.39 2.995.474.205.845.328 1.134.42.478.152.914.13 1.258.079.384-.058 1.18-.482 1.347-.946.168-.464.168-.863.118-.946-.05-.084-.183-.133-.38-.232z" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500/90 mb-0.5 leading-none">
            CONTACT PERSON
          </span>
          <span className="font-bold text-[#1E3A8A] text-[13.5px] leading-snug truncate group-hover:text-[#2FA7A7] transition-colors">
            Erma Ermawaty, S. Psi
          </span>
          <span className="font-semibold text-slate-600 text-[12px] leading-none mt-1">
            0857-2278-4507
          </span>
        </div>
      </motion.a>
    </div>
  );
}
