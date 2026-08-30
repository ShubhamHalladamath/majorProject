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

      {showCreateForm ? (
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
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
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
