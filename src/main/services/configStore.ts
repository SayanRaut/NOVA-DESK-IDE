import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class ConfigStore {
  private configPath: string;
  private config: Record<string, any> = {};

  constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.configPath = path.join(userDataPath, 'reagen-config.json');
    this.load();
  }

  get(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.config[key] = value;
    this.save();
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }

  delete(key: string): void {
    delete this.config[key];
    this.save();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      } else {
        // Default config
        this.config = {
          llmProvider: 'openai',
          llmModel: 'gpt-4o',
          openaiApiKey: '',
          anthropicApiKey: '',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
          theme: 'dark',
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
          tabSize: 2,
          wordWrap: 'on',
          minimap: true,
          autoSave: true,
          terminalShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
        };
        this.save();
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }
}
