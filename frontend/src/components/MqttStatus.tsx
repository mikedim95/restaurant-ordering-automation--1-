import { useEffect, useState } from 'react';
import { mqttService } from '@/lib/mqtt';

function isOffline() {
  try { if (localStorage.getItem('OFFLINE') === '1') return true; } catch {}
  const v = (import.meta as any).env?.VITE_OFFLINE;
  return String(v ?? '').toLowerCase() === '1' || String(v ?? '').toLowerCase() === 'true';
}

export const MqttStatus = () => {
  const [connected, setConnected] = useState<boolean>(mqttService.isConnected());

  useEffect(() => {
    let alive = true;
    const iv = setInterval(() => {
      if (!alive) return;
      setConnected(mqttService.isConnected());
    }, 1200);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const offline = isOffline();
  const cls = offline ? 'bg-amber-500' : (connected ? 'bg-green-500' : 'bg-amber-500');
  const label = offline ? 'Offline' : (connected ? 'Live' : 'Polling');

  const handleClick = () => {
    try {
      const currentOffline = localStorage.getItem('OFFLINE');
      if (currentOffline === '1') {
        localStorage.removeItem('OFFLINE');
      } else {
        localStorage.setItem('OFFLINE', '1');
      }
      window.location.reload();
    } catch (error) {
      console.error('Failed to toggle offline mode:', error);
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100" 
      title={`${label} - Click to toggle`}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />
      {label}
    </button>
  );
};
