'use client';

import { useState } from 'react';

export default function Home() {
  const [rpgCode, setRpgCode] = useState('');
  const [messageList, setMessageList] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDocumentation = async () => {
    if (!rpgCode.trim()) {
      alert('Please enter RPG code');
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
        alert('Error: ' + (data.error || 'Failed to generate documentation'));
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
          <div className="form-group">
            <label htmlFor="rpgCode">
              <strong>RPG Program Code</strong>
              <span className="required">*</span>
            </label>
            <textarea
              id="rpgCode"
              value={rpgCode}
              onChange={(e) => setRpgCode(e.target.value)}
              placeholder="Paste your RPG program code here..."
              className="textarea"
              rows={12}
            />
          </div>

          <div className="form-group">
            <label htmlFor="messageList">
              <strong>Message List</strong>
              <span className="optional">(Optional)</span>
            </label>
            <textarea
              id="messageList"
              value={messageList}
              onChange={(e) => setMessageList(e.target.value)}
              placeholder="Paste your message list here (if applicable)..."
              className="textarea"
              rows={8}
            />
          </div>

          <button
            onClick={generateDocumentation}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '⏳ Generating Documentation...' : '📄 Generate Documentation'}
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
