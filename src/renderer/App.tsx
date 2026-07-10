import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, getLanguageFromExtension } from './store/appStore';
import ActivityBar from './components/Layout/ActivityBar';
import Sidebar from './components/Layout/Sidebar';
import EditorTabs from './components/Editor/EditorTabs';
import CodeEditor from './components/Editor/CodeEditor';
import ChatPanel from './components/Chat/ChatPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import SettingsPanel from './components/Settings/SettingsPanel';

const App: React.FC = () => {
  const {
    projectPath,
    setProjectPath,
    setFileTree,
    openFile,
    activeFile,
    openFiles,
    sidebarVisible,
    bottomPanelVisible,
    bottomView,
    setBottomView,
    showSettings,
    setShowSettings,
    markFileSaved,
    addChatMessage,
    updateLastAssistantMessage,
    setAgentStatus,
    setIsChatLoading,
    authToken,
    setAuth
  } = useAppStore();

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Load file tree when project path changes
  const loadFileTree = useCallback(async (dirPath: string) => {
    if (!window.electronAPI) return;
    try {
      const entries = await window.electronAPI.fs.readDir(dirPath);
      setFileTree(entries);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }, [setFileTree]);

  useEffect(() => {
    if (projectPath) {
      loadFileTree(projectPath);
    }
  }, [projectPath, loadFileTree]);

  // Register Electron IPC listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    if (authToken) {
      window.electronAPI.ai.setAuthToken(authToken);
    } else {
      window.electronAPI.ai.setAuthToken(null);
    }

    window.electronAPI.app.onFolderOpened((path: string) => {
      setProjectPath(path);
    });

    window.electronAPI.app.onSaveFile(() => {
      const state = useAppStore.getState();
      const file = state.openFiles.find((f) => f.path === state.activeFile);
      if (file) {
        window.electronAPI.fs.writeFile(file.path, file.content).then(() => {
          markFileSaved(file.path);
        });
      }
    });

    window.electronAPI.app.onOpenSettings(() => {
      setShowSettings(true);
    });

    // AI response listeners
    window.electronAPI.ai.onStreamChunk((chunk: any) => {
      if (chunk.isComplete) {
        setIsChatLoading(false);
      }
      updateLastAssistantMessage(chunk.content);
    });

    window.electronAPI.ai.onResponse((response: any) => {
      setIsChatLoading(false);
      if (response.isComplete) {
        setAgentStatus(null);
      }
    });

    window.electronAPI.ai.onAgentStatus((status: any) => {
      setAgentStatus(status);
    });
  }, []);

  // Handle file open from explorer
  const handleFileOpen = useCallback(async (filePath: string, fileName: string, extension: string) => {
    if (!window.electronAPI) return;
    try {
      const content = await window.electronAPI.fs.readFile(filePath);
      openFile({
        path: filePath,
        name: fileName,
        content,
        language: getLanguageFromExtension(extension),
        isModified: false,
      });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [openFile]);

  // Handle open folder button
  const handleOpenFolder = useCallback(async () => {
    if (!window.electronAPI) {
      // Development fallback
      setProjectPath('D:\\Projects\\demo-project');
      return;
    }
    try {
      const paths = await window.electronAPI.app.showOpenDialog({
        properties: ['openDirectory'],
      });
      if (paths && paths.length > 0) {
        setProjectPath(paths[0]);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [setProjectPath]);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch('http://localhost:3001/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'developer@example.com',
          name: 'Developer'
        })
      });
      
      if (!res.ok) throw new Error('Login failed');
      
      const data = await res.json();
      setAuth(data.token, data.user);
    } catch (err) {
      console.error('Failed to log in', err);
      alert('Failed to connect to backend. Is the server running?');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!authToken) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🚀</div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Welcome to Reagen AI</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
            Log in to get free credits and start generating code with powerful AI agents.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <span className="spinner" /> : <span>🌐</span>}
            {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '16px' }}>
            * This currently simulates Google OAuth and connects to local backend on port 3001.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Title Bar */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <div className="titlebar-logo">R</div>
          <span className="titlebar-title">REAGEN AI</span>
        </div>
        {projectPath && (
          <span className="titlebar-project">{projectPath}</span>
        )}
      </div>

      {/* Main Body */}
      <div className="app-body">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar onFileOpen={handleFileOpen} onOpenFolder={handleOpenFolder} />
        )}

        {/* Main Content Area */}
        <div className="main-panel">
          {/* Editor Tabs */}
          <EditorTabs />

          {/* Editor + Chat Split */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Code Editor */}
            <div className="editor-area" style={{ flex: 1 }}>
              {currentFile ? (
                <CodeEditor />
              ) : (
                <div className="editor-welcome">
                  <div className="editor-welcome-logo">R</div>
                  <h2>Welcome to Reagen AI</h2>
                  <p>Your AI-powered multi-agent coding IDE. Open a folder to get started, or chat with AI to begin coding.</p>
                  <button className="open-folder-btn" onClick={handleOpenFolder}>
                    📂 Open Folder
                  </button>
                  <div className="welcome-shortcuts">
                    <div className="welcome-shortcut">
                      <kbd>Ctrl+O</kbd> Open Folder
                    </div>
                    <div className="welcome-shortcut">
                      <kbd>Ctrl+S</kbd> Save File
                    </div>
                    <div className="welcome-shortcut">
                      <kbd>Ctrl+,</kbd> Settings
                    </div>
                    <div className="welcome-shortcut">
                      <kbd>Ctrl+`</kbd> Terminal
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel (right side) */}
            <div style={{
              width: '380px',
              borderLeft: '1px solid var(--border-subtle)',
              flexShrink: 0,
              display: 'flex',
            }}>
              <ChatPanel />
            </div>
          </div>

          {/* Bottom Panel */}
          {bottomPanelVisible && (
            <div className="bottom-panel" style={{ height: '220px' }}>
              <div className="bottom-panel-tabs">
                <button
                  className={`bottom-tab ${bottomView === 'terminal' ? 'active' : ''}`}
                  onClick={() => setBottomView('terminal')}
                >
                  Terminal
                </button>
                <button
                  className={`bottom-tab ${bottomView === 'output' ? 'active' : ''}`}
                  onClick={() => setBottomView('output')}
                >
                  Output
                </button>
                <button
                  className={`bottom-tab ${bottomView === 'problems' ? 'active' : ''}`}
                  onClick={() => setBottomView('problems')}
                >
                  Problems
                </button>
              </div>
              <div className="bottom-panel-content">
                {bottomView === 'terminal' && <TerminalPanel />}
                {bottomView === 'output' && (
                  <div className="empty-state">
                    <span className="empty-state-icon">📋</span>
                    <span>No output yet</span>
                  </div>
                )}
                {bottomView === 'problems' && (
                  <div className="empty-state">
                    <span className="empty-state-icon">✅</span>
                    <span>No problems detected</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <div className="statusbar-left">
          <div className="statusbar-item">
            <span className="statusbar-dot connected"></span>
            <span>Reagen AI</span>
          </div>
          {projectPath && (
            <div className="statusbar-item">
              📁 {projectPath.split('\\').pop() || projectPath.split('/').pop()}
            </div>
          )}
        </div>
        <div className="statusbar-right">
          {currentFile && (
            <>
              <div className="statusbar-item">
                {currentFile.language}
              </div>
              <div className="statusbar-item">
                UTF-8
              </div>
            </>
          )}
          <div className="statusbar-item clickable" onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsPanel />}
    </div>
  );
};

export default App;
