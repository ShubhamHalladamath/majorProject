import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ShieldAlert, Monitor, Smartphone, CheckCircle, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

export default function AdminProctoringDetails({ sessionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/proctoring/admin/session/${sessionId}`);
      setDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch proctoring details');
    } finally {
      setLoading(false);
    }
  };

  // Group photos by sequence number
  const getPairedImages = () => {
    if (!detail || !detail.images) return [];
    
    const pairs = {};
    detail.images.forEach(img => {
      const seq = img.sequenceNumber;
      if (!pairs[seq]) {
        pairs[seq] = { sequenceNumber: seq, laptop: null, mobile: null, capturedAt: img.capturedAt };
      }
      if (img.deviceType === 'LAPTOP') {
        pairs[seq].laptop = img;
      } else if (img.deviceType === 'MOBILE') {
        pairs[seq].mobile = img;
      }
    });

    return Object.values(pairs).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spinner" style={{ animation: 'spin 1.5s linear infinite', marginRight: '0.5rem' }} />
        Loading proctoring timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={14} /> Back</button>
      </div>
    );
  }

  const pairedImages = getPairedImages();
  const violations = detail.events.filter(e => 
    ['TAB_SWITCH', 'EXIT_FULLSCREEN', 'COPY_ATTEMPT', 'CUT_ATTEMPT', 'PASTE_ATTEMPT', 'MOBILE_DISCONNECTED'].includes(e.eventType)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.4rem 0.75rem' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Proctoring Audit: {detail.studentUsername}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Contest: {detail.contestTitle}</span>
          </div>
        </div>

        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: getStatusColor(detail.status), fontWeight: 700 }}>
          {detail.status}
        </span>
      </div>

      {/* Grid Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Session Stats Card */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.95rem' }}>Session Details</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Started:</span>{' '}
              <strong>{detail.startedAt ? new Date(detail.startedAt).toLocaleString() : 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Ended:</span>{' '}
              <strong>{detail.endedAt ? new Date(detail.endedAt).toLocaleString() : 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Mobile Paired:</span>{' '}
              <strong>{detail.mobileConnectedAt ? new Date(detail.mobileConnectedAt).toLocaleString() : 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Total Photos:</span>{' '}
              <strong>{detail.photoCount} ({detail.laptopPhotosCount} laptop, {detail.mobilePhotosCount} mobile)</strong>
            </div>
          </div>
        </div>

        {/* Violations Tally Card */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.95rem', color: violations.length > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
            Violations: {violations.length}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            {violations.length === 0 ? (
              <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={14} /> Clear (No browser or connectivity violations)
              </div>
            ) : (
              violations.slice(0, 4).map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                  <ShieldAlert size={14} />
                  <span>{v.eventType}: {v.metadata}</span>
                </div>
              ))
            )}
            {violations.length > 4 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>+ {violations.length - 4} more events</div>
            )}
          </div>
        </div>

        {/* Event Logs Timeline Card */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.95rem' }}>System Logs</h4>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            {detail.events.map((e, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(e.eventTime).toLocaleTimeString()}</span>
                <strong style={{ color: 'white' }}>{e.eventType}</strong>
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.metadata}>{e.metadata}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Side-by-Side Photos Grid Timeline */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', fontWeight: 600 }}>Webcam Photo Timeline (Dual-View Synchronized)</h4>

        {pairedImages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            No capture interval photos uploaded yet for this session.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pairedImages.map((pair) => (
              <div key={pair.sequenceNumber} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                
                {/* Interval Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span>Interval Sequence: <strong>#{pair.sequenceNumber}</strong></span>
                  <span>Captured At: {new Date(pair.capturedAt).toLocaleTimeString()}</span>
                </div>

                {/* Photos Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  
                  {/* Laptop View */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      <Monitor size={14} style={{ color: 'var(--color-primary)' }} />
                      <strong style={{ color: 'white' }}>Laptop Camera</strong>
                    </div>
                    {pair.laptop ? (
                      <div style={{ width: '100%', height: '220px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                        <img 
                          src={`${pair.laptop.fileUrl}?token=${localStorage.getItem('accessToken')}`} 
                          alt="Laptop Capture" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Demo/verification indicator */}
                        {pair.sequenceNumber < 0 && (
                          <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(99, 102, 241, 0.9)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                            Demo Photo
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ height: '220px', background: '#000', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <AlertTriangle size={24} style={{ marginBottom: '0.5rem', color: 'var(--color-warning)' }} />
                        No Laptop image received
                      </div>
                    )}
                  </div>

                  {/* Mobile View */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      <Smartphone size={14} style={{ color: 'var(--color-accent)' }} />
                      <strong style={{ color: 'white' }}>Mobile Camera</strong>
                    </div>
                    {pair.mobile ? (
                      <div style={{ width: '100%', height: '220px', borderRadius: '4px', overflow: 'hidden' }}>
                        <img 
                          src={`${pair.mobile.fileUrl}?token=${localStorage.getItem('accessToken')}`} 
                          alt="Mobile Capture" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '220px', background: '#000', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <AlertTriangle size={24} style={{ marginBottom: '0.5rem', color: 'var(--color-warning)' }} />
                        No Mobile image received
                      </div>
                    )}
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
