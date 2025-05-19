/* eslint-disable no-console */
import { create } from 'zustand';
import { Prompt } from '../types';

// Constants for clipboard feedback
const COPY_PROMPT_TEXT = 'Copy Prompt';
const COPIED_PROMPT_TEXT = 'Copied!';
const COPY_RESET_DELAY_MS = 1500;

export interface PromptState {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  currentPromptName: string;
  currentPromptContent: string;
  isLoading: boolean;
  error: string | null;
  copyButtonText: string;
}

export interface PromptActions {
  setPrompts: (prompts: Prompt[]) => void;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setCurrentPromptName: (name: string) => void;
  setCurrentPromptContent: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCopyButtonText: (text: string) => void;
  fetchPrompts: () => Promise<void>;
  handleSelectPrompt: (prompt: Prompt) => void;
  handleNewPrompt: () => void;
  handleSavePrompt: () => Promise<void>;
  handleDeletePrompt: () => Promise<void>;
  handleCopyToClipboard: () => void;
}

const initialState: PromptState = {
  prompts: [],
  selectedPrompt: null,
  currentPromptName: '',
  currentPromptContent: '',
  isLoading: false,
  error: null,
  copyButtonText: COPY_PROMPT_TEXT,
};

export const usePromptStore = create<PromptState & PromptActions>(
  (set, get) => ({
    ...initialState,

    setPrompts: (prompts) => set({ prompts }),
    setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt }),
    setCurrentPromptName: (name) => set({ currentPromptName: name }),
    setCurrentPromptContent: (content) =>
      set({ currentPromptContent: content }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setCopyButtonText: (text) => set({ copyButtonText: text }),

    fetchPrompts: async () => {
      console.log('[PromptStore] Fetching prompts...');
      set({ isLoading: true, error: null });
      try {
        const promptsArray =
          (await window.electronAPI.getPrompts()) as unknown as Prompt[];
        set({
          prompts: promptsArray.sort(
            (a: Prompt, b: Prompt) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        });
        console.log(
          '[PromptStore] Prompts fetched successfully:',
          promptsArray.length,
        );
      } catch (err: any) {
        set({
          error:
            err.message ||
            'An unexpected error occurred while fetching prompts.',
        });
        console.error('[PromptStore] Exception fetching prompts:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    handleSelectPrompt: (prompt) => {
      console.log('[PromptStore] Selected prompt:', prompt.name, prompt.id);
      set({
        selectedPrompt: prompt,
        currentPromptName: prompt.name,
        currentPromptContent: prompt.content,
        error: null,
        copyButtonText: COPY_PROMPT_TEXT,
      });
    },

    handleNewPrompt: () => {
      console.log('[PromptStore] Initializing new prompt form.');
      set({
        selectedPrompt: null,
        currentPromptName: '',
        currentPromptContent: '',
        error: null,
        copyButtonText: COPY_PROMPT_TEXT,
      });
    },

    handleSavePrompt: async () => {
      const { currentPromptName, currentPromptContent, selectedPrompt } = get();
      if (
        currentPromptName.trim() === '' ||
        currentPromptContent.trim() === ''
      ) {
        set({ error: 'Prompt name and content cannot be empty.' });
        return;
      }
      console.log(
        '[PromptStore] Attempting to save prompt:',
        selectedPrompt ? selectedPrompt.id : 'New',
      );
      set({ isLoading: true, error: null });
      const promptToSave: Partial<Prompt> = {
        id: selectedPrompt?.id,
        name: currentPromptName,
        content: currentPromptContent,
      };
      try {
        const savedPrompt = (await window.electronAPI.savePrompt(
          promptToSave,
        )) as unknown as Prompt;
        console.log('[PromptStore] Prompt saved successfully:', savedPrompt.id);
        get().fetchPrompts(); // Refresh list
        get().handleSelectPrompt(savedPrompt); // Reselect the saved prompt
      } catch (err: any) {
        set({
          error:
            err.message ||
            'An unexpected error occurred while saving the prompt.',
        });
        console.error('[PromptStore] Exception saving prompt:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    handleDeletePrompt: async () => {
      const { selectedPrompt } = get();
      if (!selectedPrompt || !selectedPrompt.id) return;

      if (
        // eslint-disable-next-line no-alert
        window.confirm(
          `Are you sure you want to delete prompt '${selectedPrompt.name}'?`,
        )
      ) {
        console.log(
          '[PromptStore] Attempting to delete prompt:',
          selectedPrompt.id,
        );
        set({ isLoading: true, error: null });
        try {
          await window.electronAPI.deletePrompt(selectedPrompt.id);
          console.log(
            '[PromptStore] Prompt deleted successfully:',
            selectedPrompt.id,
          );
          get().fetchPrompts(); // Refresh list
          get().handleNewPrompt(); // Clear form
        } catch (err: any) {
          set({
            error:
              err.message ||
              'An unexpected error occurred while deleting the prompt.',
          });
          console.error('[PromptStore] Exception deleting prompt:', err);
        } finally {
          set({ isLoading: false });
        }
      }
    },

    handleCopyToClipboard: () => {
      const { currentPromptContent } = get();
      if (!currentPromptContent) return;
      console.log('[PromptStore] Copying prompt content to clipboard.');
      navigator.clipboard
        .writeText(currentPromptContent)
        .then((): void => {
          set({ copyButtonText: COPIED_PROMPT_TEXT });
          setTimeout(
            () => set({ copyButtonText: COPY_PROMPT_TEXT }),
            COPY_RESET_DELAY_MS,
          );
          // eslint-disable-next-line no-useless-return
          return; // return to prevent eslint error
        })
        .catch((err) => {
          const errorMessage =
            typeof err === 'string' ? err : (err as Error).message;
          set({ error: `Failed to copy: ${errorMessage}` });
          console.error('[PromptStore] Error copying to clipboard:', err);
        });
    },
  }),
);
