import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logPath: string;
  private level: LogLevel;

  constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    const logDir = path.join(userDataPath, 'logs');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    this.logPath = path.join(logDir, `reagen-${date}.log`);
    this.level = 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private write(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${
      args.length > 0 ? JSON.stringify(args) : ''
    }\n`;

    // Console output
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(`[${level.toUpperCase()}] ${message}`, ...args);

    // File output
    try {
      fs.appendFileSync(this.logPath, logLine);
    } catch {
      // Ignore file write errors
    }
  }

  debug(message: string, ...args: any[]): void { this.write('debug', message, ...args); }
  info(message: string, ...args: any[]): void { this.write('info', message, ...args); }
  warn(message: string, ...args: any[]): void { this.write('warn', message, ...args); }
  error(message: string, ...args: any[]): void { this.write('error', message, ...args); }
}

export const logger = new Logger();
