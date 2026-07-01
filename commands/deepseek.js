// ./commands/deepseek.js

const axios = require('axios');

// ═══════════════════════════════════════
// AVAILABLE MODELS
// ═══════════════════════════════════════

const MODELS = {
    deepseek: { name: 'DeepSeek', icon: '🐋' },
    claude: { name: 'Claude', icon: '🧠' },
    gpt4o: { name: 'GPT-4o', icon: '🤖' },
    gemini: { name: 'Gemini', icon: '💎' },
    llama: { name: 'Llama', icon: '🦙' },
};

const DEFAULT_MODEL = 'deepseek';

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'deepseek',
    aliases: ['ds', 'claude', 'gpt4o', 'overchat'],
    category: 'ai',

    async execute({ sock, msg, args, jid }) {
        let model = DEFAULT_MODEL;
        let query = '';

        // ── Check for model in args ──
        const firstArg = args[0]?.toLowerCase();

        if (firstArg && MODELS[firstArg]) {
            model = firstArg;
            query = args.slice(1).join(' ');
        } else if (firstArg && firstArg.includes('|')) {
            // Format: model|question
            const parts = firstArg.split('|');
            const possibleModel = parts[0].trim().toLowerCase();
            if (MODELS[possibleModel]) {
                model = possibleModel;
                query = parts.slice(1).join('|').trim();
            } else {
                query = args.join(' ');
            }
        } else {
            query = args.join(' ');
        }

        const modelInfo = MODELS[model];

        // ── No query → show help ──
        if (!query || query.trim().length < 2) {
            const modelList = Object.entries(MODELS)
                .map(([key, val]) => `  ${val.icon} *${key}* — ${val.name}`)
                .join('\n');

            return sock.sendMessage(jid, {
                text:
                    `${modelInfo.icon} *DeepSeek AI — OverChat*\n\n` +
                    '⚡ *Usage:*\n' +
                    '.deepseek <question>\n' +
                    '.deepseek <model> <question>\n' +
                    '.deepseek <model>|<question>\n\n' +
                    '📋 *Available Models:*\n' +
                    `${modelList}\n\n` +
                    '✨ *Examples:*\n' +
                    '.deepseek What is AI?\n' +
                    '.deepseek claude Explain quantum physics\n' +
                    '.deepseek gpt4o|Write a poem\n\n' +
                    `🐋 *Default model:* ${MODELS[DEFAULT_MODEL].name}`,
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
        try { await sock.sendMessage(jid, { react: { text: modelInfo.icon, key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/ai/overchat?apikey=gifted&q=${encodeURIComponent(query)}&model=${model}`,
                { timeout: 90000 }
            );

            // ── Extract response ──
            let reply = '';
            if (typeof data === 'string') reply = data;
            else if (data?.result) reply = typeof data.result === 'string' ? data.result : data.result.reply || data.result.response || data.result.answer || JSON.stringify(data.result);
            else if (data?.reply) reply = data.reply;
            else if (data?.response) reply = data.response;
            else if (data?.answer) reply = data.answer;
            else reply = JSON.stringify(data);

            if (!reply || reply.trim().length < 2) throw new Error('Empty response');

            const caption =
                `${modelInfo.icon} *${modelInfo.name} AI*\n\n` +
                `❓ *Q:* ${query.length > 200 ? query.substring(0, 200) + '...' : query}\n\n` +
                `💬 *A:* ${reply}\n\n` +
                `⚡ _Powered by OverChat_`;

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
            console.error('❌ deepseek error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    `❌ *${modelInfo.name} Unavailable*\n\n` +
                    'The AI service is currently overloaded.\n\n' +
                    '⚡ Try again or use a different model.',
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
