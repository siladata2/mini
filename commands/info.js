const moment = require('moment');

module.exports = {
    name: 'info',
    aliases: ['groupinfo', 'group', 'gcinfo'],
    category: 'group',

    async execute({ sock, msg, args, jid }) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');

        if (!isGroup) {
            await sock.sendMessage(jid, {
                text: '❌ This command only works in groups.'
            }, { quoted: msg });
            return;
        }

        try {
            // React to show processing
            try { await sock.sendMessage(jid, { react: { text: '📊', key: msg.key } }); } catch (_) {}

            // Get group metadata
            const groupMetadata = await sock.groupMetadata(jid);
            const participants = groupMetadata.participants;

            // Robust Bot Identifier matching array (including LID fallback tracking)
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const botLid = sock.user.lid || '';
            const KNOWN_BOT_IDS = [botId, botLid, '584168698003@s.whatsapp.net', '83022472810538@lid'].filter(Boolean);

            // Filter Admins & calculate stats
            const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const totalMembers = participants.length;
            const adminCount = admins.length;
            
            const botIsAdmin = participants.some(p =>
                KNOWN_BOT_IDS.includes(p.id) && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            // Get group creation date
            let createdTime = 'Unknown';
            try {
                if (groupMetadata.creation) {
                    createdTime = moment(groupMetadata.creation * 1000).format('DD/MM/YYYY HH:mm:ss');
                }
            } catch (_) {}

            // Get group profile picture URL
            let profilePic = null;
            try {
                profilePic = await sock.profilePictureUrl(jid, 'image');
            } catch (_) {}

            // Get group invite link (only possible if bot is admin)
            let inviteLink = 'Not available (Bot is not admin)';
            try {
                if (botIsAdmin) {
                    const inviteCode = await sock.groupInviteCode(jid);
                    inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
                }
            } catch (_) {}

            // Initialize structural array to store mentions
            const mentionJids = [];
            if (groupMetadata.owner) mentionJids.push(groupMetadata.owner);

            // Build Group Description text string securely
            const description = groupMetadata.desc || 'No description available.';

            // ═══════════════════════════════════════
            // CONSTRUCT SINGLE UNIFIED STRING
            // ═══════════════════════════════════════
            
            let infoText =
`📊 *GROUP INFORMATION*

📌 *Name:* ${groupMetadata.subject || 'Unknown'}
👤 *Owner:* ${groupMetadata.owner ? `@${getNumber(groupMetadata.owner)}` : 'Unknown'}
📅 *Created:* ${createdTime}

👥 *Members:* ${totalMembers}
👑 *Admins:* ${adminCount}
🤖 *Bot Admin:* ${botIsAdmin ? '✅ Yes' : '❌ No'}

📝 *Description:* 
_${description}_

🔗 *Invite Link:* 
${inviteLink}

👑 *ADMINISTRATORS LIST:*
`;

            // Append each admin line and fill up mentions array
            for (const admin of admins) {
                mentionJids.push(admin.id);
                const isBotMarker = KNOWN_BOT_IDS.includes(admin.id) ? ' 🤖' : '';
                infoText += ` ➔ 👤 @${getNumber(admin.id)}${isBotMarker}\n`;
            }

            infoText += `\n🛡️ _Zenitsu Group Manager_`;

            // Setup display context metadata payload with unique mentions filter
            const styleContext = {
                forwardingScore: 350,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363425394543602@newsletter',
                    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                    serverMessageId: 202,
                },
                mentionedJid: [...new Set(mentionJids)] // Cleans duplicates if owner is an admin
            };

            // ═══════════════════════════════════════
            // TRANSMIT SINGLE MESSAGE
            // ═══════════════════════════════════════
            
            if (profilePic) {
                await sock.sendMessage(jid, {
                    image: { url: profilePic },
                    caption: infoText,
                    contextInfo: styleContext
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    text: infoText,
                    contextInfo: styleContext
                }, { quoted: msg });
            }

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ Info command error:', err);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text: `❌ Failed to retrieve group information: ${err.message}`
            }, { quoted: msg });
        }
    }
};

function getNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
}
