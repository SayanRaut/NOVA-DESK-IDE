import { ipcMain, BrowserWindow } from 'electron';
import { Orchestrator } from '../agents/orchestrator';
import { MemoryStore } from '../services/memoryStore';
import { ConfigStore } from '../services/configStore';

let orchestrator: Orchestrator | null = null;
let memoryStore: MemoryStore | null = null;

export function registerAIHandlers(mainWindow: BrowserWindow): void {
  // Initialize stores
  memoryStore = new MemoryStore();
  const configStore = new ConfigStore();

  // Initialize orchestrator
  orchestrator = new Orchestrator(mainWindow, memoryStore, configStore);

  // Send message to AI
  ipcMain.handle('ai:sendMessage', async (_, message: string, context?: any) => {
    if (!orchestrator) throw new Error('AI system not initialized');

    try {
      await orchestrator.processMessage(message, context);
    } catch (error: any) {
      mainWindow.webContents.send('ai:response', {
        id: Date.now().toString(),
        content: `❌ Error: ${error.message}`,
        agent: 'system',
        isComplete: true,
      });
    }
  });

  // Cancel current request
  ipcMain.on('ai:cancel', () => {
    if (orchestrator) {
      orchestrator.cancel();
    }
  });

  // Get conversation history
  ipcMain.handle('ai:getHistory', async () => {
    if (!memoryStore) return [];
    return memoryStore.getConversationHistory();
  });

  // Clear history
  ipcMain.handle('ai:clearHistory', async () => {
    if (memoryStore) {
      memoryStore.clearHistory();
    }
  });

  // Set Auth Token
  ipcMain.on('ai:setToken', (_, token: string | null) => {
    configStore.set('authToken', token);
  });
}
