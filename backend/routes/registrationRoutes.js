const express = require('express');
const router = express.Router();
const {
    createRegistration,
    getMyRegistrations,
    getRegistration,
    uploadPaymentProofHandler,
    upload,
    approvePayment,
    rejectPayment,
    cancelRegistration,
    markAttendanceByTicket
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

// Create registration (Participants only)
router.post('/', authorize('participant'), createRegistration);

// Get my registrations (Participants only)
router.get('/my-registrations', authorize('participant'), getMyRegistrations);

// Get single registration
router.get('/:id', getRegistration);

// Upload payment proof (Participants only)
router.post('/:id/upload-payment-proof',
    authorize('participant'),
    upload.single('paymentProof'),
    uploadPaymentProofHandler
);

// Approve payment (Organizers and Admin)
router.patch('/:id/approve-payment',
    authorize('organizer', 'admin'),
    approvePayment
);

// Reject payment (Organizers and Admin)
router.patch('/:id/reject-payment',
    authorize('organizer', 'admin'),
    rejectPayment
);

// Cancel registration (Participants only)
router.patch('/:id/cancel',
    authorize('participant'),
    cancelRegistration
);

// Mark attendance by ticket ID (Organizer/Admin only)
router.post('/event/:eventId/attendance',
    authorize('organizer', 'admin'),
    markAttendanceByTicket
);

module.exports = router;
