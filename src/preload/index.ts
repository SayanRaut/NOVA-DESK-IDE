import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the API exposed to renderer
export interface ElectronAPI {
  // File System
  fs: {
    readDir: (dirPath: string) => Promise<FileEntry[]>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    createFile: (filePath: string, content?: string) => Promise<void>;
    createDir: (dirPath: string) => Promise<void>;
    deleteFile: (filePath: string) => Promise<void>;
    rename: (oldPath: string, newPath: string) => Promise<void>;
    exists: (filePath: string) => Promise<boolean>;
    getStats: (filePath: string) => Promise<FileStats>;
    watchDir: (dirPath: string) => void;
    unwatchDir: (dirPath: string) => void;
  };

  // Terminal
  terminal: {
    create: (id: string, shell?: string, cwd?: string) => Promise<void>;
    write: (id: string, data: string) => void;
    resize: (id: string, cols: number, rows: number) => void;
    kill: (id: string) => void;
    onData: (callback: (id: string, data: string) => void) => void;
    onExit: (callback: (id: string, exitCode: number) => void) => void;
  };

  // Git
  git: {
    status: (repoPath: string) => Promise<GitStatus>;
    log: (repoPath: string, maxCount?: number) => Promise<GitLogEntry[]>;
    diff: (repoPath: string, filePath?: string) => Promise<string>;
    add: (repoPath: string, files: string[]) => Promise<void>;
    commit: (repoPath: string, message: string) => Promise<string>;
    push: (repoPath: string, remote?: string, branch?: string) => Promise<void>;
    pull: (repoPath: string, remote?: string, branch?: string) => Promise<void>;
    branch: (repoPath: string) => Promise<GitBranchInfo>;
    createBranch: (repoPath: string, branchName: string) => Promise<void>;
    checkoutBranch: (repoPath: string, branchName: string) => Promise<void>;
    merge: (repoPath: string, branchName: string) => Promise<void>;
    init: (repoPath: string) => Promise<void>;
    clone: (url: string, targetPath: string) => Promise<void>;
  };

  // Docker
  docker: {
    listContainers: () => Promise<DockerContainer[]>;
    listImages: () => Promise<DockerImage[]>;
    buildImage: (dockerfilePath: string, tag: string) => Promise<void>;
    runContainer: (image: string, options?: DockerRunOptions) => Promise<string>;
    stopContainer: (containerId: string) => Promise<void>;
    removeContainer: (containerId: string) => Promise<void>;
    containerLogs: (containerId: string) => Promise<string>;
  };

  // AI Agent
  ai: {
    sendMessage: (message: string, context?: AIContext) => Promise<void>;
    onResponse: (callback: (response: AIResponse) => void) => void;
    onAgentStatus: (callback: (status: AgentStatusUpdate) => void) => void;
    onStreamChunk: (callback: (chunk: StreamChunk) => void) => void;
    cancelRequest: () => void;
    getConversationHistory: () => Promise<ConversationMessage[]>;
    clearHistory: () => Promise<void>;
    setAuthToken: (token: string | null) => void;
  };

  // App
  app: {
    getVersion: () => string;
    openExternal: (url: string) => void;
    showOpenDialog: (options: OpenDialogOptions) => Promise<string[]>;
    onFolderOpened: (callback: (path: string) => void) => void;
    onFileOpened: (callback: (path: string) => void) => void;
    onSaveFile: (callback: () => void) => void;
    onOpenSettings: (callback: () => void) => void;
    getPlatform: () => string;
  };
}

// Type interfaces
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  extension: string;
}

export interface FileStats {
  size: number;
  created: number;
  modified: number;
  isDirectory: boolean;
  isFile: boolean;
}

