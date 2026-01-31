import React from 'react';
import './StatsDisplay.css';

function StatsDisplay({ distance, duration, isRunning, location }) {
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const calculatePace = () => {
    if (!distance || !duration || distance < 10) return '--:--';
    const paceSeconds = duration / (distance / 1000); // seconds per km
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.round(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="stats-display card">
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Duration</span>
          <span className="stat-value">{formatDuration(duration)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Distance</span>
          <span className="stat-value">{formatDistance(distance)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pace</span>
          <span className="stat-value">{calculatePace()}<small>/km</small></span>
        </div>
      </div>

      {location && (
        <div className="location-info">
          <LocationIcon />
          <span>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
        </div>
      )}

      {isRunning && (
        <div className="running-indicator">
          <div className="pulse-dot" />
          <span>Tracking active</span>
        </div>
      )}
    </div>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

export default StatsDisplay;
