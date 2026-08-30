import React, { useState, useEffect } from 'react';
import { Play, Send, CheckCircle, XCircle, Loader2, Code2 } from 'lucide-react';
import api from '../utils/api';

const LANGUAGES = [
  { id: 62, name: 'Java (JDK 17)' },
  { id: 71, name: 'Python (3.8.1)' },
  { id: 54, name: 'C++ (GCC 9.2.0)' },
  { id: 63, name: 'JavaScript (Node.js 12.14.0)' }
];

const DEFAULT_TEMPLATES = {
  62: `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
  71: `# Your code here\nimport sys\n\nfor line in sys.stdin:\n    # Read input line by line\n    pass`,
  54: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  63: `// Your code here\nconst readline = require('readline');`
};

export default function CodeEditor({ problemId, contestId }) {
  const [languageId, setLanguageId] = useState(62);
  const [sourceCode, setSourceCode] = useState(DEFAULT_TEMPLATES[62]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [judgingStatus, setJudgingStatus] = useState(null); // 'QUEUED' | 'JUDGING' | etc.
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(null);

  useEffect(() => {
    setSourceCode(DEFAULT_TEMPLATES[languageId]);
  }, [languageId]);

  // Clean state when problem changes
  useEffect(() => {
    setResults(null);
    setJudgingStatus(null);
    setSubmissionId(null);
    setSelectedTestCaseIdx(null);
  }, [problemId]);

  const handleSubmit = async () => {
    if (!sourceCode.trim()) {
      alert('Source code cannot be empty');
      return;
    }
    setSubmitting(true);
    setJudgingStatus('QUEUED');
    setResults(null);
    setError('');
    setSelectedTestCaseIdx(null);

    try {
      const res = await api.post('/api/submissions', {
        problemId,
        sourceCode,
        languageId,
        contestId
      });
      const subId = res.data.submissionId;
      setSubmissionId(subId);
      
      // Start polling
      pollSubmission(subId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit code');
      setSubmitting(false);
      setJudgingStatus(null);
    }
  };

  const pollSubmission = (subId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/submissions/${subId}`);
        const status = res.data.status;
        setJudgingStatus(status);

        if (status !== 'QUEUED' && status !== 'JUDGING') {
          // Finished judging!
          setResults(res.data);
          setSubmitting(false);
          clearInterval(interval);
        }
      } catch (err) {
        setError('Error polling submission results.');
        setSubmitting(false);
        clearInterval(interval);
      }
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED': return 'var(--color-success)';
      case 'WRONG_ANSWER': return 'var(--color-danger)';
      case 'COMPILATION_ERROR': return 'var(--color-warning)';
      case 'RUNTIME_ERROR': return 'var(--color-danger)';
      case 'TIME_LIMIT_EXCEEDED': return 'var(--color-warning)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor Options Bar */}
      <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Code2 size={16} style={{ color: 'var(--color-primary)' }} />
          <select 
            value={languageId} 
            onChange={(e) => setLanguageId(Number(e.target.value))}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}
          >
            {LANGUAGES.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}>
          {submitting ? (
            <>
              <Loader2 className="spinner" size={14} style={{ animation: 'spin 1s linear infinite' }} /> Judging ({judgingStatus})
            </>
          ) : (
            <>
              <Send size={14} /> Submit Code
            </>
          )}
        </button>
      </div>

      {/* Code Input Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <textarea
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.95rem',
            padding: '1.25rem',
            border: 'none',
            outline: 'none',
            resize: 'none'
          }}
        />
      </div>

      {/* Judging / Test Case Results Board */}
      {(judgingStatus || results || error) && (
        <div style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', padding: '1.25rem', maxHeight: '250px', overflowY: 'auto' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</div>}

          {submitting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <Loader2 className="spinner" style={{ animation: 'spin 1.5s linear infinite' }} size={16} />
              <span>Compiling and running against test cases... Status: <strong style={{ color: 'var(--color-warning)' }}>{judgingStatus}</strong></span>
            </div>
          )}

          {results && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem' }}>
                  Result: <span style={{ color: getStatusColor(results.status) }}>{results.status}</span>
                </h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Passed: <strong>{results.passed} / {results.total}</strong> | Score: <strong style={{ color: 'var(--color-accent)' }}>{results.score}</strong>
                </div>
              </div>

              {results.error && (
                <pre style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                  {results.error}
                </pre>
              )}

              {results.testCaseResults && results.testCaseResults.length > 0 && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {results.testCaseResults.map((tc, idx) => {
                      const isPassed = tc.status?.toUpperCase() === 'ACCEPTED';
                      const isSelected = selectedTestCaseIdx === idx;
                      return (
                        <button 
                          key={tc.id || idx}
                          onClick={() => setSelectedTestCaseIdx(idx)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: isSelected 
                              ? (isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')
                              : (isPassed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'),
                            border: '1px solid',
                            borderColor: isSelected
                              ? (isPassed ? 'var(--color-success)' : 'var(--color-danger)')
                              : (isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                            padding: '0.4rem 0.75rem', 
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontWeight: isSelected ? 600 : 400
                          }}
                          title={!isPassed && tc.message ? tc.message : undefined}
                        >
                          {isPassed ? <CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> : <XCircle size={14} style={{ color: 'var(--color-danger)' }} />}
                          <span style={{ fontWeight: 500 }}>TC #{idx + 1}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            ({isPassed ? 'Passed' : tc.status})
                          </span>
                          {tc.time !== null && tc.time !== undefined && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              | {(tc.time * 1000).toFixed(0)}ms
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Render test case comparison details */}
                  {selectedTestCaseIdx !== null && results.testCaseResults[selectedTestCaseIdx] && (() => {
                    const tc = results.testCaseResults[selectedTestCaseIdx];
                    return (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Test Case #{selectedTestCaseIdx + 1} Execution Details</h5>
                          <span style={{ fontSize: '0.8rem', color: tc.status?.toUpperCase() === 'ACCEPTED' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                            {tc.status} {tc.time !== null ? `(${ (tc.time * 1000).toFixed(0) }ms)` : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {tc.input !== undefined && tc.input !== null && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Input:</div>
                              <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
                                {tc.input || '[No Input]'}
                              </pre>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {tc.expectedOutput !== undefined && tc.expectedOutput !== null && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Expected Output:</div>
                                <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
                                  {tc.expectedOutput || '[No Output]'}
                                </pre>
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Your Output:</div>
                              <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', color: tc.status?.toUpperCase() === 'ACCEPTED' ? 'var(--color-success)' : 'var(--color-danger)', border: '1px solid var(--border-color)' }}>
                                {tc.stdout || '[No Output]'}
                              </pre>
                            </div>
                          </div>

                          {(tc.stderr || tc.message) && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginBottom: '0.2rem' }}>Error Details / Stderr:</div>
                              <pre style={{ margin: 0, padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-danger)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                {tc.stderr || tc.message}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Spinner Spin Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
