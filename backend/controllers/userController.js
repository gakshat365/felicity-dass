const User = require('../models/User');

/**
 * Calculate profile completeness percentage
 * Base: 50% (mandatory fields: firstName, lastName, email, password, participantType/role)
 * Optional fields (10% each): interests, following, collegeName, contactNumber, profilePicture
 */
const calculateProfileCompleteness = (user) => {
    let completeness = 50; // Base for mandatory fields

    // Only calculate for participants
    if (user.role === 'participant') {
        if (user.interests && user.interests.length > 0) completeness += 10;
        if (user.following && user.following.length > 0) completeness += 10;
        if (user.collegeName) completeness += 10;
        if (user.contactNumber) completeness += 10;
        // profilePicture will add 10% when implemented
    } else if (user.role === 'organizer') {
        // Organizers have different completion criteria
        if (user.organizerName) completeness += 10;
        if (user.category) completeness += 10;
        if (user.description) completeness += 10;
        if (user.contactEmail) completeness += 10;
        if (user.contactNumber) completeness += 10;
    }

    return Math.min(completeness, 100);
};

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
    try {
        let query = User.findById(req.user._id).select('-password');

        if (req.user.role === 'participant') {
            query = query.populate('following', 'organizerName category');
        }

        const user = await query;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate and update profile completeness
        const completeness = calculateProfileCompleteness(user);
        if (user.profileCompleteness !== completeness) {
            user.profileCompleteness = completeness;
            await user.save();
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update user profile (partial updates allowed)
 * @route   PATCH /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fields that can be updated
        const allowedUpdates = {
            participant: ['firstName', 'lastName', 'interests', 'following', 'collegeName', 'contactNumber'],
            organizer: ['firstName', 'lastName', 'organizerName', 'description', 'contactEmail', 'contactNumber', 'discordWebhookUrl'],
            admin: ['firstName', 'lastName', 'contactNumber']
        };

        const updates = allowedUpdates[user.role] || [];

        // Apply updates
        updates.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        // Recalculate profile completeness
        user.profileCompleteness = calculateProfileCompleteness(user);

        await user.save();

        // Return updated user without password
        let query = User.findById(user._id).select('-password');

        if (user.role === 'participant') {
            query = query.populate('following', 'organizerName category');
        }

        const updatedUser = await query;

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Save onboarding preferences
 * @route   POST /api/users/onboarding
 * @access  Private
 */
const saveOnboarding = async (req, res) => {
    try {
        const { interests, following, collegeName, contactNumber, skipOnboarding } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only participants go through onboarding
        if (user.role !== 'participant') {
            return res.status(400).json({ message: 'Onboarding is only for participants' });
        }

        // Update fields if provided
        if (interests) user.interests = interests;
        if (following) user.following = following;
        if (collegeName) user.collegeName = collegeName;
        if (contactNumber) user.contactNumber = contactNumber;

        // Mark onboarding as completed or skipped
        if (skipOnboarding) {
            user.onboardingSkipped = true;
        } else {
            user.onboardingCompleted = true;
        }

        // Recalculate profile completeness
        user.profileCompleteness = calculateProfileCompleteness(user);

        await user.save();

        const updatedUser = await User.findById(user._id)
            .select('-password')
            .populate('following', 'organizerName category');

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all approved organizers (for following feature)
 * @route   GET /api/users/organizers
 * @access  Private
 */
const getOrganizers = async (req, res) => {
    try {
        const { category, search } = req.query;

        let query = { role: 'organizer', isApproved: true };

        // Filter by category if provided
        if (category && ['club', 'council', 'fest-team'].includes(category)) {
            query.category = category;
        }

        // Search by name if provided
        if (search) {
            query.organizerName = { $regex: search, $options: 'i' };
        }

        const organizers = await User.find(query)
            .select('organizerName category description followerCount contactEmail')
            .sort({ followerCount: -1 });

        res.json(organizers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get a single organizer by ID
 * @route   GET /api/users/organizers/:id
 * @access  Public
 */
const getOrganizerById = async (req, res) => {
    try {
        const organizer = await User.findById(req.params.id)
            .select('organizerName category description contactEmail followerCount role');

        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        res.json(organizer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/**
 * @desc    Follow/Unfollow an organizer
 * @route   POST /api/users/follow/:organizerId
 * @access  Private
 */
const toggleFollow = async (req, res) => {
    try {
        const { organizerId } = req.params;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'participant') {
            return res.status(400).json({ message: 'Only participants can follow organizers' });
        }

        // Check if organizer exists
        const organizer = await User.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Toggle follow — use .toString() comparison to handle ObjectId vs String
        const isFollowing = user.following.some(id => id.toString() === organizerId);

        if (isFollowing) {
            // Unfollow
            user.following = user.following.filter(id => id.toString() !== organizerId);
            organizer.followerCount = Math.max(0, organizer.followerCount - 1);
        } else {
            // Follow
            user.following.push(organizerId);
            organizer.followerCount += 1;
        }

        // Recalculate profile completeness
        user.profileCompleteness = calculateProfileCompleteness(user);

        await user.save();
        await organizer.save();

        const updatedUser = await User.findById(user._id)
            .select('-password')
            .populate('following', 'organizerName category');

        res.json({
            user: updatedUser,
            action: isFollowing ? 'unfollowed' : 'followed'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get profile completion status
 * @route   GET /api/users/profile-completion
 * @access  Private
 */
const getProfileCompletion = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const completeness = calculateProfileCompleteness(user);

        // Determine missing fields
        const missingFields = [];
        if (user.role === 'participant') {
            if (!user.interests || user.interests.length === 0) missingFields.push('interests');
            if (!user.following || user.following.length === 0) missingFields.push('following');
            if (!user.collegeName) missingFields.push('collegeName');
            if (!user.contactNumber) missingFields.push('contactNumber');
        }

        res.json({
            completeness,
            missingFields,
            onboardingCompleted: user.onboardingCompleted,
            onboardingSkipped: user.onboardingSkipped
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const testWebhook = async (req, res) => {
    try {
        const { url } = req.body;
        const { sendEventNotification } = require('../services/discordService');

        // Send a dummy test message
        const mockEvent = {
            name: "Test Connection",
            organizer: { organizerName: req.user.organizerName || "Organization" },
            type: "Test",
            registrationFee: 0,
            registrationDeadline: new Date(),
            _id: "test"
        };

        await sendEventNotification(url, mockEvent);
        res.json({ message: 'Test notification sent' });
    } catch (error) {
        res.status(500).json({ message: 'Discord notification failed' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    saveOnboarding,
    getOrganizers,
    getOrganizerById,
    toggleFollow,
    getProfileCompletion,
    testWebhook
};
