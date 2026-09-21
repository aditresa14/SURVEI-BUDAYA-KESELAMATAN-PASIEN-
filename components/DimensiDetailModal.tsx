'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Activity, BookOpen, Info, Users, BarChart3, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { SurveyData } from '../lib/db';

interface DimensiDetailModalProps {
  dimensiId: string;
  onClose: () => void;
  surveys: SurveyData[];
  rsName: string;
}

const DIMENSI_INFO: { [key: string]: { nama: string; kode: string; totalPertanyaan: number; deskripsi: string; interpretasi: string; rekomendasi: string[] } } = {
  d7: { nama: 'Komunikasi Tentang Kesalahan', kode: 'D7', totalPertanyaan: 3, deskripsi: 'Seberapa sering staf diberi informasi tentang kesalahan yang terjadi dan mendiskusikan cara untuk mencegahnya kembali.', interpretasi: 'Kesalahan harus dibahas secara terbuka dan konstruktif agar semua anggota tim dapat belajar.', rekomendasi: ['Bahas insiden dalam briefing rutin', 'Informasikan tindak lanjut dari insiden yang lalu', 'Lakukan diskusi proaktif tentang potensi bahaya'] },
  d6: { nama: 'Keterbukaan Komunikasi', kode: 'D6', totalPertanyaan: 4, deskripsi: 'Seberapa berani staf angkat bicara ketika melihat sesuatu yang berisiko membahayakan pasien atau ketika melihat pimpinan klinis melakukan tindakan yang kurang aman.', interpretasi: 'Komunikasi terbuka mencegah bahaya. Skor rendah berarti staf takut menyanggah atasan atau dokter.', rekomendasi: ['Dorong staf untuk berani speak up', 'Gunakan teknik komunikasi terstandar (SBAR dll)', 'Lindungi staf yang melaporkan masalah keselamatan'] },
  d10: { nama: 'Serah Terima dan Pertukaran Informasi', kode: 'D10', totalPertanyaan: 3, deskripsi: 'Kelancaran transfer informasi penting tentang perawatan pasien antar unit, serta pergantian giliran kerja (shift).', interpretasi: 'Titik rawan kesalahan sering terjadi saat pergantian shift atau transfer pasien antar unit.', rekomendasi: ['Gunakan formulir serah terima terstandar', 'Lakukan serah terima di samping pasien (bedside handover)', 'Pastikan tidak ada interupsi saat serah terima'] },
  d9: { nama: 'Dukungan Manajemen Rumah Sakit Untuk Keselamatan Pasien', kode: 'D9', totalPertanyaan: 3, deskripsi: 'Seberapa kuat komitmen dan alokasi sumber daya oleh pihak manajemen puncak rumah sakit dalam memprioritaskan keselamatan pasien.', interpretasi: 'Manajemen puncak memegang kendali atas sumber daya. Tanpa dukungan mereka, program keselamatan akan tersendat.', rekomendasi: ['Direksi harus melakukan safety walkaround rutin', 'Alokasikan anggaran khusus untuk keselamatan', 'Jadikan keselamatan sebagai agenda utama rapat direksi'] },
  d3: { nama: 'Pembelajaran Organisasi - Peningkatan Berkelanjutan', kode: 'D3', totalPertanyaan: 2, deskripsi: 'Keaktifan unit dalam mengevaluasi prosedur kerja secara berkala serta menguji efektivitas perbaikan untuk keselamatan.', interpretasi: 'Menandakan sejauh mana unit belajar dari pengalaman dan proaktif melakukan perbaikan sistem secara berkelanjutan.', rekomendasi: ['Lakukan evaluasi pasca insiden', 'Sosialisasikan hasil perbaikan ke seluruh staf', 'Buat forum berbagi pelajaran (lessons learned)'] },
  d8: { nama: 'Melaporkan Kejadian Keselamatan Pasien', kode: 'D8', totalPertanyaan: 2, deskripsi: 'Seberapa sering kejadian tidak diharapkan atau nyaris cedera dilaporkan secara sukarela oleh staf.', interpretasi: 'Tingkat pelaporan yang tinggi menunjukkan budaya keselamatan yang transparan dan aman.', rekomendasi: ['Sederhanakan sistem pelaporan insiden', 'Berikan umpan balik atas setiap laporan', 'Beri penghargaan bagi unit dengan pelaporan terbaik'] },
  d4: { nama: 'Tanggapan Terhadap Kesalahan', kode: 'D4', totalPertanyaan: 5, deskripsi: 'Rasa aman yang dirasakan staf bahwa kesalahan mereka tidak akan dijadikan sarana menghakimi atau menghukum personal.', interpretasi: 'Penting untuk budaya adil (just culture). Jika staf takut dihukum, insiden akan disembunyikan dan sistem tidak akan diperbaiki.', rekomendasi: ['Terapkan prinsip Just Culture', 'Fokus pada kelemahan sistem, bukan individu', 'Hindari penghakiman sepihak terhadap staf'] },
  d2: { nama: 'Kepegawaian dan Kecepatan Kerja', kode: 'D2', totalPertanyaan: 4, deskripsi: 'Kecukupan rasio staf dalam mengelola beban kerja tanpa terburu-buru serta ketergantungan pada tenaga pengganti sementara.', interpretasi: 'Skor rendah berarti staf sering kelelahan dan terburu-buru, yang berisiko tinggi terhadap terjadinya insiden keselamatan.', rekomendasi: ['Evaluasi rasio staf dan beban kerja', 'Batasi jam kerja lembur', 'Optimalkan proses kerja agar lebih efisien'] },
  d5: { nama: 'Dukungan Supervisor, Manajer, atau Pemimpin Klinis untuk Keselamatan Pasien', kode: 'D5', totalPertanyaan: 3, deskripsi: 'Bagaimana atasan langsung memimpin, mendengar usulan keselamatan pasien, dan tidak memaksakan jalan pintas klinis demi efisiensi.', interpretasi: 'Pemimpin klinis adalah role model. Dukungan mereka sangat krusial dalam membentuk iklim keselamatan sehari-hari.', rekomendasi: ['Manajer harus aktif mendengarkan keluhan staf', 'Manajer tidak menoleransi jalan pintas yang tidak aman', 'Berikan dukungan nyata untuk inisiatif keselamatan'] },
  d1: { nama: 'Kerja Sama Tim', kode: 'D1', totalPertanyaan: 3, deskripsi: 'Kolaborasi, kekompakan, dan kebiasaan saling membantu antar anggota staf di dalam satu unit pelayanan.', interpretasi: 'Tingkat kolaborasi tinggi menunjukkan unit yang tangguh, sedangkan tingkat rendah mengindikasikan silo kerja atau kurangnya rasa saling membantu.', rekomendasi: ['Lakukan team-building rutin', 'Pastikan pembagian tugas jelas dan adil', 'Beri apresiasi untuk kolaborasi yang baik'] }
};

