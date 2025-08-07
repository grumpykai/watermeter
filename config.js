// Configuration
const config = {
    interval: 60000, // 1 minute
    url: 'http://192.168.178.171:8081',
    cropParams: {
        x: 213,      // X position from top-left corner
        y: 150,      // Y position from top-left corner
        width: 402,  // Width
        height: 90   // Height
    },
    detectionArea: {
        x: 213,      // X position from top-left corner
        y: 150,      // Y position from top-left corner
        width: 402,  // Width
        height: 90   // Height
    },
    threshold: 0.041, // 5% of pixels need to change to trigger processing,
    mqttServer: 'test.mosquitto.org:1883',
    mqttTopic: 'grumpykai/watermeter',
};

module.exports = config;
module.exports.config = config;