# ContextShare: React Components

This document details the React components used in the ContextShare application's renderer process. These components are responsible for rendering the user interface and managing user interactions.

## 1. `FileCompilerApp` (`src/renderer/App.tsx`)

This is the main and root component of the application. It orchestrates the entire user interface, manages the application's global state through a Zustand store, and handles interactions with the Electron main process through the `electronAPI`.

**Responsibilities:**

- **State Management (using `useAppStore` - Zustand):**
  - The component subscribes to the `useAppStore` hook (from `src/renderer/store/appStore.ts`) to manage its core UI state. This includes:
    - `currentView`: Tracks the active view, either 'files' or 'prompts'.
    - `selectedFolder`: Path of the currently selected root directory.
    - `directoryStructure`: Hierarchical data of files and folders within `selectedFolder`.
    - `compiledContent`: The resulting string after compiling selected files.
    - `isLoading`: Boolean flag for asynchronous operations.
    - `error`: Stores error messages for display.
    - `copyButtonText`, `saveButtonText`: Dynamically changing text for action buttons.
    - `selectionVersion`: A `number` that is incremented (by calling the `bumpSelectionVersion` action) to trigger re-renders when the content of `selectionRef` changes. This is crucial for re-calculating the `displayDirectoryStructure`.
  - All state updates are performed by calling action functions obtained from `useAppStore` (e.g., `setCurrentView`, `setSelectedFolder`, `setIsLoading`, etc.).
  - `selectionRef`: A `useRef` holding a `Set` of paths for files selected by the user for compilation. Direct changes to this ref do not trigger re-renders, hence the use of `selectionVersion`.
  - `displayDirectoryStructure`: A memoized data structure derived from `directoryStructure` and `selectionVersion` using `useMemo`. It contains pre-calculated display properties (`isSelected`, `isChecked`, `isIndeterminate`, `hasFiles`) for each item, optimizing `TreeItem` rendering.

- **User Interactions & IPC Error Handling:**
  - All interactions with the main process via `window.electronAPI` are asynchronous and now consistently use `try/catch` blocks to handle potential errors thrown by the main process. On success, the expected data is returned; on failure, the `catch` block typically calls the `setError` action from the Zustand store.
  - Handles folder selection by invoking `window.electronAPI.selectFolder()`, then fetching the directory structure (which filters out `node_modules` in the main process). Relevant state updates are managed by calling actions from the `useAppStore` (e.g., `resetSession`, `setIsLoading`, `setSelectedFolder`, `setDirectoryStructure`, `setError`).
  - Manages the selection/deselection of individual files and entire directories by updating `selectionRef.current` and calling `bumpSelectionVersion`.
  - Initiates the file compilation process based on `selectionRef.current` by calling `window.electronAPI.compileFilesWorker()`. This delegates the entire compilation (including file reading) to a worker thread in the main process. Actions for `setCompiledContent`, `setIsLoading`, and `setError` are called based on the worker's response.
  - Handles copying the `compiledContent` to the clipboard, calling actions for `setCopyButtonText` and `setError`.
  - Handles saving the `compiledContent` to a file, calling actions for `setSaveButtonText`, `setIsLoading`, and `setError`.
  - Navigates between "File Compiler" and "Prompts Manager" views by calling `setCurrentView`.

- **UI Rendering:**
  - Displays control buttons ("Select Folder", "Compile Selected Files").
  - Shows the path of the selected folder.
  - Renders the file tree using the `TreeItem` component, passing items from the memoized `displayDirectoryStructure`.
  - Displays the compiled text output in a `textarea`.
  - Provides buttons to copy or save the compiled output.
  - Displays loading indicators and error messages.
  - Conditionally renders either the "File Compiler" UI or the `PromptsManager` component based on `currentView`.

**Key Functions/Handlers (now primarily call actions from `useAppStore` and use `try/catch` for IPC):**

