import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '../ui/card';
import { QR_MOCKUP } from '@/lib/mockData';
import { ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '@/lib/api';

export const DemoQRGrid = () => {
  const getBaseOrigin = () => {
    const envOrigin = (import.meta as any).env?.VITE_PUBLIC_BASE_ORIGIN as
      | string
      | undefined;
    if (envOrigin && envOrigin.trim().length > 0) {
      return envOrigin.replace(/\/$/, "");
    }
    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;
      const portPart = port ? `:${port}` : "";
      return `${protocol}//${hostname}${portPart}`;
    }
    return "http://localhost:8080";
  };

  const BASE_ORIGIN = getBaseOrigin();
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = (await api.getTables()) as any;
        const actives = (data?.tables || []).filter((t: any) => t.active);
        if (actives.length > 0) {
          const random = actives[Math.floor(Math.random() * actives.length)];
          if (mounted) setLiveUrl(`${BASE_ORIGIN}/table/${random.id}`);
        }
      } catch (e) {
        // Fallback silently; keep demo links
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cards: Array<{ key: string; name: string; desc: string; link: string | null; ready?: boolean }> = [
    { key: 'demo-cafe', name: 'Demo Café', desc: 'Coffee & Pastries', link: `${BASE_ORIGIN}/demo/store/demo-cafe`, ready: true },
    { key: 'live-store', name: 'Live Store', desc: 'Random Table (Real Backend)', link: liveUrl, ready: !!liveUrl },
    { key: 'demo-bar', name: 'Demo Bar', desc: 'Cocktails & Drinks', link: `${BASE_ORIGIN}/demo/store/demo-bar`, ready: true },
  ];

  return (
    <div id="demo-qr" className="py-24 bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full mb-4">
            <Smartphone className="h-4 w-4 text-purple-600" />
            <span className="text-purple-900 text-sm font-medium">Scan with your phone camera</span>
          </div>
          <h2 className="text-5xl font-bold mb-4 text-gray-900">
            Experience It Live
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Scan these QR codes to see how customers order from their phones. No app download required!
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16 items-stretch">
          {cards.map((card) => (
            <Card key={card.key} className="p-8 text-center bg-white hover:shadow-2xl transition-shadow h-full flex flex-col">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">{card.name}</h3>
              <p className="text-purple-600 font-medium mb-6">{card.desc}</p>
              <div className="flex-1 flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 min-w-[240px]">
                  {card.link ? (
                    <QRCodeSVG key={card.link} value={card.link} size={220} level="H" includeMargin />
                  ) : (
                    <div className="text-sm text-purple-500 px-6 py-10">Fetching a table…</div>
                  )}
                </div>
              </div>
              <Button
                asChild={!!card.link}
                variant="outline"
                className="w-full gap-2 mt-auto"
                disabled={!card.link}
                onClick={!card.link ? undefined : undefined}
              >
                {card.link ? (
                  <a href={card.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open Demo
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 opacity-70">
                    <ExternalLink className="h-4 w-4" />
                    Open Demo
                  </span>
                )}
              </Button>
            </Card>
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-3xl blur-3xl opacity-20" />
          <img src={QR_MOCKUP} alt="QR in cafe" className="relative rounded-2xl shadow-2xl border-4 border-white" />
        </div>
      </div>
    </div>
  );
};
