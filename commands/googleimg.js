// ./commands/googleimage.js

const axios = require('axios');

module.exports = {
    name: 'googleimage',
    aliases: ['gimage', 'imgsearch', 'searchimage', 'gi'],
    category: 'search',

    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🖼️ *Google Image Search*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.googleimage <query>\n\n' +
                    '✨ *Examples:*\n' +
                    '.googleimage Cute cats\n' +
                    '.googleimage Sunset over mountains\n' +
                    '.googleimage Cyberpunk city\n\n' +
                    '💡 Returns up to 5 images from Google.',
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
        try { await sock.sendMessage(jid, { react: { text: '🖼️', key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/search/googleimage?apikey=gifted&query=${encodeURIComponent(query)}`,
                { timeout: 30000 }
            );

            // ── Extract images ──
            let images = [];

            if (data?.result && Array.isArray(data.result)) {
                images = data.result;
            } else if (data?.results && Array.isArray(data.results)) {
                images = data.results;
            } else if (data?.images && Array.isArray(data.images)) {
                images = data.images;
            } else if (Array.isArray(data)) {
                images = data;
            }

            // Filter valid URLs
            images = images
                .map(img => typeof img === 'string' ? img : img.url || img.link || img.src || img.image || '')
                .filter(url => url && url.startsWith('http'))
                .slice(0, 5);

            if (images.length === 0) {
                throw new Error('No images found');
            }

            // ── Send images one by one ──
            for (let i = 0; i < images.length; i++) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: images[i] },
                        caption:
                            `🖼️ *Image ${i + 1}/${images.length}*\n` +
                            `🔍 Search: ${query}\n` +
                            `🔗 ${images[i]}\n\n` +
                            '⚡ _Google Image Search_',
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

                    // Small delay between images
                    await new Promise(r => setTimeout(r, 1000));
                } catch (imgErr) {
                    console.log(`⚠️ Image ${i + 1} send failed:`, imgErr.message);

                    // Send as link fallback
                    await sock.sendMessage(jid, {
                        text:
                            `🖼️ *Image ${i + 1}*\n` +
                            `🔗 ${images[i]}`,
                        contextInfo: {
                            forwardingScore: 350,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363425394543602@newsletter',
                                newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                                serverMessageId: 202,
                            },
                        },
                    });
                }
            }

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ googleimage error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Image Search Failed*\n\n' +
                    'No images found or service unavailable.\n\n' +
                    '⚡ Try a different search term.',
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
