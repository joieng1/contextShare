export interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryItem[];
}

export interface DisplayDirectoryItem extends DirectoryItem {
  isSelected?: boolean;
  isChecked?: boolean;
  isIndeterminate?: boolean;
  hasFiles?: boolean;
  children?: DisplayDirectoryItem[];
}

export interface Prompt {
  id: string; // Unique identifier
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
