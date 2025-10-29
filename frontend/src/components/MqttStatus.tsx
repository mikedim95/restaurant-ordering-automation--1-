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
  const cls = offline
    ? 'bg-amber-500'
    : connected
      ? 'bg-green-500'
      : 'bg-amber-500';
  const label = offline ? 'Offline' : connected ? 'Online' : 'Connecting';

  return (
    <span
      className="inline-flex select-none items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600"
      title={label}
      role="status"
      aria-live="polite"
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />
      {label}
    </span>
  );
};
