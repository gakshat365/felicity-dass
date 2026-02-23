const QRCode = require('qrcode');

/**
 * Generate a unique ticket ID
 */
const generateTicketId = (registrationId) => {
    const timestamp = Date.now();
    const shortId = registrationId.toString().slice(-6).toUpperCase();
    return `TKT-${timestamp}-${shortId}`;
};

/**
 * Generate QR code as base64 data URL
 * QR contains the registration ID for scanning
 */
const generateQRCode = async (ticketId) => {
    try {
        const qrData = ticketId.toString();   // encode the human-readable TKT-... ticketId
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2
        });
        return qrCodeDataURL;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate complete ticket data
 */
const generateTicket = async (registration, event, participant) => {
    try {
        // Generate ticket ID
        const ticketId = generateTicketId(registration._id);

        // Generate QR code — encodes the ticketId so the scanner can match it
        const qrCodeBase64 = await generateQRCode(ticketId);

        return {
            ticketId,
            qrCodeBase64,
            // PDF generation will be added later if needed
            pdfUrl: null
        };
    } catch (error) {
        console.error('Ticket generation error:', error);
        throw new Error('Failed to generate ticket');
    }
};

module.exports = {
    generateTicketId,
    generateQRCode,
    generateTicket
};
