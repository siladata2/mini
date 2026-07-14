// ./commands/vv2.js

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
    name: 'vv2',
    aliases: ['viewonce2', 'saveforme', 'vvself'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(jid, {
                text:
                    '👁️ *View-Once Saver v2*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.vv2 (reply to a view-once image/video)\n\n' +
                    '💡 Saves view-once media and sends it to the bot\'s own chat.',
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

            // Récupérer le JID du bot lui-même (celui qu'il utilise pour sa propre conversation)
            const botJid = sock.user?.id || sock.user?.jid || '';

            if (!botJid) throw new Error('Bot JID not found');

            const caption = mediaMessage.caption || '';
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0].split(':')[0];
            const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            // Send to bot's own chat
            if (mediaType === 'image') {
                await sock.sendMessage(botJid, {
                    image: buffer,
                    caption:
                        '👁️ *View-Once Saved*\n\n' +
                        `👤 *From:* @${senderNumber}\n` +
                        (caption ? `📝 *Caption:* ${caption}\n` : '') +
                        `📦 *Size:* ${sizeMB} MB\n\n` +
                        '⚡ _Zenitsu_',
                    contextInfo: {
                        mentionedJid: [senderJid],
                        ...STYLE,
                    },
                });
            } else {
                await sock.sendMessage(botJid, {
                    video: buffer,
                    caption:
                        '👁️ *View-Once Saved*\n\n' +
                        `👤 *From:* @${senderNumber}\n` +
                        (caption ? `📝 *Caption:* ${caption}\n` : '') +
                        `📦 *Size:* ${sizeMB} MB\n\n` +
                        '⚡ _Zenitsu_',
                    contextInfo: {
                        mentionedJid: [senderJid],
                        ...STYLE,
                    },
                });
            }

            // Confirm to the user
            await sock.sendMessage(jid, {
                text:
                    '✅ *View-Once Saved!*\n\n' +
                    '📩 Media sent to bot\'s chat.\n\n' +
                    '⚡ _Zenitsu_',
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ vv2 error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: `❌ Failed: ${err.message}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
