const Message = require('../models/Message');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

/**
 * @desc    Get all messages for an event forum
 * @route   GET /api/forum/:eventId
 * @access  Private (Registered participants + Organizer/Admin)
 */
const getForumMessages = async (req, res) => {
    try {
        const { eventId } = req.params;
        const user = req.user;

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Authorization: Admin, Organizer of event, or registered participant
        const isOrganizer = event.organizer.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';
        const registration = await Registration.findOne({ event: eventId, participant: user._id, status: 'confirmed' });

        if (!isOrganizer && !isAdmin && !registration) {
            return res.status(403).json({ message: 'You must be registered for this event to view the forum' });
        }

        const messages = await Message.find({ event: eventId, isDeleted: false })
            .populate('user', 'firstName lastName organizerName role')
            .sort({ isPinned: -1, createdAt: 1 })
            .lean(); // Use lean to easily modify the returned objects

        // Structure messages into threads
        const parents = [];
        const childrenMap = {};

        messages.forEach(msg => {
            if (!msg.parentId) {
                msg.replies = [];
                parents.push(msg);
                childrenMap[msg._id.toString()] = msg;
            } else {
                if (!childrenMap[msg.parentId.toString()]) {
                    childrenMap[msg.parentId.toString()] = { replies: [] };
                }
                if (!childrenMap[msg.parentId.toString()].replies) {
                    childrenMap[msg.parentId.toString()].replies = [];
                }
                childrenMap[msg.parentId.toString()].replies.push(msg);
            }
        });

        res.json(parents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Post a message to the forum
 * @route   POST /api/forum/:eventId
 * @access  Private
 */
const postMessage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content, parentId, isPinned } = req.body;
        const user = req.user;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Authorization to post
        const isOrganizer = event.organizer.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';
        const registration = await Registration.findOne({ event: eventId, participant: user._id, status: 'confirmed' });

        if (!isOrganizer && !isAdmin && !registration) {
            return res.status(403).json({ message: 'You must be registered to post in the forum' });
        }

        // Only organizers/admin can pin (Announcements)
        const canPin = isOrganizer || isAdmin;

        const message = await Message.create({
            event: eventId,
            user: user._id,
            content,
            parentId: parentId || null,
            isPinned: canPin ? !!isPinned : false
        });

        // Offline Notification Logic
        const Notification = require('../models/Notification');
        const senderName = user.firstName || user.organizerName || 'Someone';
        const mentionsAll = /@(all|everyone)/i.test(content);

        if (parentId) {
            // Notify the author of the parent message when someone replies
            const parentMessage = await Message.findById(parentId).populate('user');
            if (parentMessage && parentMessage.user._id.toString() !== user._id.toString()) {
                await Notification.create({
                    user: parentMessage.user._id,
                    type: 'forum_reply',
                    title: 'New Reply in Forum',
                    message: `${senderName} replied to your message.`,
                    link: `/events/${eventId}`
                });
            }
        }

        // Notify all participants if organizer/admin posts OR message contains @all / @everyone
        if ((isOrganizer || isAdmin || mentionsAll) && !parentId) {
            const registrations = await Registration.find({ event: eventId, status: 'confirmed' }).select('participant');
            const notifyPayloads = registrations
                .filter(r => r.participant.toString() !== user._id.toString())
                .map(r => ({
                    user: r.participant,
                    type: 'forum_announcement',
                    title: 'New Organizer Message',
                    message: `${senderName} posted a message in the forum: "${content.substring(0, 80)}${content.length > 80 ? '…' : ''}"`,
                    link: `/events/${eventId}`
                }));
            if (notifyPayloads.length > 0) {
                await Notification.insertMany(notifyPayloads);
            }
        }

        const populatedMessage = await Message.findById(message._id)
            .populate('user', 'firstName lastName organizerName role');

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Toggle reaction on a message
 * @route   PATCH /api/forum/message/:messageId/react
 * @access  Private
 */
const toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { type } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        // Validate reaction type
        const validReactionTypes = ['like', 'heart', 'party', 'question'];
        if (!validReactionTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid reaction type' });
        }

        let reaction = message.reactions.find(r => r.type === type);
        if (!reaction) {
            message.reactions.push({ type, users: [userId] });
        } else {
            const userIndex = reaction.users.findIndex(u => u.toString() === userId.toString());
            if (userIndex === -1) {
                reaction.users.push(userId);
            } else {
                reaction.users.splice(userIndex, 1);
            }
        }

        await message.save();
        res.json(message.reactions);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Pin/Unpin message
 * @route   PATCH /api/forum/message/:messageId/pin
 * @access  Private (Organizer/Admin only)
 */
const togglePin = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId).populate('event');

        if (!message) return res.status(404).json({ message: 'Message not found' });

        const isOrganizer = message.event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        message.isPinned = !message.isPinned;
        await message.save();
        res.json(message);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete message (soft delete)
 * @route   DELETE /api/forum/message/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId).populate('event');

        if (!message) return res.status(404).json({ message: 'Message not found' });

        const isOwner = message.user.toString() === req.user._id.toString();
        const isOrganizer = message.event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        message.isDeleted = true;
        await message.save();
        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getForumMessages,
    postMessage,
    toggleReaction,
    togglePin,
    deleteMessage
};
