/**
 * Cleanup script for test data.
 * Removes participant accounts and any orphaned test data created by e2e-test-suite.js
 *
 * Usage:  node tests/cleanup-test-data.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        const User = require('../models/User');
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const Feedback = require('../models/Feedback');

        // Find and delete test participants (with test-specific email patterns)
        const testParticipants = await User.find({
            email: { $regex: /^testparticipant\d+_\d+@/ }
        });
        console.log(`Found ${testParticipants.length} test participants`);

        for (const user of testParticipants) {
            // Delete associated registrations
            const regCount = await Registration.deleteMany({ participant: user._id });
            console.log(`  Deleted ${regCount.deletedCount} registrations for ${user.email}`);

            // Delete the user
            await User.findByIdAndDelete(user._id);
            console.log(`  Deleted user: ${user.email}`);
        }

        // Find and delete test organizers
        const testOrganizers = await User.find({
            email: { $regex: /^testorg_\d+@/ }
        });
        console.log(`Found ${testOrganizers.length} test organizers`);

        for (const org of testOrganizers) {
            // Delete events created by this organizer
            const events = await Event.find({ organizer: org._id });
            for (const event of events) {
                // Delete registrations for the event
                const regCount = await Registration.deleteMany({ event: event._id });
                console.log(`  Deleted ${regCount.deletedCount} registrations for event ${event.name}`);

                // Delete feedback for the event
                const feedbackCount = await Feedback.deleteMany({ event: event._id });
                console.log(`  Deleted ${feedbackCount.deletedCount} feedback for event ${event.name}`);
            }

            const eventCount = await Event.deleteMany({ organizer: org._id });
            console.log(`  Deleted ${eventCount.deletedCount} events for ${org.email}`);

            await User.findByIdAndDelete(org._id);
            console.log(`  Deleted organizer: ${org.email}`);
        }

        // Delete any orphaned test events
        const testEvents = await Event.find({
            name: { $regex: /^Test |^Draft To Delete/ }
        });
        if (testEvents.length > 0) {
            for (const event of testEvents) {
                await Registration.deleteMany({ event: event._id });
                await Feedback.deleteMany({ event: event._id });
                await Event.findByIdAndDelete(event._id);
                console.log(`  Deleted orphaned test event: ${event.name}`);
            }
        }

        // Also try to delete password reset requests for test users
        try {
            const PasswordRequest = require('../models/PasswordResetRequest');
            const prCount = await PasswordRequest.deleteMany({
                email: { $regex: /^testorg_\d+@/ }
            });
            if (prCount.deletedCount > 0) {
                console.log(`  Deleted ${prCount.deletedCount} password reset requests`);
            }
        } catch (e) {
            // PasswordRequest model may not exist
        }

        // Delete forum messages related to test events
        try {
            const Message = require('../models/Message');
            const testEventIds = testEvents.map(e => e._id);
            if (testEventIds.length > 0) {
                const msgCount = await Message.deleteMany({ event: { $in: testEventIds } });
                if (msgCount.deletedCount > 0) {
                    console.log(`  Deleted ${msgCount.deletedCount} forum messages`);
                }
            }
        } catch (e) {
            // ForumMessage model may not exist or already deleted
        }

        console.log('\n✅ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup error:', error.message);
        process.exit(1);
    }
}

cleanup();
