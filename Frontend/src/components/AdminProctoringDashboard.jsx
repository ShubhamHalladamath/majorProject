import React, { useState, useEffect } from 'react';
import { CalendarRange, ShieldAlert, Monitor, Smartphone, RefreshCw, ChevronRight, Eye, User2 } from 'lucide-react';
import api from '../utils/api';
import AdminProctoringDetails from './AdminProctoringDetails';

export default function AdminProctoringDashboard() {
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    let interval;
    if (selectedContest && !selectedSessionId) {
      fetchStudents(selectedContest.id);
      // Poll student list status every 4 seconds to show live updates
      interval = setInterval(() => {
        fetchStudents(selectedContest.id, true);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedContest, selectedSessionId]);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/contests');
      setContests(res.data);
    } catch (err) {
      setError('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (contestId, silent = false) => {
    try {
      if (!silent) setPolling(true);
      const res = await api.get(`/api/proctoring/admin/sessions/contest/${contestId}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load student proctoring sessions:', err);
    } finally {
      setPolling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'var(--color-success)';
      case 'ENDED': return 'var(--text-secondary)';
      case 'MOBILE_CONNECTED': return 'var(--color-primary)';
      case 'CREATED': return 'var(--color-warning)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spinner" style={{ animation: 'spin 1.5s linear infinite', marginRight: '0.5rem' }} />
        Loading proctoring records...
      </div>
    );
  }

  if (selectedSessionId) {
    return (
      <AdminProctoringDetails 
        sessionId={selectedSessionId} 
        onBack={() => setSelectedSessionId(null)} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s' }}>
      
      {/* Contest Selector Header */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarRange size={20} style={{ color: 'var(--color-primary)' }} />
          Select Contest to Monitor
        </h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {contests.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedContest(c);
                setStudents([]);
              }}
              className={`btn ${selectedContest?.id === c.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              {c.title} ({c.status})
            </button>
          ))}
        </div>
      </div>

      {selectedContest && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Live Proctoring Feed: {selectedContest.title}</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status updates every 4s</span>
            </div>
            {polling && (
              <RefreshCw className="spinner" size={14} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--text-secondary)' }} />
            )}
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No active student proctoring sessions found for this contest.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Proctoring Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Photos</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Laptop Photo</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Mobile Photo</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Violations</th>
                    <th style={{ padding: '0.75rem 1rem' }}>AI Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.sessionId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User2 size={14} style={{ color: 'var(--text-secondary)' }} />
                        {st.studentUsername}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: getStatusColor(st.status), fontWeight: 700, fontSize: '0.85rem' }}>
                          {st.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        <strong>{st.photoCount}</strong> uploads
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {st.lastLaptopPhotoAt ? new Date(st.lastLaptopPhotoAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {st.lastMobilePhotoAt ? new Date(st.lastMobilePhotoAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {st.violationsCount > 0 ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: '4px', padding: '0.15rem 0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>
                            {st.violationsCount} Alert(s)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ 
                          color: st.aiStatus === 'SUSPICIOUS' ? 'var(--color-danger)' : st.aiStatus === 'CLEAR' ? 'var(--color-success)' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          {st.aiStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedSessionId(st.sessionId)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                        >
                          <Eye size={12} /> Inspect
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
    </div>
  );
}
