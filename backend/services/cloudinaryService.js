const cloudinary = require('cloudinary').v2;

// Configure Cloudinary once at module load
let cloudinaryConfigured = false;
const configureCloudinary = () => {
    if (cloudinaryConfigured) return true;

    if (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET) {

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        cloudinaryConfigured = true;
        console.log('✅ Cloudinary configured');
        return true;
    }

    console.log('⚠️  Cloudinary not configured (missing environment variables)');
    return false;
};

// Attempt initial configuration
configureCloudinary();

/**
 * Upload payment proof to Cloudinary
 */
const uploadPaymentProof = async (filePath, registrationId) => {
    try {
        if (!configureCloudinary()) {
            // Return mock URL for development
            return {
                success: true,
                url: `http://localhost:5000/uploads/payment-proof-${registrationId}.jpg`,
                message: 'Cloudinary not configured (development mode)'
            };
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'event-management/payment-proofs',
            public_id: `payment-${registrationId}-${Date.now()}`,
            resource_type: 'image'
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload payment proof');
    }
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId) => {
    try {
        if (!configureCloudinary()) {
            return { success: true, message: 'Cloudinary not configured' };
        }

        const result = await cloudinary.uploader.destroy(publicId);
        return { success: true, result };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    uploadPaymentProof,
    deleteFile,
    configureCloudinary
};
