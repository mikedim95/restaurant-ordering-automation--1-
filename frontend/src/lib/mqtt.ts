// MQTT client wrapper with auto-fallback to mock
// If the `mqtt` package is installed, we use real WebSocket MQTT; otherwise use mock.

type MQTTCallback = (message: any) => void;

const VITE_MQTT_URL = import.meta.env.VITE_MQTT_URL || "ws://localhost:1883";
const VITE_MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const VITE_MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;
const CLIENT_ID = `orderflow-frontend-${Math.random().toString(16).slice(2)}`;
console.log("MQTT Client ID:", CLIENT_ID);
console.log("MQTT Broker URL:", VITE_MQTT_URL);
console.log("MQTT Username:", VITE_MQTT_USERNAME ? "***" : "(none)");
class MockMQTTService {
  private subscribers: Map<string, MQTTCallback[]> = new Map();
  private connected = false;

  async connect() {
    console.log("🔌 Mock MQTT connected");
    this.connected = true;
  }

  subscribe(topic: string, callback: MQTTCallback) {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    this.subscribers.get(topic)!.push(callback);
    console.log(`📡 [mock] Subscribed to ${topic}`);
  }

  publish(topic: string, message: any) {
    console.log(`📤 [mock] Published to ${topic}:`, message);
    setTimeout(() => {
      const cbs = this.subscribers.get(topic) || [];
      cbs.forEach((cb) => cb(message));
    }, 100);
  }

  unsubscribe(topic: string) {
    this.subscribers.delete(topic);
    console.log(`🔕 [mock] Unsubscribed from ${topic}`);
  }

  disconnect() {
    this.connected = false;
    this.subscribers.clear();
    console.log("🔌 [mock] MQTT disconnected");
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
    try {
      const mqtt = await import("mqtt");
      this.client = mqtt.connect(VITE_MQTT_URL, {
        clientId: CLIENT_ID,
        username: VITE_MQTT_USERNAME,
        password: VITE_MQTT_PASSWORD,
        clean: true,
        reconnectPeriod: 1000,
      });

      this.client.on("connect", () => {
        console.log("🔌 MQTT connected to", VITE_MQTT_URL);
      });

      this.client.on("message", (topic: string, payload: Uint8Array) => {
        const str = new TextDecoder().decode(payload);
        let msg: any = str;
        try {
          msg = JSON.parse(str);
        } catch {}
        const cbs = this.subscribers.get(topic) || [];
        cbs.forEach((cb) => cb(msg));
      });

      this.client.on("error", (err: any) => {
        console.error("MQTT error:", err?.message || err);
      });
    } catch (e) {
      console.warn("mqtt package not available; falling back to mock");
      throw e;
    }
  }

  subscribe(topic: string, callback: MQTTCallback) {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    this.subscribers.get(topic)!.push(callback);
    this.client?.subscribe(topic, { qos: 1 });
    console.log(`📡 Subscribed to ${topic}`);
  }

  publish(topic: string, message: any) {
    const payload =
      typeof message === "string" ? message : JSON.stringify(message);
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
        // stay on mock
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
