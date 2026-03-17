'use strict';

/**
 * Sends a follow-up message to Discord after a deferred interaction.
 * This PATCH replaces the original "Bot is thinking…" placeholder.
 *
 * Discord webhook endpoint:
 *   PATCH /webhooks/{application_id}/{interaction_token}/messages/@original
 *
 * @param {string} interactionToken - The token from the Discord interaction payload.
 * @param {string} content         - The message text to send (max 2000 chars).
 */
async function sendFollowUp(interactionToken, content) {
    const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/@original`;

    // Truncate to Discord's hard limit of 2000 characters
    const safeContent = content.length > 2000 ? content.slice(0, 1997) + '…' : content;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: safeContent }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord follow-up failed (${response.status}): ${text}`);
    }
}

/**
 * Sends an error follow-up so the user knows something went wrong
 * instead of seeing "Bot is thinking…" forever.
 *
 * @param {string} interactionToken - The token from the Discord interaction payload.
 * @param {string} [message]        - Optional custom error message.
 */
async function sendError(interactionToken, message) {
    const errorText =
        message || '⚠️ Something went wrong while processing your request. Please try again.';

    await sendFollowUp(interactionToken, errorText).catch((err) => {
        // If even the error follow-up fails, just log it — nothing more we can do.
        console.error('Failed to send error follow-up:', err.message);
    });
}

module.exports = { sendFollowUp, sendError };
