import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  ArrowLeft, Clock, Code, CheckCircle, AlertTriangle, Camera, Laptop, 
  Smartphone, Monitor, RefreshCw, CheckCircle2, ShieldAlert, LogOut 
} from 'lucide-react';
import api from '../utils/api';
import CodeEditor from './CodeEditor';

const CAPTURE_INTERVAL_MS = window.PROCTORING_CAPTURE_INTERVAL_MS || 5000;

export default function ContestDetail() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Anti-cheat tab switch lock state
  const [isTabLocked, setIsTabLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  
  // Proctoring States
  const [proctoringSession, setProctoringSession] = useState(null);
  const [proctoringState, setProctoringState] = useState('NONE'); // 'NONE' | 'SETUP_INTRO' | 'DEMO_PHOTOS' | 'WAITING_FOR_MOBILE' | 'READY' | 'ACTIVE' | 'COMPLETED'
  const [demoPhotos, setDemoPhotos] = useState([]);
  const [cameraStatus, setCameraStatus] = useState('Closed');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [mobileStatus, setMobileStatus] = useState('Disconnected');
  const [mobileDisconnected, setMobileDisconnected] = useState(false);
  const [uploadStats, setUploadStats] = useState({ success: 0, failed: 0 });
  const [tunnelHost, setTunnelHost] = useState(() => {
    return localStorage.getItem('devtunnel_host') || '';
  });

  const handleTunnelHostChange = (val) => {
    setTunnelHost(val);
    localStorage.setItem('devtunnel_host', val);
  };

  useEffect(() => {
    if (proctoringSession && proctoringSession.pairingToken && proctoringState === 'WAITING_FOR_MOBILE') {
      const generateQr = async () => {
        try {
          const base = tunnelHost ? tunnelHost.trim() : window.location.origin;
          const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
          const pairingUrl = `${cleanBase}/mobile-proctoring?token=${proctoringSession.pairingToken}`;
          const qrDataUrl = await QRCode.toDataURL(pairingUrl);
          setQrCodeDataUrl(qrDataUrl);
        } catch (err) {
          console.error('Failed to generate QR code:', err);
        }
      };
      generateQr();
    }
  }, [tunnelHost, proctoringSession, proctoringState]);

  // Helper: return local ISO timestamp string formatted for server storing local device time
  const getLocalISOString = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
  };

  // Helper: compute ms until the next wall-clock boundary aligned to CAPTURE_INTERVAL_MS grid
  const msUntilNextBoundary = (intervalMs = CAPTURE_INTERVAL_MS) => {
    const now = Date.now();
    return intervalMs - (now % intervalMs);
  };

  // Refs for tracking active intervals and streams
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const proctoringTimeoutRef = useRef(null);
  const isProctoringActiveRef = useRef(false);
  const statusPollIntervalRef = useRef(null);
  const proctoringSessionRef = useRef(null);
  const pendingUploadsRef = useRef([]);

  useEffect(() => {
    fetchContestData();
    return () => {
      cleanupAllLoops();
    };
  }, [contestId]);

  // Ensure the stream is attached to the video element whenever the video element mounts or state changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [proctoringState, loading]);

  const cleanupAllLoops = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopProctoringLoop();
    if (statusPollIntervalRef.current) clearInterval(statusPollIntervalRef.current);
    stopCamera();
    removeViolationListeners();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStatus('Closed');
  };

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
        
        // Prevent student from entering an already attended/completed contest
        if (enrollRes.data.status === 'COMPLETED') {
          setProctoringState('COMPLETED');
          setTimeRemaining('Completed');
          return;
        }

        if (enrollRes.data.startedAt) {
          // Check if existing session was already ended
          try {
            const sessionRes = await api.get(`/api/proctoring/session/active?contestId=${contestId}`);
            if (sessionRes.data.status === 'ENDED' || sessionRes.data.status === 'EXPIRED') {
              setProctoringState('COMPLETED');
              setTimeRemaining('Completed');
              return;
            }
          } catch (e) {}

          const startMs = new Date(enrollRes.data.startedAt).getTime();
          const durationMs = contestRes.data.duration * 60 * 1000;
          const personalEnd = new Date(startMs + durationMs);
          const absoluteEnd = new Date(contestRes.data.endTime);
          const targetEnd = personalEnd < absoluteEnd ? personalEnd : absoluteEnd;
          
          if (Date.now() >= targetEnd.getTime()) {
            await api.post(`/api/contests/${contestId}/finish`).catch(() => {});
            setProctoringState('COMPLETED');
            setTimeRemaining('Completed');
            return;
          }

          startTimer(targetEnd);

          // Restore/Join the active proctoring session
          await resumeActiveProctoringSession();
        } else {
          setTimeRemaining('Not Started');
          // Check if there is an existing session to resume state
          try {
            const sessionRes = await api.get(`/api/proctoring/session/active?contestId=${contestId}`);
            const sess = sessionRes.data;
            setProctoringSession(sess);
            proctoringSessionRef.current = sess;

            if (sess.status === 'MOBILE_CONNECTED') {
              setMobileStatus('Connected');
              setProctoringState('READY');
              startStatusPoll(sess.id);
            } else if (sess.status === 'WAITING_FOR_MOBILE') {
              setProctoringState('WAITING_FOR_MOBILE');
              const origin = window.location.origin;
              const pairingUrl = `${origin}/mobile-proctoring?token=${sess.pairingToken}`;
              const qrDataUrl = await QRCode.toDataURL(pairingUrl);
              setQrCodeDataUrl(qrDataUrl);
              startStatusPoll(sess.id);
            } else if (sess.status === 'ACTIVE') {
              setMobileStatus('Connected');
              setProctoringState('READY');
              startStatusPoll(sess.id);
            } else {
              setProctoringState('SETUP_INTRO');
            }
          } catch (err) {
            setProctoringState('SETUP_INTRO');
          }
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

  const resumeActiveProctoringSession = async () => {
    try {
      // Fetch active session without resetting its status
      const res = await api.get(`/api/proctoring/session/active?contestId=${contestId}`);
      if (res.data.status === 'ENDED' || res.data.status === 'EXPIRED') {
        setProctoringState('COMPLETED');
        setTimeRemaining('Completed');
        return;
      }
      setProctoringSession(res.data);
      proctoringSessionRef.current = res.data;
      setProctoringState('ACTIVE');
      
      // Start camera & upload loop
      await startLaptopCamera();
      startProctoringLoop();
      addViolationListeners();
      startStatusPoll(res.data.id);
    } catch (err) {
      console.error('Failed to resume proctoring session:', err);
      setError('Failed to initialize proctoring session. Camera verification required.');
    }
  };

  const initProctoringSession = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/api/proctoring/session/create?contestId=${contestId}`);
      setProctoringSession(res.data);
      proctoringSessionRef.current = res.data;
      setProctoringState('DEMO_PHOTOS');
      // Wait for layout rendering, then start camera
      setTimeout(async () => {
        await startLaptopCamera();
      }, 300);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create proctoring session');
    } finally {
      setLoading(false);
    }
  };

  const startLaptopCamera = async () => {
    try {
      setCameraStatus('Requesting access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false
      });
      streamRef.current = stream;
      setCameraStatus('Ready');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setCameraStatus('Error');
      alert('Camera access is required for proctoring. Please allow permissions.');
    }
  };

  const handleCaptureDemoPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

    const updated = [...demoPhotos, dataUrl];
    setDemoPhotos(updated);

    if (updated.length === 5) {
      uploadDemoPhotos(updated);
    }
  };

  const uploadDemoPhotos = async (photos) => {
    try {
      setLoading(true);
      await api.post('/api/proctoring/demo-photos', {
        sessionId: proctoringSession.id,
        images: photos
      });
      
      setProctoringState('WAITING_FOR_MOBILE');
      
      // Stop local camera preview temporarily to save resources during pairing
      stopCamera();
      
      // Start polling for mobile connection
      startStatusPoll(proctoringSession.id);
    } catch (err) {
      alert('Failed to upload verification photos. Please retry.');
      setDemoPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const startStatusPoll = (sessId) => {
    if (statusPollIntervalRef.current) clearInterval(statusPollIntervalRef.current);
    statusPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/proctoring/session/${sessId}/status`);
        setProctoringSession(res.data);
        proctoringSessionRef.current = res.data;

        if (res.data.status === 'MOBILE_CONNECTED') {
          setMobileStatus('Connected');
          setMobileDisconnected(false);
          if (proctoringState === 'WAITING_FOR_MOBILE') {
            setProctoringState('READY');
          }
        } else if (res.data.status === 'ACTIVE') {
          setMobileStatus('Connected');
          // If poll detects mobile disconnect event
          const lastMobile = res.data.lastMobilePhotoAt;
          if (lastMobile) {
            const lastSecs = javaTimeSecsAgo(lastMobile);
            if (lastSecs > 15) {
              setMobileDisconnected(true);
              setMobileStatus('Lost connection');
            } else {
              setMobileDisconnected(false);
              setMobileStatus('Connected');
            }
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 2000);
  };

  const javaTimeSecsAgo = (timeStr) => {
    return Math.floor((Date.now() - new Date(timeStr).getTime()) / 1000);
  };

  const handleStartContestAndWorkspace = async () => {
    try {
      setLoading(true);
      // 1. Start camera again for active contest
      await startLaptopCamera();
      
      // 2. Start contest in backend
      const startRes = await api.post(`/api/contests/${contestId}/start`);
      setEnrollment(startRes.data);

      // 3. Set proctoring active in backend
      const proctorRes = await api.post(`/api/proctoring/session/${proctoringSession.id}/start`);
      setProctoringSession(proctorRes.data);
      proctoringSessionRef.current = proctorRes.data;

      // 4. Enter fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      // 5. Initialize loops
      const startMs = new Date(startRes.data.startedAt).getTime();
      const durationMs = contest.duration * 60 * 1000;
      const personalEnd = new Date(startMs + durationMs);
      const absoluteEnd = new Date(contest.endTime);
      const targetEnd = personalEnd < absoluteEnd ? personalEnd : absoluteEnd;
      startTimer(targetEnd);

      startProctoringLoop();
      addViolationListeners();
      setProctoringState('ACTIVE');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start workspace');
    } finally {
      setLoading(false);
    }
  };

  const startProctoringLoop = () => {
    stopProctoringLoop();
    isProctoringActiveRef.current = true;
    scheduleNextLaptopCapture();
  };

  const stopProctoringLoop = () => {
    isProctoringActiveRef.current = false;
    if (proctoringTimeoutRef.current) {
      clearTimeout(proctoringTimeoutRef.current);
      proctoringTimeoutRef.current = null;
    }
  };

  const scheduleNextLaptopCapture = () => {
    if (!isProctoringActiveRef.current) return;
    const delay = msUntilNextBoundary(CAPTURE_INTERVAL_MS);
    proctoringTimeoutRef.current = setTimeout(() => {
      captureAndUploadLaptopPhoto();
      scheduleNextLaptopCapture();
    }, delay);
  };

  const captureAndUploadLaptopPhoto = () => {
    if (!videoRef.current || !canvasRef.current || !proctoringSessionRef.current) return;
    const video = videoRef.current;
    
    // Check that video track is actively playing before drawing to canvas
    if (video.readyState < 2 || video.videoWidth === 0) {
      console.warn('[Laptop Proctoring] Video not ready for snapshot, skipping frame');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 320;
    canvas.height = 240;
    
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.6);

      const startedAt = proctoringSessionRef.current.startedAt;
      const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
      const sequenceNumber = Math.max(1, Math.floor(elapsedMs / CAPTURE_INTERVAL_MS) + 1);

      console.log(`[Laptop Proctoring] Captured frame #${sequenceNumber}`);

      const payload = {
        sessionId: proctoringSessionRef.current.id,
        deviceType: 'LAPTOP',
        sequenceNumber,
        capturedAt: getLocalISOString(),
        imageBase64: base64Data
      };

      enqueueUpload(payload);
    } catch (err) {
      console.error('Laptop frame capture failed:', err);
    }
  };

  const enqueueUpload = (payload) => {
    const queue = pendingUploadsRef.current;
    if (queue.length >= 5) {
      queue.shift(); // Evict oldest
    }
    queue.push(payload);
    processUploadQueue();
  };

  const processUploadQueue = async () => {
    const queue = pendingUploadsRef.current;
    if (queue.length === 0) return;

    const payload = queue[0];
    try {
      console.log(`[Laptop Proctoring] Uploading frame #${payload.sequenceNumber}...`);
      await api.post('/api/proctoring/photo', payload);
      console.log(`[Laptop Proctoring] Frame #${payload.sequenceNumber} uploaded successfully!`);
      setUploadStats(prev => ({ ...prev, success: prev.success + 1 }));
      queue.shift();
      if (queue.length > 0) {
        processUploadQueue();
      }
    } catch (err) {
      console.error(`[Laptop Proctoring] Upload failed for frame #${payload.sequenceNumber}:`, err);
      setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
    }
  };

  // Browser Violations
  const addViolationListeners = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('blur', handleBlur);
  };

  const removeViolationListeners = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('cut', handleCut);
    document.removeEventListener('paste', handlePaste);
    window.removeEventListener('blur', handleBlur);
  };

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'hidden' && proctoringSessionRef.current && isProctoringActiveRef.current) {
      await logViolation('TAB_SWITCH', 'Student switched browser tab');
      setLockReason('Tab Switch / Window Hide Detected');
      setIsTabLocked(true);
    }
  };

  const handleFullscreenChange = async () => {
    if (!document.fullscreenElement && proctoringSessionRef.current && isProctoringActiveRef.current) {
      await logViolation('EXIT_FULLSCREEN', 'Student exited fullscreen mode');
      setLockReason('Fullscreen Mode Exited');
      setIsTabLocked(true);
    }
  };

  const handleCopy = async (e) => {
    e.preventDefault();
    await logViolation('COPY_ATTEMPT', 'Student attempted code copy');
  };

  const handleCut = async (e) => {
    e.preventDefault();
    await logViolation('CUT_ATTEMPT', 'Student attempted code cut');
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    await logViolation('PASTE_ATTEMPT', 'Student attempted code paste');
  };

  const handleBlur = async () => {
    if (proctoringSessionRef.current && isProctoringActiveRef.current) {
      await logViolation('TAB_SWITCH', 'Student lost focus on contest window');
      setLockReason('Window Focus Lost');
      setIsTabLocked(true);
    }
  };

  const handleEndContest = async () => {
    if (window.confirm('Are you sure you want to submit and end your contest? You will not be able to return to the workspace.')) {
      await executeEndContest();
    }
  };

  const executeEndContest = async () => {
    try {
      setLoading(true);
      if (proctoringSessionRef.current) {
        await api.post(`/api/proctoring/session/${proctoringSessionRef.current.id}/end`).catch(() => {});
      }
      await api.post(`/api/contests/${contestId}/finish`).catch(() => {});

      cleanupAllLoops();
      
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }

      setIsTabLocked(false);
      setProctoringState('COMPLETED');
    } catch (err) {
      console.error('Failed to end contest:', err);
      setProctoringState('COMPLETED');
    } finally {
      setLoading(false);
    }
  };

  const logViolation = async (type, metadata) => {
    if (!proctoringSessionRef.current) return;
    try {
      await api.post('/api/proctoring/violation', {
        sessionId: proctoringSessionRef.current.id,
        eventType: type,
        metadata: metadata
      });
    } catch (err) {
      console.error('Failed to log violation:', err);
    }
  };

  // Timer Countdown
  const startTimer = (targetEndTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const calculateTime = () => {
      const difference = new Date(targetEndTime) - new Date();
      if (difference <= 0) {
        setTimeRemaining('Contest Ended');
        handleContestTimeExpired();
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

  const handleContestTimeExpired = async () => {
    cleanupAllLoops();
    alert('Time limit reached. Ending proctoring session.');
    if (proctoringSessionRef.current) {
      try {
        await api.post(`/api/proctoring/session/${proctoringSessionRef.current.id}/end`);
      } catch (err) {
        console.error('Failed to end proctoring:', err);
      }
    }
    setProctoringState('ENDED');
  };

  const handleExitContest = async () => {
    if (window.confirm('Are you sure you want to end the contest? Your webcam stream will close.')) {
      cleanupAllLoops();
      if (proctoringSessionRef.current) {
        try {
          await api.post(`/api/proctoring/session/${proctoringSessionRef.current.id}/end`);
        } catch (e) {
          console.error(e);
        }
      }
      setProctoringState('ENDED');
      window.location.href = '/contests';
    }
  };

  // --- Rendering UI States ---

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

  // Not enrolled screen
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

  // Active Contest Editor Workspace
  if (proctoringState === 'ACTIVE') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }} onContextMenu={(e) => e.preventDefault()}>
        
        {/* Mobile Disconnected Banner Warning */}
        {mobileDisconnected && (
          <div style={{ background: 'var(--color-danger)', color: 'white', padding: '0.5rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', animation: 'pulse 2s infinite' }}>
            <ShieldAlert size={18} />
            <span>⚠️ Mobile connection lost! Please verify your mobile device is turned on and paired.</span>
          </div>
        )}

        {/* Workspace Header */}
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleExitContest} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.1rem' }}>{contest.title}</h2>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>{contest.status}</span>
            </div>
          </div>

          {/* Connection / Proctoring Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Live Laptop Camera Preview Thumbnail */}
            <div style={{ width: '100px', height: '62px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', background: '#000' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} width="320" height="240" />
              <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '0.55rem', color: '#4ade80', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                ● REC
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                <Laptop size={12} style={{ color: 'var(--color-success)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Laptop Feed:</span>
                <strong style={{ color: 'var(--color-success)' }}>Active</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                <Smartphone size={12} style={{ color: mobileDisconnected ? 'var(--color-danger)' : 'var(--color-success)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Mobile Feed:</span>
                <strong style={{ color: mobileDisconnected ? 'var(--color-danger)' : 'var(--color-success)' }}>{mobileStatus}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Clock size={16} style={{ color: 'var(--color-warning)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--color-warning)' }}>{timeRemaining}</span>
            </div>

            <button 
              onClick={handleEndContest}
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--color-danger)',
                color: '#f87171',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <LogOut size={14} /> End Contest
            </button>
          </div>
        </div>

        {/* Code Workspace Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel: Problem details */}
          <div style={{ width: '40%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
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

            {selectedProblem ? (
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedProblem.title}</h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    {selectedProblem.points} Points
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Description</h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                      {selectedProblem.description}
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

                  {/* Sample Cases */}
                  {selectedProblem.sampleInput1 && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sample Case 1</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Input</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{selectedProblem.sampleInput1}</pre>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Output</span>
                          <pre style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{selectedProblem.sampleOutput1}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-secondary)' }}>Select a problem to begin.</div>
            )}
          </div>

          {/* Right Panel: Integrated editor */}
          <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            {selectedProblem && (
              <CodeEditor problemId={selectedProblem.problemId} contestId={contestId} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Proctoring Setup Wizard Views
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
      {/* Step Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/contests" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></Link>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{contest.title} — Proctoring Setup</h2>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        
        {proctoringState === 'SETUP_INTRO' && (
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s' }}>
            <Monitor size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.4rem', fontWeight: 700 }}>Proctoring Verification</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
              To ensure the integrity of the contest, camera verification is required. 
              You will need to capture 5 demo verification photos from your laptop, 
              and then pair your mobile device camera.
            </p>
            <button className="btn btn-primary" onClick={initProctoringSession} style={{ padding: '0.85rem 2rem' }}>
              Begin Setup & Verify Camera
            </button>
          </div>
        )}

        {proctoringState === 'DEMO_PHOTOS' && (
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.3rem' }}>Laptop Camera Verification</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Demo Photo: <strong>{demoPhotos.length + 1} / 5</strong>
            </p>

            {/* Webcam video feed */}
            <div style={{ width: '100%', height: '260px', background: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'white' }}>
                Camera Status: {cameraStatus}
              </span>
            </div>

            {/* Photo capture button */}
            <button 
              className="btn btn-primary" 
              onClick={handleCaptureDemoPhoto} 
              disabled={cameraStatus !== 'Ready'} 
              style={{ width: '100%', padding: '0.85rem' }}
            >
              <Camera size={16} /> Capture Photo {demoPhotos.length + 1}
            </button>

            {/* Small thumbnails of captured photos */}
            {demoPhotos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                {demoPhotos.map((ph, idx) => (
                  <div key={idx} style={{ width: '60px', height: '45px', border: '1px solid var(--color-success)', borderRadius: '4px', overflow: 'hidden' }}>
                    <img src={ph} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {proctoringState === 'WAITING_FOR_MOBILE' && (
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s' }}>
            <Smartphone size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem' }}>Connect Your Mobile</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Please scan this QR code with your mobile phone to connect your secondary camera feed.
            </p>

            {/* Render Pairing QR Code */}
            {qrCodeDataUrl ? (
              <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <img src={qrCodeDataUrl} alt="Pairing QR Code" style={{ width: '180px', height: '180px' }} />
              </div>
            ) : (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw className="spinner" style={{ animation: 'spin 1.5s linear infinite' }} />
              </div>
            )}

            {/* Tunnel URL override input for local development */}
            {window.location.hostname === 'localhost' && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Local Development QR Origin Override:
                </label>
                <input 
                  type="text" 
                  value={tunnelHost} 
                  onChange={(e) => handleTunnelHostChange(e.target.value)}
                  placeholder="e.g. https://z7n471dm-3000.inc1.devtunnels.ms"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Leave blank to use current origin ({window.location.origin}).
                </span>
              </div>
            )}

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Waiting for mobile camera pairing connection...
            </div>
          </div>
        )}

        {proctoringState === 'READY' && (
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s' }}>
            <CheckCircle2 size={54} style={{ color: 'var(--color-success)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>✓ Proctoring Ready</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              Your laptop camera and mobile companion camera are both verified and connected. 
              The system is ready. Click below to enter the contest workspace.
            </p>

            <button className="btn btn-primary" onClick={handleStartContestAndWorkspace} style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', fontWeight: 700 }}>
              Start Contest & Enter Workspace
            </button>
          </div>
        )}

        {proctoringState === 'COMPLETED' && (
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', animation: 'slideUp 0.4s', padding: '2.5rem 2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem', color: 'white' }}>
              Contest Completed
            </h2>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              You have completed and submitted <strong>{contest?.title || 'this contest'}</strong>. Re-entry into the workspace or proctoring session is blocked.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '1rem 1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>COMPLETED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Proctoring Session:</span>
                <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>ENDED & ARCHIVED</span>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/contests')}
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 600 }}
            >
              Back to Contests List
            </button>
          </div>
        )}

        {/* Anti-Cheat Tab Switch & Window Blur Lock Screen Overlay */}
        {isTabLocked && proctoringState === 'ACTIVE' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            background: 'rgba(10, 10, 15, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div className="glass-card" style={{
              maxWidth: '520px',
              width: '100%',
              textAlign: 'center',
              border: '1px solid var(--color-danger)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)',
              padding: '2.5rem 2rem'
            }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <AlertTriangle size={38} style={{ color: 'var(--color-danger)' }} />
              </div>

              <h3 style={{ color: 'var(--color-danger)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                ⚠️ Contest Workspace Locked
              </h3>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
                A tab switch, window minimize, or full-screen exit was detected ({lockReason}). This action has been recorded in your proctoring audit log.
                <br /><br />
                <strong>You must choose to either return to fullscreen or submit your contest now.</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen().catch(() => {});
                      }
                    } catch (e) {}
                    setIsTabLocked(false);
                  }}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}
                >
                  ▶ Resume & Return to Fullscreen
                </button>

                <button 
                  className="btn btn-danger"
                  onClick={async () => {
                    await executeEndContest();
                  }}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                >
                  ⏹ Submit & End Contest Now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