- **`handleSelectFolder`**: Invokes `electronAPI.selectFolder`. Calls `resetSession` action. On success (within a `try` block), calls `setSelectedFolder` action and then `electronAPI.getDirectoryStructure` (which now filters `node_modules` in the main process), calling `setDirectoryStructure`. If any of these API calls fail, the `catch` block calls the `setError` action. Manages loading state by calling `setIsLoading` action.
- **`handleFileSelectionChange`**: Updates `selectionRef.current` and calls `bumpSelectionVersion` action.
- **`handleDirectorySelectionChange`**: Updates `selectionRef.current` for all files within the directory and calls `bumpSelectionVersion` action.
- **`handleCompileFiles`**: Invokes `window.electronAPI.compileFilesWorker({ files, root })` (within a `try` block) to delegate file reading and compilation to a worker thread in the main process. Calls `setCompiledContent` action with the result. If the API call fails, the `catch` block calls the `setError` action. Manages loading and error states by calling relevant actions from the store.
- **`handleCopyToClipboard`**: Uses `navigator.clipboard.writeText`. Calls `setCopyButtonText` action on success/reset and `setError` action on failure (this is a browser API, not main process IPC, so error handling is direct).
- **`handleSaveToFile`**: Invokes `electronAPI.saveCompiledContent` (within a `try` block). Calls `setSaveButtonText` action on success/reset. If the API call fails, the `catch` block calls the `setError` action. Manages loading state by calling `setIsLoading` action.
- **`useEffect` hooks:** Used to reset button texts (by calling `setCopyButtonText`, `setSaveButtonText` actions) when `compiledContent` changes.

**Structure:**

The component is laid out with a header, control buttons, an error display area, and a main content area split into two panes:
    1.  **File Browser Pane:** Shows the file tree (`TreeItem` components using `displayDirectoryStructure`) or messages prompting folder selection/loading.
    2.  **Compiled Content Pane:** Shows action buttons for the output, the count of selected files, and the read-only `textarea` for the compiled text.

### 2. `TreeItem` (`src/renderer/TreeItem.tsx`)

This component is responsible for rendering a single item (either a file or a directory) in the file tree. It handles its own expanded/collapsed state for directories and delegates selection changes back to the `FileCompilerApp` component. It has been optimized to be a more presentational component.

**Props (`TreeItemProps`):**

- **`item: DisplayDirectoryItem`**: The file or directory object to render, received from `App.tsx`'s `displayDirectoryStructure`. This object includes pre-calculated boolean display properties: `isSelected` (for files), `isChecked`, `isIndeterminate`, and `hasFiles` (for directories).
- **`onFileSelectionChange: (filePath: string, isSelected: boolean) => void`**: Callback function invoked when a file's checkbox state changes.
- **`onDirectorySelectionChange: (directory: DirectoryItem, isSelected: boolean) => void`**: Callback function invoked when a directory's checkbox state changes.

**State:**

- **`isExpanded: boolean`**: For directory items, this state determines whether the directory's children are visible. Defaults to `false`.

**Functionality:**

- **Rendering Logic:**
  - **If `item.type === 'directory'`:**
    - Renders a clickable header to toggle `isExpanded`.
    - Displays a toggle icon (▼ or ▶) based on `isExpanded`.
    - Renders a checkbox if `item.hasFiles` is true. Its `checked` state is directly set by `item.isChecked`, and its `indeterminate` state is set by `item.isIndeterminate`.
    - Displays the directory name.
    - If `isExpanded` is true and the directory has children, it recursively renders `TreeItem` components for each child (passing down the child `DisplayDirectoryItem` objects).
  - **If `item.type === 'file'`:**
    - Renders a label containing a checkbox and the file name.
    - The checkbox's `checked` state is directly set by `item.isSelected`.
- **Event Handlers:**
  - **`handleToggle`**: Toggles the `isExpanded` state when a directory header is clicked (but not when its checkbox is clicked).
  - **`handleCheckboxChange`**: Calls the appropriate callback (`onFileSelectionChange` or `onDirectorySelectionChange`) based on the `item.type` when a checkbox value changes.

**Accessibility:**

- Directory headers have `role="button"`, `tabIndex={0}`, and `aria-expanded` attributes for better keyboard navigation and screen reader support.
- Checkboxes are associated with their labels using `htmlFor` and `id` attributes, or `aria-labelledby` for directory checkboxes.

### 3. `PromptsManager` (`src/renderer/PromptsManager.tsx`)

The `PromptsManager` component is responsible for displaying, creating, editing, and deleting user-defined prompts. Its state is managed by the `usePromptStore` Zustand store.

**Responsibilities:**

