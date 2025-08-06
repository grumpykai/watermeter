const mqtt = require('mqtt');

const { config } = require('./config.js');

/**
 * MQTT Publisher Module
 * Publishes messages to an MQTT broker using Mosquitto test broker
 */

// Constants
const DEFAULT_BROKER_URL = config.mqttServer || 'test.mosquitto.org:1883';
const DEFAULT_TOPIC = config.mqttTopic || 'grumpykai/watermeter';

let client = null;
let isConnected = false;

/**
 * Initialize MQTT connection
 * @param {Object} options - MQTT connection options
 * @param {string} options.brokerUrl - MQTT broker URL (default: Mosquitto test broker)
 * @param {string} [options.username] - Username for authentication
 * @param {string} [options.password] - Password for authentication
 * @param {Object} [options.clientOptions] - Additional MQTT client options
 * @returns {Promise} - Resolves when connected
 */
function connect(options = {}) {
    return new Promise((resolve, reject) => {
        if (isConnected && client) {
            resolve(client);
            return;
        }

        const { brokerUrl = DEFAULT_BROKER_URL, username, password, clientOptions = {} } = options;

        const mqttOptions = {
            ...clientOptions,
        };

        if (username) mqttOptions.username = username;
        if (password) mqttOptions.password = password;

        client = mqtt.connect(brokerUrl, mqttOptions);

        client.on('connect', () => {
            isConnected = true;
            console.log('Connected to MQTT broker');
            resolve(client);
        });

        client.on('error', (error) => {
            console.error('MQTT connection error:', error);
            isConnected = false;
            reject(error);
        });

        client.on('close', () => {
            isConnected = false;
            console.log('MQTT connection closed');
        });
    });
}

/**
 * Publish a message to MQTT broker
 * @param {string} message - The message to publish
 * @param {Object} options - Publishing options
 * @param {string} [options.topic] - MQTT topic to publish to (default: 'test/nodejs/messages')
 * @param {Object} [options.publishOptions] - MQTT publish options (qos, retain, etc.)
 * @param {Object} [options.connectionOptions] - Connection options if not already connected
 * @returns {Promise} - Resolves when message is published
 */
async function publishMessage(message, options = {}) {
    try {
        const {
            topic = DEFAULT_TOPIC,
            publishOptions = { qos: 0, retain: false },
            connectionOptions = {}
        } = options;

        // Validate input
        if (typeof message !== 'string') {
            throw new Error('Message must be a string');
        }

        // Ensure we're connected
        if (!isConnected || !client) {
            await connect(connectionOptions);
        }

        // Publish the message
        return new Promise((resolve, reject) => {
            client.publish(topic, message, publishOptions, (error) => {
                if (error) {
                    console.error('Failed to publish message:', error);
                    reject(error);
                } else {
                    console.log(`Message published to topic "${topic}": ${message}`);
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error in publishMessage:', error);
        throw error;
    }
}

/**
 * Disconnect from MQTT broker
 * @returns {Promise} - Resolves when disconnected
 */
function disconnect() {
    return new Promise((resolve) => {
        if (client && isConnected) {
            client.end(() => {
                isConnected = false;
                client = null;
                console.log('Disconnected from MQTT broker');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

/**
 * Check if connected to MQTT broker
 * @returns {boolean} - Connection status
 */
function getConnectionStatus() {
    return isConnected;
}

// Export the functions for both CommonJS and ES6
const mqttPublisher = {
    publishMessage,
    connect,
    disconnect,
    getConnectionStatus,
    DEFAULT_BROKER_URL,
    DEFAULT_TOPIC
};

// CommonJS export
module.exports = mqttPublisher;

// ES6 export compatibility
module.exports.default = mqttPublisher;
module.exports.publishMessage = publishMessage;
module.exports.connect = connect;
module.exports.disconnect = disconnect;
module.exports.getConnectionStatus = getConnectionStatus;
module.exports.DEFAULT_BROKER_URL = DEFAULT_BROKER_URL;
module.exports.DEFAULT_TOPIC = DEFAULT_TOPIC;
