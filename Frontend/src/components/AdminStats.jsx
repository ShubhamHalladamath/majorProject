import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Users, Code, Activity, Award } from 'lucide-react';
import api from '../utils/api';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminStats() {
  const [contests, setContests] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const res = await api.get('/api/admin/contests');
      setContests(res.data);
      if (res.data.length > 0) {
        setSelectedContestId(res.data[0].id);
        fetchStats(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async (contestId) => {
    if (!contestId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/admin/contests/${contestId}/statistics`);
      setStats(res.data);
    } catch (err) {
      setError('No live statistics available for this contest.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleContestChange = (e) => {
    const id = e.target.value;
    setSelectedContestId(id);
    fetchStats(id);
  };

  // Build Chart Data
  const getChartData = () => {
    if (!stats || !stats.submissionsBreakdown) return null;
    const labels = Object.keys(stats.submissionsBreakdown);
    const data = Object.values(stats.submissionsBreakdown);
    
    return {
      labels,
      datasets: [
        {
          label: 'Submissions Count',
          data,
          backgroundColor: [
            'rgba(99, 102, 241, 0.6)', // QUEUED
            'rgba(245, 158, 11, 0.6)', // JUDGING
            'rgba(16, 185, 129, 0.6)', // ACCEPTED
            'rgba(239, 68, 68, 0.6)',  // WRONG_ANSWER
            'rgba(220, 38, 38, 0.6)',  // RUNTIME_ERROR
            'rgba(217, 119, 6, 0.6)',  // COMPILATION_ERROR
            'rgba(245, 158, 11, 0.6)', // TIME_LIMIT_EXCEEDED
            'rgba(156, 163, 175, 0.6)' // INTERNAL_ERROR
          ],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Submission Status Breakdown', color: '#9aa0b9' }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9aa0b9' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9aa0b9' }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Monitoring</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time statistics of code submissions and active users</p>
        </div>

        <select 
          value={selectedContestId} 
          onChange={handleContestChange} 
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem 1rem', borderRadius: '4px', fontSize: '0.9rem' }}
        >
          <option value="">-- Select Contest --</option>
          {contests.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading live statistics...</div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{error}</div>
      ) : stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalEnrolled}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Enrolled Students</div>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <Activity size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalActive}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Competitors</div>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-accent)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <Code size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalSubmissions}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Submissions</div>
              </div>
            </div>
          </div>

          {/* Bar Chart breakdown */}
          {getChartData() && (
            <div className="glass-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
              <Bar data={getChartData()} options={chartOptions} />
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Select a contest above to monitor stats.</div>
      )}
    </div>
  );
}
