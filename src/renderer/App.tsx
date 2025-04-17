import React, { useCallback, useState } from 'react';
import './App.css';
import TreeItem from './TreeItem';
import { DirectoryItem } from './types';

// --- Main App Component ---
export default function FileCompilerApp() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [directoryStructure, setDirectoryStructure] = useState<
    DirectoryItem[] | null
  >(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  /**
   * Handler for selecting a folder
   *
   */
  const handleSelectFolder = useCallback(async () => {
    setIsLoading(true);
    setDirectoryStructure(null);
    setError(null);
    try {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        setSelectedFolder(folderPath);
        const structureResult =
          await window.electronAPI.getDirectoryStructure(folderPath);
        if ('error' in structureResult) {
          setError(
            `Error getting directory structure: ${structureResult.error}`,
          );
          setDirectoryStructure(null);
        } else {
          setDirectoryStructure(structureResult);
        }
      }
    } catch (err: any) {
      setError(`Error selecting folder: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelectionChange = useCallback(
    (filePath: string, isSelected: boolean) => {
      setSelectedFiles((prevSelected) => {
        const newSelected = new Set(prevSelected);
        if (isSelected) {
          newSelected.add(filePath);
        } else {
          newSelected.delete(filePath);
        }
        return newSelected;
      });
    },
    [],
  );

  const handleDirectorySelectionChange = useCallback(
    (directory: DirectoryItem, isSelected: boolean) => {
      const filesToUpdate = new Set<string>();

      const collectFiles = (item: DirectoryItem) => {
        if (item.type === 'file') {
          filesToUpdate.add(item.path);
        } else if (item.children) {
          item.children.forEach(collectFiles);
        }
      };

      collectFiles(directory);

      setSelectedFiles((prevSelected) => {
        const newSelected = new Set(prevSelected);
        filesToUpdate.forEach((filePath) => {
          if (isSelected) {
            newSelected.add(filePath);
          } else {
            newSelected.delete(filePath);
          }
        });
        return newSelected;
      });
    },
    [],
  );

  const fileCount = selectedFiles.size;

  return (
    <div className="container">
      <header>
        <h1>File Compiler for Chatbot Context</h1>
        <p>Select files to compile into a single text file for LLM context</p>
      </header>

      <div className="controls">
        <button type="button" onClick={handleSelectFolder} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Select Folder'}
        </button>
        <button type="button" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Compile Selected Files'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>
      )}

      <div className="main-content">
        <div className="file-browser">
          <h2>Files</h2>
          <div id="file-tree">
            {isLoading && <div>Loading tree...</div>}
            {!isLoading && <div>Please select a folder.</div>}
            {directoryStructure &&
              directoryStructure.length > 0 &&
              directoryStructure.map((item) => (
                <TreeItem
                  key={item.path}
                  item={item}
                  selectedFiles={selectedFiles || new Set()}
                  onFileSelectionChange={handleFileSelectionChange}
                  onDirectorySelectionChange={handleDirectorySelectionChange}
                />
              ))}
            {!isLoading && selectedFolder && !directoryStructure && !error && (
              <div>Could not load directory structure.</div>
            )}
          </div>
        </div>

        <div className="compiled-content">
          <h2>Compiled Output</h2>
          <div className="actions">
            <button type="button" disabled={!isLoading}>
              Copy to Clipboard
            </button>
            <button type="button" disabled={isLoading}>
              Save to File
            </button>
          </div>
          <div id="file-count">{fileCount} file(s) selected</div>
          <textarea
            id="compiled-output"
            readOnly
            placeholder={isLoading ? 'Processing...' : ''}
          />
        </div>
      </div>
    </div>
  );
}
