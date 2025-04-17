export interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryItem[];
}

export interface TreeItemProps {
  item: DirectoryItem;
  selectedFiles: Set<string>;
  onFileSelectionChange: (filePath: string, isSelected: boolean) => void;
  onDirectorySelectionChange: (
    directory: DirectoryItem,
    isSelected: boolean,
  ) => void;
}
