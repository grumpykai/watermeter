const mqtt = require('mqtt');

const { config } = require('./config.js');

const client = mqtt.connect(`mqtt://${config.mqttServer}`);

console.log(`Connecting to MQTT broker at ${config.mqttServer}..., topic: ${config.mqttTopic}`);

client.on('connect', () => {
    client.subscribe(config.mqttTopic, (err) => {
        if (!err) {
            console.log(`Connected to MQTT broker and subscribed to topic: ${config.mqttTopic}`);
            // Optionally, publish a message to indicate the listener is ready      
            client.publish(config.mqttTopic, 'Listener Ready');
        }
    });
});

client.on('message', (topic, message) => {
    console.log(message.toString());
    //client.end();
});

// Keep running the client to receive messages
setInterval(() => { }, 1000); // Prevents the script from exiting immediately