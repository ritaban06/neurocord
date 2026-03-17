'use strict';

const { verifyKeyMiddleware } = require('discord-interactions');

/**
 * Returns an Express middleware that verifies incoming Discord interaction
 * requests using the app's public key. Discord requires this or it will
 * reject the endpoint entirely.
 */
function createVerifyMiddleware() {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error('DISCORD_PUBLIC_KEY is not set in environment variables.');
  }

  return verifyKeyMiddleware(publicKey);
}

module.exports = { createVerifyMiddleware };
