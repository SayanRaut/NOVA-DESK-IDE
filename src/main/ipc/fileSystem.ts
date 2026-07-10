import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const watchers = new Map<string, fs.FSWatcher>();

export function registerFileSystemHandlers(): void {
  // Read directory contents
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const results = await Promise.all(
        entries
          .filter((entry) => !entry.name.startsWith('.') || entry.name === '.gitignore')
          .map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            let stats: fs.Stats | null = null;
            try {
              stats = await fs.promises.stat(fullPath);
            } catch {
              // File might have been deleted
            }
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: stats?.size || 0,
              modified: stats?.mtimeMs || 0,
              extension: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase(),
            };
          })
      );

      // Sort: directories first, then files alphabetically
      results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return results;
    } catch (error: any) {
      throw new Error(`Failed to read directory: ${error.message}`);
    }
  });

  // Read file contents
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  });

  // Write file contents
  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  });

  // Create new file
  ipcMain.handle('fs:createFile', async (_, filePath: string, content?: string) => {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content || '', 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to create file: ${error.message}`);
    }
  });

  // Create directory
  ipcMain.handle('fs:createDir', async (_, dirPath: string) => {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  });

  // Delete file or directory
  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(filePath);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  });

  // Rename file or directory
  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    try {
      await fs.promises.rename(oldPath, newPath);
    } catch (error: any) {
      throw new Error(`Failed to rename: ${error.message}`);
    }
  });

  // Check if file exists
  ipcMain.handle('fs:exists', async (_, filePath: string) => {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // Get file stats
  ipcMain.handle('fs:getStats', async (_, filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtimeMs,
        modified: stats.mtimeMs,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  });

  // Watch directory for changes
  ipcMain.on('fs:watchDir', (event, dirPath: string) => {
    if (watchers.has(dirPath)) return;

    try {
      const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          event.sender.send('fs:change', {
            type: eventType,
            path: path.join(dirPath, filename),
            filename,
          });
        }
      });

      watchers.set(dirPath, watcher);
    } catch (error: any) {
      console.error(`Failed to watch directory: ${error.message}`);
    }
  });

  // Stop watching directory
  ipcMain.on('fs:unwatchDir', (_, dirPath: string) => {
    const watcher = watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      watchers.delete(dirPath);
    }
  });
}
