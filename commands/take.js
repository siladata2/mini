// ./commands/take.js

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const webp = require('node-webpmux');

const execFileAsync = promisify(execFile);

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

// ═══════════════════════════════════════
// LOCATE MEDIA
// ═══════════════════════════════════════

function locateMedia(msg) {
    const m = msg.message || {};
    const types = ['imageMessage', 'videoMessage', 'stickerMessage'];

    for (const t of types) {
        if (m[t]) return { mediaMessage: m, mediaType: t, quotedInfo: null };
    }

    if (m.viewOnceMessage?.message) {
        for (const t of types) {
            if (m.viewOnceMessage.message[t]) return { mediaMessage: m.viewOnceMessage.message, mediaType: t, quotedInfo: null };
        }
    }

    const ctx = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || null;
    let quoted = ctx?.quotedMessage;
    if (quoted) {
        if (quoted.viewOnceMessage?.message) quoted = quoted.viewOnceMessage.message;
        if (quoted.viewOnceMessageV2?.message) quoted = quoted.viewOnceMessageV2.message;
        for (const t of types) {
            if (quoted[t]) return { mediaMessage: quoted, mediaType: t, quotedInfo: ctx };
        }
    }

    return null;
}

// ═══════════════════════════════════════
// DOWNLOAD
// ═══════════════════════════════════════

function buildDownloadableMessage(originalMsg, located) {
    const { mediaMessage, quotedInfo } = located;
    if (!quotedInfo) return { key: originalMsg.key, message: mediaMessage };

    return {
        key: {
            remoteJid: originalMsg.key.remoteJid,
            fromMe: false,
            id: quotedInfo.stanzaId || crypto.randomBytes(8).toString('hex'),
            participant: quotedInfo.participant || originalMsg.key.participant || originalMsg.key.remoteJid,
        },
        message: mediaMessage,
    };
}

async function downloadMedia(sock, originalMsg, located) {
    const rebuilt = buildDownloadableMessage(originalMsg, located);
    try { return await downloadMediaMessage(rebuilt, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage }); } catch (_) {}
    try {
        const minimal = { key: originalMsg.key, message: located.mediaMessage };
        return await downloadMediaMessage(minimal, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    } catch (_) {}
    return await downloadMediaMessage(originalMsg, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
}

// ═══════════════════════════════════════
// DETECT IF STICKER IS ANIMATED
// ═══════════════════════════════════════

function isAnimatedSticker(buffer) {
    // Vérifier les premiers octets du fichier WebP
    // ANIM chunk = animation
    if (buffer.length < 20) return false;
    const animSignature = Buffer.from('ANIM');
    // Chercher le chunk ANIM dans le buffer
    for (let i = 12; i < buffer.length - 4; i++) {
        if (buffer[i] === animSignature[0] && 
            buffer[i+1] === animSignature[1] && 
            buffer[i+2] === animSignature[2] && 
            buffer[i+3] === animSignature[3]) {
            return true;
        }
    }
    return false;
}

// ═══════════════════════════════════════
// CONVERT TO WEBP STICKER
// ═══════════════════════════════════════

async function convertToSticker(buffer, sourceType, packname, author) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'take-'));

    let webpBuffer;

    if (sourceType === 'image') {
        // Image → WebP statique
        const inputPath = path.join(tmpDir, 'input.png');
        const outputPath = path.join(tmpDir, 'output.webp');
        fs.writeFileSync(inputPath, buffer);

        await execFileAsync('ffmpeg', [
            '-i', inputPath,
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0',
            '-lossless', '0',
            '-quality', '85',
            '-q:v', '80',
            '-y', outputPath,
        ], { timeout: 30000 });

        webpBuffer = fs.readFileSync(outputPath);

    } else if (sourceType === 'video') {
        // Vidéo → WebP animé
        const inputPath = path.join(tmpDir, 'input.mp4');
        const outputPath = path.join(tmpDir, 'output.webp');
        fs.writeFileSync(inputPath, buffer);

        await execFileAsync('ffmpeg', [
            '-i', inputPath,
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-fps_mode', 'vfr',
            '-t', '10',
            '-q:v', '80',
            '-y', outputPath,
        ], { timeout: 45000 });

        webpBuffer = fs.readFileSync(outputPath);

    } else if (sourceType === 'sticker_animated') {
        // Sticker animé → garder le WebP tel quel (déjà au bon format)
        webpBuffer = buffer;

    } else if (sourceType === 'sticker_static') {
        // Sticker statique → extraire PNG → recréer WebP
        const inputPath = path.join(tmpDir, 'sticker.webp');
        const tempPng = path.join(tmpDir, 'extracted.png');
        const outputPath = path.join(tmpDir, 'output.webp');
        fs.writeFileSync(inputPath, buffer);

        await execFileAsync('ffmpeg', ['-i', inputPath, '-vframes', '1', '-y', tempPng], { timeout: 10000 });

        await execFileAsync('ffmpeg', [
            '-i', tempPng,
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0',
            '-lossless', '0',
            '-quality', '85',
            '-q:v', '80',
            '-y', outputPath,
        ], { timeout: 30000 });

        webpBuffer = fs.readFileSync(outputPath);
    }

    // Nettoyer
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

    if (!webpBuffer || webpBuffer.length < 100) throw new Error('Conversion failed');

    // Ajouter les métadonnées EXIF
    return await addExif(webpBuffer, packname, author);
}

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
        console.log('⚠️ EXIF failed, sending without metadata:', err.message);
        return webpBuffer;
    }
}

