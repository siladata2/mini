// ./events/autostatus.js

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const CONFIG_FILE = path.join(process.cwd(), 'database', 'autostatus.json');

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
        enabled: false,
        reactOn: false,
        emojis: ['⚡'],
        updatedAt: new Date().toISOString(),
    }, null, 2));
}

// ═══════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════

function getConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
    catch (err) { return { enabled: false, reactOn: false, emojis: ['⚡'] }; }
}

function saveConfig(data) {
    try {
        data.updatedAt = new Date().toISOString();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ autostatus save error:', err.message);
    }
}

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
// JID UTILS
// ═══════════════════════════════════════

/**
 * Extrait le numéro brut d'un JID (sans @xxx, sans :xx)
 * "50935123456@s.whatsapp.net" → "50935123456"
 * "50935123456:34@s.whatsapp.net" → "50935123456"
 * "82012345678912@lid" → "82012345678912"
 */
function getRawNumber(jid) {
    if (!jid) return '';
    let num = jid.split('@')[0];
    num = num.split(':')[0];
    return num.trim();
}

/**
 * Vérifie si un JID correspond au bot (owner)
 * Compare le numéro brut du sender avec TOUS les IDs possibles du bot
 */
function isOwner(sock, senderJid) {
    if (!senderJid) return false;

    const senderRaw = getRawNumber(senderJid);

    // Récupérer tous les IDs possibles du bot
    const botIds = [];

    // ID principal
    if (sock.user?.id) {
        botIds.push(getRawNumber(sock.user.id));
    }

    // LID (Linked Device ID)
    if (sock.user?.lid) {
        botIds.push(getRawNumber(sock.user.lid));
    }

    // Numéro owner depuis la config
    const ownerNumber = process.env.OWNER_NUMBER || '50935729494';
    botIds.push(ownerNumber);

    // Vérifier si le sender correspond à l'un des IDs
    return botIds.includes(senderRaw);
}

// ═══════════════════════════════════════
// ANTI-SPAM
// ═══════════════════════════════════════

const viewedStatuses = new Map();
const COOLDOWN = 300000;

setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of viewedStatuses) {
        if (now - timestamp > 600000) viewedStatuses.delete(key);
    }
}, 300000);

// ═══════════════════════════════════════
// MAIN EVENT
// ═══════════════════════════════════════

async function autostatusEvent(sock, update) {
    try {
        const config = getConfig();
        if (!config.enabled) return;

        if (update.messages) {
            for (const msg of update.messages) {
                if (msg.key?.remoteJid !== 'status@broadcast') continue;
                if (msg.key?.fromMe) continue;

                const statusOwner = msg.key.participant || msg.key.remoteJid;
                const cacheKey = `${statusOwner}_${msg.key.id}`;

                if (viewedStatuses.has(cacheKey)) continue;

                try {
                    await sock.readMessages([msg.key]);
                    viewedStatuses.set(cacheKey, Date.now());
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        await new Promise(r => setTimeout(r, 2000));
                        try { await sock.readMessages([msg.key]); } catch (_) {}
                    }
                }

                // React if enabled
                if (config.reactOn && config.emojis?.length > 0) {
                    const emoji = config.emojis[Math.floor(Math.random() * config.emojis.length)];

                    try {
                        await sock.sendMessage(statusOwner, {
                            react: { text: emoji, key: msg.key },
                        });
                    } catch (_) {}
                }
            }
        }

    } catch (err) {
        console.error('❌ autostatus event error:', err.message);
    }
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

async function autostatusCommand(sock, msg, args, jid) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // ⭐ Vérification owner corrigée
        if (!isOwner(sock, senderJid)) {
            return sock.sendMessage(jid, {
                text: '🚫 *Owner only!*\n\nThis command is restricted to the bot owner.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        const config = getConfig();
        const subCommand = args[0]?.toLowerCase();

        // STATUS
        if (!subCommand) {
            return sock.sendMessage(jid, {
                text:
                    '🔄 *Auto Status Settings*\n\n' +
                    `📱 *Auto View:* ${config.enabled ? '✅ ON' : '❌ OFF'}\n` +
                    `💫 *Reactions:* ${config.reactOn ? '✅ ON' : '❌ OFF'}\n` +
                    `🎯 *Emojis:* ${config.emojis?.join(' ') || '⚡'}\n\n` +
                    '📌 *Commands:*\n' +
                    '.autostatus on\n' +
                    '.autostatus off\n' +
                    '.autostatus react on\n' +
                    '.autostatus react off\n' +
                    '.autostatus emojis ⚡✨🎉',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // ON
        else if (subCommand === 'on') {
            config.enabled = true;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: '✅ *Auto Status View Enabled*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // OFF
        else if (subCommand === 'off') {
            config.enabled = false;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: '❌ *Auto Status View Disabled*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // REACT ON
        else if (subCommand === 'react' && args[1] === 'on') {
            config.reactOn = true;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: '💫 *Status Reactions Enabled*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // REACT OFF
        else if (subCommand === 'react' && args[1] === 'off') {
            config.reactOn = false;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: '❌ *Status Reactions Disabled*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // EMOJIS
        else if (subCommand === 'emojis' || subCommand === 'set') {
            const newEmojis = args.slice(1).filter(e => e.trim().length > 0);
            if (newEmojis.length === 0) {
                return sock.sendMessage(jid, {
                    text: '⚠️ Provide emojis.\nExample: .autostatus emojis ⚡✨🎉',
                    contextInfo: STYLE,
                }, { quoted: msg });
            }
            config.emojis = newEmojis;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: `✅ *Emojis Updated!*\n\n🎯 ${config.emojis.join(' ')}`,
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // UNKNOWN
        else {
            return sock.sendMessage(jid, {
                text: '❌ Unknown command.\n.autostatus on/off | react on/off | emojis ⚡✨',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

    } catch (err) {
        console.error('❌ autostatus command error:', err.message);
    }
}

module.exports = {
    event: 'messages.upsert',
    execute: autostatusEvent,
    name: 'autostatus',
    command: autostatusCommand,
};
