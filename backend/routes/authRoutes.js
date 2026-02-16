const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, changePassword, requestPasswordReset } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;
