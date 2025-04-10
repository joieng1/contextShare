import React, { useState } from 'react';
import './App.css';

// --- Main App Component ---
export default function FileCompilerApp() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <div className="container">
      <header>
        <h1>File Compiler for Chatbot Context</h1>
        <p>Select files to compile into a single text file for LLM context</p>
      </header>

      <div className="controls">
        <button type="button" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Select Folder'}
        </button>
        <button type="button" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Compile Selected Files'}
        </button>
      </div>

      <div className="main-content">
        <div className="file-browser">
          <h2>Files</h2>
          <div id="file-tree">
            {isLoading && <div>Loading tree...</div>}
            {!isLoading && <div>Please select a folder.</div>}
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
          <div id="file-count">file(s) selected</div>
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
