import React, { useState, useEffect } from 'react';
import { Plus, Link2, FileJson, Trash, ListPlus } from 'lucide-react';
import api from '../utils/api';

export default function AdminProblemManager() {
  const [problems, setProblems] = useState([]);
  const [contests, setContests] = useState([]);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'create' | 'map' | 'testcase'
  const [loading, setLoading] = useState(true);

  // Form states for creating a problem
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [difficulty, setDifficulty] = useState('EASY');

  // Form states for mapping a problem to a contest
  const [selectedContestId, setSelectedContestId] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [points, setPoints] = useState(100);

  // Form states for batch upload test cases
  const [tcProblemId, setTcProblemId] = useState('');
  const [testCasesJson, setTestCasesJson] = useState('[\n  {\n    "input": "5\\n",\n    "expectedOutput": "25\\n"\n  }\n]');

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [problemTestCases, setProblemTestCases] = useState([]);
  const [loadingTestCases, setLoadingTestCases] = useState(false);

  const handleSelectProblem = async (prob) => {
    setSelectedProblem(prob);
    setLoadingTestCases(true);
    try {
      const res = await api.get(`/api/admin/problems/${prob.id}/test-cases`);
      setProblemTestCases(res.data);
    } catch (err) {
      console.error(err);
      setProblemTestCases([]);
    } finally {
      setLoadingTestCases(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const probRes = await api.get('/api/admin/problems');
      setProblems(probRes.data);

      const contestRes = await api.get('/api/admin/contests');
      setContests(contestRes.data);
      if (contestRes.data.length > 0) setSelectedContestId(contestRes.data[0].id);
      if (probRes.data.length > 0) {
        setSelectedProblemId(probRes.data[0].id);
        setTcProblemId(probRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/problems', {
        title, description, constraints, inputFormat, outputFormat, difficulty
      });
      setTitle('');
      setDescription('');
      setConstraints('');
      setInputFormat('');
      setOutputFormat('');
      setDifficulty('EASY');
      setActiveView('list');
      fetchInitialData();
      alert('Problem created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create problem');
    }
  };

  const handleMapProblem = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/contests/${selectedContestId}/problems`, {
        problemId: Number(selectedProblemId),
        displayOrder: Number(displayOrder),
        points: Number(points)
      });
      alert('Problem mapped to contest successfully!');
      setActiveView('list');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to map problem');
    }
  };

  const handleBatchUploadTestCases = async (e) => {
    e.preventDefault();
    try {
      const parsedCases = JSON.parse(testCasesJson);
      await api.post(`/api/admin/problems/${tcProblemId}/test-cases/batch`, parsedCases);
      alert('Test cases batch uploaded successfully!');
      setActiveView('list');
    } catch (err) {
      alert('Failed: Make sure JSON is correct and valid list of objects.');
    }
  };

  const handleDeleteProblem = async (probId) => {
    if (!window.confirm('Delete problem from repository?')) return;
    try {
      await api.delete(`/api/admin/problems/${probId}`);
      fetchInitialData();
      alert('Problem deleted.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete problem');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Problem Repository</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create coding challenges, map to contests, and load test cases</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${activeView === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('list')}>List</button>
          <button className={`btn ${activeView === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('create')}><Plus size={14} /> Create</button>
          <button className={`btn ${activeView === 'map' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('map')}><Link2 size={14} /> Map</button>
          <button className={`btn ${activeView === 'testcase' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('testcase')}><FileJson size={14} /> Test Cases</button>
        </div>
      </div>

      {selectedProblem ? (
        <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedProblem.title}</h3>
              <span className={`badge ${selectedProblem.difficulty === 'EASY' ? 'badge-live' : selectedProblem.difficulty === 'MEDIUM' ? 'badge-upcoming' : 'badge-danger'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                {selectedProblem.difficulty}
              </span>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedProblem(null)}>
              Back to List
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</span>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6', marginTop: '0.25rem' }}>
                {selectedProblem.description}
              </p>
            </div>

            {selectedProblem.constraints && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Constraints</span>
                <pre style={{ margin: '0.25rem 0 0 0', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                  {selectedProblem.constraints}
                </pre>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {selectedProblem.inputFormat && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Input Format</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                    {selectedProblem.inputFormat}
                  </p>
                </div>
              )}
              {selectedProblem.outputFormat && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Output Format</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                    {selectedProblem.outputFormat}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Structured Test Cases ({problemTestCases.length})</h4>
            
            {loadingTestCases ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading test cases...</div>
            ) : problemTestCases.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                No test cases uploaded for this problem yet. Use the "Test Cases" tab above to upload.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {problemTestCases.map((tc, tcIdx) => (
                  <div key={tc.id || tcIdx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Test Case #{tcIdx + 1}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {tc.id}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Input:</div>
                        <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
                          {tc.input || '[Empty]'}
                        </pre>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Expected Output:</div>
                        <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
                          {tc.expectedOutput || '[Empty]'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {activeView === 'create' && (
            <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>New Problem</h3>
              <form onSubmit={handleCreateProblem}>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Two Sum" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the problem" style={{ minHeight: '80px', fontFamily: 'inherit' }} required />
                </div>
                <div className="form-group">
                  <label>Constraints</label>
                  <input type="text" className="input-field" value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g. 1 <= N <= 10^5" required />
                </div>
                <div className="form-group">
                  <label>Input Format</label>
                  <input type="text" className="input-field" value={inputFormat} onChange={(e) => setInputFormat(e.target.value)} placeholder="e.g. T testcases, each containing an array" required />
                </div>
                <div className="form-group">
                  <label>Output Format</label>
                  <input type="text" className="input-field" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} placeholder="e.g. Result index spaces" required />
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.95rem' }}>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary">Save Problem</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveView('list')}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {activeView === 'map' && (
            <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Link Problem to Contest</h3>
              <form onSubmit={handleMapProblem}>
                <div className="form-group">
                  <label>Select Contest</label>
                  <select value={selectedContestId} onChange={(e) => setSelectedContestId(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '4px' }}>
                    {contests.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Select Problem</label>
                  <select value={selectedProblemId} onChange={(e) => setSelectedProblemId(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '4px' }}>
                    {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input type="number" className="input-field" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Points</label>
                  <input type="number" className="input-field" value={points} onChange={(e) => setPoints(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Link to Contest</button>
              </form>
            </div>
          )}

          {activeView === 'testcase' && (
            <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Upload Batch Test Cases</h3>
              <form onSubmit={handleBatchUploadTestCases}>
                <div className="form-group">
                  <label>Select Problem</label>
                  <select value={tcProblemId} onChange={(e) => setTcProblemId(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '4px' }}>
                    {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Test Cases JSON (Array format)</label>
                  <textarea 
                    className="input-field" 
                    value={testCasesJson} 
                    onChange={(e) => setTestCasesJson(e.target.value)} 
                    style={{ minHeight: '180px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem' }}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Batch Upload</button>
              </form>
            </div>
          )}

          {activeView === 'list' && (
            <div className="glass-card">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading problems...</div>
              ) : problems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>No problems available. Create one to begin.</div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Difficulty</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>
                            <button 
                              onClick={() => handleSelectProblem(p)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                            >
                              {p.title}
                            </button>
                          </td>
                          <td>
                            <span className={`badge ${
                              p.difficulty === 'EASY' ? 'badge-live' : p.difficulty === 'MEDIUM' ? 'badge-upcoming' : 'badge-danger'
                            }`}>
                              {p.difficulty}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDeleteProblem(p.id)}>
                              <Trash size={12} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
