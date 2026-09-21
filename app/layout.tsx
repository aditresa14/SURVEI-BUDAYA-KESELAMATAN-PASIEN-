import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'Sistem Survei Budaya Keselamatan Pasien AHRQ SOPS 2.0',
  description: 'Aplikasi survei dan analisis budaya keselamatan pasien rumah sakit sesuai standar AHRQ SOPS Versi 2.0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${poppins.variable} h-full`}>
      <body className="h-full bg-slate-50 text-slate-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
