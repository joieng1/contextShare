/* eslint-disable no-console */
import React, { useEffect } from 'react';
import { usePromptStore } from './store/promptStore';

export default function PromptsManager() {
  const {
    prompts,
    selectedPrompt,
    currentPromptName,
    currentPromptContent,
    isLoading,
    error,
    copyButtonText,
    // Actions
    fetchPrompts,
    handleSelectPrompt,
    setCurrentPromptName,
    setCurrentPromptContent,
    handleNewPrompt,
    handleSavePrompt,
    handleDeletePrompt,
    handleCopyToClipboard,
  } = usePromptStore();

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return (
    <div
      className="prompts-manager"
      style={{ display: 'flex', gap: '20px', flexGrow: 1, padding: '20px' }}
    >
      <div
        className="prompt-list-column"
        style={{
          flex: 1,
          borderRight: '1px solid #ccc',
          paddingRight: '20px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 180px)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Saved Prompts</h2>
        <button
          type="button"
          onClick={handleNewPrompt}
          style={{ marginBottom: '10px' }}
        >
          + New Prompt
        </button>
        {isLoading && prompts.length === 0 && <p>Loading prompts...</p>}
        {!isLoading && prompts.length === 0 && !error && (
          <p>
            No prompts saved yet. Click &quot;+ New Prompt&quot; to create one.
          </p>
        )}
        {error && prompts.length === 0 && (
          <p style={{ color: 'red' }}>Error loading prompts: {error}</p>
        )}

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            overflowY: 'auto',
            flexGrow: 1,
          }}
        >
          {prompts.map((prompt) => (
            <li
              key={prompt.id}
              style={{
                marginBottom: '5px',
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectPrompt(prompt)}
                style={{
                  color: 'black',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor:
                    selectedPrompt?.id === prompt.id
                      ? '#e0e0e0'
                      : 'transparent',
                  borderBottom: '1px solid #eee',
                  borderRadius: '4px',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '3px' }}>
                  {prompt.name}
                </strong>
                <small style={{ color: '#555', fontSize: '0.8em' }}>
                  Updated: {new Date(prompt.updatedAt).toLocaleString()}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="prompt-editor-column"
        style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 180px)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {selectedPrompt ? 'Edit Prompt' : 'Create New Prompt'}
        </h2>

        {error && !isLoading && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            Error: {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Prompt Name"
          value={currentPromptName}
          onChange={(e) => setCurrentPromptName(e.target.value)}
          disabled={isLoading}
          style={{
            marginBottom: '10px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
        <textarea
          placeholder="Prompt Content..."
          value={currentPromptContent}
          onChange={(e) => setCurrentPromptContent(e.target.value)}
          disabled={isLoading}
          style={{
            flexGrow: 1,
            resize: 'none',
            marginBottom: '10px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            minHeight: '200px',
          }}
        />
        <div
          className="actions"
          style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}
        >
          <button
            type="button"
            onClick={handleSavePrompt}
            disabled={
              isLoading ||
              !currentPromptName.trim() ||
              !currentPromptContent.trim()
            }
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {isLoading &&
            (selectedPrompt || (!selectedPrompt && currentPromptName))
              ? 'Saving...'
              : 'Save'}
          </button>
          {selectedPrompt && (
            <button
              type="button"
              onClick={handleDeletePrompt}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            disabled={isLoading || !currentPromptContent}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {copyButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
