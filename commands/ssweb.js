// ./commands/ssweb.js

const axios = require('axios');

// ═══════════════════════════════════════
// STYLE
// ═══════════════════════════════════════

const STYLE = {
    forwardingScore: 350,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363425394543602@newsletter',
        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
        serverMessageId: 202,
    },
};

// ═══════════════════════════════════════
// SCREENSHOT METHODS (ordered)
// ═══════════════════════════════════════

const SCREENSHOT_METHODS = [
    {
        name: 'GiftedTech (direct image)',
        fn: async (url) => {
            const encoded = encodeURIComponent(url);
            const response = await axios.get(
                `https://api.giftedtech.co.ke/api/tools/ssphone?apikey=gifted&url=${encoded}`,
                { responseType: 'arraybuffer', timeout: 45000 }
            );
            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || '';

            // Si c'est une image directement
            if (contentType.includes('image') || buffer[0] === 0xFF || buffer[0] === 0x89) {
                return { buffer, type: 'buffer' };
            }

            // Sinon essayer de parser en JSON
            const text = buffer.toString('utf-8');
            try {
                const json = JSON.parse(text);
                const imgUrl = json?.result?.screenshot?.url
                    || json?.result?.file_url
                    || json?.result?.url
                    || json?.url;
                if (imgUrl) return { url: imgUrl, type: 'url' };
            } catch (_) {}

            throw new Error('No image');
        },
    },
    {
        name: 'NexRay (JSON with screenshot)',
        fn: async (url) => {
            const encoded = encodeURIComponent(url);
            const { data } = await axios.get(
                `https://api.nexray.eu.cc/tools/ssweb?url=${encoded}&width=1080&height=1920&device_scale=2`,
                { timeout: 45000 }
            );

            // Extraire l'URL du screenshot depuis la réponse JSON
            const imgUrl = data?.result?.screenshot?.url
                || data?.result?.file_url
                || data?.result?.url
                || data?.url;

            if (imgUrl) return { url: imgUrl, type: 'url' };
            throw new Error('No URL in response');
        },
    },
    {
        name: 'PopCat (direct image)',
        fn: async (url) => {
            const encoded = encodeURIComponent(url);
            const response = await axios.get(
                `https://api.popcat.xyz/v2/screenshot?url=${encoded}`,
                { responseType: 'arraybuffer', timeout: 45000 }
            );
            const buffer = Buffer.from(response.data);
            if (buffer.length > 1000) return { buffer, type: 'buffer' };
            throw new Error('Empty image');
        },
    },
    {
        name: 'DavidCyril (direct image)',
        fn: async (url) => {
            const encoded = encodeURIComponent(url);
            const response = await axios.get(
                `https://apis.davidcyriltech.my.id/ssweb?url=${encoded}`,
                { responseType: 'arraybuffer', timeout: 45000 }
            );
            const buffer = Buffer.from(response.data);
            if (buffer.length > 1000) return { buffer, type: 'buffer' };

            // Essayer de parser en JSON
            const text = buffer.toString('utf-8');
            try {
                const json = JSON.parse(text);
                const imgUrl = json?.url || json?.result?.url || json?.image_url;
                if (imgUrl) return { url: imgUrl, type: 'url' };
            } catch (_) {}

            throw new Error('Empty image');
        },
    },
    {
        name: 'YanzBotz',
        fn: async (url) => {
            const encoded = encodeURIComponent(url);
            const { data } = await axios.get(
                `https://api.yanzbotz.my.id/api/tools/ssweb?url=${encoded}`,
                { timeout: 45000 }
            );
            const imgUrl = data?.result?.url || data?.url || data?.image_url;
            if (imgUrl) return { url: imgUrl, type: 'url' };
            throw new Error('No URL');
        },
    },
];

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'ssweb',
    aliases: ['ss', 'screenshot', 'ssmobile', 'webss'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        let url = args[0];

        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return sock.sendMessage(jid, {
                text:
                    '📸 *Website Screenshot*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.ssweb <url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.ssweb https://google.com\n' +
                    '.ssweb https://github.com\n' +
                    '.ssweb https://api.gifted.co.ke\n\n' +
                    '📱 Mobile view 1080×1920\n' +
                    '🔄 5 fallback sources',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Ajouter https:// si nécessaire
        if (!url.match(/^https?:\/\//)) url = 'https://' + url;

        // Reaction
        try { await sock.sendMessage(jid, { react: { text: '📸', key: msg.key } }); } catch (_) {}

        // Essayer toutes les méthodes
        let result = null;
        let usedMethod = '';

        for (const method of SCREENSHOT_METHODS) {
            try {
                console.log(`📸 Trying ${method.name}...`);
                result = await method.fn(url);
                if (result) {
                    usedMethod = method.name;
                    console.log(`✅ Success with ${method.name}`);
                    break;
                }
            } catch (err) {
                console.log(`⚠️ ${method.name} failed: ${err.message}`);
            }
        }

        if (!result) {
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            return sock.sendMessage(jid, {
                text:
                    '❌ *Screenshot Failed*\n\n' +
                    'All sources are unavailable.\n\n' +
                    '⚡ The website may be blocking screenshots.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Envoyer l'image
        let sent = false;
        const caption =
            '📸 *Website Screenshot*\n\n' +
            `🔗 ${url}\n` +
            `🔧 ${usedMethod}\n` +
            '📱 1080×1920\n\n' +
            '⚡ _Captured by Zenitsu_';

        if (result.type === 'buffer' && result.buffer) {
            try {
                await sock.sendMessage(jid, {
                    image: result.buffer,
                    caption: caption,
                    contextInfo: STYLE,
                }, { quoted: msg });
                sent = true;
            } catch (e1) {
                console.log('⚠️ Buffer send failed:', e1.message);
            }
        }

        if (!sent && result.url) {
            try {
                await sock.sendMessage(jid, {
                    image: { url: result.url },
                    caption: caption,
                    contextInfo: STYLE,
                }, { quoted: msg });
                sent = true;
            } catch (e2) {
                console.log('⚠️ URL send failed:', e2.message);
            }
        }

        if (!sent) {
            await sock.sendMessage(jid, {
                text:
                    '📸 *Website Screenshot*\n\n' +
                    `🔗 ${url}\n` +
                    `🔧 ${usedMethod}\n` +
                    `🖼️ ${result.url || 'Image ready'}\n\n` +
                    '⚠️ Sent as link.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
    },
};
