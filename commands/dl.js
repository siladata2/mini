// ./commands/download.js

const axios = require('axios');

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'dl',
    aliases: ['dl', 'aio', 'downloader'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || !url.startsWith('http')) {
            return sock.sendMessage(jid, {
                text:
                    '📥 *All-in-One Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.download <url>\n\n' +
                    '✨ *Supported Platforms:*\n' +
                    '  ▸ YouTube (videos/shorts)\n' +
                    '  ▸ TikTok (videos)\n' +
                    '  ▸ Instagram (reels/posts)\n' +
                    '  ▸ Facebook (videos/reels)\n' +
                    '  ▸ Twitter/X (videos)\n' +
                    '  ▸ CapCut (templates)\n' +
                    '  ▸ Likee (videos)\n' +
                    '  ▸ Snapchat (spotlight)\n' +
                    '  ▸ Reddit (videos)\n' +
                    '  ▸ Threads (posts)\n' +
                    '  ▸ Pinterest (images/videos)\n' +
                    '  ▸ Vimeo (videos)\n' +
                    '  ▸ Dailymotion (videos)\n\n' +
                    '💡 *Example:*\n' +
                    '.download https://www.youtube.com/watch?v=dQw4w9WgXcQ',
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

        try { await sock.sendMessage(jid, { react: { text: '📥', key: msg.key } }); } catch (_) {}

        try {
            const encodedUrl = encodeURIComponent(url);

            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/download/aio?apikey=gifted&url=${encodedUrl}`,
                { timeout: 60000 }
            );

            // ── Extract info ──
            const title = data?.title || data?.result?.title || '';
            const platform = data?.platform || data?.result?.platform || '';
            let mediaUrls = [];

            // Multiple possible response formats
            if (data?.result?.medias && Array.isArray(data.result.medias)) {
                mediaUrls = data.result.medias.map(m => typeof m === 'string' ? m : m.url || m.link).filter(Boolean);
            } else if (data?.result?.url) {
                mediaUrls = [data.result.url];
            } else if (data?.medias && Array.isArray(data.medias)) {
                mediaUrls = data.medias.map(m => typeof m === 'string' ? m : m.url || m.link).filter(Boolean);
            } else if (data?.url) {
                mediaUrls = [data.url];
            } else if (data?.link) {
                mediaUrls = [data.link];
            } else if (data?.download_url) {
                mediaUrls = [data.download_url];
            } else if (typeof data === 'string' && data.startsWith('http')) {
                mediaUrls = [data];
            }

            if (mediaUrls.length === 0) {
                throw new Error('No media found');
            }

            // ── Detect media type ──
            const videoUrl = mediaUrls.find(u => u.includes('video') || u.endsWith('.mp4') || u.includes('youtu'));
            const imageUrl = mediaUrls.find(u => !u.includes('video') && !u.endsWith('.mp4') && (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp')));
            const audioUrl = mediaUrls.find(u => u.endsWith('.mp3') || u.endsWith('.m4a') || u.includes('audio'));

            let sent = false;

            // Try video
            if (!sent && videoUrl) {
                try {
                    await sock.sendMessage(jid, {
                        video: { url: videoUrl },
                        caption:
                            '📥 *Download Complete*\n\n' +
                            (title ? `📌 *Title:* ${title}\n` : '') +
                            (platform ? `📱 *Platform:* ${platform}\n` : '') +
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
                    }, { quoted: msg });
                    sent = true;
                } catch (vidErr) {
                    console.log('⚠️ Video send failed:', vidErr.message);
                }
            }

            // Try image
            if (!sent && imageUrl) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: imageUrl },
                        caption:
                            '📥 *Download Complete*\n\n' +
                            (title ? `📌 *Title:* ${title}\n` : '') +
                            (platform ? `📱 *Platform:* ${platform}\n` : '') +
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
                    }, { quoted: msg });
                    sent = true;
                } catch (imgErr) {
                    console.log('⚠️ Image send failed:', imgErr.message);
                }
            }

            // Try audio
            if (!sent && audioUrl) {
                try {
                    await sock.sendMessage(jid, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mpeg',
                        ptt: false,
                    }, { quoted: msg });
                    sent = true;

                    // Send caption
                    await sock.sendMessage(jid, {
                        text:
                            '📥 *Download Complete*\n\n' +
                            (title ? `📌 *Title:* ${title}\n` : '') +
                            (platform ? `📱 *Platform:* ${platform}\n` : '') +
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
                    }, { quoted: msg });
                } catch (audErr) {
                    console.log('⚠️ Audio send failed:', audErr.message);
                }
            }

            // Fallback: send all links
            if (!sent) {
                const links = mediaUrls.slice(0, 5).map((u, i) => `*${i + 1}.* ${u}`).join('\n');

                await sock.sendMessage(jid, {
                    text:
                        '📥 *Download Links*\n\n' +
                        (title ? `📌 *Title:* ${title}\n` : '') +
                        (platform ? `📱 *Platform:* ${platform}\n` : '') +
                        `📦 *Links:*\n${links}\n\n` +
                        `🔗 *Source:* ${url}\n\n` +
                        '⚠️ Media sent as links.\n' +
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
                }, { quoted: msg });
                sent = true;
            }

            if (sent) {
                try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
            }

        } catch (err) {
            console.error('❌ download error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `${err.message}\n\n` +
                    '⚡ Make sure the URL is valid and public.',
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
