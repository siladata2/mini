// ./commands/readqr.js

const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// TEMP DIR
// ═══════════════════════════════════════

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ═══════════════════════════════════════
// UTILITY: Download quoted media
// ═══════════════════════════════════════

async function downloadQuotedMedia(mediaMessage, mediaType) {
    const stream = await downloadContentFromMessage(mediaMessage, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// ═══════════════════════════════════════
// UTILITY: Upload to Catbox
// ═══════════════════════════════════════

async function uploadToCatbox(buffer) {
    try {
        const form = new FormData();
        form.append('fileToUpload', buffer, `qr_${Date.now()}.jpg`);
        form.append('reqtype', 'fileupload');

        const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000,
        });

        return data.trim();
    } catch (err) {
        console.error('❌ Catbox upload error:', err.message);
        return null;
    }
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'readqr',
    aliases: ['qr', 'scanqr', 'qrdecode', 'qrreader'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // ── Check for image ──
        if (!quoted || !quoted.imageMessage) {
            // Check if URL provided in args
            const urlArg = args[0];
            if (urlArg && urlArg.startsWith('http')) {
                return processReadQR(sock, msg, jid, urlArg);
            }

            return sock.sendMessage(jid, {
                text:
                    '📷 *QR Code Reader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.readqr (reply to a QR code image)\n' +
                    '.readqr <image_url>\n\n' +
                    '✨ *Examples:*\n' +
                    '.readqr (reply to a QR photo)\n' +
                    '.readqr https://example.com/qrcode.jpg\n\n' +
                    '💡 Decodes QR codes from images.\n' +
                    '📸 Supported: JPG, PNG, WEBP',
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
        try { await sock.sendMessage(jid, { react: { text: '📷', key: msg.key } }); } catch (_) {}

        try {
            // Download quoted image
            const buffer = await downloadQuotedMedia(quoted.imageMessage, 'image');

            // Upload to catbox
            const imageUrl = await uploadToCatbox(buffer);
            if (!imageUrl) throw new Error('Failed to upload image');

            // Process QR reading
            await processReadQR(sock, msg, jid, imageUrl);

        } catch (err) {
            console.error('❌ readqr error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *QR Read Failed*\n\n' +
                    'Could not decode the QR code.\n\n' +
                    '⚡ Make sure the image contains a valid QR code.',
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
// PROCESS READ QR
// ═══════════════════════════════════════

async function processReadQR(sock, msg, jid, imageUrl) {
    try {
        const encodedUrl = encodeURIComponent(imageUrl);

        const { data } = await axios.get(
            `https://api.giftedtech.co.ke/api/tools/readqr?apikey=gifted&url=${encodedUrl}`,
            { timeout: 30000 }
        );

        // ── Extract QR content ──
        let qrContent = null;
        let qrType = 'Unknown';

        if (data?.result?.text) {
            qrContent = data.result.text;
            qrType = data.result.type || detectQRType(data.result.text);
        } else if (data?.result?.content) {
            qrContent = data.result.content;
        } else if (data?.text) {
            qrContent = data.text;
        } else if (data?.content) {
            qrContent = data.content;
        } else if (typeof data === 'string') {
            qrContent = data;
        }

        if (!qrContent || qrContent.trim().length < 1) {
            throw new Error('No QR content found');
        }

        // ── Detect type ──
        qrType = detectQRType(qrContent);

        // ── Build response ──
        let replyText =
            '📷 *QR Code Decoded*\n\n' +
            `🏷️ *Type:* ${qrType}\n`;

        if (qrType === 'URL' || qrType === 'Link') {
            replyText += `🔗 *URL:* ${qrContent}\n`;
        } else if (qrType === 'WiFi') {
            const wifiInfo = parseWiFiQR(qrContent);
            if (wifiInfo) {
                replyText += `📶 *SSID:* ${wifiInfo.ssid}\n`;
                replyText += `🔐 *Password:* ${wifiInfo.password || 'None'}\n`;
                replyText += `🔒 *Security:* ${wifiInfo.security || 'WPA'}\n`;
            }
        } else if (qrType === 'Phone') {
            replyText += `📱 *Phone:* ${qrContent}\n`;
        } else if (qrType === 'Email') {
            replyText += `📧 *Email:* ${qrContent}\n`;
        } else {
            replyText += `📄 *Content:* ${qrContent}\n`;
        }

        replyText += '\n⚡ _Decoded by Zenitsu_';

        // ── Send result ──
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

    } catch (err) {
        console.error('❌ readqr process error:', err.message);
        throw err;
    }
}

// ═══════════════════════════════════════
// DETECT QR TYPE
// ═══════════════════════════════════════

function detectQRType(content) {
    if (!content) return 'Unknown';

    // URL
    if (content.match(/^https?:\/\//i)) {
        return 'URL';
    }

    // WiFi
    if (content.startsWith('WIFI:') || content.includes('WIFI:')) {
        return 'WiFi';
    }

    // Phone number
    if (content.match(/^\+?[\d\s\-()]{7,15}$/) || content.startsWith('tel:')) {
        return 'Phone';
    }

    // Email
    if (content.includes('@') && content.includes('.')) {
        return 'Email';
    }

    // WhatsApp
    if (content.includes('wa.me') || content.includes('whatsapp.com')) {
        return 'WhatsApp';
    }

    // Text
    if (content.length < 100) {
        return 'Text';
    }

    return 'Data';
}

// ═══════════════════════════════════════
// PARSE WIFI QR
// ═══════════════════════════════════════

function parseWiFiQR(content) {
    try {
        const ssidMatch = content.match(/S:(.*?)(;|$)/);
        const passMatch = content.match(/P:(.*?)(;|$)/);
        const secMatch = content.match(/T:(.*?)(;|$)/);

        return {
            ssid: ssidMatch ? ssidMatch[1] : 'Unknown',
            password: passMatch ? passMatch[1] : null,
            security: secMatch ? secMatch[1] : 'WPA',
        };
    } catch (err) {
        return null;
    }
}
