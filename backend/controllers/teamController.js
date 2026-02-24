const mongoose = require('mongoose');
const Team = require('../models/Team');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { generateTicket } = require('../services/ticketService');
const { sendTicketEmail } = require('../services/emailService');

/**
 * Internal helper: Called when a team reaches minMembers.
 * For FREE events: confirms all pending member registrations and generates tickets.
 * For PAID events: only marks the team complete; payment flow handles tickets individually.
 */
const onTeamComplete = async (team, event) => {
    team.isComplete = true;
    await team.save();

    if (event.registrationFee > 0) {
        // Paid event: team completion is tracked but individual tickets follow payment approval
        return;
    }

    // Free event: confirm all pending member registrations and generate tickets
    const registrations = await Registration.find({
        team: team._id,
        status: 'pending'
    }).populate('participant');

    for (const reg of registrations) {
        try {
            const ticket = await generateTicket(reg, event, reg.participant);
            reg.ticketId = ticket.ticketId;
            reg.ticketQRCode = ticket.qrCodeBase64;
            reg.status = 'confirmed';
            await reg.save();
            await sendTicketEmail(reg.participant, event, ticket);
        } catch (err) {
            console.error(`Failed to generate ticket for registration ${reg._id}:`, err.message);
        }
    }
};

/**
 * Create a new team for a team-based event (creator becomes leader)
 * POST /api/teams
 */
