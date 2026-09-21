'use client';

import { useState } from 'react';
import { UserPlus, ArrowLeft, ShieldCheck, Mail, Phone, MapPin, User, FileText, Lock, CheckCircle2, Database, Copy, Check } from 'lucide-react';
import { createHospitalAccount } from '../lib/db';

interface RegisterScreenProps {
  onBack: () => void;
  onRegisterSuccess: (hospital: { username: string; kodeRs: string; namaRs: string }) => void;
}

export default function RegisterScreen({ onBack, onRegisterSuccess }: RegisterScreenProps) {
  const [namaRs, setNamaRs] = useState('');
  const [kodeRs, setKodeRs] = useState('');
  const [alamatRs, setAlamatRs] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kotaKab, setKotaKab] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [emailRs, setEmailRs] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sqlMigration = `ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS kode_rs TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS provinsi TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS kota_kab TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS penanggung_jawab TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS no_whatsapp TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS email_rs TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.hospital_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.hospital_accounts ALTER COLUMN kode_rs DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_notifications (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigration);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 1. Validasi semua data wajib
    if (!namaRs || !alamatRs || !provinsi || !kotaKab || !penanggungJawab || !jabatan || !noWhatsapp || !emailRs || !username || !password || !confirmPassword) {
      setError('Semua field wajib diisi kecuali Kode Rumah Sakit.');
      return;
    }

    // 2. Validasi Panjang Password dan Kekuatan Password
    if (password.length < 6) {
      setError('Password harus memiliki panjang minimal 6 karakter.');
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password harus mengandung minimal 1 huruf besar (kapital), 1 huruf kecil, dan 1 angka untuk keamanan fasyankes Anda.');
      return;
    }

    // 3. Validasi Konfirmasi Password
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    setLoading(true);

    try {
      // 4. Buat akun dengan status 'Pending' secara default
      await createHospitalAccount({
        username: username.trim().toLowerCase(),
        kodeRs: kodeRs.trim() || undefined,
        namaRs: namaRs.trim(),
        alamatRs: alamatRs.trim(),
        password: password,
        provinsi: provinsi.trim(),
        kotaKab: kotaKab.trim(),
        penanggungJawab: penanggungJawab.trim(),
        jabatan: jabatan.trim(),
        noWhatsapp: noWhatsapp.trim(),
        emailRs: emailRs.trim().toLowerCase(),
        status: 'Pending'
      });

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Gagal mendaftarkan akun ke database Supabase.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-transparent text-slate-800 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Decorative ambient glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-xl bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white/30 p-10 text-center space-y-6 relative overflow-hidden group">
        {/* Shine effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-[24px] border border-white/40 shadow-[0_12px_32px_rgba(20,184,166,0.35)] ring-1 ring-white/40 flex items-center justify-center relative z-10">
          <CheckCircle2 className="w-14 h-14" />
        </div>

        <div className="space-y-3 relative z-10">
          <h2 className="text-3xl font-sans font-black text-slate-900 tracking-tight leading-tight">Registrasi Berhasil <br/> Dikirim</h2>
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 text-teal-700 font-black text-[10px] uppercase tracking-widest border border-teal-500/20">Status Akun: Pending Approval</p>
        </div>

        <div className="p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 text-left text-[13px] text-slate-700 leading-relaxed space-y-4 relative z-10 shadow-inner">
          <p className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider text-[11px]">
            📢 Informasi Penting:
          </p>
          <p className="font-sans font-bold italic">
            Permohonan Anda sedang menunggu persetujuan <strong className="text-teal-700">Admin Pusat</strong>. Anda akan menerima email pemberitahuan setelah akun disetujui.
          </p>
          <div className="border-t border-white/40 pt-4 text-[11px] text-slate-600 space-y-2">
            <p className="flex justify-between border-b border-white/20 pb-1.5"><span className="font-bold opacity-60 uppercase tracking-tighter">Nama Rumah Sakit:</span> <span className="font-black text-slate-900">{namaRs}</span></p>
            <p className="flex justify-between border-b border-white/20 pb-1.5"><span className="font-bold opacity-60 uppercase tracking-tighter">Email Terdaftar:</span> <span className="font-black text-slate-900">{emailRs}</span></p>
            <p className="flex justify-between"><span className="font-bold opacity-60 uppercase tracking-tighter">Username:</span> <span className="font-black text-slate-900">{username}</span></p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-4 bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-[0_12px_24px_rgba(20,184,166,0.3)] hover:shadow-[0_15px_30px_rgba(20,184,166,0.45)] hover:-translate-y-0.5 transition-all active:scale-[0.98] cursor-pointer relative z-10"
        >
          Kembali ke Login Portal
        </button>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative ambient glows */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />
      
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={loading}
        className="absolute top-6 left-6 text-slate-500 hover:text-teal-600 flex items-center gap-2 text-sm font-bold transition-all transform-gpu cursor-pointer disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Login
      </button>

      <div className="w-full max-w-3xl bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white/30 p-10 my-8 relative overflow-hidden group">
        {/* Shine effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

        <div className="text-center space-y-2 mb-8 relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-[20px] border border-white/40 shadow-[0_8px_24px_rgba(20,184,166,0.3)] ring-1 ring-white/40 flex items-center justify-center mb-4 overflow-hidden relative group/icon">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/icon:opacity-100 transition-opacity"></div>
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-sans font-black text-slate-850 tracking-tight">Daftar Akun Rumah Sakit</h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Daftarkan fasyankes Anda untuk mengukur budaya keselamatan pasien</p>
        </div>

        <div className="relative z-10">
          {error && (
            <div className="mb-6 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-2xl text-[11px] text-red-600 text-center font-black uppercase tracking-tight">
                ⚠️ {error}
              </div>

              {(error.toLowerCase().includes('schema cache') || 
                error.toLowerCase().includes('column') || 
                error.toLowerCase().includes('approval_date') || 
                error.toLowerCase().includes('relation') || 
                error.toLowerCase().includes('email_notifications') ||
                error.toLowerCase().includes('does not exist')) && (
                <div className="p-6 bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl space-y-5 text-left shadow-inner">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">Diperlukan Update Skema Database Supabase</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Sistem mendeteksi bahwa database Supabase Anda belum memiliki kolom baru untuk persetujuan akun & notifikasi email. Silakan jalankan kueri SQL di bawah ini untuk memperbarui database Anda secara instan:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">
                      <span>MIGRASI SQL (Salin & Jalankan di Supabase SQL Editor):</span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-black rounded-lg transition-all transform-gpu cursor-pointer text-[10px] uppercase tracking-wider shadow-md shadow-teal-600/20"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Salin SQL
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-mono text-teal-300 overflow-x-auto max-h-48 leading-relaxed select-all custom-scrollbar shadow-2xl">
                      {sqlMigration}
                    </pre>
                  </div>

                  <div className="p-4 bg-white/50 rounded-2xl border border-white/60 text-[11px] text-slate-700 space-y-2 leading-relaxed shadow-sm">
                    <p className="font-black text-slate-900 uppercase tracking-wider">🛠️ Langkah Mudah Update Database:</p>
                    <div className="space-y-1 font-bold">
                      <p>1. Masuk ke dashboard <strong className="text-blue-600">Supabase</strong> Anda.</p>
                      <p>2. Pilih proyek Anda, lalu klik menu <strong className="text-blue-600">SQL Editor</strong> di bilah sisi kiri.</p>
                      <p>3. Klik <strong>New Query</strong>, tempel (paste) kode SQL yang disalin di atas.</p>
                      <p>4. Klik tombol <strong>Run</strong> (atau tekan Ctrl+Enter / Cmd+Enter).</p>
                    </div>
                    <p className="text-teal-700 font-black pt-1 flex items-center gap-1.5 uppercase tracking-tight">✓ Selesai! Setelah itu, silakan klik ulang tombol pendaftaran di bawah.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* BAGIAN 1: Identitas Rumah Sakit */}
            <div className="space-y-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700 flex items-center gap-2 border-b border-white/40 pb-2.5">
                <MapPin className="w-4 h-4" /> 1. Identitas Rumah Sakit
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nama Rumah Sakit <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="cth: RSUD Al-Mulk"
                    value={namaRs}
                    onChange={e => setNamaRs(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kode Rumah Sakit <span className="text-slate-400 text-[9px] font-bold lowercase tracking-normal">(Opsional)</span></label>
                  <input
                    type="text"
                    placeholder="cth: RS320401"
                    value={kodeRs}
                    onChange={e => setKodeRs(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Alamat Rumah Sakit <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="cth: Jl. Pramuka No. 12, Kota Bengkulu"
                  value={alamatRs}
                  onChange={e => setAlamatRs(e.target.value)}
                  className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Provinsi <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Bengkulu"
                    value={provinsi}
                    onChange={e => setProvinsi(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kota / Kabupaten <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Kota Bengkulu"
                    value={kotaKab}
                    onChange={e => setKotaKab(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN 2: Penanggung Jawab & Kontak */}
            <div className="space-y-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700 flex items-center gap-2 border-b border-white/40 pb-2.5">
                <User className="w-4 h-4" /> 2. Penanggung Jawab & Kontak
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nama Penanggung Jawab <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="cth: dr. Ahmad Fauzi"
                    value={penanggungJawab}
                    onChange={e => setPenanggungJawab(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Jabatan <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Kepala Bidang Pelayanan Medik"
                    value={jabatan}
                    onChange={e => setJabatan(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nomor WhatsApp <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="cth: 081234567890"
                    value={noWhatsapp}
                    onChange={e => setNoWhatsapp(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Resmi RS <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="cth: info@rsudalmulk.com"
                    value={emailRs}
                    onChange={e => setEmailRs(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN 3: Kredensial Akun */}
            <div className="space-y-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700 flex items-center gap-2 border-b border-white/40 pb-2.5">
                <Lock className="w-4 h-4" /> 3. Kredensial Akun Portal
              </h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username Rumah Sakit <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="cth: rsudalmulk (digunakan untuk login)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter, huruf & angka"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Konfirmasi Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white font-black uppercase tracking-[0.2em] rounded-2xl text-xs shadow-[0_12px_24px_rgba(20,184,166,0.3)] hover:shadow-[0_15px_30px_rgba(20,184,166,0.45)] hover:-translate-y-0.5 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memproses Registrasi...
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" /> Daftar Akun Rumah Sakit
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
