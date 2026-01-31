import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'alloy' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      speed: 1.1
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
}
