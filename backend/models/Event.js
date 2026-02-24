const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
    // Basic Info
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['normal', 'merchandise'], required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Dates
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },

    // Constraints
    eligibility: {
        type: String,
        enum: ['All', 'IIIT Students Only', 'IIIT Community', 'Outside IIIT Only', 'Custom'],
        default: 'All'
    },
    eligibilityCustom: { type: String }, // For custom eligibility text

    registrationLimit: { type: Number, min: 0 }, // Max participants
    registrationFee: { type: Number, default: 0, min: 0 },

    // Category (high-level domain)
    category: {
        type: String,
        enum: ['Technical', 'Cultural', 'Sports', 'Academic', 'Other'],
        default: 'Other'
    },

    // Tags (from interest areas + "other")
    tags: [{
        type: String,
        enum: ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art', 'other']
    }],

    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    },

    // For Normal Events: Custom Registration Form (max 25 questions)
    customFormTitle: { type: String },
    customFormDescription: { type: String },
    customForm: [{
        questionId: { type: String, required: true }, // UUID
        questionText: { type: String, required: true },
        questionType: {
            type: String,
            enum: ['short', 'long', 'number', 'mcq-single', 'mcq-multiple'],
            required: true
        },
        required: { type: Boolean, default: false },
        options: [{ type: String }], // For MCQ types only
        wordLimit: { type: Number }, // 50 for short, 200 for long
        order: { type: Number, required: true }
    }],

    // For Merchandise Events
    merchandiseDetails: {
        sizes: [{ type: String }], // ['S', 'M', 'L', 'XL', 'XXL']
        colors: [{ type: String }], // ['Black', 'White', 'Blue']
        variants: [{ type: String }] // ['Hoodie', 'T-Shirt', 'Polo']
    },
    itemDetails: {  // Keep for backward compatibility
        sizes: [{ type: String }],
        colors: [{ type: String }],
        variants: [{ type: String }]
    },
    stock: { type: Number, min: 0 }, // Total available quantity
    purchaseLimitPerUser: { type: Number, min: 0 }, // Max items per participant

    // Payment
    upiId: { type: String }, // UPI ID for payment

    // Team Registration Settings (for normal events only)
    teamBased: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 2, min: 2 },
    maxTeamSize: { type: Number, default: 5, min: 2 },

    // Analytics (denormalized for performance)
    registrationCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },

}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
