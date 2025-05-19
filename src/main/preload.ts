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

  /**
   * Read file content
   * @param {string} filePath - Path to file
   * @returns {Promise<string|Object>} File content as string or error object
   */
  readFile: (filePath: string): Promise<string | { error: string }> =>
    ipcRenderer.invoke('read-file', filePath),

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
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Define a type for the exposed API for use in preload.d.ts
export type ElectronAPI = typeof electronAPI;
