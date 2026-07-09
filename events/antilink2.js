// ./events/antilink2.js
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const DATABASE_DIR = path.join(process.cwd(), 'database');
const CONFIG_FILE = path.join(DATABASE_DIR, 'antilink2.json');

if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, '{}');
}

// ═══════════════════════════════════════
// DATABASE ENGINE
// ═══════════════════════════════════════

function getDB() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (err) {
        console.error('❌ AntiLink2 database read error:', err.message);
        return {};
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ AntiLink2 database save error:', err.message);
    }
}

// ═══════════════════════════════════════
// WARNING SYSTEM
// ═══════════════════════════════════════

const warnings = new Map();

function addWarning(groupJid, userJid) {
    const key = `${groupJid}_${userJid}`;
    const count = (warnings.get(key) || 0) + 1;
    warnings.set(key, count);
    return count;
}

function resetWarnings(groupJid, userJid) {
    warnings.delete(`${groupJid}_${userJid}`);
}

function resetAllWarnings(groupJid) {
    const keysToDelete = [];
    for (const key of warnings.keys()) {
        if (key.startsWith(`${groupJid}_`)) {
            keysToDelete.push(key);
        }
    }
    for (const key of keysToDelete) {
        warnings.delete(key);
    }
}

setInterval(() => {
    warnings.clear();
}, 30 * 60 * 1000);

// ═══════════════════════════════════════
// UNIVERSAL MESSAGE TEXT EXTRACTOR
// ═══════════════════════════════════════

function extractMessageText(message) {
    if (!message) return '';

    if (message.editedMessage) {
        return extractMessageText(message.editedMessage.message);
    }

    if (message.ephemeralMessage) {
        return extractMessageText(message.ephemeralMessage.message);
    }

    if (message.viewOnceMessage) {
        return extractMessageText(message.viewOnceMessage.message);
    }

    if (message.viewOnceMessageV2) {
        return extractMessageText(message.viewOnceMessageV2.message);
    }

    if (message.viewOnceMessageV2Extension) {
        return extractMessageText(message.viewOnceMessageV2Extension.message);
    }

    if (typeof message.conversation === 'string') {
        return message.conversation;
    }

    if (message.extendedTextMessage && typeof message.extendedTextMessage.text === 'string') {
        return message.extendedTextMessage.text;
    }

    if (message.imageMessage && typeof message.imageMessage.caption === 'string') {
        return message.imageMessage.caption;
    }

    if (message.videoMessage && typeof message.videoMessage.caption === 'string') {
        return message.videoMessage.caption;
    }

    if (message.documentMessage && typeof message.documentMessage.caption === 'string') {
        return message.documentMessage.caption;
    }

    if (message.buttonsResponseMessage && typeof message.buttonsResponseMessage.selectedDisplayText === 'string') {
        return message.buttonsResponseMessage.selectedDisplayText;
    }

    if (message.listResponseMessage && typeof message.listResponseMessage.title === 'string') {
        return message.listResponseMessage.title;
    }

    if (message.templateButtonReplyMessage && typeof message.templateButtonReplyMessage.selectedDisplayText === 'string') {
        return message.templateButtonReplyMessage.selectedDisplayText;
    }

    return '';
}

// ═══════════════════════════════════════
// LINK DETECTION ENGINE
// All HTTP/HTTPS links
// ═══════════════════════════════════════

function hasAnyLink(text) {
    if (!text || typeof text !== 'string') return false;
    const regex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;
    return regex.test(text);
}

// ═══════════════════════════════════════
// JID / LID UTILITIES
// ═══════════════════════════════════════

function cleanJid(jid) {
    if (!jid) return '';
    return jid.split(':')[0].trim();
}

function getNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
}

// ═══════════════════════════════════════
// ADMIN ENGINE
// ═══════════════════════════════════════

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

function isAdmin(admins, userJid) {
    const userClean = cleanJid(userJid);
    const userNumber = getNumber(userJid);

    return admins.some(admin => {
        return cleanJid(admin) === userClean || getNumber(admin) === userNumber;
    });
}

// ═══════════════════════════════════════
// STYLE FUNCTIONS
// ═══════════════════════════════════════

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

// ═══════════════════════════════════════
// MAIN ANTILINK2 EVENT ENGINE
// ═══════════════════════════════════════

