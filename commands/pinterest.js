

const axios = require('axios');

module.exports = {
    name: 'pinterest',
    aliases: ['pinterest', 'pindl', 'pinsearch'],
    category: 'search',

    async execute({ sock, msg, args, jid }) {
        // ── Parse arguments: .pin [count] <query> ──
        let count = 5;
        let queryStart = 0;

        const firstArg = args[0];
        if (firstArg && /^\d+$/.test(firstArg)) {
            count = Math.min(Math.max(parseInt(firstArg), 1), 20);
            queryStart = 1;
        }

        const query = args.slice(queryStart).join(' ');

        // ── No query ──
        if (!query || query.trim().length < 1) {
            return sock.sendMessage(jid, {
                text:
                    '📌 *Pinterest Search & Download*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.pinterest [count] <query>\n\n' +
                    '✨ *Examples:*\n' +
                    '.pinterest Zenitsu pfp\n' +
                    '.pinterest 7 Cute cats\n' +
                    '.pinterest 3 Anime wallpaper\n' +
                    '.pinterest 10 Nature aesthetic\n\n' +
                    '💡 Default: 5 images\n' +
                    '🔢 Max: 15 images',
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
        try { await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

        try {
            // ── Step 1: Search Pinterest ──
            const searchRes = await axios.get(
                `https://sylphyy.xyz/search/pinterest?q=${encodeURIComponent(query)}&api_key=sylphy-qZJV4pp`,
                { timeout: 30000 }
            );

            console.log('📌 Search Response:', JSON.stringify(searchRes.data).substring(0, 500));

            // ── Extract images ──
            let images = [];

            if (searchRes.data?.result && Array.isArray(searchRes.data.result)) {
                images = searchRes.data.result
                    .map(item => ({
                        image: item.image || item.url || item.thumbnail || '',
                        title: item.title || '',
                        pinUrl: item.url || '',
                    }))
                    .filter(item => item.image && item.image.startsWith('http'));
            }

            if (images.length === 0) {
                throw new Error('No images found');
            }

            // ── Shuffle and limit ──
            const shuffled = images.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(count, shuffled.length));

            console.log(`📌 Sending ${selected.length} images...`);

            // ── Reaction: downloading ──
            try { await sock.sendMessage(jid, { react: { text: '⬇️', key: msg.key } }); } catch (_) {}

            // ── Step 2: Send each image directly ──
            let sent = 0;
            let failed = 0;

            for (let i = 0; i < selected.length; i++) {
                const item = selected[i];

                try {
                    // Send image directly from the search result URL
                    try {
                        await sock.sendMessage(jid, {
                            image: { url: item.image },
                            caption:
                                `📌 *Pinterest — ${i + 1}/${selected.length}*\n` +
                                `🔍 *Query:* ${query}\n` +
                                (item.title ? `📝 *Title:* ${item.title}\n` : '') +
                                (item.pinUrl ? `🔗 ${item.pinUrl}\n` : '') +
                                '\n⚡ _Downloaded by Zenitsu_',
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
                        sent++;
                    } catch (sendErr) {
                        // Fallback: try to download and send as buffer
                        console.log(`⚠️ Direct send failed for image ${i + 1}, trying download...`);

                        try {
                            const imgRes = await axios.get(item.image, {
                                responseType: 'arraybuffer',
                                timeout: 30000,
                            });
                            const buffer = Buffer.from(imgRes.data);

                            await sock.sendMessage(jid, {
                                image: buffer,
                                caption:
                                    `📌 *Pinterest — ${i + 1}/${selected.length}*\n` +
                                    `🔍 *Query:* ${query}\n` +
                                    (item.title ? `📝 *Title:* ${item.title}\n` : '') +
                                    '\n⚡ _Downloaded by Zenitsu_',
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
                            sent++;
                        } catch (dlErr) {
                            // Last fallback: send link
                            await sock.sendMessage(jid, {
                                text:
                                    `📌 *Pinterest Link — ${i + 1}*\n` +
                                    (item.title ? `📝 *Title:* ${item.title}\n` : '') +
                                    `🔗 ${item.image}\n\n` +
                                    '⚠️ Sent as link.',
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
                            sent++;
                        }
                    }

                } catch (err) {
                    console.log(`⚠️ Image ${i + 1} completely failed:`, err.message);
                    failed++;
                }

                // Delay between images
                if (i < selected.length - 1) {
                    await new Promise(r => setTimeout(r, 1200));
                }
            }

            // ── Summary ──
            if (sent > 0) {
                let summaryText =
                    `📌 *Pinterest Complete*\n\n` +
                    `🔍 *Query:* ${query}\n` +
                    `✅ *Sent:* ${sent} image(s)\n`;

                if (failed > 0) {
                    summaryText += `❌ *Failed:* ${failed}\n`;
                }

                summaryText += '\n⚡ _Powered by Zenitsu_';

                await sock.sendMessage(jid, {
                    text: summaryText,
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

            try { await sock.sendMessage(jid, { react: { text: sent > 0 ? '✅' : '❌', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ pin error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Pinterest Search Failed*\n\n' +
                    `${err.message}\n\n` +
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
