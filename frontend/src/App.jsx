import React, { useState, useEffect, useCallback, useRef } from 'react';
import RunningControls from './components/RunningControls';
import CommentaryDisplay from './components/CommentaryDisplay';
import StatsDisplay from './components/StatsDisplay';
import SettingsPanel from './components/SettingsPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useTourGuide } from './hooks/useTourGuide';
import './App.css';

// Calculate distance between two coordinates in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    voice: 'alloy',
    interests: ['landmarks', 'history', 'restaurants', 'local tips'],
    useBrowserTTS: true,
    minDistanceForNewCommentary: 100
  });

  // Refs for tracking state without triggering re-renders
  const lastCommentaryLocationRef = useRef(null);
  const isProcessingRef = useRef(false);
  const checkIntervalRef = useRef(null);

  const {
    location,
    locationHistory,
    error: locationError,
    startTracking,
    stopTracking,
    distance,
    duration
  } = useGeolocation();

  const {
    commentary,
    isGenerating,
    isSpeaking,
    error: tourError,
    generateCommentary,
    speakText,
    stopSpeaking
  } = useTourGuide(settings);

  // Generate commentary for current location
  const triggerCommentary = useCallback(() => {
    if (!location || isProcessingRef.current || isGenerating) return;

    isProcessingRef.current = true;
    lastCommentaryLocationRef.current = { ...location };
    generateCommentary(location, locationHistory);
  }, [location, isGenerating, generateCommentary, locationHistory]);

  // Start the run
  const handleStartRun = useCallback(() => {
    setIsRunning(true);
    lastCommentaryLocationRef.current = null;
    isProcessingRef.current = false;
    startTracking();
  }, [startTracking]);

  // Stop the run
  const handleStopRun = useCallback(() => {
    setIsRunning(false);
    stopTracking();
    stopSpeaking();
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    lastCommentaryLocationRef.current = null;
    isProcessingRef.current = false;
  }, [stopTracking, stopSpeaking]);

  // Initial commentary when run starts and location is available
  useEffect(() => {
    if (isRunning && location && !lastCommentaryLocationRef.current && !isGenerating) {
      triggerCommentary();
    }
  }, [isRunning, location, isGenerating, triggerCommentary]);

  // Polling interval to check distance while running
  useEffect(() => {
    if (!isRunning) return;

    checkIntervalRef.current = setInterval(() => {
      if (!location || isGenerating || isSpeaking || isProcessingRef.current) return;

      if (lastCommentaryLocationRef.current) {
        const distanceMoved = getDistanceMeters(
          lastCommentaryLocationRef.current.latitude,
          lastCommentaryLocationRef.current.longitude,
          location.latitude,
          location.longitude
        );

        if (distanceMoved >= settings.minDistanceForNewCommentary) {
          triggerCommentary();
        }
      }
    }, 3000); // Check every 3 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isRunning, location, isGenerating, isSpeaking, settings.minDistanceForNewCommentary, triggerCommentary]);

  // Speak when new commentary arrives
  useEffect(() => {
    if (commentary && isRunning && !isSpeaking) {
      speakText(commentary.text);
      // Reset processing flag after a short delay to allow next commentary
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, [commentary?.timestamp, isRunning, isSpeaking, speakText]);

  // Reset processing flag when speaking finishes
  useEffect(() => {
    if (!isSpeaking && !isGenerating) {
      isProcessingRef.current = false;
    }
  }, [isSpeaking, isGenerating]);

  // Manual skip
  const handleSkip = useCallback(() => {
    if (!location || isGenerating) return;
    stopSpeaking();
    isProcessingRef.current = false;
    setTimeout(() => triggerCommentary(), 100);
  }, [location, isGenerating, stopSpeaking, triggerCommentary]);

  const error = locationError || tourError;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Running Tour Guide</h1>
        <button
          className="settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        <StatsDisplay
          distance={distance}
          duration={duration}
          isRunning={isRunning}
          location={location}
        />

        <CommentaryDisplay
          commentary={commentary}
          isGenerating={isGenerating}
          isSpeaking={isSpeaking}
        />

        <RunningControls
          isRunning={isRunning}
          onStart={handleStartRun}
          onStop={handleStopRun}
          onSkip={handleSkip}
          isGenerating={isGenerating}
          isSpeaking={isSpeaking}
        />
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export default App;
