import { SurveyData } from './db';

export const DIMENSI_INFO: { [key: string]: { nama: string; kode: string; totalPertanyaan: number; deskripsi: string; benchmarkMin: number; benchmarkMax: number } } = {
  d7: { nama: 'Komunikasi tentang Kesalahan', kode: 'D7', totalPertanyaan: 3, deskripsi: 'Seberapa sering staf diberi informasi tentang kesalahan yang terjadi di unit, dan mendiskusikan cara mencegahnya.', benchmarkMin: 47, benchmarkMax: 82 },
  d6: { nama: 'Keterbukaan Komunikasi', kode: 'D6', totalPertanyaan: 4, deskripsi: 'Staf bebas berbicara jika melihat sesuatu yang dapat berdampak buruk pada pasien dan berani bertanya kepada atasan.', benchmarkMin: 64, benchmarkMax: 88 },
  d10: { nama: 'Serah Terima Pasien & Pertukaran Informasi', kode: 'D10', totalPertanyaan: 3, deskripsi: 'Pemberian informasi penting tentang perawatan pasien yang hilang atau terdistorsi saat pergantian shift atau transfer unit.', benchmarkMin: 40, benchmarkMax: 70 },
  d9: { nama: 'Dukungan Manajemen RS terhadap Keselamatan Pasien', kode: 'D9', totalPertanyaan: 3, deskripsi: 'Manajemen rumah sakit menciptakan iklim kerja yang memprioritaskan keselamatan pasien di atas target lainnya.', benchmarkMin: 51, benchmarkMax: 84 },
  d3: { nama: 'Pembelajaran Organisasi & Peningkatan Berkelanjutan', kode: 'D3', totalPertanyaan: 3, deskripsi: 'Seberapa jauh kesalahan mengarah pada perubahan positif dan efektivitas perubahan dievaluasi.', benchmarkMin: 54, benchmarkMax: 88 },
  d8: { nama: 'Frekuensi Pelaporan Kejadian Keselamatan Pasien', kode: 'D8', totalPertanyaan: 2, deskripsi: 'Sejauh mana jenis kesalahan tertentu dilaporkan, baik sebelum berdampak pada pasien maupun sesudahnya.', benchmarkMin: 37, benchmarkMax: 97 },
  d4: { nama: 'Respon terhadap Kesalahan secara Non-Punitif', kode: 'D4', totalPertanyaan: 4, deskripsi: 'Staf merasa bahwa kesalahan tidak digunakan untuk menyalahkan atau menghukum mereka secara pribadi.', benchmarkMin: 33, benchmarkMax: 82 },
  d2: { nama: 'Ketenagaan dan Beban Kerja', kode: 'D2', totalPertanyaan: 4, deskripsi: 'Kecukupan jumlah staf untuk menangani beban kerja and apakah jam kerja sesuai untuk keselamatan pasien.', benchmarkMin: 30, benchmarkMax: 60 },
  d5: { nama: 'Dukungan Supervisor/Manajer untuk Keselamatan', kode: 'D5', totalPertanyaan: 3, deskripsi: 'Seberapa jauh supervisor mengapresiasi staf karena mengikuti prosedur keselamatan dan tidak mendesak penyelesaian tugas dengan mengabaikan keselamatan.', benchmarkMin: 71, benchmarkMax: 87 },
  d1: { nama: 'Kerjasama Tim', kode: 'D1', totalPertanyaan: 3, deskripsi: 'Seberapa jauh staf bekerja sama, saling mendukung, dan memperlakukan satu sama lain dengan hormat.', benchmarkMin: 71, benchmarkMax: 89 },
};

