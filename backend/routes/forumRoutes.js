const express = require('express');
const router = express.Router();
const {
    getForumMessages,
    postMessage,
    toggleReaction,
    togglePin,
    deleteMessage
} = require('../controllers/forumController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:eventId', getForumMessages);
router.post('/:eventId', postMessage);
router.patch('/message/:messageId/react', toggleReaction);
router.patch('/message/:messageId/pin', togglePin);
router.delete('/message/:messageId', deleteMessage);

module.exports = router;
