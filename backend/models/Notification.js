const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['forum_reply', 'forum_announcement', 'event_update', 'payment_status', 'registration', 'team_update'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, // Optional URL to navigate to when clicked
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
