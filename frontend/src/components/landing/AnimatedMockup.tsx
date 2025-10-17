import { useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

const steps = [
  { icon: '📱', text: 'Scan QR Code' },
  { icon: '📋', text: 'Browse Menu' },
  { icon: '🛒', text: 'Add to Cart' },
  { icon: '✅', text: 'Place Order' },
  { icon: '🔔', text: 'Get Notified' },
];

export const AnimatedMockup = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-24 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
          How It Works
        </h2>
        <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
          A seamless ordering experience from scan to notification
        </p>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  idx === currentStep
                    ? 'bg-purple-100 border-2 border-purple-500 scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <span className="text-4xl">{step.icon}</span>
                <span className={`text-lg font-medium ${idx === currentStep ? 'text-purple-900' : 'text-gray-700'}`}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="flex gap-8 justify-center">
              <div className="relative">
                <Smartphone className="h-64 w-32 text-gray-300" strokeWidth={1} />
                <div className="absolute inset-2 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg opacity-80" />
              </div>
              <div className="relative">
                <Monitor className="h-48 w-64 text-gray-300" strokeWidth={1} />
                <div className="absolute inset-4 bg-gradient-to-br from-blue-400 to-purple-400 rounded opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
