import React from 'react';
import './RunningControls.css';

function RunningControls({ isRunning, onStart, onStop, onSkip, isGenerating, isSpeaking }) {
  return (
    <div className="running-controls">
      {!isRunning ? (
        <button className="start-btn" onClick={onStart}>
          <PlayIcon />
          <span>Start Run</span>
        </button>
      ) : (
        <div className="running-actions">
          <button
            className="skip-btn"
            onClick={onSkip}
            disabled={isGenerating}
            title={isSpeaking ? "Skip current" : "Get new commentary"}
          >
            <SkipIcon />
          </button>
          <button className="stop-btn" onClick={onStop}>
            <StopIcon />
            <span>End Run</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 4l10 8-10 8V4zM19 5v14h-2V5h2z" />
    </svg>
  );
}

export default RunningControls;
