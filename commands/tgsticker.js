// ./commands/tgsticker.js

const axios = require('axios');
const crypto = require('crypto');
const webp = require('node-webpmux');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const STYLE = {
    forwardingScore: 350,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363425394543602@newsletter',
        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
        serverMessageId: 202,
    },
};

const DEFAULT_PACK = 'ᴛɢsᴛɪᴄᴋ_𝟼𝟽';
const DEFAULT_AUTHOR = '모 🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟';

// ═══════════════════════════════════════
// ADD EXIF METADATA
// ═══════════════════════════════════════

async function addExifToWebp(webpBuffer, packname, author, emoji = '⚡') {
    try {
        const img = new webp.Image();
        await img.load(webpBuffer);

        const metadata = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': packname,
            'sticker-pack-publisher': author,
            'emojis': [emoji],
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
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'tgsticker',
    aliases: ['tgs', 'telegramsticker', 'tsticker'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || !url.includes('t.me/addstickers/')) {
            return sock.sendMessage(jid, {
                text:
                    '📦 *Telegram Sticker Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.tgsticker <telegram_url>\n\n' +
                    '✨ *Example:*\n' +
                    '.tgsticker https://t.me/addstickers/RockyPack4\n\n' +
                    '💡 Downloads all stickers from a public pack.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Extraire le nom du pack
        const packName = url.replace('https://t.me/addstickers/', '').split('/')[0].trim();

        // Reaction
        try { await sock.sendMessage(jid, { react: { text: '📦', key: msg.key } }); } catch (_) {}

        try {
            // Appeler l'API NexRay
            const encodedUrl = encodeURIComponent(url);
            const { data } = await axios.get(
                `https://api.nexray.eu.cc/tools/telegram-sticker?url=${encodedUrl}`,
                { timeout: 20000 }
            );

            if (!data?.status || !data?.result?.sticker) {
                throw new Error('Sticker pack not found or empty');
            }

            const pack = data.result;
            const stickers = pack.sticker;
            const totalStickers = stickers.length;

            // Message de progression
            await sock.sendMessage(jid, {
                text:
                    '📦 *Telegram Stickers*\n\n' +
                    `📌 *Pack:* ${pack.title || packName}\n` +
                    `🎯 *Type:* ${pack.sticker_type || 'regular'}\n` +
                    `📊 *Total:* ${totalStickers} stickers\n` +
                    '⏳ Downloading & converting...',
                contextInfo: STYLE,
            }, { quoted: msg });

            let successCount = 0;
            let failCount = 0;

            // Traiter chaque sticker
            for (let i = 0; i < stickers.length; i++) {
                try {
                    const sticker = stickers[i];
                    const stickerUrl = sticker.url;

                    if (!stickerUrl) {
                        failCount++;
                        continue;
                    }

                    // Télécharger le sticker WebP
                    const response = await axios.get(stickerUrl, {
                        responseType: 'arraybuffer',
                        timeout: 20000,
                    });

                    const webpBuffer = Buffer.from(response.data);

                    if (!webpBuffer || webpBuffer.length < 100) {
                        failCount++;
                        continue;
                    }

                    // Ajouter les métadonnées EXIF (renommer le pack)
                    const emoji = sticker.emoji || '⚡';
                    const finalBuffer = await addExifToWebp(
                        webpBuffer,
                        DEFAULT_PACK,
                        DEFAULT_AUTHOR,
                        emoji
                    );

                    // Envoyer le sticker
                    await sock.sendMessage(jid, {
                        sticker: finalBuffer,
                        contextInfo: STYLE,
                    });

                    successCount++;

                    // Petite pause entre chaque sticker
                    await new Promise(r => setTimeout(r, 600));

                } catch (stickerErr) {
                    console.log(`⚠️ Sticker ${i + 1} failed:`, stickerErr.message);
                    failCount++;
                }
            }

            // Message final
            await sock.sendMessage(jid, {
                text:
                    '✅ *Download Complete!*\n\n' +
                    `📦 *Pack:* ${pack.title || packName}\n` +
                    `✅ *Success:* ${successCount}\n` +
                    `❌ *Failed:* ${failCount}\n` +
                    `📊 *Total:* ${totalStickers}\n\n` +
                    '⚡ _Zenitsu Telegram Downloader_',
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ tgsticker error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `${err.message}\n\n` +
                    '💡 Make sure:\n' +
                    '• The URL is correct\n' +
                    '• The sticker pack is public\n' +
                    '• The pack exists',
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