const ALL_QUESTIONS = [
  // Bagian A
  { id: 1, section: 'A', code: 'A1', text: 'Di unit ini, kami bekerja sama sebagai tim yang efektif', dim: 'd1' },
  { id: 2, section: 'A', code: 'A2', text: 'Di unit ini, kami memiliki staf yang cukup untuk menangani beban kerja', dim: 'd2' },
  { id: 3, section: 'A', code: 'A3', text: 'Staf di unit ini bekerja lebih lama dari waktu terbaik untuk perawatan pasien', dim: 'd2', isReversed: true },
  { id: 4, section: 'A', code: 'A4', text: 'Unit ini meninjau prosedur kerja secara berkala untuk menentukan apakah diperlukan perubahan untuk meningkatkan keselamatan pasien', dim: 'd3' },
  { id: 5, section: 'A', code: 'A5', text: 'Unit ini terlalu bergantung pada staf sementara, pengganti, atau panggilan', dim: 'd2', isReversed: true },
  { id: 6, section: 'A', code: 'A6', text: 'Di unit ini, staf merasa bahwa kesalahan yang terjadi dianggap sebagai kesalahan mereka sendiri', dim: 'd4', isReversed: true },
  { id: 7, section: 'A', code: 'A7', text: 'Ketika sebuah insiden dilaporkan di unit ini, rasanya seperti orangnya yang ditulis, bukan masalahnya', dim: 'd4', isReversed: true },
  { id: 8, section: 'A', code: 'A8', text: 'Selama saat sibuk, staf di unit ini saling membantu satu sama lain', dim: 'd1' },
  { id: 9, section: 'A', code: 'A9', text: 'Di unit ini, ada staf yang memiliki perilaku tidak menyenangkan dalam bekerja', dim: 'd1', isReversed: true },
  { id: 10, section: 'A', code: 'A10', text: 'Ketika staf melakukan kesalahan, unit ini berfokus pada pembelajaran daripada menyalahkan secara personal', dim: 'd4' },
  { id: 11, section: 'A', code: 'A11', text: 'Kecepatan kerja di unit ini sangat terburu-buru sehingga berdampak negatif pada keselamatan pasien', dim: 'd2', isReversed: true },
  { id: 12, section: 'A', code: 'A12', text: 'Di unit ini, setiap perubahan untuk meningkatkan keselamatan pasien dilakukan evaluasi, untuk melihat seberapa baik perubahan tersebut bekerja', dim: 'd3' },
  { id: 13, section: 'A', code: 'A13', text: 'Di unit ini, dukungan bagi staf yang terlibat dalam kesalahan keselamatan pasien masih kurang', dim: 'd4', isReversed: true },
  { id: 14, section: 'A', code: 'A14', text: 'Di unit ini, masalah keselamatan pasien yang sama memungkinkan dapat terus terjadi', dim: 'd4', isReversed: true },
  
  // Bagian B
  { id: 1, section: 'B', code: 'B1', text: 'Atasan, manajer, atau pemimpin klinis saya secara serius mempertimbangkan saran dari staf untuk meningkatkan keselamatan pasien', dim: 'd5' },
  { id: 2, section: 'B', code: 'B2', text: 'Atasan, manajer, atau pemimpin klinis saya menginginkan kita bekerja lebih cepat saat waktu sibuk, bahkan jika itu berarti mengambil jalan pintas', dim: 'd5', isReversed: true },
  { id: 3, section: 'B', code: 'B3', text: 'Atasan, manajer, atau pemimpin klinis saya mengambil tindakan untuk mengatasi masalah keselamatan pasien yang menjadi perhatian mereka', dim: 'd5' },
  
  // Bagian C
  { id: 1, section: 'C', code: 'C1', text: 'Kami diberi informasi tentang kesalahan yang terjadi pada unit ini', dim: 'd7' },
  { id: 2, section: 'C', code: 'C2', text: 'Ketika kesalahan terjadi pada unit ini, kami mendiskusikan cara-cara untuk mencegahnya terjadi lagi', dim: 'd7' },
  { id: 3, section: 'C', code: 'C3', text: 'Di unit ini, kami diberi tahu tentang perubahan yang dibuat berdasarkan laporan kejadian', dim: 'd7' },
  { id: 4, section: 'C', code: 'C4', text: 'Di unit ini, staf angkat bicara jika mereka melihat sesuatu yang dapat berdampak negatif terhadap perawatan pasien', dim: 'd6' },
  { id: 5, section: 'C', code: 'C5', text: 'Ketika staf di unit ini melihat seseorang yang memiliki wewenang lebih besar melakukan sesuatu yang tidak aman bagi pasien, mereka berani angkat bicara', dim: 'd6' },
  { id: 6, section: 'C', code: 'C6', text: 'Ketika staf di unit ini angkat bicara, mereka yang memiliki wewenang lebih besar akan terbuka terhadap masalah keselamatan pasien mereka', dim: 'd6' },
  { id: 7, section: 'C', code: 'C7', text: 'Di unit ini, staf takut untuk bertanya ketika ada sesuatu yang tidak beres', dim: 'd6', isReversed: true },
  
  // Bagian D
  { id: 1, section: 'D', code: 'D1', text: 'Ketika terjadi kesalahan yang terdeteksi dan dikoreksi sebelum memengaruhi pasien, seberapa sering hal ini dilaporkan?', dim: 'd8' },
  { id: 2, section: 'D', code: 'D2', text: 'Ketika terjadi kesalahan tetapi tidak berpotensi membahayakan pasien, seberapa sering hal ini dilaporkan?', dim: 'd8' },
  
  // Bagian F
  { id: 1, section: 'F', code: 'F1', text: 'Tindakan manajemen rumah sakit menunjukkan bahwa keselamatan pasien adalah prioritas utama', dim: 'd9' },
  { id: 2, section: 'F', code: 'F2', text: 'Manajemen rumah sakit menyediakan sumber daya yang memadai untuk meningkatkan keselamatan pasien', dim: 'd9' },
  { id: 3, section: 'F', code: 'F3', text: 'Manajemen rumah sakit tampaknya hanya tertarik pada keselamatan pasien setelah kejadian tidak diharapkan terjadi', dim: 'd9', isReversed: true },
  { id: 4, section: 'F', code: 'F4', text: 'Ketika memindahkan pasien dari satu unit ke unit lain, informasi penting sering kali terlewatkan', dim: 'd10', isReversed: true },
  { id: 5, section: 'F', code: 'F5', text: 'Selama pergantian shift, informasi perawatan pasien yang penting sering terlewatkan', dim: 'd10', isReversed: true },
  { id: 6, section: 'F', code: 'F6', text: 'Selama pergantian shift, ada waktu yang memadai untuk bertukar semua informasi penting tentang perawatan pasien', dim: 'd10' }
];

