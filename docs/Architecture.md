# ContextShare: Application Architecture

ContextShare is built using the Electron framework, which means it comprises two main types of processes: a **Main Process** and one or more **Renderer Processes**. This architecture allows for the separation of concerns, where the main process handles system-level interactions and window management, while renderer processes are responsible for displaying the user interface.

## 1. Main Process (`src/main/main.ts`)

- **Responsibilities:**
  - Manages the application lifecycle (startup, quit).
  - Creates and manages browser windows (`BrowserWindow`).
  - Handles native operating system interactions, such as displaying open/save dialogs.
  - Performs file system operations (reading directories, reading file content, writing files) using Node.js modules (`fs`, `path`). This is crucial for ContextShare's core functionality of accessing and compiling files. The directory reading logic now filters out `node_modules` folders.
  - Manages worker threads (e.g., for file compilation) to offload intensive tasks from the main event loop and renderer process.
  - Sets up Inter-Process Communication (IPC) handlers to respond to messages from the renderer process.
  - In development mode, it installs React Developer Tools.
- **Key Files:**
  - `src/main/main.ts`: The entry point for the main process. Initializes the application, creates the main window, and sets up IPC handlers. It also initiates worker threads for tasks like compilation.
  - `src/main/compileWorker.ts`: A dedicated worker script that handles the file compilation process in a separate thread, receiving file paths from the main process and returning the compiled content.
  - `src/main/util.ts`: Contains utility functions, primarily `resolveHtmlPath` for determining the correct path to the HTML file for the renderer process in development and production environments.

## 2. Renderer Process (`src/renderer/`)

- **Responsibilities:**
  - Renders the user interface using HTML, CSS, and JavaScript (React).
  - Manages the application's UI state (e.g., selected folder, list of files, compiled content).
  - Sends requests to the main process via IPC for operations it cannot perform directly (e.g., file system access).
  - Receives responses from the main process and updates the UI accordingly.
- **Key Files:**
  - `src/renderer/index.html` (generated from `src/renderer/index.ejs`): The HTML page that hosts the React application.
  - `src/renderer/index.tsx`: The entry point for the React application. Renders the root `App` component.
  - `src/renderer/App.tsx`: The main React component that orchestrates the UI, manages state, and interacts with the preload script to communicate with the main process.
  - `src/renderer/TreeItem.tsx`: A React component responsible for rendering individual files and directories in the file tree view.
  - `src/renderer/store/appStore.ts`: Zustand store for managing the global state of the `FileCompilerApp`.
  - `src/renderer/store/promptStore.ts`: Zustand store for managing the state of the `PromptsManager` component.
  - `src/renderer/App.css`: Styles for the application.
  - `src/renderer/types.ts`: TypeScript type definitions used within the renderer process, particularly for the directory structure and component props.

## 3. Preload Script (`src/main/preload.ts`)

- **Responsibilities:**
  - Acts as a bridge between the renderer process and the main process.
  - Securely exposes specific IPC channels and functionalities from the main process to the renderer process using Electron's `contextBridge`.
  - It runs in a privileged environment with access to Node.js APIs, but it selectively exposes only necessary functions to the renderer, adhering to the principle of least privilege and enhancing security by keeping `contextIsolation` enabled.
- **Key Files:**
  - `src/main/preload.ts`: Defines the API (`window.electronAPI`) that the renderer process can use to invoke IPC handlers in the main process (e.g., `selectFolder`, `getDirectoryStructure`, `saveCompiledContent`, `compileFilesWorker`).
  - `src/renderer/preload.d.ts`: TypeScript declaration file that provides type definitions for the API exposed by `preload.ts`, enabling type checking and autocompletion in the renderer process.

## 4. UI State Management and Rendering Optimizations

To enhance performance and maintainability within the Renderer Process, state management has been refactored using **Zustand**, a lightweight and flexible state management library.

- **Centralized State Management with Zustand**:
  - The primary state management in `App.tsx` (for the file compilation view) and `PromptsManager.tsx` (for the prompts view) has been migrated to Zustand stores.
  - `src/renderer/store/appStore.ts`: Manages the state for the main application view (`FileCompilerApp`), including `currentView`, `selectedFolder`, `directoryStructure`, `compiledContent`, loading states, errors, and `selectionVersion`.
  - `src/renderer/store/promptStore.ts`: Manages the state for the `PromptsManager` component, including the list of `prompts`, `selectedPrompt`, `currentPromptName`, `currentPromptContent`, loading states, and errors.
  - This approach centralizes state logic, making it more modular and easier to manage across different components. Actions to modify state are defined directly within the stores.
  - Components now subscribe to these stores using custom hooks (`useAppStore`, `usePromptStore`) to access state and actions, replacing the previous `useReducer` in `App.tsx` and multiple `useState` hooks in `PromptsManager.tsx`.

