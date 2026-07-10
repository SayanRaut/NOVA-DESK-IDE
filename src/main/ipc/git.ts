import { ipcMain } from 'electron';
import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git';

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath);
}

export function registerGitHandlers(): void {
  // Get repository status
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      const status: StatusResult = await git.status();
      return {
        current: status.current,
        tracking: status.tracking,
        staged: status.staged,
        modified: status.modified,
        not_added: status.not_added,
        deleted: status.deleted,
        conflicted: status.conflicted,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch (error: any) {
      throw new Error(`Git status failed: ${error.message}`);
    }
  });

  // Get commit log
  ipcMain.handle('git:log', async (_, repoPath: string, maxCount: number = 50) => {
    try {
      const git = getGit(repoPath);
      const log: LogResult = await git.log({ maxCount });
      return log.all.map((entry) => ({
        hash: entry.hash,
        date: entry.date,
        message: entry.message,
        author_name: entry.author_name,
        author_email: entry.author_email,
      }));
    } catch (error: any) {
      throw new Error(`Git log failed: ${error.message}`);
    }
  });

  // Get diff
  ipcMain.handle('git:diff', async (_, repoPath: string, filePath?: string) => {
    try {
      const git = getGit(repoPath);
      if (filePath) {
        return await git.diff([filePath]);
      }
      return await git.diff();
    } catch (error: any) {
      throw new Error(`Git diff failed: ${error.message}`);
    }
  });

  // Stage files
  ipcMain.handle('git:add', async (_, repoPath: string, files: string[]) => {
    try {
      const git = getGit(repoPath);
      await git.add(files);
    } catch (error: any) {
      throw new Error(`Git add failed: ${error.message}`);
    }
  });

  // Commit
  ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
    try {
      const git = getGit(repoPath);
      const result = await git.commit(message);
      return result.commit;
    } catch (error: any) {
      throw new Error(`Git commit failed: ${error.message}`);
    }
  });

  // Push
  ipcMain.handle('git:push', async (_, repoPath: string, remote?: string, branch?: string) => {
    try {
      const git = getGit(repoPath);
      await git.push(remote || 'origin', branch);
    } catch (error: any) {
      throw new Error(`Git push failed: ${error.message}`);
    }
  });

  // Pull
  ipcMain.handle('git:pull', async (_, repoPath: string, remote?: string, branch?: string) => {
    try {
      const git = getGit(repoPath);
      await git.pull(remote || 'origin', branch);
    } catch (error: any) {
      throw new Error(`Git pull failed: ${error.message}`);
    }
  });

  // Get branches
  ipcMain.handle('git:branch', async (_, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      const branches: BranchSummary = await git.branch();
      return {
        current: branches.current,
        all: branches.all,
        branches: branches.branches,
      };
    } catch (error: any) {
      throw new Error(`Git branch failed: ${error.message}`);
    }
  });

  // Create branch
  ipcMain.handle('git:createBranch', async (_, repoPath: string, branchName: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkoutLocalBranch(branchName);
    } catch (error: any) {
      throw new Error(`Git create branch failed: ${error.message}`);
    }
  });

  // Checkout branch
  ipcMain.handle('git:checkoutBranch', async (_, repoPath: string, branchName: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkout(branchName);
    } catch (error: any) {
      throw new Error(`Git checkout failed: ${error.message}`);
    }
  });

  // Merge branch
  ipcMain.handle('git:merge', async (_, repoPath: string, branchName: string) => {
    try {
      const git = getGit(repoPath);
      await git.merge([branchName]);
    } catch (error: any) {
      throw new Error(`Git merge failed: ${error.message}`);
    }
  });

  // Init repo
  ipcMain.handle('git:init', async (_, repoPath: string) => {
    try {
      const git = getGit(repoPath);
      await git.init();
    } catch (error: any) {
      throw new Error(`Git init failed: ${error.message}`);
    }
  });

  // Clone repo
  ipcMain.handle('git:clone', async (_, url: string, targetPath: string) => {
    try {
      await simpleGit().clone(url, targetPath);
    } catch (error: any) {
      throw new Error(`Git clone failed: ${error.message}`);
    }
  });
}
