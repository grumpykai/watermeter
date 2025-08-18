const { config } = require('../config/config.js'); // Import configuration
const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const PNG = require('pngjs').PNG;
const { publishMessage } = require('./mqttPublish.js'); // Import MQTT publish function

// TODO: Implement Detection Area Logic

const loadFromFile = config.loadFromFile || false; // Use local file for testing if configured

let pixelmatch = null;
let geminiOCR = null;

import('pixelmatch').then(data => {
    // Use pixelmatch here
    pixelmatch = data.default || data; // Handle default export if necessary
});

import('./geminOCR.mjs').then(data => {
    // Use geminOCR here
    geminiOCR = data.default || data; // Handle default export if necessary
});


class ImageMonitor {
    constructor(url, cropParams, threshold = 0.1) {
        this.url = url;
        this.cropParams = cropParams; // {x, y, width, height}
        this.threshold = threshold; // Percentage of different pixels to trigger processing
        this.previousImage = null;
        this.isProcessing = false;
    }

    async downloadImage(url) {
        return new Promise((resolve, reject) => {

            if (loadFromFile) {
                // Load image from local file for testing
                fs.readFile(url, (err, data) => {
                    if (err) {
                        reject(new Error(`Failed to read file: ${err.message}`));
                    } else {
                        resolve(data);
                    }
                });
                return;
            }

            const protocol = url.startsWith('https') ? https : http;

            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
    }

    async cropImage(imageBuffer, x, y, width, height) {
        try {
            const img = await sharp(imageBuffer)
                .extract({ left: x, top: y, width: width, height: height })
                .png()
                .toBuffer();
            const enhanced = await this.convertLCDWithCustomThresholds(img, 'custom_threshold_image.png', [45, 47, 47, 47, 45, 40, 35, 30, 25, 24]);
            return enhanced;
        } catch (error) {
            throw new Error(`Image cropping failed: ${error.message}`);
        }

    }

    async compareImages(img1Buffer, img2Buffer) {
        if (!img1Buffer || !img2Buffer) {
            return { isDifferent: true, diffPercentage: 100, numDiffPixels: 0, totalPixels: 0 };
        }

        try {
            // Convert both images to PNG objects
            const img1 = PNG.sync.read(img1Buffer);
            const img2 = PNG.sync.read(img2Buffer);

            // Ensure images have the same dimensions
            if (img1.width !== img2.width || img1.height !== img2.height) {
                console.warn('Image dimensions differ, treating as different');
                const totalPixels = Math.max(img1.width * img1.height, img2.width * img2.height);
                return { isDifferent: true, diffPercentage: 100, numDiffPixels: totalPixels, totalPixels };
            }

            const totalPixels = img1.width * img1.height;

            // Handle edge case of empty images
            if (totalPixels === 0) {
                return { isDifferent: false, diffPercentage: 0, numDiffPixels: 0, totalPixels: 0 };
            }

            // Create diff image buffer
            const diff = new PNG({ width: img1.width, height: img1.height });

            // Compare images pixel by pixel
            const numDiffPixels = pixelmatch(
                img1.data,
                img2.data,
                diff.data,
                img1.width,
                img1.height,
                { threshold: this.threshold } // Pixel difference threshold
            );

            fs.writeFileSync('diff.png', PNG.sync.write(diff));

            const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;
            const isDifferent = diffPercentage > (this.threshold * 100);

            console.log(`🔍 Debug: numDiffPixels=${numDiffPixels}, totalPixels=${totalPixels}, diffPercentage=${diffPercentage.toFixed(2)}%, threshold=${(this.threshold * 100).toFixed(2)}%`);

            return { isDifferent, diffPercentage, numDiffPixels, totalPixels };
        } catch (error) {
            console.error('Image comparison failed:', error.message);
            return { isDifferent: true, diffPercentage: 100, numDiffPixels: 0, totalPixels: 0 };
        }
    }

    // This is the function that gets called when significant difference is detected
    async processSignificantChange(croppedImage, comparisonResult) {
        console.log('🔥 SIGNIFICANT CHANGE DETECTED!');
        console.log(`Difference: ${comparisonResult.diffPercentage.toFixed(2)}% of pixels changed`);
        console.log(`Changed pixels: ${comparisonResult.numDiffPixels}/${comparisonResult.totalPixels}`);

        // Save the image with timestamp for debugging
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `change_detected_${timestamp}.png`;
        /*
                try {
                    await fs.promises.writeFile(filename, croppedImage);
                    console.log(`📸 Saved detection image: ${filename}`);
                } catch (error) {
                    console.error('Failed to save detection image:', error.message);
                }
        */

        // ADD YOUR CUSTOM PROCESSING LOGIC HERE
        const reading = await geminiOCR(croppedImage, 'image/png')

        await publishMessage(reading.value)
            .then(() => console.log('Message sent to test.mosquitto.org'))
            .catch(error => console.error('Failed:', error));
    }

    async convertLCDWithCustomThresholds(inputPath, outputPath, thresholds = [200, 185, 170, 155, 140, 125, 110, 95, 80, 65]) {
        try {
            if (thresholds.length !== 10) {
                throw new Error('Exactly 10 threshold values must be provided');
            }

            const image = sharp(inputPath);
            const { width, height } = await image.metadata();

            // console.log(`Processing image: ${width}x${height}`);

            const chunkWidth = Math.floor(width / 10);
            const processedChunks = [];

            for (let i = 0; i < 10; i++) {
                const left = i * chunkWidth;
                const extractWidth = (i === 9) ? width - left : chunkWidth;
                const threshold = thresholds[i];

                // console.log(`Processing chunk ${i + 1}/10: x=${left}, width=${extractWidth}, threshold=${threshold}`);

                const processedChunk = await sharp(inputPath)
                    .extract({ left, top: 0, width: extractWidth, height })
                    .grayscale()
                    .normalize()
                    .threshold(threshold)
                    .png()
                    .toBuffer();

                processedChunks.push({
                    input: processedChunk,
                    left: left,
                    top: 0
                });
            }

            const finalImage = sharp({
                create: {
                    width: width,
                    height: height,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            })
                .composite(processedChunks)
                .png();

            await finalImage.toFile(outputPath);

            console.log(`💾 Converted image saved to ${outputPath}`);

            return finalImage.toBuffer();

        } catch (error) {
            console.error('❌ Error converting image:', error);
            throw error;
        }
    }

    async monitor() {
        if (this.isProcessing) {
            console.log('⏳ Previous check still processing, skipping...');
            return;
        }

        this.isProcessing = true;

        try {

            console.log(`📥 Downloading image from ${this.url}...`);
            const imageBuffer = await this.downloadImage(this.url);

            console.log(`✂️  Cropping image (${this.cropParams.x}, ${this.cropParams.y}, ${this.cropParams.width}, ${this.cropParams.height})...`);
            const croppedImage = await this.cropImage(
                imageBuffer,
                this.cropParams.x,
                this.cropParams.y,
                this.cropParams.width,
                this.cropParams.height
            );

            try {
                if (this.previousImage) {
                    console.log('🔍 Comparing with previous image...');
                    const comparisonResult = await this.compareImages(this.previousImage, croppedImage);

                    console.log(`📊 Difference: ${comparisonResult.diffPercentage.toFixed(2)}% (threshold: ${this.threshold * 100}%)`);

                    if (comparisonResult.isDifferent) {
                        await this.processSignificantChange(croppedImage, comparisonResult);
                    } else {
                        console.log('✅ No significant change detected');
                    }
                } else {
                    console.log('📸 First image captured, storing as reference');
                }
            } catch (error) {
                console.error('❌ Error during image comparison:', error.message);
            }
            // Store current image for next comparison
            this.previousImage = croppedImage;

        } catch (error) {
            console.error('❌ Error during monitoring:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    start() {
        console.log('🚀 Starting image monitor...');
        console.log(`📡 URL: ${this.url}`);
        console.log(`✂️  Crop area: x=${this.cropParams.x}, y=${this.cropParams.y}, w=${this.cropParams.width}, h=${this.cropParams.height}`);
        console.log(`🎯 Difference threshold: ${this.threshold * 100}%`);
        console.log('⏰ Checking every 10 seconds...\n');

        // Run initial check
        this.monitor();

        // Set up interval for subsequent checks
        this.intervalId = setInterval(() => {
            this.monitor();
        }, config.interval);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping image monitor...');
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
            process.exit(0);
        });
    }
}


// Create and start monitor
const monitor = new ImageMonitor(config.url, config.cropParams, config.threshold);

// Startup: Copy all files from ../templates/config to ../config if they don't exist
if (!fs.existsSync('./config')) {
    fs.mkdirSync('./config', { recursive: true });
}

fs.readdirSync('./templates/config').forEach(file => {
    const srcPath = `./templates/config/${file}`;
    const destPath = `./config/${file}`;
    if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`📂 Copied ${file} to ./config`)
            ;

    } else {

        console.log(`📂 ${file} already exists in ./config, skipping copy`);
    }
});

// Start the monitor
monitor.start();