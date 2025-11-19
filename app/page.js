'use client';

import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Link from 'next/link';

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

  // Load prompt from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('rpg_prompt');
    if (savedPrompt) {
      setCurrentPrompt(savedPrompt);
    } else {
      setCurrentPrompt(DEFAULT_PROMPT);
      localStorage.setItem('rpg_prompt', DEFAULT_PROMPT);
    }
  }, []);

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
      const promptHistory = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      promptHistory.push({
        timestamp: new Date().toISOString(),
        prompt: tempPrompt,
        action: 'updated'
      });
      localStorage.setItem('prompt_history', JSON.stringify(promptHistory));

      setIsEditingPrompt(false);
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
      const promptHistory = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      promptHistory.push({
        timestamp: new Date().toISOString(),
        prompt: DEFAULT_PROMPT,
        action: 'reset'
      });
      localStorage.setItem('prompt_history', JSON.stringify(promptHistory));

      alert('✅ Prompt reset to default!');
    }
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

  return (
    <div className="container">
      <header className="header">
        <h1>🚢 Seaboard Marine</h1>
        <p className="subtitle">AS400/RPG to Reverse Engineering Document Generator</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/prompt-logger" style={{ color: 'white', textDecoration: 'underline', fontSize: '0.9rem' }}>
            📝 View Prompt Edit History
          </Link>
        </div>
      </header>

      <div className="content">
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
      </div>

      <footer className="footer">
        <p>© 2025 Seaboard Marine - Professional RPG Migration Services</p>
      </footer>
    </div>
  );
}
