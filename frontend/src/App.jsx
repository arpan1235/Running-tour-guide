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
    commentaryInterval: 30,
    voice: 'alloy',
    interests: ['landmarks', 'history', 'restaurants', 'local tips'],
    useBrowserTTS: true,
    minDistanceForNewCommentary: 100 // meters before new commentary
  });

  // Track state for smooth commentary flow
  const lastCommentaryLocationRef = useRef(null);
  const pendingCommentaryRef = useRef(null);
  const hasSpokenInitialRef = useRef(false);

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

  // Start the run
  const handleStartRun = useCallback(() => {
    setIsRunning(true);
    hasSpokenInitialRef.current = false;
    lastCommentaryLocationRef.current = null;
    pendingCommentaryRef.current = null;
    startTracking();
  }, [startTracking]);

  // Stop the run
  const handleStopRun = useCallback(() => {
    setIsRunning(false);
    stopTracking();
    stopSpeaking();
    hasSpokenInitialRef.current = false;
    lastCommentaryLocationRef.current = null;
  }, [stopTracking, stopSpeaking]);

  // Check if we should generate new commentary based on distance moved
  const shouldGenerateCommentary = useCallback(() => {
    if (!location || !isRunning) return false;
    if (isGenerating || isSpeaking) return false;

    // Always generate initial commentary
    if (!hasSpokenInitialRef.current) {
      return true;
    }

    // Check if we've moved enough distance
    if (lastCommentaryLocationRef.current) {
      const distanceMoved = getDistanceMeters(
        lastCommentaryLocationRef.current.latitude,
        lastCommentaryLocationRef.current.longitude,
        location.latitude,
        location.longitude
      );
      return distanceMoved >= settings.minDistanceForNewCommentary;
    }

    return false;
  }, [location, isRunning, isGenerating, isSpeaking, settings.minDistanceForNewCommentary]);

  // Main effect: Generate commentary when appropriate
  useEffect(() => {
    if (!isRunning || !location) return;

    if (shouldGenerateCommentary()) {
      // Store this location as where we're generating commentary
      lastCommentaryLocationRef.current = { ...location };
      hasSpokenInitialRef.current = true;
      generateCommentary(location, locationHistory);
    }
  }, [location?.latitude, location?.longitude, isRunning, shouldGenerateCommentary]);

  // Speak commentary when it arrives (but only if not already speaking)
  useEffect(() => {
    if (!commentary || !isRunning) return;

    if (isSpeaking) {
      // Queue this commentary to speak after current finishes
      pendingCommentaryRef.current = commentary;
    } else {
      speakText(commentary.text);
      pendingCommentaryRef.current = null;
    }
  }, [commentary?.timestamp]);

  // Handle queued commentary when speaking finishes
  useEffect(() => {
    if (!isSpeaking && pendingCommentaryRef.current && isRunning) {
      const pending = pendingCommentaryRef.current;
      pendingCommentaryRef.current = null;
      speakText(pending.text);
    }
  }, [isSpeaking, isRunning]);

  // Manual skip - force new commentary
  const handleSkip = useCallback(() => {
    if (!location || isGenerating) return;
    stopSpeaking();
    lastCommentaryLocationRef.current = { ...location };
    generateCommentary(location, locationHistory);
  }, [location, isGenerating, stopSpeaking, generateCommentary, locationHistory]);

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
