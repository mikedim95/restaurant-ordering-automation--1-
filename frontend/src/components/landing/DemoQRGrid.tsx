import { QRCodeSVG } from 'qrcode.react';
import { Card } from '../ui/card';
import { QR_MOCKUP } from '@/lib/mockData';
import { ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';

const demoStores = [
  { slug: 'demo-cafe', name: 'Demo Café', desc: 'Coffee & Pastries', url: window.location.origin + '/demo/store/demo-cafe' },
  { slug: 'demo-bistro', name: 'Demo Bistro', desc: 'Fine Dining', url: window.location.origin + '/demo/store/demo-bistro' },
  { slug: 'demo-bar', name: 'Demo Bar', desc: 'Cocktails & Drinks', url: window.location.origin + '/demo/store/demo-bar' },
];

export const DemoQRGrid = () => {
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
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {demoStores.map((store) => (
            <Card key={store.slug} className="p-8 text-center hover:shadow-2xl transition-all hover:-translate-y-2 bg-white">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">{store.name}</h3>
              <p className="text-purple-600 font-medium mb-6">{store.desc}</p>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl inline-block mb-6 border-2 border-purple-200">
                <QRCodeSVG value={store.url} size={220} level="H" includeMargin />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(store.url, '_blank')}>
                <ExternalLink className="h-4 w-4" />
                Open Demo
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
