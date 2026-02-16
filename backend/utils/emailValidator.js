/**
 * Email Domain Validation Utility
 * Validates email domains according to Phase 1 requirements
 */

// IIIT email domains
const IIIT_DOMAINS = {
    STUDENT: ['@students.iiit.ac.in', '@research.iiit.ac.in', '@alumni.iiit.ac.in'],
    PROF: ['@iiit.ac.in'],
    ORGANIZER: ['@council.iiit.ac.in', '@clubs.iiit.ac.in', '@felicity.iiit.ac.in']
};

/**
 * Check if email belongs to IIIT student domains
 */
const isIIITStudent = (email) => {
    const lowerEmail = email.toLowerCase();
    return IIIT_DOMAINS.STUDENT.some(domain => lowerEmail.endsWith(domain));
};

/**
 * Check if email belongs to IIIT professor domain
 */
const isIIITProf = (email) => {
    const lowerEmail = email.toLowerCase();
    return IIIT_DOMAINS.PROF.some(domain => lowerEmail.endsWith(domain));
};

/**
 * Check if email belongs to IIIT organizer domains
 */
const isIIITOrganizer = (email) => {
    const lowerEmail = email.toLowerCase();
    return IIIT_DOMAINS.ORGANIZER.some(domain => lowerEmail.endsWith(domain));
};

/**
 * Check if email belongs to any IIIT domain
 */
const isIIITEmail = (email) => {
    return isIIITStudent(email) || isIIITProf(email) || isIIITOrganizer(email);
};

/**
 * Get participant type based on email domain
 * Returns: 'IIIT Student', 'IIIT Professor', 'Outside IIIT'
 */
const getParticipantType = (email) => {
    if (isIIITStudent(email)) return 'IIIT Student';
    if (isIIITProf(email)) return 'IIIT Professor';
    return 'Outside IIIT';
};

/**
 * Validate email format
 */
const isValidEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate participant email according to Phase 1 rules
 * IIIT participants must use IIIT email
 * Non-IIIT participants can use any valid email
 */
const validateParticipantEmail = (email) => {
    if (!isValidEmailFormat(email)) {
        return { valid: false, message: 'Invalid email format' };
    }

    // All valid emails are acceptable for participants
    return {
        valid: true,
        participantType: getParticipantType(email),
        isIIIT: isIIITEmail(email)
    };
};

/**
 * Validate organizer email according to Phase 1 rules
 * Organizers must use organizer-specific domains
 */
const validateOrganizerEmail = (email) => {
    if (!isValidEmailFormat(email)) {
        return { valid: false, message: 'Invalid email format' };
    }

    if (!isIIITOrganizer(email)) {
        return {
            valid: false,
            message: 'Organizer email must be from @council.iiit.ac.in, @clubs.iiit.ac.in, or @felicity.iiit.ac.in'
        };
    }

    return { valid: true };
};

/**
 * Validate admin email
 * Admin must use @iiit.ac.in domain
 */
const validateAdminEmail = (email) => {
    if (!isValidEmailFormat(email)) {
        return { valid: false, message: 'Invalid email format' };
    }

    if (!email.toLowerCase().endsWith('@iiit.ac.in')) {
        return {
            valid: false,
            message: 'Admin email must be from @iiit.ac.in domain'
        };
    }

    return { valid: true };
};

module.exports = {
    isIIITStudent,
    isIIITProf,
    isIIITOrganizer,
    isIIITEmail,
    getParticipantType,
    isValidEmailFormat,
    validateParticipantEmail,
    validateOrganizerEmail,
    validateAdminEmail,
    IIIT_DOMAINS
};
