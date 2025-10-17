// Mock MQTT service for demonstration
// In production, replace with actual MQTT client (mqtt.js)

type MQTTCallback = (message: any) => void;

class MockMQTTService {
  private subscribers: Map<string, MQTTCallback[]> = new Map();
  private connected = false;

  connect() {
    console.log('🔌 Mock MQTT connected');
    this.connected = true;
    return Promise.resolve();
  }

  subscribe(topic: string, callback: MQTTCallback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)?.push(callback);
    console.log(`📡 Subscribed to ${topic}`);
  }

  publish(topic: string, message: any) {
    console.log(`📤 Published to ${topic}:`, message);
    
    // Simulate message delivery to subscribers
    setTimeout(() => {
      const callbacks = this.subscribers.get(topic) || [];
      callbacks.forEach((cb) => cb(message));
    }, 100);
  }

  unsubscribe(topic: string) {
    this.subscribers.delete(topic);
    console.log(`🔕 Unsubscribed from ${topic}`);
  }

  disconnect() {
    this.connected = false;
    this.subscribers.clear();
    console.log('🔌 Mock MQTT disconnected');
  }

  isConnected() {
    return this.connected;
  }
}

export const mqttService = new MockMQTTService();

// Usage example:
// mqttService.connect();
// mqttService.subscribe('stores/demo-cafe/tables/t1/ready', (msg) => {
//   console.log('Order ready!', msg);
// });
