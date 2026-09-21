'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  BarChart2, ShieldAlert, Award, TrendingUp, Info, Activity,
  Calendar, Building2, BrainCircuit, Lightbulb, FileText, Download, CheckCircle2,
  ListFilter
} from 'lucide-react';
import { SurveyData, isSurveyResponse } from '../lib/db';
import { computeDimensionScores } from '../lib/scoring';

interface GrafikTabProps {
  surveys: SurveyData[];
  namaRs?: string;
  activeBenchmarkLabel?: string;
}

function extractYear(tanggalStr?: string): string {
  if (!tanggalStr) return new Date().getFullYear().toString();
  
  // Try finding a 4-digit number that starts with 20 or 19 (e.g., 2026, 2025)
  const match = tanggalStr.match(/\b(20\d{2}|19\d{2})\b/);
  if (match) return match[1];

  // Fallback 1: split by spaces and check the last element
  const partsBySpace = tanggalStr.trim().split(/\s+/);
  const lastPart = partsBySpace[partsBySpace.length - 1];
  if (lastPart && !isNaN(Number(lastPart)) && lastPart.length === 4) {
    return lastPart;
  }

  // Fallback 2: split by dash
  const partsByDash = tanggalStr.split('-');
  if (partsByDash[0] && !isNaN(Number(partsByDash[0])) && partsByDash[0].length === 4) {
    return partsByDash[0];
  }

  return new Date().getFullYear().toString();
}

