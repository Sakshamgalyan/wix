import React, { useState, useEffect } from 'react';
import { useWix } from '@wix/sdk-react';
import './styles.css';


export default function ConfigPanel({ settings, setSettings }) {
  const { wix } = useWix();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    wix.storage.getItem('apiKey').then(key => setSettings({ apiKey: key }));
  }, []);

  const saveSettings = () => {
    wix.storage.setItem('apiKey', settings.apiKey);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await wix.saveSettings(settings); 
      wix.showToast('Settings saved successfully!');
      saveSettings();
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
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
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