# ContextShare: Application Overview

ContextShare is a desktop utility application engineered to simplify the task of aggregating and formatting file content specifically for use with Large Language Models (LLMs). The application provides a user-friendly interface to manage and compile text-based data from various files into a single, coherent block of text, ready for LLM input.

## Core Functionality

ContextShare empowers users with the following capabilities:

- **Directory Selection:** Users can easily choose a root folder that contains the files they intend to process for their LLM.
- **Hierarchical File Browse:** The application presents a clear, tree-like view of the selected directory's structure. This allows for intuitive navigation and quick identification of desired files or subdirectories.
- **Flexible File/Directory Selection:** Users have the granularity to select individual files or entire directories. Selecting a directory implicitly includes all its nested files and subdirectories.
- **Content Compilation:** With selected files, users can trigger a compilation process. This process reads the content of each selected file and merges them into a single text output. The output is structured with clear delimiters and file path information for optimal use by LLMs.
- **Clipboard Integration:** The compiled text can be copied to the system clipboard with a single click, facilitating easy pasting into LLM interfaces, prompts, or configuration files.
- **File Saving:** Users can save the compiled text directly to a `.txt` file, allowing for persistent storage and later reuse of the context.

### 4. Prompts Management

- **Description**: Allows users to create, save, edit, delete, and use custom prompts. This helps in quickly populating the main text area with frequently used instructions or templates.
- **Key Components**: `PromptsManager.tsx`, `App.tsx` (view switching), `main.ts` (IPC handlers for `electron-store`).

## Purpose

The primary goal of ContextShare is to streamline the often tedious and error-prone process of manually gathering and formatting context for LLMs. By automating these steps, it aims to enhance productivity for developers, researchers, and anyone working with LLMs that require significant textual input.

## Technologies Used

- **Electron:** For building the cross-platform desktop application.
- **React:** For creating the user interface components and managing application state.
- **Zustand:** For efficient and scalable state management in the React frontend, particularly for global or complex state.
- **React Router:** For navigation within the application (though minimally used in this specific single-view utility).
- **Webpack:** For bundling the application's assets and modules.
- **React Fast Refresh:** For enabling a fast development loop with hot reloading.
- **Node.js (fs, path modules):** For file system interactions in the Electron main process.
- **TypeScript:** For type safety and improved developer experience across the codebase.

This application follows a standard Electron architecture with a main process handling system-level operations and a renderer process managing the user interface. Communication between these processes is facilitated by Electron's Inter-Process Communication (IPC) mechanisms, exposed securely via a preload script.
