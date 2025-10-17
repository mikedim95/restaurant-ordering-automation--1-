import mqtt from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'orderflow-backend';

let client: mqtt.MqttClient | null = null;

export function getMqttClient(): mqtt.MqttClient {
  if (!client) {
    client = mqtt.connect(MQTT_BROKER_URL, {
      clientId: MQTT_CLIENT_ID,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 1000,
    });

    client.on('connect', () => {
      console.log('MQTT connected');
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
    });
  }

  return client;
}

export function publishMessage(topic: string, payload: any): void {
  const client = getMqttClient();
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error('MQTT publish error:', err);
    }
  });
}
