'use client';

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export default function Home() {
  const [rpgCode, setRpgCode] = useState('');
  const [messageList, setMessageList] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ rpg: 0, msg: 0 });
  const [processingOCR, setProcessingOCR] = useState({ rpg: false, msg: false });
  const [uploadedFiles, setUploadedFiles] = useState({ rpg: null, msg: null });

  const processImage = async (file, type) => {
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, etc.)');
      return;
    }

    const fieldType = type === 'rpg' ? 'rpg' : 'msg';
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
      processImage(file, type);
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
      </header>

      <div className="content">
        <div className="input-section">
          {/* RPG Code - Upload Only */}
          <div className="form-group">
            <label htmlFor="rpgCode">
              <strong>RPG Program Code</strong>
              <span className="required">*</span>
            </label>

            <div className="upload-section">
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
                  : uploadedFiles.rpg
                  ? `✅ ${uploadedFiles.rpg} - Click to change`
                  : '📸 Upload Image of RPG Code'}
              </label>
            </div>
          </div>

          {/* Message List - Upload OR Type */}
          <div className="form-group">
            <label htmlFor="messageList">
              <strong>Message List</strong>
              <span className="optional">(Optional)</span>
            </label>

            <div className="upload-section">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'msg')}
                className="file-input"
                id="msgImageUpload"
                disabled={processingOCR.msg}
              />
              <label htmlFor="msgImageUpload" className="upload-button">
                {processingOCR.msg
                  ? `🔄 Processing... ${ocrProgress.msg}%`
                  : uploadedFiles.msg
                  ? `✅ ${uploadedFiles.msg} - Click to change`
                  : '📸 Upload Image of Message List (Optional)'}
              </label>
            </div>

            <textarea
              id="messageList"
              value={messageList}
              onChange={(e) => setMessageList(e.target.value)}
              placeholder="Or paste your message list here..."
              className="textarea"
              rows={8}
              disabled={processingOCR.msg}
            />
          </div>

          <button
            onClick={generateDocumentation}
            disabled={loading || processingOCR.rpg || processingOCR.msg || !rpgCode}
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
