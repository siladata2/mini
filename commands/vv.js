// ./commands/vv.js

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ═══════════════════════════════════════
// STYLE
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
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'vv',
    aliases: ['viewonce', 'antiviewonce', 'unhide'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(jid, {
                text:
                    '👁️ *View-Once Saver*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.vv (reply to a view-once image/video)\n\n' +
                    '💡 Saves view-once media and resends it.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        let mediaType = null;
        let mediaMessage = null;

        if (quoted.imageMessage?.viewOnce) {
            mediaType = 'image';
            mediaMessage = quoted.imageMessage;
        } else if (quoted.videoMessage?.viewOnce) {
            mediaType = 'video';
            mediaMessage = quoted.videoMessage;
        } else {
            return sock.sendMessage(jid, {
                text: '❌ Please reply to a *view-once* image or video.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // Reaction
        try { await sock.sendMessage(jid, { react: { text: '👁️', key: msg.key } }); } catch (_) {}

        try {
            // Download the view-once media
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            if (!buffer || buffer.length < 100) throw new Error('Download failed');

            const caption = mediaMessage.caption || '';
            const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            // Send back to the same chat
            if (mediaType === 'image') {
                await sock.sendMessage(jid, {
                    image: buffer,
                    caption:
                        (caption ? `📝 ${caption}\n` : '') +
                        `👁️ *View-Once Saved*\n` +
                        `📦 ${sizeMB} MB\n\n` +
                        '⚡ _Zenitsu_',
                    contextInfo: STYLE,
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    video: buffer,
                    caption:
                        (caption ? `📝 ${caption}\n` : '') +
                        `👁️ *View-Once Saved*\n` +
                        `📦 ${sizeMB} MB\n\n` +
                        '⚡ _Zenitsu_',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ vv error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: `❌ Failed: ${err.message}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
