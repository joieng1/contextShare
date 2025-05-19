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

3. **Inter-Process Communication (IPC) Setup (`setupIpcHandlers` function):**
    This function configures handlers for messages sent from the renderer process via the `electronAPI` defined in the preload script. All handlers use `ipcMain.handle`, making them asynchronous and allowing them to return Promises.

    - **`ipcMain.handle('select-folder', async () => ...)`:**
        - Uses `dialog.showOpenDialog` to display a native "Open Folder" dialog.
        - Properties: `['openDirectory']`.
        - Returns the selected folder path (first element of `result.filePaths`) or `null` if the dialog was canceled or no folder was selected.

    - **`ipcMain.handle('get-directory-structure', async (event, folderPath: string) => ...)`:**
        - Receives a `folderPath` from the renderer.
        - Validates that `folderPath` is a non-empty string.
        - Calls the local `getDirectoryStructure(folderPath)` function to recursively build the file/directory tree.
        - Returns the resulting `DirectoryItem[]` structure or an error object `{ error: string }` if an issue occurs.

    - **`ipcMain.handle('read-file', async (event, filePath: string) => ...)`:**
        - Receives a `filePath` from the renderer.
        - Validates that `filePath` is a non-empty string.
        - Uses `fs.promises.readFile(filePath, 'utf8')` to read the content of the specified file.
        - Returns the file content as a string or an error object `{ error: string }`.

    - **`ipcMain.handle('save-compiled', async (event, content: string) => ...)`:**
        - Receives the compiled `content` string from the renderer.
        - Validates that `content` is a string.
        - Uses `dialog.showSaveDialog` to display a native "Save File" dialog.
        - Specifies title and filters for `.txt` files.
        - If a file path is chosen, it uses `fs.promises.writeFile(result.filePath, content)` to save the content.
        - Returns an object indicating success: `{ success: true, filePath: result.filePath }` or failure: `{ success: false, error?: string }`.

4. **Recursive Directory Structure Fetching (`getDirectoryStructure` async function):**
    - Takes a `dirPath` (directory path) as input.
    - Uses `fs.promises.readdir(dirPath, { withFileTypes: true })` to get a list of `Dirent` objects (representing files and directories within `dirPath`).
    - Maps over these items:
        - If an item `isDirectory()`: Recursively calls `getDirectoryStructure` for the subdirectory to build its `children` array. Then returns a `DirectoryItem` with `type: 'directory'`.
        - If an item is a file: Returns a `DirectoryItem` with `type: 'file'`.
    - Uses `Promise.all` to concurrently process all items in the directory.
    - Filters out any `null` results (though current logic doesn't produce nulls here, it's a safeguard).
    - Returns a `Promise<DirectoryItem[]>` representing the nested structure.

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
