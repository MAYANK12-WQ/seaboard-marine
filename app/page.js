'use client';

import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

const DEFAULT_PROMPT = `You are an expert RPG/AS400 code analyzer. Your task is to analyze the provided RPG code and generate comprehensive reverse engineering documentation.

Include the following in your analysis:
1. Program Overview - Name, Type, Purpose, Input/Output
2. File Operations - All database files with access methods and key fields
3. Business Rules - Conditional logic and validation rules
4. Call Stack - Programs and subroutines called
5. Dependencies - External programs, files, and resources
6. Screen Actions - User interface interactions
7. Validations and Messages - Error handling and user messages
8. Data Mappings - Field transformations and data flow
9. Messages Used - All message IDs with text
10. Detailed Processing - Step-by-step logic with pseudocode

Provide clear, detailed documentation suitable for developers migrating this code to modern systems.`;

export default function Home() {
  const [rpgCode, setRpgCode] = useState('');
  const [messageList, setMessageList] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ rpg: 0, msg: 0 });
  const [processingOCR, setProcessingOCR] = useState({ rpg: false, msg: false });
  const [uploadedFiles, setUploadedFiles] = useState({ rpg: null, msg: null });
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [tempPrompt, setTempPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' or 'logger'
  const [promptHistory, setPromptHistory] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load prompt from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('rpg_prompt');
    if (savedPrompt) {
      setCurrentPrompt(savedPrompt);
    } else {
      setCurrentPrompt(DEFAULT_PROMPT);
      localStorage.setItem('rpg_prompt', DEFAULT_PROMPT);
    }

    // Load prompt history
    loadPromptHistory();
  }, []);

  const loadPromptHistory = () => {
    const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
    const sortedHistory = history.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    setPromptHistory(sortedHistory);
  };

  const processFile = async (file, type) => {
    if (!file) return;

    const fieldType = type === 'rpg' ? 'rpg' : 'msg';

    // Check if file is a text file
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      try {
        const text = await file.text();

        if (type === 'rpg') {
          setRpgCode(text);
          setUploadedFiles(prev => ({ ...prev, rpg: file.name }));
        } else {
          setMessageList(text);
          setUploadedFiles(prev => ({ ...prev, msg: file.name }));
        }

        alert(`✅ Text file loaded successfully!\nFile: ${file.name}`);
      } catch (error) {
        alert('Error reading text file: ' + error.message);
      }
      return;
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, etc.) or a .txt file');
      return;
    }

    // Process image with OCR
    setProcessingOCR(prev => ({ ...prev, [fieldType]: true }));
    setOcrProgress(prev => ({ ...prev, [fieldType]: 0 }));

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(prev => ({
                ...prev,
                [fieldType]: Math.round(m.progress * 100)
              }));
            }
          }
        }
      );

      const extractedText = result.data.text;

      if (type === 'rpg') {
        setRpgCode(extractedText);
        setUploadedFiles(prev => ({ ...prev, rpg: file.name }));
      } else {
        setMessageList(extractedText);
        setUploadedFiles(prev => ({ ...prev, msg: file.name }));
      }

      alert(`✅ Image processed successfully!\nFile: ${file.name}\nText extracted and ready for code generation.`);
    } catch (error) {
      alert('Error processing image: ' + error.message);
    } finally {
      setProcessingOCR(prev => ({ ...prev, [fieldType]: false }));
      setOcrProgress(prev => ({ ...prev, [fieldType]: 0 }));
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file, type);
    }
  };

  const handleEditPrompt = () => {
    setTempPrompt(currentPrompt);
    setIsEditingPrompt(true);
  };

  const handleSavePrompt = () => {
    if (tempPrompt.trim()) {
      // Save to localStorage
      localStorage.setItem('rpg_prompt', tempPrompt);
      setCurrentPrompt(tempPrompt);

      // Log the change
      const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        prompt: tempPrompt,
        action: 'updated'
      });
      localStorage.setItem('prompt_history', JSON.stringify(history));

      setIsEditingPrompt(false);
      loadPromptHistory(); // Refresh history display
      alert('✅ Prompt saved successfully!');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPrompt(false);
    setTempPrompt('');
  };

  const handleResetPrompt = () => {
    if (confirm('Are you sure you want to reset the prompt to default?')) {
      localStorage.setItem('rpg_prompt', DEFAULT_PROMPT);
      setCurrentPrompt(DEFAULT_PROMPT);

      // Log the reset
      const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        prompt: DEFAULT_PROMPT,
        action: 'reset'
      });
      localStorage.setItem('prompt_history', JSON.stringify(history));

      loadPromptHistory(); // Refresh history display
      alert('✅ Prompt reset to default!');
    }
  };

  const handleRestorePrompt = (prompt) => {
    if (confirm('Restore this prompt as the current system prompt?')) {
      localStorage.setItem('rpg_prompt', prompt);
      setCurrentPrompt(prompt);

      // Log the restoration
      const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        prompt: prompt,
        action: 'restored'
      });
      localStorage.setItem('prompt_history', JSON.stringify(history));

      loadPromptHistory(); // Refresh history display
      alert('✅ Prompt restored successfully!');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all prompt history? This action cannot be undone.')) {
      localStorage.setItem('prompt_history', '[]');
      setPromptHistory([]);
      setSelectedPrompt(null);
      alert('✅ History cleared successfully!');
    }
  };

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(promptHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateDocumentation = async () => {
    if (!rpgCode.trim()) {
      alert('Please upload an image of RPG code first');
      return;
    }

    setLoading(true);
    setDocumentation('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rpgCode,
          messageList,
          customPrompt: currentPrompt,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDocumentation(data.documentation);
      } else {
        alert('Error: ' + (data.error || 'Failed to generate code'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocumentation = () => {
    const blob = new Blob([documentation], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RPG_Migration_Documentation.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentation);
    alert('Documentation copied to clipboard!');
  };

  const filteredHistory = promptHistory.filter(entry =>
    entry.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <header className="header">
        <h1>🚢 Seaboard Marine</h1>
        <p className="subtitle">AS400/RPG to Reverse Engineering Document Generator</p>

        {/* Tab Navigation */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => setActiveTab('generator')}
            style={{
              background: activeTab === 'generator' ? 'white' : 'transparent',
              color: activeTab === 'generator' ? '#1e3c72' : 'white',
              border: '2px solid white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            📄 Code Generator
          </button>
          <button
            onClick={() => setActiveTab('logger')}
            style={{
              background: activeTab === 'logger' ? 'white' : 'transparent',
              color: activeTab === 'logger' ? '#1e3c72' : 'white',
              border: '2px solid white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            📝 Prompt History
          </button>
        </div>
      </header>

      <div className="content">{activeTab === 'generator' ? (
        // CODE GENERATOR TAB
        <>
        {/* Prompt Configuration Section */}
        <div className="input-section" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>
                <strong>System Prompt Configuration</strong>
                <span className="optional">(Used for documentation generation)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isEditingPrompt && (
                  <>
                    <button onClick={handleEditPrompt} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      ✏️ Edit Prompt
                    </button>
                    <button onClick={handleResetPrompt} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      🔄 Reset to Default
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditingPrompt ? (
              <div>
                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  className="textarea"
                  rows={12}
                  placeholder="Enter your custom prompt here..."
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button onClick={handleSavePrompt} className="btn-primary" style={{ flex: 1 }}>
                    💾 Save Prompt
                  </button>
                  <button onClick={handleCancelEdit} className="btn-secondary" style={{ flex: 1 }}>
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#f8f9fa',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1rem',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
                color: '#2c3e50'
              }}>
                {currentPrompt}
              </div>
            )}
          </div>
        </div>

        <div className="input-section">
          {/* RPG Code - Upload Images or Text Files */}
          <div className="form-group">
            <label htmlFor="rpgCode">
              <strong>RPG Program Code</strong>
              <span className="required">*</span>
            </label>

            <div className="upload-section">
              <input
                type="file"
                accept="image/*,.txt"
                onChange={(e) => handleFileUpload(e, 'rpg')}
                className="file-input"
                id="rpgImageUpload"
                disabled={processingOCR.rpg}
              />
              <label htmlFor="rpgImageUpload" className="upload-button">
                {processingOCR.rpg
                  ? `🔄 Processing... ${ocrProgress.rpg}%`
                  : uploadedFiles.rpg
                  ? `✅ ${uploadedFiles.rpg} - Click to change`
                  : '📸 Upload Image or 📄 .txt file of RPG Code'}
              </label>
            </div>
          </div>

          {/* Message List - Type Only */}
          <div className="form-group">
            <label htmlFor="messageList">
              <strong>Message List</strong>
              <span className="optional">(Optional)</span>
            </label>

            <textarea
              id="messageList"
              value={messageList}
              onChange={(e) => setMessageList(e.target.value)}
              placeholder="Paste message list here OR type custom instructions (e.g., 'Add more security details', 'Include error handling examples')..."
              className="textarea"
              rows={8}
            />
          </div>

          <button
            onClick={generateDocumentation}
            disabled={loading || processingOCR.rpg || !rpgCode}
            className="btn-primary"
          >
            {loading ? '⏳ Generating Code...' : '📄 Generate Code'}
          </button>
        </div>

        {documentation && (
          <div className="output-section">
            <div className="output-header">
              <h2>Generated Documentation</h2>
              <div className="button-group">
                <button onClick={copyToClipboard} className="btn-secondary">
                  📋 Copy
                </button>
                <button onClick={downloadDocumentation} className="btn-secondary">
                  💾 Download
                </button>
              </div>
            </div>
            <pre className="documentation-output">{documentation}</pre>
          </div>
        )}
        </>
      ) : (
        // PROMPT HISTORY LOGGER TAB
        <>
          <div className="input-section">
            {/* Controls */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  fontSize: '0.95rem'
                }}
              />
              <button onClick={handleExportHistory} className="btn-secondary" disabled={promptHistory.length === 0}>
                💾 Export History
              </button>
              <button onClick={handleClearHistory} className="btn-secondary" disabled={promptHistory.length === 0}>
                🗑️ Clear History
              </button>
            </div>

            {/* Stats */}
            <div style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong>Total Entries:</strong> {promptHistory.length}
              </div>
              <div>
                <strong>Updates:</strong> {promptHistory.filter(e => e.action === 'updated').length}
              </div>
              <div>
                <strong>Resets:</strong> {promptHistory.filter(e => e.action === 'reset').length}
              </div>
              <div>
                <strong>Restored:</strong> {promptHistory.filter(e => e.action === 'restored').length}
              </div>
            </div>

            {/* History List */}
            {filteredHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#95a5a6'
              }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
                <p style={{ fontSize: '1.2rem' }}>
                  {promptHistory.length === 0
                    ? 'No prompt history yet. Edit a prompt to see it logged here.'
                    : 'No results found for your search.'}
                </p>
              </div>
            ) : (
              <div>
                {filteredHistory.map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      background: selectedPrompt === index ? '#e8f4f8' : 'white',
                      border: '2px solid',
                      borderColor: selectedPrompt === index ? '#3498db' : '#e0e0e0',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedPrompt(selectedPrompt === index ? null : index)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{
                            background: entry.action === 'updated' ? '#3498db' : entry.action === 'reset' ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            {entry.action === 'updated' ? '✏️ Updated' : entry.action === 'reset' ? '🔄 Reset' : '↩️ Restored'}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestorePrompt(entry.prompt);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        ↩️ Restore
                      </button>
                    </div>

                    {selectedPrompt === index ? (
                      <div style={{
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        marginTop: '0.75rem'
                      }}>
                        {entry.prompt}
                      </div>
                    ) : (
                      <div style={{
                        color: '#7f8c8d',
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {entry.prompt.substring(0, 150)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </div>

      <footer className="footer">
        <p>© 2025 Seaboard Marine - Professional RPG Migration Services</p>
      </footer>
    </div>
  );
}
