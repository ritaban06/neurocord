'use strict';

require('dotenv').config();

const express = require('express');
const { InteractionType, InteractionResponseType } = require('discord-interactions');
const { createVerifyMiddleware } = require('./verify');
const { handleAskCommand } = require('./commands/ask');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
// discord-interactions' verifyKeyMiddleware reads the raw body for signature
// verification, so we must NOT use express.json() before this route.
app.post(
    '/interactions',
    createVerifyMiddleware(),

    async (req, res) => {
        const interaction = req.body;

        // ── PING ──────────────────────────────────────────────────────────────────
        // Discord sends a PING when you first set the Interactions Endpoint URL.
        // We must reply with PONG or the URL won't be accepted.
        if (interaction.type === InteractionType.PING) {
            return res.json({ type: InteractionResponseType.PONG });
        }

        // ── APPLICATION_COMMAND ──────────────────────────────────────────────────
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const commandName = interaction.data?.name;

            if (commandName === 'ask') {
                return handleAskCommand(interaction, res);
            }

            // Unknown command — reply with an ephemeral error visible only to the user
            return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `❌ Unknown command: \`/${commandName}\``,
                    flags: 64, // EPHEMERAL
                },
            });
        }

        // Unhandled interaction type
        console.warn(`[interactions] Unhandled interaction type: ${interaction.type}`);
        return res.status(400).json({ error: 'Unhandled interaction type' });
    }
);

// ── Health check ─────────────────────────────────────────────────────────────
// Render (and other platforms) ping this to confirm the service is alive.
app.get('/', (_req, res) => {
    res.send('NeuroCord is running 🤖');
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ NeuroCord listening on port ${PORT}`);
});
