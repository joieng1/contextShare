import { contextBridge, ipcRenderer } from 'electron';
import { Prompt } from '../renderer/types'; // Adjust path if necessary

// Define the API structure
const electronAPI = {
  /**
   * Open a dialog to select a folder
   * @returns {Promise<string|null>} Selected folder path or null if canceled
   */
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),

  /**
   * Get directory structure from a folder path
   * @param {string} folderPath - Path to folder
   * @returns {Promise<Object>} Directory structure or error object
   */
  getDirectoryStructure: (folderPath: string): Promise<any> =>
    ipcRenderer.invoke('get-directory-structure', folderPath),

  /*
  readFile: (filePath: string): Promise<string | { error: string }> =>
    ipcRenderer.invoke('read-file', filePath),
  */

  /**
   * Save compiled content to a file
   * @param {string} content - Content to save
   * @returns {Promise<Object>} Result object with success status and optional error/filePath
   */
  saveCompiledContent: (
    content: string,
  ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('save-compiled', content),

  getPrompts: (): Promise<{
    success: boolean;
    data?: Prompt[];
    error?: string;
  }> => ipcRenderer.invoke('get-prompts'),

  savePrompt: (
    promptData: Partial<Prompt>, // ID is optional for new prompts
  ): Promise<{ success: boolean; data?: Prompt; error?: string }> =>
    ipcRenderer.invoke('save-prompt', promptData),

  deletePrompt: (
    promptId: string,
  ): Promise<{ success: boolean; promptId?: string; error?: string }> =>
    ipcRenderer.invoke('delete-prompt', promptId),

  // Added for worker-based compilation
  compileFilesWorker: (args: {
    files: string[];
    root: string;
  }): Promise<{ compiledText?: string; error?: string }> =>
    ipcRenderer.invoke('compile-files-worker', args),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Define a type for the exposed API for use in preload.d.ts
export type ElectronAPI = typeof electronAPI;
