import { QrCode, Zap, Bell, Globe, Shield, TrendingUp, Users, Clock } from 'lucide-react';
import { Card } from '../ui/card';

const features = [
  { icon: QrCode, title: 'QR Code Ordering', desc: 'Customers scan & order instantly. No app install needed.' },
  { icon: Zap, title: 'Real-time MQTT', desc: 'Instant order updates via WebSocket. Lightning fast notifications.' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Notify customers when orders are ready. Call waiter with one tap.' },
  { icon: Globe, title: 'Multi-language', desc: 'Full Greek & English support. Switch languages seamlessly.' },
  { icon: Shield, title: 'IP Whitelisting', desc: 'Secure orders from your venue only. No fake orders.' },
  { icon: TrendingUp, title: 'Analytics Dashboard', desc: 'Track orders, revenue, and performance in real-time.' },
  { icon: Users, title: 'Role-based Access', desc: 'Separate dashboards for waiters and managers.' },
  { icon: Clock, title: 'Order Management', desc: 'Track status from placed to served. Export to CSV.' },
];

export const Features = () => {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4 text-gray-900">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A complete ordering system with modern tech stack and professional features
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="p-6 hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50 border-purple-100">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to modernize your restaurant?</h3>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join the future of dining with OrderFlow. Setup in minutes, delight customers instantly.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
              <span className="font-bold text-2xl">5 min</span>
              <span className="text-purple-200 ml-2">Setup Time</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
              <span className="font-bold text-2xl">0€</span>
              <span className="text-purple-200 ml-2">Monthly Fee</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
              <span className="font-bold text-2xl">∞</span>
              <span className="text-purple-200 ml-2">Orders</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