- Uses `usePromptStore` (from `src/renderer/store/promptStore.ts`) to access state (e.g., `prompts`, `selectedPrompt`, `currentPromptName`, `currentPromptContent`, `isLoading`, `error`, `copyButtonText`) and actions (e.g., `fetchPrompts`, `handleSelectPrompt`, `setCurrentPromptName`, `handleSavePrompt`).
- Displays a list of existing prompts.
- Provides a form to create new prompts or edit existing ones.
- Allows users to delete prompts.
- Allows users to copy prompt content to the clipboard.
- Fetches prompts on component mount using the `fetchPrompts` action from the store.

### State Management (via `usePromptStore` - Zustand)

- The component derives all its necessary state and action dispatchers from the `usePromptStore`.
- `prompts: Prompt[]`: List of prompts.
- `selectedPrompt: Prompt | null`: The currently selected prompt for editing or display.
- `currentPromptName: string`: Value for the prompt name input field.
- `currentPromptContent: string`: Value for the prompt content textarea.
- `isLoading: boolean`: Tracks loading state for prompt operations.
- `error: string | null`: Stores error messages.
- `copyButtonText: string`: Text for the copy button.

### IPC Handlers Used (indirectly via store actions in `promptStore.ts`)

The `promptStore.ts` encapsulates the direct IPC calls. Its actions (`fetchPrompts`, `handleSavePrompt`, `handleDeletePrompt`) now interact with the main process as follows:
- They use `try/catch` blocks to handle the asynchronous operations.
- On success, the main process IPC handlers return the data directly (e.g., `Prompt[]` for `getPrompts`, the saved `Prompt` for `savePrompt`).
- On failure, the main process IPC handlers throw an error, which is caught by the `catch` block in the store action and typically results in an error state being set.

- `getPrompts` (via `fetchPrompts` action in `promptStore.ts`)
- `savePrompt` (via `handleSavePrompt` action in `promptStore.ts`)
- `deletePrompt` (via `handleDeletePrompt` action in `promptStore.ts`)

### Core Functionality (driven by `usePromptStore` actions and state)

1. **Display Prompts**:
    - `useEffect` calls the `fetchPrompts` action (from `promptStore.ts`) on mount. This action now fetches prompts expecting a direct array or an error to be thrown.
    - Renders a list of prompts from the `prompts` state. Each item can be selected using `handleSelectPrompt` action.
2. **Create/Edit Prompt Form**:
    - Input fields for name and content are bound to `currentPromptName` and `currentPromptContent` state (updated via `setCurrentPromptName`, `setCurrentPromptContent` actions).
    - The "Save" button calls the `handleSavePrompt` action (from `promptStore.ts`). This action saves the prompt, expecting the saved prompt object directly or an error to be thrown.
    - The "New Prompt" button calls the `handleNewPrompt` action.
3. **Delete Prompt**:
    - The "Delete" button (visible if a prompt is selected) calls the `handleDeletePrompt` action (from `promptStore.ts`). This action attempts to delete the prompt, handling potential errors thrown by the main process.
4. **Copy Prompt Content**:
    - The "Copy Prompt" button calls the `handleCopyToClipboard` action.

### Callbacks from Parent (`App.tsx`)

- This component is now self-contained regarding its core logic and state, managed by `usePromptStore`. It no longer relies on callbacks like `onUsePrompt` or `onNavigateToCompiler` from `App.tsx` because view switching is handled by `App.tsx` using its own `useAppStore`.

### View Management

The `FileCompilerApp` now manages two distinct views: "File Compiler" and "Prompts Manager".

- **State**:
  - `currentView: 'compiler' | 'prompts'` (default: `'compiler'`) - Tracks the active view.
- **Handlers**:
  - `navigateToPromptsManager()`: Sets `currentView` to `'prompts'`.
  - `navigateToCompiler()`: Sets `currentView` to `'compiler'`.
- **UI Elements**:
  - Buttons or links are provided to switch between these views.
  - Conditionally renders either the `FileCompiler` specific UI or the `PromptsManager` component based on `currentView`.

These three components work together to provide a dynamic and interactive file Browse and compilation experience for the user. `FileCompilerApp` manages the overall application logic and data, `TreeItem` handles the presentation and interaction of individual nodes within the file hierarchy, and `PromptsManager` offers a user-friendly interface for managing prompts.
