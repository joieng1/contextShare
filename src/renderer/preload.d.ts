import { Prompt } from './types'; // Assuming Prompt is in types.ts

// Define the structure for directory items, matching main.ts
interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryItem[];
}

// Define the structure for the API exposed by preload.ts
interface ElectronAPI {
  ipcRenderer: any;
  selectFolder: () => Promise<string | null>;
  getDirectoryStructure: (
    folderPath: string,
  ) => Promise<DirectoryItem[] | { error: string }>; // Return type includes potential error
  // readFile: (filePath: string) => Promise<string | { error: string }>; // Return type includes potential error
  saveCompiledContent: (
    content: string,
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getPrompts: () => Promise<{
    success: boolean;
    data?: Prompt[];
    error?: string;
  }>;
  savePrompt: (
    promptData: Partial<Prompt>,
  ) => Promise<{ success: boolean; data?: Prompt; error?: string }>;
  deletePrompt: (
    promptId: string,
  ) => Promise<{ success: boolean; promptId?: string; error?: string }>;

  // Added for worker-based compilation
  compileFilesWorker: (args: {
    files: string[];
    root: string;
  }) => Promise<{ compiledText?: string; error?: string }>;
}

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Export an empty object to satisfy TypeScript's module requirement if needed
// (This file is primarily for type declarations)
export {};
