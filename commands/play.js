
// ./commands/play.js

const axios = require('axios');

// ═══════════════════════════════════════
// QUALITIES
// ═══════════════════════════════════════

const QUALITIES = ['128kbps', '192kbps', '256kbps', '320kbps'];
const DEFAULT_QUALITY = '128kbps';

// ═══════════════════════════════════════
// STORE ACTIVE SEARCHES
// ═══════════════════════════════════════

const activeSearches = new Map();

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'play',
    aliases: ['ytmp3', 'music', 'song', 'youtube', 'yts'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const input = args.join(' ');

        // ═══════════════════════════════════════
        // NO INPUT → HELP
        // ═══════════════════════════════════════

        if (!input || input.trim().length < 1) {
            return sock.sendMessage(jid, {
                text:
                    '🎵 *YouTube Music Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.play <song name>\n' +
                    '.play <quality> <song name>\n' +
                    '.play <number> (to download from search)\n\n' +
                    '🎼 *Qualities:*\n' +
                    '  128kbps | 192kbps | 256kbps | 320kbps\n' +
                    `  Default: ${DEFAULT_QUALITY}\n\n` +
                    '✨ *Examples:*\n' +
                    '.play Spectre\n' +
                    '.play 320kbps Spectre\n' +
                    '.play 1 (after search)\n\n' +
                    '💡 Search first, then reply with the number to download.',
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

        // ═══════════════════════════════════════
        // NUMBER INPUT → DOWNLOAD FROM STORED SEARCH
        // ═══════════════════════════════════════

        const numberMatch = input.match(/^(\d+)$/);

        if (numberMatch) {
            const selectedIndex = parseInt(numberMatch[1]) - 1;
            const stored = activeSearches.get(senderJid);

            if (!stored || !stored.results || stored.results.length === 0) {
                return sock.sendMessage(jid, {
                    text: '⚠️ *No active search*\n\nUse .play <song name> first.',
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

            if (selectedIndex < 0 || selectedIndex >= stored.results.length) {
                return sock.sendMessage(jid, {
                    text: `⚠️ *Invalid number*\n\nChoose between 1 and ${stored.results.length}.`,
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

            const selected = stored.results[selectedIndex];
            const quality = stored.quality || DEFAULT_QUALITY;

            try { await sock.sendMessage(jid, { react: { text: '⬇️', key: msg.key } }); } catch (_) {}

            return downloadMusic(sock, msg, jid, selected.url, selected.title, selected.duration, quality);
        }

        // ═══════════════════════════════════════
        // TEXT INPUT → SEARCH
        // ═══════════════════════════════════════

        // Extract quality if present
        let quality = DEFAULT_QUALITY;
        let searchQuery = input;
        const argsLower = args.map(a => a.toLowerCase());

        for (const q of QUALITIES) {
            const index = argsLower.indexOf(q);
            if (index >= 0) {
                quality = q;
                searchQuery = args.filter((_, i) => i !== index).join(' ');
                break;
            }
        }

        try { await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/search/yts?apikey=gifted&query=${encodeURIComponent(searchQuery)}`,
                { timeout: 30000 }
            );

            // ── Extract results ──
            let results = [];

            if (data?.result && Array.isArray(data.result)) {
                results = data.result;
            } else if (data?.results && Array.isArray(data.results)) {
                results = data.results;
            } else if (Array.isArray(data)) {
                results = data;
            }

            if (results.length === 0) {
                throw new Error('No results found');
            }

            // ── Clean results ──
            const maxResults = Math.min(results.length, 5);
            const cleanedResults = results.slice(0, maxResults).map(item => ({
                title: item.title || item.name || 'Unknown',
                url: item.url || item.link || item.id || '',
                duration: item.duration || item.timestamp || 'Unknown',
                views: item.views || item.view_count || '',
            }));

            // ── Store ──
            activeSearches.set(senderJid, {
                results: cleanedResults,
                quality: quality,
                timestamp: Date.now(),
            });

            // ── Build response ──
            let replyText = `🎵 *Search Results: ${searchQuery}*\n`;
            replyText += `🎼 *Quality:* ${quality}\n\n`;

            cleanedResults.forEach((item, i) => {
                replyText += `*${i + 1}.* ${item.title}\n`;
                replyText += `   ⏱ ${item.duration}`;
                if (item.views) replyText += ` | 👁 ${item.views}`;
                replyText += '\n\n';
            });

            replyText +=
                `📌 *Reply:* .play <number>\n` +
                `⚡ _Example: .play 1_\n\n` +
                '⏳ Results expire in 5 minutes.';

            await sock.sendMessage(jid, {
                text: replyText,
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

            // Auto-clean
            setTimeout(() => {
                const stored = activeSearches.get(senderJid);
                if (stored && Date.now() - stored.timestamp > 300000) {
                    activeSearches.delete(senderJid);
                }
            }, 300000);

        } catch (err) {
            console.error('❌ play search error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Search Failed*\n\n' +
                    'No results found. Try a different song name.\n\n' +
                    '⚡ _Example: .play Spectre_',
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

// ═══════════════════════════════════════
// DOWNLOAD MUSIC
// ═══════════════════════════════════════

async function downloadMusic(sock, msg, jid, videoUrl, title, duration, quality) {
    try {
        const encodedUrl = encodeURIComponent(videoUrl);

        const { data } = await axios.get(
            `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodedUrl}&quality=${quality}`,
            { timeout: 60000 }
        );

        let downloadUrl = null;

        if (data?.result?.download_url) {
            downloadUrl = data.result.download_url;
        } else if (data?.result?.url) {
            downloadUrl = data.result.url;
        } else if (data?.url) {
            downloadUrl = data.url;
        } else if (data?.link) {
            downloadUrl = data.link;
        } else if (data?.download_url) {
            downloadUrl = data.download_url;
        } else if (typeof data === 'string' && data.startsWith('http')) {
            downloadUrl = data;
        }

        if (!downloadUrl) throw new Error('No download URL');

        // Download audio
        const audioRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
        });

        const buffer = Buffer.from(audioRes.data);
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        // Send as audio
        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title.substring(0, 100)}.mp3`,
        }, { quoted: msg });

        // Send info
        await sock.sendMessage(jid, {
            text:
                '🎵 *Music Downloaded*\n\n' +
                `📌 *Title:* ${title}\n` +
                `⏱ *Duration:* ${duration}\n` +
                `🎼 *Quality:* ${quality}\n` +
                `📦 *Size:* ${sizeMB} MB\n` +
                `🔗 ${videoUrl}\n\n` +
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

        try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (err) {
        console.error('❌ play download error:', err.message);
        try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

        await sock.sendMessage(jid, {
            text:
                '❌ *Download Failed*\n\n' +
                `${err.message}\n\n` +
                '⚡ Try another result or a different quality.',
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
}
