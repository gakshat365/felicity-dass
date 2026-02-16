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
            .sort({ isPinned: -1, createdAt: 1 });

        res.json(messages);
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

        let reaction = message.reactions.find(r => r.type === type);
        if (!reaction) {
            message.reactions.push({ type, users: [userId] });
        } else {
            const userIndex = reaction.users.indexOf(userId);
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
