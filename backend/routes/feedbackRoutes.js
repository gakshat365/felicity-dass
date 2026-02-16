const express = require('express');
const router = express.Router();
const {
    submitFeedback,
    getEventFeedback
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Participant Route
router.post('/:eventId', submitFeedback);

// Organizer/Admin Route
router.get('/event/:eventId', getEventFeedback);

module.exports = router;
