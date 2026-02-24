const express = require('express');
const router = express.Router();
const { createTeam, getTeamByCode, joinTeam, getMyTeam } = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

// Look up a team by invite code before joining (GET so no body needed; code in URL)
router.get('/code/:code', getTeamByCode);

// Get current user's team for a specific event
router.get('/event/:eventId/my-team', authorize('participant'), getMyTeam);

// Create a new team for an event
router.post('/', authorize('participant'), createTeam);

// Join an existing team via invite code
router.post('/join', authorize('participant'), joinTeam);

module.exports = router;
