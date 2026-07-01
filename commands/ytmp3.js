
// ./commands/play.js

const axios = require('axios');
                                                                // ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'ytmp3',
    aliases: ['ytmp3', 'music', 'song', 'youtube'],
    category: 'downloader',
                                                                    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 1) {                            return sock.sendMessage(jid, {
                text:
                    '🎵 *YouTube Music Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.ytmp3 <YouTube URL>\n\n' +
                    '✨ *Examples:*\n' +
                    '.ytmp3 https://youtube.com/watch?v=dQw4w9WgXcQ\n\n',
                contextInfo: {
                    forwardingScore: 350,                                           isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });                                        }

        // ── Reaction ──
        try { await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

        try {
            let youtubeUrl = query;

            // If not a URL, search first
            if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                try {
                    const searchRes = await axios.get(
                        `https://api.giftedtech.co.ke/api/search/youtube?apikey=gifted&query=${encodeURIComponent(query)}`,
                        { timeout: 15000 }
                    );
                                                                                    if (searchRes.data?.results?.length > 0) {
                        youtubeUrl = searchRes.data.results[0].url;
                    }
                } catch (searchErr) {
                    console.log('⚠️ Search failed, trying as direct URL...');
                }                                                           }

            // ── Reaction: downloading ──
            try { await sock.sendMessage(jid, { react: { text: '⬇️', key: msg.key } }); } catch (_) {}

            // ── Download audio ──
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodeURIComponent(youtubeUrl)}`,
                { timeout: 60000 }
            );

            if (!data?.result?.download_url && !data?.url && !data?.link) {
                throw new Error('No download URL in response');
            }
                                                                            const downloadUrl = data.result?.download_url || data.url || data.link;
            const title = data.result?.title || data.title || 'YouTube Audio';
            const duration = data.result?.duration || data.duration || 'Unknown';
                                                                            // ── Download the file ──
            const audioRes = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
            });

            const buffer = Buffer.from(audioRes.data);
            const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            // ── Send as audio ──
            await sock.sendMessage(jid, {
                audio: buffer,                                                  mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${title.substring(0, 100)}.mp3`,
            }, { quoted: msg });

            // ── Send info caption ──
            await sock.sendMessage(jid, {
                text:
                    `🎵 *Now Playing*\n\n` +
                    `📌 *Title:* ${title}\n` +
                    `⏱ *Duration:* ${duration}\n` +                                 `📦 *Size:* ${sizeMB} MB\n` +
                    `🔗 ${youtubeUrl}\n\n` +
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

            // ── Reaction: success ──
            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}                          
        } catch (err) {
            console.error('❌ yt error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `${err.message}\n\n` +
                    '⚡ Try with a different direct YouTube URL.',
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
