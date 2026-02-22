const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['participant', 'organizer', 'admin'], default: 'participant' },

    // Participant specific
    participantType: { type: String, enum: ['IIIT Student', 'IIIT Professor', 'Outside IIIT'] },
    interests: [{
        type: String,
        enum: ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art']
    }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    collegeName: { type: String },
    contactNumber: { type: String },

    // Profile completion tracking
    profileCompleteness: { type: Number, default: 50 }, // Percentage (50% = mandatory fields only)
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSkipped: { type: Boolean, default: false },

    // Organizer specific
    organizerName: { type: String },
    category: {
        type: String,
        enum: ['club', 'council', 'fest-team']
    },
    description: { type: String },
    contactEmail: { type: String },
    discordWebhookUrl: { type: String },

    // Shared fields
    followerCount: { type: Number, default: 0 }, // Denormalized for performance
    isApproved: { type: Boolean, default: false }, // Default false for new organizers
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
