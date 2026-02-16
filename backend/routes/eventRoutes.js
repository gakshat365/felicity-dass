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

// Public routes
router.get('/', getEvents);
router.get('/trending', getTrendingEvents);
router.get('/ending-soon', getEndingSoonEvents);
router.get('/:id', getEventById);

// Protected participant routes
router.get('/for-you', protect, authorize('participant'), getForYouEvents);
router.get('/following', protect, authorize('participant'), getFollowingEvents);

// Protected organizer/admin routes
router.use(protect);
router.use(authorize('organizer', 'admin'));

router.get('/my-events', getMyEvents);
router.get('/organizer/stats', getOrganizerStats);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/attendance/mark', markAttendance);
router.get('/:id/export-csv', exportEventCSV);
router.get('/:id/registrations', getEventRegistrations);

module.exports = router;
