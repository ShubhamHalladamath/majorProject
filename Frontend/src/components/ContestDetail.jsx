import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Send, Award, List, Code, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import CodeEditor from './CodeEditor';
import Leaderboard from './Leaderboard';

export default function ContestDetail() {
  const { contestId } = useParams();
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'submissions' | 'leaderboard'
  const [timeRemaining, setTimeRemaining] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    fetchContestData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [contestId]);

  const fetchContestData = async () => {
    try {
      setLoading(true);
      const contestRes = await api.get(`/api/contests/${contestId}`);
      setContest(contestRes.data);
      
      const problemsRes = await api.get(`/api/contests/${contestId}/problems`);
      setProblems(problemsRes.data);
      if (problemsRes.data.length > 0) {
        setSelectedProblem(problemsRes.data[0]);
      }
      
      try {
        const enrollRes = await api.get(`/api/contests/${contestId}/enrollment`);
        setEnrollment(enrollRes.data);
        
        if (enrollRes.data.startedAt) {
          const startMs = new Date(enrollRes.data.startedAt).getTime();
          const durationMs = contestRes.data.duration * 60 * 1000;
          const personalEnd = new Date(startMs + durationMs);
          const absoluteEnd = new Date(contestRes.data.endTime);
          
          const targetEnd = personalEnd < absoluteEnd ? personalEnd : absoluteEnd;
          startTimer(targetEnd);
        } else {
          setTimeRemaining('Not Started');
        }
      } catch (e) {
        setEnrollment(null);
        setTimeRemaining('Not Enrolled');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contest details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartContest = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/api/contests/${contestId}/start`);
      setEnrollment(res.data);
      
      const startMs = new Date(res.data.startedAt).getTime();
      const durationMs = contest.duration * 60 * 1000;
      const personalEnd = new Date(startMs + durationMs);
      const absoluteEnd = new Date(contest.endTime);
      
      const targetEnd = personalEnd < absoluteEnd ? personalEnd : absoluteEnd;
      startTimer(targetEnd);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start contest');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (targetEndTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const calculateTime = () => {
      const difference = new Date(targetEndTime) - new Date();
      if (difference <= 0) {
        setTimeRemaining('Contest Ended');
        clearInterval(timerRef.current);
        return;
      }
      
      const hrs = Math.floor((difference / (1000 * 60 * 60)));
      const mins = Math.floor((difference / 1000 / 60) % 60);
      const secs = Math.floor((difference / 1000) % 60);
      
      setTimeRemaining(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    calculateTime();
    timerRef.current = setInterval(calculateTime, 1000);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading contest workspace...</div>;
  }

  if (error) {
    return (
      <div className="main-content" style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div style={{ color: 'var(--color-danger)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>{error}</div>
        <Link to="/contests" className="btn btn-secondary"><ArrowLeft size={16} /> Back to Contests</Link>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', animation: 'slideUp 0.3s' }}>
          <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.75rem' }}>Not Enrolled</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            You need to register/enroll in this contest before you can view problems or make submissions.
          </p>
          <Link to="/contests" className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>Back</Link>
          <button className="btn btn-primary" onClick={async () => {
            try {
              await api.post(`/api/contests/${contestId}/enroll`);
              fetchContestData();
            } catch (err) {
              alert(err.response?.data?.message || 'Enrollment failed');
            }
          }}>Enroll Now</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'problem' && !enrollment.startedAt) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/contests" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></Link>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.1rem' }}>{contest.title}</h2>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>{contest.status}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s' }}>
            <Clock size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.75rem' }}>Ready to Begin?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Your timer will begin as soon as you enter the contest workspace. You will have exactly <strong>{contest.duration} minutes</strong> to solve the problems.
            </p>
            <button className="btn btn-primary" style={{ padding: '0.85rem 2rem' }} onClick={handleStartContest}>
              Enter & Start Timer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Workspace Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/contests" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></Link>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.1rem' }}>{contest.title}</h2>
            <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>{contest.status}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Clock size={16} style={{ color: 'var(--color-warning)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--color-warning)' }}>{timeRemaining}</span>
          </div>
          
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button className={`btn ${activeTab === 'problem' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: activeTab !== 'problem' ? 'transparent' : undefined }} onClick={() => setActiveTab('problem')}>
              <Code size={14} /> Problem
            </button>
            <button className={`btn ${activeTab === 'leaderboard' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: activeTab !== 'leaderboard' ? 'transparent' : undefined }} onClick={() => setActiveTab('leaderboard')}>
              <Award size={14} /> Leaderboard
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'leaderboard' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Standings</h3>
            <Leaderboard contestId={contestId} />
          </div>
        </div>
      ) : (
        /* Code Workspace (Split Screen) */
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel: Problems List & Description */}
          <div style={{ width: '40%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            {/* Horizontal Mini Problem Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-color)' }}>
              {problems.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProblem(p)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    border: '1px solid',
                    borderColor: selectedProblem?.id === p.id ? 'var(--color-primary)' : 'var(--border-color)',
                    background: selectedProblem?.id === p.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: selectedProblem?.id === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  P{idx + 1}: {p.title}
                </button>
              ))}
            </div>

            {/* Problem Description Details */}
            {selectedProblem ? (
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedProblem.title}</h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    {selectedProblem.points} Points
                  </span>
                </div>
                               {/* Dynamic Problem description details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                      {selectedProblem.description || `Please solve the ${selectedProblem.title} challenge.`}
                    </p>
                  </div>

                  {selectedProblem.inputFormat && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Input Format</h4>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                        {selectedProblem.inputFormat}
                      </p>
                    </div>
                  )}

                  {selectedProblem.outputFormat && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Output Format</h4>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                        {selectedProblem.outputFormat}
                      </p>
                    </div>
                  )}

                  {selectedProblem.constraints && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Constraints</h4>
                      <pre style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        {selectedProblem.constraints}
                      </pre>
                    </div>
                  )}

                  {/* Sample Test Case 1 */}
                  {selectedProblem.sampleInput1 !== null && selectedProblem.sampleInput1 !== undefined && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sample Test Case 1</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Input</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', marginTop: '0.25rem', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                            {selectedProblem.sampleInput1 || '[Empty Input]'}
                          </pre>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected Output</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', marginTop: '0.25rem', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                            {selectedProblem.sampleOutput1 || '[Empty Output]'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sample Test Case 2 */}
                  {selectedProblem.sampleInput2 !== null && selectedProblem.sampleInput2 !== undefined && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sample Test Case 2</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Input</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', marginTop: '0.25rem', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                            {selectedProblem.sampleInput2 || '[Empty Input]'}
                          </pre>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected Output</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', marginTop: '0.25rem', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                            {selectedProblem.sampleOutput2 || '[Empty Output]'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Difficulty</h4>
                    <span style={{ 
                      color: selectedProblem.difficulty === 'EASY' ? 'var(--color-success)' : selectedProblem.difficulty === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-danger)', 
                      fontWeight: 700, 
                      fontSize: '0.9rem' 
                    }}>
                      {selectedProblem.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-secondary)' }}>
                Select a problem to begin.
              </div>
            )}
          </div>

          {/* Right Panel: Integrated Code Editor */}
          <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            {selectedProblem && (
              <CodeEditor problemId={selectedProblem.problemId} contestId={contestId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
