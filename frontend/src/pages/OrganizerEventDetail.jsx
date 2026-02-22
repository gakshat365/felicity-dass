import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './OrganizerEventDetail.css';

const OrganizerEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('participants');
    const [selectedReg, setSelectedReg] = useState(null);
    const [feedbackData, setFeedbackData] = useState({ stats: null, list: [] });
    const [feedbackFilter, setFeedbackFilter] = useState(0);

    useEffect(() => {
        fetchEventData();
        if (activeTab === 'feedback') {
            fetchFeedback();
        }
    }, [id, activeTab]);

    const fetchEventData = async () => {
        try {
            const [eventRes, regRes] = await Promise.all([
                axios.get(`/events/${id}`),
                axios.get(`/events/${id}/registrations`)
            ]);
            setEvent(eventRes.data);
            setRegistrations(regRes.data);
        } catch (error) {
            toast.error('Failed to load event data');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedback = async () => {
        try {
            const { data } = await axios.get(`/feedback/event/${id}`);
            setFeedbackData(data);
        } catch (error) {
            console.error('Feedback fetch error:', error);
        }
    };

    const handleApprovePayment = async (regId) => {
        try {
            await axios.patch(`/registrations/${regId}/approve-payment`);
            toast.success('Payment approved');
            fetchEventData();
            setSelectedReg(null);
        } catch (error) {
            toast.error('Approval failed');
        }
    };

    const handleRejectPayment = async (regId) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            await axios.patch(`/registrations/${regId}/reject-payment`, { reason });
            toast.success('Payment rejected');
            fetchEventData();
            setSelectedReg(null);
        } catch (error) {
            toast.error('Rejection failed');
        }
    };

    const handleMarkAttendance = async (regId) => {
        const reg = registrations.find(r => r._id === regId);
        if (reg.attendanceMarked) {
            toast.error('Attendance already marked');
            return;
        }

        const reason = prompt('Enter reason for manual override (leave blank for default):');

        try {
            await axios.post('/events/attendance/mark', {
                ticketId: reg.ticketId,
                isManual: true,
                reason: reason || 'Manual check-in'
            });
            toast.success('Attendance updated (Manual Override logged)');
            fetchEventData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update attendance');
        }
    };

    const exportCSV = async () => {
        try {
            const response = await axios.get(`/events/${id}/export-csv`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `event-${id}-registrations.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Failed to export CSV');
        }
    };

    if (loading) return <div className="loading">Loading event details...</div>;

    const stats = {
        total: registrations.length,
        confirmed: registrations.filter(r => r.status === 'confirmed').length,
        pending: registrations.filter(r => r.paymentStatus === 'proof_uploaded').length,
        revenue: registrations.filter(r => r.status === 'confirmed').length * (event.registrationFee || 0),
        attendance: registrations.filter(r => r.attendanceMarked).length,
        notScanned: registrations.filter(r => r.status === 'confirmed' && !r.attendanceMarked).length
    };

    return (
        <div className="org-event-container">
            <header className="page-header">
                <div className="header-nav">
                    <button onClick={() => navigate(-1)} className="back-link">Back</button>
                    <h1>{event.name} Dashboard</h1>
                </div>
                <div className="header-actions">
                    <button onClick={() => navigate('/scanner')} className="scanner-link-btn">Open Scanner</button>
                    <button onClick={exportCSV} className="export-btn">Export CSV</button>
                </div>
            </header>

            <section className="live-dashboard">
                <div className="dashboard-header">
                    <h3>Live Attendance Tracking</h3>
                    <div className="live-badge">Live</div>
                </div>
                <div className="dashboard-grid">
                    <div className="dash-card">
                        <div className="dash-circle present">{stats.attendance}</div>
                        <span className="dash-label">Checked In</span>
                    </div>
                    <div className="dash-card">
                        <div className="dash-circle expected">{stats.confirmed}</div>
                        <span className="dash-label">Total Expected</span>
                    </div>
                    <div className="dash-card">
                        <div className="dash-circle remaining">{stats.notScanned}</div>
                        <span className="dash-label">Not Yet Arrived</span>
                    </div>
                    <div className="dash-card progress-box">
                        <div className="progress-bar-container">
                            <div
                                className="progress-fill"
                                style={{ width: `${(stats.attendance / stats.confirmed) * 100 || 0}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">{Math.round((stats.attendance / stats.confirmed) * 100 || 0)}% Scanned</span>
                    </div>
                </div>
            </section>

            <div className="content-tabs">
                <button
                    className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('participants')}
                >Participants</button>
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >Pending Payments ({stats.pending})</button>
                <button
                    className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feedback')}
                >Feedback</button>
            </div>

            {activeTab !== 'feedback' ? (
                <div className="table-wrapper">
                    <table className="participants-table">
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Attendance</th>
                                <th>Audit Info</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations
                                .filter(r => activeTab === 'participants' || r.paymentStatus === 'proof_uploaded')
                                .map(reg => (
                                    <tr key={reg._id}>
                                        <td>
                                            <div className="user-info">
                                                <span className="user-name">{reg.participant.firstName} {reg.participant.lastName}</span>
                                                <span className="user-email">{reg.participant.email}</span>
                                            </div>
                                        </td>
                                        <td><span className={`status-badge ${reg.status}`}>{reg.status}</span></td>
                                        <td>
                                            {reg.paymentStatus === 'proof_uploaded' ? (
                                                <button
                                                    className="proof-link"
                                                    onClick={() => setSelectedReg(reg)}
                                                >View Proof</button>
                                            ) : (
                                                <span className={`payment-status ${reg.paymentStatus}`}>{reg.paymentStatus || 'Free'}</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`attendance-toggle ${reg.attendanceMarked ? 'marked' : ''}`}
                                                onClick={() => handleMarkAttendance(reg._id)}
                                                disabled={reg.status !== 'confirmed'}
                                            >
                                                {reg.attendanceMarked ? '✓ Present' : 'Absent'}
                                            </button>
                                        </td>
                                        <td>
                                            {reg.isManualOverride ? (
                                                <div className="audit-note">
                                                    <span className="audit-tag">Manual</span>
                                                    <span className="audit-reason">{reg.manualOverrideReason}</span>
                                                </div>
                                            ) : reg.attendanceMarked ? (
                                                <div className="audit-note">
                                                    <span className="audit-tag scan">QR Scan</span>
                                                    <span className="audit-time">{format(new Date(reg.attendanceMarkedAt), 'HH:mm')}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {reg.paymentStatus === 'proof_uploaded' && (
                                                <div className="row-actions">
                                                    <button onClick={() => handleApprovePayment(reg._id)} className="btn-approve-sm">Approve</button>
                                                    <button onClick={() => handleRejectPayment(reg._id)} className="btn-reject-sm">Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="feedback-analytics-section">
                    {feedbackData.stats ? (
                        <>
                            <div className="analytics-overview">
                                <div className="avg-card">
                                    <span className="big-rating">{feedbackData.stats.average}</span>
                                    <div className="stars-row">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <span key={s} className={s <= Math.round(feedbackData.stats.average) ? 'star-on' : 'star-off'}>★</span>
                                        ))}
                                    </div>
                                    <span className="responses-count">{feedbackData.stats.total} Responses</span>
                                </div>

                                <div className="distribution-card">
                                    {Object.entries(feedbackData.stats.distribution).reverse().map(([rating, count]) => {
                                        const pct = (count / (feedbackData.stats.total || 1)) * 100;
                                        return (
                                            <div key={rating} className="dist-row">
                                                <span className="dist-label">{rating} ★</span>
                                                <div className="dist-bar-bg">
                                                    <div className="dist-bar-fill" style={{ width: `${pct}%` }}></div>
                                                </div>
                                                <span className="dist-count">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="feedback-filters">
                                <label>Filter by Rating:</label>
                                <select value={feedbackFilter} onChange={(e) => setFeedbackFilter(Number(e.target.value))}>
                                    <option value={0}>All Feedback</option>
                                    <option value={5}>5 Stars Only</option>
                                    <option value={4}>4 Stars Only</option>
                                    <option value={3}>3 Stars Only</option>
                                    <option value={2}>2 Stars Only</option>
                                    <option value={1}>1 Star Only</option>
                                </select>
                            </div>

                            <div className="feedback-list">
                                {feedbackData.list
                                    .filter(f => feedbackFilter === 0 || f.rating === feedbackFilter)
                                    .map((f) => (
                                        <div key={f._id} className="feedback-item">
                                            <div className="f-header">
                                                <span className="f-rating">{f.rating} ★</span>
                                                <span className="f-date">{format(new Date(f.createdAt), 'MMM dd, yyyy')}</span>
                                            </div>
                                            <p className="f-comment">{f.comment || <em>No comment provided</em>}</p>
                                        </div>
                                    ))}
                                {feedbackData.list.length === 0 && <p className="empty-msg">No feedback submitted yet.</p>}
                            </div>
                        </>
                    ) : (
                        <div className="loading-small">Crunching numbers...</div>
                    )}
                </div>
            )}

            {selectedReg && (
                <div className="modal-overlay" onClick={() => setSelectedReg(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Payment Proof: {selectedReg.participant.firstName}</h3>
                            <button className="close-btn" onClick={() => setSelectedReg(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <img src={selectedReg.paymentProofUrl} alt="Payment Receipt" className="proof-image" />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => handleApprovePayment(selectedReg._id)} className="btn-approve">Approve Payment</button>
                            <button onClick={() => handleRejectPayment(selectedReg._id)} className="btn-reject">Reject Payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerEventDetail;
