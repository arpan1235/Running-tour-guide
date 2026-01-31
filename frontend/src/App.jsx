import React, { useState, useEffect, useCallback, useRef } from 'react';
import RunningControls from './components/RunningControls';
import CommentaryDisplay from './components/CommentaryDisplay';
import StatsDisplay from './components/StatsDisplay';
import SettingsPanel from './components/SettingsPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useTourGuide } from './hooks/useTourGuide';
import './App.css';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    commentaryInterval: 30, // seconds between commentary
    voice: 'alloy',
    interests: ['landmarks', 'history', 'restaurants', 'local tips'],
    useBrowserTTS: true // fallback to browser TTS if API fails
  });

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

  // Start/stop the run
  const handleStartRun = useCallback(() => {
    setIsRunning(true);
    startTracking();
  }, [startTracking]);

  const handleStopRun = useCallback(() => {
    setIsRunning(false);
    stopTracking();
    stopSpeaking();
  }, [stopTracking, stopSpeaking]);

  // Generate commentary at intervals while running
  useEffect(() => {
    if (!isRunning || !location) return;

    // Generate initial commentary
    generateCommentary(location, locationHistory);

    // Set up interval for periodic commentary
    const interval = setInterval(() => {
      if (location && !isGenerating && !isSpeaking) {
        generateCommentary(location, locationHistory);
      }
    }, settings.commentaryInterval * 1000);

    return () => clearInterval(interval);
  }, [isRunning, location?.latitude, location?.longitude, settings.commentaryInterval]);

  // Auto-speak new commentary
  useEffect(() => {
    if (commentary && isRunning) {
      speakText(commentary.text);
    }
  }, [commentary?.timestamp]);

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
          onSkip={() => location && generateCommentary(location, locationHistory)}
          isGenerating={isGenerating}
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
