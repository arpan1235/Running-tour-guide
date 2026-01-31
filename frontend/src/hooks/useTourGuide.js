import { useState, useCallback, useRef } from 'react';

export function useTourGuide(settings) {
  const [commentary, setCommentary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const speakingTimeoutRef = useRef(null);

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

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error (${response.status}): API endpoint not found.`);
      }

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setCommentary(data);
    } catch (err) {
      console.error('Commentary generation error:', err);
      setError(err.message || 'Could not generate tour commentary.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, settings.interests]);

  /**
   * Use browser's built-in speech synthesis
   */
  const useBrowserTTS = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
      clearTimeout(speakingTimeoutRef.current);
    };

    utterance.onerror = (e) => {
      console.error('Browser TTS error:', e);
      setIsSpeaking(false);
      clearTimeout(speakingTimeoutRef.current);
    };

    // Safety timeout - reset speaking state after 30 seconds max
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false);
      window.speechSynthesis.cancel();
    }, 30000);

    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Speak text using OpenAI TTS or browser fallback
   */
  const speakText = useCallback(async (text) => {
    // Stop any current speech first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    clearTimeout(speakingTimeoutRef.current);

    setIsSpeaking(true);

    // Safety timeout - always reset after 30 seconds
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, 30000);

    try {
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
        audioRef.current.setAttribute('playsinline', 'true'); // iOS support

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          clearTimeout(speakingTimeoutRef.current);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          // Fallback to browser TTS
          if (settings.useBrowserTTS) {
            useBrowserTTS(text);
          } else {
            setIsSpeaking(false);
            clearTimeout(speakingTimeoutRef.current);
          }
        };

        try {
          await audioRef.current.play();
          return; // Success!
        } catch (playError) {
          console.error('Audio play failed:', playError);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          // Fall through to browser TTS
        }
      }
    } catch (err) {
      console.error('OpenAI TTS fetch error:', err);
    }

    // Fallback to browser TTS
    if (settings.useBrowserTTS) {
      useBrowserTTS(text);
    } else {
      setIsSpeaking(false);
      clearTimeout(speakingTimeoutRef.current);
    }
  }, [settings.voice, settings.useBrowserTTS, useBrowserTTS]);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    clearTimeout(speakingTimeoutRef.current);
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
