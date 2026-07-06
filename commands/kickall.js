
// ./commands/kickall.js

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'kickall',
    aliases: ['removeall', 'clearall', 'purge', 'resetgroup'],
    category: 'group',

    async execute({ sock, msg, args, jid }) {
        // ── Group only ──
        if (!jid.endsWith('@g.us')) {
            return sock.sendMessage(jid, {
                text: '❌ This command only works in groups.',
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

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const ownerNumber = process.env.OWNER_NUMBER || '50935729494';
        const isOwner = senderJid.includes(ownerNumber);

        // ── Get group metadata ──
        let metadata;
        try {
            metadata = await sock.groupMetadata(jid);
        } catch (err) {
            return sock.sendMessage(jid, {
                text: '❌ Failed to get group info.',
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

        // ── Check if sender is admin or owner ──
        const participant = metadata.participants.find(p => p.id === senderJid);
        const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(jid, {
                text: '🚫 *Admins only!*\n\nOnly group admins or the bot owner can use this command.',
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

        // ── Check if bot is admin ──
        const botJid = sock.user?.id || '';
        const botNumber = botJid.split(':')[0].split('@')[0];
        const botParticipant = metadata.participants.find(p => {
            const pNum = p.id.split(':')[0].split('@')[0];
            return pNum === botNumber;
        });
        const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

        if (botIsAdmin) {
            return sock.sendMessage(jid, {
                text:
                    '🤖 *Bot must be admin!*\n\n' +
                    'Promote the bot to admin first.\n\n' +
                    '⚡ _Zenitsu_',
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

        // ── Filter members to kick (exclude admins and owner) ──
        const membersToKick = metadata.participants.filter(p => {
            // Keep admins, superadmins, and the bot
            if (p.admin === 'admin' || p.admin === 'superadmin') return false;
            const pNum = p.id.split(':')[0].split('@')[0];
            if (pNum === botNumber) return false;
            if (isOwner && pNum === ownerNumber) return false;
            return true;
        });

        if (membersToKick.length === 0) {
            return sock.sendMessage(jid, {
                text:
                    '⚠️ *No members to kick!*\n\n' +
                    'All members are admins.\n\n' +
                    '⚡ _Zenitsu_',
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

        // ── Confirmation (skip if "force" argument) ──
        const forceMode = args[0]?.toLowerCase() === 'force' || args[0]?.toLowerCase() === '-f';

        if (!forceMode) {
            // Send header image with confirmation
            try {
                await sock.sendMessage(jid, {
                    image: { url: 'https://iili.io/CcjxqtR.jpg' },
                    caption:
                        '⚠️ *KICK ALL — CONFIRMATION*\n\n' +
                        `👥 *Members to kick:* ${membersToKick.length}\n` +
                        `👑 *Admins kept:* ${metadata.participants.length - membersToKick.length}\n\n` +
                        '📌 *Are you sure?*\n\n' +
                        'Use ${prefix}goodbye off before this action' +
                        'Type *${prefix}kickall force* to confirm\n' +
                        'or *{prefix}kickall cancel* to abort.\n\n' +
                        '⏳ *This will expire in 30 seconds.*\n\n' +
                        '⚡ _Zenitsu Group Management_',
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

                // Store pending kickall
                global.pendingKickAll = global.pendingKickAll || new Map();
                global.pendingKickAll.set(jid, {
                    membersToKick,
                    metadata,
                    botNumber,
                    ownerNumber,
                    expires: Date.now() + 30000,
                });

                // Auto-clean after 30 seconds
                setTimeout(() => {
                    const pending = global.pendingKickAll?.get(jid);
                    if (pending && Date.now() > pending.expires) {
                        global.pendingKickAll.delete(jid);
                    }
                }, 30000);

                return;
            } catch (err) {
                console.error('❌ kickall header error:', err.message);
            }
        }

        // ── Cancel ──
        if (args[0]?.toLowerCase() === 'cancel') {
            if (global.pendingKickAll) {
                global.pendingKickAll.delete(jid);
            }
            return sock.sendMessage(jid, {
                text: '❌ *Kick All Cancelled*',
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

        // ── Get pending or use current ──
        let targetMembers = membersToKick;
        if (global.pendingKickAll?.has(jid)) {
            const pending = global.pendingKickAll.get(jid);
            if (Date.now() < pending.expires) {
                targetMembers = pending.membersToKick;
            }
            global.pendingKickAll.delete(jid);
        }

        // ── Execute kickall ──
        await executeKickAll(sock, jid, targetMembers, msg);

    },
};

// ═══════════════════════════════════════
// EXECUTE KICK ALL
// ═══════════════════════════════════════

async function executeKickAll(sock, jid, membersToKick, originalMsg) {
    const total = membersToKick.length;
    let kicked = 0;
    let failed = 0;
    let lastProgress = -1;

    // Send initial progress
    try {
        await sock.sendMessage(jid, {
            text:
                '🔄 *KICK ALL — STARTED*\n\n' +
                `👥 *Total:* ${total} members\n` +
                `📊 *Progress:* 0%\n\n` +
                '⏳ Please wait...',
            contextInfo: {
                forwardingScore: 350,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363425394543602@newsletter',
                    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                    serverMessageId: 202,
                },
            },
        });
    } catch (_) {}

    for (let i = 0; i < membersToKick.length; i++) {
        const member = membersToKick[i];

        try {
            await sock.groupParticipantsUpdate(jid, [member.id], 'remove');
            kicked++;
        } catch (err) {
            failed++;
            console.log(`⚠️ Failed to kick ${member.id}: ${err.message}`);
        }

        // Show progress every 10%
        const progress = Math.floor(((i + 1) / total) * 100);
        const progressMilestone = Math.floor(progress / 10) * 10;

        if (progressMilestone > lastProgress && progressMilestone <= 100) {
            lastProgress = progressMilestone;

            const progressBar = generateProgressBar(progressMilestone);

            try {
                await sock.sendMessage(jid, {
                    text:
                        '🔄 *KICK ALL — IN PROGRESS*\n\n' +
                        `${progressBar}\n\n` +
                        `📊 *Progress:* ${progressMilestone}%\n` +
                        `✅ *Kicked:* ${kicked}\n` +
                        `❌ *Failed:* ${failed}\n` +
                        `⏳ *Remaining:* ${total - (i + 1)}\n\n` +
                        '⚡ _Zenitsu Group Management_',
                    contextInfo: {
                        forwardingScore: 350,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202,
                        },
                    },
                });
            } catch (_) {}
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    // Final report
    const finalBar = generateProgressBar(100);

    try {
        await sock.sendMessage(jid, {
            image: { url: 'https://iili.io/CcjxqtR.jpg' },
            caption:
                '✅ *KICK ALL — COMPLETED*\n\n' +
                `${finalBar}\n\n` +
                `📊 *Progress:* 100%\n` +
                `✅ *Kicked:* ${kicked}\n` +
                `❌ *Failed:* ${failed}\n` +
                `📦 *Total:* ${total}\n\n` +
                '👑 *Admins and bot were kept.*\n\n' +
                '⚡ _Zenitsu Group Management_',
            contextInfo: {
                forwardingScore: 350,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363425394543602@newsletter',
                    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                    serverMessageId: 202,
                },
            },
        }, { quoted: originalMsg });
    } catch (_) {}
}

// ═══════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════

function generateProgressBar(percent) {
    const filled = Math.floor(percent / 10);
    const empty = 10 - filled;

    let bar = '';
    for (let i = 0; i < filled; i++) bar += '█';
    for (let i = 0; i < empty; i++) bar += '░';

    return `[${bar}] ${percent}%`;
}
