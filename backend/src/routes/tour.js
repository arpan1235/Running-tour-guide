const express = require('express');
const router = express.Router();
const tourService = require('../services/tourService');

// Generate tour commentary based on location
router.post('/commentary', async (req, res) => {
  try {
    const { latitude, longitude, previousLocations, interests } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const commentary = await tourService.generateCommentary({
      latitude,
      longitude,
      previousLocations: previousLocations || [],
      interests: interests || ['landmarks', 'history', 'restaurants', 'local tips']
    });

    res.json(commentary);
  } catch (error) {
    console.error('Error generating commentary:', error);
    res.status(500).json({ error: 'Failed to generate tour commentary' });
  }
});

// Get nearby points of interest (can be enhanced with real APIs)
router.post('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const places = await tourService.getNearbyPlaces({
      latitude,
      longitude,
      radius: radius || 500
    });

    res.json(places);
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    res.status(500).json({ error: 'Failed to fetch nearby places' });
  }
});

// Generate text-to-speech audio
router.post('/speak', async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await tourService.generateSpeech(text, voice || 'alloy');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

module.exports = router;
