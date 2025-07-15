// --- anonymizer.js ---
// This module runs entirely in the user's browser.
// It finds and replaces PII before any data is sent to the server.

const IP_REGEX = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
// Add more common usernames or patterns to be anonymized
const USERNAME_REGEX = /\b(user|login|for|by)\s+([a-zA-Z0-9_-]{3,})\b/g;


/**
 * Anonymizes log content by replacing PII with placeholders.
 * @param {string} logContent - The raw text content of the logs.
 * @returns {{anonymizedContent: string, piiMap: object}} - An object containing the sanitized content and the PII map.
 */
export function anonymizeData(logContent) {
    const piiMap = {};
    const reversePiiMap = {};
    let ipCounter = 1;
    let userCounter = 1;
    let emailCounter = 1;

    const replacer = (map, prefix, counter, match) => {
        if (reversePiiMap[match]) {
            return reversePiiMap[match];
        }
        const placeholder = `${prefix}_${counter++}`;
        piiMap[placeholder] = match;
        reversePiiMap[match] = placeholder;
        return placeholder;
    };

    let anonymizedContent = logContent.replace(IP_REGEX, (match) => {
        // Avoid anonymizing private or broadcast addresses
        if (match.startsWith('192.168.') || match.startsWith('10.') || match.startsWith('127.') || match === '0.0.0.0' || match === '255.255.255.255') {
            return match;
        }
        if (!reversePiiMap[match]) {
            const placeholder = `IP_${ipCounter++}`;
            piiMap[placeholder] = match;
            reversePiiMap[match] = placeholder;
        }
        return reversePiiMap[match];
    });

    anonymizedContent = anonymizedContent.replace(EMAIL_REGEX, (match) => {
        if (!reversePiiMap[match]) {
            const placeholder = `EMAIL_${emailCounter++}`;
            piiMap[placeholder] = match;
            reversePiiMap[match] = placeholder;
        }
        return reversePiiMap[match];
    });
    
    anonymizedContent = anonymizedContent.replace(USERNAME_REGEX, (match, keyword, username) => {
        if (!reversePiiMap[username]) {
            const placeholder = `USER_${userCounter++}`;
            piiMap[placeholder] = username;
            reversePiiMap[username] = placeholder;
        }
        return `${keyword} ${reversePiiMap[username]}`;
    });

    return { anonymizedContent, piiMap };
}
