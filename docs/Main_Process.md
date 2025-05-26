# ContextShare: Main Process Logic (`src/main/main.ts`)

The main process in an Electron application is responsible for managing the application's lifecycle, creating and controlling browser windows, interacting with the native operating system, and handling tasks that renderer processes cannot perform directly due to security restrictions (like file system access). In ContextShare, `src/main/main.ts` is the entry point and central hub for these operations.

## Core Responsibilities

1. **Application Lifecycle Management:**
    - Uses `app.on('window-all-closed', ...)` to quit the application when all windows are closed (except on macOS, where it's common for apps to stay active).
    - Uses `app.whenReady().then(...)` to create the main browser window and set up IPC handlers once Electron has finished initializing.
    - Handles the `activate` event on macOS to re-create a window if the app is activated and no windows are open.

2. **BrowserWindow Creation (`createWindow` function):**
    - Initializes `mainWindow: BrowserWindow | null`.
    - Installs React Developer Tools in development mode (`isDebug`).
    - Defines paths for assets (`RESOURCES_PATH`, `getAssetPath`).
    - Creates a new `BrowserWindow` with specified dimensions, icon, and web preferences:
        - `nodeIntegration: false`: Enhances security by preventing Node.js APIs in the renderer without a preload script.
        - `contextIsolation: true`: A critical security feature that ensures the preload script and the renderer's JavaScript run in separate contexts.
        - `preload`: Specifies the path to the `preload.js` script, which acts as the bridge between the renderer and main processes.
    - Loads the `index.html` file into the window using `resolveHtmlPath` (which points to the webpack dev server in development or the local file in production).
    - Handles the `ready-to-show` event to display the window gracefully.
    - Handles the `closed` event to dereference `mainWindow`.
    - Sets up a `windowOpenHandler` to open external URLs in the user's default browser using `shell.openExternal`.

3. **Background Task Management (Worker Threads):**
    - Utilizes Node.js `worker_threads` to offload computationally intensive tasks from the main event loop and the renderer process, ensuring the UI remains responsive.
    - A key example is file compilation, handled by `src/main/compileWorker.ts`. This worker receives file paths, reads their content, and returns the compiled string to the main process, which then forwards it to the renderer.
    - The main process is responsible for creating, communicating with, and terminating these worker threads.

4. **Inter-Process Communication (IPC) Setup (`setupIpcHandlers` function):**
    This function configures handlers for messages sent from the renderer process via the `electronAPI` defined in the preload script. All handlers use `ipcMain.handle`, making them asynchronous and allowing them to return Promises.

    - **`ipcMain.handle('select-folder', async () => ...)`:**
        - Uses `dialog.showOpenDialog` to display a native "Open Folder" dialog.
        - Properties: `['openDirectory']`.
        - Returns the selected folder path (first element of `result.filePaths`) or `null` if the dialog was canceled or no folder was selected.

    - **`ipcMain.handle('get-directory-structure', async (event, folderPath: string) => ...)`:**
        - Receives a `folderPath` from the renderer.
        - Validates that `folderPath` is a non-empty string. If invalid, it throws an error.
        - Calls the local `getDirectoryStructure(folderPath)` function to recursively build the file/directory tree. This function now explicitly filters out `node_modules` directories.
        - Returns the resulting `DirectoryItem[]` structure. If an issue occurs during structure retrieval (e.g., directory not readable), it throws an error.

    - **~~`ipcMain.handle('read-file', async (event, filePath: string) => ...)`:~~ (REMOVED)**
        - ~~Receives a `filePath` from the renderer.~~
        - ~~Validates that `filePath` is a non-empty string. If invalid, it throws an error.~~
        - ~~Uses `fs.promises.readFile(filePath, 'utf8')` to read the content of the specified file.~~
        - ~~Returns the file content as a string. If the file cannot be read, it throws an error.~~
        - *Note: This handler was removed as file reading for the core compilation feature is handled by the `compile-files-worker`.*

    - **`ipcMain.handle('save-compiled', async (event, content: string) => ...)`:**
        - Receives the compiled `content` string from the renderer.
        - Validates that `content` is a string. If invalid, it throws an error.
        - Uses `dialog.showSaveDialog` to display a native "Save File" dialog.
        - Specifies title and filters for `.txt` files.
        - If a file path is chosen, it uses `fs.promises.writeFile(result.filePath, content)` to save the content.
        - Returns an object `{ success: true, filePath: result.filePath }` if saving is successful and a path was chosen. If the dialog is canceled, it returns `{ success: false }`. If an error occurs during file writing, it throws an error.

    - **`ipcMain.handle('compile-files-worker', async (event, { files, root }) => ...)`:**
        - Receives an object containing `files` (an array of file paths) and `root` (the base directory path) from the renderer.
        - Creates a new `Worker` instance, pointing to the Webpack-compiled `compileWorker.js` script.
        - Sends the `{ files, root }` data to the worker using `worker.postMessage()`.
        - Listens for messages from the worker:
            - On a successful compilation, the worker sends `{ compiledText: string }`.
            - If an error occurs in the worker, it sends `{ error: string }`. The main process handler then re-throws this as an error.
        - Returns a Promise that resolves with an object containing the compiled text (e.g., `{ compiledText: string }`). If any error occurs (either in the worker or in the main handler setup), the Promise is rejected (i.e., an error is thrown).
        - Handles worker errors and termination.

5. **Recursive Directory Structure Fetching (`getDirectoryStructure` async function):**
    - Takes a `dirPath` (directory path) as input.
    - Uses `fs.promises.readdir(dirPath, { withFileTypes: true })` to get a list of `Dirent` objects (representing files and directories within `dirPath`).
    - Maps over these items:
        - If an item `isDirectory()`: Recursively calls `getDirectoryStructure` for the subdirectory to build its `children` array. Then returns a `DirectoryItem` with `type: 'directory'`.
        - If an item is a file: Returns a `DirectoryItem` with `type: 'file'`.
    - **Exclusion:** This function now explicitly checks if `item.name === 'node_modules' && item.isDirectory()` and returns `null` for such items, effectively excluding them from the returned structure.
    - Uses `Promise.all` to concurrently process all items in the directory.
    - Filters out any `null` results (though current logic doesn't produce nulls here, it's a safeguard).
    - Returns a `Promise<DirectoryItem[]>` representing the nested structure.

### Prompts Management

The main process also handles CRUD operations for user-defined prompts. These prompts are stored using `electron-store`.

#### Initialization

A new `Store` instance is created for prompts, similar to the API key:

#### IPC Handlers for Prompts

- **`get-prompts`**:
  - Retrieves all saved prompts from the `electron-store`.
  - Returns an array of `Prompt` objects. If an error occurs, it throws an error.
  - Invoked by: `ipcRenderer.invoke('get-prompts')`

- **`save-prompt`**:
  - Saves a new prompt or updates an existing one in `electron-store`.
  - Expects a `Prompt` object (or partial for updates) as an argument.
  - If the prompt has an `id`, it updates the existing prompt. Otherwise, it generates a new `id` and adds the new prompt.
  - Returns the saved/updated `Prompt` object. If an error occurs (e.g., prompt ID for update not found), it throws an error.
  - Invoked by: `ipcRenderer.invoke('save-prompt', prompt)`

- **`delete-prompt`**:
  - Deletes a prompt from `electron-store` based on its `id`.
  - Expects a `promptId` (string) as an argument.
  - Returns an object `{ promptId: string }` indicating the ID of the deleted prompt if successful. If the prompt ID is not found or another error occurs, it throws an error.
  - Invoked by: `ipcRenderer.invoke('delete-prompt', promptId)`

### Worker Script: `src/main/compileWorker.ts`

This script runs in a separate thread and is responsible for the actual file compilation process to avoid blocking the main process or renderer.

- **Imports:** `parentPort` from `worker_threads`, `fs/promises`, `path`.
- **Operation:**
  - Listens for a `message` event on `parentPort` containing `{ files: string[], root: string }`.
  - Asynchronously reads each file in the `files` array using `fs.readFile(filePath, 'utf-8')`.
  - For each file, it calculates its relative path from the `root` directory.
  - Concatenates the relative path and content of each successfully read file into a single `compiledText` string, formatted with headers and separators.
  - If a file read operation fails, an error comment is included in the `compiledText` for that file.
  - Posts the result back to the main thread using `parentPort.postMessage({ compiledText })` or `parentPort.postMessage({ error: string })` if an overall error occurs.

### Development and Debugging Features

- **Source Map Support:** `require('source-map-support').install()` is used in production to map minified code back to original sources for easier debugging of production issues.
- **Electron Debug:** `require('electron-debug').default()` is used in development (`isDebug` is true) to enable useful debugging features like a context menu with "Inspect Element".
- **Extension Installation:** The `installExtensions` function attempts to install `REACT_DEVELOPER_TOOLS` for Electron in development mode.

### Utility Functions

- **`resolveHtmlPath` (from `src/main/util.ts`):**
  - A helper function to determine the correct URL or file path for the `index.html` file.
  - In development, it constructs a URL pointing to `http://localhost:PORT/index.html` (where `PORT` is typically 1212, used by the webpack dev server).
  - In production, it constructs a `file://` URL pointing to the `index.html` file within the packaged application's renderer assets.

The `main.ts` file is thus the backbone of the ContextShare application, handling all system-level interactions and securely providing necessary functionalities to the UI-focused renderer process.
