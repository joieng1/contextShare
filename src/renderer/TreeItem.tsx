import React, { useState } from 'react';
import { TreeItemProps, DirectoryItem } from './types';

export default function TreeItem({
  item,
  selectedFiles,
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
    const isSelected = e.target.checked;
    if (item.type === 'directory') {
      onDirectorySelectionChange(item, isSelected);
    } else {
      onFileSelectionChange(item.path, isSelected);
    }
  };

  /**
   * Determines if a directory checkbox should be checked or indeterminate.
   * Recursively checks all children to compute state.
   * @param {DirectoryItem} dir - The directory item to check.
   * @returns {{ checked: boolean, indeterminate: boolean }} Checkbox state.
   */
  const getDirectoryCheckboxState = (
    dir: DirectoryItem,
  ): { checked: boolean; indeterminate: boolean } => {
    let allChecked = true;
    let someChecked = false;
    let hasFiles = false;

    /**
     * Recursively checks children to determine selection state.
     * @param {DirectoryItem} currentItem - The current item being checked.
     */
    const checkChildren = (currentItem: DirectoryItem) => {
      if (currentItem.type === 'file') {
        hasFiles = true;
        if (selectedFiles.has(currentItem.path)) {
          someChecked = true;
        } else {
          allChecked = false;
        }
      } else if (currentItem.children) {
        currentItem.children.forEach(checkChildren);
      }
    };

    if (dir.children) {
      dir.children.forEach(checkChildren);
    } else {
      allChecked = false; // Empty directory can't be fully checked
    }

    // If no files in directory/subdirs, it can't be checked/indeterminate
    if (!hasFiles) {
      return { checked: false, indeterminate: false };
    }

    return { checked: allChecked, indeterminate: someChecked && !allChecked };
  };

  if (item.type === 'directory') {
    const { checked, indeterminate } = getDirectoryCheckboxState(item);
    const headerId = `dir-header-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`; // Create unique ID
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
          <input
            type="checkbox"
            aria-labelledby={headerId}
            className="file-checkbox directory-checkbox"
            checked={checked}
            ref={(el) => {
              if (el) {
                el.indeterminate = indeterminate;
              }
            }}
            onChange={handleCheckboxChange}
          />
          <span id={`${headerId}-label`}>{item.name}</span>{' '}
        </div>
        <div
          className={`tree-directory-children ${isExpanded ? '' : 'collapsed'}`}
        >
          {item.children &&
            item.children.length > 0 &&
            item.children.map((child) => (
              <TreeItem
                key={child.path}
                item={child}
                selectedFiles={selectedFiles}
                onFileSelectionChange={onFileSelectionChange}
                onDirectorySelectionChange={onDirectorySelectionChange}
              />
            ))}
        </div>
      </div>
    );
  }

  const inputId = `file-checkbox-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return (
    <div className="tree-item tree-file">
      <label htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          className="file-checkbox"
          checked={selectedFiles.has(item.path)}
          onChange={handleCheckboxChange}
        />
        <span>{item.name}</span>
      </label>
    </div>
  );
}
