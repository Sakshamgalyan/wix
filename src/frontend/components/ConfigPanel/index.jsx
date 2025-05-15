import React, { useState, useEffect } from 'react';
import { useWix } from '@wix/sdk-react';
import './styles.css';

export default function ConfigPanel({ settings, setSettings }) {
  const { wix } = useWix();
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Initialize from props
    if (settings?.apiKey) {
      setApiKey(settings.apiKey);
    } else {
      // Fallback to storage if not in props
      wix.storage.getItem('apiKey').then(key => {
        if (key) {
          setApiKey(key);
          setSettings({ apiKey: key });
        }
      });
    }
  }, []);

  const saveSettings = async () => {
    await wix.storage.setItem('apiKey', apiKey);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const newSettings = { apiKey };
      await setSettings(newSettings); 
      await saveSettings();
      wix.showToast('Settings saved successfully!');
    } catch (error) {
      wix.showToast('Failed to save settings', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="config-panel">
      <h2>Payment Gateway Setup</h2>
      
      <div className="form-group">
        <label>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_live_..."
        />
      </div>

      <div className="form-group">
        <label>Webhook URL (Auto-generated)</label>
        <input
          type="text"
          value={`${window.location.origin}/webhooks`}
          readOnly
        />
        <small>Configure this in your gateway dashboard</small>
      </div>

      <button 
        onClick={handleSave}
        disabled={isLoading}
        className="save-button"
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}