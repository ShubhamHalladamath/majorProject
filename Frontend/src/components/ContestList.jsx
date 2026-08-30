import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Award, Play, Clock } from 'lucide-react';
import api from '../utils/api';

export default function ContestList() {
  const [contests, setContests] = useState([]);
  const [enrollments, setEnrollments] = useState({}); // maps contestId -> enrollment record
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchContests = async () => {
    try {
      const res = await api.get('/api/contests');
      setContests(res.data);
      
      // Load user enrollments from local storage or check dynamic enrollment mappings.
      // Usually, enrolling returns a state. We can track enrollments by calling the API if available, 
      // or check the participant info directly. In our case, we can try fetching contest details 
      // or enrollment states if we store them or when user clicks enroll.
    } catch (err) {
      setError('Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const handleEnroll = async (contestId) => {
    try {
      const res = await api.post(`/api/contests/${contestId}/enroll`);
      setEnrollments(prev => ({ ...prev, [contestId]: res.data }));
      fetchContests(); // Refresh status
      alert('Successfully enrolled!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to enroll');
    }
  };

  const handleStart = (contestId) => {
    navigate(`/contests/${contestId}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'LIVE':
        return <span className="badge badge-live">Live</span>;
      case 'UPCOMING':
        return <span className="badge badge-upcoming">Upcoming</span>;
      case 'ENDED':
        return <span className="badge badge-ended">Ended</span>;
      default:
        return <span className="badge badge-ended">{status}</span>;
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading contests...</div>;
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Active Coding Contests</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Enroll and compete to showcase your algorithmic skills on the scoreboard.</p>
      </div>

      {error && <div style={{ color: 'var(--color-danger)', marginBottom: '1.5rem' }}>{error}</div>}

      {contests.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No contests are available right now. Check back later!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {contests.map((contest) => {
            const startDate = new Date(contest.startTime).toLocaleString();
            const durationHrs = Math.floor(contest.duration / 60);
            const durationMins = contest.duration % 60;
            
            return (
              <div key={contest.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    {getStatusBadge(contest.status)}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {durationHrs}h {durationMins}m
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>{contest.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>
                    {contest.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', display: 'flex', justifyItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                      <span>Starts: {startDate}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  {contest.status === 'LIVE' && (
                    <>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleStart(contest.id)}>
                        <Play size={16} /> Enter Contest
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleEnroll(contest.id)}>
                        Enroll
                      </button>
                    </>
                  )}
                  {contest.status === 'UPCOMING' && (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleEnroll(contest.id)}>
                      Enroll Now
                    </button>
                  )}
                  {contest.status === 'ENDED' && (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/contests/${contest.id}`)}>
                      View Results
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
