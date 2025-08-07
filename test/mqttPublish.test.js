const mqtt = require('mqtt');
const mqttPublisher = require('../mqttPublish.js');

jest.mock('mqtt');

describe('mqttPublish', () => {
    let mockClient;

    beforeEach(() => {
        mockClient = {
            on: jest.fn(),
            publish: jest.fn((topic, message, options, cb) => cb && cb(null)),
            end: jest.fn((cb) => cb && cb())
        };
        mqtt.connect = jest.fn().mockReturnValue(mockClient);
        // Reset connection state
        mqttPublisher.disconnect();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('connects to MQTT broker', async () => {
        mockClient.on.mockImplementation((event, cb) => {
            if (event === 'connect') cb();
        });
        await expect(mqttPublisher.connect()).resolves.toBe(mockClient);
        expect(mqtt.connect).toHaveBeenCalled();
    });

    test('publishes a message', async () => {
        mockClient.on.mockImplementation((event, cb) => {
            if (event === 'connect') cb();
        });
        await expect(mqttPublisher.publishMessage('test-message', { topic: 'test/topic' })).resolves.toBeUndefined();
        expect(mockClient.publish).toHaveBeenCalledWith('test/topic', 'test-message', { qos: 0, retain: false }, expect.any(Function));
    });

    test('throws if message is not a string', async () => {
        await expect(mqttPublisher.publishMessage(123)).rejects.toThrow('Message must be a string');
    });

    test('disconnects from MQTT broker', async () => {
        mockClient.on.mockImplementation((event, cb) => {
            if (event === 'connect') cb();
        });
        await mqttPublisher.connect();
        await expect(mqttPublisher.disconnect()).resolves.toBeUndefined();
        expect(mockClient.end).toHaveBeenCalled();
    });

    test('getConnectionStatus returns boolean', () => {
        expect(typeof mqttPublisher.getConnectionStatus()).toBe('boolean');
    });
});
