import { create } from 'zustand';

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI: any;
  }
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  extension: string;
  children?: FileEntry[];
  isExpanded?: boolean;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agent?: string;
  isStreaming?: boolean;
}

export interface AgentStatus {
  agent: string;
  status: 'thinking' | 'working' | 'reviewing' | 'complete' | 'error';
  message?: string;
}

export type SidebarView = 'explorer' | 'search' | 'git' | 'docker' | 'chat';
export type BottomView = 'terminal' | 'output' | 'problems';

export interface UserProfile {
  name: string;
  email: string;
  credits: number;
}

interface AppState {
  // Auth
  authToken: string | null;
  userProfile: UserProfile | null;
  setAuth: (token: string, profile: UserProfile) => void;
  logout: () => void;

  // Project
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;

  // Files
  fileTree: FileEntry[];
  setFileTree: (tree: FileEntry[]) => void;
  toggleFolder: (path: string) => void;

  // Open files / tabs
  openFiles: OpenFile[];
  activeFile: string | null;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;

  // Sidebar
  sidebarView: SidebarView;
  setSidebarView: (view: SidebarView) => void;
  sidebarVisible: boolean;
  toggleSidebar: () => void;

  // Bottom panel
  bottomView: BottomView;
  setBottomView: (view: BottomView) => void;
  bottomPanelVisible: boolean;
  toggleBottomPanel: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  clearChat: () => void;
  agentStatus: AgentStatus | null;
  setAgentStatus: (status: AgentStatus | null) => void;
  isChatLoading: boolean;
  setIsChatLoading: (loading: boolean) => void;

  // Settings
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Settings values
  settings: {
    llmProvider: string;
    llmModel: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    geminiApiKey: string;
    ollamaUrl: string;
    ollamaModel: string;
    fontSize: number;
    theme: string;
  };
  updateSettings: (key: string, value: any) => void;
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rb': 'ruby',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.ps1': 'powershell',
    '.dockerfile': 'dockerfile',
    '.toml': 'toml',
    '.ini': 'ini',
    '.env': 'plaintext',
    '.txt': 'plaintext',
    '.svg': 'xml',
    '.vue': 'html',
    '.svelte': 'html',
    '.dart': 'dart',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.r': 'r',
    '.lua': 'lua',
    '.zig': 'zig',
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

function toggleFolderInTree(tree: FileEntry[], targetPath: string): FileEntry[] {
  return tree.map((entry) => {
    if (entry.path === targetPath) {
      return { ...entry, isExpanded: !entry.isExpanded };
    }
    if (entry.children) {
      return { ...entry, children: toggleFolderInTree(entry.children, targetPath) };
    }
    return entry;
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  authToken: localStorage.getItem('reagen_auth_token'),
  userProfile: JSON.parse(localStorage.getItem('reagen_user_profile') || 'null'),
  setAuth: (token, profile) => {
    localStorage.setItem('reagen_auth_token', token);
    localStorage.setItem('reagen_user_profile', JSON.stringify(profile));
    set({ authToken: token, userProfile: profile });
  },
  logout: () => {
    localStorage.removeItem('reagen_auth_token');
    localStorage.removeItem('reagen_user_profile');
    set({ authToken: null, userProfile: null });
  },

  // Project
  projectPath: null,
  setProjectPath: (path) => set({ projectPath: path }),

  // Files
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  toggleFolder: (path) =>
    set((state) => ({
      fileTree: toggleFolderInTree(state.fileTree, path),
    })),

  // Open files
  openFiles: [],
  activeFile: null,
  openFile: (file) =>
    set((state) => {
      const exists = state.openFiles.find((f) => f.path === file.path);
      if (exists) {
        return { activeFile: file.path };
      }
      return {
        openFiles: [...state.openFiles, file],
        activeFile: file.path,
      };
    }),
  closeFile: (path) =>
    set((state) => {
      const filtered = state.openFiles.filter((f) => f.path !== path);
      let activeFile = state.activeFile;
      if (activeFile === path) {
        activeFile = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
      }
      return { openFiles: filtered, activeFile };
    }),
  setActiveFile: (path) => set({ activeFile: path }),
  updateFileContent: (path, content) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, content, isModified: true } : f
      ),
    })),
  markFileSaved: (path) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, isModified: false } : f
      ),
    })),

  // Sidebar
  sidebarView: 'explorer',
  setSidebarView: (view) => set({ sidebarView: view, sidebarVisible: true }),
  sidebarVisible: true,
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  // Bottom panel
  bottomView: 'terminal',
  setBottomView: (view) => set({ bottomView: view }),
  bottomPanelVisible: true,
  toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),

  // Chat
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.chatMessages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + content };
      }
      return { chatMessages: msgs };
    }),
  clearChat: () => set({ chatMessages: [] }),
  agentStatus: null,
  setAgentStatus: (status) => set({ agentStatus: status }),
  isChatLoading: false,
  setIsChatLoading: (loading) => set({ isChatLoading: loading }),

  // Settings
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  settings: {
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    openaiApiKey: '',
    anthropicApiKey: '',
    geminiApiKey: '',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    fontSize: 14,
    theme: 'dark',
  },
  updateSettings: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    })),
}));

export { getLanguageFromExtension };
