import React, { useState, useEffect } from 'react';
import { Award, RefreshCw, Star } from 'lucide-react';
import api from '../utils/api';

export default function Leaderboard({ contestId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setError('');
      const res = await api.get(`/api/contests/${contestId}/leaderboard`);
      setRows(res.data);
    } catch (err) {
      setError('Failed to fetch leaderboard standings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [contestId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading leaderboard...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--color-danger)', padding: '1rem', textAlign: 'center' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time ranks and cumulative scores</span>
        <button className="btn btn-secondary" onClick={fetchLeaderboard} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No submissions yet. Be the first to solve!</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Participant</th>
                <th style={{ textAlign: 'center' }}>Problems Solved</th>
                <th style={{ textAlign: 'center' }}>Submissions</th>
                <th style={{ textAlign: 'center' }}>Last Action</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} style={{ background: row.rank === 1 ? 'rgba(168, 85, 247, 0.03)' : undefined }}>
                  <td>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      background: row.rank === 1 ? 'rgba(245, 158, 11, 0.2)' : row.rank === 2 ? 'rgba(154, 160, 185, 0.2)' : row.rank === 3 ? 'rgba(180, 83, 9, 0.15)' : 'transparent',
                      color: row.rank === 1 ? 'var(--color-warning)' : row.rank === 2 ? '#d1d5db' : row.rank === 3 ? '#b45309' : 'var(--text-primary)',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}>
                      {row.rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {row.username}
                      {row.rank === 1 && <Star size={12} style={{ color: 'var(--color-warning)', fill: 'var(--color-warning)' }} />}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{row.problemsSolved}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{row.submissionCount}</td>
                  <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {row.lastSubmissionTime ? new Date(row.lastSubmissionTime).toLocaleTimeString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem' }}>
                    {row.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
