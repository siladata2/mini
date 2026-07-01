
// ./commands/instagram.js

const axios = require('axios');

module.exports = {
    name: 'instagram',
    aliases: ['ig', 'igdl', 'insta', 'instadl'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) {
            return sock.sendMessage(jid, {
                text:
                    '📸 *Instagram Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.instagram <url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.instagram https://www.instagram.com/reel/xxx\n' +
                    '.instagram https://www.instagram.com/p/xxx\n' +
                    '.instagram https://www.instagram.com/stories/xxx\n\n' +
                    '💡 Supports: Reels, Posts, Stories, IGTV',
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

        try { await sock.sendMessage(jid, { react: { text: '📸', key: msg.key } }); } catch (_) {}

        try {
            const encodedUrl = encodeURIComponent(url);

            const { data } = await axios.get(
                `https://sylphyy.xyz/download/instagram?url=${encodedUrl}&api_key=sylphy-qZJV4pp`,
                { timeout: 60000 }
            );

            console.log('📸 IG Response:', JSON.stringify(data).substring(0, 500));

            // ── Extract media ──
            let mediaUrls = [];
            let title = '';
            let author = '';

            // Format 1: data.result (array or object)
            if (data?.result) {
                if (Array.isArray(data.result)) {
                    mediaUrls = data.result
                        .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                        .filter(Boolean);
                } else if (typeof data.result === 'object') {
                    mediaUrls = [data.result.url || data.result.download_url || data.result.link].filter(Boolean);
                    title = data.result.title || data.result.caption || '';
                    author = data.result.author || data.result.username || '';
                } else if (typeof data.result === 'string' && data.result.startsWith('http')) {
                    mediaUrls = [data.result];
                }
            }

            // Format 2: data.data
            if (mediaUrls.length === 0 && data?.data) {
                if (Array.isArray(data.data)) {
                    mediaUrls = data.data
                        .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                        .filter(Boolean);
                }
            }

            // Format 3: data.url / data.media
            if (mediaUrls.length === 0) {
                const singleUrl = data?.url || data?.media || data?.download_url || data?.link;
                if (singleUrl) mediaUrls = [singleUrl];
            }

            // Format 4: data.medias array
            if (mediaUrls.length === 0 && data?.medias && Array.isArray(data.medias)) {
                mediaUrls = data.medias
                    .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                    .filter(Boolean);
            }

            if (mediaUrls.length === 0) {
                throw new Error('No media found');
            }

            // ── Send media ──
            for (let i = 0; i < mediaUrls.length; i++) {
                let sent = false;

                // Try video
                try {
                    await sock.sendMessage(jid, {
                        video: { url: mediaUrls[i] },
                        caption:
                            '📸 *Instagram Download*\n\n' +
                            (author ? `👤 *Author:* ${author}\n` : '') +
                            (title ? `📝 *Caption:* ${title.substring(0, 200)}\n` : '') +
                            `📦 *Media:* ${i + 1}/${mediaUrls.length}\n` +
                            `🔗 ${url}\n\n` +
                            '⚡ _Downloaded by Zenitsu_',
                        contextInfo: {
                            forwardingScore: 350,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363425394543602@newsletter',
                                newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                                serverMessageId: 202,
                            },
                        },
                    }, { quoted: i === 0 ? msg : undefined });
                    sent = true;
                } catch (_) {}

                // Try image
                if (!sent) {
                    try {
                        await sock.sendMessage(jid, {
                            image: { url: mediaUrls[i] },
                            caption:
                                '📸 *Instagram Download*\n\n' +
                                (author ? `👤 *Author:* ${author}\n` : '') +
                                (title ? `📝 *Caption:* ${title.substring(0, 200)}\n` : '') +
                                `📦 *Media:* ${i + 1}/${mediaUrls.length}\n` +
                                `🔗 ${url}\n\n` +
                                '⚡ _Downloaded by Zenitsu_',
                            contextInfo: {
                                forwardingScore: 350,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363425394543602@newsletter',
                                    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                                    serverMessageId: 202,
                                },
                            },
                        }, { quoted: i === 0 ? msg : undefined });
                        sent = true;
                    } catch (_) {}
                }

                // Fallback link
                if (!sent) {
                    await sock.sendMessage(jid, {
                        text:
                            '📸 *Instagram Download*\n\n' +
                            (author ? `👤 *Author:* ${author}\n` : '') +
                            `🔗 *Media Link:* ${mediaUrls[i]}\n\n` +
                            '⚠️ Sent as link.\n\n' +
                            '⚡ _Downloaded by Zenitsu_',
                        contextInfo: {
                            forwardingScore: 350,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363425394543602@newsletter',
                                newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                                serverMessageId: 202,
                            },
                        },
                    }, { quoted: i === 0 ? msg : undefined });
                }

                if (i < mediaUrls.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ instagram error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `${err.message}\n\n` +
                    '⚡ Make sure the URL is public and accessible.',
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
