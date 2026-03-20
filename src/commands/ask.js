'use strict';

const { askGroq } = require('../groq');
const { sendFollowUp, sendError, isExpiredInteractionWebhookError } = require('../discord');

/**
 * Handles the /ask slash command.
 *
 * Flow:
 *  1. Immediately respond with type 5 (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
 *     → Discord shows "Bot is thinking…" and gives us more time.
 *  2. In the background, call GROQ API with the user's question.
 *  3. PATCH the original deferred message with the AI reply.
 *
 * @param {Object} interaction - The Discord interaction payload.
 * @param {Object} res         - Express response object.
 */
async function handleAskCommand(interaction, res) {
    // Extract the user's question from the "question" option
    const question = interaction.data?.options?.find(
        (opt) => opt.name === 'question'
    )?.value;

    if (!question) {
        // Respond immediately with a visible error (type 4 = CHANNEL_MESSAGE_WITH_SOURCE)
        return res.json({
            type: 4,
            data: { content: '❌ Please provide a question. Usage: `/ask question:<your question>`' },
        });
    }

    // ── Step 1: Send deferred response IMMEDIATELY ──────────────────────────────
    // Type 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    // This must happen within 3 seconds or Discord will consider the interaction failed.
    res.json({ type: 5 });

    // ── Step 2 & 3: Call GROQ and send follow-up asynchronously ─────────────────
    const token = interaction.token;

    try {
        const aiResponse = await askGroq(question);
        await sendFollowUp(token, aiResponse);
    } catch (err) {
        console.error('[/ask] Error:', err.message);

        if (isExpiredInteractionWebhookError(err)) {
            console.warn('[/ask] Interaction token expired before follow-up could be sent (likely cold start delay).');
            return;
        }

        await sendError(token, '⚠️ Failed to get a response from the AI. Please try again later.');
    }
}

module.exports = { handleAskCommand };
