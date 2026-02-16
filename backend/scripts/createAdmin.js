const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('Admin already exists. Skipping admin creation.');
            console.log('Admin Email:', adminExists.email);
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@iiit.ac.in',
            password: 'Admin@123456', // Will be hashed automatically by pre-save hook
            role: 'admin'
        });

        console.log('✅ Admin created successfully!');
        console.log('==========================================');
        console.log('Admin Credentials:');
        console.log('Email:', admin.email);
        console.log('Password: Admin@123456');
        console.log('==========================================');
        console.log('⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