export const DIMENSI_ITEMS: { [key: string]: { section: string; id: number; isReversed?: boolean }[] } = {
  d7: [{ section: 'C', id: 1 }, { section: 'C', id: 2 }, { section: 'C', id: 3 }],
  d6: [{ section: 'C', id: 4 }, { section: 'C', id: 5 }, { section: 'C', id: 6 }, { section: 'C', id: 7, isReversed: true }],
  d10: [{ section: 'F', id: 4, isReversed: true }, { section: 'F', id: 5, isReversed: true }, { section: 'F', id: 6 }],
  d9: [{ section: 'F', id: 1 }, { section: 'F', id: 2 }, { section: 'F', id: 3, isReversed: true }],
  d3: [{ section: 'A', id: 4 }, { section: 'A', id: 12 }, { section: 'A', id: 14, isReversed: true }],
  d8: [{ section: 'D', id: 1 }, { section: 'D', id: 2 }],
  d4: [{ section: 'A', id: 6, isReversed: true }, { section: 'A', id: 7, isReversed: true }, { section: 'A', id: 10 }, { section: 'A', id: 13, isReversed: true }],
  d2: [{ section: 'A', id: 2 }, { section: 'A', id: 3, isReversed: true }, { section: 'A', id: 5, isReversed: true }, { section: 'A', id: 11, isReversed: true }],
  d5: [{ section: 'B', id: 1 }, { section: 'B', id: 2, isReversed: true }, { section: 'B', id: 3 }],
  d1: [{ section: 'A', id: 1 }, { section: 'A', id: 8 }, { section: 'A', id: 9, isReversed: true }]
};

export function scoreToPercent(score: number): number {
  if (score >= 4.5) return 90 + (score - 4.5) * 10;
  if (score >= 3.5) return 75 + (score - 3.5) * 15;
  if (score >= 2.5) return 50 + (score - 2.5) * 25;
  if (score >= 1.5) return 20 + (score - 1.5) * 30;
  return Math.max(0, (score - 1) * 20);
}

