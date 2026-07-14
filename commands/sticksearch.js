
// ./commands/sticksearch.js

const axios = require('axios');
const crypto = require('crypto');
const webp = require('node-webpmux');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const DEFAULT_PACK = '𝐳𝐞𝐧𝐢𝐭𝐬𝐮 𝐦𝐢𝐧𝐢 𝙨𝙚𝙖𝙧𝙘𝙝';
const DEFAULT_AUTHOR = '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟';

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
// ADD EXIF METADATA
// ═══════════════════════════════════════

async function addExif(webpBuffer, packname, author) {
    try {
        const img = new webp.Image();
        await img.load(webpBuffer);

        const metadata = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': packname || '',
            'sticker-pack-publisher': author || '',
            'emojis': ['⚡'],
        };

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
        ]);

        const jsonBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;
        return await img.save(null);
    } catch (err) {
        console.log('⚠️ EXIF failed:', err.message);
        return webpBuffer;
    }
}

// ═══════════════════════════════════════
// SEARCH APIS
// ═══════════════════════════════════════

const SEARCH_APIS = [
    {
        name: 'GiftedTech',
        url: (query) => `https://api.giftedtech.co.ke/api/search/stickersearch?apikey=gifted&query=${encodeURIComponent(query)}`,
        timeout: 15000,
        extract: (data) => {
            let results = [];

            // Format 1: data.results (array of strings)
            if (data?.results && Array.isArray(data.results)) {
                results = data.results;
            }
            // Format 2: data.result (array of objects)
            else if (data?.result && Array.isArray(data.result)) {
                results = data.result;
            }
            // Format 3: data.data (array)
            else if (data?.data && Array.isArray(data.data)) {
                results = data.data;
            }
            // Format 4: plain array
            else if (Array.isArray(data)) {
                results = data;
            }

            return results.map(item => {
                // Si c'est une string directe (URL)
                if (typeof item === 'string') {
                    return { url: item, title: 'Sticker' };
                }
                // Si c'est un objet
                return {
                    url: item.url || item.image || item.link || item.thumbnail || '',
                    title: item.title || item.name || 'Sticker',
                };
            }).filter(item => item.url && item.url.startsWith('http'));
        },
    },
];

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'sticksearch',
    aliases: ['stickerfind', 'ssearch', 'searchsticker', 'gets'],
    category: 'search',

    async execute({ sock, msg, args, jid }) {
        const query = args.join(' ');

        if (!query || query.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🔍 *Sticker Search*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.sticksearch <query>\n\n' +
                    '✨ *Examples:*\n' +
                    '.sticksearch WhatsApp\n' +
                    '.sticksearch Cute cat\n' +
                    '.sticksearch Anime\n\n' +
                    '💡 Sends 5 random stickers directly.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        try { await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

        try {
            let allResults = [];
            let usedSource = '';

            for (const api of SEARCH_APIS) {
                try {
                    console.log(`🔍 ${api.name}...`);
                    const { data } = await axios.get(api.url(query), { timeout: api.timeout });
                    const results = api.extract(data);

                    if (results.length > 0) {
                        allResults = results;
                        usedSource = api.name;
                        console.log(`✅ ${api.name}: ${results.length} stickers`);
                        break;
                    }
                } catch (err) {
                    console.log(`⚠️ ${api.name}: ${err.message}`);
                }
            }

            if (allResults.length === 0) {
                try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return sock.sendMessage(jid, {
                    text: '❌ No stickers found.\nTry WA, or Whatsapp or Tiktok',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }

            // Dédupliquer + mélanger + 5 au hasard
            const seen = new Set();
            const unique = allResults.filter(r => {
                if (!r.url || seen.has(r.url)) return false;
                seen.add(r.url);
                return true;
            });

            const shuffled = unique.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 5);

            // Progression
            await sock.sendMessage(jid, {
                text:
                    '🔍 *Sticker Search*\n\n' +
                    `📝 *Query:* ${query}\n` +
                    `🔧 *Source:* ${usedSource}\n` +
                    `📊 *Found:* ${unique.length} | *Selected:* ${selected.length}\n` +
                    '⏳ Downloading...',
                contextInfo: STYLE,
            }, { quoted: msg });

            let sent = 0;
            let failed = 0;

            for (let i = 0; i < selected.length; i++) {
                const item = selected[i];

                // ⭐ Délai AVANT chaque téléchargement
                await new Promise(r => setTimeout(r, 1000));

                try {
                    console.log(`⬇️ [${i + 1}/5] Downloading: ${item.url.slice(0, 60)}...`);

                    // Télécharger avec User-Agent + timeout long
                    const response = await axios.get(item.url, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        },
                    });

                    const buffer = Buffer.from(response.data);

                    if (!buffer || buffer.length < 500) {
                        console.log(`⚠️ Buffer too small: ${buffer?.length || 0} bytes`);
                        failed++;
                        continue;
                    }

                    // Ajouter EXIF
                    const finalBuffer = await addExif(buffer, DEFAULT_PACK, DEFAULT_AUTHOR);

                    // Envoyer
                    await sock.sendMessage(jid, {
                        sticker: finalBuffer,
                        contextInfo: STYLE,
                    }, { quoted: i === 0 ? msg : undefined });

                    sent++;
                    console.log(`✅ [${i + 1}/5] Sent!`);

                } catch (err) {
                    console.log(`❌ [${i + 1}/5] Failed: ${err.message}`);
                    failed++;
                }

                // ⭐ Délai APRÈS chaque envoi
                await new Promise(r => setTimeout(r, 500));
            }

            try { await sock.sendMessage(jid, { react: { text: sent > 0 ? '✅' : '❌', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ sticksearch:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: `❌ ${err.message}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
