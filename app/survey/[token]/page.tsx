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
          .select('*')
          .eq('id', `LINK_CONFIG_${token}`)
          .single();

        if (fetchErr || !data) {
          setError('Mohon maaf, tautan survei yang Anda buka sudah tidak aktif, telah kedaluwarsa, atau tidak ditemukan. Silakan hubungi administrator Rumah Sakit untuk memperoleh tautan survei yang terbaru.');
          setLoading(false);
          return;
        }

        if (data.jumlah_responden !== 1) {
          setError('Mohon maaf, tautan survei yang Anda buka sudah tidak aktif, telah kedaluwarsa, atau tidak ditemukan. Silakan hubungi administrator Rumah Sakit untuk memperoleh tautan survei yang terbaru.');
          setLoading(false);
          return;
        }

        let parsedScores = data.dimensi_scores;
        if (typeof parsedScores === 'string') {
          try {
            parsedScores = JSON.parse(parsedScores);
          } catch (e) {
            console.error("Gagal parse dimensi_scores", e);
            parsedScores = {};
          }
        }

        // Validate expiration date
        if (parsedScores.expiryDate) {
          const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          if (todayStr > parsedScores.expiryDate) {
            setError('Mohon maaf, tautan survei yang Anda buka sudah tidak aktif, telah kedaluwarsa, atau tidak ditemukan. Silakan hubungi administrator Rumah Sakit untuk memperoleh tautan survei yang terbaru.');
            setLoading(false);
            return;
          }
        }

        // Validate max respondents
        if (parsedScores.maxRespondents) {
          const max = parseInt(parsedScores.maxRespondents, 10);
          if (!isNaN(max)) {
            const current = parsedScores.respondentCount || 0;
            if (current >= max) {
              setError('Mohon maaf, tautan survei yang Anda buka sudah tidak aktif, telah mencapai batas maksimal jumlah responden, atau tidak ditemukan. Silakan hubungi administrator Rumah Sakit untuk memperoleh tautan survei yang terbaru.');
              setLoading(false);
              return;
            }
          }
        }

        // Validate prevent duplicate
        if (parsedScores.preventDuplicate !== false) {
          if (localStorage.getItem(`survey_submitted_${token}`)) {
            setError('Anda sudah mengisi survei ini dari perangkat ini. Terima kasih atas partisipasi Anda.');
            setLoading(false);
            return;
          }
        }

        setConfig({
          rsName: parsedScores.rsName || 'Rumah Sakit',
          identifier: data.unit_kerja,
          hospitalId: data.hospital_id || parsedScores.hospital_id || data.unit_kerja,
          userId: data.user_id || parsedScores.user_id || data.unit_kerja,
          createdBy: data.created_by || parsedScores.created_by || data.unit_kerja,
          hospitalName: data.hospital_name || parsedScores.hospital_name || parsedScores.rsName || 'Rumah Sakit'
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
        .select('dimensi_scores')
        .eq('id', `LINK_CONFIG_${token}`)
        .single();
        
      if (data) {
        let parsedScores = data.dimensi_scores;
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
          .eq('id', `LINK_CONFIG_${token}`);
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
