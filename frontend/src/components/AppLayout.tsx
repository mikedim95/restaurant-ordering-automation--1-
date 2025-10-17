import React from 'react';
import { Hero } from './landing/Hero';
import { Features } from './landing/Features';
import { AnimatedMockup } from './landing/AnimatedMockup';
import { DemoQRGrid } from './landing/DemoQRGrid';
import { LanguageSwitcher } from './LanguageSwitcher';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen">
      <nav className="absolute top-0 right-0 p-4 z-50">
        <LanguageSwitcher />
      </nav>
      <Hero />
      <AnimatedMockup />
      <Features />
      <DemoQRGrid />
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">OrderFlow</h3>
              <p className="text-gray-400 text-sm">Modern QR ordering system with real-time notifications and multi-language support.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#demo-qr" className="hover:text-white transition">Demo</a></li>
                <li><a href="/login" className="hover:text-white transition">Login</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Technology</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>React + TypeScript</li>
                <li>MQTT WebSocket</li>
                <li>PostgreSQL</li>
                <li>PWA Ready</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>info@orderflow.app</li>
                <li>+30 123 456 7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">© 2025 OrderFlow. All rights reserved.</p>
            <p className="text-sm text-gray-500 mt-2">Built with React + TypeScript + Tailwind CSS + MQTT</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
