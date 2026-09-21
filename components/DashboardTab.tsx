'use client';

import { SurveySubmission } from '../lib/db';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, Award, ShieldAlert, Heart, TrendingUp, Sparkles, Database } from 'lucide-react';

interface DashboardTabProps {
  submissions: SurveySubmission[];
  isSupabase: boolean;
  namaRs?: string;
}

export default function DashboardTab({ submissions, isSupabase, namaRs }: DashboardTabProps) {
  // If there are no submissions, don't crash
  const totalSubmissions = submissions.length;
  const hospitalDisplayName = namaRs && namaRs.trim() ? namaRs : 'RSUD Al-Mulk';

  // Calculate Average Scores
  const avgOverall = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_keseluruhan || 0), 0) / totalSubmissions) 
    : 0;

  const avgA = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_a || 0), 0) / totalSubmissions) 
    : 0;
  const avgB = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_b || 0), 0) / totalSubmissions) 
    : 0;
  const avgC = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_c || 0), 0) / totalSubmissions) 
    : 0;
  const avgD = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_d || 0), 0) / totalSubmissions) 
    : 0;
  const avgF = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.skor_f || 0), 0) / totalSubmissions) 
    : 0;

  // Data for composite scores chart
  const compositeData = [
    { name: 'Unit Kerja (A)', skor: avgA, fill: '#6366f1' },
    { name: 'Pimpinan (B)', skor: avgB, fill: '#4f46e5' },
    { name: 'Komunikasi (C)', skor: avgC, fill: '#818cf8' },
    { name: 'Pelaporan (D)', skor: avgD, fill: '#3b82f6' },
    { name: `${hospitalDisplayName} (F)`, skor: avgF, fill: '#4338ca' },
  ];

  // Group by Staff Position
  const positionGroups: Record<string, number> = {};
  submissions.forEach(s => {
    const pos = s.posisi_staf || 'Lainnya';
    // Shorten long labels for charts
    const shortPos = pos.length > 25 ? pos.substring(0, 22) + '...' : pos;
    positionGroups[shortPos] = (positionGroups[shortPos] || 0) + 1;
  });

  const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#3b82f6', '#1d4ed8', '#0284c7', '#0369a1'];
  const pieData = Object.entries(positionGroups).map(([name, value], i) => ({
    name,
    value,
    color: COLORS[i % COLORS.length]
  }));

  // Group by Unit and Calculate average
  const unitGroups: Record<string, { total: number; count: number }> = {};
  submissions.forEach(s => {
    const u = s.unit_kerja || 'Lainnya';
    const shortUnit = u.length > 25 ? u.substring(0, 22) + '...' : u;
    if (!unitGroups[shortUnit]) {
      unitGroups[shortUnit] = { total: 0, count: 0 };
    }
    unitGroups[shortUnit].total += s.skor_keseluruhan || 0;
    unitGroups[shortUnit].count += 1;
  });

  const unitData = Object.entries(unitGroups).map(([name, data]) => ({
    name,
    skor: Math.round(data.total / data.count)
  })).sort((a, b) => b.skor - a.skor);

  // Safety status label
  const getSafetyStatus = (score: number) => {
    if (score >= 80) return { label: 'Sangat Baik (Kuat)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-md' };
    if (score >= 60) return { label: 'Baik (Sedang)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-md' };
    if (score >= 40) return { label: 'Cukup (Butuh Perhatian)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-md' };
    return { label: 'Kurang (Prioritas Perbaikan)', color: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-md' };
  };

  const status = getSafetyStatus(avgOverall);

  return (
    <div className="space-y-6">
      {/* Supabase connection alert */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all transform-gpu ${
        isSupabase 
          ? 'bg-[#121826]/90 backdrop-blur-sm border-emerald-500/20 text-emerald-400 shadow-md' 
          : 'bg-[#121826]/90 backdrop-blur-sm border-amber-500/20 text-amber-400 shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center border shadow-sm ${isSupabase ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            <Database className="w-[20px] h-[20px]" />
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-[#F8FAFC]">
              {isSupabase ? 'Koneksi Supabase Cloud Aktif' : 'Berjalan dalam Mode Penyimpanan Lokal (Local Storage)'}
            </h4>
            <p className="text-[12px] text-white/75 mt-0.5 leading-[1.6]">
              {isSupabase 
                ? 'Seluruh data survei tersinkronisasi secara real-time ke database cloud Supabase Anda.' 
                : 'Data disimpan di browser Anda. Hubungkan ke Supabase di tab Pengaturan untuk sinkronisasi cloud.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[14px] text-[#F8FAFC] font-semibold tracking-[0.5px]">Total Responden</span>
            <h3 className="text-[48px] md:text-[56px] font-extrabold text-white drop-shadow-md leading-tight">{totalSubmissions}</h3>
            <span className="text-[12px] text-white/75 leading-[1.6]">Staf RS yang berpartisipasi</span>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-800 to-[#0f172a] border border-white/10 shadow-md flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-[22px] h-[22px]" />
          </div>
        </div>

        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[14px] text-[#F8FAFC] font-semibold tracking-[0.5px]">Rerata Skor Positif</span>
            <h3 className="text-[48px] md:text-[56px] font-extrabold text-white drop-shadow-md leading-tight">{avgOverall}%</h3>
            <span className="text-[12px] text-white/75 leading-[1.6]">Target kelulusan akreditasi {'>'}70%</span>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-800 to-[#0f172a] border border-white/10 shadow-md flex items-center justify-center text-emerald-400 shrink-0">
            <Award className="w-[22px] h-[22px]" />
          </div>
        </div>

        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[14px] text-[#F8FAFC] font-semibold tracking-[0.5px]">Predikat Budaya RS</span>
            <div className={`text-[12px] px-3 py-1 rounded-full font-bold border mt-2 w-fit ${status.color}`}>
              {status.label}
            </div>
            <span className="text-[12px] text-white/75 leading-[1.6] mt-2 block">Berdasarkan skor AHRQ</span>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-800 to-[#0f172a] border border-white/10 shadow-md flex items-center justify-center text-emerald-400 shrink-0">
            <Heart className="w-[22px] h-[22px]" />
          </div>
        </div>

        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15 flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <span className="text-[14px] text-[#F8FAFC] font-semibold tracking-[0.5px]">Kekuatan Utama</span>
            <h3 className="text-[18px] md:text-[20px] font-extrabold text-white md:truncate md:max-w-[160px] whitespace-normal break-words mt-2 drop-shadow-md">
              {avgB >= avgA && avgB >= avgC ? 'Kepemimpinan (B)' : avgC >= avgA ? 'Komunikasi (C)' : 'Kerja Sama (A)'}
            </h3>
            <span className="text-[12px] text-cyan-400 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-[14px] h-[14px]" /> Skor Tertinggi
            </span>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-800 to-[#0f172a] border border-white/10 shadow-md flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-[22px] h-[22px]" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composite Score Bar Chart */}
        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15">
          <div className="mb-4">
            <h4 className="text-[16px] md:text-[18px] font-semibold tracking-[0.5px] text-[#F8FAFC]">Skor Budaya Keselamatan Pasien per Bagian (%)</h4>
            <p className="text-[14px] text-white/75 leading-[1.6]">Rerata persentase tanggapan positif berdasarkan dimensi kuesioner AHRQ 2.0</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compositeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Skor Positif']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                <Bar isAnimationActive={false} dataKey="skor" radius={[4, 4, 0, 0]}>
                  {compositeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Units Performance */}
        <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-[16px] md:text-[18px] font-semibold tracking-[0.5px] text-[#F8FAFC]">Skor Budaya Keselamatan per Unit Kerja</h4>
              <p className="text-[14px] text-white/75 leading-[1.6]">Peringkat unit berdasarkan rerata skor positif keseluruhan</p>
            </div>
            {unitData.length > 0 ? (
              <div className="space-y-4">
                {unitData.slice(0, 4).map((unit, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-start text-sm gap-2">
                      <span className="font-medium text-slate-300 md:truncate md:max-w-[240px] whitespace-normal break-words flex-1">{unit.name}</span>
                      <span className="font-bold text-white shrink-0 mt-0.5">{unit.skor}%</span>
                    </div>
                    <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full shadow-md ${
                          unit.skor >= 80 ? 'bg-emerald-500' : unit.skor >= 60 ? 'bg-cyan-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${unit.skor}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/50 text-[14px]">Belum ada data unit kerja.</div>
            )}
          </div>
          <span className="text-[12px] text-white/50 italic block mt-6">Kriteria: Kuat ({'>'}75%), Sedang (50-75%), Lemah ({'<'}50%)</span>
        </div>
      </div>

      {/* Demographics / Pie Chart */}
      <div className="p-6 bg-[#121826]/90 backdrop-blur-sm border border-white/[0.08] shadow-md hover:border-white/15">
        <div className="mb-6">
          <h4 className="text-[16px] md:text-[18px] font-semibold tracking-[0.5px] text-[#F8FAFC]">Distribusi Responden Berdasarkan Posisi Staf</h4>
          <p className="text-[14px] text-white/75 leading-[1.6]">Komposisi profesi staf medis dan non-medis yang telah mengisi kuesioner</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-60 flex justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(0,0,0,0.2)"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center text-white/50 text-[14px]">Belum ada data responden.</div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition-colors">
                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: entry.color }} />
                <div className="min-w-0">
                  <p className="text-[13px] text-slate-200 font-medium md:truncate whitespace-normal break-words" title={entry.name}>{entry.name}</p>
                  <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">{entry.value} Responden</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

