// ./commands/play.js

const axios = require('axios');

// ═══════════════════════════════════════
// QUALITIES
// ═══════════════════════════════════════

const QUALITIES = ['128kbps', '192kbps', '256kbps', '320kbps'];
const DEFAULT_QUALITY = '128kbps';
const MAX_DURATION_SECONDS = 600; // 10 minutes

// ═══════════════════════════════════════
// STORE ACTIVE SEARCHES
// ═══════════════════════════════════════

const activeSearches = new Map();

// ═══════════════════════════════════════
// HELPER: Parse duration to seconds
// ═══════════════════════════════════════

function parseDuration(duration) {
    if (!duration || duration === 'Unknown' || duration === 'N/A') {
        return 0;
    }
    
    const str = String(duration).trim();
    
    // Try to parse HH:MM:SS or MM:SS
    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]) || 0;
        const minutes = parseInt(timeMatch[2]) || 0;
        const seconds = parseInt(timeMatch[3]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Try to parse "1h 2m 30s" format
    const hoursMatch = str.match(/(\d+)\s*h/);
    const minutesMatch = str.match(/(\d+)\s*m/);
    const secondsMatch = str.match(/(\d+)\s*s/);
    
    let total = 0;
    if (hoursMatch) total += parseInt(hoursMatch[1]) * 3600;
    if (minutesMatch) total += parseInt(minutesMatch[1]) * 60;
    if (secondsMatch) total += parseInt(secondsMatch[1]);
    
    if (total > 0) return total;
    
    return 0;
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// ═══════════════════════════════════════
// SEARCH FUNCTIONS
// ═══════════════════════════════════════

async function searchYupra(query) {
    try {
        const { data } = await axios.get(
            `https://api.yupra.my.id/api/search/youtube?q=${encodeURIComponent(query)}`,
            { timeout: 15000 }
        );
        
        if (!data?.status || !data?.results || !Array.isArray(data.results)) {
            return null;
        }
        
        return data.results.map(item => ({
            title: item.title || 'Unknown',
            url: `https://www.youtube.com/watch?v=${item.videoId}`,
            duration: item.duration || 'Unknown',
            durationSeconds: item.seconds || parseDuration(item.duration),
            views: item.views || '',
            size: 'Unknown',
            videoId: item.videoId,
            channel: item.channel || ''
        }));
    } catch (err) {
        console.error('❌ Yupra search error:', err.message);
        return null;
    }
}

async function searchGifted(query) {
    try {
        const { data } = await axios.get(
            `https://api.giftedtech.co.ke/api/search/yts?apikey=gifted&query=${encodeURIComponent(query)}`,
            { timeout: 15000 }
        );
        
        let results = [];
        if (data?.result && Array.isArray(data.result)) {
            results = data.result;
        } else if (data?.results && Array.isArray(data.results)) {
            results = data.results;
        } else if (Array.isArray(data)) {
            results = data;
        }
        
        if (results.length === 0) return null;
        
        return results.map(item => ({
            title: item.title || item.name || 'Unknown',
            url: item.url || item.link || item.id || '',
            duration: item.duration || item.timestamp || 'Unknown',
            durationSeconds: parseDuration(item.duration || item.timestamp || 'Unknown'),
            views: item.views || item.view_count || '',
            size: item.size || 'Unknown'
        }));
    } catch (err) {
        console.error('❌ Gifted search error:', err.message);
        return null;
    }
}

// ═══════════════════════════════════════
// DOWNLOAD FUNCTIONS
// ═══════════════════════════════════════

async function downloadPrinceTech(videoUrl, quality) {
    const url = `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${encodeURIComponent(videoUrl)}`;
    const { data } = await axios.get(url, { timeout: 60000 });
    
    let downloadUrl = null;
    if (data?.result?.download_url) downloadUrl = data.result.download_url;
    else if (data?.result?.url) downloadUrl = data.result.url;
    else if (data?.download_url) downloadUrl = data.download_url;
    else if (data?.url) downloadUrl = data.url;
    
    if (!downloadUrl) throw new Error('No download URL from PrinceTech');
    
    return {
        downloadUrl,
        size: data?.result?.size || data?.size || null
    };
}

async function downloadGifted(videoUrl, quality) {
    const url = `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodeURIComponent(videoUrl)}&quality=${quality}`;
    const { data } = await axios.get(url, { timeout: 60000 });
    
    let downloadUrl = null;
    if (data?.result?.download_url) downloadUrl = data.result.download_url;
    else if (data?.result?.url) downloadUrl = data.result.url;
    else if (data?.url) downloadUrl = data.url;
    else if (data?.link) downloadUrl = data.link;
    else if (data?.download_url) downloadUrl = data.download_url;
    
    if (!downloadUrl) throw new Error('No download URL from GiftedTech');
    
    return {
        downloadUrl,
        size: data?.result?.size || data?.size || null
    };
}

async function downloadSylphy(videoUrl, quality) {
    const url = `https://sylphyy.xyz/download/v3/ytmp3?url=${encodeURIComponent(videoUrl)}&api_key=sylphy-qZJV4pp`;
    const { data } = await axios.get(url, { timeout: 60000 });
    
    let downloadUrl = null;
    if (data?.result?.download_url) downloadUrl = data.result.download_url;
    else if (data?.result?.url) downloadUrl = data.result.url;
    else if (data?.download_url) downloadUrl = data.download_url;
    else if (data?.url) downloadUrl = data.url;
    
    if (!downloadUrl) throw new Error('No download URL from Sylphy');
    
    return {
        downloadUrl,
        size: data?.result?.size || data?.size || null
    };
}

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
                    '⏱ *Limit:* Only songs under 10 minutes\n\n' +
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
            // ── Try Yupra first ──
            let results = await searchYupra(searchQuery);
            let searchSource = 'Yupra';
            
            // ── If Yupra fails, try Gifted ──
            if (!results) {
                results = await searchGifted(searchQuery);
                searchSource = 'GiftedTech';
            }

            if (!results || results.length === 0) {
                throw new Error('No results found from any search API');
            }

            // ── Filter and clean results (only under 10 minutes) ──
            const validResults = [];
            
            for (const item of results) {
                const durationSeconds = item.durationSeconds || parseDuration(item.duration);
                
                // If duration is 0 (unknown), we'll keep it
                if (durationSeconds === 0 || durationSeconds <= MAX_DURATION_SECONDS) {
                    validResults.push({
                        title: item.title || 'Unknown',
                        url: item.url || '',
                        duration: item.duration || 'Unknown',
                        durationSeconds: durationSeconds,
                        views: item.views || '',
                        size: item.size || 'Unknown'
                    });
                }
            }

            // If no valid results, show warning
            if (validResults.length === 0) {
                const maxResults = Math.min(results.length, 5);
                const fallbackResults = results.slice(0, maxResults).map(item => ({
                    title: item.title || 'Unknown',
                    url: item.url || '',
                    duration: item.duration || 'Unknown',
                    durationSeconds: item.durationSeconds || parseDuration(item.duration),
                    views: item.views || '',
                    size: item.size || 'Unknown'
                }));

                activeSearches.set(senderJid, {
                    results: fallbackResults,
                    quality: quality,
                    timestamp: Date.now(),
                });

                let replyText = `⚠️ *No videos under 10 minutes found*\n`;
                replyText += `📋 *Showing first ${fallbackResults.length} results:*\n\n`;

                fallbackResults.forEach((item, i) => {
                    const durationStr = formatDuration(item.durationSeconds);
                    replyText += `*${i + 1}.* ${item.title}\n`;
                    replyText += `   ⏱ ${durationStr}`;
                    if (item.views) replyText += ` | 👁 ${item.views}`;
                    replyText += '\n\n';
                });

                replyText +=
                    `⚠️ *Warning:* These videos are longer than 10 minutes.\n` +
                    `📌 Reply with .play <number> to download anyway.\n\n` +
                    `🌐 *Search Source:* ${searchSource}\n` +
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

                try { await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } }); } catch (_) {}
                return;
            }

            // ── Take only first 5 valid results ──
            const maxResults = Math.min(validResults.length, 5);
            const cleanedResults = validResults.slice(0, maxResults);

            // ── Store ──
            activeSearches.set(senderJid, {
                results: cleanedResults,
                quality: quality,
                timestamp: Date.now(),
            });

            // ── Build response ──
            let replyText = `🎵 *Search Results: ${searchQuery}*\n`;
            replyText += `🎼 *Quality:* ${quality}\n`;
            replyText += `⏱ *Limit:* ${formatDuration(MAX_DURATION_SECONDS)}\n`;
            replyText += `🌐 *Source:* ${searchSource}\n\n`;

            cleanedResults.forEach((item, i) => {
                const durationStr = formatDuration(item.durationSeconds);
                replyText += `*${i + 1}.* ${item.title}\n`;
                replyText += `   ⏱ ${durationStr}`;
                if (item.views) replyText += ` | 👁 ${item.views}`;
                if (item.size && item.size !== 'Unknown') replyText += ` | 📦 ${item.size}`;
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
    // Try download APIs in order: PrinceTech → GiftedTech → Sylphy
    const downloaders = [
        { name: 'PrinceTech', fn: downloadPrinceTech },
        { name: 'GiftedTech', fn: downloadGifted },
        { name: 'Sylphy', fn: downloadSylphy }
    ];

    let lastError = null;

    for (const downloader of downloaders) {
        try {
            console.log(`🔄 Trying ${downloader.name} download API...`);
            
            const result = await downloader.fn(videoUrl, quality);
            
            console.log(`✅ ${downloader.name} API succeeded`);

            // Download audio
            const audioRes = await axios.get(result.downloadUrl, {
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
            let infoText = '🎵 *Music Downloaded*\n\n';
            infoText += `📌 *Title:* ${title}\n`;
            infoText += `⏱ *Duration:* ${duration}\n`;
            infoText += `🎼 *Quality:* ${quality}\n`;
            infoText += `📦 *Size:* ${sizeMB} MB\n`;
            infoText += `🔗 ${videoUrl}\n\n`;
            infoText += `🌐 *Source:* ${downloader.name}\n`;
            infoText += '⚡ _Downloaded by Zenitsu_';

            await sock.sendMessage(jid, {
                text: infoText,
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
            return; // Success, exit function

        } catch (err) {
            console.error(`❌ ${downloader.name} API error:`, err.message);
            lastError = err;
            // Continue to next downloader
        }
    }

    // All APIs failed
    console.error('❌ All download APIs failed');
    try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

    await sock.sendMessage(jid, {
        text:
            '❌ *Download Failed*\n\n' +
            'All download servers are currently unavailable.\n' +
            'Please try again later or try a different song.\n\n' +
            `⚡ Last error: ${lastError?.message || 'Unknown error'}`,
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
