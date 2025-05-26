# ContextShare: Data Structures

This document outlines the key data structures used within the ContextShare application, primarily focusing on how file and directory information is represented and managed.

## 1. `DirectoryItem`

This is the central interface used to represent both files and directories in the file tree structure. It is defined in multiple places to ensure consistency across the main process, preload script, and renderer process.

**Definition (from `src/main/main.ts`, `src/renderer/preload.d.ts`, `src/renderer/types.ts`):**

```typescript
interface DirectoryItem {
  name: string;          // The name of the file or directory.
  path: string;          // The absolute path to the file or directory.
  type: 'directory' | 'file'; // Discriminator to identify if the item is a directory or a file.
  children?: DirectoryItem[]; // Optional array of DirectoryItem, present if type is 'directory'.
                               // Represents the contents of the directory.
}
```

## 2. `DisplayDirectoryItem`

This interface extends `DirectoryItem` and is used specifically in the renderer process (`App.tsx` and `TreeItem.tsx`) to facilitate efficient rendering of the file tree. It includes pre-calculated display-related properties.

**Definition (exported from `src/renderer/App.tsx`):**

```typescript
export interface DisplayDirectoryItem extends DirectoryItem {
  isSelected?: boolean;      // For files: true if the file is selected.
  isChecked?: boolean;         // For directories: true if all descendant files are selected.
  isIndeterminate?: boolean;   // For directories: true if some, but not all, descendant files are selected.
  hasFiles?: boolean;        // For directories: true if the directory or any of its subdirectories contain at least one file.
  children?: DisplayDirectoryItem[]; // Overrides DirectoryItem's children to be of DisplayDirectoryItem type.
}
```

The properties `isSelected`, `isChecked`, `isIndeterminate`, and `hasFiles` are computed in `App.tsx` using a `useMemo` hook that depends on the `directoryStructure` (from `useAppStore`) and the `selectionRef` (local to `App.tsx`). This memoized calculation happens whenever the underlying `directoryStructure` or the user's file selections (tracked via `selectionVersion` in `useAppStore`) change. By pre-calculating these states, the `TreeItem` component can be much simpler and more performant, as it doesn't need to recursively determine its display state.

## 3. `AppState`

This interface defines the shape of the state managed by the `useAppStore` (Zustand store) for the main application view (`FileCompilerApp`).

**Definition (from `src/renderer/store/appStore.ts`):**

```typescript
export interface AppState {
  currentView: 'files' | 'prompts';
  selectedFolder: string | null;
  directoryStructure: DirectoryItem[] | null;
  compiledContent: string;
  copyButtonText: string;
  saveButtonText: string;
  isLoading: boolean;
  error: string | null;
  selectionVersion: number;
}
```
This state includes the current UI view, details about the selected folder and its file structure, the compiled output, and various UI status indicators (loading, error, button texts).

## 4. `Prompt`

Represents a user-defined prompt.

```typescript
interface Prompt {
  id: string; // Unique identifier for the prompt
  name: string; // User-defined name for the prompt
  content: string; // The actual prompt text
  createdAt: string; // ISO date created at
  updatedAt: string; // ISO date updated at
}
```

This interface is used to store and manage reusable prompts within the application. Prompts are saved by the user and can be later selected to pre-fill the main input area.

## 5. `PromptState`

This interface defines the shape of the state managed by the `usePromptStore` (Zustand store) for the `PromptsManager` component.

**Definition (from `src/renderer/store/promptStore.ts`):**

```typescript
export interface PromptState {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  currentPromptName: string;
  currentPromptContent: string;
  isLoading: boolean;
  error: string | null;
  copyButtonText: string;
}
```

This state includes the list of all prompts, the currently selected/editing prompt, input values for the prompt editor, and UI status indicators.
