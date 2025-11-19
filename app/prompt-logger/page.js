'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PromptLogger() {
  const [promptHistory, setPromptHistory] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load prompt history from localStorage
    const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
    // Sort by timestamp descending (newest first)
    const sortedHistory = history.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    setPromptHistory(sortedHistory);
  }, []);

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

  const handleRestorePrompt = (prompt) => {
    if (confirm('Restore this prompt as the current system prompt?')) {
      localStorage.setItem('rpg_prompt', prompt);

      // Log the restoration
      const history = JSON.parse(localStorage.getItem('prompt_history') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        prompt: prompt,
        action: 'restored'
      });
      localStorage.setItem('prompt_history', JSON.stringify(history));

      alert('✅ Prompt restored successfully! Return to the main page to see the changes.');
    }
  };

  const filteredHistory = promptHistory.filter(entry =>
    entry.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <header className="header">
        <h1>📝 Prompt Edit History</h1>
        <p className="subtitle">Track all changes to your system prompts</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ color: 'white', textDecoration: 'underline', fontSize: '0.9rem' }}>
            ← Back to Main Page
          </Link>
        </div>
      </header>

      <div className="content">
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
                      Restore
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
      </div>

      <footer className="footer">
        <p>© 2025 Seaboard Marine - Professional RPG Migration Services</p>
      </footer>
    </div>
  );
}
