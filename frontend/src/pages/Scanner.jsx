import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import './Scanner.css';

const Scanner = () => {
    const navigate = useNavigate();
    const [lastScan, setLastScan] = useState(null);
    const [scanning, setScanning] = useState(true);
    const fileInputRef = useRef(null);

    const markAttendance = async (ticketId) => {
        if (ticketId === lastScan) return;
        setLastScan(ticketId);
        setScanning(false);

        try {
            const { data } = await axios.post('/events/attendance/mark', { ticketId });
            toast.success(`Marked Present: ${data.participantName}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid Ticket');
        } finally {
            setTimeout(() => {
                setScanning(true);
                setLastScan(null);
            }, 3000);
        }
    };

    const handleResult = (result) => {
        if (result) {
            markAttendance(result.text);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    markAttendance(code.data);
                } else {
                    toast.error('No QR code found in image');
                }
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="scanner-container">
            <div className="scanner-header">
                <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">← Back</button>
                <h1>Attendance Scanner</h1>
            </div>

            <div className="scanner-view">
                {scanning ? (
                    <QrReader
                        onResult={handleResult}
                        constraints={{ facingMode: 'environment' }}
                        className="qr-reader"
                    />
                ) : (
                    <div className="scanner-message">
                        <div className="status-icon">⌛</div>
                        <p>Processing Ticket...</p>
                        <p className="ticket-id">{lastScan}</p>
                    </div>
                )}
                <div className="scanner-overlay">
                    <div className="scan-region"></div>
                </div>
            </div>

            <div className="scanner-controls">
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
                <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current.click()}
                >
                    📁 Upload Ticket Image
                </button>
                <p className="hint">Use camera or upload a screenshot</p>
            </div>
        </div>
    );
};

export default Scanner;
