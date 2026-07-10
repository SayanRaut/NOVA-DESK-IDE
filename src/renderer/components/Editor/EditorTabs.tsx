import React from 'react';
import { useAppStore } from '../../store/appStore';

function getTabIcon(language: string): string {
  const iconMap: Record<string, string> = {
    typescript: '🔷', javascript: '🟨', python: '🐍',
    rust: '🦀', go: '🔵', java: '☕', html: '🌐',
    css: '🎨', json: '📋', markdown: '📝', yaml: '⚙️',
    sql: '🗃️', shell: '🐚', plaintext: '📄',
  };
  return iconMap[language] || '📄';
}

const EditorTabs: React.FC = () => {
  const { openFiles, activeFile, setActiveFile, closeFile } = useAppStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="editor-tabs">
      {openFiles.map((file) => (
        <button
          key={file.path}
          className={`editor-tab ${activeFile === file.path ? 'active' : ''}`}
          onClick={() => setActiveFile(file.path)}
        >
          <span className="tab-icon">{getTabIcon(file.language)}</span>
          <span className="tab-name">
            {file.name}
            {file.isModified && <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>●</span>}
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.path);
            }}
          >
            ✕
          </button>
        </button>
      ))}
    </div>
  );
};

export default EditorTabs;
