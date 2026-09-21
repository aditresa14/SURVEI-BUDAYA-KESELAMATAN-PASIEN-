'use client';

import { useState, useEffect } from 'react';
import WelcomeScreen from '../components/WelcomeScreen';
import LoginScreen from '../components/LoginScreen';
import RegisterScreen from '../components/RegisterScreen';
import Dashboard from '../components/Dashboard';
import { getWallpaper, WallpaperData } from '../lib/wallpaper';
import { getLogo, LogoData } from '../lib/logo';
import { getHeaderImage, HeaderImageData } from '../lib/headerBanner';

export default function Home() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'register' | 'dashboard'>('welcome');
  const [role, setRole] = useState<'rs' | 'admin'>('rs');
  const [identifier, setIdentifier] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [namaRs, setNamaRs] = useState('');
  const [wallpaper, setWallpaper] = useState<WallpaperData | null>(null);
  const [activeLogo, setActiveLogo] = useState<LogoData | null>(null);
  const [activeHeaderImage, setActiveHeaderImage] = useState<HeaderImageData | null>(null);
  
  // Keep list of registered hospitals in state so they persist during active session
  const [registeredHospitals, setRegisteredHospitals] = useState<Array<{ username: string; kodeRs: string; namaRs: string }>>([]);

  // Load wallpaper, logo, and header image on mount
  useEffect(() => {
    async function loadPreferences() {
      const savedWallpaper = await getWallpaper();
      if (savedWallpaper) {
        setWallpaper(savedWallpaper);
      }
      
      const savedLogo = await getLogo();
      if (savedLogo) {
        setActiveLogo(savedLogo);
      }

      const savedHeaderImage = await getHeaderImage();
      if (savedHeaderImage) {
        setActiveHeaderImage(savedHeaderImage);
      }
    }
    loadPreferences();
  }, []);

  const handleLoginSuccess = (userRole: 'rs' | 'admin', userId: string, rsName: string, idHospital?: string) => {
    setRole(userRole);
    setIdentifier(userId);
    setHospitalId(idHospital || '');
    setNamaRs(rsName);
    setScreen('dashboard');
  };

  const handleRegisterSuccess = (newHospital: { username: string; kodeRs: string; namaRs: string }) => {
    setRegisteredHospitals(prev => [...prev, newHospital]);
    setScreen('login');
  };

  const handleUpdateRsName = (newName: string) => {
    setNamaRs(newName);
  };

  const handleLogout = () => {
    setScreen('welcome');
    setIdentifier('');
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-800 relative overflow-hidden">
      {/* Background Wallpaper Layer */}
      {wallpaper ? (
        wallpaper.type === 'video' ? (
          <div className="fixed inset-0 w-full h-full overflow-hidden -z-20 pointer-events-none">
            <video
              src={wallpaper.url}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
            {/* Soft light overlay to ensure high contrast in light mode */}
            <div className={`absolute inset-0 transition-all duration-500 ${(screen === 'welcome' || screen === 'login' || screen === 'register') ? 'bg-transparent' : 'bg-slate-50/90'}`} />
          </div>
        ) : (
          <div 
            className="fixed inset-0 w-full h-full bg-cover bg-center -z-20 pointer-events-none"
            style={{ backgroundImage: `url("${wallpaper.url}")` }}
          >
            {/* Soft light overlay to ensure high contrast in light mode */}
            <div className={`absolute inset-0 transition-all duration-500 ${(screen === 'welcome' || screen === 'login' || screen === 'register') ? 'bg-transparent' : 'bg-slate-50/90'}`} />
          </div>
        )
      ) : (
        // Default premium light gradient background (Teal to Blue with white canvas)
        <div className="fixed inset-0 w-full h-full bg-slate-50 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-teal-50/70 via-slate-50/50 to-blue-50/60 -z-20 pointer-events-none" />
      )}

      {screen === 'welcome' && (
        <WelcomeScreen onEnter={() => setScreen('login')} activeLogo={activeLogo} />
      )}

      {screen === 'login' && (
        <LoginScreen
          onBack={() => setScreen('welcome')}
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setScreen('register')}
          registeredHospitals={registeredHospitals}
          activeLogo={activeLogo}
        />
      )}

      {screen === 'register' && (
        <RegisterScreen
          onBack={() => setScreen('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard
          role={role}
          identifier={identifier}
          hospitalId={hospitalId}
          namaRs={namaRs}
          onLogout={handleLogout}
          onUpdateRsName={handleUpdateRsName}
          activeWallpaper={wallpaper}
          onUpdateWallpaper={setWallpaper}
          activeLogo={activeLogo}
          onUpdateLogo={setActiveLogo}
          activeHeaderImage={activeHeaderImage}
          onUpdateHeaderImage={setActiveHeaderImage}
        />
      )}
    </main>
  );
}

