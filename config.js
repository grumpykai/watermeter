// Configuration
export const config = {
    interval: 60000, // 1 minute
    url: 'http://192.168.178.171:8081',
    cropParams: {
        x: 213,      // X position
        y: 150,      // Y position  
        width: 402,  // Width
        height: 90   // Height
    },
    threshold: 0.041, // 5% of pixels need to change to trigger processing,
    mqttServer: 'test.mosquitto.org:1883',
    mqttTopic: 'grumpykai/watermeter',
};