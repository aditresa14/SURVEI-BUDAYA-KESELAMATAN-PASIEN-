export interface SurveyQuestion {
  id: string;
  text: string;
  isNegative?: boolean;
}

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  type: 'likert' | 'frequency' | 'volume' | 'rating' | 'choice' | 'text';
  questions: SurveyQuestion[];
}

export const STAFF_POSITIONS = [
  "Perawat Praktik Lanjutan (NP, CRNA, CNS, CNM)",
  "Perawat Kejuruan Berlisensi (LVN) / Praktik Berlisensi (LPN)",
  "Pembantu Perawatan Pasien / Pembantu Rumah Sakit / Asisten Perawat",
  "Perawat Terdaftar (RN)",
  "Asisten Dokter",
  "Residen, Peserta Magang",
  "Dokter, Perawat, Perawat Rumah Sakit",
  "Ahli Gizi",
  "Apoteker, Teknisi Farmasi",
  "Terapis Fisik, Okupasi, atau Wicara",
  "Psikolog",
  "Terapis Pernapasan",
  "Pekerja Sosial",
  "Ahli Teknologi, Teknisi (mis. EKG, Laboratorium, Radiologi)",
  "Supervisor, Manajer, Manajer Departemen, Pemimpin Klinis, Administrator, Direktur",
  "Pemimpin Senior, Eksekutif, C-Suite",
  "Dukungan: Fasilitas",
  "Dukungan: Layanan Makanan",
  "Dukungan: Rumah Tangga / Layanan Lingkungan",
  "Dukungan: Teknologi Informasi / Layanan Informasi Kesehatan / Informatika Klinis",
  "Dukungan: Keamanan",
  "Dukungan: Pengangkut",
  "Dukungan: Petugas Unit, Sekretaris, Resepsionis, Staf Kantor",
  "Lainnya"
];

export const WORK_UNITS = [
  "Banyak unit rumah sakit yang berbeda (Tidak ada unit khusus)",
  "Unit Medis/Bedah Gabungan",
  "Unit Medis (Non-Bedah)",
  "Unit Bedah",
  "Kardiologi",
  "Unit Gawat Darurat, Observasi, Rawat Inap",
  "Gastroenterologi",
  "ICU (Semua Tipe Dewasa)",
  "Persalinan & Persalinan, Kebidanan & Kandungan",
  "Onkologi, Hematologi",
  "Pediatri (termasuk NICU, PICU)",
  "Psikiatri, Kesehatan Perilaku",
  "Pulmonologi",
  "Rehabilitasi, Pengobatan Fisik",
  "Telemetri",
  "Anestesiologi",
  "Endoskopi, Kolonoskopi",
  "Pra Operasi, Ruang Operasi/Suite, PACU, Peri Operasi",
  "Patologi, Laboratorium",
  "Farmasi",
  "Radiologi, Pencitraan",
  "Terapi Pernapasan",
  "Layanan Sosial, Manajemen Kasus, Perencanaan Pemulangan",
  "Administrasi, Manajemen",
  "Layanan Keuangan, Penagihan",
  "Sumber Daya Manusia, Pelatihan",
  "Teknologi Informasi, Manajemen Informasi Kesehatan",
  "Kualitas, Manajemen Risiko, Keselamatan Pasien",
  "Penerimaan/Pendaftaran",
  "Layanan Makanan, Diet",
  "Rumah Tangga, Layanan Lingkungan, Fasilitas",
  "Layanan Keamanan",
  "Transportasi",
  "Lainnya"
];

export const LIKERT_OPTIONS = [
  { value: '1', label: 'Sangat Tidak Setuju' },
  { value: '2', label: 'Tidak Setuju' },
  { value: '3', label: 'Netral' },
  { value: '4', label: 'Setuju' },
  { value: '5', label: 'Sangat Setuju' },
  { value: '9', label: 'Tidak Berlaku / Tidak Tahu' }
];

