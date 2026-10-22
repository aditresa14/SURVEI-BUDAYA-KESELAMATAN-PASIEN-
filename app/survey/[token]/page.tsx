'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import InputDataTab from '../../../components/InputDataTab';
import { getSupabaseClient } from '../../../lib/supabase';
import { SurveyData, convertIndoDateToISO } from '../../../lib/db';
import { getLogo, LogoData } from '../../../lib/logo';

export default function PublicSurveyPage() {
  const params = useParams();
  const token = params?.token as string;
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<LogoData | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Koneksi database tidak tersedia.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('ahrq_surveys')
          .select('id, unit_kerja, nama_rs, tanggal_input, jumlah_responden, dimensi_scores, created_at')
          .eq('id', `LINK_CONFIG_${token}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchErr || !data || data.length === 0) {
          setError('Mohon maaf, tautan survei yang Anda buka sudah tidak aktif, telah kedaluwarsa, atau tidak ditemukan. Silakan hubungi administrator Rumah Sakit untuk memperoleh tautan survei yang terbaru.');
          setLoading(false);
          return;
        }

        const surveyRecord = data[0];

        if (surveyRecord.jumlah_responden !== 1) {
          setError('Mohon maaf, tautan survei yang Anda buka sedang dinonaktifkan sementara oleh administrator Rumah Sakit.');
          setLoading(false);
          return;
        }

        let parsedScores = surveyRecord.dimensi_scores;
        if (typeof parsedScores === 'string') {
          try {
            parsedScores = JSON.parse(parsedScores);
          } catch (e) {
            console.error("Gagal parse dimensi_scores", e);
            parsedScores = {};
          }
        }

        // Get today's date formatted as YYYY-MM-DD in Western Indonesian Time (WIB)
        const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());

        // Validate survey start date (Periode Mulai)
        if (parsedScores.startDate && parsedScores.startDate.trim() !== '') {
          if (todayStr < parsedScores.startDate.trim()) {
            const startDateObj = new Date(parsedScores.startDate.trim() + 'T00:00:00');
            const formattedStart = !isNaN(startDateObj.getTime())
              ? startDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : parsedScores.startDate;
            setError(`Mohon maaf, periode pengisian kuesioner survei belum dimulai. Survei baru dapat diisi mulai tanggal ${formattedStart}.`);
            setLoading(false);
            return;
          }
        }

        // Validate expiration date (Masa Berlaku / Periode Selesai)
        if (parsedScores.expiryDate && parsedScores.expiryDate.trim() !== '') {
          if (todayStr > parsedScores.expiryDate.trim()) {
            const expiryDateObj = new Date(parsedScores.expiryDate.trim() + 'T23:59:59');
            const formattedExpiry = !isNaN(expiryDateObj.getTime())
              ? expiryDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : parsedScores.expiryDate;
            setError(`Mohon maaf, masa berlaku kuesioner survei ini telah berakhir pada tanggal ${formattedExpiry}. Silakan hubungi administrator Rumah Sakit.`);
            setLoading(false);
            return;
          }
        }

        // Validate max respondents
        if (parsedScores.maxRespondents && parsedScores.maxRespondents.toString().trim() !== '') {
          const max = parseInt(parsedScores.maxRespondents, 10);
          if (!isNaN(max) && max > 0) {
            const current = Number(parsedScores.respondentCount) || 0;
            if (current >= max) {
              setError(`Mohon maaf, tautan survei yang Anda buka telah mencapai batas maksimal jumlah responden (${max} responden). Silakan hubungi administrator Rumah Sakit.`);
              setLoading(false);
              return;
            }
          }
        }

        // Validate prevent duplicate
        if (parsedScores.preventDuplicate !== false) {
          if (typeof window !== 'undefined' && localStorage.getItem(`survey_submitted_${token}`)) {
            setError('Anda sudah mengisi survei ini dari perangkat ini. Terima kasih atas partisipasi Anda.');
            setLoading(false);
            return;
          }
        }

        setConfig({
          rsName: parsedScores.rsName || surveyRecord.nama_rs || 'Rumah Sakit',
          identifier: surveyRecord.unit_kerja || parsedScores.username || parsedScores.unit_kerja || 'default',
          hospitalId: surveyRecord.hospital_id || parsedScores.hospital_id || surveyRecord.unit_kerja,
          userId: surveyRecord.user_id || parsedScores.user_id || surveyRecord.unit_kerja,
          createdBy: surveyRecord.created_by || parsedScores.created_by || surveyRecord.unit_kerja,
          hospitalName: surveyRecord.hospital_name || parsedScores.hospital_name || parsedScores.rsName || surveyRecord.nama_rs || 'Rumah Sakit'
        });

        // Load logo
        const savedLogo = await getLogo();
        if (savedLogo) {
          setLogo(savedLogo);
        }

      } catch (err) {
        setError('Terjadi kesalahan saat memuat survei.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const handleSaveSurvey = async (survey: SurveyData) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase tidak terhubung");

    // We add it to the DB with the target hospital's name
    const dbRow: any = {
      id: survey.id,
      nama_rs: config.rsName,
      unit_kerja: survey.unitKerja,
      jumlah_responden: survey.jumlahResponden,
      tanggal_input: convertIndoDateToISO(survey.tanggalInput),
      dimensi_scores: {
        ...survey.dimensiScores,
        username: config.identifier,
        hospital_id: config.hospitalId,
        user_id: config.userId,
        created_by: config.createdBy,
        hospital_name: config.hospitalName
      },
      hospital_id: config.hospitalId,
      user_id: config.userId,
      created_by: config.createdBy,
      hospital_name: config.hospitalName
    };

    let attempts = 0;
    const maxAttempts = 3;
    const insertRow = { ...dbRow };

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const { error } = await supabase.from('ahrq_surveys').insert([insertRow]);
        if (!error) break;
        throw error;
      } catch (error: any) {
        const isColError = error.code === '42703' || 
                           error.code === 'PGRST204' ||
                           error.message?.includes('column') || 
                           error.message?.includes('does not exist') ||
                           error.message?.includes('schema cache');
        if (isColError && attempts < maxAttempts) {
          delete insertRow.hospital_id;
          delete insertRow.user_id;
          delete insertRow.created_by;
          delete insertRow.hospital_name;
          continue;
        }
        console.warn(`Public saveSurvey attempt ${attempts} failed:`, error);
        throw new Error(`Gagal menyimpan pengisian survei: ${error.message}`);
      }
    }
    
    // Increment respondent count on the link config silently
    try {
      const { data } = await supabase
        .from('ahrq_surveys')
        .select('id, dimensi_scores')
        .eq('id', `LINK_CONFIG_${token}`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        let parsedScores = data[0].dimensi_scores;
        if (typeof parsedScores === 'string') {
          try {
            parsedScores = JSON.parse(parsedScores);
          } catch (e) {
            parsedScores = {};
          }
        }
        const currentCount = parsedScores?.respondentCount || 0;
        await supabase
          .from('ahrq_surveys')
          .update({
            dimensi_scores: { ...parsedScores, respondentCount: currentCount + 1 }
          })
          .eq('id', data[0].id);
      }
    } catch (e) {
      console.error("Gagal mengupdate jumlah responden link", e);
    }
    
    // Set flag
    localStorage.setItem(`survey_submitted_${token}`, 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-white border border-slate-200 p-10 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Survei Tidak Tersedia</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-black tracking-tight">{config.rsName}</h2>
              <p className="text-sm font-medium text-slate-600">Portal Survei Budaya Keselamatan Pasien</p>
            </div>
          </div>
        </div>
        
        {/* We use InputDataTab directly. It handles its own wrapper, sticky header, etc. */}
        <InputDataTab 
          currentRsName={config.rsName} 
          identifier={config.identifier}
          isPublic={true}
          onSaveSurvey={handleSaveSurvey} 
        />
      </div>
    </div>
  );
}
