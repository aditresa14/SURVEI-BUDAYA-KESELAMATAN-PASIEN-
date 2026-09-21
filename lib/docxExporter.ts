import { 
  Document, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  WidthType, 
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Packer,
  ImageRun,
  TableOfContents
} from 'docx';
import { saveAs } from 'file-saver';

export interface ReportData {
  namaRs: string;
  logoUrl?: string;
  tahun: string;
  periodeSurvei: string;
  totalTarget: number;
  totalActual: number;
  responseRate: string;
  demographics: {
    profesi: { category: string; count: number; percentage: string }[];
    masaKerja: { category: string; count: number; percentage: string }[];
    masaKerjaUnit?: { category: string; count: number; percentage: string }[];
    jamKerja: { category: string; count: number; percentage: string }[];
    interaksiKontak?: { category: string; count: number; percentage: string }[];
    unitKerja: { category: string; count: number; percentage: string }[];
  };
  dimensionScores: {
    id: string;
    kode: string;
    nama: string;
    percentage: number;
    status: 'SANGAT_BAIK' | 'PERLU_PENINGKATAN' | 'PERLU_PRIORITAS';
    interpretasi: string;
  }[];
  overallAverage: number;
  safetyRating: { name: string; count: number; percentage: string }[];
  safetyRatingPositivePct: number;
  reportedEvents: { name: string; count: number; percentage: string }[];
  reportedEventsAnyPct: number;
  strengths: { kode: string; nama: string; percentage: number; interpretasi: string }[];
  improvements: { kode: string; nama: string; percentage: number; interpretasi: string }[];
  moderates: { kode: string; nama: string; percentage: number; interpretasi: string }[];
  recommendations: {
    jangkaPendek: string[];
    jangkaMenengah: string[];
    jangkaPanjang: string[];
  };
  hasBenchmark: boolean;
  benchmarkName?: string;
  benchmarkComparison?: { kode: string; nama: string; rsPct: number; benchPct: number; diff: number }[];
  hasYearComparison: boolean;
  yearComparison?: { year: string; average: number }[];
  chartImages?: {
    chart10Dimensi?: string;
    overallRating?: string;
    reportedEvents?: string;
    benchmark?: string;
    yearComparison?: string;
  };
  pengesahan: {
    kota: string;
    tanggal: string;
    penanggungJawabNama: string;
    penanggungJawabJabatan: string;
    penanggungJawabNip?: string;
    direkturNama: string;
    direkturJabatan: string;
    direkturNip?: string;
  };
  pageImages?: (string | { data: string; isLandscape?: boolean })[];
  positionDimensionScores?: any[];
  unitDimensionScores?: any[];
  tenureDimensionScores?: any[];
  workHoursDimensionScores?: any[];
  comments?: {
    total: number;
    positive: number;
    constructive: number;
    positivePercentage: number;
    constructivePercentage: number;
    recommendations: string[];
    analysisText?: string;
  };
}

