const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { generateTicket } = require('../services/ticketService');
const { sendTicketEmail, sendPaymentApprovalEmail, sendPaymentRejectionEmail } = require('../services/emailService');
const { uploadPaymentProof } = require('../services/cloudinaryService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `payment-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
        }
    }
});

/**
 * Create a new registration
 * POST /api/registrations
 */
const createRegistration = async (req, res) => {
    try {
        const { eventId, teamName, formResponses, merchandiseDetails } = req.body;
        const participantId = req.user._id;

        // Validate eventId format before hitting DB
        const mongoose = require('mongoose');
        if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }

        // Get event details
        const event = await Event.findById(eventId).populate('organizer');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event is published
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is not open for registration' });
        }

        // Check registration deadline
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // Check if already registered
        const existingRegistration = await Registration.findOne({
            event: eventId,
            participant: participantId,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingRegistration) {
            return res.status(400).json({ message: 'You are already registered for this event' });
        }

        // Check eligibility
        if (event.eligibility !== 'All' && event.eligibility !== 'Custom') {
            const participant = await User.findById(participantId);
            const pType = participant?.participantType; // 'IIIT Student', 'IIIT Professor', 'Outside IIIT'

            const isIIITMember = pType === 'IIIT Student' || pType === 'IIIT Professor';
            const isOutsideIIIT = pType === 'Outside IIIT';

            if (event.eligibility === 'IIIT Students Only' && !isIIITMember) {
                return res.status(403).json({ message: 'This event is open to IIIT Students and Faculty only.' });
            }
            if (event.eligibility === 'IIIT Community' && !isIIITMember) {
                return res.status(403).json({ message: 'This event is open to the IIIT community only.' });
            }
            if (event.eligibility === 'Outside IIIT Only' && !isOutsideIIIT) {
                return res.status(403).json({ message: 'This event is open to participants outside IIIT only.' });
            }
        }

        // Validate custom form word counts
        if (event.type === 'normal' && event.customForm && event.customForm.length > 0 && formResponses) {
            for (const field of event.customForm) {
                const fieldType = field.type || field.questionType;
                const fieldLabel = field.label || field.questionText;

                const response = formResponses[fieldLabel];
                if (response && typeof response === 'string') {
                    const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
                    if ((fieldType === 'text' || fieldType === 'short') && wordCount > 50) {
                        return res.status(400).json({ message: `Answer for "${fieldLabel}" cannot exceed 50 words` });
                    }
                    if ((fieldType === 'textarea' || fieldType === 'long') && wordCount > 200) {
                        return res.status(400).json({ message: `Answer for "${fieldLabel}" cannot exceed 200 words` });
                    }
                }
            }
        }

        // Check registration limit
        if (event.registrationLimit) {
            const registrationCount = await Registration.countDocuments({
                event: eventId,
                status: { $in: ['pending', 'confirmed'] }
            });

            if (registrationCount >= event.registrationLimit) {
                return res.status(400).json({ message: 'Registration limit reached' });
            }
        }

        // Check stock/limit and reserve
        let countIncremented = false;
        if (event.type === 'merchandise') {
            if (event.stock !== undefined && event.stock <= 0) {
                return res.status(400).json({ message: 'Item is out of stock' });
            }

            // If merchandise is completely free, it confirms instantly, so we must decrement stock atomically NOW.
            if (!event.registrationFee || event.registrationFee <= 0) {
                const updatedEvent = await Event.findOneAndUpdate(
                    { _id: eventId, stock: { $gt: 0 } },
                    { $inc: { stock: -1 } },
                    { new: true }
                );
                if (!updatedEvent) {
                    return res.status(400).json({ message: 'Item is out of stock' });
                }
            }
            // If Paid Merchandise, do NOT decrement stock here. Phase 4 mandates stock drops strictly on payment approval.
        } else if (event.registrationLimit) {
            // Atomic update to avoid TOCTOU race condition for normal events
            const updatedEvent = await Event.findOneAndUpdate(
                { _id: eventId, registrationCount: { $lt: event.registrationLimit } },
                { $inc: { registrationCount: 1 } },
                { new: true }
            );
            if (!updatedEvent) {
                return res.status(400).json({ message: 'Registration limit reached' });
            }
            countIncremented = true;
        }

        // Create registration
        const registration = new Registration({
            event: eventId,
            participant: participantId,
            registrationType: event.type,
            teamName: teamName || null,
            formResponses: formResponses || {},
            merchandiseDetails: event.type === 'merchandise' ? merchandiseDetails : undefined,
            paymentRequired: event.registrationFee > 0,
            paymentAmount: event.registrationFee || 0,
            status: event.registrationFee > 0 ? 'pending' : 'confirmed',
            ticketId: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` // Unique placeholder; updated after save
        });

        // Save to get ID
        await registration.save();

        const participant = await User.findById(participantId);

        // Generate ticket ONLY if confirmed (Free events)
        let ticket = null;
        if (registration.status === 'confirmed') {
            ticket = await generateTicket(registration, event, participant);

            // Update registration with ticket data
            registration.ticketId = ticket.ticketId;
            registration.ticketQRCode = ticket.qrCodeBase64;
            registration.ticketPdfUrl = ticket.pdfUrl;
            await registration.save();

            // Send ticket email
            await sendTicketEmail(participant, event, ticket);
        } else {
            // For pending events, ticketId is just a placeholder until approval
            registration.ticketId = `PENDING-${registration._id}`;
            await registration.save();
        }

        // Update event registration count if not already handled by atomic limit checks
        if (!countIncremented) {
            await Event.findByIdAndUpdate(eventId, {
                $inc: { registrationCount: 1 }
            });
        }

        // Populate for response
        await registration.populate('event participant');

        const response = {
            message: 'Registration successful!',
            registration
        };

        if (ticket) {
            response.ticket = {
                ticketId: ticket.ticketId,
                qrCode: ticket.qrCodeBase64
            };
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message || 'Registration failed' });
    }
};

/**
 * Get user's registrations
 * GET /api/registrations/my-registrations
 */
const getMyRegistrations = async (req, res) => {
    try {
        const { type, status } = req.query;
        const participantId = req.user._id;

        const query = { participant: participantId };

        // Filter by type
        if (type && type !== 'all') {
            if (type === 'upcoming') {
                // Get registrations for future events
                const upcomingEvents = await Event.find({
                    startDate: { $gte: new Date() }
                }).select('_id');
                query.event = { $in: upcomingEvents.map(e => e._id) };
                query.status = { $in: ['pending', 'confirmed'] };
            } else if (type === 'completed') {
                const completedEvents = await Event.find({
                    status: 'completed'
                }).select('_id');
                query.event = { $in: completedEvents.map(e => e._id) };
            } else if (type === 'cancelled') {
                query.status = { $in: ['cancelled', 'rejected'] };
            } else {
                query.registrationType = type;
            }
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        const registrations = await Registration.find(query)
            .populate({
                path: 'event',
                populate: { path: 'organizer', select: 'organizerName category' }
            })
            .populate('participant', 'firstName lastName email')
            .sort({ registrationDate: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({ message: 'Failed to fetch registrations' });
    }
};

/**
 * Get single registration
 * GET /api/registrations/:id
 */
const getRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate({
                path: 'event',
                populate: { path: 'organizer', select: 'organizerName category contactEmail' }
            })
            .populate('participant', 'firstName lastName email contactNumber');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check access (participant or organizer/admin)
        const isParticipant = registration.participant._id.toString() === req.user._id.toString();
        const isOrganizer = registration.event.organizer._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isParticipant && !isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(registration);
    } catch (error) {
        console.error('Get registration error:', error);
        res.status(500).json({ message: 'Failed to fetch registration' });
    }
};

/**
 * Upload payment proof
 * POST /api/registrations/:id/upload-payment-proof
 */
const uploadPaymentProofHandler = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if user owns this registration
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check strict state flow
        if (registration.status !== 'pending') {
            return res.status(400).json({ message: 'Payment proof can only be uploaded for pending registrations' });
        }

        // Check if payment is required
        if (!registration.paymentRequired) {
            return res.status(400).json({ message: 'Payment not required for this event' });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadPaymentProof(req.file.path, registration._id);

        // Update registration
        registration.paymentProofUrl = uploadResult.url;
        registration.paymentStatus = 'proof_uploaded';
        registration.paymentProofUploadedAt = new Date();
        await registration.save();

        // Clean up local file
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            message: 'Payment proof uploaded successfully',
            paymentProofUrl: uploadResult.url
        });
    } catch (error) {
        console.error('Upload payment proof error:', error);
        res.status(500).json({ message: error.message || 'Failed to upload payment proof' });
    }
};

/**
 * Approve payment (Organizer/Admin only)
 * PATCH /api/registrations/:id/approve-payment
 */
const approvePayment = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event participant');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if user is organizer or admin
        const isOrganizer = registration.event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Handle Merchandise Stock Expiration Atomic Decrement
        if (registration.registrationType === 'merchandise') {
            const updatedEvent = await Event.findOneAndUpdate(
                { _id: registration.event._id, stock: { $gt: 0 } },
                { $inc: { stock: -1 } },
                { new: true }
            );
            if (!updatedEvent) {
                return res.status(400).json({
                    message: 'Out of stock! Cannot approve this payment. Event inventory is empty.'
                });
            }
        }

        // Update payment status
        registration.paymentStatus = 'approved';
        registration.status = 'confirmed';
        registration.paymentApprovedBy = req.user._id;
        registration.paymentApprovedAt = new Date();

        // Generate Ticket on Approval
        const ticket = await generateTicket(registration, registration.event, registration.participant);
        registration.ticketId = ticket.ticketId;
        registration.ticketQRCode = ticket.qrCodeBase64;
        registration.ticketPdfUrl = ticket.pdfUrl;

        await registration.save();

        // Send approval and ticket email
        await sendPaymentApprovalEmail(registration.participant, registration.event, registration);
        await sendTicketEmail(registration.participant, registration.event, ticket);

        res.json({
            message: 'Payment approved successfully',
            registration
        });
    } catch (error) {
        console.error('Approve payment error:', error);
        res.status(500).json({ message: 'Failed to approve payment' });
    }
};

/**
 * Reject payment (Organizer/Admin only)
 * PATCH /api/registrations/:id/reject-payment
 */
const rejectPayment = async (req, res) => {
    try {
        const { reason } = req.body;
        const registration = await Registration.findById(req.params.id)
            .populate('event participant');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if user is organizer or admin
        const isOrganizer = registration.event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update payment status
        registration.paymentStatus = 'rejected';
        registration.status = 'rejected';
        registration.paymentRejectionReason = reason || 'Payment proof invalid';
        await registration.save();

        // Send rejection email
        await sendPaymentRejectionEmail(registration.participant, registration.event, reason);

        res.json({
            message: 'Payment rejected',
            registration
        });
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ message: 'Failed to reject payment' });
    }
};

/**
 * Cancel registration (Participant only)
 * PATCH /api/registrations/:id/cancel
 */
const cancelRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if user owns this registration
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check strict cancellation conditions to protect analytics and flow
        if (registration.attendanceMarked) {
            return res.status(400).json({ message: 'Cannot cancel a registration that has already been attended' });
        }
        if (registration.paymentRequired && registration.status === 'confirmed') {
            return res.status(400).json({ message: 'Cannot self-cancel a confirmed paid registration without a manual refund' });
        }
        if (registration.status === 'cancelled') {
            return res.status(400).json({ message: 'Registration already cancelled' });
        }

        // Update status
        registration.status = 'cancelled';
        await registration.save();

        // Restore stock ONLY if it was completely free merchandise that instantly bypassed the pending queue
        if (registration.registrationType === 'merchandise' && !registration.paymentRequired) {
            await Event.findByIdAndUpdate(registration.event, {
                $inc: { stock: 1 }
            });
        }

        // Decrement event registration count
        await Event.findByIdAndUpdate(registration.event, {
            $inc: { registrationCount: -1 }
        });

        res.json({
            message: 'Registration cancelled successfully',
            registration
        });
    } catch (error) {
        console.error('Cancel registration error:', error);
        res.status(500).json({ message: 'Failed to cancel registration' });
    }
};

/**
 * Get all registrations for an event (Organizer/Admin only)
 * GET /api/events/:id/registrations
 */
const getEventRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ event: req.params.id })
            .populate('participant', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json(registrations);
    } catch (error) {
        console.error('Get event registrations error:', error);
        res.status(500).json({ message: 'Failed to fetch registrations' });
    }
};

/**
 * Mark attendance for a registration (Organizer/Admin only)
 * POST /api/registrations/:id/mark-attendance
 */
const markAttendance = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check if user is organizer or admin
        const isOrganizer = registration.event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if registration is confirmed
        if (registration.status !== 'confirmed') {
            return res.status(400).json({ message: 'Only confirmed registrations can mark attendance' });
        }

        // Check if already marked
        if (registration.attendanceMarked) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        // Mark attendance
        registration.attendanceMarked = true;
        registration.attendanceStatus = 'Present';
        registration.attendanceMarkedAt = new Date();
        registration.attendanceMarkedBy = req.user._id;
        await registration.save();

        res.json({
            message: 'Attendance marked successfully',
            registration
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Failed to mark attendance' });
    }
};

/**
 * Mark attendance by ticket ID or QR code (Organizer/Admin only)
 * POST /api/events/:eventId/mark-attendance
 */
const markAttendanceByTicket = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const eventId = req.params.eventId;

        if (!ticketId) {
            return res.status(400).json({ message: 'Ticket ID is required' });
        }

        // Get event and check access
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const isOrganizer = event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Find registration by ticket ID
        const registration = await Registration.findOne({
            event: eventId,
            ticketId: ticketId
        }).populate('participant', 'firstName lastName email');

        if (!registration) {
            return res.status(404).json({ message: 'Invalid ticket ID for this event' });
        }

        // Check if registration is confirmed
        if (registration.status !== 'confirmed') {
            return res.status(400).json({
                message: 'Registration not confirmed',
                status: registration.status
            });
        }

        // Check if already marked
        if (registration.attendanceMarked) {
            return res.status(400).json({
                message: 'Attendance already marked',
                markedAt: registration.attendanceMarkedAt,
                participant: {
                    name: `${registration.participant.firstName} ${registration.participant.lastName}`,
                    email: registration.participant.email
                }
            });
        }

        // Mark attendance
        registration.attendanceMarked = true;
        registration.attendanceMarkedAt = new Date();
        registration.attendanceMarkedBy = req.user._id;
        await registration.save();

        res.json({
            message: 'Attendance marked successfully',
            participant: {
                name: `${registration.participant.firstName} ${registration.participant.lastName}`,
                email: registration.participant.email,
                ticketId: registration.ticketId
            },
            markedAt: registration.attendanceMarkedAt
        });
    } catch (error) {
        console.error('Mark attendance by ticket error:', error);
        res.status(500).json({ message: 'Failed to mark attendance' });
    }
};

module.exports = {
    createRegistration,
    getMyRegistrations,
    getRegistration,
    getEventRegistrations,
    uploadPaymentProofHandler,
    upload, // Export multer middleware
    approvePayment,
    rejectPayment,
    cancelRegistration,
    markAttendance,
    markAttendanceByTicket
};