export interface GitStatus {
  current: string | null;
  tracking: string | null;
  staged: string[];
  modified: string[];
  not_added: string[];
  deleted: string[];
  conflicted: string[];
  ahead: number;
  behind: number;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export interface GitBranchInfo {
  current: string;
  all: string[];
  branches: Record<string, { current: boolean; name: string }>;
}

export interface DockerContainer {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  ports: string[];
}

export interface DockerImage {
  id: string;
  tags: string[];
  size: number;
  created: number;
}

export interface DockerRunOptions {
  name?: string;
  ports?: Record<string, string>;
  env?: string[];
  volumes?: string[];
  detach?: boolean;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
}

export interface AIContext {
  currentFile?: string;
  currentFileContent?: string;
  selectedText?: string;
  openFiles?: string[];
  projectPath?: string;
  language?: string;
}

export interface AIResponse {
  id: string;
  content: string;
  agent: string;
  actions?: AIAction[];
  isComplete: boolean;
}

export interface StreamChunk {
  id: string;
  content: string;
  agent: string;
  isComplete: boolean;
}

export interface AgentStatusUpdate {
  agent: string;
  status: 'thinking' | 'working' | 'reviewing' | 'complete' | 'error';
  message?: string;
}

export interface AIAction {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'run_command' | 'open_file';
  filePath?: string;
  content?: string;
  command?: string;
  description: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agent?: string;
  actions?: AIAction[];
}

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // File System
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath: string, content?: string) => ipcRenderer.invoke('fs:createFile', filePath, content),
    createDir: (dirPath: string) => ipcRenderer.invoke('fs:createDir', dirPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
    getStats: (filePath: string) => ipcRenderer.invoke('fs:getStats', filePath),
    watchDir: (dirPath: string) => ipcRenderer.send('fs:watchDir', dirPath),
    unwatchDir: (dirPath: string) => ipcRenderer.send('fs:unwatchDir', dirPath),
  },

  // Terminal
  terminal: {
    create: (id: string, shell?: string, cwd?: string) => ipcRenderer.invoke('terminal:create', id, shell, cwd),
    write: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('terminal:kill', id),
    onData: (callback: (id: string, data: string) => void) => {
      ipcRenderer.on('terminal:data', (_, id, data) => callback(id, data));
    },
    onExit: (callback: (id: string, exitCode: number) => void) => {
      ipcRenderer.on('terminal:exit', (_, id, exitCode) => callback(id, exitCode));
    },
  },

  // Git
  git: {
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    log: (repoPath: string, maxCount?: number) => ipcRenderer.invoke('git:log', repoPath, maxCount),
    diff: (repoPath: string, filePath?: string) => ipcRenderer.invoke('git:diff', repoPath, filePath),
    add: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:add', repoPath, files),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    push: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:push', repoPath, remote, branch),
    pull: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:pull', repoPath, remote, branch),
    branch: (repoPath: string) => ipcRenderer.invoke('git:branch', repoPath),
    createBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:createBranch', repoPath, branchName),
    checkoutBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:checkoutBranch', repoPath, branchName),
    merge: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:merge', repoPath, branchName),
    init: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),
    clone: (url: string, targetPath: string) => ipcRenderer.invoke('git:clone', url, targetPath),
  },

  // Docker
  docker: {
    listContainers: () => ipcRenderer.invoke('docker:listContainers'),
    listImages: () => ipcRenderer.invoke('docker:listImages'),
    buildImage: (dockerfilePath: string, tag: string) => ipcRenderer.invoke('docker:buildImage', dockerfilePath, tag),
    runContainer: (image: string, options?: DockerRunOptions) => ipcRenderer.invoke('docker:runContainer', image, options),
    stopContainer: (containerId: string) => ipcRenderer.invoke('docker:stopContainer', containerId),
    removeContainer: (containerId: string) => ipcRenderer.invoke('docker:removeContainer', containerId),
    containerLogs: (containerId: string) => ipcRenderer.invoke('docker:containerLogs', containerId),
  },

  // AI
  ai: {
    sendMessage: (message: string, context?: AIContext) => ipcRenderer.invoke('ai:sendMessage', message, context),
    onResponse: (callback: (response: AIResponse) => void) => {
      ipcRenderer.on('ai:response', (_, response) => callback(response));
    },
    onAgentStatus: (callback: (status: AgentStatusUpdate) => void) => {
      ipcRenderer.on('ai:agentStatus', (_, status) => callback(status));
    },
    onStreamChunk: (callback: (chunk: StreamChunk) => void) => {
      ipcRenderer.on('ai:streamChunk', (_, chunk) => callback(chunk));
    },
    cancelRequest: () => ipcRenderer.send('ai:cancel'),
    getConversationHistory: () => ipcRenderer.invoke('ai:getHistory'),
    clearHistory: () => ipcRenderer.invoke('ai:clearHistory'),
    setAuthToken: (token: string | null) => ipcRenderer.send('ai:setToken', token),
  },

  // App
  app: {
    getVersion: () => '1.0.0',
    openExternal: (url: string) => ipcRenderer.send('app:openExternal', url),
    showOpenDialog: (options: OpenDialogOptions) => ipcRenderer.invoke('app:showOpenDialog', options),
    onFolderOpened: (callback: (path: string) => void) => {
      ipcRenderer.on('folder-opened', (_, path) => callback(path));
    },
    onFileOpened: (callback: (path: string) => void) => {
      ipcRenderer.on('file-opened', (_, path) => callback(path));
    },
    onSaveFile: (callback: () => void) => {
      ipcRenderer.on('save-file', () => callback());
    },
    onOpenSettings: (callback: () => void) => {
      ipcRenderer.on('open-settings', () => callback());
    },
    getPlatform: () => process.platform,
  },
} as ElectronAPI);
