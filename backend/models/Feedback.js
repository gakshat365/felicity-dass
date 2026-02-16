const mongoose = require('mongoose');

/**
 * Feedback Model (Phase 6)
 * Strictly anonymous: No reference to User or Registration.
 * Linked only to Event for aggregate reporting.
 */
const feedbackSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    }
}, {
    timestamps: true
});

// Index for event-based retrieval
feedbackSchema.index({ event: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
