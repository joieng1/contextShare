import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import './App.css';
import TreeItem from './TreeItem';
import { DirectoryItem, DisplayDirectoryItem } from './types';
import PromptsManager from './PromptsManager';
import { useAppStore } from './store/appStore';

// --- Main App Component ---
export default function FileCompilerApp() {
  // Get state and actions from the Zustand store
  const {
    currentView,
    selectedFolder,
    directoryStructure,
    compiledContent,
    copyButtonText,
    saveButtonText,
    isLoading,
    error,
    selectionVersion,
    setCurrentView,
    setSelectedFolder,
    setDirectoryStructure,
    setCompiledContent,
    setCopyButtonText,
    setSaveButtonText,
    setIsLoading,
    setError,
    bumpSelectionVersion,
    resetSession,
  } = useAppStore();

  const selectionRef = useRef<Set<string>>(new Set());
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Memoized calculation of the display tree structure
  const displayDirectoryStructure = useMemo(() => {
    if (!directoryStructure) return null;

    const processItem = (
      originalItem: DirectoryItem,
      selectionSet: Set<string>,
    ): DisplayDirectoryItem => {
      const newItem: Partial<DisplayDirectoryItem> & {
        type: string;
        name: string;
        path: string;
        children?: DisplayDirectoryItem[];
      } = {
        type: originalItem.type,
        name: originalItem.name,
        path: originalItem.path,
      } as any;

      if (originalItem.type === 'file') {
        newItem.isSelected = selectionSet.has(originalItem.path);
      } else if (originalItem.type === 'directory') {
        newItem.hasFiles = false;
        let effectiveChildrenCountForCheckbox = 0;
        let checkedChildrenCount = 0;
        let partiallyCheckedChildrenCount = 0;

        if (originalItem.children && originalItem.children.length > 0) {
          newItem.children = originalItem.children.map((child) =>
            processItem(child, selectionSet),
          );

          // eslint-disable-next-line no-restricted-syntax
          for (const processedChild of newItem.children!) {
            if (processedChild.type === 'file') {
              newItem.hasFiles = true;
              effectiveChildrenCountForCheckbox += 1;
              if (processedChild.isSelected) {
                checkedChildrenCount += 1;
              }
            } else if (processedChild.type === 'directory') {
              if (processedChild.hasFiles) {
                newItem.hasFiles = true;
                effectiveChildrenCountForCheckbox += 1;
                if (processedChild.isChecked) {
                  checkedChildrenCount += 1;
                } else if (processedChild.isIndeterminate) {
                  partiallyCheckedChildrenCount += 1;
                }
              }
            }
          }
        }

        if (newItem.hasFiles) {
          if (partiallyCheckedChildrenCount > 0) {
            newItem.isChecked = false;
            newItem.isIndeterminate = true;
          } else if (
            effectiveChildrenCountForCheckbox > 0 &&
            checkedChildrenCount === effectiveChildrenCountForCheckbox
          ) {
            newItem.isChecked = true;
            newItem.isIndeterminate = false;
          } else if (
            checkedChildrenCount > 0 &&
            checkedChildrenCount < effectiveChildrenCountForCheckbox
          ) {
            newItem.isChecked = false;
            newItem.isIndeterminate = true;
          } else {
            newItem.isChecked = false;
            newItem.isIndeterminate = false;
          }
        } else {
          newItem.isChecked = false;
          newItem.isIndeterminate = false;
        }
      }
      return newItem as DisplayDirectoryItem;
    };

    return directoryStructure.map((item) =>
      processItem(item, selectionRef.current),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryStructure, selectionVersion, selectionRef]);

  /**
   * Handler for selecting a folder.
   * Opens a dialog to select folder, retrieves file strcuture
   * and updates the structure state
   */
  const handleSelectFolder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    resetSession(); // Reset relevant states
    selectionRef.current.clear();

    try {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        setSelectedFolder(folderPath);
        const structure =
          await window.electronAPI.getDirectoryStructure(folderPath);
        setDirectoryStructure(structure as DirectoryItem[]);
      }
    } catch (err: any) {
      setError(`Operation failed: ${err.message || err}`);
      setDirectoryStructure(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    setIsLoading,
    setError,
    resetSession,
    setSelectedFolder,
    setDirectoryStructure,
  ]);

  /**
   * Handler for selection or deselection of a file
   * @param {string} filePath - The path of the file to select/deselect.
   * @param {boolean} isSelected - Whether the file is selected.
   */
  const handleFileSelectionChange = useCallback(
    (filePath: string, isSelected: boolean) => {
      const sel = selectionRef.current;
      if (isSelected) {
        sel.add(filePath);
      } else {
        sel.delete(filePath);
      }
      bumpSelectionVersion();
    },
    [bumpSelectionVersion],
  );

  /**
   * Handler for the selection or deselection of an entire directory
   * @param {DirectoryItem} directory - The directory item to select/deselect.
   * @param {boolean} isSelected - Whether the directory is selected.
   */
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

      const sel = selectionRef.current;
      filesToUpdate.forEach((filePath) => {
        if (isSelected) {
          sel.add(filePath);
        } else {
          sel.delete(filePath);
        }
      });
      bumpSelectionVersion();
    },
    [bumpSelectionVersion],
  );

  /**
   * Compiles the contents of all selected files into a single string.
   * Reads each file, formats its content, and updates the compiledContent state.
   */
  const handleCompileFiles = useCallback(async () => {
    if (selectionRef.current.size === 0 || !selectedFolder) return;

    setIsLoading(true);
    setError(null);
    setCompiledContent('Compiling files...');

    try {
      const filePaths = Array.from(selectionRef.current || new Set()).sort();

      const result = await window.electronAPI.compileFilesWorker({
        files: filePaths,
        root: selectedFolder,
      });
      if (result && typeof result.compiledText === 'string') {
        setCompiledContent(result.compiledText);
      } else {
        setError(
          'Compilation completed but returned no content or an invalid format.',
        );
        setCompiledContent('');
      }
    } catch (err: any) {
      setError(`Error compiling files: ${err.message || err}`);
      setCompiledContent('');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, setIsLoading, setError, setCompiledContent]);

  /**
   * Handler copies context to clipboard.
   * Updates the button's text to show copy success or failiure.
   */
  const handleCopyToClipboard = useCallback(() => {
    if (!compiledContent) return;
    navigator.clipboard
      .writeText(compiledContent)
      .then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy to Clipboard'), 1500);
        return null;
      })
      .catch((err) => {
        setError(`Failed to copy: ${err}`);
      });
  }, [compiledContent, setCopyButtonText, setError]);

  /**
   * Handler for saving compiled content to a file.
   * Updates button text to show success or failiure.
   */
  const handleSaveToFile = useCallback(async () => {
    if (!compiledContent) return;
    setIsLoading(true); // Indicate saving process
    setError(null);
    try {
      await window.electronAPI.saveCompiledContent(compiledContent);
      setSaveButtonText('Saved!');
      setTimeout(() => setSaveButtonText('Save to File'), 1500);
    } catch (err: any) {
      setError(`Failed to save file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [compiledContent, setIsLoading, setError, setSaveButtonText]);

  /**
   * Effect to reset button text when compiled content changes
   */
  useEffect(() => {
    setCopyButtonText('Copy to Clipboard');
    setSaveButtonText('Save to File');
    if (textRef.current) textRef.current.value = compiledContent;
  }, [compiledContent, setCopyButtonText, setSaveButtonText]);

  const fileCount = selectionRef.current.size;
  const canCompile = fileCount > 0;
  const canCopyOrSave =
    compiledContent.length > 0 && compiledContent !== 'Compiling files...';

  const getSelectFolderButtonText = () => {
    if (isLoading && !selectedFolder) {
      return 'Loading Folder...';
    }
    if (selectedFolder) {
      return 'Change Folder';
    }
    return 'Select Folder';
  };

  return (
    <div className="container">
      <header>
        <h1>ContextShare</h1> {/* Main app title */}
        <div className="view-switcher">
          <button
            type="button"
            onClick={() => setCurrentView('files')}
            disabled={currentView === 'files'}
            style={{ marginRight: '10px' }}
          >
            File Compiler
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('prompts')}
            disabled={currentView === 'prompts'}
          >
            Prompts Manager
          </button>
        </div>
      </header>
      <main className="content-area">
        {currentView === 'files' && (
          <>
            <div className="controls">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isLoading}
              >
                {getSelectFolderButtonText()}
              </button>
              <button
                type="button"
                onClick={handleCompileFiles}
                disabled={!canCompile || isLoading}
              >
                {isLoading && compiledContent === 'Compiling files...'
                  ? 'Compiling...'
                  : 'Compile Selected Files'}
              </button>
              {selectedFolder && (
                <div id="selected-folder-display">
                  Selected: {selectedFolder}
                </div>
              )}
            </div>
            {error && (
              <div style={{ color: 'red', marginBottom: '10px' }}>
                Error: {error}
              </div>
            )}
            <div className="main-content">
              <div className="file-browser">
                <h2>Files</h2>
                <div id="file-tree">
                  {isLoading && <div>Loading tree...</div>}
                  {!isLoading && !selectedFolder && (
                    <div>Please select a folder.</div>
                  )}
                  {!isLoading &&
                    selectedFolder &&
                    displayDirectoryStructure &&
                    displayDirectoryStructure.length > 0 &&
                    displayDirectoryStructure.map((item) => (
                      <TreeItem
                        key={item.path}
                        item={item}
                        onFileSelectionChange={handleFileSelectionChange}
                        onDirectorySelectionChange={
                          handleDirectorySelectionChange
                        }
                      />
                    ))}
                  {/* If !isLoading, selectedFolder is true, but displayDirectoryStructure is null/empty
                      AND error is null, nothing specific is shown here. The general error display
                      (already conditioned with !isLoading) handles error messages. */}
                </div>
              </div>

              <div className="compiled-content">
                <h2>Compiled Output</h2>
                <div className="actions">
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    disabled={!canCopyOrSave || isLoading}
                  >
                    {copyButtonText}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToFile}
                    disabled={!canCopyOrSave || isLoading}
                  >
                    {/* Text for save button based on current App.tsx logic for consistency */}
                    {isLoading &&
                    compiledContent &&
                    compiledContent !== 'Compiling files...'
                      ? 'Saving...'
                      : saveButtonText}
                  </button>
                </div>
                <div id="file-count">{fileCount} file(s) selected</div>
                <textarea
                  ref={textRef}
                  id="compiled-output"
                  readOnly
                  defaultValue={compiledContent}
                  placeholder={isLoading ? 'Processing...' : ''}
                />
              </div>
            </div>
          </>
        )}
        {currentView === 'prompts' && <PromptsManager />}
      </main>
    </div>
  );
}
