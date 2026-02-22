const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
    validateParticipantEmail,
    validateOrganizerEmail,
    getParticipantType
} = require('../utils/emailValidator');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { firstName, lastName, email, password, role, organizerName, category, description, contactNumber } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: 'Please add all required fields' });
    }

    // Role validation: Admin cannot be registered via public API (provisioned manually or first-time setup)
    if (role === 'admin') {
        return res.status(403).json({ message: 'Admin registration is restricted' });
    }

    // Email domain validation based on role
    if (role === 'organizer') {
        // Requirement 4.1.2: No self-registration for organizers
        return res.status(403).json({ message: 'Organizer self-registration is not allowed. Accounts must be provisioned by Admin.' });
    } else {
        // Participant validation
        const emailValidation = validateParticipantEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ message: emailValidation.message });
        }
    }

    // Organizer specific validation
    if (role === 'organizer' && (!organizerName || !category)) {
        return res.status(400).json({ message: 'Organizer details required' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Use participant as default role if none provided
    const effectiveRole = role || 'participant';

    // Determine participant type for participants
    const participantType = effectiveRole === 'participant' ? getParticipantType(email) : undefined;

    // Create User
    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role: effectiveRole,
        participantType,
        organizerName: role === 'organizer' ? organizerName : undefined,
        category: role === 'organizer' ? category : undefined,
        description: role === 'organizer' ? description : undefined,
        contactNumber
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            firstName: user.firstName,
            email: user.email,
            role: user.role,
            participantType: user.participantType,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user.id,
            firstName: user.firstName,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const { _id, firstName, lastName, email, role } = await User.findById(req.user.id);
    res.status(200).json({
        id: _id,
        firstName,
        lastName,
        email,
        role,
    });
};

const PasswordResetRequest = require('../models/PasswordResetRequest');

/**
 * @desc    Request password reset (Public)
 * @route   POST /api/auth/request-password-reset
 * @access  Public
 */
const requestPasswordReset = async (req, res) => {
    try {
        const { email, reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Please provide a reason for the recovery request' });
        }
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email not found' });
        }

        // Check if a pending request already exists
        const existingRequest = await PasswordResetRequest.findOne({ user: user._id, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ message: 'A pending recovery request already exists for this email' });
        }

        await PasswordResetRequest.create({
            user: user._id,
            email: email,
            reason: reason
        });

        res.json({ message: 'Password recovery request sent to admin' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Change password
 * @route   PATCH /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    changePassword,
    requestPasswordReset
};
