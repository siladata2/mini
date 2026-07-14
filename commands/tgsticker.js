// ./commands/tg.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const webp = require('node-webpmux');

const execAsync = promisify(exec);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const TELEGRAM_BOT_TOKEN = '8339426075:AAEaFANIuo_mJKDDPtPdgemfIxQYYfSCckk';

const STYLE = {
    forwardingScore: 350,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363425394543602@newsletter',
        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
        serverMessageId: 202,
    },
};

const DEFAULT_PACK = '🅩🅔🅝🅘🅣🅢🅤 🅧 🅜🅔🅣🅐\n';
const DEFAULT_AUTHOR = '𝕿𝖊𝖑𝖊𝖌𝖗𝖆𝖒 𝕾𝖙𝖎𝖈𝖐';

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
// CONVERT TO WEBP
// ═══════════════════════════════════════

async function convertToWebp(buffer, isAnimated) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-'));
    const inputPath = path.join(tmpDir, `input_${Date.now()}`);
    const outputPath = path.join(tmpDir, `output_${Date.now()}.webp`);

    fs.writeFileSync(inputPath, buffer);

    const scale = '512:512';
    const cmd = isAnimated
        ? `ffmpeg -i "${inputPath}" -vf "scale=${scale}:force_original_aspect_ratio=decrease,fps=15,pad=${scale}:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${outputPath}"`
        : `ffmpeg -i "${inputPath}" -vf "scale=${scale}:force_original_aspect_ratio=decrease,format=rgba,pad=${scale}:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${outputPath}"`;

    try {
        await execAsync(cmd, { timeout: 30000 });
        if (!fs.existsSync(outputPath)) throw new Error('Conversion failed');
        return fs.readFileSync(outputPath);
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'tgsticker',
    aliases: ['telegram', 'tgs', 'tsticker', 'telesticker'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const url = args[0];

        if (!url || !url.match(/(https:\/\/t\.me\/addstickers\/)/gi)) {
            return sock.sendMessage(jid, {
                text:
                    '📦 *Telegram Sticker Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.tg <telegram_sticker_url>\n\n' +
                    '✨ *Example:*\n' +
                    '.tg https://t.me/addstickers/Porcientoreal\n' +
                    '.tg https://t.me/addstickers/AnimeStickers\n\n' +
                    '💡 Downloads all stickers from a public Telegram pack.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Extraire le nom du pack
        const packName = url.replace('https://t.me/addstickers/', '').split('/')[0];

        // Reaction
        try { await sock.sendMessage(jid, { react: { text: '📦', key: msg.key } }); } catch (_) {}

        try {
            // Récupérer les infos du pack
            const { data: stickerSet } = await axios.get(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`,
                { timeout: 15000 }
            );

            if (!stickerSet.ok || !stickerSet.result) {
                throw new Error('Sticker pack not found or private');
            }

            const stickers = stickerSet.result.stickers;
            const totalStickers = stickers.length;

            // Message de progression
            await sock.sendMessage(jid, {
                text:
                    '📦 *Telegram Stickers*\n\n' +
                    `📌 *Pack:* ${stickerSet.result.name}\n` +
                    `🎯 *Title:* ${stickerSet.result.title}\n` +
                    `📊 *Total:* ${totalStickers} stickers\n` +
                    '⏳ Downloading...',
                contextInfo: STYLE,
            }, { quoted: msg });

            let successCount = 0;
            let failCount = 0;

            // Traiter chaque sticker
            for (let i = 0; i < totalStickers; i++) {
                try {
                    const sticker = stickers[i];
                    const fileId = sticker.file_id;

                    // Récupérer le chemin du fichier
                    const { data: fileInfo } = await axios.get(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
                        { timeout: 10000 }
                    );

                    if (!fileInfo.ok || !fileInfo.result?.file_path) {
                        failCount++;
                        continue;
                    }

                    // Télécharger le sticker
                    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
                    const { data: imageBuffer } = await axios.get(fileUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                    });

                    // Convertir en WebP
                    const isAnimated = sticker.is_animated || sticker.is_video;
                    const webpBuffer = await convertToWebp(Buffer.from(imageBuffer), isAnimated);

                    // Ajouter les métadonnées
                    const emoji = sticker.emoji || '⚡';
                    const finalBuffer = await addExifToWebp(webpBuffer, DEFAULT_PACK, DEFAULT_AUTHOR, emoji);

                    // Envoyer le sticker
                    await sock.sendMessage(jid, {
                        sticker: finalBuffer,
                        contextInfo: STYLE,
                    });

                    successCount++;

                    // Petite pause entre chaque sticker
                    await delay(800);

                } catch (stickerErr) {
                    console.log(`⚠️ Sticker ${i + 1} failed:`, stickerErr.message);
                    failCount++;
                }
            }

            // Message final
            await sock.sendMessage(jid, {
                text:
                    '✅ *Download Complete!*\n\n' +
                    `📦 *Pack:* ${stickerSet.result.title}\n` +
                    `✅ *Success:* ${successCount}\n` +
                    `❌ *Failed:* ${failCount}\n` +
                    `📊 *Total:* ${totalStickers}\n\n` +
                    '⚡ _Zenitsu Telegram Downloader_',
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ tg error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `${err.message}\n\n` +
                    '💡 Make sure:\n' +
                    '• The URL is correct\n' +
                    '• The sticker pack is public\n' +
                    '• The pack name is valid',
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
