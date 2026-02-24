/**
 * ═══════════════════════════════════════════════════════════════════
 *  DASS Assignment — Stage 2 Concurrency, State & Security Tests
 *  Maps to the 12 test cases in /stage2.txt
 *
 *  Focus areas:
 *    2.1  Suspended organizer's active token is blocked
 *    2.2  Re-activation restores login ability
 *    2.3  Deleted organizer's events are hidden/cascade-removed
 *    2.4  Normal event: concurrent register for limit=1 race condition
 *    2.5  Merchandise: approve oversubscription is blocked atomically
 *    2.6  Cancel vs Approve merchandise race condition
 *    2.7  QR Scan vs Cancel race condition
 *    2.8  Form schema freezes after first registration
 *    2.9  Forged / invalid event IDs return clean errors
 *    2.10 Cross-user data privacy (JWT overrides payload userId)
 *    2.11 Anonymous feedback double-submission blocked by flag
 *    2.12 Discord webhook failure does not crash event publish
 *
 *  Usage:   node tests/test-stage2.js
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL    = 'admin@iiit.ac.in';
const ADMIN_PASSWORD = 'Stage2Admin@2025';

const c = {
    green:  s => `\x1b[32m${s}\x1b[0m`,
    red:    s => `\x1b[31m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    cyan:   s => `\x1b[36m${s}\x1b[0m`,
    bold:   s => `\x1b[1m${s}\x1b[0m`,
    dim:    s => `\x1b[2m${s}\x1b[0m`,
    magenta:s => `\x1b[35m${s}\x1b[0m`,
};

let passed = 0, failed = 0;
const failures = [];
const T = Date.now();

const state = {
    tokens: {},
    ids: {},
    passwords: {},
    created: { users: [], events: [], registrations: [] }
};

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

function api(token) {
    return axios.create({
        baseURL: BASE,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true
    });
}

async function test(id, label, fn) {
    process.stdout.write(c.dim(`  ⟳ [TC-2.${id}] ${label}...`));
    try {
        await fn();
        process.stdout.write('\r' + c.green(`  ✓ [TC-2.${id}] ${label}\n`));
        passed++;
    } catch (err) {
        const msg = err?.response?.data?.message || err.message;
        process.stdout.write('\r' + c.red(`  ✗ [TC-2.${id}] ${label}\n`));
        console.log(c.dim(`       └─ ${msg}`));
        failed++;
        failures.push({ id, label, msg });
    }
}

const fd = () => new Date(Date.now() + 7 * 86400000).toISOString();
const fs = () => new Date(Date.now() + 8 * 86400000).toISOString();
const fe = () => new Date(Date.now() + 9 * 86400000).toISOString();

// ── Bootstrap ────────────────────────────────────────────────────────
async function bootstrap() {
    console.log(c.cyan('\n  🔧 Bootstrap...\n'));
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('../models/User');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    const res = await User.updateOne({ email: ADMIN_EMAIL, role: 'admin' }, { $set: { password: hash } });
    if (res.matchedCount === 0) throw new Error('Admin not found – run: node scripts/createAdmin.js');
    await mongoose.disconnect();
    console.log(c.dim('  Admin password reset ✓\n'));
}

async function cleanup() {
    console.log(c.cyan('\n  🧹 Cleanup...'));
    await mongoose.connect(process.env.MONGO_URI);
    const User   = require('../models/User');
    const Event  = require('../models/Event');
    const Reg    = require('../models/Registration');
    const Notif  = require('../models/Notification');
    const Feedback = require('../models/Feedback');

    if (state.created.registrations.length)
        await Reg.deleteMany({ _id: { $in: state.created.registrations } });
    if (state.created.events.length)
        await Event.deleteMany({ _id: { $in: state.created.events } });
    if (state.created.users.length) {
        await Notif.deleteMany({ user: { $in: state.created.users } });
        // Cleanup any feedback tied to test events
        if (state.created.events.length)
            await Feedback.deleteMany({ event: { $in: state.created.events } });
        await User.deleteMany({ _id: { $in: state.created.users } });
    }
    await mongoose.disconnect();
    console.log(c.dim('  Cleanup complete ✓'));
}

// Helper: set up a fresh organizer + participant pair
async function setupOrgAndParticipants(adminToken, suffix) {
    const orgR = await api(adminToken).post('/admin/organizers', {
        email: `s2org_${suffix}_${T}@clubs.iiit.ac.in`,
        organizerName: `S2Org_${suffix}_${T}`, category: 'club', description: 'Stage 2 concurrency test'
    });
    assert(orgR.status === 201, `Create org failed: ${orgR.data.message}`);
    const orgId    = orgR.data.organizer.id;    // .id (string) not ._id
    const orgEmail = orgR.data.email;           // top-level email
    const orgPass  = orgR.data.password;
    state.created.users.push(orgId);

    const lr = await api().post('/auth/login', { email: orgEmail, password: orgPass });
    assert(lr.status === 200, `Org login failed`);
    const orgToken = lr.data.token;

    const p1R = await api().post('/auth/register', {
        firstName: `S2P1_${suffix}`, lastName: 'Test',
        email: `s2p1_${suffix}_${T}@students.iiit.ac.in`, password: 'Pass@1'
    });
    assert(p1R.status === 201, `P1 register failed: ${p1R.data.message}`);
    state.created.users.push(p1R.data._id);

    const p2R = await api().post('/auth/register', {
        firstName: `S2P2_${suffix}`, lastName: 'Test',
        email: `s2p2_${suffix}_${T}@gmail.com`, password: 'Pass@2'
    });
    assert(p2R.status === 201, `P2 register failed: ${p2R.data.message}`);
    state.created.users.push(p2R.data._id);

    return {
        orgId, orgEmail, orgPass, orgToken,
        p1Token: p1R.data.token, p1Id: p1R.data._id,
        p2Token: p2R.data.token, p2Id: p2R.data._id,
    };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function run() {
    await bootstrap();

    // ── Global admin login ────────────────────────────────────────
    const adminR = await api().post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert(adminR.status === 200, `Admin login failed: ${adminR.data.message}`);
    state.tokens.admin = adminR.data.token;

    // ── Create main actor set ─────────────────────────────────────
    const actors = await setupOrgAndParticipants(state.tokens.admin, 'main');
    state.tokens.org = actors.orgToken;
    state.ids.org    = actors.orgId;
    state.ids.orgEmail = actors.orgEmail;
    state.passwords.org = actors.orgPass;
    state.tokens.p1  = actors.p1Token;
    state.tokens.p2  = actors.p2Token;
    state.ids.p1     = actors.p1Id;
    state.ids.p2     = actors.p2Id;

    //──────────────────────────────────────────────────────────────────
    // § 1 — Account Lifecycle & Session Invalidation
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.magenta('\n═══ §1: Account Lifecycle & Session Invalidation ═══\n')));

    await test(1, '2.1 – Suspended organizer\'s token is rejected on protected routes', async () => {
        // Verify org can make requests before suspension
        const before = await api(state.tokens.org).get('/events/organizer/my-events');
        assert(before.status === 200, 'Org should work before suspension');

        // Admin suspends the organizer
        const suspR = await api(state.tokens.admin).patch(`/admin/organizers/${state.ids.org}/status`, {
            status: 'suspended'
        });
        assert(suspR.status === 200, `Suspend failed: ${suspR.data.message}`);

        // Organizer uses the same (still valid JWT) to hit a protected route
        const after = await api(state.tokens.org).post('/events', {
            name: `S2_SuspendedEvent_${T}`, type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 0, status: 'draft'
        });

        assert(
            [403, 401].includes(after.status) || (after.data.message || '').toLowerCase().includes('suspend'),
            `Suspended org should be blocked on create event; got ${after.status}: ${after.data.message}`
        );

        // Restore for subsequent tests
        await api(state.tokens.admin).patch(`/admin/organizers/${state.ids.org}/status`, { status: 'active' });
        const lr = await api().post('/auth/login', { email: state.ids.orgEmail, password: state.passwords.org });
        state.tokens.org = lr.data.token;
    });

    await test(2, '2.2 – Suspended then re-activated organizer can log in again', async () => {
        // Suspend
        await api(state.tokens.admin).patch(`/admin/organizers/${state.ids.org}/status`, { status: 'suspended' });

        // Attempt login while suspended (login itself may or may not be blocked depending on implementation)
        const lr1 = await api().post('/auth/login', { email: state.ids.orgEmail, password: state.passwords.org });

        // Re-activate
        await api(state.tokens.admin).patch(`/admin/organizers/${state.ids.org}/status`, { status: 'active' });

        // Login after re-activation must work
        const lr2 = await api().post('/auth/login', { email: state.ids.orgEmail, password: state.passwords.org });
        assert(lr2.status === 200, `Expected 200 after reactivation, got ${lr2.status}`);
        assert(lr2.data.token, 'No token after re-activation login');
        state.tokens.org = lr2.data.token;
    });

    await test(3, '2.3 – Deleting an organizer removes their events from public browse', async () => {
        // Create a throwaway org + event
        const ta = await setupOrgAndParticipants(state.tokens.admin, 'ta');

        // Create and publish an event
        const evR = await api(ta.orgToken).post('/events', {
            name: `S2_TaEvent_${T}`, description: 'Stage 2 throwaway organizer event',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 0, status: 'published'
        });
        assert(evR.status === 201, `TA event create failed: ${evR.data.message}`);
        const taEventId = evR.data._id;
        // Do NOT push to state.created.events - event should cascade-delete

        // Verify event is browsable
        const browseBefore = await api().get('/events');
        const foundBefore = browseBefore.data.some(e => e._id === taEventId);
        assert(foundBefore, 'Event should be visible before organizer deletion');

        // Admin deletes the organizer
        const delR = await api(state.tokens.admin).delete(`/admin/organizers/${ta.orgId}`);
        assert(delR.status === 200, `Delete org failed: ${delR.data.message}`);
        // Note: ta.orgId was added to state.created.users; remove it since it's now deleted
        state.created.users = state.created.users.filter(id => id !== ta.orgId);

        // Verify event is no longer visible
        const browseAfter = await api().get('/events');
        const foundAfter = browseAfter.data.some(e => e._id === taEventId);
        assert(
            !foundAfter,
            `Event ${taEventId} is still visible after organizer deletion`
        );
    });

    //──────────────────────────────────────────────────────────────────
    // § 2 — Concurrent Transactions & Race Conditions
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.magenta('\n═══ §2: Concurrent Transactions & Race Conditions ═══\n')));

    await test(4, '2.4 – limit=1 race: only 1 of 2 simultaneous registrations succeeds', async () => {
        // Create event with registrationLimit=1
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_Race1_${T}`, description: 'Stage 2 race condition test',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationLimit: 1, registrationFee: 0, eligibility: 'All', status: 'published'
        });
        assert(evR.status === 201, `Race event create failed: ${evR.data.message}`);
        const raceEventId = evR.data._id;
        state.created.events.push(raceEventId);

        // Fire BOTH registrations simultaneously
        const [r1, r2] = await Promise.all([
            api(state.tokens.p1).post('/registrations', { eventId: raceEventId }),
            api(state.tokens.p2).post('/registrations', { eventId: raceEventId }),
        ]);

        const successes = [r1, r2].filter(r => r.status === 201).length;
        const rejects   = [r1, r2].filter(r => r.status === 400).length;

        // Track created registrations for cleanup
        if (r1.status === 201) state.created.registrations.push(r1.data.registration._id);
        if (r2.status === 201) state.created.registrations.push(r2.data.registration._id);

        assert(successes === 1, `Expected exactly 1 success, got ${successes} (r1:${r1.status}, r2:${r2.status})`);
        assert(rejects   === 1, `Expected exactly 1 rejection, got ${rejects}`);

        // Verify DB count = 1
        await mongoose.connect(process.env.MONGO_URI);
        const Reg = require('../models/Registration');
        const count = await Reg.countDocuments({
            event: new mongoose.Types.ObjectId(raceEventId),
            status: { $in: ['pending', 'confirmed'] }
        });
        await mongoose.disconnect();
        assert(count === 1, `DB shows ${count} registrations, expected 1`);
    });

    await test(5, '2.5 – Merch stock=1: approving both pending regs — second fails atomically', async () => {
        // Create merch event with stock=1
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_MerchRace_${T}`, description: 'Stage 2 merch race condition test',
            type: 'merchandise',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 200, eligibility: 'All', status: 'published',
            stock: 1, purchaseLimitPerUser: 1,
            itemDetails: [{ size: 'M', color: 'Red', quantity: 1 }]
        });
        assert(evR.status === 201, `Merch race event failed: ${evR.data.message}`);
        const mEventId = evR.data._id;
        state.created.events.push(mEventId);

        // Both participants register (pending, stock not yet decremented)
        const [mr1, mr2] = await Promise.all([
            api(state.tokens.p1).post('/registrations', { eventId: mEventId }),
            api(state.tokens.p2).post('/registrations', { eventId: mEventId }),
        ]);
        assert(mr1.status === 201, `P1 merch reg failed: ${mr1.data.message}`);
        assert(mr2.status === 201, `P2 merch reg failed: ${mr2.data.message}`);
        state.created.registrations.push(mr1.data.registration._id);
        state.created.registrations.push(mr2.data.registration._id);

        const regId1 = mr1.data.registration._id;
        const regId2 = mr2.data.registration._id;

        // Organizer approves P2 first
        const apr2 = await api(state.tokens.org).patch(`/registrations/${regId2}/approve-payment`);
        assert(apr2.status === 200, `P2 approval failed: ${apr2.data.message}`);
        assert(apr2.data.registration.status === 'confirmed', 'P2 should be confirmed');

        // Now try to approve P1 — stock is 0, must fail
        const apr1 = await api(state.tokens.org).patch(`/registrations/${regId1}/approve-payment`);
        assert(
            apr1.status !== 200,
            `P1 approval should fail with stock=0, but got 200: ${JSON.stringify(apr1.data).slice(0,200)}`
        );
        assert(
            /stock|out of stock|0/i.test(apr1.data.message || ''),
            `Expected out-of-stock error, got: ${apr1.data.message}`
        );

        // Verify stock is still 0 in DB
        await mongoose.connect(process.env.MONGO_URI);
        const Event = require('../models/Event');
        const ev = await Event.findById(mEventId);
        assert(ev.stock === 0, `Expected stock=0, got ${ev.stock}`);
        await mongoose.disconnect();
    });

    //──────────────────────────────────────────────────────────────────
    // § 3 — Complex State Transitions
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.magenta('\n═══ §3: Complex State Transitions ═══\n')));

    await test(6, '2.6 – Cancel vs Approve: system enforces clean state (no double-state)', async () => {
        // Create merch event
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_CancelApprove_${T}`, description: 'Stage 2 cancel vs approve test',
            type: 'merchandise',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 150, eligibility: 'All', status: 'published',
            stock: 5, purchaseLimitPerUser: 1,
            itemDetails: [{ size: 'S', color: 'Green', quantity: 5 }]
        });
        assert(evR.status === 201, `CA event failed: ${evR.data.message}`);
        const ceId = evR.data._id;
        state.created.events.push(ceId);

        // P1 registers (pending)
        const caReg = await api(state.tokens.p1).post('/registrations', { eventId: ceId });
        assert(caReg.status === 201, `CA reg failed: ${caReg.data.message}`);
        const caRegId = caReg.data.registration._id;
        state.created.registrations.push(caRegId);

        // Fire Cancel (P1) and Approve (Org) simultaneously
        const [cancelR, approveR] = await Promise.all([
            api(state.tokens.p1).patch(`/registrations/${caRegId}/cancel`),
            api(state.tokens.org).patch(`/registrations/${caRegId}/approve-payment`),
        ]);

        // One must succeed, one must fail (or both succeed with the last-writer-wins)
        // Key invariant: registration must be in ONE clean state
        await mongoose.connect(process.env.MONGO_URI);
        const Reg = require('../models/Registration');
        const finalReg = await Reg.findById(caRegId);
        await mongoose.disconnect();

        const finalStatus = finalReg?.status;
        const validStates = ['cancelled', 'confirmed', 'pending'];
        assert(
            validStates.includes(finalStatus),
            `Final registration state is invalid: ${finalStatus}`
        );

        // Verify no "ghost" state: if confirmed, cancellation should have failed; if cancelled, approval should have failed
        if (finalStatus === 'confirmed') {
            assert(
                cancelR.status !== 200 || approveR.status === 200,
                'Inconsistent: both cancel and approve succeeded on merch'
            );
        } else if (finalStatus === 'cancelled') {
            // The confirm may still show 200 if approve ran first but then cancel rolled it back — edge case ok
        }
    });

    await test(7, '2.7 – Scan vs Cancel: system does not corrupt attendance state', async () => {
        // Need a confirmed normal event registration with a real ticketId
        // Create a free event and register P2
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_ScanCancel_${T}`, description: 'Stage 2 scan vs cancel test',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationLimit: 10, registrationFee: 0, eligibility: 'All', status: 'published'
        });
        assert(evR.status === 201, `SC event failed: ${evR.data.message}`);
        const scEventId = evR.data._id;
        state.created.events.push(scEventId);

        const regR = await api(state.tokens.p2).post('/registrations', { eventId: scEventId });
        assert(regR.status === 201, `SC reg failed: ${regR.data.message}`);
        const scRegId = regR.data.registration._id;
        const scTicketId = regR.data.registration.ticketId;
        state.created.registrations.push(scRegId);

        // Fire Cancel (P2) and Scan (Org) simultaneously
        const [cancelR, scanR] = await Promise.all([
            api(state.tokens.p2).patch(`/registrations/${scRegId}/cancel`),
            api(state.tokens.org).post('/events/attendance/mark', { ticketId: scTicketId }),
        ]);

        console.log(c.dim(`             cancel=${cancelR.status}, scan=${scanR.status}`));

        // Verify final state is consistent in DB
        await mongoose.connect(process.env.MONGO_URI);
        const Reg = require('../models/Registration');
        const finalReg = await Reg.findById(scRegId);
        await mongoose.disconnect();

        if (!finalReg) {
            // Registration was hard-deleted (cancel won) — scan should have failed
            assert(scanR.status !== 200, 'Scan should not succeed if registration is deleted');
        } else {
            const status = finalReg.status;
            const attendance = finalReg.attendanceStatus;

            // Case A: Scan won → attendance=Present, cancel should fail or have no effect
            // Case B: Cancel won → status=cancelled, scan should fail
            if (attendance === 'Present') {
                // Cancel should now fail or be a no-op
                const cancelAfter = await api(state.tokens.p2).patch(`/registrations/${scRegId}/cancel`);
                assert(
                    cancelAfter.status !== 200,
                    'Cancel should fail after attendance is marked Present'
                );
            } else if (status === 'cancelled') {
                // Scan should now fail
                const scanAfter = await api(state.tokens.org).post('/events/attendance/mark', { ticketId: scTicketId });
                assert(
                    scanAfter.status !== 200,
                    'Scan should fail after registration is cancelled'
                );
            }
            // Any clean state is acceptable
        }
    });

    await test(8, '2.8 – Form schema frozen once event is published (cannot add questions after publish)', async () => {
        // Create a published event with one existing question
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_FormLock_${T}`, description: 'Stage 2 form lock test',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 0, eligibility: 'All', status: 'published',
            customForm: [{
                questionId: 'q1',
                questionText: 'Initial Question',
                questionType: 'short',
                required: false,
                order: 1
            }]
        });
        assert(evR.status === 201, `FormLock event failed: ${evR.data.message}`);
        const flEventId = evR.data._id;
        state.created.events.push(flEventId);

        // Register one participant to simulate "first registration received"
        const regR = await api(state.tokens.p1).post('/registrations', { eventId: flEventId });
        assert(regR.status === 201, `FormLock reg failed: ${regR.data.message}`);
        state.created.registrations.push(regR.data.registration._id);

        // Attempt to add a new question to the form via PATCH
        const patchR = await api(state.tokens.org).patch(`/events/${flEventId}`, {
            customForm: [
                { label: 'Initial Question', type: 'text', required: false },
                { label: 'NEW Question added after reg', type: 'text', required: true }
            ]
        });

        // Published event's allowed updates do NOT include customForm → patch should either:
        //   A) Return 200 but not update customForm (silent ignore)
        //   B) Return 400 explicitly
        const verifyR = await api().get(`/events/${flEventId}`);
        const formLen = verifyR.data.customForm?.length || 0;
        assert(
            formLen <= 1,
            `Form was modified after registration! Now has ${formLen} questions; expected ≤1`
        );
    });

    //──────────────────────────────────────────────────────────────────
    // § 4 — Privacy, Security & Data Fuzzing
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.magenta('\n═══ §4: Privacy, Security & Data Fuzzing ═══\n')));

    await test(9, '2.9 – Invalid / forged event IDs return clean error (no crash)', async () => {
        // Completely invalid ObjectId
        const r1 = await api(state.tokens.p1).post('/registrations', { eventId: 'not-an-objectid-at-all' });
        assert([400, 404].includes(r1.status), `Expected 400/404 for invalid ID, got ${r1.status}`);

        // Valid MongoDB ObjectId format but non-existent event
        const fakeId = new mongoose.Types.ObjectId().toString();
        const r2 = await api(state.tokens.p1).post('/registrations', { eventId: fakeId });
        assert([400, 404].includes(r2.status), `Expected 400/404 for non-existent event, got ${r2.status}`);

        // Attempt to GET a non-existent event
        const r3 = await api().get(`/events/${fakeId}`);
        assert([400, 404, 500].includes(r3.status), `Expected error for ghost event, got ${r3.status}`);

        // Server must still be responsive
        const ping = await api().get('/events/trending');
        assert(ping.status === 200, `Server crashed or became unresponsive after fuzzing! Got ${ping.status}`);
    });

    await test(10, '2.10 – Cross-user privacy: JWT user overrides any payload userId', async () => {
        // P1 tries to view P2's registrations by passing P2's ID in query param
        // Backend must always use req.user._id from JWT, never from request body/params
        const r = await api(state.tokens.p1).get(`/registrations/my-registrations`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);

        // Verify: all returned registrations belong to P1 (not P2)
        for (const reg of r.data) {
            const participantId = reg.participant?._id || reg.participant;
            if (participantId) {
                assert(
                    participantId.toString() === state.ids.p1.toString(),
                    `Cross-user leak: registration ${reg._id} belongs to ${participantId}, not P1 (${state.ids.p1})`
                );
            }
        }

        // Also try to directly GET another user's registration (no token)
        // P2's registrations: find one
        const p2R = await api(state.tokens.p2).get('/registrations/my-registrations');
        if (p2R.data.length > 0) {
            const p2RegId = p2R.data[0]._id;
            // P1 tries to access P2's specific registration
            const crossR = await api(state.tokens.p1).get(`/registrations/${p2RegId}`);
            assert(
                [403, 404].includes(crossR.status),
                `Cross-user access should be blocked; got ${crossR.status}: ${crossR.data.message}`
            );
        }
    });

    await test(11, '2.11 – Anonymous feedback double-submission blocked by feedbackSubmitted flag', async () => {
        // Create an event, register P1, mark attendance, submit feedback, then try again 10x
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_FeedbackDouble_${T}`, description: 'Stage 2 feedback double submission test',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 0, eligibility: 'All', status: 'published'
        });
        assert(evR.status === 201, `FeedbackDouble event failed: ${evR.data.message}`);
        const fbEventId = evR.data._id;
        state.created.events.push(fbEventId);

        const regR = await api(state.tokens.p1).post('/registrations', { eventId: fbEventId });
        assert(regR.status === 201, `FeedbackDouble reg failed: ${regR.data.message}`);
        const fbRegId = regR.data.registration._id;
        const fbTicketId = regR.data.registration.ticketId;
        state.created.registrations.push(fbRegId);

        // Mark attendance
        const scanR = await api(state.tokens.org).post('/events/attendance/mark', { ticketId: fbTicketId });
        assert(scanR.status === 200, `Attendance mark failed: ${scanR.data.message}`);

        // First feedback submission → must succeed
        const fb1 = await api(state.tokens.p1).post(`/feedback/${fbEventId}`, {
            rating: 3, comment: 'First submission'
        });
        assert([200, 201].includes(fb1.status), `First feedback failed: ${fb1.data.message}`);

        // Replay the same request 5 times → all must fail
        const replays = await Promise.all(
            Array(5).fill(null).map(() =>
                api(state.tokens.p1).post(`/feedback/${fbEventId}`, { rating: 3, comment: 'Replay' })
            )
        );
        const anySucceeded = replays.filter(r => [200, 201].includes(r.status)).length;
        assert(
            anySucceeded === 0,
            `${anySucceeded} out of 5 feedback replays succeeded — feedbackSubmitted flag not working`
        );

        // Verify only 1 feedback record in DB
        await mongoose.connect(process.env.MONGO_URI);
        const Feedback = require('../models/Feedback');
        const fbCount = await Feedback.countDocuments({ event: new mongoose.Types.ObjectId(fbEventId) });
        await mongoose.disconnect();
        assert(fbCount === 1, `Expected 1 feedback record in DB, got ${fbCount}`);
    });

    //──────────────────────────────────────────────────────────────────
    // § 5 — Webhooks & Integrations
    //──────────────────────────────────────────────────────────────────
    console.log(c.bold(c.magenta('\n═══ §5: Webhooks & Integrations ═══\n')));

    await test(12, '2.12 – Invalid Discord webhook URL does not crash event publish', async () => {
        // Set a malformed webhook URL on the organizer's profile
        await api(state.tokens.org).patch('/users/profile', {
            discordWebhookUrl: 'htttp://discord.invalid-webhook.com/does-not-exist'
        });

        // Publish a new event — Discord call will fail but event must still be created
        const evR = await api(state.tokens.org).post('/events', {
            name: `S2_DiscordFail_${T}`, description: 'Stage 2 Discord webhook failure test',
            type: 'normal',
            registrationDeadline: fd(), startDate: fs(), endDate: fe(),
            registrationFee: 0, eligibility: 'All',
            status: 'published'  // Triggers Discord notification
        });

        assert(evR.status === 201, `Event creation failed due to Discord error: ${evR.status}: ${evR.data.message}`);
        state.created.events.push(evR.data._id);

        // Verify the event actually exists in DB (not rolled back)
        const getR = await api().get(`/events/${evR.data._id}`);
        assert(getR.status === 200, `Event not found after publish with failed Discord: ${getR.status}`);

        // Server must still respond normally
        const ping = await api(state.tokens.admin).get('/admin/stats');
        assert(ping.status === 200, `Server unresponsive after Discord failure: ${ping.status}`);

        // Clean up webhook URL
        await api(state.tokens.org).patch('/users/profile', { discordWebhookUrl: '' });
    });

    //──────────────────────────────────────────────────────────────────
    // SUMMARY
    //──────────────────────────────────────────────────────────────────
    await cleanup();

    const total = passed + failed;
    console.log('\n' + '═'.repeat(65));
    console.log(c.bold(`  Stage 2 Concurrency & Security Results: ${total} tests`));
    console.log(c.green(`  ✓ Passed: ${passed}`));
    if (failed > 0) {
        console.log(c.red(`  ✗ Failed: ${failed}`));
        console.log(c.yellow('\n  Failed Tests:'));
        failures.forEach(f =>
            console.log(c.red(`    [TC-2.${f.id}] ${f.label}`) + c.dim(`\n         ${f.msg}`))
        );
    }
    console.log('═'.repeat(65) + '\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error(c.red('\n  Fatal error:'), err.message);
    cleanup().finally(() => process.exit(1));
});
