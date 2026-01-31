const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Track recently mentioned places to avoid repetition
const recentlyMentioned = new Map();
const MENTION_COOLDOWN = 300000; // 5 minutes

/**
 * Generate tour commentary based on the runner's current location
 */
async function generateCommentary({ latitude, longitude, previousLocations, interests }) {
  const interestsList = interests.join(', ');

  // Calculate movement direction if we have previous locations
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
- Don't repeat information about places mentioned recently
- Use natural, conversational language suitable for audio playback`;

  const userPrompt = `${movementContext}The runner is currently at coordinates: ${latitude}, ${longitude}

Generate a brief, interesting commentary about this area. Include specific place names when possible. What landmarks, restaurants, or interesting facts should they know about?`;

  try {
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

    return {
      text: commentary,
      location: { latitude, longitude },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Get nearby places using LLM knowledge (can be enhanced with real Places API)
 */
async function getNearbyPlaces({ latitude, longitude, radius }) {
  const systemPrompt = `You are a location expert. Given coordinates, identify notable places that might be nearby.
Return a JSON array of places with name, type, and brief description.
Types can be: landmark, restaurant, park, museum, historic, shopping, entertainment`;

  const userPrompt = `What notable places might be near coordinates ${latitude}, ${longitude} within ${radius} meters?
Return as JSON array: [{"name": "...", "type": "...", "description": "..."}]
Include 3-5 places if possible.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Error getting nearby places:', error);
    return [];
  }
}

/**
 * Generate speech audio from text using OpenAI TTS
 */
async function generateSpeech(text, voice = 'alloy') {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice, // alloy, echo, fable, onyx, nova, shimmer
      input: text,
      speed: 1.1 // Slightly faster for runners
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error('TTS API error:', error);
    throw error;
  }
}

/**
 * Calculate cardinal direction between two points
 */
function getDirection(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);

  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;

  return directions[index];
}

module.exports = {
  generateCommentary,
  getNearbyPlaces,
  generateSpeech
};
