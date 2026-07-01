// ./commands/zenitsu.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// LOAD CUSTOM PROMPT
// ═══════════════════════════════════════

const PROMPT_FILE = path.join(__dirname, 'zenitsu.json');

function loadPrompt() {
    try {
        if (fs.existsSync(PROMPT_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf8'));
            return data.prompt || '';
        }
        return '';
    } catch (err) {
        console.error('❌ Error loading zenitsu.json:', err.message);
        return '';
    }
}

function reloadPrompt() {
    try {
        if (fs.existsSync(PROMPT_FILE)) {
            delete require.cache[require.resolve(PROMPT_FILE)];
            const data = require(PROMPT_FILE);
            return data.prompt || '';
        }
        return '';
    } catch (err) {
        return '';
    }
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'zenitsu',
    aliases: ['zen', 'customai', 'myai'],
    category: 'ai',

    async execute({ sock, msg, args, jid }) {
        const input = args.join(' ');

        // ── Handle subcommands ──
        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'setprompt' || subCommand === 'set') {
            const newPrompt = args.slice(1).join(' ');
            if (!newPrompt || newPrompt.trim().length < 5) {
                return sock.sendMessage(jid, {
                    text:
                        '⚡ *Set Custom Prompt*\n\n' +
                        '📌 *Usage:*\n' +
                        '.zenitsu setprompt <your prompt>\n\n' +
                        '✨ *Example:*\n' +
                        '.zenitsu setprompt You are a helpful assistant named Zenitsu. You speak politely and use emojis.\n\n' +
                        '💡 The prompt defines how the AI behaves.',
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

            // Save prompt
            const promptData = { prompt: newPrompt, updatedAt: new Date().toISOString() };
            fs.writeFileSync(PROMPT_FILE, JSON.stringify(promptData, null, 2));

            return sock.sendMessage(jid, {
                text:
                    '✅ *Prompt Updated!*\n\n' +
                    `📝 *New Prompt:*\n${newPrompt.substring(0, 300)}${newPrompt.length > 300 ? '...' : ''}\n\n` +
                    '⚡ The AI will now use this personality.',
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

        if (subCommand === 'getprompt' || subCommand === 'show') {
            const currentPrompt = loadPrompt();

            return sock.sendMessage(jid, {
                text:
                    '📋 *Current Prompt*\n\n' +
                    `${currentPrompt || '⚠️ No prompt set. Using default AI.'}\n\n` +
                    '⚡ Use .zenitsu setprompt <text> to customize.',
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

        if (subCommand === 'reset') {
            fs.writeFileSync(PROMPT_FILE, JSON.stringify({ prompt: '', resetAt: new Date().toISOString() }, null, 2));

            return sock.sendMessage(jid, {
                text:
                    '🔄 *Prompt Reset*\n\n' +
                    'The custom prompt has been cleared.\n' +
                    'The AI will now use its default personality.\n\n' +
                    '⚡ Use .zenitsu setprompt <text> to set a new one.',
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

        // ── Normal query ──
        const query = input;

        if (!query || query.trim().length < 2) {
            const currentPrompt = loadPrompt();

            return sock.sendMessage(jid, {
                text:
                    '⚡ *Zenitsu AI — Custom Assistant*\n\n' +
                    '📌 *Usage:*\n' +
                    '.zenitsu <question>\n' +
                    '.zenitsu setprompt <prompt>\n' +
                    '.zenitsu getprompt\n' +
                    '.zenitsu reset\n\n' +
                    '✨ *Examples:*\n' +
                    '.zenitsu What is JavaScript?\n' +
                    '.zenitsu Write a poem\n',
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
        try { await sock.sendMessage(jid, { react: { text: '⚡', key: msg.key } }); } catch (_) {}

        try {
            const customPrompt = reloadPrompt();
            let apiUrl = `https://api.giftedtech.co.ke/api/ai/custom?apikey=gifted&q=${encodeURIComponent(query)}`;

            if (customPrompt) {
                apiUrl += `&prompt=${encodeURIComponent(customPrompt)}`;
            }

            const { data } = await axios.get(apiUrl, { timeout: 60000 });

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
                '⚡ *Zenitsu AI*\n\n' +
                `❓ *Q:* ${query.length > 200 ? query.substring(0, 200) + '...' : query}\n\n` +
                `💬 *A:* ${reply}\n\n` +
                (customPrompt ? '򨰵 *Enjoy*\n' : '') +
                '⚡ _Powered by Zenitsu_';

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
            console.error('❌ zenitsu error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Zenitsu AI Unavailable*\n\n' +
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
