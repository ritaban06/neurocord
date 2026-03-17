'use strict';

const Groq = require('groq-sdk');

// Initialise the GROQ client once — it reads GROQ_API_KEY from the environment
const groq = new Groq();

const SYSTEM_PROMPT =
    'You are a helpful and concise AI assistant inside a Discord server. ' +
    'Keep your answers clear and to the point. ' +
    'If the answer is long, use bullet points or numbered lists.';

/**
 * Sends a user question to the GROQ Chat Completions API and returns the
 * AI-generated reply as a string.
 *
 * @param {string} userQuestion - The text submitted by the Discord user.
 * @returns {Promise<string>} The AI response text.
 */
async function askGroq(userQuestion) {
    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userQuestion },
        ],
        // Limit response length — Discord messages cap out at 2000 characters.
        max_tokens: 1800,
        temperature: 0.7,
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('GROQ returned an empty response.');
    }

    return content.trim();
}

module.exports = { askGroq };
