import React from 'react';
import { useAppStore } from '../../store/appStore';

const providerModels: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-4o (Recommended)', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'o1', value: 'o1' },
    { label: 'o1-mini', value: 'o1-mini' },
  ],
  anthropic: [
    { label: 'Claude Sonnet 4 (Recommended)', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
    { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-20241022' },
  ],
  gemini: [
    { label: 'Gemini 3.1 Pro (Recommended)', value: 'gemini-3.1-pro' },
    { label: 'Gemini 3.1 Flash', value: 'gemini-3.1-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  ],
  ollama: [
    { label: 'Llama 3', value: 'llama3' },
    { label: 'CodeLlama', value: 'codellama' },
    { label: 'Mistral', value: 'mistral' },
    { label: 'DeepSeek Coder', value: 'deepseek-coder' },
    { label: 'Phi-3', value: 'phi3' },
  ],
};

const SettingsPanel: React.FC = () => {
  const { setShowSettings, settings, updateSettings } = useAppStore();

  const currentModels = providerModels[settings.llmProvider] || [];

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="settings-close" onClick={() => setShowSettings(false)}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* User Profile & Credits */}
          <div className="settings-section">
            <div className="settings-section-title">👤 User Profile</div>
            
            {useAppStore.getState().userProfile ? (
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Account</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{useAppStore.getState().userProfile?.email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Available Credits</span>
                  <span style={{ 
                    color: 'var(--color-success)', 
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {useAppStore.getState().userProfile?.credits?.toLocaleString() || 0} tokens
                  </span>
                </div>
              </div>
            ) : null}

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '10px' }}
              onClick={() => {
                useAppStore.getState().logout();
                setShowSettings(false);
              }}
            >
              Log Out
            </button>
          </div>

          {/* AI Provider */}
          <div className="settings-section">
            <div className="settings-section-title">🧠 AI Configuration</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Requests are processed securely via Reagen Cloud.
            </div>

            <div className="settings-field">
              <label className="settings-label">Model</label>
              <select
                className="settings-select"
                value={settings.llmModel}
                onChange={(e) => updateSettings('llmModel', e.target.value)}
              >
                {providerModels['gemini'].map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Editor Settings */}
          <div className="settings-section">
            <div className="settings-section-title">✏️ Editor</div>

            <div className="settings-field">
              <label className="settings-label">Font Size</label>
              <input
                className="settings-input"
                type="number"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSettings('fontSize', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* About */}
          <div className="settings-section">
            <div className="settings-section-title">ℹ️ About</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Reagen AI</strong> v1.0.0<br />
              Multi-Agent AI Coding IDE<br />
              <span style={{ color: 'var(--text-muted)' }}>
                Powered by intelligent agents for code generation, review, testing, and more.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
