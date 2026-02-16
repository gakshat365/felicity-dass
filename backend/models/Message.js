const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // For Public Forum
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // For Private Team Chat
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // Single-level threading
    isPinned: { type: Boolean, default: false }, // For Announcements
    isDeleted: { type: Boolean, default: false }, // Moderation (soft delete)
    reactions: [{
        type: { type: String, enum: ['like', 'heart', 'party', 'question'] },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }]
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
