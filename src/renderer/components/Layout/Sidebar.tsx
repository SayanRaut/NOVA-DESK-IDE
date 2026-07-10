import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore, FileEntry } from '../../store/appStore';

interface SidebarProps {
  onFileOpen: (filePath: string, fileName: string, extension: string) => void;
  onOpenFolder: () => void;
}

// File icon based on extension
function getFileIcon(entry: FileEntry): string {
  if (entry.isDirectory) return entry.isExpanded ? '📂' : '📁';
  const ext = entry.extension;
  const iconMap: Record<string, string> = {
    '.ts': '🔷', '.tsx': '⚛️', '.js': '🟨', '.jsx': '⚛️',
    '.py': '🐍', '.rs': '🦀', '.go': '🔵', '.java': '☕',
    '.html': '🌐', '.css': '🎨', '.scss': '🎨', '.json': '📋',
    '.md': '📝', '.yaml': '⚙️', '.yml': '⚙️', '.toml': '⚙️',
    '.sql': '🗃️', '.sh': '🐚', '.ps1': '🐚', '.bat': '🐚',
    '.png': '🖼️', '.jpg': '🖼️', '.svg': '🖼️', '.gif': '🖼️',
    '.gitignore': '🔒', '.env': '🔐', '.dockerfile': '🐳',
    '.lock': '🔒', '.txt': '📄',
  };
  return iconMap[ext] || '📄';
}

const FileTreeItem: React.FC<{
  entry: FileEntry;
  depth: number;
  onFileOpen: (filePath: string, fileName: string, extension: string) => void;
}> = ({ entry, depth, onFileOpen }) => {
  const { toggleFolder, activeFile } = useAppStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (entry.isDirectory) {
      toggleFolder(entry.path);

      if (!entry.isExpanded && children.length === 0) {
        setIsLoading(true);
        try {
          if (window.electronAPI) {
            const entries = await window.electronAPI.fs.readDir(entry.path);
            setChildren(entries);
          }
        } catch (err) {
          console.error('Failed to load directory:', err);
        }
        setIsLoading(false);
      }
    } else {
      onFileOpen(entry.path, entry.name, entry.extension);
    }
  }, [entry, children.length, toggleFolder, onFileOpen]);

  return (
    <>
      <div
        className={`file-tree-item ${activeFile === entry.path ? 'active' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="icon">{getFileIcon(entry)}</span>
        <span className="name">{entry.name}</span>
        {isLoading && <span className="spinner" style={{ marginLeft: 'auto' }} />}
      </div>
      {entry.isDirectory && entry.isExpanded && children.map((child) => (
        <FileTreeItem
          key={child.path}
          entry={child}
          depth={depth + 1}
          onFileOpen={onFileOpen}
        />
      ))}
    </>
  );
};

const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <div className="search-panel">
      <div className="search-input-wrapper">
        <span>🔍</span>
        <input
          className="search-input"
          placeholder="Search files semantically..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query && (
        <div className="search-results" style={{ marginTop: '12px' }}>
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span style={{ fontSize: '14px' }}>🧠</span>
            <span className="text-xs text-secondary">
              Semantic search will be available after indexing your project
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const GitPanel: React.FC = () => {
  const { projectPath } = useAppStore();
  const [commitMsg, setCommitMsg] = useState('');

  return (
    <div className="git-panel">
      <div style={{ marginBottom: '12px' }}>
        <span className="git-branch-badge">🔀 main</span>
      </div>

      <div className="git-section">
        <div className="git-section-title">Staged Changes</div>
        <div className="empty-state" style={{ padding: '8px 0', fontSize: '11px' }}>
          No staged changes
        </div>
      </div>

      <div className="git-section">
        <div className="git-section-title">Changes</div>
        <div className="empty-state" style={{ padding: '8px 0', fontSize: '11px' }}>
          {projectPath ? 'Working tree clean' : 'Open a folder to see changes'}
        </div>
      </div>

      <input
        className="git-commit-input"
        placeholder="Commit message..."
        value={commitMsg}
        onChange={(e) => setCommitMsg(e.target.value)}
      />
      <button className="git-commit-btn" disabled={!commitMsg}>
        ✓ Commit
      </button>
    </div>
  );
};

const DockerPanel: React.FC = () => {
  return (
    <div className="docker-panel">
      <div className="sidebar-header" style={{ paddingLeft: 0, border: 0, height: 'auto', marginBottom: '12px' }}>
        CONTAINERS
      </div>
      <div className="empty-state" style={{ padding: '16px 0' }}>
        <span style={{ fontSize: '24px' }}>🐳</span>
        <span className="text-xs text-secondary">
          No containers running.<br />Docker must be installed.
        </span>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ onFileOpen, onOpenFolder }) => {
  const { sidebarView, fileTree, projectPath } = useAppStore();

  const sidebarTitles: Record<string, string> = {
    explorer: 'Explorer',
    search: 'Search',
    git: 'Source Control',
    docker: 'Docker',
    chat: 'AI Chat',
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">{sidebarTitles[sidebarView]}</div>
      <div className="sidebar-content">
        {sidebarView === 'explorer' && (
          <>
            {fileTree.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <span style={{ fontSize: '28px', opacity: 0.4 }}>📂</span>
                <span className="text-xs text-secondary" style={{ textAlign: 'center' }}>
                  No folder opened
                </span>
                <button
                  className="btn btn-primary"
                  onClick={onOpenFolder}
                  style={{ marginTop: '8px', fontSize: '12px', padding: '6px 16px' }}
                >
                  Open Folder
                </button>
              </div>
            ) : (
              fileTree.map((entry) => (
                <FileTreeItem
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  onFileOpen={onFileOpen}
                />
              ))
            )}
          </>
        )}
        {sidebarView === 'search' && <SearchPanel />}
        {sidebarView === 'git' && <GitPanel />}
        {sidebarView === 'docker' && <DockerPanel />}
        {sidebarView === 'chat' && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
            <span className="text-xs text-secondary">
              Chat is available in the right panel
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
