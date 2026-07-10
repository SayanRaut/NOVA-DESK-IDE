import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agent?: string;
  actions?: any[];
}

interface ProjectMemory {
  projectPath: string;
  summary: string;
  keyFiles: string[];
  techStack: string[];
  lastAccessed: number;
}

export class MemoryStore {
  private dbPath: string;
  private conversations: ConversationEntry[] = [];
  private projectMemories: Map<string, ProjectMemory> = new Map();

  constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.dbPath = path.join(userDataPath, 'reagen-data');

    // Ensure directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    this.loadData();
  }

  // ─── Conversation History ──────────────────────────

  addMessage(entry: ConversationEntry): void {
    this.conversations.push(entry);
    this.saveConversations();
  }

  getConversationHistory(limit: number = 100): ConversationEntry[] {
    return this.conversations.slice(-limit);
  }

  getRecentContext(limit: number = 20): ConversationEntry[] {
    return this.conversations.slice(-limit);
  }

  clearHistory(): void {
    this.conversations = [];
    this.saveConversations();
  }

  // ─── Project Memory ───────────────────────────────

  setProjectMemory(memory: ProjectMemory): void {
    this.projectMemories.set(memory.projectPath, {
      ...memory,
      lastAccessed: Date.now(),
    });
    this.saveProjectMemories();
  }

  getProjectMemory(projectPath: string): ProjectMemory | undefined {
    return this.projectMemories.get(projectPath);
  }

  // ─── Summarization ────────────────────────────────

  getConversationSummary(): string {
    if (this.conversations.length === 0) return 'No previous conversation.';

    const recent = this.conversations.slice(-10);
    return recent
      .map((c) => `[${c.role}${c.agent ? ` (${c.agent})` : ''}]: ${c.content.substring(0, 200)}`)
      .join('\n');
  }

  // ─── Persistence ──────────────────────────────────

  private loadData(): void {
    try {
      const convPath = path.join(this.dbPath, 'conversations.json');
      if (fs.existsSync(convPath)) {
        this.conversations = JSON.parse(fs.readFileSync(convPath, 'utf-8'));
      }

      const memPath = path.join(this.dbPath, 'project-memories.json');
      if (fs.existsSync(memPath)) {
        const data = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
        this.projectMemories = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load memory data:', error);
    }
  }

  private saveConversations(): void {
    try {
      const convPath = path.join(this.dbPath, 'conversations.json');
      fs.writeFileSync(convPath, JSON.stringify(this.conversations, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }

  private saveProjectMemories(): void {
    try {
      const memPath = path.join(this.dbPath, 'project-memories.json');
      const data = Object.fromEntries(this.projectMemories);
      fs.writeFileSync(memPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save project memories:', error);
    }
  }
}
