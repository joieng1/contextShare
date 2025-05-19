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
