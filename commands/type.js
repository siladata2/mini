// ./commands/type.js

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
// GET MESSAGE TYPE
// ═══════════════════════════════════════

function getMessageType(message) {
    if (!message) return 'Unknown';

    if (message.conversation) return '📝 Text';
    if (message.extendedTextMessage) return '📝 Text (extended)';
    if (message.imageMessage) return message.imageMessage.viewOnce ? '🖼️ View-Once Image' : '🖼️ Image';
    if (message.videoMessage) return message.videoMessage.viewOnce ? '🎬 View-Once Video' : '🎬 Video';
    if (message.stickerMessage) return message.stickerMessage.isAnimated ? '🎯 Animated Sticker (GIF)' : '🎯 Sticker';
    if (message.audioMessage) {
        if (message.audioMessage.ptt) return '🎤 Voice Note';
        return '🎵 Audio';
    }
    if (message.documentMessage) return '📄 Document';
    if (message.contactMessage) return '👤 Contact';
    if (message.contactsArrayMessage) return '👥 Contacts Array';
    if (message.locationMessage) return '📍 Location';
    if (message.liveLocationMessage) return '📍 Live Location';
    if (message.reactionMessage) return '💫 Reaction';
    if (message.pollCreationMessage) return '📊 Poll';
    if (message.buttonsMessage) return '🔘 Buttons';
    if (message.templateMessage) return '📋 Template';
    if (message.listMessage) return '📋 List';
    if (message.listResponseMessage) return '📋 List Response';
    if (message.buttonsResponseMessage) return '🔘 Button Response';
    if (message.productMessage) return '🛒 Product';
    if (message.orderMessage) return '📦 Order';
    if (message.viewOnceMessage) return '👁️ View-Once (wrapped)';
    if (message.viewOnceMessageV2) return '👁️ View-Once V2 (wrapped)';
    if (message.ephemeralMessage) return '⏳ Ephemeral';
    if (message.editedMessage) return '✏️ Edited Message';
    if (message.groupInviteMessage) return '🔗 Group Invite';
    if (message.chat) return '💬 Chat';

    // Retourner la première clé trouvée
    const keys = Object.keys(message);
    const typeKey = keys.find(k => k.endsWith('Message') || k === 'conversation');
    return typeKey ? `📦 ${typeKey}` : '❓ Unknown';
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'type',
    aliases: ['msgtype', 'messagetype', 'whatisthis'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetMessage = quoted || msg.message;

        if (!targetMessage) {
            return sock.sendMessage(jid, {
                text: '❌ No message found.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        const msgType = getMessageType(targetMessage);

        // Infos supplémentaires
        let extraInfo = '';

        if (targetMessage.imageMessage) {
            const img = targetMessage.imageMessage;
            extraInfo += `📏 *Dimensions:* ${img.height || '?'}×${img.width || '?'}\n`;
            if (img.fileLength) extraInfo += `📦 *Size:* ${(img.fileLength / 1024).toFixed(2)} KB\n`;
            if (img.mimetype) extraInfo += `📐 *MIME:* ${img.mimetype}\n`;
        }

        if (targetMessage.videoMessage) {
            const vid = targetMessage.videoMessage;
            if (vid.seconds) extraInfo += `⏱ *Duration:* ${vid.seconds}s\n`;
            if (vid.height) extraInfo += `📏 *Dimensions:* ${vid.height}×${vid.width || '?'}\n`;
            if (vid.fileLength) extraInfo += `📦 *Size:* ${(vid.fileLength / 1024).toFixed(2)} KB\n`;
        }

        if (targetMessage.audioMessage) {
            const aud = targetMessage.audioMessage;
            if (aud.seconds) extraInfo += `⏱ *Duration:* ${aud.seconds}s\n`;
            if (aud.ptt) extraInfo += `🎤 *PTT:* Yes\n`;
        }

        if (targetMessage.stickerMessage) {
            const stk = targetMessage.stickerMessage;
            if (stk.isAnimated) extraInfo += `🎬 *Animated:* Yes\n`;
            if (stk.height) extraInfo += `📏 *Dimensions:* ${stk.height}×${stk.width || '?'}\n`;
        }

        await sock.sendMessage(jid, {
            text:
                `📋 *Message Type*\n\n` +
                `📦 *Type:* ${msgType}\n` +
                (extraInfo ? `\n${extraInfo}` : '') +
                `⚡ _Zenitsu_`,
            contextInfo: STYLE,
        }, { quoted: msg });
    },
};
