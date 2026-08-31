import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Play, RefreshCw, Loader2 } from 'lucide-react';
import api from '../utils/api';

const CAPTURE_INTERVAL_MS = window.PROCTORING_CAPTURE_INTERVAL_MS || 5000;

export default function MobileProctoring() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [paired, setPaired] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('Pending permission'); // 'Ready' | 'Error' | ...
  const [proctoringState, setProctoringState] = useState('WAITING'); // 'WAITING' | 'ACTIVE' | 'ENDED'
  const [uploadStats, setUploadStats] = useState({ success: 0, failed: 0 });

  const tokenRef = useRef('');
  const proctoringStateRef = useRef('WAITING');
  const facingModeRef = useRef('environment');
  const streamRef = useRef(null);

  const updateProctoringState = (newState) => {
    setProctoringState(newState);
    proctoringStateRef.current = newState;
  };

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const statusIntervalRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const sessionInfoRef = useRef(null);

  // Buffer queue for network failures
  const pendingQueueRef = useRef([]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const tokenParam = query.get('token');
    if (!tokenParam) {
      setError('Pairing token is missing in URL.');
      setLoading(false);
      return;
    }
    setToken(tokenParam);
    tokenRef.current = tokenParam;
    verifyToken(tokenParam);

    return () => {
      stopCamera();
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, []);

  const verifyToken = async (tok) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/proctoring/pair?token=${tok}`);
      setSessionInfo(res.data);
      sessionInfoRef.current = res.data;
      if (res.data.status === 'MOBILE_CONNECTED' || res.data.status === 'READY' || res.data.status === 'ACTIVE') {
        setPaired(true);
        startCamera();
        startStatusPolling();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify pairing token');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPairing = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/api/proctoring/pair/confirm?token=${token}`);
      setSessionInfo(res.data);
      sessionInfoRef.current = res.data;
      setPaired(true);
      startCamera();
      startStatusPolling();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pair device');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (facingMode = 'environment') => {
    try {
      setCameraStatus('Requesting access...');
      
      // Stop existing tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facingMode } },
          audio: false
        });
      } catch (e) {
        // Fallback to ideal if exact is not supported (e.g. laptop or single camera device)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
      }
      
      streamRef.current = stream;
      setCameraStream(stream);
      setCameraStatus('Ready');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      facingModeRef.current = facingMode;
    } catch (err) {
      setCameraStatus('Error');
      setError('Camera access denied. Please allow camera permissions and refresh.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
  };

  const startStatusPolling = () => {
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    statusIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/proctoring/pair?token=${tokenRef.current}`);
        setSessionInfo(res.data);
        sessionInfoRef.current = res.data;

        if (res.data.status === 'ACTIVE' && proctoringStateRef.current !== 'ACTIVE') {
          updateProctoringState('ACTIVE');
          startCaptureLoop();
        } else if (res.data.status === 'ENDED' || res.data.status === 'EXPIRED') {
          updateProctoringState('ENDED');
          stopCaptureLoop();
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    }, 2000);
  };

  const startCaptureLoop = () => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    captureIntervalRef.current = setInterval(() => {
      captureAndUpload();
    }, CAPTURE_INTERVAL_MS);
  };

  const stopCaptureLoop = () => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    captureIntervalRef.current = null;
    stopCamera();
  };

  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current || !sessionInfoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set dimensions
    canvas.width = 320;
    canvas.height = 240;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality JPEG

      const startedAt = sessionInfoRef.current.startedAt;
      const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
      const sequenceNumber = Math.max(1, Math.floor(elapsedMs / CAPTURE_INTERVAL_MS) + 1);

      console.log(`[Mobile Companion] Captured frame #${sequenceNumber}`);

      const payload = {
        pairingToken: tokenRef.current,
        deviceType: 'MOBILE',
        sequenceNumber,
        capturedAt: new Date().toISOString(),
        imageBase64: base64Data
      };

      enqueueUpload(payload);

      // Alternating camera for next capture (Front -> Back -> Front ...)
      const nextFacingMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
      console.log(`[Mobile Companion] Switching camera to ${nextFacingMode}`);
      await startCamera(nextFacingMode);
      
    } catch (err) {
      console.error('Capture failed:', err);
    }
  };

  const enqueueUpload = (payload) => {
    const queue = pendingQueueRef.current;
    if (queue.length >= 5) {
      // Drop oldest image if queue exceeds 5 elements
      queue.shift();
    }
    queue.push(payload);
    processQueue();
  };

  const processQueue = async () => {
    const queue = pendingQueueRef.current;
    if (queue.length === 0) return;

    const payload = queue[0];
    try {
      console.log(`[Mobile Companion] Uploading frame #${payload.sequenceNumber}...`);
      await api.post('/api/proctoring/photo', payload);
      console.log(`[Mobile Companion] Frame #${payload.sequenceNumber} uploaded successfully!`);
      setUploadStats(prev => ({ ...prev, success: prev.success + 1 }));
      queue.shift(); // Remove uploaded image
      if (queue.length > 0) {
        processQueue(); // Process next in queue
      }
    } catch (err) {
      console.error(`[Mobile Companion] Upload failed for frame #${payload.sequenceNumber}:`, err);
      setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'var(--text-secondary)' }}>
        <Loader2 className="spinner" size={48} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
        <p>Loading pairing workspace...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Camera size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>SmartContest Proctoring</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Mobile Companion Camera
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        {sessionInfo && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contest:</span> <strong style={{ color: 'white' }}>{sessionInfo.contestTitle}</strong>
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Student:</span> <strong style={{ color: 'white' }}>{sessionInfo.studentUsername}</strong>
            </div>
          </div>
        )}

        {!paired ? (
          <button className="btn btn-primary" onClick={handleConfirmPairing} style={{ width: '100%', padding: '0.85rem' }}>
            Pair Device & Check Camera
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: '1.5rem' }}>
              <CheckCircle2 size={18} />
              <span>Mobile Device Paired</span>
            </div>

            {/* Video Preview */}
            <div style={{ width: '100%', height: '220px', background: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                Camera: {cameraStatus}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Proctoring State: <strong style={{ color: proctoringState === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-warning)' }}>{proctoringState}</strong>
              </div>
              
              {proctoringState === 'ACTIVE' ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Uploading: {uploadStats.success} successfully, {uploadStats.failed} retried
                </div>
              ) : proctoringState === 'ENDED' ? (
                <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Contest ended. Proctoring stopped.</div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Please look at your laptop monitor. Waiting for you to start the contest workspace...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
