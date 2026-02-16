import { useNavigate } from 'react-router-dom';

const MyEvents = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0d1117',
            padding: '40px',
            color: '#c9d1d9',
            textAlign: 'center'
        }}>
            <h1>My Events</h1>
            <p>Organizer event management page coming soon...</p>
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    background: '#58a6ff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default MyEvents;
