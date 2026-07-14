// ./events/groupopen.js

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
// EVENT — Group settings update
// ═══════════════════════════════════════

async function groupOpenEvent(sock, update) {
    try {
        // Vérifier si c'est une mise à jour de groupe (ouverture/fermeture)
        if (!update.announce === false && update.announce !== true) {
            // Vérifier si c'est dans le bon format
            if (!update.id || update.announce === undefined) return;
        }

        const groupJid = update.id;
        if (!groupJid?.endsWith('@g.us')) return;

        // Vérifier si le groupe vient d'être OUVERT (announce = false)
        if (update.announce !== false) return;

        // Récupérer les infos du groupe
        let metadata;
        try {
            metadata = await sock.groupMetadata(groupJid);
        } catch (err) {
            console.error('❌ groupOpen metadata error:', err.message);
            return;
        }

        if (!metadata?.participants) return;

        const groupName = metadata.subject || 'Group';
        const memberCount = metadata.participants.length;

        // Récupérer la photo de profil du groupe
        let groupPfp = 'https://files.catbox.moe/uklx8n.jpg';
        try {
            groupPfp = await sock.profilePictureUrl(groupJid, 'image');
        } catch (_) {}

        // Mentionner tous les membres
        const allMembers = metadata.participants.map(p => p.id);

        // Message de notification
        await sock.sendMessage(groupJid, {
            image: { url: groupPfp },
            caption:
                '🔓 *Group Opened!*\n\n' +
                `📢 *${groupName}*\n` +
                `👥 *Members:* ${memberCount}\n\n` +
                '💬 Everyone can now send messages.\n\n' +
                allMembers.map(m => `@${m.split('@')[0].split(':')[0]}`).join(' ') + '\n\n' +
                '⚡ _Zenitsu Group Notify_',
            contextInfo: {
                mentionedJid: allMembers,
                ...STYLE,
            },
        });

    } catch (err) {
        console.error('❌ groupOpen event error:', err.message);
    }
}

module.exports = {
    event: 'groups.update',
    execute: groupOpenEvent,
};
