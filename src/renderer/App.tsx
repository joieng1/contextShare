import React, { useCallback, useEffect, useState } from 'react';
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
  const [compiledContent, setCompiledContent] = useState<string>('');
  const [copyButtonText, setCopyButtonText] =
    useState<string>('Copy to Clipboard');
  const [saveButtonText, setSaveButtonText] = useState<string>('Save to File');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handler for selecting a folder.
   * Opens a dialog to select folder, retrieves file strcuture
   * and updates the structure state
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

  /**
   * Handler for selection or deselection of a file
   * @param {string} filePath - The path of the file to select/deselect.
   * @param {boolean} isSelected - Whether the file is selected.
   */
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

  /**
   * Compiles the contents of all selected files into a single string.
   * Reads each file, formats its content, and updates the compiledContent state.
   */
  const handleCompileFiles = useCallback(async () => {
    if (selectedFiles.size === 0 || !selectedFolder) return;

    setIsLoading(true);
    setError(null);
    setCompiledContent('Compiling files...');

    try {
      // Sort for consistent order
      const filePaths = Array.from(selectedFiles || new Set()).sort();

      // Read files concurrently
      const results = await Promise.all(
        filePaths.map(async (filePath) => {
          const result = await window.electronAPI.readFile(filePath);
          return { filePath, result };
        }),
      );

      let compiledText = '';
      results.forEach(({ filePath, result }) => {
        if (typeof result === 'string') {
          const relativePath = filePath
            .replace(selectedFolder, '')
            .replace(/^[/\\]/, ''); // Make path relative
          compiledText += `"${relativePath}"\n\n\n`;
          compiledText += `${result}\n`;
          compiledText += '******** END OF FILE **********\n\n';
        } else {
          // Handle error for specific file
          compiledText += `// Error reading file: ${filePath}\n// ${result.error}\n\n`;
        }
      });

      setCompiledContent(compiledText);
    } catch (err: any) {
      setError(`Error compiling files: ${err.message || err}`);
      setCompiledContent(''); // Clear content on error
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, selectedFolder]);

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
  }, [compiledContent]);

  /**
   * Handler for saving compiled content to a file.
   * Updates button text to show success or failiure.
   */
  const handleSaveToFile = useCallback(async () => {
    if (!compiledContent) return;
    setIsLoading(true); // Indicate saving process
    setError(null);
    try {
      const result =
        await window.electronAPI.saveCompiledContent(compiledContent);
      if (result.success) {
        setSaveButtonText('Saved!');
        setTimeout(() => setSaveButtonText('Save to File'), 1500);
      } else {
        setError(`Failed to save file: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(`Error saving file: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, [compiledContent]);

  /**
   * Effect to reset button text when compiled content changes
   */
  useEffect(() => {
    setCopyButtonText('Copy to Clipboard');
    setSaveButtonText('Save to File');
  }, [compiledContent]);

  const fileCount = selectedFiles.size;
  const canCopyOrSave =
    compiledContent.length > 0 && compiledContent !== 'Compiling files...';

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
        <button type="button" onClick={handleCompileFiles} disabled={isLoading}>
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
              {isLoading && !canCopyOrSave ? 'Saving...' : saveButtonText}
            </button>
          </div>
          <div id="file-count">{fileCount} file(s) selected</div>
          <textarea
            id="compiled-output"
            readOnly
            value={compiledContent}
            placeholder={isLoading ? 'Processing...' : ''}
          />
        </div>
      </div>
    </div>
  );
}
