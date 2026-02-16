const express = require('express');
const router = express.Router();
const {
    getStats,
    getOrganizers,
    approveOrganizer,
    rejectOrganizer,
    updateOrganizerStatus,
    getAllEvents,
    createOrganizer,
    getPasswordRequests,
    handlePasswordRequest,
    deleteOrganizer
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes are protected and restricted to admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/organizers', getOrganizers);
router.post('/organizers', createOrganizer);
router.patch('/organizers/:id/approve', approveOrganizer);
router.patch('/organizers/:id/reject', rejectOrganizer);
router.patch('/organizers/:id/status', updateOrganizerStatus);
router.delete('/organizers/:id', deleteOrganizer);
router.get('/events', getAllEvents);

// Password recovery (Admin side)
router.get('/password-requests', getPasswordRequests);
router.patch('/password-requests/:id', handlePasswordRequest);

module.exports = router;
