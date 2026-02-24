const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Registration Details
    registrationType: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
        default: 'pending'
    },

    // Team (Simple Text Field)
    teamName: {
        type: String,
        default: null
    },

    // Custom Form Responses (for normal events)
    formResponses: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Merchandise Details
    merchandiseDetails: {
        size: String,
        color: String,
        variant: String,
        quantity: {
            type: Number,
            default: 1
        }
    },

    // Payment (Manual Approval)
    paymentRequired: {
        type: Boolean,
        default: false
    },
    paymentAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'proof_uploaded', 'approved', 'rejected'],
        default: 'pending'
    },
    paymentProofUrl: {
        type: String,
        default: null
    },
    paymentProofUploadedAt: Date,
    paymentApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    paymentApprovedAt: Date,
    paymentRejectionReason: String,

    // Ticket
    ticketId: {
        type: String,
        unique: true,
        required: true
    },
    ticketQRCode: String, // Base64 QR code
    ticketPdfUrl: String, // Cloudinary URL for PDF

    // Attendance (Phase 4 Enhanced)
    attendanceMarked: {
        type: Boolean,
        default: false
    },
    attendanceStatus: {
        type: String,
        enum: ['Present', 'Absent'],
        default: 'Absent'
    },
    attendanceMarkedAt: Date,
    attendanceMarkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    manualOverrideReason: {
        type: String,
        default: null
    },
    isManualOverride: {
        type: Boolean,
        default: false
    },
    feedbackSubmitted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
registrationSchema.index({ participant: 1, event: 1 });
// Note: ticketId already has index via unique:true in schema field definition
registrationSchema.index({ status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
