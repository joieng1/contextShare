import { create } from 'zustand';
import { DirectoryItem } from '../types'; // Assuming types.ts is in src/renderer

// --- Zustand Store: State and Actions ---
export interface AppState {
  currentView: 'files' | 'prompts';
  selectedFolder: string | null;
  directoryStructure: DirectoryItem[] | null;
  compiledContent: string;
  copyButtonText: string;
  saveButtonText: string;
  isLoading: boolean;
  error: string | null;
  selectionVersion: number; // Trigger re-renders for selection changes in the tree
}

export interface AppActions {
  setCurrentView: (view: 'files' | 'prompts') => void;
  setSelectedFolder: (folder: string | null) => void;
  setDirectoryStructure: (structure: DirectoryItem[] | null) => void;
  setCompiledContent: (content: string) => void;
  setCopyButtonText: (text: string) => void;
  setSaveButtonText: (text: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  bumpSelectionVersion: () => void;
  resetSession: () => void;
}

const initialState: AppState = {
  currentView: 'files',
  selectedFolder: null,
  directoryStructure: null,
  compiledContent: '',
  copyButtonText: 'Copy to Clipboard',
  saveButtonText: 'Save to File',
  isLoading: false,
  error: null,
  selectionVersion: 0,
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,
  setCurrentView: (payload) => set({ currentView: payload }),
  setSelectedFolder: (payload) => set({ selectedFolder: payload }),
  setDirectoryStructure: (payload) => set({ directoryStructure: payload }),
  setCompiledContent: (payload) => set({ compiledContent: payload }),
  setCopyButtonText: (payload) => set({ copyButtonText: payload }),
  setSaveButtonText: (payload) => set({ saveButtonText: payload }),
  setIsLoading: (payload) => set({ isLoading: payload }),
  setError: (payload) => set({ error: payload }),
  bumpSelectionVersion: () =>
    set((state) => ({ selectionVersion: state.selectionVersion + 1 })),
  resetSession: () =>
    set({
      ...initialState,
    }),
}));