const createTeam = async (req, res) => {
    try {
        const { eventId, teamName, formResponses } = req.body;
        const leaderId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }

        const event = await Event.findById(eventId).populate('organizer');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (!event.teamBased) {
            return res.status(400).json({ message: 'This event does not use team registration' });
        }
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is not open for registration' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // Check not already registered
        const existing = await Registration.findOne({
            event: eventId,
            participant: leaderId,
            status: { $in: ['pending', 'confirmed'] }
        });
        if (existing) return res.status(400).json({ message: 'You are already registered for this event' });

        if (!teamName || !teamName.trim()) {
            return res.status(400).json({ message: 'Team name is required' });
        }

        // Check team name uniqueness for this event
        const nameConflict = await Team.findOne({ event: eventId, name: teamName.trim() });
        if (nameConflict) {
            return res.status(400).json({ message: 'A team with this name already exists for this event' });
        }

        // Create team (inviteCode auto-generated via pre-save hook)
        const team = await Team.create({
            event: eventId,
            leader: leaderId,
            name: teamName.trim(),
            members: [leaderId],
            minMembers: event.minTeamSize || 2,
            maxMembers: event.maxTeamSize || 5,
            isComplete: false
        });

        // Create registration for the leader (pending until team completes)
        const registration = new Registration({
            event: eventId,
            participant: leaderId,
            registrationType: event.type,
            team: team._id,
            teamName: team.name,
            formResponses: formResponses || {},
            paymentRequired: event.registrationFee > 0,
            paymentAmount: event.registrationFee || 0,
            status: 'pending',
            ticketId: `TEAM-PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        });
        await registration.save();

        await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: 1 } });

        // Edge case: minTeamSize is 1 (team immediately complete with just a leader)
        if (team.minMembers <= 1) {
            await onTeamComplete(team, event);
            const updated = await Registration.findById(registration._id);
            return res.status(201).json({
                message: 'Team created! Your ticket has been generated.',
                team: {
                    _id: team._id,
                    name: team.name,
                    inviteCode: team.inviteCode,
                    memberCount: team.members.length,
                    minMembers: team.minMembers,
                    maxMembers: team.maxMembers,
                    isComplete: true
                },
                registration: updated
            });
        }

        res.status(201).json({
            message: `Team created! Share the invite code with ${team.minMembers - 1} more teammate(s) to receive tickets.`,
            team: {
                _id: team._id,
                name: team.name,
                inviteCode: team.inviteCode,
                memberCount: team.members.length,
                minMembers: team.minMembers,
                maxMembers: team.maxMembers,
                isComplete: false
            },
            registration
        });
    } catch (error) {
        console.error('createTeam error:', error);
        res.status(500).json({ message: error.message || 'Failed to create team' });
    }
};

/**
 * Look up a team by invite code before joining (shows preview)
 * GET /api/teams/code/:code
 */
const getTeamByCode = async (req, res) => {
    try {
        const team = await Team.findOne({ inviteCode: req.params.code.toUpperCase() })
            .populate('event', 'name teamBased minTeamSize maxTeamSize registrationDeadline status registrationFee')
            .populate('members', 'firstName lastName');

        if (!team) return res.status(404).json({ message: 'Invalid invite code' });

        const event = team.event;
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'This event is no longer open for registration' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }
        if (team.members.length >= team.maxMembers) {
            return res.status(400).json({ message: 'This team is already full' });
        }

        res.json({
            team: {
                _id: team._id,
                name: team.name,
                inviteCode: team.inviteCode,
                memberCount: team.members.length,
                minMembers: team.minMembers,
                maxMembers: team.maxMembers,
                isComplete: team.isComplete,
                members: team.members.map(m => `${m.firstName} ${m.lastName}`)
            },
            event: {
                _id: event._id,
                name: event.name,
                registrationFee: event.registrationFee
            }
        });
    } catch (error) {
        console.error('getTeamByCode error:', error);
        res.status(500).json({ message: 'Failed to look up team' });
    }
};

/**
 * Join an existing team via invite code
 * POST /api/teams/join
 */
const joinTeam = async (req, res) => {
    try {
        const { inviteCode, formResponses } = req.body;
        const participantId = req.user._id;

        if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

        const team = await Team.findOne({ inviteCode: inviteCode.trim().toUpperCase() })
            .populate('event');
        if (!team) return res.status(404).json({ message: 'Invalid invite code' });

        const event = team.event;

        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is no longer open for registration' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }
        if (team.members.length >= team.maxMembers) {
            return res.status(400).json({ message: 'This team is already full' });
        }

        // Check not already in this event
        const existing = await Registration.findOne({
            event: event._id,
            participant: participantId,
            status: { $in: ['pending', 'confirmed'] }
        });
        if (existing) return res.status(400).json({ message: 'You are already registered for this event' });

        // Add member to team
        const wasAlreadyComplete = team.isComplete;
        team.members.push(participantId);

        // Create registration (pending until team completes, or payment for paid events)
        const registration = new Registration({
            event: event._id,
            participant: participantId,
            registrationType: event.type,
            team: team._id,
            teamName: team.name,
            formResponses: formResponses || {},
            paymentRequired: event.registrationFee > 0,
            paymentAmount: event.registrationFee || 0,
            status: 'pending',
            ticketId: `TEAM-PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        });
        await registration.save();
        await team.save();

        await Event.findByIdAndUpdate(event._id, { $inc: { registrationCount: 1 } });

        // Determine completion state after adding this member
        const isNowComplete = team.members.length >= team.minMembers;
        let ticketData = null;

        if (isNowComplete && !wasAlreadyComplete) {
            // Team just hit the minimum — trigger ticket generation for all (free events)
            await onTeamComplete(team, event);

            if (event.registrationFee === 0) {
                const updated = await Registration.findById(registration._id);
                if (updated.status === 'confirmed') {
                    ticketData = { ticketId: updated.ticketId, qrCode: updated.ticketQRCode };
                }
            }
        } else if (wasAlreadyComplete && event.registrationFee === 0) {
            // Joining an already-complete team on a free event: get ticket immediately
            const participant = await User.findById(participantId);
            const ticket = await generateTicket(registration, event, participant);
            registration.ticketId = ticket.ticketId;
            registration.ticketQRCode = ticket.qrCodeBase64;
            registration.status = 'confirmed';
            await registration.save();
            await sendTicketEmail(participant, event, ticket);
            ticketData = { ticketId: ticket.ticketId, qrCode: ticket.qrCodeBase64 };
        }

        const remaining = team.minMembers - team.members.length;
        const isFree = event.registrationFee === 0;

        let message;
        if (isNowComplete && isFree) {
            message = 'Joined! Team is complete — check your email for your ticket.';
        } else if (isNowComplete && !isFree) {
            message = 'Joined! Team is complete. Upload your payment proof to confirm your spot.';
        } else {
            message = `Joined team! Waiting for ${remaining} more member(s) before tickets are issued.`;
        }

        res.status(201).json({
            message,
            team: {
                _id: team._id,
                name: team.name,
                memberCount: team.members.length,
                minMembers: team.minMembers,
                maxMembers: team.maxMembers,
                isComplete: isNowComplete
            },
            registration,
            ticket: ticketData
        });
    } catch (error) {
        console.error('joinTeam error:', error);
        res.status(500).json({ message: error.message || 'Failed to join team' });
    }
};

/**
 * Get the current user's team for a specific event
 * GET /api/teams/event/:eventId/my-team
 */
const getMyTeam = async (req, res) => {
    try {
        const team = await Team.findOne({
            event: req.params.eventId,
            members: req.user._id
        })
            .populate('members', 'firstName lastName email')
            .populate('leader', '_id');

        if (!team) return res.status(404).json({ message: 'You are not in a team for this event' });

        const isLeader = team.leader._id.toString() === req.user._id.toString();

        res.json({
            _id: team._id,
            name: team.name,
            // Only the team leader can see and share the invite code
            inviteCode: isLeader ? team.inviteCode : null,
            members: team.members.map(m => ({
                name: `${m.firstName} ${m.lastName}`,
                email: m.email
            })),
            memberCount: team.members.length,
            minMembers: team.minMembers,
            maxMembers: team.maxMembers,
            isComplete: team.isComplete,
            isLeader
        });
    } catch (error) {
        console.error('getMyTeam error:', error);
        res.status(500).json({ message: 'Failed to fetch team' });
    }
};

module.exports = { createTeam, getTeamByCode, joinTeam, getMyTeam };
