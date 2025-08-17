import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import { Buffer } from 'buffer';
import secrets from '../config/secrets.json' with { type: 'json' };


/**
 * Reads 9 digits from a 7-segment display using Google Gemini AI
 * @param {string|Buffer} imagePath - Path to image file or Buffer containing image data
 * @param {string} mimeType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @returns {Promise<{value: string}>} - JSON object containing the reading
 */
async function read7SegmentDisplay(imagePath, mimeType = 'image/png') {
    try {
        // Initialize Gemini AI
        const ai = new GoogleGenAI({
            apiKey: secrets.geminiApiKey, // Use your actual API key here
        });

        // Convert image to base64
        let base64Data;
        if (Buffer.isBuffer(imagePath)) {
            // If input is already a Buffer
            base64Data = imagePath.toString('base64');
        } else if (typeof imagePath === 'string') {
            // If input is a file path
            const imageBuffer = await fs.readFile(imagePath);
            base64Data = imageBuffer.toString('base64');
        } else {
            throw new Error('Invalid input: imagePath must be a string (file path) or Buffer');
        }

        // Configure the model
        const tools = [
            {
                googleSearch: {}
            }
        ];

        const config = {
            thinkingConfig: {
                thinkingBudget: 0,
            },
            tools,
        };

        const model = 'gemini-2.5-flash-lite';

        // Prepare the content for Gemini
        const contents = [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: `Read the 9 digits from a 7-segment display. You must return strictly a JSON object only containing the reading as value, according to this example:

{ "value": "123456789" }`,
                    },
                ],
            },
        ];

        console.log('Sending request to Gemini with image data...');

        // Generate response from Gemini
        const response = await ai.models.generateContentStream({
            model,
            config,
            contents,
        });

        // Collect the response text
        let fullResponse = '';
        for await (const chunk of response) {
            if (chunk.text) {
                fullResponse += chunk.text;
                //console.log('Received chunk:', chunk.text);
            }
        }

        console.log('Full response from Gemini:', fullResponse);

        // Try to extract JSON from the response
        const jsonMatch = fullResponse.match(/\{[^}]*"value"[^}]*\}/);
        if (jsonMatch) {
            try {
                // console.log('Extracted JSON:', jsonMatch[0]);
                return JSON.parse(jsonMatch[0]);

            } catch (parseError) {
                console.warn('Failed to parse extracted JSON:', jsonMatch[0]);
                throw new Error('Invalid JSON response from Gemini');
            }
        }

        // If no JSON found, try to parse the entire response
        try {
            return JSON.parse(fullResponse.trim());
        } catch (parseError) {
            console.error('Raw response from Gemini:', fullResponse);
            throw new Error('Could not extract valid JSON from Gemini response');
        }

    } catch (error) {
        console.error('Error reading 7-segment display:', error);
        throw error;
    }
}

// Example usage:
async function example() {
    try {
        // Using file path
        //      const result1 = await read7SegmentDisplay('./custom_threshold_image.png', 'image/png');
        //    console.log('Reading:', result1.value);

        // Using Buffer
        const imageBuffer = await fs.readFile('./custom_threshold_image.png');
        const result2 = await read7SegmentDisplay(imageBuffer, 'image/png');
        console.log('Reading:', result2.value);




        // Simple usage - uses Mosquitto test broker and default topic
        // publishMessage(result2.value)
        //     .then(() => console.log('Message sent to test.mosquitto.org'))
        //     .catch(error => console.error('Failed:', error));

    } catch (error) {
        console.error('Failed to read display:', error.message);
    }
}

//example().catch(console.error);

export { read7SegmentDisplay };

export default read7SegmentDisplay;