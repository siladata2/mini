
// ./commands/gemini.js

const axios = require('axios');

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'gemini',
    aliases: ['google', 'bard'],
    category: 'ai',

    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🧠 *Gemini AI*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.gemini <your question>\n\n' +
                    '✨ *Examples:*\n' +
                    '.gemini What is the capital of France?\n' +
                    '.gemini Write a poem about the ocean\n' +
                    '.gemini Explain how black holes work',
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

        // ── Reaction ──
        try { await sock.sendMessage(jid, { react: { text: '🧠', key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/ai/gemini?apikey=gifted&q=${encodeURIComponent(query)}`,
                { timeout: 60000 }
            );

            // Extraire la réponse
            let reply = '';
            if (typeof data === 'string') {
                reply = data;
            } else if (data?.result) {
                reply = data.result;
            } else if (data?.reply) {
                reply = data.reply;
            } else if (data?.response) {
                reply = data.response;
            } else if (data?.answer) {
                reply = data.answer;
            } else {
                reply = JSON.stringify(data, null, 2);
            }

            if (!reply || reply.trim().length < 2) {
                throw new Error('Empty response');
            }

            // ── Send response ──
            const caption =
                `🧠 *Gemini AI*\n\n` +
                `❓ *Q:* ${query.length > 200 ? query.substring(0, 200) + '...' : query}\n\n` +
                `💬 *A:* ${reply}\n\n` +
                `⚡ _Powered by Google Gemini_`;

            await sock.sendMessage(jid, {
                text: caption,
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

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ gemini error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Gemini Unavailable*\n\n' +
                    'The AI service is currently overloaded.\n\n' +
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
    },
};
