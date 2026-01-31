import { useState, useCallback, useRef } from 'react';

export function useTourGuide(settings) {
  const [commentary, setCommentary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const speechSynthRef = useRef(null);

  /**
   * Generate commentary for current location
   */
  const generateCommentary = useCallback(async (location, locationHistory) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          previousLocations: locationHistory.slice(-5),
          interests: settings.interests
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setCommentary(data);
    } catch (err) {
      console.error('Commentary generation error:', err);
      setError(err.message || 'Could not generate tour commentary. Check your connection.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, settings.interests]);

  /**
   * Speak text using OpenAI TTS or browser fallback
   */
  const speakText = useCallback(async (text) => {
    // Stop any current speech
    stopSpeaking();
    setIsSpeaking(true);

    try {
      // Try OpenAI TTS first
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          if (settings.useBrowserTTS) {
            useBrowserTTS(text);
          }
        };
        await audioRef.current.play();
        return;
      }
    } catch (err) {
      console.error('OpenAI TTS error:', err);
    }

    // Fallback to browser TTS
    if (settings.useBrowserTTS) {
      useBrowserTTS(text);
    } else {
      setIsSpeaking(false);
    }
  }, [settings.voice, settings.useBrowserTTS]);

  /**
   * Use browser's built-in speech synthesis
   */
  const useBrowserTTS = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    commentary,
    isGenerating,
    isSpeaking,
    error,
    generateCommentary,
    speakText,
    stopSpeaking
  };
}
