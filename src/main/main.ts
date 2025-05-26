/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';
import { Prompt } from '../renderer/types';
import { resolveHtmlPath } from './util';

// Store initialization
let store: any = null;

/**
 * Initialize electron-store asynchronously
 */
async function initializeStore() {
  try {
    const StoreModule = await import('electron-store');
    const Store = StoreModule.default;
    store = new Store({
      defaults: {
        prompts: [],
      },
    });
    console.log('[Main Process] Electron-store initialized. Path:', store.path);
    return store;
  } catch (err) {
    console.error('Failed to load electron-store', err);
    throw err;
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

// Interface for directory structure items
interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryItem[];
}

/**
 * Recursively gets directory structure for file tree building
 * @param {string} dirPath - Path to directory
 * @returns {Promise<DirectoryItem[]>} Directory structure as nested objects
 */
async function getDirectoryStructure(
  dirPath: string,
): Promise<DirectoryItem[]> {
  const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

  const structurePromises = items.map(
    async (item): Promise<DirectoryItem | null> => {
      // Skip node_modules directories
      if (item.name === 'node_modules' && item.isDirectory()) {
        return null;
      }

      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const children = await getDirectoryStructure(itemPath);
        return {
          name: item.name,
          path: itemPath,
          type: 'directory',
          children,
        };
      }
      return {
        name: item.name,
        path: itemPath,
        type: 'file',
      };
    },
  );

  const structure = (await Promise.all(structurePromises)).filter(
    (item) => item !== null,
  ) as DirectoryItem[];
  return structure;
}

/**
 * Configure IPC communication between renderer and main processes
 */
function setupIpcHandlers() {
  // Handle folder selection dialog
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Get directory structure from selected folder
  ipcMain.handle(
    'get-directory-structure',
    async (event, folderPath: string) => {
      if (!folderPath || typeof folderPath !== 'string') {
        throw new Error('Invalid folder path provided.');
      }
      try {
        const structure = await getDirectoryStructure(folderPath);
        return structure;
      } catch (error: any) {
        console.error('Error getting directory structure:', error);
        throw new Error(error.message || 'Failed to get directory structure.');
      }
    },
  );

  // Save compiled content to a file
  ipcMain.handle('save-compiled', async (event, content: string) => {
    if (typeof content !== 'string') {
      throw new Error('Invalid content provided.');
    }
    const result = await dialog.showSaveDialog({
      title: 'Save Compiled Output',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) return { success: false };

    try {
      await fs.promises.writeFile(result.filePath, content);
      return { success: true, filePath: result.filePath };
    } catch (error: any) {
      console.error('Error saving file:', error);
      throw new Error(error.message || 'Failed to save file.');
    }
  });

  // IPC handler for compiling files in a worker thread
  ipcMain.handle(
    'compile-files-worker',
    async (event, { files, root }: { files: string[]; root: string }) => {
      return new Promise((resolve, reject) => {
        // Ensure the worker path is correct, especially for packaged apps
        const workerPath =
          process.env.NODE_ENV === 'development'
            ? path.join(__dirname, 'compileWorker.bundle.dev.js') // Adjusted path for dev
            : path.join(__dirname, 'compileWorker.js'); // Adjusted path for prod

        const worker = new Worker(workerPath, {
          workerData: { files, root }, // Pass data to worker if needed immediately
        });

        worker.postMessage({ files, root });

        worker.on('message', async (message) => {
          if (message.error) {
            console.error('[Worker Error]', message.error);
            reject(new Error(message.error));
          } else {
            resolve({ compiledText: message.compiledText });
          }
          // Terminate worker
          try {
            await worker.terminate();
          } catch (err) {
            console.error('Failed to terminate worker', err);
          }
        });

        worker.on('error', async (err) => {
          console.error('[Worker Initialization Error]', err);
          reject(new Error(err.message));
          // Terminate worker
          try {
            await worker.terminate();
          } catch (termErr) {
            console.error('Failed to terminate worker after error', termErr);
          }
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(
              `[Worker Exit] Worker stopped with exit code ${code}`,
            );
          }
        });
      });
    },
  );

  ipcMain.handle('get-prompts', async () => {
    console.log("[IPC Main] Received 'get-prompts' request.");
    try {
      if (!store) {
        throw new Error('Store not initialized');
      }
      const prompts = store.get('prompts', []);
      return prompts;
    } catch (error: any) {
      console.error("[IPC Main] Error in 'get-prompts':", error);
      throw new Error(error.message || 'Failed to get prompts.');
    }
  });

  ipcMain.handle('save-prompt', async (event, promptData: Partial<Prompt>) => {
    console.log(
      "[IPC Main] Received 'save-prompt' request with data:",
      promptData,
    );
    try {
      if (!store) {
        throw new Error('Store not initialized');
      }
      const currentPrompts: Prompt[] = store.get('prompts', []);
      const now = new Date().toISOString();
      let savedPrompt: Prompt;

      if (promptData.id) {
        // Update existing prompt
        const index = currentPrompts.findIndex((p) => p.id === promptData.id);
        if (index !== -1) {
          currentPrompts[index] = {
            ...currentPrompts[index],
            ...promptData,
            name: promptData.name!,
            content: promptData.content!,
            updatedAt: now,
          };
          savedPrompt = currentPrompts[index];
          console.log('[IPC Main] Updated prompt with ID:', promptData.id);
        } else {
          console.error(
            '[IPC Main] Prompt ID not found for update:',
            promptData.id,
          );
          throw new Error('Prompt ID not found for update.');
        }
      } else {
        // Create new prompt
        const newPrompt: Prompt = {
          id: uuidv4(),
          name: promptData.name!,
          content: promptData.content!,
          createdAt: now,
          updatedAt: now,
        };
        currentPrompts.push(newPrompt);
        savedPrompt = newPrompt;
        console.log('[IPC Main] Created new prompt with ID:', newPrompt.id);
      }

      store.set('prompts', currentPrompts);
      return savedPrompt;
    } catch (error: any) {
      console.error("[IPC Main] Error in 'save-prompt':", error);
      throw new Error(error.message || 'Failed to save prompt.');
    }
  });

  ipcMain.handle('delete-prompt', async (event, promptId: string) => {
    console.log(
      "[IPC Main] Received 'delete-prompt' request for ID:",
      promptId,
    );
    try {
      if (!store) {
        throw new Error('Store not initialized');
      }
      const currentPrompts: Prompt[] = store.get('prompts', []);
      const originalLength = currentPrompts.length;
      const updatedPrompts = currentPrompts.filter((p) => p.id !== promptId);
      if (originalLength === updatedPrompts.length) {
        console.warn('[IPC Main] Prompt ID not found for deletion:', promptId);
        throw new Error('Prompt ID not found for deletion.');
      }
      store.set('prompts', updatedPrompts);
      console.log('[IPC Main] Deleted prompt with ID:', promptId);
      return { promptId };
    } catch (error: any) {
      console.error("[IPC Main] Error in 'delete-prompt':", error);
      throw new Error(error.message || 'Failed to delete prompt.');
    }
  });
}

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      // Explicitly set nodeIntegration and contextIsolation for clarity
      nodeIntegration: false,
      contextIsolation: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    // Initialize store first
    await initializeStore();

    createWindow();
    setupIpcHandlers(); // Setup IPC handlers after store and window creation
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
