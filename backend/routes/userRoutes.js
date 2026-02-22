const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    saveOnboarding,
    getOrganizers,
    getOrganizerById,
    toggleFollow,
    getProfileCompletion,
    testWebhook
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Profile routes
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.get('/profile-completion', protect, getProfileCompletion);

// Onboarding
router.post('/onboarding', protect, saveOnboarding);

// Organizers (for following feature)
router.get('/organizers', protect, getOrganizers);
router.get('/organizers/:id', getOrganizerById); // Public View
router.post('/follow/:organizerId', protect, toggleFollow);
router.post('/test-webhook', protect, testWebhook);

module.exports = router;
