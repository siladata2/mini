// ./commands/tiksearch.js

const axios = require('axios');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const DEFAULT_COUNT = 6; // 3 vidéos + 3 photos
const MAX_COUNT = 10;     // 5 vidéos + 5 photos
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10 MB

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
// SEARCH APIS (ordered)
// ═══════════════════════════════════════

const SEARCH_APIS = [
    {
        name: 'GiftedTech',
        url: (query) => `https://api.giftedtech.co.ke/api/search/tiktoksearch?apikey=gifted&query=${encodeURIComponent(query)}`,
        timeout: 15000,
        extract: (data) => {
            let results = [];
            if (data?.result && Array.isArray(data.result)) results = data.result;
            else if (data?.data && Array.isArray(data.data)) results = data.data;
            else if (Array.isArray(data)) results = data;
            return results.map(item => ({
                url: item.url || item.link || item.video_url || item.photo_url || '',
                title: item.title || item.description || '',
                type: item.type || (item.video_url ? 'video' : 'photo'),
            }));
        },
    },
    {
        name: 'NexRay TikTok',
        url: (query) => `https://api.nexray.eu.cc/search/tiktok?q=${encodeURIComponent(query)}`,
        timeout: 15000,
        extract: (data) => {
            let results = [];
            if (data?.result && Array.isArray(data.result)) results = data.result;
            else if (data?.data && Array.isArray(data.data)) results = data.data;
            else if (Array.isArray(data)) results = data;
            return results.map(item => ({
                url: item.url || item.link || item.video_url || '',
                title: item.title || item.description || '',
                type: 'video',
            }));
        },
    },
    {
        name: 'NexRay TikTok Photo',
        url: (query) => `https://api.nexray.eu.cc/search/tiktokphoto?q=${encodeURIComponent(query)}`,
        timeout: 15000,
        extract: (data) => {
            let results = [];
            if (data?.result && Array.isArray(data.result)) results = data.result;
            else if (data?.data && Array.isArray(data.data)) results = data.data;
            else if (Array.isArray(data)) results = data;
            return results.map(item => ({
                url: item.url || item.link || item.photo_url || '',
                title: item.title || item.description || '',
                type: 'photo',
            }));
        },
    },
    {
        name: 'YanzBotz',
        url: (query) => `https://api.yanzbotz.my.id/api/search/tiktok?query=${encodeURIComponent(query)}`,
        timeout: 15000,
        extract: (data) => {
            let results = [];
            if (data?.result && Array.isArray(data.result)) results = data.result;
            else if (data?.data && Array.isArray(data.data)) results = data.data;
            else if (Array.isArray(data)) results = data;
            return results.map(item => ({
                url: item.url || item.link || '',
                title: item.title || item.description || '',
                type: item.type || 'video',
            }));
        },
    },
];

// ═══════════════════════════════════════
// DOWNLOAD APIS (ordered)
// ═══════════════════════════════════════

