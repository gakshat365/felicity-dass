const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getForYouEvents,
    getFollowingEvents,
    getTrendingEvents,
    getEndingSoonEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getMyEvents,
    exportEventCSV,
    markAttendance,
    getOrganizerStats
} = require('../controllers/eventController');
const { getEventRegistrations } = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public routes (named routes MUST come before /:id)
router.get('/', getEvents);
router.get('/trending', getTrendingEvents);
router.get('/ending-soon', getEndingSoonEvents);

// Protected participant routes (named, must be before /:id)
router.get('/for-you', protect, authorize('participant'), getForYouEvents);
router.get('/following', protect, authorize('participant'), getFollowingEvents);

// Protected organizer/admin routes (named, must be before /:id)
router.get('/organizer/my-events', protect, authorize('organizer', 'admin'), getMyEvents);
router.get('/organizer/stats', protect, authorize('organizer', 'admin'), getOrganizerStats);
router.post('/', protect, authorize('organizer', 'admin'), createEvent);
router.post('/attendance/mark', protect, authorize('organizer', 'admin'), markAttendance);

// Parameterized routes LAST (/:id is a catch-all)
router.get('/:id', getEventById);
router.patch('/:id', protect, authorize('organizer', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteEvent);
router.get('/:id/export-csv', protect, authorize('organizer', 'admin'), exportEventCSV);
router.get('/:id/registrations', protect, authorize('organizer', 'admin'), getEventRegistrations);

module.exports = router;

