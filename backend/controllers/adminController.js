const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * @desc    Get system-wide stats for admin dashboard
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOrganizers = await User.countDocuments({ role: 'organizer' });
        const totalParticipants = await User.countDocuments({ role: 'participant' });
        const totalEvents = await Event.countDocuments();
        const totalRegistrations = await Registration.countDocuments();
        res.json({
            totalUsers,
            totalOrganizers,
            totalParticipants,
            totalEvents,
            totalRegistrations
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all organizers
 * @route   GET /api/admin/organizers
 * @access  Private (Admin only)
 */
const getOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' })
            .select('-password')
            .sort({ createdAt: -1 });

        // Add event count for each organizer
        const organizersWithCounts = await Promise.all(organizers.map(async (org) => {
            const eventsCount = await Event.countDocuments({ organizer: org._id });
            return {
                ...org.toObject(),
                eventsCount
            };
        }));

        res.json(organizersWithCounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update organizer account status (active/suspended/archived)
 * @route   PATCH /api/admin/organizers/:id/status
 * @access  Private (Admin only)
 */
const updateOrganizerStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'suspended', 'archived'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or archived.' });
        }

        const organizer = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');

        res.json(organizer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all events
 * @route   GET /api/admin/events
 * @access  Private (Admin only)
 */
const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'organizerName email')
            .sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Create a new organizer account (Admin generated)
 * @route   POST /api/admin/organizers
 * @access  Private (Admin only)
 */
const createOrganizer = async (req, res) => {
    try {
        const { email, organizerName, category, description } = req.body;

        // Validate organizer email domain per Phase 1 requirements
        const { validateOrganizerEmail } = require('../utils/emailValidator');
        const emailCheck = validateOrganizerEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({
                message: `Invalid organizer email domain. ${emailCheck.message}`
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate random password
        const password = crypto.randomBytes(8).toString('hex');
        const organizer = await User.create({
            firstName: organizerName,
            lastName: category || 'Organizer',
            email,
            password, // Let model hash it
            role: 'organizer',
            organizerName,
            category,
            description,
            status: 'active'
        });

        // TODO: send this password via email
        res.status(201).json({
            message: 'Organizer created successfully',
            email,
            password, // Only send in response for admin to share manually as per 11.2
            organizer: {
                id: organizer._id,
                organizerName: organizer.organizerName
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const PasswordResetRequest = require('../models/PasswordResetRequest');

/**
 * @desc    Get all password reset requests
 * @route   GET /api/admin/password-requests
 * @access  Private (Admin only)
 */
const getPasswordRequests = async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('user', 'firstName lastName email role')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Handle password reset request (Approve/Reject)
 * @route   PATCH /api/admin/password-requests/:id
 * @access  Private (Admin only)
 */
const handlePasswordRequest = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const request = await PasswordResetRequest.findById(req.params.id).populate('user');
        const { sendPasswordResetEmail } = require('../services/emailService');
        const crypto = require('crypto');

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        request.adminNotes = adminNotes;
        request.handledBy = req.user._id;
        request.handledAt = new Date();

        if (status === 'approved') {
            // Generate professional temporary password: ClubName#6hex
            const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
            const clubSlug = (request.user.organizerName || 'User').split(' ')[0];
            const newPassword = `${clubSlug}#${hex}`;

            const user = await User.findById(request.user);
            user.password = newPassword; // Let model hash it
            await user.save();

            // Send Email
            await sendPasswordResetEmail(user, newPassword);

            // Add temp password to notes so admin can share it
            request.adminNotes = `Approved. Temp Password: ${newPassword}. Admin Note: ${adminNotes || 'N/A'}`;
        }

        await request.save();
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete/Archive an organizer account
 * @route   DELETE /api/admin/organizers/:id
 * @access  Private (Admin only)
 */
const deleteOrganizer = async (req, res) => {
    try {
        const organizer = await User.findById(req.params.id);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Get all event IDs for this organizer to clean up related data
        const eventIds = await Event.find({ organizer: req.params.id }).select('_id');
        const eventIdList = eventIds.map(e => e._id);

        // Clean up all related data
        if (eventIdList.length > 0) {
            const Feedback = require('../models/Feedback');
            const Message = require('../models/Message');
            const Notification = require('../models/Notification');
            const Team = require('../models/Team');

            await Registration.deleteMany({ event: { $in: eventIdList } });
            await Team.deleteMany({ event: { $in: eventIdList } });
            await Message.deleteMany({ event: { $in: eventIdList } });
            await Feedback.deleteMany({ event: { $in: eventIdList } });
            await Notification.deleteMany({ link: { $regex: eventIdList.map(id => id.toString()).join('|') } });
        }

        // Delete events and organizer
        await Event.deleteMany({ organizer: req.params.id });
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'Organizer and all associated data removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStats,
    getOrganizers,
    updateOrganizerStatus,
    getAllEvents,
    createOrganizer,
    getPasswordRequests,
    handlePasswordRequest,
    deleteOrganizer
};
