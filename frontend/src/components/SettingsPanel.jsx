import React from 'react';
import './SettingsPanel.css';

const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male)' },
  { value: 'fable', label: 'Fable (British)' },
  { value: 'onyx', label: 'Onyx (Deep)' },
  { value: 'nova', label: 'Nova (Female)' },
  { value: 'shimmer', label: 'Shimmer (Soft)' }
];

const INTEREST_OPTIONS = [
  'landmarks',
  'history',
  'restaurants',
  'local tips',
  'architecture',
  'nature',
  'art',
  'nightlife'
];

function SettingsPanel({ settings, onSettingsChange, onClose }) {
  const updateSetting = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const toggleInterest = (interest) => {
    const interests = settings.interests.includes(interest)
      ? settings.interests.filter(i => i !== interest)
      : [...settings.interests, interest];
    updateSetting('interests', interests);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label>Distance Between Updates</label>
            <div className="interval-slider">
              <input
                type="range"
                min="50"
                max="300"
                step="50"
                value={settings.minDistanceForNewCommentary || 100}
                onChange={e => updateSetting('minDistanceForNewCommentary', parseInt(e.target.value))}
              />
              <span>{settings.minDistanceForNewCommentary || 100}m</span>
            </div>
            <p className="setting-hint">How far to run before hearing new info</p>
          </div>

          <div className="setting-group">
            <label>Voice</label>
            <select
              value={settings.voice}
              onChange={e => updateSetting('voice', e.target.value)}
            >
              {VOICE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Interests</label>
            <div className="interests-grid">
              {INTEREST_OPTIONS.map(interest => (
                <button
                  key={interest}
                  className={`interest-tag ${settings.interests.includes(interest) ? 'active' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="toggle-label">
              <span>Use Browser TTS (Fallback)</span>
              <input
                type="checkbox"
                checked={settings.useBrowserTTS}
                onChange={e => updateSetting('useBrowserTTS', e.target.checked)}
              />
              <span className="toggle-switch" />
            </label>
            <p className="setting-hint">Fall back to browser voice if API fails</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default SettingsPanel;
