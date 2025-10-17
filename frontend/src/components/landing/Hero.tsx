import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { QrCode, LogIn, Play, Zap, Bell, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HERO_IMAGE } from '@/lib/mockData';

export const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800">
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center py-20">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/20">
          <Zap className="h-4 w-4 text-yellow-300" />
          <span className="text-white text-sm font-medium">Real-time MQTT • Instant Notifications • PWA Ready</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 animate-fade-in leading-tight">
          {t('hero.title')}
        </h1>
        <p className="text-xl md:text-3xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
          {t('hero.subtitle')}
        </p>
        <p className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto">
          Scan QR • Order instantly • Get notified when ready • No app download required
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <Button size="lg" onClick={() => navigate('/demo/store/demo-cafe')} className="gap-2 text-lg px-8 py-6 bg-white text-purple-600 hover:bg-purple-50">
            <Play className="h-6 w-6" />
            Try Live Demo
          </Button>
          <Button size="lg" variant="outline" onClick={() => {
            document.getElementById('demo-qr')?.scrollIntoView({ behavior: 'smooth' });
          }} className="gap-2 text-lg px-8 py-6 bg-white/10 text-white border-white/30 hover:bg-white/20">
            <QrCode className="h-6 w-6" />
            Scan QR Codes
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/login')} className="gap-2 text-lg px-8 py-6">
            <LogIn className="h-6 w-6" />
            Staff Login
          </Button>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-3xl blur-2xl opacity-30 animate-pulse" />
          <img src={HERO_IMAGE} alt="OrderFlow" className="relative rounded-3xl shadow-2xl border-4 border-white/20" />
        </div>
      </div>
    </div>
  );
};

