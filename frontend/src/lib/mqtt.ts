// MQTT client wrapper with wildcard-aware subscriptions and a mock fallback.

type MQTTCallback = (message: any) => void;

const BROKER_URL = (import.meta as any).env?.VITE_MQTT_URL || 'ws://localhost:1883';
const BROKER_USERNAME = (import.meta as any).env?.VITE_MQTT_USERNAME;
const BROKER_PASSWORD = (import.meta as any).env?.VITE_MQTT_PASSWORD;
const CLIENT_ID = `orderflow-frontend-${Math.random().toString(16).slice(2)}`;

function topicMatches(filter: string, topic: string): boolean {
  if (filter === topic) return true;
  const f = filter.split('/');
  const t = topic.split('/');
  const fl = f.length;
  const tl = t.length;
  for (let i = 0, j = 0; i < fl && j < tl; i++, j++) {
    const fp = f[i];
    const tp = t[j];
    if (fp === '#') return true; // multi-level wildcard
    if (fp === '+') continue; // single-level wildcard
    if (fp !== tp) return false;
  }
  return fl === tl || f[fl - 1] === '#';
}

class MockMQTTService {
  private subscribers: Map<string, MQTTCallback[]> = new Map();
  private connected = false;

  async connect() {
    this.connected = true;
  }

  subscribe(topic: string, callback: MQTTCallback) {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    this.subscribers.get(topic)!.push(callback);
  }

  publish(topic: string, message: any) {
    setTimeout(() => {
      for (const [filter, cbs] of this.subscribers.entries()) {
        if (topicMatches(filter, topic)) cbs.forEach((cb) => cb(message));
      }
    }, 0);
  }

  unsubscribe(topic: string) {
    this.subscribers.delete(topic);
  }

  disconnect() {
    this.connected = false;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

class RealMQTTService {
  private client: any | null = null;
  private subscribers: Map<string, MQTTCallback[]> = new Map();

  async connect() {
    if (this.client) return;
    const mod: any = await import('mqtt');
    const connectFn: any = mod.connect || mod.default?.connect || mod.default;
    this.client = connectFn(BROKER_URL, {
      clientId: CLIENT_ID,
      username: BROKER_USERNAME,
      password: BROKER_PASSWORD,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.client.on('message', (topic: string, payload: Uint8Array) => {
      const str = new TextDecoder().decode(payload);
      let msg: any = str;
      try {
        msg = JSON.parse(str);
      } catch {}
      for (const [filter, cbs] of this.subscribers.entries()) {
        if (topicMatches(filter, topic)) cbs.forEach((cb) => cb(msg));
      }
    });
  }

  subscribe(topic: string, callback: MQTTCallback) {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    this.subscribers.get(topic)!.push(callback);
    this.client?.subscribe(topic, { qos: 1 });
  }

  publish(topic: string, message: any) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.client?.publish(topic, payload, { qos: 1 });
  }

  unsubscribe(topic: string) {
    this.subscribers.delete(topic);
    this.client?.unsubscribe(topic);
  }

  disconnect() {
    this.client?.end(true);
    this.client = null;
    this.subscribers.clear();
  }

  isConnected() {
    return !!this.client && this.client.connected;
  }
}

let mqttServiceImpl: MockMQTTService | RealMQTTService = new MockMQTTService();

export const mqttService = {
  async connect() {
    if (!(mqttServiceImpl instanceof RealMQTTService)) {
      try {
        const real = new RealMQTTService();
        await real.connect();
        mqttServiceImpl = real;
      } catch {
        await mqttServiceImpl.connect();
        return;
      }
    }
  },
  subscribe(topic: string, cb: MQTTCallback) {
    mqttServiceImpl.subscribe(topic, cb);
  },
  publish(topic: string, message: any) {
    mqttServiceImpl.publish(topic, message);
  },
  unsubscribe(topic: string) {
    mqttServiceImpl.unsubscribe(topic);
  },
  disconnect() {
    mqttServiceImpl.disconnect();
  },
  isConnected() {
    return mqttServiceImpl.isConnected();
  },
};

