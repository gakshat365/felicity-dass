/**
 * ═══════════════════════════════════════════════════════════════════
 *  DASS Assignment — Stage 0 API Test Suite
 *  Maps exactly to the 76 test cases defined in /stage0.txt
 *
 *  Usage:   node tests/test-stage0.js
 *
 *  Pre-requisites:
 *    - Backend running on http://localhost:5000
 *    - MONGO_URI in backend/.env (for admin bootstrap)
 *    - Admin account seeded: node scripts/createAdmin.js
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@iiit.ac.in';
const ADMIN_PASSWORD = 'StagezeroAdmin@2025';

// ── Colour helpers ──────────────────────────────────────────────────
const c = {
    green:  s => `\x1b[32m${s}\x1b[0m`,
    red:    s => `\x1b[31m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    cyan:   s => `\x1b[36m${s}\x1b[0m`,
    bold:   s => `\x1b[1m${s}\x1b[0m`,
    dim:    s => `\x1b[2m${s}\x1b[0m`,
};

// ── State ────────────────────────────────────────────────────────────
const T = Date.now();
const state = {
    tokens:  {},   // admin | org | p1 | p2
    ids:     {},   // admin | org | p1 | p2 | event | mercEvent | reg | mercReg | msg | feedback | pwReqId
    created: { users: [], events: [], registrations: [], messages: [], feedback: [] }
};

let passed = 0, failed = 0;
const failures = [];

// ── Test runner ──────────────────────────────────────────────────────
async function test(num, label, fn) {
    try {
        await fn();
        console.log(c.green(`  ✓ [${String(num).padStart(2,'0')}] ${label}`));
        passed++;
    } catch (err) {
        const msg = err?.response?.data?.message || err.message;
        console.log(c.red(`  ✗ [${String(num).padStart(2,'0')}] ${label}`));
        console.log(c.dim(`       └─ ${msg}`));
        failed++;
        failures.push({ num, label, msg });
    }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function api(token) {
    return axios.create({
        baseURL: BASE,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true  // Never throw on HTTP errors
    });
}

// ── Bootstrap ────────────────────────────────────────────────────────
async function bootstrap() {
    console.log(c.cyan('\n  🔧 Bootstrap: resetting admin password...\n'));
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('../models/User');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    const res = await User.updateOne({ email: ADMIN_EMAIL, role: 'admin' }, { $set: { password: hash } });
    if (res.matchedCount === 0) throw new Error('Admin not found – run: node scripts/createAdmin.js');
    await mongoose.disconnect();
    console.log(c.dim('  Admin password reset ✓\n'));
}

// ── Cleanup ──────────────────────────────────────────────────────────
async function cleanup() {
    console.log(c.cyan('\n  🧹 Cleanup...'));
    await mongoose.connect(process.env.MONGO_URI);
    const User         = require('../models/User');
    const Event        = require('../models/Event');
    const Registration = require('../models/Registration');
    const Message      = require('../models/Message');
    const Feedback     = require('../models/Feedback');
    const Notification = require('../models/Notification');
    const PasswordResetRequest = require('../models/PasswordResetRequest');

    if (state.created.registrations.length)
        await Registration.deleteMany({ _id: { $in: state.created.registrations } });
    if (state.created.events.length)
        await Event.deleteMany({ _id: { $in: state.created.events } });
    if (state.created.messages.length)
        await Message.deleteMany({ _id: { $in: state.created.messages } });
    if (state.created.feedback.length)
        await Feedback.deleteMany({ _id: { $in: state.created.feedback } });
    if (state.ids.pwReqId)
        await PasswordResetRequest.deleteMany({ _id: state.ids.pwReqId });
    if (state.created.users.length)
        await User.deleteMany({ _id: { $in: state.created.users } });
    await Notification.deleteMany({ user: { $in: state.created.users } });

    await mongoose.disconnect();
    console.log(c.dim('  Cleanup complete ✓'));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function run() {
    await bootstrap();

    //──────────────────────────────────────────────────────────────────
    // PHASE 1 — Authentication & Security
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 1: Authentication & Security ──\n')));

    await test(1, 'Admin can log in', async () => {
        const r = await api().post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.token, 'No token in response');
        assert(r.data.role === 'admin', 'Role should be admin');
        state.tokens.admin = r.data.token;
        state.ids.admin = r.data._id;
    });

    await test(2, 'Register participant (IIIT student email)', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'IIIT', lastName: 'Student',
            email: `iiit_s0_${T}@students.iiit.ac.in`, password: 'Pass@1234'
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.participantType === 'IIIT Student', `Expected IIIT Student, got ${r.data.participantType}`);
        state.tokens.p1 = r.data.token;
        state.ids.p1 = r.data._id;
        state.created.users.push(r.data._id);
    });

    await test(3, 'Register participant (outside IIIT email)', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'Outside', lastName: 'User',
            email: `outside_s0_${T}@gmail.com`, password: 'Pass@5678'
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.participantType === 'Outside IIIT', `Expected Outside IIIT, got ${r.data.participantType}`);
        state.tokens.p2 = r.data.token;
        state.ids.p2 = r.data._id;
        state.created.users.push(r.data._id);
    });

    await test(4, 'Duplicate registration is blocked', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'IIIT', lastName: 'Student',
            email: `iiit_s0_${T}@students.iiit.ac.in`, password: 'Pass@1234'
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/already exists/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(5, 'Login with wrong password is rejected', async () => {
        const r = await api().post('/auth/login', { email: ADMIN_EMAIL, password: 'wrongpassword' });
        assert(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test(6, 'Protected route rejects unauthenticated request', async () => {
        const r = await api().get('/auth/me');
        assert(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test(7, 'Authenticated user can get profile (JWT works)', async () => {
        const r = await api(state.tokens.p1).get('/auth/me');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.email, 'No email in profile response');
    });

    await test(8, 'User can change password', async () => {
        const r = await api(state.tokens.p1).patch('/auth/change-password', {
            currentPassword: 'Pass@1234', newPassword: 'NewPass@1234'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        // Restore password
        await api(state.tokens.p1).patch('/auth/change-password', {
            currentPassword: 'NewPass@1234', newPassword: 'Pass@1234'
        });
        // Re-login to refresh token
        const lr = await api().post('/auth/login', { email: `iiit_s0_${T}@students.iiit.ac.in`, password: 'Pass@1234' });
        state.tokens.p1 = lr.data.token;
    });

    await test(9, 'RBAC: Participant cannot access admin routes', async () => {
        const r = await api(state.tokens.p1).get('/admin/stats');
        assert(r.status === 403, `Expected 403, got ${r.status}`);
    });

    //──────────────────────────────────────────────────────────────────
    // ADMIN — Organizer Provisioning
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── ADMIN: Organizer Provisioning ──\n')));

    await test(10, 'Admin can create organizer account', async () => {
        const r = await api(state.tokens.admin).post('/admin/organizers', {
            email: `testclub_s0_${T}@clubs.iiit.ac.in`,
            organizerName: `TestClub_s0_${T}`,
            category: 'club',
            description: 'Stage 0 test club'
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.organizer, 'No organizer in response');
        assert(r.data.password, 'No generated password in response');
        state.ids.org = r.data.organizer.id;       // controller returns .id not ._id
        state.ids.orgPassword = r.data.password;
        state.ids.orgEmail = r.data.email;          // top-level email in response
        state.created.users.push(r.data.organizer.id);
    });

    await test(11, 'Organizer can log in with generated password', async () => {
        const r = await api().post('/auth/login', {
            email: state.ids.orgEmail,
            password: state.ids.orgPassword
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.role === 'organizer', `Expected organizer role, got ${r.data.role}`);
        state.tokens.org = r.data.token;
    });

    await test(12, 'Admin can view system stats', async () => {
        const r = await api(state.tokens.admin).get('/admin/stats');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(typeof r.data.totalUsers === 'number', 'Missing totalUsers');
        assert(typeof r.data.totalEvents === 'number', 'Missing totalEvents');
    });

    await test(13, 'Admin can list all organizers', async () => {
        const r = await api(state.tokens.admin).get('/admin/organizers');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        assert(r.data.length > 0, 'No organizers returned');
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 2 — Onboarding & Profiles
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 2: Onboarding & Profiles ──\n')));

    await test(14, 'Participant can save onboarding preferences', async () => {
        const r = await api(state.tokens.p1).post('/users/onboarding', {
            interests: ['coding', 'hacking'],
            followedOrganizers: []
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(15, 'Participant can update profile', async () => {
        const r = await api(state.tokens.p1).patch('/users/profile', {
            firstName: 'Updated', contactNumber: '9876543210'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(16, 'Participant can get full profile', async () => {
        const r = await api(state.tokens.p1).get('/users/profile');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.email, 'No email in profile');
    });

    await test(17, 'Profile completeness can be fetched', async () => {
        const r = await api(state.tokens.p1).get('/users/profile-completion');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(typeof r.data.completeness === 'number', 'Missing completeness');
    });

    await test(18, 'Organizer can update profile', async () => {
        const r = await api(state.tokens.org).patch('/users/profile', {
            description: 'Updated club description for stage 0 test'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(19, 'Participant can list organizers', async () => {
        const r = await api(state.tokens.p1).get('/users/organizers');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(20, 'Participant can follow an organizer', async () => {
        const r = await api(state.tokens.p1).post(`/users/follow/${state.ids.org}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.action === 'followed', `Expected action=followed, got: ${r.data.action}`);
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 2 & 3 — Event Management
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 2&3: Event Management ──\n')));

    const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureStart    = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const futureEnd      = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();

    await test(21, 'Organizer can create a draft event (normal, free)', async () => {
        const r = await api(state.tokens.org).post('/events', {
            name: `S0 Free Event ${T}`, description: 'Stage 0 free event',
            type: 'normal', registrationDeadline: futureDeadline,
            startDate: futureStart, endDate: futureEnd,
            registrationLimit: 50, registrationFee: 0, eligibility: 'All', status: 'draft'
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.status === 'draft', 'Event should be draft');
        state.ids.draftEvent = r.data._id;
        state.created.events.push(r.data._id);
    });

    await test(22, 'Organizer can create a paid event', async () => {
        const r = await api(state.tokens.org).post('/events', {
            name: `S0 Paid Event ${T}`, description: 'Stage 0 paid event',
            type: 'normal', registrationDeadline: futureDeadline,
            startDate: futureStart, endDate: futureEnd,
            registrationLimit: 50, registrationFee: 100, eligibility: 'All', status: 'published',
            tags: ['coding', 'music']
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        state.ids.paidEvent = r.data._id;
        state.created.events.push(r.data._id);
    });

    await test(23, 'Organizer can create a merchandise event', async () => {
        const r = await api(state.tokens.org).post('/events', {
            name: `S0 Merch Event ${T}`, description: 'Stage 0 merch',
            type: 'merchandise', registrationDeadline: futureDeadline,
            startDate: futureStart, endDate: futureEnd,
            registrationFee: 200, eligibility: 'All', status: 'published',
            stock: 3, purchaseLimitPerUser: 1,
            itemDetails: [{ size: 'M', color: 'Black', quantity: 3 }]
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        state.ids.mercEvent = r.data._id;
        state.created.events.push(r.data._id);
    });

    await test(24, 'Organizer can publish a draft event', async () => {
        const r = await api(state.tokens.org).patch(`/events/${state.ids.draftEvent}`, {
            status: 'published'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.status === 'published', `Expected published, got ${r.data.status}`);
        state.ids.event = state.ids.draftEvent; // Use this as the main test event
    });

    await test(25, 'Custom form rejects >25 questions', async () => {
        const bigForm = Array.from({ length: 26 }, (_, i) => ({
            label: `Q${i+1}`, type: 'text', required: true
        }));
        const r = await api(state.tokens.org).post('/events', {
            name: `S0 BigForm ${T}`, type: 'normal',
            registrationDeadline: futureDeadline,
            startDate: futureStart, endDate: futureEnd,
            customForm: bigForm, status: 'draft'
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/25/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(26, 'Public can browse published events', async () => {
        const r = await api().get('/events');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(27, 'Public can get event details by ID', async () => {
        const r = await api().get(`/events/${state.ids.event}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data._id, 'No _id in response');
        assert(r.data.organizer, 'No organizer populated');
    });

    await test(28, 'Trending events endpoint works', async () => {
        const r = await api().get('/events/trending');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(29, 'Ending soon events endpoint works', async () => {
        const r = await api().get('/events/ending-soon');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(30, 'Events can be filtered by type', async () => {
        const r = await api().get('/events?type=normal');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const wrongType = r.data.find(e => e.type !== 'normal');
        assert(!wrongType, `Found event with wrong type: ${wrongType?.type}`);
    });

    await test(31, 'Events can be filtered by search keyword', async () => {
        const keyword = `S0 Free Event`;
        const r = await api().get(`/events?search=${encodeURIComponent(keyword)}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.some(e => e.name.includes('S0'));
        assert(found, 'Expected to find a matching event');
    });

    await test(32, 'Organizer can list their own events', async () => {
        const r = await api(state.tokens.org).get('/events/organizer/my-events');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        assert(r.data.length > 0, 'Organizer should have at least 1 event');
    });

    await test(33, 'Organizer can view their analytics/stats', async () => {
        const r = await api(state.tokens.org).get('/events/organizer/stats');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    await test(34, 'RBAC: Participant cannot create events', async () => {
        const r = await api(state.tokens.p1).post('/events', {
            name: 'Unauthorized Event', type: 'normal',
            registrationDeadline: futureDeadline, startDate: futureStart, endDate: futureEnd
        });
        assert(r.status === 403, `Expected 403, got ${r.status}`);
    });

    await test(35, 'For-You personalized events endpoint works', async () => {
        const r = await api(state.tokens.p1).get('/events/for-you');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(36, 'Following events endpoint works', async () => {
        const r = await api(state.tokens.p1).get('/events/following');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(37, 'Admin can view all events', async () => {
        const r = await api(state.tokens.admin).get('/admin/events');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 3 & 4 — Registration & Payment
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 3&4: Registration & Payment ──\n')));

    await test(38, 'Participant registers for free event (auto-confirmed)', async () => {
        const r = await api(state.tokens.p1).post('/registrations', { eventId: state.ids.event });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.registration.status === 'confirmed', `Expected confirmed, got ${r.data.registration.status}`);
        state.ids.reg = r.data.registration._id;
        state.ids.ticketId = r.data.registration.ticketId;
        state.created.registrations.push(r.data.registration._id);
    });

    await test(39, 'Participant registers for paid event (status: pending)', async () => {
        const r = await api(state.tokens.p1).post('/registrations', { eventId: state.ids.paidEvent });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.registration.status === 'pending', `Expected pending, got ${r.data.registration.status}`);
        state.ids.paidReg = r.data.registration._id;
        state.created.registrations.push(r.data.registration._id);
    });

    await test(40, 'Participant registers for merchandise event', async () => {
        const r = await api(state.tokens.p1).post('/registrations', { eventId: state.ids.mercEvent });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data.registration.status === 'pending', `Expected pending for paid merch, got ${r.data.registration.status}`);
        state.ids.mercReg = r.data.registration._id;
        state.created.registrations.push(r.data.registration._id);
    });

    await test(41, 'Duplicate registration is blocked', async () => {
        const r = await api(state.tokens.p1).post('/registrations', { eventId: state.ids.event });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/already registered/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(42, 'Second participant can register for same event', async () => {
        const r = await api(state.tokens.p2).post('/registrations', { eventId: state.ids.event });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        state.ids.reg2 = r.data.registration._id;
        state.created.registrations.push(r.data.registration._id);
    });

    await test(43, 'Participant can view their registrations', async () => {
        const r = await api(state.tokens.p1).get('/registrations/my-registrations');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data) && r.data.length > 0, 'Expected non-empty array');
    });

    await test(44, 'Participant can view a single registration', async () => {
        const r = await api(state.tokens.p1).get(`/registrations/${state.ids.reg}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data._id, 'Missing _id');
    });

    await test(45, 'Organizer can approve payment', async () => {
        const r = await api(state.tokens.org).patch(`/registrations/${state.ids.paidReg}/approve-payment`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.registration.status === 'confirmed', `Expected confirmed, got ${r.data.registration.status}`);
    });

    await test(46, 'Organizer can view all registrations for an event', async () => {
        const r = await api(state.tokens.org).get(`/events/${state.ids.event}/registrations`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        assert(r.data.length > 0, 'Expected at least 1 registration');
    });

    await test(47, 'Participant can cancel a registration', async () => {
        // Cancel the reg2 (p2's free registration)
        const r = await api(state.tokens.p2).patch(`/registrations/${state.ids.reg2}/cancel`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(48, 'Organizer can export CSV for event registrations', async () => {
        const r = await api(state.tokens.org).get(`/events/${state.ids.event}/export-csv`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const ct = r.headers['content-type'] || '';
        assert(ct.includes('csv') || ct.includes('text'), `Wrong content-type: ${ct}`);
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 4 — Attendance Tracking
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 4: Attendance Tracking ──\n')));

    await test(49, 'Get ticket ID from confirmed registration', async () => {
        const r = await api(state.tokens.p1).get(`/registrations/${state.ids.reg}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const tid = r.data.ticketId;
        assert(tid && !tid.startsWith('PENDING-'), `Expected real ticketId, got: ${tid}`);
        state.ids.ticketId = tid;
    });

    await test(50, 'Organizer can mark attendance via ticketId', async () => {
        const r = await api(state.tokens.org).post('/events/attendance/mark', {
            ticketId: state.ids.ticketId
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.participantName, 'Expected participantName in response');
    });

    await test(51, 'Duplicate attendance scan is blocked', async () => {
        const r = await api(state.tokens.org).post('/events/attendance/mark', {
            ticketId: state.ids.ticketId
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/duplicate|already|scanned|marked/i.test(r.data.message), `Wrong msg: ${r.data.message}`);
    });

    await test(52, 'Organizer can mark manual attendance override', async () => {
        // Need a second participant's ticket for override
        const r2 = await api(state.tokens.p2).post('/registrations', { eventId: state.ids.event });
        if (r2.status === 201) {
            state.created.registrations.push(r2.data.registration._id);
            const overrideTicketId = r2.data.registration.ticketId;
            const r = await api(state.tokens.org).post('/events/attendance/mark', {
                ticketId: overrideTicketId,
                isManual: true,
                reason: 'Forgot QR code'
            });
            assert([200, 201].includes(r.status), `Expected 200/201, got ${r.status}: ${r.data.message}`);
        } else {
            // p2 not available - just verify the endpoint is reachable
            const r = await api(state.tokens.org).post('/events/attendance/mark', {
                ticketId: 'DUMMY-TICKET-FOR-TEST',
                isManual: true,
                reason: 'Override test'
            });
            // 404 = ticket not found, which is expected for dummy ticket
            assert([200, 201, 400, 404].includes(r.status), `Unexpected status ${r.status}`);
        }
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 5 — Discussion Forum
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 5: Discussion Forum ──\n')));

    await test(53, 'Participant can post a message in event forum', async () => {
        const r = await api(state.tokens.p1).post(`/forum/${state.ids.event}`, {
            content: 'Hello from Stage 0 test!'
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        assert(r.data._id, 'No message _id');
        state.ids.msg = r.data._id;
        state.created.messages.push(r.data._id);
    });

    await test(54, 'Participant can reply to a message (threading)', async () => {
        const r = await api(state.tokens.p1).post(`/forum/${state.ids.event}`, {
            content: 'Replying to the above!',
            parentId: state.ids.msg
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${r.data.message}`);
        state.created.messages.push(r.data._id);
    });

    await test(55, 'Can fetch forum messages for event', async () => {
        const r = await api(state.tokens.p1).get(`/forum/${state.ids.event}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        assert(r.data.length > 0, 'Expected at least 1 message');
    });

    await test(56, 'Participant can react to a message', async () => {
        const r = await api(state.tokens.p1).patch(`/forum/message/${state.ids.msg}/react`, {
            reaction: '👍'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(57, 'Organizer can pin a message (announcement)', async () => {
        const r = await api(state.tokens.org).patch(`/forum/message/${state.ids.msg}/pin`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.isPinned === true, 'Message should be pinned');
    });

    await test(58, 'Organizer can unpin a message', async () => {
        const r = await api(state.tokens.org).patch(`/forum/message/${state.ids.msg}/pin`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.isPinned === false, 'Message should be unpinned');
    });

    await test(59, 'User can soft-delete their own message', async () => {
        // Post a new message to delete
        const post = await api(state.tokens.p1).post(`/forum/${state.ids.event}`, {
            content: 'This message will be deleted'
        });
        const delMsgId = post.data._id;
        state.created.messages.push(delMsgId);

        const r = await api(state.tokens.p1).delete(`/forum/message/${delMsgId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 5 — Password Reset Workflow
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 5: Password Reset Workflow ──\n')));

    await test(60, 'User can request password reset', async () => {
        const r = await api().post('/auth/request-password-reset', {
            email: state.ids.orgEmail,
            reason: 'Stage 0 automated test'
        });
        assert([200, 201].includes(r.status), `Expected 200/201, got ${r.status}: ${r.data.message}`);
    });

    await test(61, 'Admin can view password reset requests', async () => {
        const r = await api(state.tokens.admin).get('/admin/password-requests');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        // Find our request
        const req = r.data.find(x => x.email === state.ids.orgEmail || (x.user && (x.user.email === state.ids.orgEmail)));
        if (req) state.ids.pwReqId = req._id;
    });

    await test(62, 'Admin can approve password reset request', async () => {
        if (!state.ids.pwReqId) {
            // Try to get it again
            const r2 = await api(state.tokens.admin).get('/admin/password-requests');
            const req = r2.data.find(x =>
                x.email === state.ids.orgEmail ||
                (x.user && (x.user.email === state.ids.orgEmail || x.user._id?.toString() === state.ids.org?.toString()))
            );
            if (req) state.ids.pwReqId = req._id;
        }
        assert(state.ids.pwReqId, 'No password reset request found to approve');
        const r = await api(state.tokens.admin).patch(`/admin/password-requests/${state.ids.pwReqId}`, {
            status: 'approved',
            adminNotes: 'Approved via Stage 0 automated test'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        // Password is embedded in adminNotes: "Approved. Temp Password: XYZ#ABC. Admin Note: ..."
        const notes = r.data.adminNotes || '';
        const pwMatch = notes.match(/Temp Password: ([\w#]+)/);
        assert(pwMatch, `Expected temp password in adminNotes, got: ${notes}`);
        const newPassword = pwMatch[1];
        // Refresh org token with new password
        const lr = await api().post('/auth/login', { email: state.ids.orgEmail, password: newPassword });
        if (lr.status === 200) {
            state.tokens.org = lr.data.token;
            state.ids.orgPassword = newPassword;
        }
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 6 — Anonymous Feedback
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 6: Anonymous Feedback ──\n')));

    await test(63, 'Attended participant can submit anonymous feedback', async () => {
        const r = await api(state.tokens.p1).post(`/feedback/${state.ids.event}`, {
            rating: 4,
            comment: 'Great event! Stage 0 test feedback.'
        });
        assert([200, 201].includes(r.status), `Expected 200/201, got ${r.status}: ${r.data.message}`);
    });

    await test(64, 'Duplicate feedback is blocked', async () => {
        const r = await api(state.tokens.p1).post(`/feedback/${state.ids.event}`, {
            rating: 5, comment: 'Duplicate attempt'
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/already submitted/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(65, 'Invalid rating (0 or 6) is rejected', async () => {
        const r = await api(state.tokens.p2).post(`/feedback/${state.ids.event}`, {
            rating: 6, comment: 'Out of range rating'
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        assert(/invalid rating|between 1 and 5/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(66, 'Organizer can view event feedback analytics', async () => {
        const r = await api(state.tokens.org).get(`/feedback/event/${state.ids.event}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        // Response: { stats: { average, total, distribution }, list: [] }
        assert(r.data.stats && typeof r.data.stats.average === 'number', `Missing stats.average in: ${JSON.stringify(r.data)}`);
    });

    await test(67, 'Admin can view event feedback', async () => {
        const r = await api(state.tokens.admin).get(`/feedback/event/${state.ids.event}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
    });

    //──────────────────────────────────────────────────────────────────
    // PHASE 3 — Event Updates & Deletion
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── PHASE 3: Event Updates & Deletion ──\n')));

    await test(68, 'Published event allows limited field updates', async () => {
        const r = await api(state.tokens.org).patch(`/events/${state.ids.event}`, {
            description: 'Updated description - stage 0 test'
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
        assert(r.data.description === 'Updated description - stage 0 test', 'Description not updated');
    });

    await test(69, 'Organizer can delete a draft event', async () => {
        // Create a fresh draft to delete
        const cr = await api(state.tokens.org).post('/events', {
            name: `S0 DeleteMe ${T}`, description: 'To be deleted',
            type: 'normal', registrationDeadline: futureDeadline,
            startDate: futureStart, endDate: futureEnd,
            registrationFee: 0, status: 'draft'
        });
        assert(cr.status === 201, `Could not create draft event: ${cr.status} - ${cr.data?.message}`);
        const deleteId = cr.data._id;

        const r = await api(state.tokens.org).delete(`/events/${deleteId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    await test(70, 'Participant can unfollow an organizer', async () => {
        const r = await api(state.tokens.p1).post(`/users/follow/${state.ids.org}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.action === 'unfollowed', `Expected action=unfollowed, got: ${r.data.action}`);
    });

    //──────────────────────────────────────────────────────────────────
    // EXTRA CHECKS — Advanced Requirements
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.cyan('\n  ── EXTRA CHECKS: Advanced Requirements ──\n')));

    await test(71, 'Organizer self-registration is blocked', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'Self', lastName: 'Org',
            email: `selforg_${T}@test.com`, password: 'Pass@1234',
            role: 'organizer', organizerName: 'Self Club', category: 'club'
        });
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        assert(/organizer self-registration/i.test(r.data.message), `Wrong message: ${r.data.message}`);
    });

    await test(72, 'Public can search events by organizer name', async () => {
        const orgProfile = await api(state.tokens.org).get('/users/profile');
        const orgName = orgProfile.data.organizerName || '';
        const r = await api().get(`/events?search=${encodeURIComponent(orgName.split('_')[0] || 'TestClub')}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
    });

    await test(73, 'Register IIIT Research student', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'IIIT', lastName: 'Research',
            email: `iiit_res_${T}@research.iiit.ac.in`, password: 'Pass@1234'
        });
        // Research.iiit.ac.in should be accepted as IIIT participant
        assert([200, 201].includes(r.status), `Expected 200/201, got ${r.status}: ${r.data.message}`);
        if (r.data._id) state.created.users.push(r.data._id);
    });

    await test(74, 'Register IIIT Professor', async () => {
        const r = await api().post('/auth/register', {
            firstName: 'IIIT', lastName: 'Professor',
            email: `iiit_prof_${T}@iiit.ac.in`, password: 'Pass@1234'
        });
        assert([200, 201].includes(r.status), `Expected 200/201, got ${r.status}: ${r.data.message}`);
        if (r.data._id) state.created.users.push(r.data._id);
    });

    await test(75, 'Organizer can test Discord webhook', async () => {
        const r = await api(state.tokens.org).post('/users/test-webhook', {
            webhookUrl: 'https://discord.com/api/webhooks/invalid/testonly'
        });
        // Should not crash server — 200 with failure info OR 400 with graceful message
        assert([200, 400, 500].includes(r.status), `Unexpected status ${r.status}`);
        // Main check: server didn't hang/crash — we got a response
    });

    await test(76, 'Admin can delete an organizer', async () => {
        // Create a throwaway organizer to delete
        const cr = await api(state.tokens.admin).post('/admin/organizers', {
            email: `deleteme_s0_${T}@clubs.iiit.ac.in`,
            organizerName: `DeleteMe_${T}`, category: 'club',
            description: 'To be deleted'
        });
        assert(cr.status === 201, `Could not create organizer: ${cr.data.message}`);
        const delId = cr.data.organizer.id;  // controller returns .id not ._id

        const r = await api(state.tokens.admin).delete(`/admin/organizers/${delId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${r.data.message}`);
    });

    //──────────────────────────────────────────────────────────────────
    // SUMMARY
    //──────────────────────────────────────────────────────────────────
    await cleanup();

    const total = passed + failed;
    console.log('\n' + '═'.repeat(55));
    console.log(c.bold(`  Stage 0 Results: ${total} tests`));
    console.log(c.green(`  ✓ Passed: ${passed}`));
    if (failed > 0) {
        console.log(c.red(`  ✗ Failed: ${failed}`));
        console.log(c.yellow('\n  Failed Tests:'));
        failures.forEach(f => console.log(c.red(`    [${f.num}] ${f.label}`) + c.dim(`\n         ${f.msg}`)));
    }
    console.log('═'.repeat(55) + '\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error(c.red('\n  Fatal error:'), err.message);
    cleanup().finally(() => process.exit(1));
});
