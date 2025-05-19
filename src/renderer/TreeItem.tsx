import React, { useState, memo } from 'react';
import { DirectoryItem, DisplayDirectoryItem } from './types';

export interface TreeItemProps {
  item: DisplayDirectoryItem;
  onFileSelectionChange: (filePath: string, checked: boolean) => void;
  onDirectorySelectionChange: (
    directory: DirectoryItem,
    checked: boolean,
  ) => void;
}

export default memo(function TreeItem({
  item,
  onFileSelectionChange,
  onDirectorySelectionChange,
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Handles toggling expanded/collapsed state of the directory
   * Handler ignoes clicks on the ckecbox itself
   * @param {React.MouseEvent} e - The mouse event from clicking directory header
   */
  const handleToggle = (e: React.MouseEvent) => {
    // Prevent toggle when clicking checkbox
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      setIsExpanded(!isExpanded);
    }
  };

  /**
   * Handles checkbox changes for files and directories
   * Calls appropriate callback based on item type
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from checkboxes
   */
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checkedStatus = e.target.checked;
    if (item.type === 'directory') {
      const originalItem: DirectoryItem = {
        name: item.name,
        path: item.path,
        type: item.type,
        children: item.children as DirectoryItem[] | undefined,
      };
      onDirectorySelectionChange(originalItem, checkedStatus);
    } else {
      onFileSelectionChange(item.path, checkedStatus);
    }
  };

  if (item.type === 'directory') {
    // Use pre-calculated states from item prop
    const {
      isChecked = false,
      isIndeterminate = false,
      hasFiles = false,
    } = item;
    const headerId = `dir-header-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // Only show checkbox if the directory branch actually contains files
    const showCheckbox = hasFiles;

    return (
      <div className="tree-item tree-directory">
        <div
          id={headerId}
          className="tree-directory-header"
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleToggle(e as any);
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
        >
          <span className="tree-toggle">{isExpanded ? '▼' : '▶'}</span>
          {showCheckbox && (
            <input
              type="checkbox"
              aria-labelledby={headerId}
              className="file-checkbox directory-checkbox"
              checked={isChecked}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isIndeterminate;
                }
              }}
              onChange={handleCheckboxChange}
            />
          )}
          <span id={`${headerId}-label`}>{item.name}</span>
        </div>
        <div
          className={`tree-directory-children ${isExpanded ? '' : 'collapsed'}`}
        >
          {item.children &&
            item.children.length > 0 &&
            item.children.map((child) => (
              <TreeItem
                key={child.path}
                item={child as DisplayDirectoryItem}
                onFileSelectionChange={onFileSelectionChange}
                onDirectorySelectionChange={onDirectorySelectionChange}
              />
            ))}
        </div>
      </div>
    );
  }

  // File item
  const { isSelected = false } = item;
  const inputId = `file-checkbox-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return (
    <div className="tree-item tree-file">
      <label htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          className="file-checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
        />
        <span>{item.name}</span>
      </label>
    </div>
  );
});