export const FREQUENCY_OPTIONS = [
  { value: '1', label: 'Tidak Pernah' },
  { value: '2', label: 'Jarang' },
  { value: '3', label: 'Kadang-kadang' },
  { value: '4', label: 'Hampir Selalu' },
  { value: '5', label: 'Selalu' },
  { value: '9', label: 'Tidak Berlaku / Tidak Tahu' }
];

export const REPORT_VOLUME_OPTIONS = [
  { value: 'a', label: 'Tidak ada' },
  { value: 'b', label: '1 sampai 2' },
  { value: 'c', label: '3 sampai 5' },
  { value: 'd', label: '6 hingga 10' },
  { value: 'e', label: '11 atau lebih' }
];

export const SAFETY_RATING_OPTIONS = [
  { value: '1', label: 'Buruk' },
  { value: '2', label: 'Biasa' },
  { value: '3', label: 'Baik' },
  { value: '4', label: 'Sangat Baik' },
  { value: '5', label: 'Luar Biasa' }
];

export const SURVEY_GROUPS: QuestionGroup[] = [
  {
    id: 'bagian_a',
    title: 'BAGIAN A: Unit/Area Kerja Anda',
    description: 'Seberapa jauh Anda setuju atau tidak setuju dengan pernyataan berikut ini tentang unit/area kerja Anda?',
    type: 'likert',
    questions: [
      { id: 'a1', text: 'Di unit ini, kami bekerja sama sebagai tim yang efektif.' },
      { id: 'a2', text: 'Di unit ini, kami memiliki staf yang cukup untuk menangani beban kerja.' },
      { id: 'a3', text: 'Staf di unit ini bekerja lebih lama dari waktu terbaik untuk perawatan pasien.', isNegative: true },
      { id: 'a4', text: 'Unit ini meninjau prosedur kerja secara berkala untuk menentukan apakah diperlukan perubahan untuk meningkatkan keselamatan pasien.' },
      { id: 'a5', text: 'Unit ini terlalu bergantung pada staf sementara, pengganti, atau panggilan.', isNegative: true },
      { id: 'a6', text: 'Di unit ini, staf merasa bahwa kesalahan yang terjadi dianggap sebagai kesalahan mereka sendiri.', isNegative: true },
      { id: 'a7', text: 'Ketika sebuah insiden dilaporkan di unit ini, rasanya seperti orangnya yang ditulis, bukan masalahnya.', isNegative: true },
      { id: 'a8', text: 'Selama saat sibuk, staf di unit ini saling membantu satu sama lain.' },
      { id: 'a9', text: 'Di unit ini, ada staf yang memiliki perilaku tidak menyenangkan dalam bekerja.', isNegative: true },
      { id: 'a10', text: 'Ketika staf melakukan kesalahan, unit ini berfokus pada pembelajaran daripada menyalahkan secara personal.' },
      { id: 'a11', text: 'Kecepatan kerja di unit ini sangat terburu-buru sehingga berdampak negatif pada keselamatan pasien.', isNegative: true },
      { id: 'a12', text: 'Di unit ini, setiap perubahan untuk meningkatkan keselamatan pasien dilakukan evaluasi, untuk melihat seberapa baik perubahan tersebut bekerja.' },
      { id: 'a13', text: 'Di unit ini, dukungan bagi staf yang terlibat dalam kesalahan keselamatan pasien masih kurang.', isNegative: true },
      { id: 'a14', text: 'Di unit ini, masalah keselamatan pasien yang sama memungkinkan dapat terus terjadi.', isNegative: true }
    ]
  },
  {
    id: 'bagian_b',
    title: 'BAGIAN B: Supervisor, Manajer, atau Pemimpin Klinis Anda',
    description: 'Seberapa jauh Anda setuju atau tidak setuju dengan pernyataan berikut ini tentang atasan langsung, manajer, atau pemimpin klinis Anda?',
    type: 'likert',
    questions: [
      { id: 'b1', text: 'Atasan, manajer, atau pemimpin klinis saya secara serius mempertimbangkan saran dari staf untuk meningkatkan keselamatan pasien.' },
      { id: 'b2', text: 'Atasan, manajer, atau pemimpin klinis saya menginginkan kita bekerja lebih cepat saat waktu sibuk, bahkan jika itu berarti mengambil jalan pintas.', isNegative: true },
      { id: 'b3', text: 'Atasan, manajer, atau pemimpin klinis saya mengambil tindakan untuk mengatasi masalah keselamatan pasien yang menjadi perhatian mereka.' }
    ]
  },
  {
    id: 'bagian_c',
    title: 'BAGIAN C: Komunikasi',
    description: 'Seberapa sering hal-hal berikut ini terjadi di unit/area kerja Anda?',
    type: 'frequency',
    questions: [
      { id: 'c1', text: 'Kami diberi informasi tentang kesalahan yang terjadi pada unit ini.' },
      { id: 'c2', text: 'Ketika kesalahan terjadi pada unit ini, kami mendiskusikan cara-cara untuk mencegahnya terjadi lagi.' },
      { id: 'c3', text: 'Di unit ini, kami diberi tahu tentang perubahan yang dibuat berdasarkan laporan kejadian.' },
      { id: 'c4', text: 'Di unit ini, staf angkat bicara jika mereka melihat sesuatu yang dapat berdampak negatif terhadap perawatan pasien.' },
      { id: 'c5', text: 'Ketika staf di unit ini melihat seseorang yang memiliki wewenang lebih besar melakukan sesuatu yang tidak aman bagi pasien, mereka berani angkat bicara.' },
      { id: 'c6', text: 'Ketika staf di unit ini angkat bicara, mereka yang memiliki wewenang lebih besar akan terbuka terhadap masalah keselamatan pasien mereka.' },
      { id: 'c7', text: 'Di unit ini, staf takut untuk bertanya ketika ada sesuatu yang tidak beres.', isNegative: true }
    ]
  },
  {
    id: 'bagian_d',
    title: 'BAGIAN D: Pelaporan Kejadian Keselamatan Pasien',
    description: 'Pikirkan tentang unit/area kerja Anda seberapa sering hal ini dilaporkan:',
    type: 'frequency',
    questions: [
      { id: 'd1', text: 'Ketika kesalahan diketahui dan diperbaiki sebelum sampai ke pasien, seberapa sering hal ini dilaporkan?' },
      { id: 'd2', text: 'Ketika suatu kesalahan sampai ke pasien dan dapat membahayakan pasien, tetapi tidak terjadi, seberapa sering hal ini dilaporkan?' }
    ]
  }
];