export default function DimensiDetailModal({ dimensiId, onClose, surveys, rsName }: DimensiDetailModalProps) {
  const dimInfo = DIMENSI_INFO[dimensiId];
  const questions = useMemo(() => ALL_QUESTIONS.filter(q => q.dim === dimensiId), [dimensiId]);

  // Calculations
  const data = useMemo(() => {
    let overallPos = 0, overallNeu = 0, overallNeg = 0;
    let totalExpectedAnswers = 0;

    const questionStats = questions.map(q => ({
      code: q.code,
      text: q.text,
      pos: 0, neu: 0, neg: 0, valid: 0
    }));

    const respondentsHistory: any[] = [];

    surveys.forEach((survey, sIndex) => {
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (!raw) return;

      questions.forEach((q, qIndex) => {
        let ansVal: any = undefined;
        if (q.section === 'A') ansVal = raw.ansA?.[q.id];
        else if (q.section === 'B') ansVal = raw.ansB?.[q.id];
        else if (q.section === 'C') ansVal = raw.ansC?.[q.id];
        else if (q.section === 'D') ansVal = raw.ansD?.[q.id];
        else if (q.section === 'F') ansVal = raw.ansF?.[q.id];

        if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
        const val = Number(ansVal);
        
        let status = '';
        if (q.isReversed) {
          if (val === 1 || val === 2) status = 'Positif';
          else if (val === 3) status = 'Netral';
          else if (val === 4 || val === 5) status = 'Negatif';
        } else {
          if (val === 4 || val === 5) status = 'Positif';
          else if (val === 3) status = 'Netral';
          else if (val === 1 || val === 2) status = 'Negatif';
        }

        // Multiply by jumlahResponden if aggregated, or just 1 if individual
        const count = survey.jumlahResponden || 1;
        totalExpectedAnswers += count;

        if (status === 'Positif') {
          questionStats[qIndex].pos += count;
          overallPos += count;
        } else if (status === 'Netral') {
          questionStats[qIndex].neu += count;
          overallNeu += count;
        } else if (status === 'Negatif') {
          questionStats[qIndex].neg += count;
          overallNeg += count;
        }
        questionStats[qIndex].valid += count;

        respondentsHistory.push({
          id: `${survey.id}-${q.code}`,
          date: survey.tanggalInput || new Date().toISOString().split('T')[0],
          unit: survey.unitKerja || '-',
          respCode: survey.id.slice(0, 8),
          question: q.code,
          score: val,
          status,
        });
      });
    });

    const overallValid = overallPos + overallNeu + overallNeg;
    const posPercent = overallValid > 0 ? (overallPos / overallValid) * 100 : 0;
    const neuPercent = overallValid > 0 ? (overallNeu / overallValid) * 100 : 0;
    const negPercent = overallValid > 0 ? (overallNeg / overallValid) * 100 : 0;

    const chartData = questionStats.map(qs => ({
      name: qs.code,
      Positif: qs.valid > 0 ? Number(((qs.pos / qs.valid) * 100).toFixed(1)) : 0,
      Netral: qs.valid > 0 ? Number(((qs.neu / qs.valid) * 100).toFixed(1)) : 0,
      Negatif: qs.valid > 0 ? Number(((qs.neg / qs.valid) * 100).toFixed(1)) : 0,
      text: qs.text
    }));

    return {
      posPercent, neuPercent, negPercent, chartData, respondentsHistory, overallValid
    };
  }, [surveys, questions]);

  const totalRespondents = surveys.reduce((acc, s) => acc + (s.jumlahResponden || 1), 0);
  const years = Array.from(new Set(surveys.map(s => s.tanggalInput?.split('-')[0] || new Date().getFullYear().toString()))).join(', ');

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredHistory = useMemo(() => {
    return data.respondentsHistory.filter(h => {
      const matchSearch = h.respCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.unit.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUnit = filterUnit ? h.unit === filterUnit : true;
      const matchStatus = filterStatus ? h.status === filterStatus : true;
      return matchSearch && matchUnit && matchStatus;
    });
  }, [data.respondentsHistory, searchTerm, filterUnit, filterStatus]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const availableUnits = Array.from(new Set(data.respondentsHistory.map(h => h.unit)));

  // Generate automated analysis
  const autoAnalysis = useMemo(() => {
    if (data.posPercent >= 75) {
      return `Dimensi ${dimInfo.nama} memperoleh respon positif sebesar ${data.posPercent.toFixed(1)}%, menunjukkan bahwa ${dimInfo.deskripsi.toLowerCase()} di unit kerja sudah berjalan dengan baik. Namun masih terdapat sebagian kecil respon netral (${data.neuPercent.toFixed(1)}%) dan negatif (${data.negPercent.toFixed(1)}%) sehingga perlu dilakukan monitoring secara berkala agar capaian ini dapat dipertahankan atau ditingkatkan.`;
    } else if (data.posPercent >= 50) {
      return `Dimensi ${dimInfo.nama} memperoleh respon positif sebesar ${data.posPercent.toFixed(1)}%, yang berarti masih perlu peningkatan. Tingginya angka respon netral (${data.neuPercent.toFixed(1)}%) dan negatif (${data.negPercent.toFixed(1)}%) mengindikasikan bahwa ${dimInfo.deskripsi.toLowerCase()} belum sepenuhnya optimal. Diperlukan intervensi dan perbaikan sistem.`;
    } else {
      return `Peringatan! Dimensi ${dimInfo.nama} memperoleh respon positif yang sangat rendah (${data.posPercent.toFixed(1)}%). Dominasi respon negatif (${data.negPercent.toFixed(1)}%) menunjukkan adanya masalah serius terkait ${dimInfo.deskripsi.toLowerCase()}. Prioritas perbaikan dan intervensi manajemen sangat mendesak diperlukan.`;
    }
  }, [data.posPercent, data.neuPercent, data.negPercent, dimInfo]);

  return (
    <div className="fixed inset-0 bg-[#0B101E]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-slate-950 border border-indigo-500/20 rounded-[20px] max-w-6xl w-full h-[95vh] flex flex-col shadow-2xl shadow-indigo-500/10"
      >
        {/* Header */}
        <div className="flex-none p-6 border-b border-indigo-500/20 bg-slate-900/50 rounded-t-[20px] flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold font-mono rounded-lg">
                DIMENSI {dimInfo.kode}
              </span>
              <span className="text-xs text-slate-400 font-medium">Tahun: {years}</span>
              <span className="text-xs text-slate-400 font-medium border-l border-slate-700 pl-3">Responden: <strong className="text-slate-200">{totalRespondents}</strong></span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {dimInfo.nama}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all transform-gpu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 ">
          
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
              <p className="text-xs font-medium text-slate-400 mb-1">Respon Positif</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">{data.posPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 mt-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${data.posPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
              <p className="text-xs font-medium text-slate-400 mb-1">Respon Netral</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-yellow-400">{data.neuPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 mt-3 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${data.neuPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
              <p className="text-xs font-medium text-slate-400 mb-1">Respon Negatif</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-400">{data.negPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 mt-3 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${data.negPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl flex flex-col justify-center">
              <p className="text-xs font-medium text-indigo-300 mb-1">Kategori Budaya</p>
              <span className="text-xl font-bold text-indigo-400">
                {data.posPercent >= 75 ? 'Sangat Baik' : (data.posPercent >= 50 ? 'Perlu Peningkatan' : 'Prioritas Kritis')}
              </span>
            </div>
          </div>

          {/* Questions History */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-6">
              <Info className="w-5 h-5 text-indigo-400" /> Riwayat Pertanyaan Dimensi
            </h3>
            
            <div className="space-y-6">
              {data.chartData.map((q, idx) => (
                <div key={q.name} className="p-5 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex gap-4">
                    <div className="flex-none w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/20">
                      {q.name}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200 mb-3">{q.text}</p>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span className="text-xs text-slate-400">Positif: <strong className="text-emerald-400">{q.Positif}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                          <span className="text-xs text-slate-400">Netral: <strong className="text-yellow-400">{q.Netral}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <span className="text-xs text-slate-400">Negatif: <strong className="text-red-400">{q.Negatif}%</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Visualization */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-400" /> Distribusi Jawaban per Pertanyaan
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  <Bar dataKey="Positif" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="Netral" fill="#eab308" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="Negatif" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Automated Analysis & Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/30 border border-indigo-500/15 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" /> Analisis Hasil Dimensi
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {autoAnalysis}
              </p>
            </div>
            <div className="bg-slate-900/30 border border-emerald-500/15 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4" /> Rekomendasi Perbaikan
              </h3>
              <ul className="space-y-3">
                {dimInfo.rekomendasi.map((rek, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                    <span>{rek}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Respondents Filling History Table */}
          <div className="bg-slate-900/30 border border-slate-800/60 p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Riwayat Pengisian Responden
              </h3>
              
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Cari ID atau Unit..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 w-48"
                  />
                </div>
                <select 
                  value={filterUnit} 
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Semua Unit</option>
                  {availableUnits.map((u, i) => <option key={i} value={u}>{u}</option>)}
                </select>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Semua Status</option>
                  <option value="Positif">Positif</option>
                  <option value="Netral">Netral</option>
                  <option value="Negatif">Negatif</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-center w-12">No</th>
                    <th className="px-4 py-3 font-semibold">Tgl Pengisian</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold">ID Responden</th>
                    <th className="px-4 py-3 font-semibold text-center">Kode Soal</th>
                    <th className="px-4 py-3 font-semibold text-center">Nilai</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-500 font-mono">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{item.date}</td>
                        <td className="px-4 py-3 text-slate-300">{item.unit}</td>
                        <td className="px-4 py-3 text-indigo-300 font-mono">{item.respCode}</td>
                        <td className="px-4 py-3 text-center text-slate-300 font-mono">{item.question}</td>
                        <td className="px-4 py-3 text-center text-slate-200 font-bold">{item.score}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold ${
                            item.status === 'Positif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.status === 'Netral' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada data riwayat yang sesuai dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500">
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredHistory.length)} dari {filteredHistory.length} data
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-all transform-gpu"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-300 px-2">{currentPage} / {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-all transform-gpu"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