async function processAntiLink2(sock, msg) {
    try {
        if (!msg?.message) return;
        if (msg.key.fromMe) return;

        const groupJid = msg.key.remoteJid;
        if (!groupJid?.endsWith('@g.us')) return;

        const db = getDB();
        if (!db[groupJid]?.enabled) return;

        const sender = msg.key.participant || groupJid;
        const { admins, botIsAdmin } = await getGroupInfo(sock, groupJid);

        if (!botIsAdmin) return;
        if (isAdmin(admins, sender)) return;

        const text = extractMessageText(msg.message);
        if (!text || !hasAnyLink(text)) return;

        // Delete offending message
        try {
            await sock.sendMessage(groupJid, { delete: msg.key });
        } catch (error) {
            console.log('⚠️ Delete failed:', error.message);
        }

        const warning = addWarning(groupJid, sender);
        const remaining = 3 - warning;
        const mentionList = [sender, ...admins];
        const style = getCybernovaStyle();

        // Send warning only on first and third warning
        if (warning === 1) {
            await sock.sendMessage(groupJid, {
                text: 
`⚠️ *ANTI-LINK V2 PROTECTION*

👤 @${getNumber(sender)}

🚫 All HTTP/HTTPS links are forbidden.

⚠️ Warning: ${warning}/3

⏳ Remaining: ${remaining}

🛡️ Zenitsu Security System`,
                contextInfo: { mentionedJid: mentionList, ...style }
            }, { quoted: msg });
            return;
        }

        if (warning === 2) {
            // Silently increment warning without sending message
            return;
        }

        if (warning >= 3) {
            // Third warning = kick
            resetWarnings(groupJid, sender);

            try {
                await sock.groupParticipantsUpdate(groupJid, [sender], 'remove');

                await sock.sendMessage(groupJid, {
                    text: 
`🚫 *USER REMOVED* (V2)

👤 @${getNumber(sender)}

Reason: Maximum Anti-Link V2 warnings reached (3/3).`,
                    contextInfo: { mentionedJid: [sender, ...admins], ...style }
                }, { quoted: msg });
            } catch (error) {
                await sock.sendMessage(groupJid, {
                    text: 
`⚠️ User reached 3/3 warnings but could not be removed.

👤 @${getNumber(sender)}

Admins must remove manually.`,
                    contextInfo: { mentionedJid: [sender, ...admins], ...style }
                }, { quoted: msg });
            }
        }
    } catch (error) {
        console.error('❌ AntiLink2 processing error:', error.message);
    }
}

// ═══════════════════════════════════════
// EVENT HANDLER
// ═══════════════════════════════════════

async function antilink2Event(sock, update) {
    try {
        if (!update) return;

        if (update.messages) {
            for (const msg of update.messages) {
                await processAntiLink2(sock, msg);
            }
        }

        if (Array.isArray(update)) {
            for (const item of update) {
                if (item.update?.message) {
                    await processAntiLink2(sock, {
                        ...item,
                        message: item.update.message
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ AntiLink2 event error:', error.message);
    }
}

// ═══════════════════════════════════════
// ANTILINK2 COMMAND
// ═══════════════════════════════════════

async function antilink2Command(sock, msg, args, jid) {
    try {
        if (!jid?.endsWith('@g.us')) {
            return sock.sendMessage(jid, {
                text: '❌ This command works only inside groups.'
            }, { quoted: msg });
        }

        const sender = msg.key.participant || msg.key.remoteJid;
        const { admins, botIsAdmin } = await getGroupInfo(sock, jid);

        if (!isAdmin(admins, sender)) {
            return sock.sendMessage(jid, {
                text: '🚫 Only group administrators can use Anti-Link V2.'
            }, { quoted: msg });
        }

        const db = getDB();
        const option = args[0]?.toLowerCase();
        const style = getCybernovaStyle();

        // RESET
        if (option === 'reset') {
            if (db[jid]?.enabled) {
                resetAllWarnings(jid);
                return sock.sendMessage(jid, {
                    text: 
`✅ *WARNINGS RESET (V2)*

All Anti-Link V2 warnings have been cleared.

🛡️ Zenitsu Security System`,
                    contextInfo: style
                }, { quoted: msg });
            } else {
                return sock.sendMessage(jid, {
                    text: 
`⚠️ *ANTI-LINK V2 NOT ACTIVE*

Anti-Link V2 is currently disabled.

Usage:
.antilink2 on
.antilink2 off
.antilink2 reset`,
                    contextInfo: style
                }, { quoted: msg });
            }
        }

        // ENABLE
        if (option === 'on' || option === 'enable') {
            if (!botIsAdmin) {
                return sock.sendMessage(jid, {
                    text: '🤖 Bot must be admin before enabling Anti-Link V2.'
                }, { quoted: msg });
            }

            db[jid] = {
                enabled: true,
                enabledBy: getNumber(sender),
                enabledAt: new Date().toISOString()
            };
            saveDB(db);

            return sock.sendMessage(jid, {
                text: 
`✅ *ANTI-LINK V2 ENABLED*

🌐 All HTTP/HTTPS links: Blocked
📢 WhatsApp links: Blocked
🔗 Any link: Blocked

⚠️ Maximum warnings: 3

🛡️ Zenitsu Protection Active`,
                contextInfo: style
            }, { quoted: msg });
        }

        // DISABLE
        if (option === 'off' || option === 'disable') {
            delete db[jid];
            saveDB(db);

            return sock.sendMessage(jid, {
                text: 
`❌ *ANTI-LINK V2 DISABLED*

Anti-Link V2 protection has been deactivated.

🛡️ Zenitsu Security System`,
                contextInfo: style
            }, { quoted: msg });
        }

        // STATUS
        const active = db[jid]?.enabled === true;

        return sock.sendMessage(jid, {
            text: 
`🔗 *ANTI-LINK V2 STATUS*

Mode: ${active ? '✅ ACTIVE' : '❌ OFF'}

Protection: ${active ? 'All links blocked' : 'Disabled'}

Usage:
.antilink2 on
.antilink2 off
.antilink2 reset

🛡️ Zenitsu Security System`,
            contextInfo: style
        }, { quoted: msg });
    } catch (error) {
        console.error('❌ AntiLink2 command error:', error.message);
    }
}

// ═══════════════════════════════════════
// MODULE EXPORT
// ═══════════════════════════════════════

module.exports = {
    event: 'messages.upsert',
    execute: antilink2Event,
    name: 'antilink2',
    command: antilink2Command
};
