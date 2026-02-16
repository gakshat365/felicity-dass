const nodemailer = require('nodemailer');

// Create transporter (will be configured with environment variables)
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

/**
 * Send ticket email to participant
 */
const sendTicketEmail = async (participant, event, ticket) => {
    try {
        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('📧 Email not configured. Ticket would be sent to:', participant.email);
            console.log('Ticket ID:', ticket.ticketId);
            return { success: true, message: 'Email service not configured (development mode)' };
        }

        const transporter = createTransporter();

        // Extract base64 data from QR code data URL
        const qrBase64 = ticket.qrCodeBase64.split('base64,')[1];

        const mailOptions = {
            from: {
                name: 'Event Management System',
                address: process.env.EMAIL_USER
            },
            to: participant.email,
            subject: `🎟️ Your Ticket for ${event.name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #0d1117; color: #fff; padding: 20px; text-align: center; }
                        .content { background: #f6f8fa; padding: 30px; }
                        .ticket-box { background: white; border: 2px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; }
                        .ticket-id { font-size: 24px; font-weight: bold; color: #58a6ff; text-align: center; margin: 10px 0; }
                        .qr-code { text-align: center; margin: 20px 0; }
                        .details { margin: 15px 0; }
                        .details strong { color: #0d1117; }
                        .footer { text-align: center; color: #6e7681; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Registration Confirmed!</h1>
                        </div>
                        <div class="content">
                            <p>Hi ${participant.firstName},</p>
                            <p>Your registration for <strong>${event.name}</strong> has been confirmed!</p>
                            
                            <div class="ticket-box">
                                <div class="ticket-id">${ticket.ticketId}</div>
                                <div class="qr-code">
                                    <img src="cid:qrcode" alt="QR Code" width="250" height="250" />
                                    <p style="color: #6e7681; font-size: 14px;">Show this QR code at the event</p>
                                </div>
                                
                                <div class="details">
                                    <p><strong>Event:</strong> ${event.name}</p>
                                    <p><strong>Type:</strong> ${event.type}</p>
                                    <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                                    <p><strong>Organizer:</strong> ${event.organizer?.organizerName || 'Event Organizer'}</p>
                                </div>
                            </div>
                            
                            ${event.registrationFee > 0 ? `
                                <p style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                                    <strong>⚠️ Payment Required:</strong> ₹${event.registrationFee}<br/>
                                    Please complete the payment and upload proof in your dashboard.
                                </p>
                            ` : ''}
                            
                            <p>We look forward to seeing you at the event!</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply.</p>
                            <p>Event Management System © 2026</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: qrBase64,
                    encoding: 'base64',
                    cid: 'qrcode' // Referenced in HTML as cid:qrcode
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Ticket email sent:', info.messageId);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending error:', error);
        // Don't throw error - registration should succeed even if email fails
        return { success: false, error: error.message };
    }
};

/**
 * Send payment approval notification
 */
const sendPaymentApprovalEmail = async (participant, event, registration) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('📧 Payment approval email would be sent to:', participant.email);
            return { success: true, message: 'Email service not configured' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'Event Management System',
                address: process.env.EMAIL_USER
            },
            to: participant.email,
            subject: `✅ Payment Approved - ${event.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3fb950;">✅ Payment Approved!</h2>
                    <p>Hi ${participant.firstName},</p>
                    <p>Your payment for <strong>${event.name}</strong> has been approved.</p>
                    <p><strong>Amount:</strong> ₹${registration.paymentAmount}</p>
                    <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
                    <p>Your registration is now confirmed. See you at the event!</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Payment approval email error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send payment rejection notification
 */
const sendPaymentRejectionEmail = async (participant, event, reason) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('📧 Payment rejection email would be sent to:', participant.email);
            return { success: true, message: 'Email service not configured' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'Event Management System',
                address: process.env.EMAIL_USER
            },
            to: participant.email,
            subject: `❌ Payment Rejected - ${event.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #f85149;">❌ Payment Rejected</h2>
                    <p>Hi ${participant.firstName},</p>
                    <p>Unfortunately, your payment proof for <strong>${event.name}</strong> was rejected.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                    <p>Please upload a valid payment proof or contact the organizer for assistance.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Payment rejection email error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send password reset notification to organizer
 */
const sendPasswordResetEmail = async (user, newPassword) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('📧 Password reset email would be sent to:', user.email);
            return { success: true, message: 'Email service not configured' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'Event Management System',
                address: process.env.EMAIL_USER
            },
            to: user.email,
            subject: '🔑 Password Reset Successful',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4dc71f;">🔑 Password Reset Successful</h2>
                    <p>Hi ${user.organizerName || user.firstName},</p>
                    <p>Your password has been successfully reset by the platform administrator.</p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; color: #666;">Your new temporary password is:</p>
                        <h3 style="margin: 5px 0; color: #333; font-family: monospace; letter-spacing: 2px;">${newPassword}</h3>
                    </div>
                    <p>Please log in and change your password immediately from your profile settings.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendTicketEmail,
    sendPaymentApprovalEmail,
    sendPaymentRejectionEmail,
    sendPasswordResetEmail
};
