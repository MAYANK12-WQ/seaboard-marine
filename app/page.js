'use client';

import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

const DEFAULT_PROMPT = `You are an expert software analyst specializing in AS400/RPG to Reverse Engineering Document generation. Reverse Engineering Document is a specification document which contain high level program understanding and writes down everything into plain English for anybody to understand. It should also contain the pseudocode to drill into details. Create clear documentation that enables a developer to rewrite this RPG program in any other language without consulting the original code.

ANALYSIS REQUIREMENTS:

• Start with high-level program purpose, then drill into details
• For every section, provide both plain English explanation AND pseudocode
• Include complete backend field mappings with user interface and business logic
• Make it executable - detailed enough to code directly from
• Wherever you see the message code, get the exact message from the message list and use it in the pseudocode – "Message List". Even if you don't find some message code in the message list, give them in the messages section.

ANALYSIS INSTRUCTIONS:

1. Read the entire RPG program to understand its purpose
2. Break it into logical processing steps
3. For each step, explain what it does AND how it does it
4. Document all data movements and calculations
5. Include enough detail for a developer to rewrite it
6. Include all parameters for subroutines, do not exclude even a single parameter
7. If message file is referenced in a program file, write the step to refer it under validations
8. Include subroutine parameters under Detailed processing section as well if found
9. If display message is found for any message id then include display message text as well.
10. Under File Operation section, field definitions are below
   -FileName: Data File and fields from where the data is picked
   -Purpose: What is the usage of that file – input, output, update or input/output both
   -AccessType: whether this file contains any key or not
   -KeyFields: if key exists then check the key fields names, if dependency is on database the mention that under dependency section.
11. Data mapping field definitions –
   -SourceField: Data File Field from where the data is picked
   -TargetField: It could be a display file field name
   -TargetFileName: It should be the workstation file name or database file name
   -TransformNotes: Data manipulations applied while loading the data. If there is any option selection process such as edit, delete, print, then give all details under single process itself.
12. Carefully examine composite keys in the RPG program file then store it under "File Operations" section
13. Refer "source master" with the identified source file name under "F spec"

FORMATTING INSTRUCTIONS:
- Use clear headers and bullet points
- Include code blocks for pseudocode
- Use tables for data mappings
- Keep explanations concise but complete

Output should be in "RPG Migration Documentation". Template structure:

Section 1 - Program Overview
Program: [NAME]
Type: [Batch/Screen/Report]
Purpose: [What this program does in one sentence]
Input: [Parameters or screen inputs]
Output: [What program produces]
High-Level Logic: [Explain the overall business purpose in 2-3 sentences]

Section 2 – File Operations
Table format: FileName, Purpose, AccessType, KeyFields-KeyFieldType
Especially check primary, composite or any other such important key

Section 3 – Business Rules
Table format: RuleName, RuleDescription
Do Not include "Error indicator management" in this section
Include "Screen Filter Rules" in this section

Section 4 – Call Stack
The order of program calling with each program name and its sequence
Do Not include - **Command Execution:**, **Help Processing:**, **Exit Processing:**

Section 5 – Dependencies
The list of other programs, database files etc on which the execution of this file depends on.
Do not include **Help Text:** in this section

Section 6 – Screen Actions (if applicable)
If there is an option selection screen (Edit / Delete / Print / Add), document all possible options under the same process

Section 7 – Validations and Messages
Document all validations (field-level, record-level)
If a message file is used, describe the step and associated message IDs

Section 8 – Data Mappings
Table format: Source Database Field Name, equivalent Target Field Name, Target File Name and applied Transform Notes

Section 9 – Message Section
List all the messages with their code that are used in this file

Section 10 – Detailed Processing
Detailed Processing Steps
Step N: [Process Name]
Describe the logic or user interaction
Pseudocode should be described in not more than 50-70 lines
FUNCTION [step_n]()
    // Pseudocode logic here
END FUNCTION`;

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
          setUploadedFiles(prev => ({ ...prev, rpg: { name: file.name, type: 'text' } }));
        } else {
          setMessageList(text);
          setUploadedFiles(prev => ({ ...prev, msg: { name: file.name, type: 'text' } }));
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
        setUploadedFiles(prev => ({ ...prev, rpg: { name: file.name, type: 'image' } }));
      } else {
        setMessageList(extractedText);
        setUploadedFiles(prev => ({ ...prev, msg: { name: file.name, type: 'image' } }));
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
      alert('Please upload RPG code first (image or text file)');
      return;
    }

    setLoading(true);
    setDocumentation('');

    console.log('[Client] Starting AI documentation generation');
    console.log('[Client] Custom prompt length:', currentPrompt.length);
    const startTime = Date.now();

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
      const clientElapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response.ok) {
        console.log('[Client] Documentation generated successfully');
        console.log('[Client] Total time:', clientElapsedTime + 's');
        console.log('[Client] Server time:', data.timeTaken + 's');
        console.log('[Client] Tokens used:', data.tokensUsed);
        console.log('[Client] Model:', data.model);

        setDocumentation(data.documentation);

        alert(`Documentation Generated Successfully\n\nTime: ${data.timeTaken}s\nTokens: ${data.tokensUsed}\nModel: ${data.model}`);
      } else {
        console.error('[Client] Generation failed:', data.error);
        alert(`Error: ${data.error || 'Failed to generate documentation'}\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('[Client] Request failed:', error);
      alert(`Error: ${error.message}\n\nCheck your internet connection.`);
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

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Image Upload Button */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'rpg')}
                  className="file-input"
                  id="rpgImageUpload"
                  disabled={processingOCR.rpg}
                />
                <label htmlFor="rpgImageUpload" className="upload-button">
                  {processingOCR.rpg
                    ? `🔄 Processing... ${ocrProgress.rpg}%`
                    : uploadedFiles.rpg && uploadedFiles.rpg.type === 'image'
                    ? `✅ ${uploadedFiles.rpg.name} - Click to change`
                    : '📸 Upload Image (PNG, JPG)'}
                </label>
              </div>

              {/* Text File Upload Button */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => handleFileUpload(e, 'rpg')}
                  className="file-input"
                  id="rpgTextUpload"
                  disabled={processingOCR.rpg}
                />
                <label htmlFor="rpgTextUpload" className="upload-button" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)' }}>
                  {uploadedFiles.rpg && uploadedFiles.rpg.type === 'text'
                    ? `✅ ${uploadedFiles.rpg.name} - Click to change`
                    : '📄 Upload .txt File'}
                </label>
              </div>
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
