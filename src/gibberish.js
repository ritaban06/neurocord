'use strict';

const COMMON_NON_RESPONSES = new Set([
    '.',
    '..',
    '...',
    '?',
    '??',
    '???',
    '-',
    '--',
    'n/a',
    'na',
    'idk',
    'k',
    'ok',
]);

const SOCIAL_PHRASES = new Set([
    'hi',
    'hiya',
    'hello',
    'hello there',
    'hey',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
    'good night',
    'please',
    'pls',
    'plz',
    'thanks',
    'thanks a lot',
    'many thanks',
    'thank you',
    'thank u',
    'thx',
    'ty',
]);

function toNormalizedText(message) {
    return String(message || '').trim().toLowerCase();
}

function hasVeryShortContent(text) {
    const nonSpaceLength = text.replace(/\s+/g, '').length;
    return nonSpaceLength > 0 && nonSpaceLength <= 2;
}

function hasNoVowelsLongerThan4(text) {
    const lettersOnly = text.replace(/[^a-z]/g, '');
    return lettersOnly.length > 4 && !/[aeiou]/.test(lettersOnly);
}

function hasHighRepetitionRatio(text) {
    const lettersOnly = text.replace(/[^a-z]/g, '');

    if (lettersOnly.length < 6) {
        return false;
    }

    const counts = {};
    for (const ch of lettersOnly) {
        counts[ch] = (counts[ch] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(counts));
    const ratio = maxCount / lettersOnly.length;

    // Only flag heavy repetition; avoid false positives on normal words.
    return ratio > 0.6;
}

function looksLikeRandomAlphanum(text) {
    const compact = text.replace(/\s+/g, '');

    if (compact.length < 8 || !/^[a-z0-9]+$/i.test(compact)) {
        return false;
    }

    const lettersOnly = compact.replace(/[^a-z]/gi, '').toLowerCase();
    if (lettersOnly.length < 6) {
        return false;
    }

    const consonantClusters = lettersOnly.match(/[bcdfghjklmnpqrstvwxyz]{4,}/g) || [];
    const hasLongCluster = consonantClusters.length > 0;

    const vowelCount = (lettersOnly.match(/[aeiou]/g) || []).length;
    const vowelRatio = vowelCount / lettersOnly.length;

    return hasLongCluster && vowelRatio < 0.2;
}

function isCommonNonResponse(text) {
    if (COMMON_NON_RESPONSES.has(text)) {
        return true;
    }

    if (/^[.?!-]{1,}$/.test(text)) {
        return true;
    }

    return false;
}

function normalizeForSocialMatch(text) {
    return text
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getSocialReply(message) {
    const text = toNormalizedText(message);
    const socialText = normalizeForSocialMatch(text);

    if (!socialText) {
        return null;
    }

    if (SOCIAL_PHRASES.has(socialText)) {
        if (
            socialText === 'thanks' ||
            socialText === 'thanks a lot' ||
            socialText === 'many thanks' ||
            socialText === 'thank you' ||
            socialText === 'thank u' ||
            socialText === 'thx' ||
            socialText === 'ty'
        ) {
            return 'You are welcome! Ask me anything whenever you are ready.';
        }

        if (socialText === 'please' || socialText === 'pls' || socialText === 'plz') {
            return 'Sure. Send your full question and I will help.';
        }

        return 'Hi! Send me a question and I will do my best to help.';
    }

    return null;
}

/**
 * Heuristic gibberish detector.
 *
 * Returns true if the message is considered gibberish / non-responsive.
 * Rules (any one match = gibberish):
 *  1. Extremely short (<= 2 non-space chars)
 *  2. No vowels in a string longer than 4 chars (e.g. "jkdls", "qwerty")
 *  3. Character repetition ratio > 60% (e.g. "aaaaaa", "hahahahaha" — but NOT real words)
 *  4. Truly random alphanum strings (high consonant-cluster density)
 *  5. Common non-responses: ".", "...", "?", "-", "n/a", "idk" alone, etc.
 *
 * @param {string} message
 * @returns {boolean}
 */
function isGibberish(message) {
    const text = toNormalizedText(message);

    if (!text) {
        return true;
    }

    return (
        hasVeryShortContent(text) ||
        hasNoVowelsLongerThan4(text) ||
        hasHighRepetitionRatio(text) ||
        looksLikeRandomAlphanum(text) ||
        isCommonNonResponse(text)
    );
}

module.exports = { isGibberish, getSocialReply };