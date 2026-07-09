
// ./commands/link.js
'use strict';

module.exports = {
    name: 'link',
    aliases: ['grouplink', 'invite'],
    category: 'group',

    async execute({ sock, msg, args, jid }) {
        try {
            const isGroup = jid.endsWith('@g.us');

            if (!isGroup) {
                await sock.sendMessage(jid, {
                    text: '❌ This command only works in groups.'
                }, { quoted: msg });
                return;
            }

            // ═══════════════════════════════════════
            // GET GROUP INFO (Admin detection)
            // ═══════════════════════════════════════

            const groupInfo = await getGroupInfo(sock, jid);

            // Check if bot is admin
            if (!groupInfo.botIsAdmin) {
                await sock.sendMessage(jid, {
                    text: '🤖 Bot needs to be an admin to get the group link.'
                }, { quoted: msg });
                return;
            }

            // React to show processing
            try { await sock.sendMessage(jid, { react: { text: '🔗', key: msg.key } }); } catch (_) {}

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(jid);

            // Get group invite code
            const inviteCode = await sock.groupInviteCode(jid);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

            // Get group icon
            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(jid, 'image');
            } catch (_) {}

            const style = getCybernovaStyle();
            const groupName = groupMetadata.subject || 'Unknown Group';
            const memberCount = groupMetadata.participants.length;
            const adminCount = groupMetadata.participants.filter(p =>
                p.admin === 'admin' || p.admin === 'superadmin'
            ).length;

            // Prepare message
            let messageText =
`🔗 *Group Invite Link*

📌 *Group:* ${groupName}
👥 *Members:* ${memberCount}
👑 *Admins:* ${adminCount}
🔗 *Link:* ${inviteLink}

📝 *Note:* This link expires in 7 days or can be revoked by admins.

🛡️ _Zenitsu Group Manager_`;

            // Send with profile picture if available
            if (profilePic) {
                await sock.sendMessage(jid, {
                    image: { url: profilePic },
                    caption: messageText,
                    contextInfo: style
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    text: messageText,
                    contextInfo: style
                }, { quoted: msg });
            }

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ Link command error:', err);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text: `❌ Failed to get group link: ${err.message}`
            }, { quoted: msg });
        }
    }
};

// ═══════════════════════════════════════
// UTILITY FUNCTIONS (from antilink)
// ═══════════════════════════════════════

function cleanJid(jid) {
    if (!jid) return '';
    return jid.split(':')[0].trim();
}

function getNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
}

async function getGroupInfo(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        if (!metadata?.participants) {
            return { admins: [], botIsAdmin: false };
        }

        const admins = [];
        const botIds = [
            cleanJid(sock.user?.id),
            cleanJid(sock.user?.lid),
            getNumber(sock.user?.id)
        ].filter(Boolean);

        let botIsAdmin = false;

        for (const participant of metadata.participants) {
            const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
            if (!isAdmin) continue;

            admins.push(participant.id);

            const participantIds = [
                cleanJid(participant.id),
                getNumber(participant.id)
            ];

            if (botIds.some(id => participantIds.includes(id))) {
                botIsAdmin = true;
            }
        }

        return { admins, botIsAdmin };
    } catch (error) {
        console.error('❌ Admin detection error:', error.message);
        return { admins: [], botIsAdmin: false };
    }
}

function getCybernovaStyle() {
    return {
        forwardingScore: 350,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363425394543602@newsletter',
            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
            serverMessageId: 202,
        },
    };
}
