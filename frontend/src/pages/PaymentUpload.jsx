import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './PaymentUpload.css';

const PaymentUpload = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [registration, setRegistration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);

    useEffect(() => {
        fetchRegistration();
    }, [id]);

    const fetchRegistration = async () => {
        try {
            const { data } = await axios.get(`/registrations/${id}`);
            setRegistration(data);
        } catch (error) {
            toast.error('Failed to load registration details');
            navigate('/my-registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error('Please select a payment proof image');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('paymentProof', file);

        try {
            await axios.post(`/registrations/${id}/upload-payment-proof`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Payment proof uploaded successfully!');
            navigate('/my-registrations');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    const event = registration.event;

    return (
        <div className="payment-upload-container">
            <div className="payment-card">
                <h2>Complete Your Payment</h2>
                <div className="event-summary">
                    <p>Event: <strong>{event.name}</strong></p>
                    <p>Amount Due: <strong className="amount">₹{event.registrationFee}</strong></p>
                </div>

                <div className="upi-section">
                    <h3>Pay via UPI</h3>
                    <div className="upi-details">
                        <p>UPI ID: <strong>{import.meta.env.VITE_UPI_ID || 'organizer@upi'}</strong></p>
                        <p className="upi-note">Scan or pay to the above ID and upload the screenshot below.</p>
                        {/* QR Code Placeholder */}
                        <div className="upi-qr-placeholder">
                            {/* In a real app, generate a dynamic QR here */}
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${import.meta.env.VITE_UPI_ID || 'organizer@upi'}&pn=DASS%20Events&am=${event.registrationFee}&cu=INR`} alt="UPI QR" />
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label>Upload Screenshot (Transaction Success)</label>
                        <div className={`drop-zone ${preview ? 'has-preview' : ''}`}>
                            <input type="file" accept="image/*" onChange={handleFileChange} />
                            {preview ? (
                                <img src={preview} alt="Preview" className="proof-preview" />
                            ) : (
                                <div className="drop-text">
                                    <span>📸</span>
                                    <p>Click or drag image here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Submit Proof'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentUpload;
