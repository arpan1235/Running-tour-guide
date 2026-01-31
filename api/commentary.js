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

    const systemPrompt = `You are an enthusiastic tour guide helping a runner explore their immediate surroundings.

CRITICAL RULES:
- ONLY mention places within 200-300 meters of the coordinates - nothing further!
- If you're not confident something is RIGHT THERE at those exact coordinates, don't mention it
- Never mention landmarks, restaurants, or places that are kilometers away
- It's better to talk about the neighborhood vibe, street character, or give a running tip than to guess about distant places
- Keep it to 2 sentences max - the runner is exercising!

Focus on: ${interestsList}
Tone: Friendly, energetic, conversational (this will be spoken aloud)`;

    const userPrompt = `${movementContext}Runner's exact location: ${latitude}, ${longitude}

What's interesting RIGHT HERE within a 200 meter radius? If you're not sure what's immediately nearby, describe the general neighborhood character or give a quick running tip instead. Be honest - don't guess about specific places unless you're confident they're right there.`;

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
