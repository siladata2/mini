// ./commands/ai.js

const axios = require('axios');

module.exports = {
    name: 'ai',
    aliases: ['unlimited', 'unlimitedai', 'aichat'],
    category: 'ai',

    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🤖 *Unlimited AI*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.ai <your question>\n\n' +
                    '✨ *Examples:*\n' +
                    '.ai What is your model?\n' +
                    '.ai Write a poem about the stars\n' +
                    '.ai Explain quantum physics simply\n\n' +
                    '💡 Multi-model AI with wide knowledge.',
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

        try { await sock.sendMessage(jid, { react: { text: '🤖', key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/ai/unlimitedai?apikey=gifted&q=${encodeURIComponent(query)}`,
                { timeout: 90000 }
            );

            // ── Extract response ──
            let reply = '';

            if (typeof data === 'string') {
                reply = data;
            } else if (data?.result) {
                reply = typeof data.result === 'string' ? data.result : data.result.reply || data.result.response || data.result.answer || data.result.message || JSON.stringify(data.result);
            } else if (data?.reply) {
                reply = data.reply;
            } else if (data?.response) {
                reply = data.response;
            } else if (data?.answer) {
                reply = data.answer;
            } else if (data?.message) {
                reply = data.message;
            } else if (data?.text) {
                reply = data.text;
            } else {
                reply = JSON.stringify(data, null, 2);
            }

            if (!reply || reply.trim().length < 2) {
                throw new Error('Empty response');
            }

            // ── Build caption ──
            const model = data?.model || data?.result?.model || 'Unlimited AI';
            const truncatedQuery = query.length > 300 ? query.substring(0, 300) + '...' : query;
            const truncatedReply = reply.length > 3000 ? reply.substring(0, 3000) + '...' : reply;

            const caption =
                '🤖 *Unlimited AI*\n\n' +
                `🧠 *Model:* ${model}\n` +
                `❓ *Q:* ${truncatedQuery}\n\n` +
                `💬 *A:* ${truncatedReply}\n\n` +
                '⚡ _Powered by GiftedTech Unlimited AI_';

            // ── Send response ──
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
            console.error('❌ ai error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *AI Unavailable*\n\n' +
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
