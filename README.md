# Watermeter 7-Segment OCR & MQTT Publisher

This project reads 9-digit values from 7-segment display images (e.g., water meters) using Google Gemini AI, and publishes the readings to an MQTT broker (such as Mosquitto). It is designed for easy integration with IoT and home automation systems.

---

## Features

- **OCR with Google Gemini AI:** Extracts 9-digit readings from images of 7-segment displays.
- **Flexible Image Input:** Accepts both file paths and Buffers.
- **MQTT Publishing:** Sends readings to any MQTT broker (default: Mosquitto test broker).
- **Modular Design:** Use OCR and MQTT modules independently or together.

---

## Project Structure

- `index.js` — Main logic: ties together OCR and MQTT publishing.
- `geminOCR.mjs` — OCR logic using Google Gemini AI.
- `mqttPublish.js` — MQTT connection and publishing utilities.
- `secrets.json` — Your Gemini API key (not included in repo).
- `README.md` — Project documentation.

---

## Requirements

- Node.js v18+
- [@google/genai](https://www.npmjs.com/package/@google/genai)
- [mqtt](https://www.npmjs.com/package/mqtt)
- Google Gemini API key

---

## Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/watermeter.git
    cd watermeter
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Add your Gemini API key:**
    - Create a `secrets.json` file in the project root:
      ```json
      {
        "geminiApiKey": "YOUR_GEMINI_API_KEY"
      }
      ```

---

## Usage

### 1. Read a 7-segment display image and publish to MQTT

```js
// [index.js](http://_vscodecontentref_/0)
import read7SegmentDisplay from './geminOCR.mjs';
const { publishMessage } = require('./mqttPublish.js');

async function main() {
    const result = await read7SegmentDisplay('./your_image.png', 'image/png');
    console.log('OCR Reading:', result.value);

    await publishMessage(result.value);
    console.log('Published to MQTT!');
}

main().catch(console.error);