function generateAHRQReport(combinedData: any[], mode: 'Tunggal' | 'Perbandingan', tahun1: string, tahun2: string) {
  const getScore = (d: any) => mode === 'Tunggal' ? d['Capaian'] : d['Tahun 2'];
  const sortedData = [...combinedData].sort((a, b) => getScore(b) - getScore(a));
  
  const strengths = sortedData.filter(d => getScore(d) >= 75);
  const moderates = sortedData.filter(d => getScore(d) >= 50 && getScore(d) < 75);
  const weaknesses = sortedData.filter(d => getScore(d) < 50);

  const averageScore = combinedData.length > 0 
    ? (combinedData.reduce((acc, curr) => acc + getScore(curr), 0) / combinedData.length).toFixed(1) 
    : '0';

  let analisis = '';
  let rekomendasi: string[] = [];

  if (mode === 'Tunggal') {
    analisis += `<strong>LAPORAN ANALISIS BUDAYA KESELAMATAN PASIEN (AHRQ SOPS 2.0) - PERIODE TAHUN ${tahun1}</strong><br/><br/>`;
    analisis += `Berdasarkan hasil kalkulasi algoritma dari data survei yang dimasukkan, rata-rata tingkat budaya keselamatan rumah sakit saat ini berada pada angka <strong>${averageScore}%</strong>. Menurut kriteria evaluasi standar <strong>AHRQ SOPS Versi 2.0</strong>, dimensi budaya keselamatan diklasifikasikan menjadi tiga tingkatan: kekuatan utama (skor positif ≥ 75%), area perlu pemantauan (50% - 74%), dan area prioritas kritis (< 50%). Hasil evaluasi otomatis untuk fasyankes Anda adalah sebagai berikut:<br/><br/>`;
    
    // Strengths
    if (strengths.length > 0) {
      analisis += `<strong class="text-emerald-400">1. KEKUATAN UTAMA (Skor ≥ 75%):</strong><br/>`;
      analisis += `Terdapat <strong>${strengths.length} dimensi</strong> yang telah mencapai kriteria kekuatan budaya keselamatan unggulan:<br/>`;
      strengths.forEach(s => {
        analisis += `• <strong>${s.dimensiSingkat}</strong> (${getScore(s).toFixed(1)}%): ${s.d1.interpretasi}<br/>`;
      });
      analisis += `<br/>`;
    } else {
      analisis += `<strong class="text-slate-400">1. KEKUATAN UTAMA (Skor ≥ 75%):</strong><br/>Saat ini belum ada dimensi yang mencapai kriteria kekuatan unggulan (≥ 75%). Area ini memerlukan pembinaan intensif secara konsisten.<br/><br/>`;
    }

    // Areas to Monitor
    if (moderates.length > 0) {
      analisis += `<strong class="text-cyan-400">2. AREA PEMANTAUAN (Skor 50% - 74%):</strong><br/>`;
      analisis += `Sebanyak <strong>${moderates.length} dimensi</strong> berada dalam rentang sedang. Aspek ini cukup stabil namun rentan mengalami penurunan jika tidak dipantau secara berkala:<br/>`;
      moderates.forEach(m => {
        analisis += `• <strong>${m.dimensiSingkat}</strong> (${getScore(m).toFixed(1)}%): ${m.d1.interpretasi}<br/>`;
      });
      analisis += `<br/>`;
    }

    // Weaknesses / Priority
    if (weaknesses.length > 0) {
      analisis += `<strong class="text-rose-400">3. AREA PRIORITAS KRITIS (Skor < 50%):</strong><br/>`;
      analisis += `Terdapat <strong>${weaknesses.length} dimensi kritis</strong> yang teridentifikasi di bawah batas aman dan memerlukan tindakan perbaikan mendesak dari manajemen:<br/>`;
      weaknesses.forEach(w => {
        analisis += `• <strong>${w.dimensiSingkat}</strong> (${getScore(w).toFixed(1)}%): <strong class="text-rose-300">${w.d1.interpretasi}</strong><br/>`;
      });
    } else {
      analisis += `<strong class="text-emerald-400">3. AREA PRIORITAS KRITIS (Skor < 50%):</strong><br/>Hasil yang sangat baik, tidak ada dimensi kritis yang berada di bawah skor 50%.<br/>`;
    }

    // Recommendations
    if (weaknesses.length > 0) {
      weaknesses.slice(0, 3).forEach(w => {
        rekomendasi.push(`Fokuskan intervensi strategis pada **${w.dimensiSingkat}** (${getScore(w).toFixed(1)}%) melalui penyusunan Standard Operating Procedure (SOP) yang lebih suportif dan pelatihan khusus tim terkait.`);
      });
    }
    if (moderates.length > 0) {
      moderates.slice(0, 2).forEach(m => {
        rekomendasi.push(`Pertahankan tren positif pada **${m.dimensiSingkat}** (${getScore(m).toFixed(1)}%) dengan meningkatkan frekuensi supervisi manajerial dan pemberian *reward* (penghargaan) bagi kepatuhan staf.`);
      });
    }
    if (rekomendasi.length < 4) {
      rekomendasi.push(`Jadwalkan program rutin **'Safety Walkround' (Ronde Keselamatan)** oleh jajaran direksi untuk meningkatkan keterlibatan langsung pimpinan pada unit layanan operasional.`);
      rekomendasi.push(`Terapkan prinsip **'Just Culture' (Budaya Adil)** dalam penanganan insiden untuk meningkatkan keberanian staf dalam melapor tanpa ketakutan terhadap sanksi punitif.`);
    }
  } else {
    // Perbandingan mode
    analisis += `<strong>LAPORAN ANALISIS KOMPARATIF BUDAYA KESELAMATAN (AHRQ SOPS 2.0) - PERBANDINGAN TAHUN ${tahun1} VS ${tahun2}</strong><br/><br/>`;
    analisis += `Analisis komparatif mengukur tingkat efektivitas program intervensi mutu yang telah dijalankan oleh rumah sakit dengan membandingkan data survei Tahun ${tahun1} dan Tahun ${tahun2}.<br/><br/>`;

    const compared = combinedData.map(d => ({
      ...d,
      diff: d['Tahun 2'] - d['Tahun 1']
    })).sort((a, b) => b.diff - a.diff);

    const improved = compared.filter(d => d.diff > 0);
    const declined = compared.filter(d => d.diff < 0);

    if (improved.length > 0) {
      analisis += `<strong class="text-emerald-400">1. TREN PENINGKATAN KINERJA (POSITIF):</strong><br/>`;
      improved.slice(0, 3).forEach(imp => {
        analisis += `• <strong>${imp.dimensiSingkat}</strong>: Kinerja naik dari **${imp['Tahun 1'].toFixed(1)}%** ke **${imp['Tahun 2'].toFixed(1)}%** (<span class="text-emerald-400 font-bold">+${imp.diff.toFixed(1)}%</span>)<br/>`;
      });
      analisis += `Peningkatan ini merefleksikan keberhasilan program peningkatan mutu dan kepatuhan staf dalam menerapkan budaya keselamatan yang lebih baik pada aspek tersebut.<br/><br/>`;
    }

    if (declined.length > 0) {
      analisis += `<strong class="text-rose-400">2. TREN PENURUNAN KINERJA (NEGATIF):</strong><br/>`;
      declined.reverse().slice(0, 3).forEach(dec => {
        analisis += `• <strong>${dec.dimensiSingkat}</strong>: Kinerja merosot dari **${dec['Tahun 1'].toFixed(1)}%** ke **${dec['Tahun 2'].toFixed(1)}%** (<span class="text-rose-300 font-bold">${dec.diff.toFixed(1)}%</span>)<br/>`;
      });
      analisis += `Penurunan capaian ini mengindikasikan adanya kendala struktural maupun operasional yang mendesak untuk diinvestigasi (seperti burnout, peningkatan beban kerja, atau miskomunikasi antar unit).<br/><br/>`;
    }

    analisis += `<strong class="text-cyan-400">3. REKOMENDASI MANAJERIAL STRATEGIS:</strong><br/>`;
    analisis += `Berdasarkan analisis pergerakan skor antar periode, manajemen perlu merumuskan langkah korektif segera pada aspek yang melemah, serta mereplikasi praktik baik pada aspek yang menunjukkan peningkatan.`;

    if (declined.length > 0) {
      rekomendasi.push(`Laksanakan RCA (Root Cause Analysis) pada dimensi **${declined[0].dimensiSingkat}** yang mengalami kemerosotan kinerja tajam (${declined[0].diff.toFixed(1)}%) dalam periode ini.`);
    }
    if (improved.length > 0) {
      rekomendasi.push(`Dokumentasikan dan replikasikan pedoman/praktik keberhasilan dari dimensi **${improved[0].dimensiSingkat}** (+${improved[0].diff.toFixed(1)}%) sebagai *benchmark* internal bagi unit lain.`);
    }
    rekomendasi.push(`Optimalkan sistem pelaporan insiden daring yang responsif, anonim, dan berpusat pada perbaikan sistem (bukan menyalahkan individu).`);
    rekomendasi.push(`Selenggarakan program penyegaran (refreshment) kompetensi komunikasi efektif (misalnya teknik SBAR) antar unit secara terjadwal untuk mencegah miskomunikasi kritis.`);
  }

  return { analisis, rekomendasi };
}

