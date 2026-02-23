const Event = require('../models/Event');
const User = require('../models/User');
const { sendEventNotification } = require('../services/discordService');

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private (Organizer only)
 */
const createEvent = async (req, res) => {
    try {
        const {
            name,
            description,
            type,
            startDate,
            endDate,
            registrationDeadline,
            eligibility,
            eligibilityCustom,
            registrationLimit,
            registrationFee,
            tags,
            customFormTitle,
            customFormDescription,
            customForm,
            merchandiseDetails,
            itemDetails,
            stock,
            purchaseLimitPerUser,
            upiId,
            status
        } = req.body;

        // Validate user is organizer
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only organizers can create events' });
        }

        // Validate custom form (max 25 questions)
        if (customForm && customForm.length > 25) {
            return res.status(400).json({ message: 'Custom form cannot have more than 25 questions' });
        }

        // Process custom form - ensure every field has a questionId
        if (customForm && customForm.length > 0) {
            customForm.forEach((field, index) => {
                if (!field.questionId) {
                    field.questionId = `field_${Date.now()}_${index}`;
                }
            });
        }

        const event = await Event.create({
            name,
            description,
            type,
            organizer: req.user._id,
            startDate,
            endDate,
            registrationDeadline,
            eligibility: eligibility || 'All',
            eligibilityCustom,
            registrationLimit,
            registrationFee: registrationFee || 0,
            tags: tags || [],
            customFormTitle: type === 'normal' ? customFormTitle : undefined,
            customFormDescription: type === 'normal' ? customFormDescription : undefined,
            customForm: type === 'normal' ? customForm : [],
            merchandiseDetails: type === 'merchandise' ? merchandiseDetails : undefined,
            itemDetails: type === 'merchandise' ? (itemDetails || merchandiseDetails) : undefined,
            stock: type === 'merchandise' ? stock : undefined,
            purchaseLimitPerUser: type === 'merchandise' ? purchaseLimitPerUser : undefined,
            upiId: upiId || process.env.UPI_ID,
            status: status || 'draft'
        });

        const populatedEvent = await Event.findById(event._id)
            .populate('organizer', 'organizerName category discordWebhookUrl');

        // Notify via Discord if published
        if (event.status === 'published' && populatedEvent.organizer.discordWebhookUrl) {
            sendEventNotification(populatedEvent.organizer.discordWebhookUrl, populatedEvent);
        }

        res.status(201).json(populatedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all events with filters
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = async (req, res) => {
    try {
        const { type, tags, status, organizer, search, eligibility, startDate, endDate, followedOnly } = req.query;

        let query = {};

        // Handle followedOnly functionality independently parsing token if needed
        if (followedOnly === 'true' && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                const userObj = await User.findById(decoded.id);
                if (userObj && userObj.following && userObj.following.length > 0) {
                    query.organizer = { $in: userObj.following };
                } else {
                    return res.json([]); // Return empty if following nobody
                }
            } catch (err) {
                console.error('Followed Only Token Error:', err);
                return res.json([]);
            }
        }


        // Filter by type
        if (type && ['normal', 'merchandise'].includes(type)) {
            query.type = type;
        }

        // Filter by tags
        if (tags) {
            const tagArray = tags.split(',');
            query.tags = { $in: tagArray };
        }

        // Filter by status (default to published for public)
        if (status) {
            const statusArray = status.split(',');
            query.status = { $in: statusArray };
        } else {
            query.status = 'published';
        }


        // Filter by organizer
        if (organizer) {
            query.organizer = organizer;
        }

        // Filter by eligibility
        if (eligibility) {
            query.eligibility = eligibility;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        // Search by name, description, tags, or organizer name
        if (search) {
            const searchRegex = new RegExp(search.split(' ').join('|'), 'i');

            // To search by organizer name, we first find organizers matching the name
            const matchingOrganizers = await User.find({
                role: 'organizer',
                organizerName: { $regex: searchRegex }
            }).select('_id');
            const organizerIds = matchingOrganizers.map(o => o._id);

            query.$or = [
                { name: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { tags: { $in: [searchRegex] } },
                { organizer: { $in: organizerIds } }
            ];
        }

        const events = await Event.find(query)
            .populate('organizer', 'organizerName category')
            .sort({ createdAt: -1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get personalized events based on user interests
 * @route   GET /api/events/for-you
 * @access  Private (Participant only)
 */
const getForYouEvents = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || user.role !== 'participant') {
            return res.status(403).json({ message: 'Only participants can access personalized events' });
        }

        if (!user.interests || user.interests.length === 0) {
            return res.json([]);
        }

        const events = await Event.find({
            tags: { $in: user.interests },
            status: 'published',
            registrationDeadline: { $gte: new Date() }
        })
            .populate('organizer', 'organizerName category')
            .sort({ startDate: 1 })
            .limit(20);

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get events from followed organizers
 * @route   GET /api/events/following
 * @access  Private (Participant only)
 */
const getFollowingEvents = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || user.role !== 'participant') {
            return res.status(403).json({ message: 'Only participants can access this feature' });
        }

        if (!user.following || user.following.length === 0) {
            return res.json([]);
        }

        const events = await Event.find({
            organizer: { $in: user.following },
            status: 'published',
            registrationDeadline: { $gte: new Date() }
        })
            .populate('organizer', 'organizerName category')
            .sort({ startDate: 1 })
            .limit(20);

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get trending events (most registrations)
 * @route   GET /api/events/trending
 * @access  Public
 */
const getTrendingEvents = async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const Registration = require('../models/Registration');

        // Phase 3 Features: Trending (Top 5/24h)
        const recentRegistrations = await Registration.aggregate([
            { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
            { $group: { _id: '$event', recentCount: { $sum: 1 } } },
            { $sort: { recentCount: -1 } },
            { $limit: 5 }
        ]);

        const eventIds = recentRegistrations.map(r => r._id);
        let events = [];

        if (eventIds.length > 0) {
            const rawEvents = await Event.find({
                _id: { $in: eventIds },
                status: 'published',
                registrationDeadline: { $gte: new Date() }
            }).populate('organizer', 'organizerName category');

            // Preserve ranking sequence from aggregation
            events = eventIds.map(id => rawEvents.find(e => e._id.toString() === id.toString())).filter(Boolean);
        }

        // Backfill remaining slots up to 5 with historically popular events if recent data is sparse
        if (events.length < 5) {
            const fallbackEvents = await Event.find({
                _id: { $nin: eventIds },
                status: 'published',
                registrationDeadline: { $gte: new Date() }
            })
                .populate('organizer', 'organizerName category')
                .sort({ registrationCount: -1, viewCount: -1 })
                .limit(5 - events.length);

            events = [...events, ...fallbackEvents];
        }

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get events ending soon (deadline in next 3 days)
 * @route   GET /api/events/ending-soon
 * @access  Public
 */
const getEndingSoonEvents = async (req, res) => {
    try {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const events = await Event.find({
            status: 'published',
            registrationDeadline: {
                $gte: new Date(),
                $lte: threeDaysFromNow
            }
        })
            .populate('organizer', 'organizerName category')
            .sort({ registrationDeadline: 1 })
            .limit(10);

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'organizerName category description contactEmail');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Increment view count
        event.viewCount += 1;
        await event.save();

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update event
 * @route   PATCH /api/events/:id
 * @access  Private (Organizer/Admin only)
 */
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        // Determine what can be edited based on status
        const allowedUpdates = {
            draft: 'all', // Can edit everything
            published: ['description', 'registrationDeadline', 'registrationLimit', 'tags', 'status'], // Limited edits
            ongoing: ['status'], // Only status change
            completed: ['status'], // Only status change
            cancelled: [] // No edits
        };

        const allowed = allowedUpdates[event.status];

        if (allowed === 'all') {
            // Update all fields for draft events
            Object.keys(req.body).forEach(key => {
                if (key !== '_id' && key !== 'organizer' && key !== 'createdAt') {
                    event[key] = req.body[key];
                }
            });
        } else if (Array.isArray(allowed)) {
            // Update only allowed fields
            for (const field of allowed) {
                if (req.body[field] !== undefined) {
                    if (event.status === 'published') {
                        if (field === 'registrationDeadline' && new Date(req.body[field]) < new Date(event.registrationDeadline)) {
                            return res.status(400).json({ message: 'Can only extend registration deadline' });
                        }
                        if (field === 'registrationLimit' && req.body[field] < event.registrationLimit) {
                            return res.status(400).json({ message: 'Can only increase registration limit' });
                        }
                        if (field === 'status' && !['ongoing', 'completed', 'cancelled'].includes(req.body[field])) {
                            return res.status(400).json({ message: 'Invalid status transition from published' });
                        }
                    } else if (['ongoing', 'completed'].includes(event.status)) {
                        if (field === 'status' && !['completed', 'cancelled'].includes(req.body[field])) {
                            return res.status(400).json({ message: 'Ongoing/Completed events can only be marked completed or cancelled' });
                        }
                    }
                    event[field] = req.body[field];
                }
            }
        } else {
            return res.status(400).json({ message: `Cannot edit ${event.status} events` });
        }

        // Validate custom form if updated
        if (req.body.customForm && req.body.customForm.length > 25) {
            return res.status(400).json({ message: 'Custom form cannot have more than 25 questions' });
        }

        if (req.body.customForm && event.registrationCount > 0) {
            // Check if form changed
            const formChanged = JSON.stringify(req.body.customForm) !== JSON.stringify(event.customForm);
            if (formChanged) {
                return res.status(400).json({ message: 'Custom form cannot be modified after the first registration' });
            }
        }

        const oldStatus = event.status;
        await event.save();

        const updatedEvent = await Event.findById(event._id)
            .populate('organizer', 'organizerName category discordWebhookUrl');

        // Notify via Discord if newly published
        if (oldStatus === 'draft' && updatedEvent.status === 'published' && updatedEvent.organizer.discordWebhookUrl) {
            sendEventNotification(updatedEvent.organizer.discordWebhookUrl, updatedEvent);
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private (Organizer/Admin only)
 */
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        // Only draft events can be deleted
        if (event.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft events can be deleted. Use cancel instead.' });
        }

        await event.deleteOne();

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get events created by current organizer
 * @route   GET /api/events/my-events
 * @access  Private (Organizer only)
 */
const getMyEvents = async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only organizers can access this feature' });
        }

        const events = await Event.find({ organizer: req.user._id })
            .populate('organizer', 'organizerName category')
            .sort({ createdAt: -1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Export event registrations as CSV
 * GET /api/events/:id/export-csv
 * @access Private (Organizer/Admin only)
 */
const exportEventCSV = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get all registrations
        const Registration = require('../models/Registration');
        const registrations = await Registration.find({ event: req.params.id })
            .populate('participant', 'firstName lastName email contactNumber');

        // Create CSV content
        let csvContent = 'Ticket ID,Name,Email,Contact,Status,Payment Status,Team Name,Registration Date,Attendance,Audit Note,Timestamp\n';

        registrations.forEach(reg => {
            const name = `${reg.participant?.firstName || ''} ${reg.participant?.lastName || ''}`.trim();
            const email = reg.participant?.email || '';
            const contact = reg.participant?.contactNumber || '';
            const status = reg.status;
            const paymentStatus = reg.paymentStatus || 'N/A';
            const teamName = reg.teamName || '';
            const regDate = new Date(reg.registrationDate).toLocaleDateString();
            const attendance = reg.attendanceMarked ? 'Yes' : 'No';
            const auditNote = reg.isManualOverride ? `Manual: ${reg.manualOverrideReason}` : (reg.attendanceMarked ? 'QR Scan' : '');
            const timestamp = reg.attendanceMarkedAt ? new Date(reg.attendanceMarkedAt).toLocaleTimeString() : '';

            csvContent += `"${reg.ticketId}","${name}","${email}","${contact}","${status}","${paymentStatus}","${teamName}","${regDate}","${attendance}","${auditNote}","${timestamp}"\n`;
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}-participants.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ message: 'Failed to export CSV' });
    }
};

/**
 * Mark attendance for a ticket
 * POST /api/events/attendance/mark
 * @access Private (Organizer/Admin only)
 */
const markAttendance = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const Registration = require('../models/Registration');

        const registration = await Registration.findOne({ ticketId })
            .populate('event')
            .populate('participant', 'firstName lastName');

        if (!registration) {
            return res.status(404).json({ message: 'Invalid Ticket ID' });
        }

        // Check authorization
        if (registration.event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized for this event' });
        }

        if (registration.attendanceMarked) {
            return res.status(400).json({
                message: 'Duplicate scan! Attendance already marked.',
                participantName: `${registration.participant.firstName} ${registration.participant.lastName}`,
                markedAt: registration.attendanceMarkedAt
            });
        }

        const { reason, isManual } = req.body;

        registration.attendanceMarked = true;
        registration.attendanceStatus = 'Present';
        registration.attendanceMarkedAt = new Date();
        registration.attendanceMarkedBy = req.user._id;

        if (isManual) {
            registration.isManualOverride = true;
            registration.manualOverrideReason = reason || 'Manual override by organizer';
        }

        await registration.save();

        res.json({
            message: isManual ? 'Attendance marked (Manual)' : 'Attendance marked',
            participantName: `${registration.participant.firstName} ${registration.participant.lastName}`,
            timestamp: registration.attendanceMarkedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get stats for organizer's dashboard
 * GET /api/events/organizer/stats
 * @access Private (Organizer only)
 */
const getOrganizerStats = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id });
        const Registration = require('../models/Registration');

        const registrations = await Registration.find({
            event: { $in: events.map(e => e._id) },
        }).populate('event', 'registrationFee');

        // Revenue = sum of (registrationFee × confirmed paid registrations per event)
        const totalRevenue = registrations
            .filter(r => r.status === 'confirmed' && r.paymentRequired)
            .reduce((acc, r) => acc + (r.paymentAmount || r.event?.registrationFee || 0), 0);

        const stats = {
            totalRegistrations: registrations.length,
            totalRevenue,
            activeEvents: events.filter(e => e.status === 'published' || e.status === 'ongoing').length,
            averageAttendance: registrations.length > 0
                ? Math.round((registrations.filter(r => r.attendanceMarked).length / registrations.length) * 100)
                : 0
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createEvent,
    getEvents,
    getForYouEvents,
    getFollowingEvents,
    getTrendingEvents,
    getEndingSoonEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getMyEvents,
    exportEventCSV,
    markAttendance,
    getOrganizerStats
};
