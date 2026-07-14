// ./commands/translate.js

const axios = require('axios');

const STYLE = {
    forwardingScore: 350,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363425394543602@newsletter',
        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
        serverMessageId: 202,
    },
};

module.exports = {
    name: 'translate',
    aliases: ['tr', 'traduire', 'trad'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        // .translate fr en Hello world
        // .translate en Hello world (auto-detect → en)
        let from = 'auto';
        let to = 'en';
        let text = '';

        if (args.length >= 3 && args[0].length === 2 && args[1].length === 2) {
            from = args[0];
            to = args[1];
            text = args.slice(2).join(' ');
        } else if (args.length >= 2 && args[0].length === 2) {
            to = args[0];
            text = args.slice(1).join(' ');
        } else {
            text = args.join(' ');
        }

        // Vérifier le message quoté
        if (!text) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                text = quoted.conversation || quoted.extendedTextMessage?.text || '';
            }
        }

        if (!text || text.trim().length < 1) {
            return sock.sendMessage(jid, {
                text:
                    '🌐 *Translator*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.translate <to> <text>\n' +
                    '.translate <from> <to> <text>\n\n' +
                    '✨ *Examples:*\n' +
                    '.translate en Bonjour le monde\n' +
                    '.translate fr en Hello world\n' +
                    '.translate es How are you?\n\n' +
                    '💡 Reply to a message to translate it.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/tools/translate?apikey=gifted&text=${encodeURIComponent(text)}&from=${from}&to=${to}`,
                { timeout: 15000 }
            );

            const translated = data?.result || data?.translated || data?.text || '';

            if (!translated) throw new Error('No translation');

            await sock.sendMessage(jid, {
                text:
                    '🌐 *Translation*\n\n' +
                    `📝 *Original:* ${text.substring(0, 200)}\n` +
                    `🔄 *Translated:* ${translated}\n` +
                    `🌍 ${from} → ${to}\n\n` +
                    '⚡ _Zenitsu_',
                contextInfo: STYLE,
            }, { quoted: msg });

        } catch (err) {
            // Fallback: Google Translate API
            try {
                const { data } = await axios.get(
                    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`,
                    { timeout: 15000 }
                );
                const translated = data?.[0]?.[0]?.[0] || '';
                if (translated) {
                    return sock.sendMessage(jid, {
                        text:
                            '🌐 *Translation*\n\n' +
                            `🔄 *Translated:* ${translated}\n` +
                            `🌍 ${from} → ${to}\n\n` +
                            '⚡ _Google Translate_',
                        contextInfo: STYLE,
                    }, { quoted: msg });
                }
            } catch (_) {}

            await sock.sendMessage(jid, {
                text: '❌ Translation failed.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
