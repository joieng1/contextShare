# ContextShare: React Components

This document details the React components used in the ContextShare application's renderer process. These components are responsible for rendering the user interface and managing user interactions.

## 1. `FileCompilerApp` (`src/renderer/App.tsx`)

This is the main and root component of the application. It orchestrates the entire user interface, manages the application's global state, and handles interactions with the Electron main process through the `electronAPI`.

**Responsibilities:**

- **State Management:**
  - `selectedFolder`: Path of the currently selected root directory.
  - `directoryStructure`: Hierarchical data of files and folders within `selectedFolder`.
  - `selectedFiles`: A `Set` of paths for files selected by the user for compilation.
  - `compiledContent`: The resulting string after compiling selected files.
  - `isLoading`: Boolean flag for asynchronous operations.
  - `error`: Stores error messages for display.
  - `copyButtonText`, `saveButtonText`: Dynamically changing text for action buttons.
- **User Interactions:**
  - Handles folder selection by invoking `window.electronAPI.selectFolder()` and then fetching the directory structure.
  - Manages the selection/deselection of individual files and entire directories.
  - Initiates the file compilation process based on `selectedFiles`.
  - Handles copying the `compiledContent` to the clipboard.
  - Handles saving the `compiledContent` to a file.
- **UI Rendering:**
  - Displays control buttons ("Select Folder", "Compile Selected Files").
  - Shows the path of the selected folder.
  - Renders the file tree using the `TreeItem` component.
  - Displays the compiled text output in a `textarea`.
  - Provides buttons to copy or save the compiled output.
  - Displays loading indicators and error messages.

**Key Functions/Handlers:**

- **`handleSelectFolder`**: Invokes `electronAPI.selectFolder`, updates `selectedFolder`, then calls `electronAPI.getDirectoryStructure` to fetch and set `directoryStructure`. Manages loading and error states.
- **`handleFileSelectionChange`**: Updates the `selectedFiles` set when a single file's selection state changes.
- **`handleDirectorySelectionChange`**: Updates the `selectedFiles` set by adding or removing all files within a given directory when its selection state changes.
- **`handleCompileFiles`**: Reads the content of each file in `selectedFiles` (using `electronAPI.readFile`), formats it with relative paths and delimiters, and updates `compiledContent`.
- **`handleCopyToClipboard`**: Uses `navigator.clipboard.writeText` to copy `compiledContent`.
- **`handleSaveToFile`**: Invokes `electronAPI.saveCompiledContent` to save the `compiledContent`.
- **`useEffect` hooks:** Used to reset button texts when `compiledContent` changes.

**Structure:**

The component is laid out with a header, control buttons, an error display area, and a main content area split into two panes:
    1.  **File Browser Pane:** Shows the file tree (`TreeItem` components) or messages prompting folder selection/loading.
    2.  **Compiled Content Pane:** Shows action buttons for the output, the count of selected files, and the read-only `textarea` for the compiled text.

### 2. `TreeItem` (`src/renderer/TreeItem.tsx`)

This component is responsible for rendering a single item (either a file or a directory) in the file tree. It handles its own expanded/collapsed state for directories and delegates selection changes back to the `FileCompilerApp` component.

**Props (`TreeItemProps` from `src/renderer/types.ts`):**

- **`item: DirectoryItem`**: The file or directory object to render. Contains `name`, `path`, `type`, and optionally `children`.
- **`selectedFiles: Set<string>`**: The set of currently selected file paths, passed down from `FileCompilerApp`. Used to determine the checkbox state for files and directories.
- **`onFileSelectionChange: (filePath: string, isSelected: boolean) => void`**: Callback function invoked when a file's checkbox state changes.
- **`onDirectorySelectionChange: (directory: DirectoryItem, isSelected: boolean) => void`**: Callback function invoked when a directory's checkbox state changes.

**State:**

- **`isExpanded: boolean`**: For directory items, this state determines whether the directory's children are visible. Defaults to `false`.

**Functionality:**

- **Rendering Logic:**
  - **If `item.type === 'directory'`:**
    - Renders a clickable header to toggle `isExpanded`.
    - Displays a toggle icon (▼ or ▶) based on `isExpanded`.
    - Renders a checkbox. Its `checked` and `indeterminate` states are determined by the `getDirectoryCheckboxState` function, which checks the selection status of its descendant files.
    - Displays the directory name.
    - If `isExpanded` is true and the directory has children, it recursively renders `TreeItem` components for each child.
  - **If `item.type === 'file'`:**
    - Renders a label containing a checkbox and the file name.
    - The checkbox's `checked` state is determined by whether `item.path` is present in the `selectedFiles` prop.
- **Event Handlers:**
  - **`handleToggle`**: Toggles the `isExpanded` state when a directory header is clicked (but not when its checkbox is clicked).
  - **`handleCheckboxChange`**: Calls the appropriate callback (`onFileSelectionChange` or `onDirectorySelectionChange`) based on the `item.type` when a checkbox value changes.
- **`getDirectoryCheckboxState`**: A crucial internal function for directory items. It recursively checks the selection status of all file descendants:
  - Returns `{ checked: true, indeterminate: false }` if all descendant files are selected.
  - Returns `{ checked: false, indeterminate: true }` if some (but not all) descendant files are selected.
  - Returns `{ checked: false, indeterminate: false }` if no descendant files are selected or if the directory contains no files.
  - This logic ensures that directory checkboxes accurately reflect the selection state of their contents.

**Accessibility:**

- Directory headers have `role="button"`, `tabIndex={0}`, and `aria-expanded` attributes for better keyboard navigation and screen reader support.
- Checkboxes are associated with their labels using `htmlFor` and `id` attributes, or `aria-labelledby` for directory checkboxes.

These two components work together to provide a dynamic and interactive file Browse and compilation experience for the user. `FileCompilerApp` manages the overall application logic and data, while `TreeItem` handles the presentation and interaction of individual nodes within the file hierarchy.
