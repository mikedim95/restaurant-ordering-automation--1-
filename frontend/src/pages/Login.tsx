import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock login
    if (email.includes('waiter')) {
      login({ id: '1', email, role: 'waiter', displayName: 'Waiter 1' }, 'mock-token');
      navigate('/waiter');
    } else if (email.includes('manager')) {
      login({ id: '2', email, role: 'manager', displayName: 'Manager' }, 'mock-token');
      navigate('/manager');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">{t('auth.login')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('auth.email')}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="waiter1@demo.local"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('auth.password')}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="changeme"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {t('auth.sign_in')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          Demo: waiter1@demo.local / manager@demo.local
        </p>
      </Card>
    </div>
  );
}
