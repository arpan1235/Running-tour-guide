import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Fetch nearby places from OpenStreetMap using Overpass API
async function getNearbyPlaces(lat, lon, radiusMeters = 150) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"restaurant|cafe|bar|pub|fast_food|ice_cream|bakery"](around:${radiusMeters},${lat},${lon});
      node["tourism"~"museum|gallery|artwork|attraction|viewpoint|monument|memorial"](around:${radiusMeters},${lat},${lon});
      node["historic"](around:${radiusMeters},${lat},${lon});
      node["leisure"~"park|garden|playground"](around:${radiusMeters},${lat},${lon});
      node["shop"~"books|clothes|gift|mall"](around:${radiusMeters},${lat},${lon});
      way["tourism"~"museum|gallery|attraction"](around:${radiusMeters},${lat},${lon});
      way["historic"](around:${radiusMeters},${lat},${lon});
      way["leisure"~"park|garden"](around:${radiusMeters},${lat},${lon});
      way["building"~"church|cathedral|mosque|temple|synagogue"](around:${radiusMeters},${lat},${lon});
    );
    out body center 10;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) return [];

    const data = await response.json();

    // Extract place names and types
    return data.elements
      .filter(el => el.tags && el.tags.name)
      .map(el => ({
        name: el.tags.name,
        type: el.tags.amenity || el.tags.tourism || el.tags.historic || el.tags.leisure || el.tags.shop || el.tags.building || 'place',
        cuisine: el.tags.cuisine || null,
        description: el.tags.description || null
      }))
      .slice(0, 8); // Limit to 8 places
  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
}

// Reverse geocode to get street/neighborhood name
async function getLocationName(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`,
      { headers: { 'User-Agent': 'RunningTourGuide/1.0' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      street: data.address?.road || data.address?.pedestrian || data.address?.footway,
      neighborhood: data.address?.neighbourhood || data.address?.suburb || data.address?.quarter,
      city: data.address?.city || data.address?.town || data.address?.village
    };
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
}

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

    // Fetch real data from OpenStreetMap
    const [nearbyPlaces, locationInfo] = await Promise.all([
      getNearbyPlaces(latitude, longitude, 150),
      getLocationName(latitude, longitude)
    ]);

    const interestsList = interests.join(', ');

    let movementContext = '';
    if (previousLocations.length > 0) {
      const lastLoc = previousLocations[previousLocations.length - 1];
      const direction = getDirection(lastLoc.latitude, lastLoc.longitude, latitude, longitude);
      movementContext = `The runner is heading ${direction}. `;
    }

    // Build location context
    let locationContext = '';
    if (locationInfo) {
      const parts = [locationInfo.street, locationInfo.neighborhood, locationInfo.city].filter(Boolean);
      if (parts.length > 0) {
        locationContext = `Current location: ${parts.join(', ')}. `;
      }
    }

    // Build places context
    let placesContext = '';
    if (nearbyPlaces.length > 0) {
      const placesList = nearbyPlaces.map(p => {
        let desc = `${p.name} (${p.type})`;
        if (p.cuisine) desc += ` - ${p.cuisine}`;
        return desc;
      }).join('; ');
      placesContext = `\n\nNEARBY PLACES WITHIN 150 METERS:\n${placesList}`;
    } else {
      placesContext = '\n\nNo specific places of interest found within 150 meters.';
    }

    const systemPrompt = `You are an enthusiastic tour guide helping a runner explore their city.

RULES:
- Keep it to 2 sentences max - they're running!
- ONLY mention places from the NEARBY PLACES list provided - these are real and verified nearby
- If no places are listed, comment on the neighborhood vibe or give a running tip
- Be conversational and energetic (this will be spoken aloud)
- Focus on: ${interestsList}`;

    const userPrompt = `${movementContext}${locationContext}${placesContext}

Generate a brief, friendly audio commentary for the runner. Only mention places from the list above - they're confirmed to be right here!`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    const commentary = response.choices[0].message.content;

    res.json({
      text: commentary,
      location: { latitude, longitude },
      nearbyPlaces: nearbyPlaces.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Commentary error:', error);

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'Invalid OpenAI API key. Check your key in Vercel settings.' });
    }
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ error: 'OpenAI quota exceeded. Check your billing at platform.openai.com' });
    }

    res.status(500).json({ error: error.message || 'Failed to generate commentary' });
  }
}
