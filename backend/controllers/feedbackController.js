const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * @desc    Submit anonymous feedback for an event
 * @route   POST /api/feedback/:eventId
 * @access  Private (Registered & Present Participants)
 */
const submitFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;

        // 1. Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid rating. Please provide a score between 1 and 5.' });
        }

        // 2. Eligibility Check
        const registration = await Registration.findOne({
            event: eventId,
            participant: req.user._id
        });

        if (!registration) {
            return res.status(403).json({ message: 'You are not registered for this event.' });
        }

        if (registration.attendanceStatus !== 'Present') {
            return res.status(403).json({ message: 'Feedback can only be submitted for events you have attended.' });
        }

        if (registration.feedbackSubmitted) {
            return res.status(400).json({ message: 'You have already submitted feedback for this event.' });
        }

        // 3. Create Anonymous Feedback
        await Feedback.create({
            event: eventId,
            rating,
            comment
        });

        // 4. Mark Registration as feedback submitted (Blind link preserved)
        registration.feedbackSubmitted = true;
        await registration.save();

        res.status(201).json({ message: 'Thank you for your feedback!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get aggregate feedback and list for an event
 * @route   GET /api/feedback/event/:eventId
 * @access  Private (Organizer of event or Admin)
 */
const getEventFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Verify authorization
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizer.toString() !== userId.toString() && userRole !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this feedback.' });
        }

        // Fetch all feedback
        const feedbackList = await Feedback.find({ event: eventId }).sort({ createdAt: -1 });

        // Calculate Aggregates
        const total = feedbackList.length;
        if (total === 0) {
            return res.json({
                stats: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
                list: []
            });
        }

        const sum = feedbackList.reduce((acc, curr) => acc + curr.rating, 0);
        const average = (sum / total).toFixed(1);

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbackList.forEach(f => {
            distribution[f.rating] = (distribution[f.rating] || 0) + 1;
        });

        res.json({
            stats: {
                average: parseFloat(average),
                total,
                distribution
            },
            list: feedbackList
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitFeedback,
    getEventFeedback
};