function getDownloadMethods(tiktokUrl) {
    const encoded = encodeURIComponent(tiktokUrl);
    return [
        {
            name: 'PrinceTech',
            fn: async () => {
                const { data } = await axios.get(
                    `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'NexRay',
            fn: async () => {
                const { data } = await axios.get(
                    `https://api.nexray.eu.cc/downloader/tiktok?url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'DavidCyril v4',
            fn: async () => {
                const { data } = await axios.get(
                    `https://apis.davidcyriltech.my.id/tiktokv4?url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'DavidCyril Rapid',
            fn: async () => {
                const { data } = await axios.get(
                    `https://apis.davidcyriltech.my.id/tiktokdl?url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'GiftedTech',
            fn: async () => {
                const { data } = await axios.get(
                    `https://api.giftedtech.co.ke/api/download/tiktokdl?apikey=gifted&url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'YanzBotz',
            fn: async () => {
                const { data } = await axios.get(
                    `https://api.yanzbotz.my.id/api/download/tiktok?url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
        {
            name: 'Nexor',
            fn: async () => {
                const { data } = await axios.get(
                    `https://api.nexor.my.id/api/download/tiktok?url=${encoded}`,
                    { timeout: 30000 }
                );
                return extractDownloadUrl(data);
            },
        },
    ];
}

function extractDownloadUrl(data) {
    let url = null;
    if (data?.result?.video?.download_url || data?.result?.video?.url) {
        url = data.result.video.download_url || data.result.video.url;
    } else if (data?.result?.videoUrl || data?.result?.video_url) {
        url = data.result.videoUrl || data.result.video_url;
    } else if (data?.result?.url || data?.result?.download_url) {
        url = data.result.url || data.result.download_url;
    } else if (data?.result?.medias?.[0]?.url) {
        url = data.result.medias[0].url;
    } else if (data?.url || data?.download_url || data?.link) {
        url = data.url || data.download_url || data.link;
    } else if (typeof data === 'string' && data.startsWith('http')) {
        url = data;
    }
    if (url && url.startsWith('http')) return url;
    throw new Error('No download URL');
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'tiksearch',
    aliases: ['tiktoksearch', 'tts', 'tsearch'],
    category: 'search',

    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🎵 *TikTok Search & Download*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.tiksearch <query> [count]\n\n' +
                    '✨ *Examples:*\n' +
                    '.tiksearch Ronaldo\n' +
                    '.tiksearch Hello 8\n' +
                    '.tiksearch Dance 4\n\n' +
                    `📊 *Count:* Even number (default: ${DEFAULT_COUNT}, max: ${MAX_COUNT})\n` +
                    '🎬 Videos + 🖼️ Photos\n\n' +
                    '🔄 4 search + 7 download sources',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Extraire le count si présent
        let count = DEFAULT_COUNT;
        let searchQuery = query;
        const lastArg = args[args.length - 1];
        const parsedCount = parseInt(lastArg);

        if (!isNaN(parsedCount) && parsedCount >= 2 && parsedCount <= MAX_COUNT && parsedCount % 2 === 0) {
            count = parsedCount;
            searchQuery = args.slice(0, -1).join(' ');
        }

        const halfCount = count / 2;

        // Reaction
        try { await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

        try {
            // ═══════════════════
            // SEARCH
            // ═══════════════════

            let allResults = [];
            let usedSearch = '';

            for (const api of SEARCH_APIS) {
                try {
                    console.log(`🔍 TikTok search: ${api.name}...`);
                    const { data } = await axios.get(api.url(searchQuery), { timeout: api.timeout });
                    const results = api.extract(data);

                    if (results && results.length > 0) {
                        allResults = results;
                        usedSearch = api.name;
                        console.log(`✅ Found ${results.length} via ${api.name}`);
                        break;
                    }
                } catch (err) {
                    console.log(`⚠️ ${api.name} failed: ${err.message}`);
                }
            }

            if (allResults.length === 0) {
                try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return sock.sendMessage(jid, {
                    text: '❌ No results found.',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }

            // ═══════════════════
            // SÉPARER VIDÉOS ET PHOTOS
            // ═══════════════════

            const videos = allResults.filter(r => r.type === 'video' || !r.type).slice(0, halfCount);
            const photos = allResults.filter(r => r.type === 'photo').slice(0, halfCount);

            const selectedVideos = videos.sort(() => Math.random() - 0.5).slice(0, halfCount);
            const selectedPhotos = photos.sort(() => Math.random() - 0.5).slice(0, halfCount);

            const totalSelected = selectedVideos.length + selectedPhotos.length;

            // Message de progression
            await sock.sendMessage(jid, {
                text:
                    '🎵 *TikTok Search*\n\n' +
                    `🔍 *Query:* ${searchQuery}\n` +
                    `🔧 *Source:* ${usedSearch}\n` +
                    `🎬 *Videos:* ${selectedVideos.length}\n` +
                    `🖼️ *Photos:* ${selectedPhotos.length}\n` +
                    '⏳ Downloading...',
                contextInfo: STYLE,
            }, { quoted: msg });

            // ═══════════════════
            // ENVOYER LES PHOTOS
            // ═══════════════════

            let sent = 0;
            let failed = 0;

            for (const photo of selectedPhotos) {
                if (!photo.url) { failed++; continue; }

                try {
                    await sock.sendMessage(jid, {
                        image: { url: photo.url },
                        caption:
                            '🖼️ *TikTok Photo*\n\n' +
                            (photo.title ? `📝 ${photo.title.substring(0, 100)}\n` : '') +
                            '⚡ _Zenitsu_',
                        contextInfo: STYLE,
                    }, { quoted: msg });
                    sent++;
                    await delay(1000);
                } catch (err) {
                    console.log(`⚠️ Photo failed: ${err.message}`);
                    failed++;
                }
            }

            // ═══════════════════
            // TÉLÉCHARGER ET ENVOYER LES VIDÉOS
            // ═══════════════════

            for (const video of selectedVideos) {
                if (!video.url) { failed++; continue; }

                let downloadUrl = null;
                let usedDownload = '';

                // Essayer toutes les APIs de download
                const methods = getDownloadMethods(video.url);
                for (const method of methods) {
                    try {
                        console.log(`⬇️ Trying ${method.name}...`);
                        downloadUrl = await method.fn();
                        if (downloadUrl) {
                            usedDownload = method.name;
                            console.log(`✅ Download via ${method.name}`);
                            break;
                        }
                    } catch (err) {
                        console.log(`⚠️ ${method.name} failed: ${err.message}`);
                    }
                }

                if (!downloadUrl) {
                    // Envoyer le lien pour téléchargement manuel
                    await sock.sendMessage(jid, {
                        text:
                            '⚠️ *Video Download Failed*\n\n' +
                            `🔗 ${video.url}\n\n` +
                            '💡 Use .tiktok <url> to try again.',
                        contextInfo: STYLE,
                    });
                    failed++;
                    continue;
                }

                // Vérifier la taille (HEAD request)
                try {
                    const headRes = await axios.head(downloadUrl, { timeout: 10000 });
                    const contentLength = parseInt(headRes.headers['content-length'] || '0');

                    if (contentLength > MAX_VIDEO_SIZE) {
                        console.log(`⚠️ Video too large: ${(contentLength / 1024 / 1024).toFixed(2)} MB`);
                        await sock.sendMessage(jid, {
                            text:
                                '⚠️ *Video Too Large*\n\n' +
                                `📦 Size: ${(contentLength / 1024 / 1024).toFixed(2)} MB (max 10 MB)\n` +
                                `🔗 ${video.url}\n\n` +
                                '💡 Use .tiktok <url> to download manually.',
                            contextInfo: STYLE,
                        });
                        failed++;
                        continue;
                    }
                } catch (_) {
                    // Si HEAD échoue, on essaie de télécharger quand même
                }

                // Télécharger la vidéo
                try {
                    const videoRes = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: MAX_VIDEO_SIZE,
                    });

                    const buffer = Buffer.from(videoRes.data);

                    if (buffer.length > MAX_VIDEO_SIZE) {
                        await sock.sendMessage(jid, {
                            text:
                                '⚠️ *Video Too Large*\n\n' +
                                `📦 Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n` +
                                `🔗 ${video.url}\n\n` +
                                '💡 Use .tiktok <url> to download manually.',
                            contextInfo: STYLE,
                        });
                        failed++;
                        continue;
                    }

                    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

                    await sock.sendMessage(jid, {
                        video: buffer,
                        caption:
                            '🎬 *TikTok Video*\n\n' +
                            (video.title ? `📝 ${video.title.substring(0, 100)}\n` : '') +
                            `📦 ${sizeMB} MB\n` +
                            `🔧 ${usedDownload}\n\n` +
                            '⚡ _Zenitsu_',
                        contextInfo: STYLE,
                    }, { quoted: msg });

                    sent++;
                } catch (err) {
                    console.log(`⚠️ Video download failed: ${err.message}`);
                    await sock.sendMessage(jid, {
                        text:
                            '⚠️ *Video Download Failed*\n\n' +
                            `🔗 ${video.url}\n\n` +
                            '💡 Use .tiktok <url> to try again.',
                        contextInfo: STYLE,
                    });
                    failed++;
                }

                await delay(1500);
            }

            // ═══════════════════
            // RÉSUMÉ
            // ═══════════════════

            await sock.sendMessage(jid, {
                text:
                    '✅ *TikTok Search Complete*\n\n' +
                    `🔍 *Query:* ${searchQuery}\n` +
                    `✅ *Sent:* ${sent}\n` +
                    `❌ *Failed:* ${failed}\n` +
                    `📊 *Total:* ${totalSelected}\n\n` +
                    '⚡ _Zenitsu TikTok Downloader_',
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ tiksearch error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: `❌ Failed: ${err.message}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
