import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import './Scanner.css';

const Scanner = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('starting'); // 'starting' | 'active' | 'processing' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [lastTicket, setLastTicket] = useState('');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const isProcessingRef = useRef(false); // debounce repeated reads
    const fileInputRef = useRef(null);

    // ── Stop everything ─────────────────────────────────────────────
    const stopCamera = () => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // ── Start camera + scan loop ─────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
                    audio: false,
                });

                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) return;

                video.srcObject = stream;
                await video.play();
                if (!cancelled) setStatus('active');

                // ── rAF decode loop ───────────────────────────────
                const tick = () => {
                    if (cancelled) return;
                    const canvas = canvasRef.current;
                    if (
                        video.readyState === video.HAVE_ENOUGH_DATA &&
                        canvas &&
                        !isProcessingRef.current
                    ) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0);
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imgData.data, imgData.width, imgData.height, {
                            inversionAttempts: 'dontInvert',
                        });
                        if (code && code.data) {
                            handleQRDetected(code.data);
                        }
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);

            } catch (err) {
                if (cancelled) return;
                if (err.name === 'NotAllowedError') {
                    setErrorMsg('Camera permission denied. Please allow access and retry.');
                } else if (err.name === 'NotFoundError') {
                    setErrorMsg('No camera found on this device.');
                } else {
                    setErrorMsg(`Camera error: ${err.message}`);
                }
                setStatus('error');
            }
        };

        start();

        return () => {
            cancelled = true;
            stopCamera();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── QR detected (called from rAF loop) ───────────────────────────
    const handleQRDetected = (ticketId) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setStatus('processing');
        setLastTicket(ticketId);

        axios.post('/events/attendance/mark', { ticketId })
            .then(({ data }) => toast.success(`✅ Marked Present: ${data.participantName}`))
            .catch(err => toast.error(err.response?.data?.message || 'Invalid Ticket'))
            .finally(() => {
                setTimeout(() => {
                    isProcessingRef.current = false;
                    setStatus('active');
                    setLastTicket('');
                }, 3000);
            });
    };

    // ── File upload ───────────────────────────────────────────────────
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height);
                if (code && code.data) {
                    handleQRDetected(code.data);
                } else {
                    toast('No QR code found in this image.\nPlease upload a ticket QR screenshot.', {
                        icon: 'ℹ️',
                        style: { background: '#1e3a5f', color: '#90caf9', border: '1px solid #2196f3' },
                        duration: 4000,
                    });
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="scanner-container">
            <div className="scanner-header">
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { stopCamera(); navigate(-1); }}
                >
                    ← Back
                </button>
                <h1>Attendance Scanner</h1>
            </div>

            <div className="scanner-view">
                {/* Live camera feed — always in DOM so ref is always valid */}
                <video
                    ref={videoRef}
                    className="scanner-video"
                    playsInline
                    muted
                />

                {/* Hidden canvas for jsQR */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Overlays */}
                {status === 'starting' && (
                    <div className="scanner-overlay">
                        <p className="scanner-status-text">Starting camera…</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="scanner-overlay">
                        <div className="scanner-error">
                            <span>📷</span>
                            <p>{errorMsg}</p>
                        </div>
                    </div>
                )}

                {status === 'active' && (
                    <div className="scanner-overlay">
                        <div className="scan-region" />
                    </div>
                )}

                {status === 'processing' && (
                    <div className="scanner-overlay scanner-overlay--dim">
                        <div className="scanner-processing">
                            <span>⌛</span>
                            <p>Processing Ticket…</p>
                            <p className="ticket-id">{lastTicket}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="scanner-controls">
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
                <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
                    📁 Upload Ticket Image
                </button>
                <p className="hint">Point camera at QR code, or upload a ticket screenshot</p>
            </div>
        </div>
    );
};

export default Scanner;
