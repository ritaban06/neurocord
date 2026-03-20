'use strict';

const { askGroq } = require('../groq');
const { isGibberish, getSocialReply } = require('../gibberish');
const { sendFollowUp, sendError, isExpiredInteractionWebhookError } = require('../discord');

const MAX_QUESTION_CHARS = 600;
const USER_COOLDOWN_MS = 8000;
const RECENT_DUPLICATE_WINDOW_MS = 60000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const userCooldown = new Map();
const userLastQuestion = new Map();
const responseCache = new Map();
const inFlightQuestions = new Set();

function getUserId(interaction) {
    return interaction.member?.user?.id || interaction.user?.id || 'unknown-user';
}

function normalizeQuestion(question) {
    return String(question)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function pruneExpiredCache(now) {
    for (const [key, entry] of responseCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            responseCache.delete(key);
        }
    }

    while (responseCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }
}

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

    if (question.length > MAX_QUESTION_CHARS) {
        return res.json({
            type: 4,
            data: {
                content: `⚠️ Please keep your question under ${MAX_QUESTION_CHARS} characters for faster replies.`,
                flags: 64,
            },
        });
    }

    const socialReply = getSocialReply(question);
    if (socialReply) {
        return res.json({
            type: 4,
            data: {
                content: `Social phrases: ${socialReply}`,
                flags: 64,
            },
        });
    }

    if (isGibberish(question)) {
        return res.json({
            type: 4,
            data: {
                content: '⚠️ Please send a clearer question so I can help.',
                flags: 64,
            },
        });
    }

    const now = Date.now();
    const userId = getUserId(interaction);
    const normalizedQuestion = normalizeQuestion(question);

    pruneExpiredCache(now);

    const lastAskAt = userCooldown.get(userId);
    if (lastAskAt && now - lastAskAt < USER_COOLDOWN_MS) {
        const seconds = Math.ceil((USER_COOLDOWN_MS - (now - lastAskAt)) / 1000);
        return res.json({
            type: 4,
            data: {
                content: `⏳ Please wait ${seconds}s before sending another question.`,
                flags: 64,
            },
        });
    }

    const lastQuestion = userLastQuestion.get(userId);
    if (
        lastQuestion &&
        lastQuestion.text === normalizedQuestion &&
        now - lastQuestion.timestamp < RECENT_DUPLICATE_WINDOW_MS
    ) {
        return res.json({
            type: 4,
            data: {
                content: '🔁 Same question detected recently. Please ask a new question or wait a bit.',
                flags: 64,
            },
        });
    }

    const cached = responseCache.get(normalizedQuestion);
    if (cached && now - cached.timestamp <= CACHE_TTL_MS) {
        userCooldown.set(userId, now);
        userLastQuestion.set(userId, { text: normalizedQuestion, timestamp: now });

        return res.json({
            type: 4,
            data: {
                content: `Cached reply: ${cached.answer}`,
                flags: 64,
            },
        });
    }

    if (inFlightQuestions.has(normalizedQuestion)) {
        return res.json({
            type: 4,
            data: {
                content: '⏳ That question is already being processed. Please wait a moment and retry.',
                flags: 64,
            },
        });
    }

    // ── Step 1: Send deferred response IMMEDIATELY ──────────────────────────────
    // Type 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    // This must happen within 3 seconds or Discord will consider the interaction failed.
    res.json({ type: 5 });

    // ── Step 2 & 3: Call GROQ and send follow-up asynchronously ─────────────────
    const token = interaction.token;
    userCooldown.set(userId, now);
    userLastQuestion.set(userId, { text: normalizedQuestion, timestamp: now });
    inFlightQuestions.add(normalizedQuestion);

    try {
        const aiResponse = await askGroq(question);
        responseCache.set(normalizedQuestion, { answer: aiResponse, timestamp: Date.now() });
        await sendFollowUp(token, aiResponse);
    } catch (err) {
        console.error('[/ask] Error:', err.message);

        if (isExpiredInteractionWebhookError(err)) {
            console.warn('[/ask] Interaction token expired before follow-up could be sent (likely cold start delay).');
            return;
        }

        await sendError(token, '⚠️ Failed to get a response from the AI. Please try again later.');
    } finally {
        inFlightQuestions.delete(normalizedQuestion);
    }
}

module.exports = { handleAskCommand };