export const BACKGROUND_QUESTIONS = [
  {
    id: 'g1',
    text: '1. Sudah berapa lama Anda bekerja di rumah sakit ini?',
    options: [
      'Kurang dari 1 tahun',
      '1 hingga 5 tahun',
      '6 hingga 10 tahun',
      '11 tahun atau lebih'
    ]
  },
  {
    id: 'g2',
    text: '2. Di rumah sakit ini, sudah berapa lama Anda bekerja di unit/area kerja saat ini?',
    options: [
      'Kurang dari 1 tahun',
      '1 hingga 5 tahun',
      '6 hingga 10 tahun',
      '11 tahun atau lebih'
    ]
  },
  {
    id: 'g3',
    text: '3. Biasanya, berapa jam per minggu Anda bekerja di rumah sakit ini?',
    options: [
      'Kurang dari 30 jam per minggu',
      '30 hingga 40 jam per minggu',
      'Lebih dari 40 jam per minggu'
    ]
  },
  {
    id: 'g4',
    text: '4. Dalam posisi staf Anda, apakah Anda memiliki interaksi atau kontak langsung dengan pasien?',
    options: [
      'YA, saya melakukan interaksi atau kontak langsung dengan pasien',
      'TIDAK, saya TIDAK melakukan interaksi atau kontak langsung dengan pasien'
    ]
  }
];
