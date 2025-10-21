import { useEffect, useState } from 'react';
import { mqttService } from '@/lib/mqtt';

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

  const cls = connected ? 'bg-green-500' : 'bg-amber-500';
  const label = connected ? 'Live' : 'Polling';

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600" title={label}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />
      {label}
    </span>
  );
};

