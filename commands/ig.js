
// ./commands/ig.js

const axios = require('axios');

module.exports = {
    name: 'ig',
    aliases: ['igdl', 'insta', 'instadl', 'instagramdl'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) {
            return sock.sendMessage(jid, {
                text:
                    '📸 *Instagram Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.ig <instagram_url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.ig https://www.instagram.com/reel/DaJhWSbJmsm\n' +
                    '.ig https://www.instagram.com/p/xxxxx\n' +
                    '.ig https://www.instagram.com/stories/xxxxx\n\n' +
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
            let author = '';
            let caption = '';

            // Format: data.result (array or object)
            if (data?.result) {
                if (Array.isArray(data.result)) {
                    mediaUrls = data.result
                        .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                        .filter(Boolean);
                } else if (typeof data.result === 'object') {
                    const r = data.result;
                    mediaUrls = [r.url || r.download_url || r.link || r.video_url || r.image_url].filter(Boolean);
                    author = r.author || r.username || r.owner || '';
                    caption = r.caption || r.title || r.description || '';
                } else if (typeof data.result === 'string' && data.result.startsWith('http')) {
                    mediaUrls = [data.result];
                }
            }

            // Format: data.data
            if (mediaUrls.length === 0 && data?.data) {
                if (Array.isArray(data.data)) {
                    mediaUrls = data.data
                        .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                        .filter(Boolean);
                }
            }

            // Format: data.medias array
            if (mediaUrls.length === 0 && data?.medias && Array.isArray(data.medias)) {
                mediaUrls = data.medias
                    .map(m => m.url || m.download_url || m.link || (typeof m === 'string' ? m : null))
                    .filter(Boolean);
            }

            // Format: single URL
            if (mediaUrls.length === 0) {
                const singleUrl = data?.url || data?.media || data?.download_url || data?.link || data?.video_url || data?.image_url;
                if (singleUrl) mediaUrls = [singleUrl];
            }

            if (mediaUrls.length === 0) {
                throw new Error('No media found. The post may be private or unavailable.');
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
                            (caption ? `📝 *Caption:* ${caption.substring(0, 200)}\n` : '') +
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
                                (caption ? `📝 *Caption:* ${caption.substring(0, 200)}\n` : '') +
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
                            `🔗 *Media Link:* ${mediaUrls[i]}\n` +
                            `🔗 *Source:* ${url}\n\n` +
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
            console.error('❌ ig error:', err.message);
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
