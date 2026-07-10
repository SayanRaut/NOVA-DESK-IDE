import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';

const ChatPanel: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    agentStatus,
    isChatLoading,
    setIsChatLoading,
    projectPath,
    activeFile,
    openFiles,
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, agentStatus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || isChatLoading) return;

    setInput('');
    setIsChatLoading(true);

    // Add user message
    addChatMessage({
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Add placeholder assistant message for streaming
    addChatMessage({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    // Send to AI via Electron IPC
    if (window.electronAPI) {
      const currentFile = openFiles.find((f) => f.path === activeFile);
      try {
        await window.electronAPI.ai.sendMessage(message, {
          projectPath,
          currentFile: activeFile,
          currentFileContent: currentFile?.content,
          language: currentFile?.language,
          openFiles: openFiles.map((f) => f.path),
        });
      } catch (error: any) {
        addChatMessage({
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `❌ Error: ${error.message}`,
          timestamp: Date.now(),
          agent: 'system',
        });
        setIsChatLoading(false);
      }
    } else {
      // Development fallback
      setTimeout(() => {
        const store = useAppStore.getState();
        const msgs = [...store.chatMessages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content: `I received your message: "${message}"\n\nTo use AI features, please:\n1. Configure your API key in Settings (Ctrl+,)\n2. Choose your preferred LLM provider\n3. The AI agents will then be fully functional!\n\n🧠 **Available Agents:**\n- 📝 Coder - Write & edit code\n- 🔍 Reviewer - Review code quality\n- 🧪 Tester - Run & fix tests\n- 🔀 Git - Manage source control\n- 💻 Terminal - Run commands\n- 📚 Docs - Generate documentation`,
            isStreaming: false,
          };
          useAppStore.setState({ chatMessages: msgs });
        }
        setIsChatLoading(false);
      }, 1000);
    }
  }, [input, isChatLoading, projectPath, activeFile, openFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <div className="chat-header-dot" />
          AI Assistant
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => useAppStore.getState().clearChat()}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🧠</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Ask me anything
            </div>
            <div className="text-xs text-secondary" style={{ maxWidth: '280px', lineHeight: 1.6 }}>
              Chat about your codebase, generate code, run commands, manage Git, and more.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', width: '100%', maxWidth: '300px' }}>
              {[
                '💡 "Explain this code"',
                '🛠️ "Add error handling to this function"',
                '🧪 "Write tests for this module"',
                '🔀 "Commit my changes"',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => {
                    setInput(suggestion.replace(/^[^\s]+\s"/, '').replace(/"$/, ''));
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className="chat-message">
            <div className={`chat-avatar ${msg.role}`}>
              {msg.role === 'user' ? 'U' : 'R'}
            </div>
            <div className="chat-bubble">
              <div className="chat-bubble-header">
                <span className="chat-bubble-name">
                  {msg.role === 'user' ? 'You' : 'Reagen AI'}
                </span>
                {msg.agent && (
                  <span className="chat-bubble-agent">{msg.agent}</span>
                )}
                <span className="chat-bubble-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="chat-bubble-content">
                {msg.content || (msg.isStreaming && (
                  <span style={{ display: 'inline-flex', gap: '4px' }}>
                    <span className="spinner" />
                    <span className="text-xs text-secondary">Thinking...</span>
                  </span>
                ))}
                {msg.content && renderMarkdown(msg.content)}
              </div>
            </div>
          </div>
        ))}

        {/* Agent status */}
        {agentStatus && (
          <div className="agent-status">
            <span className={`agent-status-dot ${agentStatus.status}`} />
            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{agentStatus.agent}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{agentStatus.message}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Ask Reagen AI anything... (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple markdown renderer
function renderMarkdown(content: string): React.ReactNode {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n');
      return (
        <pre key={i}>
          {lang && (
            <div style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Simple inline formatting
    return (
      <span key={i}>
        {part.split('\n').map((line, j) => {
          // Bold
          let formatted: React.ReactNode = line.replace(/\*\*(.*?)\*\*/g, '⟨b⟩$1⟨/b⟩');
          if (typeof formatted === 'string') {
            const boldParts = formatted.split(/(⟨b⟩.*?⟨\/b⟩)/g);
            formatted = boldParts.map((bp, k) => {
              if (bp.startsWith('⟨b⟩')) {
                return <strong key={k}>{bp.replace(/⟨\/?b⟩/g, '')}</strong>;
              }
              // Inline code
              const codeParts = bp.split(/(`[^`]+`)/g);
              return codeParts.map((cp, l) => {
                if (cp.startsWith('`') && cp.endsWith('`')) {
                  return <code key={l}>{cp.slice(1, -1)}</code>;
                }
                return cp;
              });
            });
          }

          return (
            <React.Fragment key={j}>
              {formatted}
              {j < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </span>
    );
  });
}

export default ChatPanel;
