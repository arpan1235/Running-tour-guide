import React from 'react';
import './CommentaryDisplay.css';

function CommentaryDisplay({ commentary, isGenerating, isSpeaking }) {
  return (
    <div className="commentary-display card">
      <div className="commentary-header">
        <h2>Tour Guide</h2>
        {isSpeaking && (
          <div className="speaking-indicator">
            <SpeakerIcon />
            <span>Speaking</span>
          </div>
        )}
      </div>

      <div className="commentary-content">
        {isGenerating ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Discovering your surroundings...</p>
          </div>
        ) : commentary ? (
          <p className="commentary-text">{commentary.text}</p>
        ) : (
          <p className="placeholder-text">
            Start your run to hear about interesting places around you!
          </p>
        )}
      </div>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

export default CommentaryDisplay;
