const axios = require('axios');

/**
 * Send a notification to Discord when a new event is published
 * @param {string} webhookUrl 
 * @param {object} event 
 */
const sendEventNotification = async (webhookUrl, event) => {
    if (!webhookUrl) return;

    try {
        const embed = {
            title: `🚀 New Event: ${event.name}`,
            description: event.description.substring(0, 2048),
            url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}`,
            color: 5814783, // GitHub Blue
            fields: [
                {
                    name: "📅 Date",
                    value: new Date(event.startDate).toLocaleDateString(),
                    inline: true
                },
                {
                    name: "📍 Type",
                    value: event.type,
                    inline: true
                },
                {
                    name: "🎟️ Fee",
                    value: event.registrationFee === 0 ? "Free" : `₹${event.registrationFee}`,
                    inline: true
                }
            ],
            footer: {
                text: "DASS Event Management System"
            },
            timestamp: new Date()
        };

        await axios.post(webhookUrl, {
            content: "📢 **Attention!** A new event has been published on the platform!",
            embeds: [embed]
        });

        console.log(`Discord notification sent for event: ${event.name}`);
    } catch (error) {
        console.error('Discord webhook error:', error.message);
    }
};

module.exports = {
    sendEventNotification
};
