import React, { useState, useEffect } from 'react';
import { Plus, Trash, Globe, Ban, Edit3, Calendar } from 'lucide-react';
import api from '../utils/api';

export default function AdminContestManager() {
  const [contests, setContests] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(120);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedContestProblems, setSelectedContestProblems] = useState([]);
  const [problemTestCases, setProblemTestCases] = useState({}); // { problemId: [testcases] }
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleSelectContest = async (contest) => {
    setSelectedContest(contest);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/contests/${contest.id}/problems`);
      setSelectedContestProblems(res.data);
      
      const tcPromises = res.data.map(async (p) => {
        try {
          const tcRes = await api.get(`/api/admin/problems/${p.problemId}/test-cases`);
          return { problemId: p.problemId, testCases: tcRes.data };
        } catch (e) {
          console.error(e);
          return { problemId: p.problemId, testCases: [] };
        }
      });
      const tcResults = await Promise.all(tcPromises);
      const tcMap = {};
      tcResults.forEach(r => {
        tcMap[r.problemId] = r.testCases;
      });
      setProblemTestCases(tcMap);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch contest details and problems');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/contests');
      setContests(res.data);
    } catch (err) {
      setError('Failed to fetch contests list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const handleCreateContest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/contests', {
        title,
        description,
        startTime,
        endTime,
        duration: Number(duration)
      });
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setDuration(120);
      setShowCreateForm(false);
      fetchContests();
      alert('Contest created successfully in DRAFT state!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create contest');
    }
  };

  const handlePublish = async (contestId) => {
    try {
      await api.post(`/api/admin/contests/${contestId}/publish`);
      fetchContests();
      alert('Contest successfully published!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish contest');
    }
  };

  const handleCancel = async (contestId) => {
    try {
      await api.post(`/api/admin/contests/${contestId}/cancel`);
      fetchContests();
      alert('Contest has been cancelled!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel contest');
    }
  };

  const handleDelete = async (contestId) => {
    if (!window.confirm('Are you sure you want to delete this contest permanently?')) return;
    try {
      await api.delete(`/api/admin/contests/${contestId}`);
      fetchContests();
      alert('Contest deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete contest');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Contests</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Schedule and manage the contest lifecycle</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus size={16} /> {showCreateForm ? 'View All Contests' : 'New Contest'}
        </button>
      </div>

      {selectedContest ? (
        <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{selectedContest.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Status: <span className={`badge ${selectedContest.status === 'LIVE' ? 'badge-live' : selectedContest.status === 'UPCOMING' ? 'badge-upcoming' : 'badge-ended'}`}>{selectedContest.status}</span>
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedContest(null)}>
              Back to All Contests
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</h4>
            <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-line', lineHeight: '1.6' }}>{selectedContest.description}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Time</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>{new Date(selectedContest.startTime).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>End Time</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>{new Date(selectedContest.endTime).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Duration</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>{selectedContest.duration} minutes</div>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.1rem' }}>
              Mapped Problems ({selectedContestProblems.length})
            </h4>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading problems and test cases...</div>
            ) : selectedContestProblems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                No problems mapped to this contest yet. Use the Problem Bank to map problems.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {selectedContestProblems.map((prob, idx) => {
                  const tcs = problemTestCases[prob.problemId] || [];
                  return (
                    <div key={prob.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>Problem #{idx + 1} (Order: {prob.displayOrder})</span>
                          <h5 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>{prob.title}</h5>
                        </div>
                        <span style={{ fontSize: '0.85rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          {prob.points} Points
                        </span>
                      </div>

                      <div style={{ padding: '1rem' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</span>
                          <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', marginTop: '0.25rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {prob.description}
                          </p>
                        </div>

                        {prob.constraints && (
                          <div style={{ marginBottom: '1.25rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Constraints</span>
                            <pre style={{ margin: '0.25rem 0 0 0', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                              {prob.constraints}
                            </pre>
                          </div>
                        )}

                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Structured Test Cases ({tcs.length})</span>
                          {tcs.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                              No test cases uploaded for this problem yet.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                              {tcs.map((tc, tcIdx) => (
                                <div key={tc.id || tcIdx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.75rem' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Test Case #{tcIdx + 1}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Input:</div>
                                      <pre style={{ margin: 0, padding: '0.4rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
                                        {tc.input || '[Empty]'}
                                      </pre>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Expected Output:</div>
                                      <pre style={{ margin: 0, padding: '0.4rem', background: 'var(--bg-tertiary)', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : showCreateForm ? (
        <div className="glass-card" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Create New Contest</h3>
          <form onSubmit={handleCreateContest}>
            <div className="form-group">
              <label>Contest Title</label>
              <input 
                type="text" 
                className="input-field" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Weekly Challenge #1" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="input-field" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Details about constraints, guidelines..." 
                style={{ minHeight: '80px', fontFamily: 'inherit' }}
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label><Calendar size={12} /> Start Time</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label><Calendar size={12} /> End Time</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Duration (Minutes)</label>
              <input 
                type="number" 
                className="input-field" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary">Save as Draft</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        /* Contests Table list */
        <div className="glass-card">
          {error && <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading contests...</div>
          ) : contests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No contests scheduled yet.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>
                        <button 
                          onClick={() => handleSelectContest(c)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                        >
                          {c.title}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(c.startTime).toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.duration} mins</td>
                      <td>
                        <span className={`badge ${
                          c.status === 'LIVE' ? 'badge-live' : c.status === 'UPCOMING' ? 'badge-upcoming' : 'badge-ended'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {c.status === 'DRAFT' && (
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handlePublish(c.id)}>
                              <Globe size={12} /> Publish
                            </button>
                          )}
                          {c.status !== 'CANCELLED' && c.status !== 'ENDED' && (
                            <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleCancel(c.id)}>
                              <Ban size={12} /> Cancel
                            </button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleDelete(c.id)}>
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