- **Memoized Display Tree for Optimized Rendering**:
  - To address performance bottlenecks associated with rendering the file tree (composed of `TreeItem` components), a memoized `displayDirectoryStructure` is computed in `App.tsx` using the `useMemo` hook.
  - This `displayDirectoryStructure` is derived from the raw `directoryStructure` and the current file selections (`selectionRef`).
  - Crucially, it pre-calculates display-specific properties for each file and directory item (e.g., `isSelected`, `isChecked`, `isIndeterminate`, `hasFiles`). These properties are now simple boolean flags directly consumed by `TreeItem` components.
  - This pre-calculation, performed only when relevant dependencies (like the directory structure or selection version) change, significantly reduces the computational load on individual `TreeItem` components.

- **Simplified `TreeItem` Component**:
  - As a result of the memoized display tree, the `TreeItem` component was simplified. It no longer needs to perform complex recursive calculations to determine its selection state (checked, indeterminate).
  - It now receives its display state directly via props from the `displayDirectoryStructure`, making it a more lightweight and presentational component. This change further contributes to improved rendering performance, especially for large directory structures.

These changes collectively make the UI more responsive, particularly when interacting with the file selection tree, and make the state logic in `App.tsx` more robust and easier to manage.

## Communication Flow (IPC)

1. **User Interaction (Renderer):** The user clicks a button in the React UI (e.g., "Select Folder").
2. **API Call (Renderer to Preload):** The React component (`App.tsx`) calls a function on the `window.electronAPI` object (e.g., `window.electronAPI.selectFolder()`).
3. **IPC Invoke (Preload to Main):** The preload script, which defined `window.electronAPI`, uses `ipcRenderer.invoke()` to send a message to the corresponding IPC handler in the main process (e.g., `'select-folder'` or `'compile-files-worker'`).
4. **Processing (Main):** The IPC handler in `main.ts` (e.g., `ipcMain.handle('select-folder', ...)` or `ipcMain.handle('compile-files-worker', ...)`) executes the requested operation. For compilation, this involves creating a Worker instance, sending it data, and awaiting its response.
5. **Response (Main to Preload to Renderer):** The main process (or its worker) returns a result. If an error occurs during processing in the main process handler, an error is thrown. This promise (resolving with data or rejecting with an error) resolves in the preload script, which in turn resolves or rejects the promise in the renderer process.
6. **UI Update (Renderer):** The React component receives the result (if the promise resolved) or catches the error (if the promise rejected using a `try/catch` block). It then updates its state accordingly, causing the UI to re-render (e.g., display the selected folder path and file tree, or show an error message).

## Diagrammatic Representation

+---------------------+      IPC via      +-----------------------+      contextBridge      +-----------------------+
|   Renderer Process  | ----------------> |    Preload Script     | ----------------------> |      Main Process     |
| (React UI - App.tsx)| ----------------  | (window.electronAPI)  | ----------------------  | (Node.js - main.ts)   |
| - User Interactions |      ipcRenderer  | - Exposes specific    |      ipcMain.handle     | - File System Access  |
| - Displays Data     |                   |   functions           |                         | - Dialogs             |
| - Calls electronAPI |                   | - Secure bridge       |                         | - Window Management   |
+---------------------+                   +-----------------------+                         +-----------------------+

## Build Process

- **Webpack:** Used to bundle JavaScript/TypeScript code for both the main and renderer processes. Configuration has been updated to include separate entry points for worker scripts (e.g., `compileWorker.ts`) to ensure they are bundled correctly for use with `worker_threads`.
- **Electron React Boilerplate:** Provides the scripts and configurations (`npm start`, `npm run package`) for development and packaging the application for production.
  - `npm start`: Runs the application in a development environment with hot reloading.
  - `npm run package`: Packages the application into a distributable format for the local platform.

This architecture ensures that the application is robust, maintainable, and secure by separating UI logic from system-level operations and controlling the communication between them.
