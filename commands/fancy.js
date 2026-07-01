
// ./commands/fancy.js

const axios = require('axios');

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'fancy',
    aliases: ['font', 'style', 'fancytext'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        // ── Get text ──
        const text = args.join(' ');

        if (!text || text.trim().length < 1) {
            return sock.sendMessage(jid, {
                text:
                    '✨ *Fancy Text Generator*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.fancy <text>\n\n' +
                    '✨ *Example:*\n' +
                    '.fancy Zenitsu Bot\n\n' +
                    '💡 *Tip:* Generates multiple stylish versions of your text.',
                contextInfo: {
                    forwardingScore: 350,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });
        }

        // ── Reaction: processing ──
        try {
            await sock.sendMessage(jid, {
                react: { text: '✨', key: msg.key },
            });
        } catch (_) {}

        try {
            // ── Call API ──
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/fancy?apikey=gifted&text=${encodeURIComponent(text)}`;
            const { data } = await axios.get(apiUrl, { timeout: 20000 });

            if (!data?.success || !data?.results || !Array.isArray(data.results)) {
                throw new Error('Invalid API response');
            }

            // ── Build response ──
            let replyText = `✨ *FANCY TEXT*\n\n`;

            data.results.forEach((item, index) => {
                if (item?.result) {
                    replyText += `*${index + 1}.* ${item.result}\n`;
                }
            });

            replyText += `\n⚡ _Powered by Cybernova_`;

            // ── Send response ──
            await sock.sendMessage(jid, {
                text: replyText,
                contextInfo: {
                    forwardingScore: 350,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });

            // ── Reaction: success ──
            try {
                await sock.sendMessage(jid, {
                    react: { text: '✅', key: msg.key },
                });
            } catch (_) {}

        } catch (err) {
            console.error('❌ fancy error:', err.message);

            // ── Reaction: error ──
            try {
                await sock.sendMessage(jid, {
                    react: { text: '❌', key: msg.key },
                });
            } catch (_) {}

            // ── Fallback: local basic fancy ──
            try {
                const fallbackStyles = generateLocalFancy(text);

                let fallbackText = `✨ *FANCY TEXT (Local)*\n\n`;
                fallbackStyles.forEach((item, i) => {
                    fallbackText += `*${i + 1}.* ${item}\n`;
                });
                fallbackText += `\n⚠️ _API unavailable — local styles shown_`;

                await sock.sendMessage(jid, {
                    text: fallbackText,
                    contextInfo: {
                        forwardingScore: 350,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202,
                        },
                    },
                }, { quoted: msg });
            } catch (fallbackErr) {
                console.error('❌ fancy fallback error:', fallbackErr.message);

                await sock.sendMessage(jid, {
                    text:
                        '❌ *Fancy Text Failed*\n\n' +
                        'The formatting service is currently unavailable.\n\n' +
                        '⚡ Please try again in a few seconds.',
                    contextInfo: {
                        forwardingScore: 350,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202,
                        },
                    },
                }, { quoted: msg });
            }
        }
    },
};

// ═══════════════════════════════════════
// LOCAL FALLBACK: Basic text styles
// ═══════════════════════════════════════

function generateLocalFancy(text) {
    const styles = [];

    // Bold (Unicode)
    styles.push(text.replace(/[a-zA-Z0-9]/g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 120211)
    ));

    // Italic (Unicode)
    styles.push(text.replace(/[a-zA-Z]/g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 119763)
    ));

    // Bold Italic
    styles.push(text.replace(/[a-zA-Z]/g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 120275)
    ));

    // Monospace
    styles.push(text.replace(/[a-zA-Z]/g, c =>
        String.fromCodePoint(c.charCodeAt(0) + 119795)
    ));

    // Upside down
    const upsideDownMap = {
        'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
        'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd',
        'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x',
        'y': 'ʎ', 'z': 'z',
        'A': '∀', 'B': 'ᗺ', 'C': 'Ɔ', 'D': 'ᗡ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁', 'H': 'H',
        'I': 'I', 'J': 'ſ', 'K': '⋊', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'Ԁ',
        'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '⊥', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X',
        'Y': '⅄', 'Z': 'Z',
    };
    styles.push(text.split('').map(c => upsideDownMap[c] || c).join(''));

    // Small caps
    const smallCapsMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ',
        'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ',
        'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
        'y': 'ʏ', 'z': 'ᴢ',
    };
    styles.push(text.toLowerCase().split('').map(c => smallCapsMap[c] || c).join(''));

    return styles;
}
