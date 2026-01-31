import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function getDirection(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  return directions[index];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY in Vercel settings.' });
  }

  try {
    const { latitude, longitude, previousLocations = [], interests = ['landmarks', 'history', 'restaurants', 'local tips'] } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const interestsList = interests.join(', ');

    let movementContext = '';
    if (previousLocations.length > 0) {
      const lastLoc = previousLocations[previousLocations.length - 1];
      const direction = getDirection(lastLoc.latitude, lastLoc.longitude, latitude, longitude);
      movementContext = `The runner is heading ${direction}. `;
    }

    const systemPrompt = `You are an enthusiastic and knowledgeable tour guide helping a runner explore the city.
Your job is to provide interesting, concise commentary about the area they're running through.

Guidelines:
- Keep responses brief (2-3 sentences max) - the runner is exercising!
- Be energetic and encouraging
- Focus on: ${interestsList}
- Mention specific landmarks, restaurants, historical facts, or local tips
- If there's nothing notable nearby, give an encouraging running tip or fun local fact
- Use natural, conversational language suitable for audio playback`;

    const userPrompt = `${movementContext}The runner is currently at coordinates: ${latitude}, ${longitude}

Generate a brief, interesting commentary about this area. Include specific place names when possible.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    });

    const commentary = response.choices[0].message.content;

    res.json({
      text: commentary,
      location: { latitude, longitude },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Commentary error:', error);

    // Provide specific error messages
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'Invalid OpenAI API key. Check your key in Vercel settings.' });
    }
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ error: 'OpenAI quota exceeded. Check your billing at platform.openai.com' });
    }

    res.status(500).json({ error: error.message || 'Failed to generate commentary' });
  }
}