// ═══════════════════════════════════════
// PARSE ARGS
// ═══════════════════════════════════════

function parseArgs(args) {
    let packname = '';
    let author = '';

    const fullText = args.join(' ');

    const authorMatch = fullText.match(/a:(.+?)(?:\s+p:|$)/) || fullText.match(/a:(.+)/);
    if (authorMatch) author = authorMatch[1].trim();

    const packMatch = fullText.match(/p:(.+?)(?:\s+a:|$)/) || fullText.match(/p:(.+)/);
    if (packMatch) packname = packMatch[1].trim();

    if (!authorMatch && !packMatch) {
        if (args.length >= 2) {
            packname = args[0];
            author = args.slice(1).join(' ');
        } else if (args.length === 1) {
            author = args[0];
            packname = '';
        }
    }

    return { packname, author };
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'take',
    aliases: ['steal', 'getsticker', 't', 's'],
    category: 'media',

    async execute({ sock, msg, args, jid }) {
        const located = locateMedia(msg);

        if (!located) {
            return sock.sendMessage(jid, {
                text:
                    '🎨 *Take — Rename Sticker*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.take a:AuthorName (author only)\n' +
                    '.take p:PackName (pack only)\n' +
                    '.take p:Pack a:Author (both)\n' +
                    '.take AuthorName (author only)\n\n' +
                    '💡 Reply to sticker/image/video.\n' +
                    '🎬 Works with animated stickers too.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        if (located.mediaType === 'videoMessage') {
            const dur = located.mediaMessage?.videoMessage?.seconds || 0;
            if (dur > 11) {
                return sock.sendMessage(jid, {
                    text: '❌ Video too long! Max 10s.',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }
        }

        try { await sock.sendMessage(jid, { react: { text: '🎨', key: msg.key } }); } catch (_) {}

        try {
            const { packname, author } = parseArgs(args);

            if (!packname && !author) {
                return sock.sendMessage(jid, {
                    text: '⚠️ Specify at least an author or packname.\nExample: .take p:cybernova',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }

            // Télécharger le média
            const buffer = await downloadMedia(sock, msg, located);
            if (!buffer || buffer.length < 100) throw new Error('Download failed');

            // Déterminer le type source pour la conversion
            let sourceType;
            if (located.mediaType === 'stickerMessage') {
                const animated = isAnimatedSticker(buffer);
                sourceType = animated ? 'sticker_animated' : 'sticker_static';
            } else if (located.mediaType === 'videoMessage') {
                sourceType = 'video';
            } else {
                sourceType = 'image';
            }

            // Convertir avec les nouvelles métadonnées
            const finalSticker = await convertToSticker(buffer, sourceType, packname, author);

            // Envoyer
            await sock.sendMessage(jid, {
                sticker: finalSticker,
                contextInfo: STYLE,
            }, { quoted: msg });

            // Confirmation
            let confirmText = '✅ *Sticker Taken!*\n\n';
            if (packname) confirmText += `📦 *Pack:* ${packname}\n`;
            if (author) confirmText += `✍️ *Author:* ${author}\n`;
            if (!packname && author) confirmText += '🔥 *Author only (no pack)*\n';
            confirmText += '\n⚡ _Zenitsu_';

            await sock.sendMessage(jid, {
                text: confirmText,
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ take error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: `❌ Failed: ${err.message}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
