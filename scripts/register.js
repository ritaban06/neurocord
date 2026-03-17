'use strict';

/**
 * One-time script to register the /ask slash command with Discord globally.
 *
 * Run once with:  npm run register
 *
 * The command will be available in all servers where the bot is installed
 * within ~1 hour of global propagation (or instantly in the test guild if
 * you switch to guild-scoped registration).
 */

require('dotenv').config();

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APPLICATION_ID || !BOT_TOKEN) {
    console.error('❌ DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set in your .env file.');
    process.exit(1);
}

// ── Command definition ────────────────────────────────────────────────────────
const commands = [
    {
        name: 'ask',
        description: 'Ask the AI anything!',
        options: [
            {
                name: 'question',
                description: 'Your question for the AI',
                type: 3, // STRING
                required: true,
            },
        ],
    },
];

// ── Register globally ─────────────────────────────────────────────────────────
async function registerCommands() {
    const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

    console.log('📡 Registering slash commands...');

    const res = await fetch(url, {
        method: 'PUT', // PUT replaces ALL global commands — clean slate
        headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
    });

    if (!res.ok) {
        const error = await res.text();
        console.error(`❌ Failed to register commands (${res.status}):`, error);
        process.exit(1);
    }

    const data = await res.json();
    console.log(`✅ Registered ${data.length} command(s):`);
    data.forEach((cmd) => console.log(`   /${cmd.name} — ${cmd.description}`));
}

registerCommands();
