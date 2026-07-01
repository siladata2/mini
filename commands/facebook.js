
// ./commands/facebook.js

const axios = require('axios');

module.exports = {
    name: 'facebook',
    aliases: ['fb', 'fbdl', 'facebookdl', 'fbreel'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com'))) {
            return sock.sendMessage(jid, {
                text:
                    '📘 *Facebook Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.facebook <facebook_url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.facebook https://www.facebook.com/reel/123456789\n' +
                    '.facebook https://fb.watch/abc123\n\n' +
                    '💡 Supports: Reels, Videos, Stories',
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

        try { await sock.sendMessage(jid, { react: { text: '📘', key: msg.key } }); } catch (_) {}

        try {
            const encodedUrl = encodeURIComponent(url);

            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/download/facebookv3?apikey=gifted&url=${encodedUrl}`,
                { timeout: 60000 }
            );

            // Extract media URLs
            let mediaUrls = [];
            let title = '';

            if (data?.result?.medias && Array.isArray(data.result.medias)) {
                mediaUrls = data.result.medias.map(m => m.url || m).filter(Boolean);
                title = data.result.title || '';
            } else if (data?.result?.url) {
                mediaUrls = [data.result.url];
                title = data.result.title || '';
            } else if (data?.url) {
                mediaUrls = [data.url];
            } else if (data?.links && Array.isArray(data.links)) {
                mediaUrls = data.links;
            } else if (Array.isArray(data)) {
                mediaUrls = data;
            } else if (typeof data === 'string' && data.startsWith('http')) {
                mediaUrls = [data];
            }

            // Try to find video first, then image
            const videoUrl = mediaUrls.find(u => u.includes('video') || u.endsWith('.mp4'));
            const imageUrl = mediaUrls.find(u => !u.includes('video') && !u.endsWith('.mp4'));

            if (!videoUrl && !imageUrl) {
                throw new Error('No media found');
            }

            let sent = false;

            // Try sending video first
            if (videoUrl) {
                try {
                    await sock.sendMessage(jid, {
                        video: { url: videoUrl },
                        caption:
                            `📘 *Facebook Download*\n\n` +
                            (title ? `📌 *Title:* ${title}\n` : '') +
                            `🔗 ${url}\n\n` +
                            `⚡ _Downloaded by Zenitsu_`,
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
                    sent = true;
                } catch (videoErr) {
                    console.log('⚠️ Video send failed, trying fallback...');
                }
            }

            // Try sending image
            if (!sent && imageUrl) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: imageUrl },
                        caption:
                            `📘 *Facebook Download*\n\n` +
                            (title ? `📌 *Title:* ${title}\n` : '') +
                            `🔗 ${url}\n\n` +
                            `⚡ _Downloaded by Zenitsu_`,
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
                    sent = true;
                } catch (imgErr) {
                    console.log('⚠️ Image send failed, trying fallback...');
                }
            }

            // Fallback: send link
            if (!sent) {
                const allLinks = mediaUrls.slice(0, 3).map((u, i) => `*${i + 1}.* ${u}`).join('\n');

                await sock.sendMessage(jid, {
                    text:
                        `📘 *Facebook Download*\n\n` +
                        (title ? `📌 *Title:* ${title}\n` : '') +
                        `📦 *Media Links:*\n${allLinks}\n\n` +
                        `🔗 *Source:* ${url}\n\n` +
                        `⚠️ Media could not be sent directly.\n` +
                        `⚡ _Downloaded by Zenitsu_`,
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
                sent = true;
            }

            if (sent) {
                try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
            }

        } catch (err) {
            console.error('❌ facebook error:', err.message);
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