export default function GrafikTab({ surveys, namaRs, activeBenchmarkLabel = "RS Uji Coba" }: GrafikTabProps) {
  const rsName = namaRs || 'Rumah Sakit';
  const actualSurveys = useMemo(() => surveys.filter(s => isSurveyResponse(s) && s.id !== 'MASTER_BENCHMARK'), [surveys]);

  const actualDataYears = useMemo(() => {
    const years = new Set<string>();
    actualSurveys.forEach(s => {
      if (s.tanggalInput) {
        const y = extractYear(s.tanggalInput);
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [actualSurveys]);

  const allSelectableYears = useMemo(() => {
    const years = new Set<string>([...actualDataYears]);
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 3; i++) {
      years.add(i.toString());
    }
    years.add('2025');
    years.add('2026');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [actualDataYears]);

  const [mode, setMode] = useState<'Tunggal' | 'Perbandingan'>('Tunggal');
  const currentYear = new Date().getFullYear().toString();
  
  // Use actualDataYears to default to a year that actually has data
  const [tahun1, setTahun1] = useState<string>(actualDataYears[0] || currentYear);
  const [tahun2, setTahun2] = useState<string>(actualDataYears[1] || actualDataYears[0] || currentYear);

  const masterBenchmarkData = useMemo(() => {
    const mb = surveys.find(s => s.id === 'MASTER_BENCHMARK');
    return mb ? (mb.dimensiScores as any) : undefined;
  }, [surveys]);

  const dataTahun1 = useMemo(() => computeDimensionScores(actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun1), masterBenchmarkData), [actualSurveys, tahun1, masterBenchmarkData]);
  const dataTahun2 = useMemo(() => computeDimensionScores(actualSurveys.filter(s => extractYear(s.tanggalInput) === tahun2), masterBenchmarkData), [actualSurveys, tahun2, masterBenchmarkData]);

  const combinedData = useMemo(() => {
    return dataTahun1.map((d1, i) => {
      const d2 = dataTahun2[i];
      return {
        dimensiSingkat: d1.nama,
        kode: d1.kode,
        'Capaian': parseFloat(d1.percentage.toFixed(2)),
        'Tahun 1': parseFloat(d1.percentage.toFixed(2)),
        'Tahun 2': parseFloat(d2.percentage.toFixed(2)),
        'BenchmarkMin': d1.benchmarkMin,
        'BenchmarkMax': d1.benchmarkMax,
        id: d1.id, d1, d2
      };
    });
  }, [dataTahun1, dataTahun2]);

  const localReport = useMemo(() => {
    return generateAHRQReport(combinedData, mode, tahun1, tahun2);
  }, [combinedData, mode, tahun1, tahun2]);

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

    return [
      { kategori: 'Sangat Baik', [rsName]: getPct(counts[5]), [activeBenchmarkLabel]: 28 },
      { kategori: 'Baik', [rsName]: getPct(counts[4]), [activeBenchmarkLabel]: 39 },
      { kategori: 'Cukup', [rsName]: getPct(counts[3]), [activeBenchmarkLabel]: 23 },
      { kategori: 'Kurang', [rsName]: getPct(counts[2]), [activeBenchmarkLabel]: 9 },
      { kategori: 'Sangat Kurang', [rsName]: getPct(counts[1]), [activeBenchmarkLabel]: 1 },
    ];
  }, [actualSurveys, tahun1, tahun2, mode, rsName, activeBenchmarkLabel]);

  const E1Tooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl text-xs space-y-3 min-w-[200px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center" style={{ color: p.color }}>
              <span className="font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span> 
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

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload.d1;
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl text-xs space-y-3 min-w-[200px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-2">{payload[0].payload.dimensiSingkat}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-emerald-600">
              <span className="font-medium flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Positive Response:</span>
              <strong className="text-sm">{data.percentage.toFixed(2)}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-medium flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Neutral Response:</span>
              <strong>{data.neutralPercentage.toFixed(2)}%</strong>
            </div>
            <div className="flex justify-between items-center text-rose-500">
              <span className="font-medium flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Negative Response:</span>
              <strong>{data.negativePercentage.toFixed(2)}%</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-blue-600 font-bold">
            <span>Nilai Dimensi:</span>
            <span>{data.komposit.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (actualSurveys.length === 0) {
    return (
      <div className="p-12 bg-white/[0.07] border border-white/10 rounded-[24px] shadow-sm text-center space-y-4 max-w-xl mx-auto my-12 backdrop-blur-sm">
        <BarChart2 className="w-12 h-12 text-slate-500 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-slate-200">Belum Ada Data Survei</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Silakan masukkan respon survei terlebih dahulu pada menu <strong>Input Data Survei</strong> untuk memvisualisasikan Business Intelligence Dashboard.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6 pb-20 p-6 -m-6 rounded-[24px]">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-[24px] shadow-lg shadow-blue-500/5">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 via-teal-600 to-indigo-700 bg-clip-text text-transparent tracking-tight">Analisa Grafik Budaya Keselamatan Pasien</h1>
          <p className="text-sm text-slate-500 mt-1">Visualisasi capaian seluruh dimensi Survei Budaya Keselamatan Pasien AHRQ SOPS Version 2.0.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span className="text-slate-700">{mode === 'Tunggal' ? `Periode ${tahun1}` : `Perbandingan ${tahun1} vs ${tahun2}`}</span>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-[24px] shadow-lg shadow-blue-500/5 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ListFilter className="w-3 h-3 text-teal-600" /> Mode Analisis
            </label>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setMode('Tunggal')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all transform-gpu ${mode === 'Tunggal' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Periode Tunggal</button>
              <button onClick={() => setMode('Perbandingan')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all transform-gpu ${mode === 'Perbandingan' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Perbandingan Periode</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-600" /> {mode === 'Tunggal' ? 'Periode Tahun' : 'Tahun Pertama'}
            </label>
            <select value={tahun1} onChange={e => setTahun1(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-teal-500 outline-none w-32 [&>option]:bg-white">
              {allSelectableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {mode === 'Perbandingan' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" /> Tahun Kedua
              </label>
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
          Hasil Perbandingan Pengukuran Dimensi Untuk {rsName}
        </h3>
        <div className="w-full text-xs font-medium">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 w-10 text-center align-bottom">No.</th>
                  <th className="p-3 w-64 align-bottom">Komponen Budaya<br/>Keselamatan Pasien</th>
                  <th className="p-3 align-bottom text-center">Persentase Respons Positif</th>
                  <th className="p-3 w-40 text-center border-l border-slate-200">
                    <div>Rata-rata RS Percontohan<br/>(% Respons Positif)</div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-150 text-teal-600">
                      <span className="w-1/2 text-center">MIN</span>
                      <span className="w-1/2 text-center border-l border-slate-150">MAX</span>
                    </div>
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
                      <td className="p-0 border-l border-slate-200 text-center font-bold text-slate-700 text-sm align-middle bg-slate-50">
                        <div className="flex h-full items-center justify-center min-h-[60px]">
                          <span className="w-1/2 py-2">{row.d1.benchmarkMin}%</span>
                          <span className="w-1/2 py-2 border-l border-slate-150">{row.d1.benchmarkMax}%</span>
                        </div>
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
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 md:p-8 rounded-[24px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] hover:shadow-[0_25px_60px_rgba(15,23,42,0.22)] transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-600" />
          Perbandingan Penilaian Keselamatan Pasien
        </h3>
        <p className="text-sm text-slate-500 mb-8">Bagaimana Anda menilai tingkat keselamatan pasien di unit kerja Anda? (Butir E1)</p>
        
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={e1Stats} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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
              <Bar isAnimationActive={false} dataKey={rsName} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} filter="url(#shadow-raised)">
                <LabelList dataKey={rsName} position="top" formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} fill="#059669" fontSize={11} fontWeight="bold" />
                {e1Stats.map((entry, index) => (
                  <Cell key={`cell-rs-${index}`} fill="#10b981" />
                ))}
              </Bar>
              <Bar isAnimationActive={false} dataKey={activeBenchmarkLabel} fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} filter="url(#shadow-raised)">
                <LabelList dataKey={activeBenchmarkLabel} position="top" formatter={(val: number) => `${Number(Number(val || 0).toFixed(1)).toLocaleString('id-ID')}%`} fill="#475569" fontSize={11} fontWeight="bold" />
                {e1Stats.map((entry, index) => (
                  <Cell key={`cell-bp-${index}`} fill="#64748b" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 md:p-8 rounded-[24px] shadow-lg shadow-blue-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -z-10 -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-teal-600" /> Analisis Otomatis
          </h3>
          <div className="prose prose-sm max-w-none text-slate-600 text-xs">
            <div className="space-y-4">
              <div dangerouslySetInnerHTML={{ __html: localReport.analisis }} className="leading-relaxed space-y-2 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 md:p-8 rounded-[24px] shadow-lg shadow-blue-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -z-10 -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-teal-600" /> Rekomendasi Peningkatan
          </h3>
          <div className="prose prose-sm max-w-none text-slate-600">
            <div className="space-y-4 text-xs">
              <p className="font-semibold text-slate-700 flex items-center justify-between gap-2 m-0 p-0">
                <span>Berdasarkan hasil kuesioner budaya keselamatan pasien {rsName} (AHRQ SOPS 2.0), berikut rekomendasi tindak lanjut strategis:</span>
              </p>
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <ul className="space-y-3 text-slate-600 list-none m-0 p-0">
                  {localReport.rekomendasi.map((rec, idx) => (
                    <li key={idx} className="flex gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ 
                        __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-800 font-bold">$1</strong>') 
                      }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 px-2 pt-4">
        <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
        <span>AHRQ SOPS 2.0 BI Dashboard - {rsName}</span>
      </div>
    </motion.div>
  );
}