// Convert base64 data URL to Uint8Array for docx ImageRun
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function exportReportToDocx(data: ReportData) {
  // If we have page images (screenshots), use them for 100% fidelity
  if (data.pageImages && data.pageImages.length > 0) {
    const doc = new Document({
      sections: data.pageImages.map((pageItem) => {
        const isObj = typeof pageItem === 'object' && pageItem !== null;
        const imgData = isObj ? pageItem.data : pageItem;
        const isLandscape = isObj ? !!pageItem.isLandscape : false;

        return {
          properties: {
            page: {
              size: isLandscape ? {
                width: 16838, // A4 Landscape width in dxa (297mm)
                height: 11906, // A4 Landscape height in dxa (210mm)
              } : {
                width: 11906, // A4 Portrait width in dxa (210mm)
                height: 16838, // A4 Portrait height in dxa (297mm)
              },
              margin: { top: 0, bottom: 0, left: 0, right: 0 }, // No margins for full-page images
            },
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: base64ToUint8Array(imgData),
                  transformation: isLandscape ? {
                    width: 1123, // ~297mm at 96dpi
                    height: 794, // ~210mm at 96dpi
                  } : {
                    width: 794, // ~210mm at 96dpi
                    height: 1123, // ~297mm at 96dpi
                  },
                  type: "png",
                }),
              ],
            }),
          ],
        };
      }),
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Laporan_Resmi_Budaya_Keselamatan_Pasien_${data.namaRs.replace(/[^a-zA-Z0-9]/g, '_')}_${data.tahun}.docx`);
    return;
  }

  // Primary Palette: Dark Slate / Navy (#1E293B, #0F172A) & Teal Header (#0D9488)
  const headerBgColor = "0D9488";
  const headerTextColor = "FFFFFF";
  const lightRowBg = "F8FAFC";
  const borderGray = "CBD5E1";

  const createCell = (text: string, bold = false, align: any = AlignmentType.LEFT, bg?: string, color?: string) => {
    return new TableCell({
      shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text,
              bold,
              font: "Calibri",
              size: 20, // 10pt
              color: color || "1E293B",
            }),
          ],
        }),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        left: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        right: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
      },
    });
  };

  const createProgressBarCell = (percentage: number) => {
    const val = Math.min(100, Math.max(0, percentage));
    const filledBlocks = Math.round(val / 10);
    const emptyBlocks = 10 - filledBlocks;
    const barStr = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

    let color = "0D9488"; // default teal
    let bg = "F0FDF4";
    if (val >= 85) { color = "2563EB"; bg = "EFF6FF"; } // blue
    else if (val >= 70) { color = "16A34A"; bg = "F0FDF4"; } // green
    else if (val >= 50) { color = "D97706"; bg = "FFFBEB"; } // yellow
    else { color = "DC2626"; bg = "FEF2F2"; } // red

    return new TableCell({
      shading: { fill: bg, type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: `${barStr} `,
              bold: true,
              font: "Consolas",
              size: 20,
              color: color,
            }),
            new TextRun({
              text: `${val.toFixed(1)}%`,
              bold: true,
              font: "Calibri",
              size: 20,
              color: "0F172A",
            }),
          ],
        }),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        left: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
        right: { style: BorderStyle.SINGLE, size: 1, color: borderGray },
      },
    });
  };

  const createHeaderCell = (text: string, align: any = AlignmentType.CENTER) => {
    return createCell(text, true, align, headerBgColor, headerTextColor);
  };

  const createCalloutCard = (title: string, contentStr: string, options?: { bgHex?: string; borderHex?: string; icon?: string }) => {
    const bg = options?.bgHex || "F0FDFA";
    const border = options?.borderHex || "0D9488";

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              shading: { fill: bg, type: ShadingType.CLEAR },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: border },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: border },
                left: { style: BorderStyle.SINGLE, size: 12, color: border }, // thick left border
                right: { style: BorderStyle.SINGLE, size: 2, color: border },
              },
              margins: { top: 120, bottom: 120, left: 180, right: 180 },
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  keepNext: true,
                  children: [
                    new TextRun({
                      text: (options?.icon ? options.icon + " " : "✦ ") + title.toUpperCase(),
                      bold: true,
                      font: "Calibri",
                      size: 22,
                      color: "0F172A",
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40, after: 60, line: 260 },
                  children: [
                    new TextRun({
                      text: contentStr,
                      font: "Calibri",
                      size: 20,
                      color: "1E293B",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };

  const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

  const p = (text: string, options?: { bold?: boolean; italic?: boolean; size?: number; align?: any; spaceBefore?: number; spaceAfter?: number; color?: string }) => {
    return new Paragraph({
      alignment: options?.align || AlignmentType.LEFT,
      spacing: { before: options?.spaceBefore ?? 120, after: options?.spaceAfter ?? 120, line: 276 }, // 1.15 line height
      children: [
        new TextRun({
          text,
          bold: options?.bold,
          italics: options?.italic,
          font: "Calibri",
          size: options?.size || 22, // 11pt default
          color: options?.color || "1E293B",
        }),
      ],
    });
  };

  const heading1 = (line1: string, line2?: string) => {
    const children = [
      new TextRun({
        text: line1.toUpperCase(),
        bold: true,
        font: "Calibri",
        size: 28, // 14pt
        color: "0F172A",
      }),
    ];
    if (line2) {
      children.push(
        new TextRun({
          text: line2.toUpperCase(),
          bold: true,
          font: "Calibri",
          size: 28, // 14pt
          color: "0F172A",
          break: 1,
        })
      );
    }
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 180 },
      keepNext: true,
      children,
    });
  };

  const heading2 = (text: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.LEFT,
      spacing: { before: 240, after: 120 },
      keepNext: true,
      children: [
        new TextRun({
          text,
          bold: true,
          font: "Calibri",
          size: 24, // 12pt
          color: "1E293B",
        }),
      ],
    });
  };

  const heading3 = (text: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      alignment: AlignmentType.LEFT,
      spacing: { before: 180, after: 90 },
      keepNext: true,
      children: [
        new TextRun({
          text,
          bold: true,
          font: "Calibri",
          size: 22, // 11pt
          color: "334155",
        }),
      ],
    });
  };

  const heading4 = (text: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_4,
      alignment: AlignmentType.LEFT,
      spacing: { before: 140, after: 70 },
      keepNext: true,
      children: [
        new TextRun({
          text,
          bold: true,
          font: "Calibri",
          size: 20, // 10pt
          color: "475569",
        }),
      ],
    });
  };

  const bullet = (text: string, level = 0) => {
    return new Paragraph({
      bullet: { level },
      spacing: { before: 60, after: 60, line: 260 },
      children: [
        new TextRun({
          text,
          font: "Calibri",
          size: 22,
          color: "1E293B",
        }),
      ],
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 Portrait width in dxa (210mm)
              height: 16838, // A4 Portrait height in dxa (297mm)
            },
            margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 }, // 2.5cm margin all around (~1417 dxa)
          },
        },
        headers: {
          default: new Header({
            children: [
              p(`Laporan Survei Budaya Keselamatan Pasien - ${data.namaRs}`, {
                italic: true,
                size: 18,
                color: "64748B",
                align: AlignmentType.RIGHT,
                spaceAfter: 120,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Halaman ", font: "Calibri", size: 18, color: "64748B" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "64748B" }),
                  new TextRun({ text: " dari ", font: "Calibri", size: 18, color: "64748B" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: "64748B" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // COVER PAGE
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2880, after: 240 },
            children: [
              new TextRun({
                text: "LAPORAN SURVEI BUDAYA KESELAMATAN PASIEN",
                bold: true,
                font: "Calibri",
                size: 32, // 16pt
                color: "0F172A",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 240 },
            children: [
              new TextRun({
                text: data.namaRs.toUpperCase(),
                bold: true,
                font: "Calibri",
                size: 36, // 18pt
                color: "0D9488",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 2880 },
            children: [
              new TextRun({
                text: `PERIODE TAHUN ${data.tahun}`,
                bold: true,
                font: "Calibri",
                size: 28, // 14pt
                color: "334155",
              }),
            ],
          }),

          p("INSTRUMEN AHRQ HOSPITAL SURVEY ON PATIENT SAFETY CULTURE (SOPS®) V2.0", { align: AlignmentType.CENTER, bold: true, size: 20, color: "475569" }),

          pageBreak(),

          // DAFTAR ISI
          heading1("DAFTAR ISI"),
          new TableOfContents("Daftar Isi", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),

          pageBreak(),

          // BAB I PENDAHULUAN
          heading1("BAB I", "PENDAHULUAN"),
          
          heading2("1.1 Latar Belakang"),
          p("Keselamatan pasien merupakan prioritas utama dan prinsip mendasar dalam pelayanan kesehatan di rumah sakit. Berdasarkan pandangan global dan standar akreditasi rumah sakit, upaya peningkatan keselamatan pasien tidak hanya berfokus pada penerapan prosedur operasional standar dan penyediaan sarana prasarana, tetapi juga sangat bergantung pada budaya keselamatan pasien (patient safety culture) yang hidup di dalam organisasi."),
          p("Budaya keselamatan pasien didefinisikan sebagai nilai, keyakinan, dan norma yang dibagikan oleh staf rumah sakit mengenai apa yang penting dan bagaimana perilaku terkait keselamatan diwujudkan. Budaya yang kuat memafasilitasi komunikasi yang terbuka, pelaporan insiden tanpa rasa takut akan hukuman (non-punitive environment), pembelajaran berkelanjutan dari kesalahan, serta kerja sama tim yang solid antar unit."),
          p("Untuk mengukur dan mengevaluasi sejauh mana budaya keselamatan telah tertanam di rumah sakit, diperlukan instrumen pengukuran yang valid, handal, dan terstandar secara internasional. Agency for Healthcare Research and Quality (AHRQ) telah memperbarui instrumen pengukuran melalui AHRQ Hospital Survey on Patient Safety Culture (SOPS®) Version 2.0. Versi ini menyempurnakan dimensi pengukuran terdahulu agar lebih relevan dengan dinamika pelayanan kesehatan modern, berfokus pada respons terhadap kesalahan, dukungan kepemimpinan, pembelajaran organisasi, dan komunikasi yang terbuka."),
          p(`Pelaksanaan survei budaya keselamatan pasien berbasis AHRQ Versi 2.0 ini dilakukan untuk memetakan kekuatan (strengths) serta area yang membutuhkan peningkatan (areas for improvement) di ${data.namaRs}. Hasil dari survei ini menjadi landasan berbasis data (data-driven) dalam merumuskan strategi perbaikan mutu dan keselamatan pasien secara terarah dan berkelanjutan.`),

          heading2("1.2 Tujuan"),
          heading3("1.2.1 Tujuan Umum"),
          p(`Mengetahui gambaran penerapan budaya keselamatan pasien di ${data.namaRs} menggunakan instrumen AHRQ Versi 2.0 sebagai dasar penyusunan program peningkatan mutu dan keselamatan pasien.`),
          heading3("1.2.2 Tujuan Khusus"),
          bullet("1. Mengidentifikasi karakteristik responden berdasarkan unit kerja, profesi, lama bekerja, dan jam kerja per minggu."),
          bullet("2. Menganalisis persentase respon positif (% Positive Response) pada 10 dimensi budaya keselamatan pasien AHRQ Versi 2.0."),
          bullet(`3. Mengetahui persepsi staf terhadap tingkat keselamatan pasien secara keseluruhan (Overall Patient Safety Rating) di ${data.namaRs}.`),
          bullet("4. Mengidentifikasi dimensi yang menjadi kekuatan area (strengths, ≥ 75% respon positif) dan area yang memerlukan perbaikan (areas for improvement, < 50% respon positif)."),
          bullet("5. Menyediakan data acuan (baseline data) untuk evaluasi berkala dan pembandingan (benchmarking) budaya keselamatan pasien di masa mendatang."),

          heading2("1.3 Manfaat"),
          heading3("1.3.1 Bagi Manajemen Rumah Sakit"),
          bullet("1. Menyediakan data objektif mengenai persepsi staf terhadap budaya keselamatan pasien di seluruh tingkatan unit."),
          bullet("2. Menjadi acuan pengambilan keputusan strategis dan alokasi sumber daya dalam program keselamatan pasien."),
          bullet("3. Membantu kepemimpinan rumah sakit dalam membangun lingkungan kerja yang mendukung pelaporan insiden tanpa rasa takut (just culture)."),
          heading3("1.3.2 Bagi Pengelola Mutu dan Keselamatan Pasien Rumah Sakit"),
          bullet("1. Mempermudah pemetaan fokus intervensi dan prioritas perbaikan mutu di unit-unit kerja yang membutuhkan pendampingan khusus."),
          bullet("2. Memenuhi persyaratan standar akreditasi rumah sakit terkait pengukuran berkala budaya keselamatan pasien."),
          heading3("1.3.3 Bagi Staf dan Unit Kerja"),
          bullet("1. Menjadi sarana bagi staf untuk menyuarakan persepsi, kendala, dan masukan terkait keselamatan pasien secara anonim dan terstruktur."),
          bullet("2. Mendorong kolaborasi, komunikasi interprofesi, dan kesadaran kolektif antar unit kerja untuk menciptakan lingkungan pelayanan yang aman bagi pasien."),

          pageBreak(),

          // BAB II METODOLOGI SURVEI
          heading1("BAB II", "METODOLOGI SURVEI"),
          
          heading2("2.1 Desain Penelitian / Survei"),
          p("Survei ini menggunakan desain deskriptif kuantitatif dengan pendekatan cross-sectional. Pendekatan ini digunakan untuk mengukur dan menggambarkan persepsi staf rumah sakit terhadap budaya keselamatan pasien pada satu kurun waktu tertentu tanpa memberikan intervensi langsung saat pengukuran berlangsung."),

          heading2("2.2 Waktu dan Lokasi Pelaksanaan"),
          heading3("Lokasi Pelaksanaan"),
          p(`Seluruh unit kerja/instalasi di ${data.namaRs}, meliputi:`),
          bullet("• Unit Pelayanan Medis"),
          bullet("• Unit Keperawatan"),
          bullet("• Unit Penunjang Medis"),
          bullet("• Unit Administrasi"),
          bullet("• Unit Manajemen"),
          
          heading3("Waktu Pelaksanaan"),
          p("Survei dilaksanakan selama periode:"),
          p(data.periodeSurvei, { bold: true }), // Bold

          heading2("2.3 Populasi dan Sampel"),
          heading3("2.3.1 Populasi"),
          p(`Populasi dalam survei ini adalah seluruh pegawai yang bekerja di ${data.namaRs}, baik manajemen, staf medis, keperawatan, tenaga kesehatan lainnya maupun staf administrasi/non klinis.`),
          
          heading3("2.3.2 Kriteria Inklusi dan Eksklusi"),
          heading3("Kriteria Inklusi"),
          bullet("• Pegawai tetap maupun kontrak yang telah bekerja minimal 3 bulan."),
          bullet("• Memiliki interaksi langsung maupun tidak langsung terhadap pelayanan pasien."),
          bullet("• Bersedia mengisi kuesioner secara sukarela."),
          
          heading3("Kriteria Eksklusi"),
          bullet("• Pegawai yang sedang menjalani cuti panjang."),
          bullet("• Mahasiswa praktik."),
          bullet("• Siswa praktik."),
          bullet("• Residen yang belum menjadi pegawai rumah sakit."),

          heading3("2.3.3 Teknik Sampling dan Jumlah Sampel"),
          heading3("Teknik Sampling"),
          p("Pengambilan sampel dilakukan menggunakan:"),
          bullet("• Total Sampling"),
          p("atau"),
          bullet("• Proportionate Stratified Random Sampling"),

          heading3("Ukuran Sampel"),
          p("Target jumlah responden mengikuti rekomendasi AHRQ."),
          bullet(`• Jumlah Target Responden: ${data.totalTarget}`),
          bullet(`• Jumlah Responden Mengisi: ${data.totalActual}`),
          bullet(`• Persentase Response Rate: ${data.responseRate}`),

          heading2("2.4 Instrumen Survei"),
          p("Instrumen yang digunakan adalah AHRQ Hospital Survey on Patient Safety Culture (SOPS®) Version 2.0 yang telah diterjemahkan ke dalam bahasa Indonesia dan diuji keterbacaannya."),
          p("Instrumen SOPS® Versi 2.0 mengukur 10 Dimensi Budaya Keselamatan Pasien yang terdiri dari 32 item pertanyaan primer, ditambah dengan bagian evaluasi penilaian tingkat keselamatan pasien (overall rating) dan karakteristik demografi responden:"),
          bullet("1. Teamwork (Kerja Sama Tim) – 3 item"),
          bullet("2. Staffing and Work Pace (Ketenagaan dan Kecepatan Kerja) – 4 item"),
          bullet("3. Organizational Learning—Continuous Improvement (Pembelajaran Organisasi—Peningkatan Berkelanjutan) – 3 item"),
          bullet("4. Response to Error (Respons Terhadap Kesalahan / Non-punitive Environment) – 4 item"),
          bullet("5. Supervisor, Manager, or Clinical Leader Support for Patient Safety (Dukungan Atasan/Manajer/Pimpinan Klinis terhadap Keselamatan Pasien) – 3 item"),
          bullet("6. Management Support for Patient Safety (Dukungan Manajemen/Direksi terhadap Keselamatan Pasien) – 3 item"),
          bullet("7. Communication Openness (Keterbukaan Komunikasi) – 4 item"),
          bullet("8. Reporting Patient Safety Events (Pelaporan Insiden Keselamatan Pasien) – 2 item"),
          bullet("9. Hospital Handoffs and Information Exchange (Serah Terima/Handoff dan Pertukaran Informasi di Rumah Sakit) – 3 item"),
          bullet("10. Communication About Error (Komunikasi Mengenai Kesalahan) – 3 item"),
          bullet("• Tingkat Keselamatan Pasien Keseluruhan (Overall Patient Safety Rating): 1 item pertanyaan penilaian global dengan skala Likert 5 poin (Sangat Buruk, Buruk, Cukup, Baik, Sangat Baik)."),
          bullet("• Pertanyaan Demografi: Meliputi unit kerja utama, profesi/peran, lama bekerja di rumah sakit, lama bekerja di unit saat ini, serta jumlah jam kerja per minggu."),

          heading2("2.5 Metode Pengumpulan Data"),
          p("Pengumpulan data dilakukan secara elektronik/online (e-survey menggunakan link aplikasi pengukuran budaya keselamatan) dengan memperhitungkan kerahasiaan:"),
          
          bullet("Penyebaran Tautan/Kuesioner: Disebarkan melalui koordinasi Kepala Unit/Ruangan dan Tim Komite Mutu."),

          bullet("Prinsip Anonimitas: Responden tidak diminta mencantumkan nama atau NIP untuk menjamin kerahasiaan (anonymity) dan kejujuran jawaban tanpa kekhawatiran akan adanya sanksi/dampak karir."),

          bullet("Monitoring Response Rate: Tim pelaksana melakukan pemantauan harian terhadap tingkat partisipasi di tiap unit untuk memastikan keterwakilan data."),

          heading2("2.6 Analisis Data"),
          p("Pengolahan dan analisis data dilakukan mengikuti panduan pengolahan data AHRQ SOPS® Version 2.0:"),

          bullet("Analisis Deskriptif Demografi: Menghitung frekuensi dan persentase untuk karakteristik responden (profesi, unit kerja, masa kerja, jam kerja)."),

          bullet("Kalkulasi Persentase Respon Positif (% Positive Response):"),
          bullet("Pilihan jawaban kuesioner menggunakan skala Likert 5 poin:", 1),
          bullet("Agreement Scale: 1 = Sangat Tidak Setuju, 2 = Tidak Setuju, 3 = Netral, 4 = Setuju, 5 = Sangat Setuju.", 2),
          bullet("Frequency Scale: 1 = Tidak Pernah, 2 = Jarang, 3 = Kadang-kadang, 4 = Sering, 5 = Selalu.", 2),
          bullet("Item Berpernyataan Positif (Positively Worded Items): Respon bernilai 4 (Setuju/Sering) dan 5 (Sangat Setuju/Selalu) dihitung sebagai respon positif.", 1),
          bullet("Item Berpernyataan Negatif (Negatively Worded / Negatively Worded Reverse Items): Respon bernilai 1 (Sangat Tidak Setuju/Tidak Pernah) dan 2 (Tidak Setuju/Jarang) dihitung sebagai respon positif.", 1),

          bullet("Formula perhitungan respon positif dimensi:"),



          new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F0FDF4", type: ShadingType.CLEAR },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 8, color: "0D9488" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "0D9488" },
                      left: { style: BorderStyle.SINGLE, size: 8, color: "0D9488" },
                      right: { style: BorderStyle.SINGLE, size: 8, color: "0D9488" },
                    },
                    margins: { top: 120, bottom: 120, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80, after: 80 },
                        children: [
                          new TextRun({
                            text: '"% Respon Positif Dimensi"',
                            bold: true,
                            font: "Calibri",
                            size: 20,
                            color: "0F172A"
                          }),
                          new TextRun({
                            text: " = ",
                            font: "Calibri",
                            size: 20,
                            color: "0D9488"
                          }),
                          new TextRun({
                            text: "Total Jawaban Positif pada Seluruh Item dalam Dimensi",
                            bold: true,
                            font: "Calibri",
                            size: 18,
                            color: "1E293B"
                          }),
                          new TextRun({
                            text: "  /  ",
                            bold: true,
                            font: "Calibri",
                            size: 20,
                            color: "0D9488"
                          }),
                          new TextRun({
                            text: "Total Jawaban yang Terisi pada Seluruh Item dalam Dimensi",
                            bold: true,
                            font: "Calibri",
                            size: 18,
                            color: "1E293B"
                          }),
                          new TextRun({
                            text: "  × 100%",
                            bold: true,
                            font: "Calibri",
                            size: 20,
                            color: "0F172A"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          p("", { spaceAfter: 60 }),

          bullet("Kriteria Kategori Dimensi:"),
          bullet("Area Keunggulan / Kekuatan (Strengths): Dimensi dengan persentase respon positif ≥75%.", 1),
          bullet("Area Perlu Perbaikan (Areas for Improvement): Dimensi dengan persentase respon positif <50%.", 1),
          bullet("Area Sedang / Netral: Dimensi dengan persentase respon positif antara 50%-74%.", 1),

          bullet("Analisis Tingkat Keselamatan Pasien Keseluruhan: Menghitung distribusi persentase penilaian staf terhadap mutu keselamatan pasien di rumah sakit secara umum."),

          pageBreak(),

          // BAB III HASIL DAN PEMBAHASAN
          heading1("BAB III", "HASIL DAN PEMBAHASAN"),

          heading2("3.1 Gambaran Umum Respon Rate dan Karakteristik Responden"),
          heading3("3.1.1 Tingkat Partisipasi (Response Rate)"),
          p(`Survei dilaksanakan pada periode ${data.periodeSurvei}. Dari total ${data.totalTarget} kuesioner yang disebarkan ke seluruh unit kerja di ${data.namaRs}, diperoleh kuesioner kembali dan memenuhi syarat untuk dianalisis sebanyak ${data.totalActual} kuesioner. Dengan demikian, tingkat partisipasi (response rate) survei ini adalah sebesar ${data.responseRate}. Tingkat partisipasi ini telah memenuhi ambang batas minimal yang direkomendasikan AHRQ (≥60%) sehingga representatif untuk menggambarkan budaya keselamatan pasien secara organisasi.`),

          heading3("3.1.2 Demografi Responden"),
          p("Karakteristik responden dikelompokkan berdasarkan profesi/posisi staf, unit kerja, masa kerja di rumah sakit, dan jumlah jam kerja per minggu"),

          // Table 3.1 Demografi
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell("Karakteristik", AlignmentType.LEFT),
                  createHeaderCell("Kategori / Detail", AlignmentType.CENTER),
                  createHeaderCell("Jumlah (n)", AlignmentType.CENTER),
                  createHeaderCell("Persentase (%)", AlignmentType.CENTER),
                ],
              }),
              ...data.demographics.profesi.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Posisi / Jabatan" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ),
              ...data.demographics.masaKerja.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Masa Kerja di RS Ini" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ),
              ...(data.demographics.masaKerjaUnit ? data.demographics.masaKerjaUnit.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Masa Kerja di Unit Kerja" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ) : []),
              ...data.demographics.jamKerja.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Jam Kerja per Minggu" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ),
              ...(data.demographics.interaksiKontak ? data.demographics.interaksiKontak.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Interaksi Kontak Pasien" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ) : []),
              ...data.demographics.unitKerja.map((item, idx) => 
                new TableRow({
                  children: [
                    createCell(idx === 0 ? "Unit / Area Kerja" : "", true),
                    createCell(item.category),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, false, AlignmentType.CENTER),
                  ],
                })
              ),
            ],
          }),

          heading2(`3.2 Hasil Pengukuran Budaya Keselamatan Pasien ${data.namaRs}`),
          p(`Berdasarkan kalkulasi terhadap 10 dimensi AHRQ Versi 2.0, rata-rata tingkat respon positif budaya keselamatan pasien di ${data.namaRs} adalah ${data.overallAverage.toFixed(1)}%.`),

          heading3("3.2.1 Respon positif berdasarkan 10 dimensi budaya keselamatan pasien"),
          p("Ringkasan hasil pencapaian persentase respon positif (% Positive Response) untuk setiap dimensi disajikan pada Tabel berikut:"),
          
          // Table 3.2 10 Dimensi with Visual Progress Bars
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: [
                  createHeaderCell("No.", AlignmentType.CENTER),
                  createHeaderCell("Kode", AlignmentType.CENTER),
                  createHeaderCell("Komponen / Dimensi Budaya Keselamatan Pasien", AlignmentType.LEFT),
                  createHeaderCell("Diagram Progress & % Respon", AlignmentType.CENTER),
                  createHeaderCell("Kategori Penilaian", AlignmentType.CENTER),
                ],
              }),
              ...data.dimensionScores.map((d, idx) => 
                new TableRow({
                  cantSplit: true,
                  children: [
                    createCell(`${idx + 1}.`, false, AlignmentType.CENTER),
                    createCell(d.kode, true, AlignmentType.CENTER),
                    createCell(d.nama),
                    createProgressBarCell(d.percentage),
                    createCell(
                      d.percentage >= 75 ? "Area Kekuatan (≥75%)" : d.percentage < 50 ? "Area Perbaikan (<50%)" : "Moderat (50-74%)",
                      true,
                      AlignmentType.CENTER,
                      d.percentage >= 75 ? "DCFCE7" : d.percentage < 50 ? "FEE2E2" : "FEF3C7",
                      d.percentage >= 75 ? "15803D" : d.percentage < 50 ? "B91C1C" : "B45309"
                    ),
                  ],
                })
              ),
              new TableRow({
                cantSplit: true,
                children: [
                  createCell("Rata-Rata Seluruh 10 Dimensi", true, AlignmentType.RIGHT, "CCFBF1"),
                  createCell("-", false, AlignmentType.CENTER, "CCFBF1"),
                  createCell("Skor Terintegrasi Realtime", true, AlignmentType.LEFT, "CCFBF1"),
                  createProgressBarCell(data.overallAverage),
                  createCell("Sangat Baik", true, AlignmentType.CENTER, "CCFBF1", "0F766E"),
                ]
              })
            ],
          }),

          p("", { spaceAfter: 60 }),

          ...(data.chartImages?.chart10Dimensi ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
              children: [
                new ImageRun({
                  data: base64ToUint8Array(data.chartImages.chart10Dimensi),
                  transformation: { width: 550, height: 260 },
                  type: "png"
                })
              ]
            }),
            p("", { spaceAfter: 60 })
          ] : []),

          createCalloutCard(
            "Interpretasi & Analisis Data Dimensi",
            `Hasil analisis 10 dimensi budaya keselamatan pasien menghasilkan nilai rata-rata keseluruhan respons positif sebesar ${data.overallAverage.toFixed(1)}%. Kekuatan utama (aspek unggul) ${data.namaRs} terletak pada dimensi "${data.dimensionScores.slice().sort((a,b)=>b.percentage-a.percentage)[0]?.nama || '-'}" dengan skor positif tertinggi mencapai ${data.dimensionScores.slice().sort((a,b)=>b.percentage-a.percentage)[0]?.percentage.toFixed(1) || 0}%. Sebaliknya, dimensi yang mendesak untuk segera diintervensi adalah "${data.dimensionScores.slice().sort((a,b)=>a.percentage-b.percentage)[0]?.nama || '-'}" dengan respons positif terendah sebesar ${data.dimensionScores.slice().sort((a,b)=>a.percentage-b.percentage)[0]?.percentage.toFixed(1) || 0}%.`,
            { bgHex: "EFF6FF", borderHex: "2563EB", icon: "📊" }
          ),

          p("", { spaceAfter: 120 }),

          heading3("3.2.2 Rating Keselamatan Pasien Keseluruhan (Overall Patient Safety Rating)"),
          p(`Sebanyak ${data.safetyRatingPositivePct.toFixed(1)}% responden menilai tingkat keselamatan pasien di ${data.namaRs} berada pada kategori 'Baik' hingga 'Sangat Baik'. Distribusi penilaian dapat dilihat pada tabel berikut:`),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: [
                  createHeaderCell("No.", AlignmentType.CENTER),
                  createHeaderCell("Kategori Rating Keselamatan", AlignmentType.LEFT),
                  createHeaderCell("Jumlah (n)", AlignmentType.CENTER),
                  createHeaderCell("Persentase (%)", AlignmentType.CENTER),
                  createHeaderCell("Diagram Progress", AlignmentType.CENTER),
                ],
              }),
              ...data.safetyRating.map((item, idx) => {
                const numPct = parseFloat(item.percentage.replace('%', '')) || 0;
                return new TableRow({
                  cantSplit: true,
                  children: [
                    createCell(`${idx + 1}.`, false, AlignmentType.CENTER),
                    createCell(item.name, true),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, true, AlignmentType.CENTER),
                    createProgressBarCell(numPct),
                  ],
                });
              })
            ],
          }),

          ...(data.chartImages?.overallRating ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
              children: [
                new ImageRun({
                  data: base64ToUint8Array(data.chartImages.overallRating),
                  transformation: { width: 550, height: 260 },
                  type: "png"
                })
              ]
            })
          ] : []),

          p("", { spaceAfter: 120 }),

          heading3("3.2.3 Jumlah Insiden Keselamatan Pasien Yang Dilaporkan"),
          p(`Sebanyak ${data.reportedEventsAnyPct.toFixed(1)}% responden melaporkan setidaknya 1 insiden keselamatan pasien dalam 12 bulan terakhir. Distribusi pelaporan insiden disajikan pada tabel berikut:`),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: [
                  createHeaderCell("No.", AlignmentType.CENTER),
                  createHeaderCell("Frekuensi Insiden Dilaporkan (12 Bulan)", AlignmentType.LEFT),
                  createHeaderCell("Jumlah (n)", AlignmentType.CENTER),
                  createHeaderCell("Persentase (%)", AlignmentType.CENTER),
                  createHeaderCell("Diagram Progress", AlignmentType.CENTER),
                ],
              }),
              ...data.reportedEvents.map((item, idx) => {
                const numPct = parseFloat(item.percentage.replace('%', '')) || 0;
                return new TableRow({
                  cantSplit: true,
                  children: [
                    createCell(`${idx + 1}.`, false, AlignmentType.CENTER),
                    createCell(item.name, true),
                    createCell(item.count.toString(), false, AlignmentType.CENTER),
                    createCell(item.percentage, true, AlignmentType.CENTER),
                    createProgressBarCell(numPct),
                  ],
                });
              })
            ],
          }),

          ...(data.chartImages?.reportedEvents ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
              children: [
                new ImageRun({
                  data: base64ToUint8Array(data.chartImages.reportedEvents),
                  transformation: { width: 550, height: 260 },
                  type: "png"
                })
              ]
            })
          ] : []),

          p("", { spaceAfter: 120 }),

          // 3.2.5 Perbandingan Respon Positif Budaya Keselamatan Berdasarkan Karakteristik Demografis
          heading3("3.2.5 Perbandingan Respon Positif Budaya Keselamatan Berdasarkan Karakteristik Demografis"),
          p("Budaya keselamatan pasien bersifat heterogen dan dapat dirasakan berbeda antar profesi, unit pelayanan, maupun lama masa bakti staf."),

          // A. Berdasarkan Posisi Staf (Profesi)
          ...(data.positionDimensionScores ? [
            heading4("A. Perbandingan Dimensi Berdasarkan Posisi Staf (Profesi)"),
            p("Berikut adalah tabel perbandingan persentase respon positif seluruh dimensi berdasarkan posisi staf (profesi) di rumah sakit:"),
            ...(() => {
              const list = data.demographics.profesi || [];
              const chunks: Array<typeof list> = [];
              for (let i = 0; i < list.length; i += 5) {
                chunks.push(list.slice(i, i + 5));
              }
              return chunks.map((chunk, chunkIdx) => {
                const colNames = chunk.map(c => c.category);
                return new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      tableHeader: true,
                      cantSplit: true,
                      children: [
                        createHeaderCell("No.", AlignmentType.CENTER),
                        createHeaderCell(`Dimensi Budaya Keselamatan (Bagian ${chunkIdx + 1})`, AlignmentType.LEFT),
                        ...chunk.map(col => createHeaderCell(`${col.category} (N=${col.count})`, AlignmentType.CENTER)),
                      ],
                    }),
                    ...data.dimensionScores.map((dim, idx) => {
                      const scoreObj = data.positionDimensionScores?.find(s => s.id === dim.id);
                      return new TableRow({
                        cantSplit: true,
                        children: [
                          createCell(`${idx + 1}`, false, AlignmentType.CENTER),
                          createCell(dim.nama),
                          ...colNames.map(name => {
                            const val = scoreObj ? scoreObj[name] : null;
                            return createCell(
                              val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-',
                              true,
                              AlignmentType.CENTER,
                              "F9FAFB"
                            );
                          }),
                        ],
                      });
                    })
                  ],
                });
              });
            })(),
            p("", { spaceAfter: 120 })
          ] : []),

          // B. Berdasarkan Unit Kerja
          ...(data.unitDimensionScores ? [
            heading4("B. Perbandingan Dimensi Berdasarkan Unit Kerja"),
            p("Berikut adalah tabel perbandingan persentase respon positif seluruh dimensi berdasarkan unit/area kerja di rumah sakit:"),
            ...(() => {
              const list = data.demographics.unitKerja || [];
              const chunks: Array<typeof list> = [];
              for (let i = 0; i < list.length; i += 5) {
                chunks.push(list.slice(i, i + 5));
              }
              return chunks.map((chunk, chunkIdx) => {
                const colNames = chunk.map(c => c.category);
                return new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      tableHeader: true,
                      cantSplit: true,
                      children: [
                        createHeaderCell("No.", AlignmentType.CENTER),
                        createHeaderCell(`Dimensi Budaya Keselamatan (Bagian ${chunkIdx + 1})`, AlignmentType.LEFT),
                        ...chunk.map(col => createHeaderCell(`${col.category} (N=${col.count})`, AlignmentType.CENTER)),
                      ],
                    }),
                    ...data.dimensionScores.map((dim, idx) => {
                      const scoreObj = data.unitDimensionScores?.find(s => s.id === dim.id);
                      return new TableRow({
                        cantSplit: true,
                        children: [
                          createCell(`${idx + 1}`, false, AlignmentType.CENTER),
                          createCell(dim.nama),
                          ...colNames.map(name => {
                            const val = scoreObj ? scoreObj[name] : null;
                            return createCell(
                              val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-',
                              true,
                              AlignmentType.CENTER,
                              "F9FAFB"
                            );
                          }),
                        ],
                      });
                    })
                  ],
                });
              });
            })(),
            p("", { spaceAfter: 120 })
          ] : []),

          // C. Berdasarkan Masa Kerja & Jam Kerja
          ...(data.tenureDimensionScores && data.workHoursDimensionScores ? [
            heading4("C. Perbandingan Berdasarkan Masa Kerja & Jam Kerja"),
            p("Berikut adalah tabel perbandingan persentase respon positif seluruh dimensi berdasarkan masa kerja (lama bekerja) staf di rumah sakit dan unit kerja saat ini, serta jumlah jam kerja per minggu:"),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  tableHeader: true,
                  cantSplit: true,
                  children: [
                    createHeaderCell("No.", AlignmentType.CENTER),
                    createHeaderCell("Dimensi Budaya Keselamatan", AlignmentType.LEFT),
                    // Tenure (4 columns)
                    ...data.demographics.masaKerja.slice(0, 4).map(col => createHeaderCell(`MK: ${col.category.replace('hingga', '-').replace('atau lebih', '+')}`, AlignmentType.CENTER)),
                    // Work Hours (4 columns)
                    ...data.demographics.jamKerja.slice(0, 4).map(col => createHeaderCell(`JK: ${col.category.replace('hingga', '-').replace('atau lebih', '+')}`, AlignmentType.CENTER)),
                  ],
                }),
                ...data.dimensionScores.map((dim, idx) => {
                  const tenureObj = data.tenureDimensionScores?.find(s => s.id === dim.id);
                  const workHoursObj = data.workHoursDimensionScores?.find(s => s.id === dim.id);
                  return new TableRow({
                    cantSplit: true,
                    children: [
                      createCell(`${idx + 1}`, false, AlignmentType.CENTER),
                      createCell(dim.nama),
                      // Tenure columns
                      ...data.demographics.masaKerja.slice(0, 4).map(col => {
                        const val = tenureObj ? tenureObj[col.category] : null;
                        return createCell(
                          val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-',
                          true,
                          AlignmentType.CENTER,
                          "F3F4F6"
                        );
                      }),
                      // Work Hours columns
                      ...data.demographics.jamKerja.slice(0, 4).map(col => {
                        const val = workHoursObj ? workHoursObj[col.category] : null;
                        return createCell(
                          val !== undefined && val !== null ? `${val.toFixed(1)}%` : '-',
                          true,
                          AlignmentType.CENTER,
                          "F0FDFA"
                        );
                      }),
                    ],
                  });
                })
              ],
            }),
            p("", { spaceAfter: 120 })
          ] : []),

          ...(data.hasBenchmark && data.benchmarkComparison && data.benchmarkComparison.length > 0 ? [
            heading3(`3.2.7 Analisis Komparasi Benchmark dengan ${data.benchmarkName || 'Rumah Sakit Pembanding'}`),
            p(`Hasil pembandingan skor % Respon Positif antara ${data.namaRs} dengan ${data.benchmarkName || 'RS Pembanding'} disajikan pada tabel berikut:`),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  tableHeader: true,
                  cantSplit: true,
                  children: [
                    createHeaderCell("Kode", AlignmentType.CENTER),
                    createHeaderCell("Dimensi Budaya Keselamatan", AlignmentType.LEFT),
                    createHeaderCell(`${data.namaRs} (%)`, AlignmentType.CENTER),
                    createHeaderCell(`Benchmark (%)`, AlignmentType.CENTER),
                    createHeaderCell("Selisih (Diff)", AlignmentType.CENTER),
                  ],
                }),
                ...data.benchmarkComparison.map((b) => {
                  const isBetter = b.diff >= 0;
                  return new TableRow({
                    cantSplit: true,
                    children: [
                      createCell(b.kode, true, AlignmentType.CENTER),
                      createCell(b.nama),
                      createCell(`${b.rsPct.toFixed(1)}%`, true, AlignmentType.CENTER, "F0FDFA", "0D9488"),
                      createCell(`${b.benchPct.toFixed(1)}%`, false, AlignmentType.CENTER),
                      createCell(
                        `${isBetter ? '+' : ''}${b.diff.toFixed(1)}%`,
                        true,
                        AlignmentType.CENTER,
                        isBetter ? "DCFCE7" : "FEE2E2",
                        isBetter ? "15803D" : "B91C1C"
                      ),
                    ],
                  });
                })
              ],
            }),
            ...(data.chartImages?.benchmark ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
                children: [
                  new ImageRun({
                    data: base64ToUint8Array(data.chartImages.benchmark),
                    transformation: { width: 550, height: 260 },
                    type: "png"
                  })
                ]
              })
            ] : []),
            p("", { spaceAfter: 120 })
          ] : []),

          ...(data.comments ? [
            heading3(`3.2.8 Hasil Analisis Kualitatif dan Rekomendasi Peningkatan Budaya Keselamatan Pasien`),
            p(`Berdasarkan masukan responden survei budaya keselamatan pasien tahun ${data.tahun} di ${data.namaRs}:`, { bold: true, spaceAfter: 60 }),
            p(`• Total Komentar Masuk: ${data.comments.total} komentar`, { spaceAfter: 40 }),
            p(`• Komentar Positif: ${data.comments.positivePercentage}% (${data.comments.positive} komentar)`, { spaceAfter: 40 }),
            p(`• Saran & Masukan Konstruktif: ${data.comments.constructivePercentage}% (${data.comments.constructive} komentar)`, { spaceAfter: 80 }),
            
            heading4(`1. Interpretasi & Analisis Data`),
            ...(data.comments.total > 0 ? [
              p(data.comments.analysisText || `Berdasarkan hasil analisis kualitatif terhadap total ${data.comments.total} komentar bebas responden pada survei budaya keselamatan pasien tahun ${data.tahun} di ${data.namaRs}, secara otomatis teridentifikasi sebanyak ${data.comments.positive} komentar positif (${data.comments.positivePercentage}%) dan ${data.comments.constructive} komentar berisi saran atau masukan konstruktif (${data.comments.constructivePercentage}%).`, { spaceAfter: 120 })
            ] : [
              p(`Belum terdapat komentar atau masukan responden pada tahun survei yang dipilih.`, { italic: true, spaceAfter: 120 })
            ]),

            heading4(`2. Rekomendasi Peningkatan`),
            p(`Berikut adalah rangkuman rekomendasi peningkatan berdasarkan analisis kualitatif dari responden survei:`, { spaceAfter: 120 }),
            ...(data.comments.recommendations.length > 0 ? data.comments.recommendations.map((rec, idx) => {
              return p(`• ${rec}`, { spaceAfter: 80 });
            }) : [
              p(`Belum terdapat rekomendasi pada tahun survei yang dipilih.`, { italic: true, spaceAfter: 120 })
            ]),
            p("", { spaceAfter: 120 })
          ] : []),

          heading2("3.3 Pembahasan"),
          
          heading3("3.3.1 Area Keunggulan (Strengths ≥75%)"),
          ...(data.strengths.length > 0 
            ? [
                p(`Berdasarkan hasil analisis, terdapat ${data.strengths.length} dimensi yang menjadi kekuatan utama budaya keselamatan di ${data.namaRs}:`),
                ...data.strengths.flatMap((s, idx) => [
                  p(`${idx + 1}. ${s.nama} — [${s.percentage.toFixed(1)}%]`, { bold: true }),
                  p(`Analisis: ${s.interpretasi}`, { spaceAfter: 120 }),
                ])
              ]
            : [p(`Berdasarkan hasil analisis, saat ini belum ada dimensi yang mencapai target area kekuatan (≥ 75%) di ${data.namaRs}. Diperlukan strategi penguatan terpadu di seluruh unit kerja.`, { italic: true })]),

          heading3("3.3.2 Area yang Memerlukan Perbaikan (Areas for Improvement <50%)"),
          ...(data.improvements.length > 0
            ? [
                p(`Terdapat ${data.improvements.length} dimensi kritis yang memerlukan intervensi dan prioritas penanganan segera dari pimpinan/manajemen:`),
                ...data.improvements.flatMap((i, idx) => [
                  p(`${idx + 1}. ${i.nama} — [${i.percentage.toFixed(1)}%]`, { bold: true }),
                  p(`Analisis: ${i.interpretasi}`, { spaceAfter: 120 }),
                ])
              ]
            : [p(`Tidak ada dimensi yang berada pada kategori perbaikan kritis (<50%). Kondisi ini menunjukkan budaya keselamatan di ${data.namaRs} berjalan relatif baik tanpa hambatan kritis.`, { italic: true })]),

          heading3("3.3.3 Area Sedang / Moderat (50%-74%)"),
          ...(data.moderates.length > 0
            ? [p(`Dimensi seperti ${data.moderates.map(m => `${m.nama} ([${m.percentage.toFixed(1)}%])`).join(' dan ')} berada pada kategori moderat. Walaupun prosedurnya telah tersedia (seperti SBAR/TBLK saat handoff), konsistensi pelaksanaannya di lapangan masih bervariasi antar unit kerja, yang dipengaruhi oleh tingkat kesibukan dan keterbukaan komunikasi antar staf.`)]
            : [p("Tidak ada dimensi yang berada dalam kategori moderat (50%-74%).", { italic: true })]),

          pageBreak(),

          // BAB IV KESIMPULAN DAN REKOMENDASI
          heading1("BAB IV", "KESIMPULAN DAN REKOMENDASI"),

          heading2("4.1 Kesimpulan"),
          p(`Berdasarkan hasil survei budaya keselamatan pasien menggunakan instrumen AHRQ SOPS® Version 2.0 di ${data.namaRs} dengan tingkat partisipasi (response rate) sebesar ${data.responseRate} (N=${data.totalActual}), dapat ditarik beberapa kesimpulan utama sebagai berikut:`),

          p(`1. Gambaran Umum Budaya Keselamatan Pasien: Rata-rata pencapaian respon positif dari 10 dimensi budaya keselamatan pasien di ${data.namaRs} berada pada angka ${data.overallAverage.toFixed(1)}%. Secara umum, persepsi staf terhadap tingkat keselamatan pasien (Overall Patient Safety Rating) tergolong positif, di mana ${data.safetyRatingPositivePct.toFixed(1)}% staf menilai kondisi keselamatan pasien di rumah sakit berada dalam kategori "Baik" hingga "Sangat Baik".`, { spaceBefore: 60, spaceAfter: 60 }),

          p(`2. Area Keunggulan (Strengths): Terdapat ${data.strengths.length} dimensi yang menjadi kekuatan utama budaya keselamatan di ${data.namaRs} (≥75% respon positif):`, { spaceBefore: 60, spaceAfter: 60 }),
          ...(data.strengths.length > 0 
            ? data.strengths.map(s => bullet(`${s.nama} (${s.percentage.toFixed(1)}%): ${s.interpretasi}`))
            : [bullet(`Belum ada dimensi yang mencapai batas area kekuatan (≥75%). Diperlukan strategi penguatan terpadu di seluruh unit kerja.`, 0)]),

          p(`3. Area yang Memerlukan Perbaikan Kritis (Areas for Improvement): Terdapat ${data.improvements.length} dimensi kritis yang capaian respon positifnya masih berada di bawah target minimal AHRQ (<50%):`, { spaceBefore: 60, spaceAfter: 60 }),
          ...(data.improvements.length > 0
            ? data.improvements.map(i => bullet(`${i.nama} (${i.percentage.toFixed(1)}%): ${i.interpretasi}`))
            : [bullet(`Tidak ada dimensi yang berada pada kategori perbaikan kritis (<50%). Budaya keselamatan pasien berjalan stabil tanpa hambatan kritis.`, 0)]),

          heading2("4.2 Rekomendasi"),
          p(`Untuk menindaklanjuti temuan survei ini dan memperkuat budaya keselamatan pasien secara berkelanjutan, dirumuskan rekomendasi tindakan yang dapat diprioritaskan berdasarkan skala dampaknya:`),

          heading3("Prioritas Jangka Pendek (1 - 3 Bulan):"),
          ...data.recommendations.jangkaPendek.map(r => bullet(r)),

          heading3("Prioritas Jangka Menengah (3 - 6 Bulan):"),
          ...data.recommendations.jangkaMenengah.map(r => bullet(r)),

          heading3("Prioritas Jangka Panjang (6 - 12 Bulan):"),
          ...data.recommendations.jangkaPanjang.map(r => bullet(r)),

          p(`\n${data.pengesahan.kota || 'Sukabumi'}, ${data.pengesahan.tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: AlignmentType.RIGHT, bold: true, spaceBefore: 240, spaceAfter: 180 }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      p("Mengetahui,", { align: AlignmentType.CENTER, bold: true }),
                      p(data.pengesahan.direkturJabatan || 'Direktur Utama Rumah Sakit', { align: AlignmentType.CENTER }),
                      p("\n\n\n\n", { align: AlignmentType.CENTER }),
                      p(data.pengesahan.direkturNama || 'dr. H. Ahmad Wijaya', { align: AlignmentType.CENTER, bold: true }),
                      p(`NIP / ID: ${data.pengesahan.direkturNip || '19780512 200501 1 002'}`, { align: AlignmentType.CENTER, size: 18, color: "64748B" }),
                    ],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    children: [
                      p("Disiapkan oleh,", { align: AlignmentType.CENTER, bold: true }),
                      p(data.pengesahan.penanggungJawabJabatan || 'Ketua Komite Mutu & Keselamatan Pasien', { align: AlignmentType.CENTER }),
                      p("\n\n\n\n", { align: AlignmentType.CENTER }),
                      p(data.pengesahan.penanggungJawabNama || 'dr. Budi Santoso', { align: AlignmentType.CENTER, bold: true }),
                      p(`NIP / ID: ${data.pengesahan.penanggungJawabNip || '19820315 200804 1 005'}`, { align: AlignmentType.CENTER, size: 18, color: "64748B" }),
                    ],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Laporan_Survei_Budaya_Keselamatan_Pasien_${data.namaRs.replace(/\s+/g, '_')}_${data.tahun}.docx`);
}
