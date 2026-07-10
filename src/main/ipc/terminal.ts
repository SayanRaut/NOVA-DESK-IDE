import { ipcMain, BrowserWindow } from 'electron';
import * as os from 'os';

// We use a dynamic import pattern for node-pty since it's a native module
let pty: any = null;
try {
  pty = require('node-pty');
} catch (e) {
  console.warn('node-pty not available, terminal will be limited:', e);
}

const terminals = new Map<string, any>();

export function registerTerminalHandlers(mainWindow: BrowserWindow): void {
  // Create a new terminal
  ipcMain.handle('terminal:create', async (_, id: string, shell?: string, cwd?: string) => {
    if (terminals.has(id)) {
      return; // Already exists
    }

    const defaultShell =
      shell ||
      (process.platform === 'win32'
        ? 'powershell.exe'
        : process.env.SHELL || '/bin/bash');

    const defaultCwd = cwd || os.homedir();

    if (!pty) {
      // Fallback: send error message to renderer
      mainWindow.webContents.send(
        'terminal:data',
        id,
        '\r\n⚠ Terminal not available. node-pty module not found.\r\n' +
        'Run "npm rebuild node-pty" to fix this.\r\n'
      );
      return;
    }

    try {
      const ptyProcess = pty.spawn(defaultShell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: defaultCwd,
        env: {
          ...process.env,
          COLORTERM: 'truecolor',
          TERM: 'xterm-256color',
        },
      });

      ptyProcess.onData((data: string) => {
        mainWindow.webContents.send('terminal:data', id, data);
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        terminals.delete(id);
        mainWindow.webContents.send('terminal:exit', id, exitCode);
      });

      terminals.set(id, ptyProcess);
    } catch (error: any) {
      mainWindow.webContents.send(
        'terminal:data',
        id,
        `\r\n⚠ Failed to create terminal: ${error.message}\r\n`
      );
    }
  });

  // Write data to terminal
  ipcMain.on('terminal:write', (_, id: string, data: string) => {
    const term = terminals.get(id);
    if (term) {
      term.write(data);
    }
  });

  // Resize terminal
  ipcMain.on('terminal:resize', (_, id: string, cols: number, rows: number) => {
    const term = terminals.get(id);
    if (term) {
      try {
        term.resize(cols, rows);
      } catch {
        // Ignore resize errors
      }
    }
  });

  // Kill terminal
  ipcMain.on('terminal:kill', (_, id: string) => {
    const term = terminals.get(id);
    if (term) {
      term.kill();
      terminals.delete(id);
    }
  });
}

// Cleanup all terminals on app exit
process.on('exit', () => {
  terminals.forEach((term) => {
    try {
      term.kill();
    } catch {
      // Ignore
    }
  });
  terminals.clear();
});
