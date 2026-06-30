// ./commands/remini.js

const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ═══════════════════════════════════════
// UTILITY: Download quoted media
// ═══════════════════════════════════════

async function downloadMedia(mediaMessage, type) {
    const stream = await downloadContentFromMessage(mediaMessage, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// ═══════════════════════════════════════
// UTILITY: Upload to Catbox
// ═══════════════════════════════════════

async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('fileToUpload', buffer, `remini_${Date.now()}.jpg`);
    form.append('reqtype', 'fileupload');

    const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        timeout: 30000,
    });

    return data.trim();
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'remini',
    aliases: ['hd', 'enhance', 'upscale', 'improve'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // Check for quoted image
        if (!quoted || !quoted.imageMessage) {
            // Check if URL provided in args
            const urlArg = args[0];
            if (urlArg && urlArg.startsWith('http')) {
                return processRemini(sock, msg, jid, urlArg);
            }

            return sock.sendMessage(jid, {
                text:
                    '🔮 *Remini HD Enhancer*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.remini (reply to an image)\n' +
                    '.remini <image_url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.remini (reply to a blurry photo)\n' +
                    '.remini https://example.com/photo.jpg\n\n' +
                    '💡 Enhances image quality using AI.',
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

        try { await sock.sendMessage(jid, { react: { text: '🔮', key: msg.key } }); } catch (_) {}

        try {
            // Download image
            const buffer = await downloadMedia(quoted.imageMessage, 'image');
            const imageUrl = await uploadToCatbox(buffer);

            if (!imageUrl) throw new Error('Upload failed');

            await processRemini(sock, msg, jid, imageUrl);

        } catch (err) {
            console.error('❌ remini error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text: '❌ *Enhancement Failed*\n\nThe image could not be processed. Try again.',
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
// PROCESS REMINI
// ═══════════════════════════════════════

async function processRemini(sock, msg, jid, imageUrl) {
    try {
        const encodedUrl = encodeURIComponent(imageUrl);

        const { data } = await axios.get(
            `https://api.giftedtech.co.ke/api/tools/remini?apikey=gifted&url=${encodedUrl}`,
            { timeout: 90000 }
        );

        let resultUrl = null;
        if (data?.result?.url) resultUrl = data.result.url;
        else if (data?.url) resultUrl = data.url;
        else if (data?.image_url) resultUrl = data.image_url;
        else if (typeof data === 'string' && data.startsWith('http')) resultUrl = data;

        if (!resultUrl) throw new Error('No enhanced image');

        // Try sending as image
        let sent = false;
        try {
            await sock.sendMessage(jid, {
                image: { url: resultUrl },
                caption:
                    '🔮 *Remini HD*\n\n' +
                    '✨ Image enhanced successfully!\n\n' +
                    `⚡ _Powered by Zenitsu_`,
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
            sent = true;
        } catch (_) {}

        // Fallback: send link
        if (!sent) {
            await sock.sendMessage(jid, {
                text:
                    '🔮 *Remini HD*\n\n' +
                    '✨ Image enhanced!\n\n' +
                    `🔗 *Link:* ${resultUrl}`,
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

        try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (err) {
        console.error('❌ remini process error:', err.message);
        throw err;
    }
}
