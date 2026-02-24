import { useState, useEffect, useRef, useContext } from 'react';
import axios from '../api/axios';
import AuthContext from '../context/AuthContext';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './DiscussionForum.css';

const DiscussionForum = ({ eventId, eventOrganizerId }) => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState(null); // { id, name }
    const [loading, setLoading] = useState(true);
    const [isPinnedOnly, setIsPinnedOnly] = useState(false);
    const [notAllowed, setNotAllowed] = useState(false);
    const socketRef = useRef();
    const messagesEndRef = useRef();

    useEffect(() => {
        fetchMessages();

        // Socket setup — send auth token for server-side verification
        const token = localStorage.getItem('token');
        socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
            auth: { token }
        });
        socketRef.current.emit('join_room', `forum_${eventId}`);

        socketRef.current.on('receive_message', (data) => {
            if (data.type === 'new') {
                setMessages(prev => [...prev, data.message]);

                // Notifications logic
                if (data.message.user._id !== user._id) {
                    if (data.message.isPinned) {
                        toast('📢 New Announcement!', { icon: '✨', duration: 4000 });
                    } else if (data.message.parentId) {
                        // Check if it's a reply to current user (simplified)
                        // TODO: check original message author
                        toast.success('Someone replied in the forum');
                    }
                }
            } else if (data.type === 'delete') {
                setMessages(prev => prev.filter(m => m._id !== data.messageId));
            } else if (data.type === 'pin') {
                setMessages(prev => prev.map(m =>
                    m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m
                ));
            } else if (data.type === 'reaction') {
                setMessages(prev => prev.map(m =>
                    m._id === data.messageId ? { ...m, reactions: data.reactions } : m
                ));
            }
        });

        return () => socketRef.current.disconnect();
    }, [eventId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data } = await axios.get(`/forum/${eventId}`);
            setMessages(data);
        } catch (error) {
            if (error.response?.status === 403) {
                setNotAllowed(true);
            } else {
                console.error('Forum fetch error:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            const { data } = await axios.post(`/forum/${eventId}`, {
                content: input,
                parentId: replyTo?.id
            });

            socketRef.current.emit('send_message', {
                room: `forum_${eventId}`,
                type: 'new',
                message: data
            });

            setInput('');
            setReplyTo(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send message');
        }
    };

    const handleReaction = async (messageId, type) => {
        try {
            const { data } = await axios.patch(`/forum/message/${messageId}/react`, { type });
            socketRef.current.emit('send_message', {
                room: `forum_${eventId}`,
                type: 'reaction',
                messageId,
                reactions: data
            });
        } catch (error) {
            toast.error('Failed to react');
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm('Delete this message?')) return;
        try {
            await axios.delete(`/forum/message/${messageId}`);
            socketRef.current.emit('send_message', {
                room: `forum_${eventId}`,
                type: 'delete',
                messageId
            });
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handlePin = async (messageId) => {
        try {
            const { data } = await axios.patch(`/forum/message/${messageId}/pin`);
            socketRef.current.emit('send_message', {
                room: `forum_${eventId}`,
                type: 'pin',
                messageId,
                isPinned: data.isPinned
            });
            toast.success(data.isPinned ? 'Message pinned' : 'Message unpinned');
        } catch (error) {
            toast.error('Failed to pin');
        }
    };

    if (loading) return <div className="forum-loading">Entering Forum...</div>;

    if (notAllowed) return (
        <div className="forum-container">
            <div className="forum-header"><h3>Forum & Announcements</h3></div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
                <p>🔒 Register for this event to join the discussion.</p>
            </div>
        </div>
    );

    const isOrganizer = user._id === eventOrganizerId || user.role === 'admin';
    const filteredMessages = isPinnedOnly ? messages.filter(m => m.isPinned) : messages;

    // Group messages into threads: top-level messages with their replies nested
    const topLevelMessages = filteredMessages.filter(m => !m.parentId);
    const repliesByParent = {};
    filteredMessages.filter(m => m.parentId).forEach(m => {
        const parentId = typeof m.parentId === 'object' ? m.parentId._id : m.parentId;
        if (!repliesByParent[parentId]) repliesByParent[parentId] = [];
        repliesByParent[parentId].push(m);
    });

    const renderMessage = (msg, isReply = false) => {
        const parentMsg = isReply ? messages.find(m => m._id === (typeof msg.parentId === 'object' ? msg.parentId._id : msg.parentId)) : null;
        return (
            <div key={msg._id} className={`message-item ${msg.isPinned ? 'pinned' : ''} ${isReply ? 'reply-message' : ''}`} style={isReply ? { marginLeft: '2rem', borderLeft: '2px solid #30363d', paddingLeft: '1rem' } : {}}>
                <div className="msg-avatar">
                    {msg.user.organizerName ? '🏢' : '👤'}
                </div>
                <div className="msg-content">
                    <div className="msg-meta">
                        <span className="msg-author">
                            {msg.user.organizerName || `${msg.user.firstName} ${msg.user.lastName}`}
                            {msg.user.role === 'organizer' && <span className="badge-org">Organizer</span>}
                        </span>
                        <span className="msg-time">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                    </div>

                    {isReply && parentMsg && (
                        <div className="replying-to" style={{ background: '#161b22', borderLeft: '3px solid #58a6ff', padding: '4px 8px', marginBottom: '4px', fontSize: '0.8rem', color: '#8b949e', borderRadius: '4px' }}>
                            ↩️ <strong>{parentMsg.user.organizerName || parentMsg.user.firstName}</strong>: {parentMsg.content.substring(0, 80)}{parentMsg.content.length > 80 ? '...' : ''}
                        </div>
                    )}

                    <div className="msg-text">{msg.content}</div>

                    <div className="msg-footer">
                        <div className="reactions">
                            {['like', 'heart', 'party', 'question'].map(type => {
                                const reaction = msg.reactions.find(r => r.type === type);
                                const count = reaction?.users.length || 0;
                                const hasReacted = reaction?.users.includes(user._id);

                                return (
                                    <button
                                        key={type}
                                        className={`reaction-btn ${hasReacted ? 'active' : ''}`}
                                        onClick={() => handleReaction(msg._id, type)}
                                    >
                                        {type === 'like' && '👍'}
                                        {type === 'heart' && '❤️'}
                                        {type === 'party' && '🎉'}
                                        {type === 'question' && '❓'}
                                        {count > 0 && <span className="count">{count}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="msg-actions">
                            {!msg.parentId && (
                                <button onClick={() => setReplyTo({ id: msg._id, name: msg.user.firstName || msg.user.organizerName })} className="action-link">Reply</button>
                            )}
                            {isOrganizer && (
                                <button onClick={() => handlePin(msg._id)} className="action-link">
                                    {msg.isPinned ? 'Unpin' : 'Pin'}
                                </button>
                            )}
                            {(msg.user._id === user._id || isOrganizer) && (
                                <button onClick={() => handleDelete(msg._id)} className="action-link delete">Delete</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="forum-container">
            <div className="forum-header">
                <h3>Forum & Announcements</h3>
                <div className="forum-filters">
                    <button
                        className={`filter-btn ${!isPinnedOnly ? 'active' : ''}`}
                        onClick={() => setIsPinnedOnly(false)}
                    >All</button>
                    <button
                        className={`filter-btn ${isPinnedOnly ? 'active' : ''}`}
                        onClick={() => setIsPinnedOnly(true)}
                    >Announcements</button>
                </div>
            </div>

            <div className="messages-display">
                {topLevelMessages.map(msg => (
                    <div key={msg._id} className="thread-group">
                        {renderMessage(msg)}
                        {repliesByParent[msg._id] && repliesByParent[msg._id].map(reply => renderMessage(reply, true))}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="forum-input-area">
                {replyTo && (
                    <div className="reply-preview">
                        Replying to <strong>{replyTo.name}</strong>
                        <button onClick={() => setReplyTo(null)}>&times;</button>
                    </div>
                )}
                <div className="input-row">
                    <input
                        type="text"
                        placeholder={replyTo ? "Write a reply..." : "Ask a question or post an update..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" className="send-btn">Send</button>
                </div>
            </form>
        </div>
    );
};

export default DiscussionForum;
