import { read7SegmentDisplay } from '../geminOCR.mjs';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: jest.fn().mockResolvedValue([
        { text: '{ "value": "123456789" }' }
      ])
    }
  }))
}));

test('read7SegmentDisplay returns correct value from mocked Gemini', async () => {
  const result = await read7SegmentDisplay(Buffer.from('fake'), 'image/png');
  expect(result).toEqual({ value: "123456789" });
});