export function computeDimensionScores(targetSurveys: SurveyData[], masterBenchmark?: Record<string, { min: number, max: number }>) {
  return Object.keys(DIMENSI_INFO).map(dimId => {
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;
    let totalValid = 0;
    let totalResponden = 0;

    targetSurveys.forEach(survey => {
      // Exclude MASTER_BENCHMARK or LINK_CONFIG_ config rows
      if (!survey || !survey.id || survey.id === 'MASTER_BENCHMARK' || survey.id.startsWith('LINK_CONFIG_') || survey.namaRs === '_LINK_CONFIG_') return;
      totalResponden += survey.jumlahResponden || 1;
      const raw = (survey.dimensiScores as any)?._rawAnswers;
      if (raw) {
        DIMENSI_ITEMS[dimId].forEach(item => {
          let ansVal: any = undefined;
          if (item.section === 'A') ansVal = raw.ansA?.[item.id];
          else if (item.section === 'B') ansVal = raw.ansB?.[item.id];
          else if (item.section === 'C') ansVal = raw.ansC?.[item.id];
          else if (item.section === 'D') ansVal = raw.ansD?.[item.id];
          else if (item.section === 'F') ansVal = raw.ansF?.[item.id];

          if (ansVal === undefined || ansVal === 9 || ansVal === null) return;
          const val = Number(ansVal);
          totalValid++;
          if (item.isReversed) {
            if (val === 1 || val === 2) totalPositive++;
            else if (val === 3) totalNeutral++;
            else if (val === 4 || val === 5) totalNegative++;
          } else {
            if (val === 4 || val === 5) totalPositive++;
            else if (val === 3) totalNeutral++;
            else if (val === 1 || val === 2) totalNegative++;
          }
        });
      } else if (typeof (survey.dimensiScores as any)?.[dimId] === 'number') {
        // Fallback or legacy mapping
        const score = (survey.dimensiScores as any)[dimId];
        const posRate = scoreToPercent(score) / 100;
        const neutRate = Math.max(0.05, 0.25 - Math.abs(score - 3.0) * 0.08);
        const expectedAnswers = DIMENSI_ITEMS[dimId].length * (survey.jumlahResponden || 1);
        
        totalValid += expectedAnswers;
        totalPositive += Math.round(expectedAnswers * posRate);
        totalNeutral += Math.round(expectedAnswers * neutRate);
        totalNegative += expectedAnswers - Math.round(expectedAnswers * posRate) - Math.round(expectedAnswers * neutRate);
      }
    });

    const percentage = totalValid > 0 ? (totalPositive / totalValid) * 100 : 0;
    const neutralPercentage = totalValid > 0 ? (totalNeutral / totalValid) * 100 : 0;
    const negativePercentage = totalValid > 0 ? (totalNegative / totalValid) * 100 : 0;
    const komposit = (percentage * 0.6) + (neutralPercentage * 0.3) + (negativePercentage * 0.1);

    // Status Interpretation & Recommendation
    let status: 'SANGAT_BAIK' | 'PERLU_PENINGKATAN' | 'PERLU_PRIORITAS' = 'PERLU_PENINGKATAN';
    let interpretasi = '';
    let rekomendasi: string[] = [];

    if (percentage >= 75) {
      status = 'SANGAT_BAIK';
      interpretasi = 'Dimensi ini merupakan kekuatan organisasi budaya keselamatan rumah sakit dan perlu dipertahankan konsistensinya.';
      rekomendasi = [
        'Pertahankan koordinasi kerja dan bagikan pola komunikasi sukses ini ke unit lain.',
        'Berikan penghargaan kepada staf pelopor budaya keselamatan di unit.',
        'Terapkan program benchmarking internal agar unit lain dapat belajar.'
      ];
    } else if (percentage >= 50) {
      status = 'PERLU_PENINGKATAN';
      interpretasi = 'Dimensi menunjukkan kondisi cukup baik namun masih memerlukan beberapa pembenahan agar menjadi budaya keselamatan yang mapan.';
      rekomendasi = [
        'Lakukan sesi penyegaran (refreshment) SOP keselamatan pasien secara rutin.',
        'Adakan forum diskusi bulanan tentang kejadian keselamatan kerja.',
        'Gencarkan kampanye edukasi pengisian formulir pelaporan kejadian dengan ringkas.'
      ];
    } else {
      status = 'PERLU_PRIORITAS';
      interpretasi = 'Dimensi ini menjadi prioritas utama untuk dilakukan intervensi serta perbaikan menyeluruh karena di bawah batas aman keselamatan.';
      rekomendasi = [
        'Adakan rapat evaluasi darurat bersama jajaran direksi dan komite keselamatan pasien.',
        'Laksanakan pelatihan komprehensif terkait Just Culture demi menghilangkan rasa takut staf melaporkan kesalahan.',
        'Sederhanakan alur birokrasi pelaporan insiden agar staf berani melapor secepatnya.',
        'Lakukan audit sarana kerja untuk menyeimbangkan beban kerja staf secara merata.'
      ];
    }

    const bMin = masterBenchmark && masterBenchmark[dimId] ? masterBenchmark[dimId].min : DIMENSI_INFO[dimId].benchmarkMin;
    const bMax = masterBenchmark && masterBenchmark[dimId] ? masterBenchmark[dimId].max : DIMENSI_INFO[dimId].benchmarkMax;

    return {
      id: dimId,
      kode: DIMENSI_INFO[dimId].kode,
      nama: DIMENSI_INFO[dimId].nama,
      deskripsi: DIMENSI_INFO[dimId].deskripsi,
      totalPertanyaan: DIMENSI_INFO[dimId].totalPertanyaan,
      percentage,
      neutralPercentage,
      negativePercentage,
      komposit,
      benchmarkMin: bMin,
      benchmarkMax: bMax,
      positiveCount: totalPositive,
      neutralCount: totalNeutral,
      negativeCount: totalNegative,
      validCount: totalValid,
      respondentsCount: totalResponden,
      status,
      interpretasi,
      rekomendasi
    };
  });
}
