const mongoose = require('mongoose');
const crypto = require('crypto');

const teamSchema = mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Includes leader

    // Limits
    maxMembers: { type: Number, default: 5 },
    minMembers: { type: Number, default: 2 },

    // Invitation Code — auto-generated on create
    inviteCode: { type: String, unique: true },

    // Status
    isComplete: { type: Boolean, default: false } // true when members.length >= minMembers

}, { timestamps: true });

// Auto-generate invite code before first save
teamSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9BC12"
    }
    next();
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
