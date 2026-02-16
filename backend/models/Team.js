const mongoose = require('mongoose');

const teamSchema = mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Includes leader

    // Limits
    maxMembers: { type: Number, default: 5 },
    minMembers: { type: Number, default: 2 },

    // Invitation Code
    inviteCode: { type: String, unique: true },

    // Status
    isComplete: { type: Boolean, default: false } // Only generated tickets when true

}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
