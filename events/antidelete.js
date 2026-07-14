// ./events/antidelete.js

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const crypto = require('crypto');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const CONFIG_FILE = path.join(process.cwd(), 'database', 'antidelete.json');

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify({ enabled: false }, null, 2));

function getConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
    catch (err) { return { enabled: false }; }
}

function saveConfig(data) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error('❌ antidelete save error:', err.message); }
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
// MESSAGE CACHE
// ═══════════════════════════════════════

const messageCache = new Map();
const CACHE_SIZE = 5000;

function cacheMessage(msg) {
    if (!msg.key?.id || !msg.message) return;
    const key = `${msg.key.remoteJid}_${msg.key.id}`;
    messageCache.set(key, {
        message: msg.message,
        key: msg.key,
        timestamp: Date.now(),
    });

    // Nettoyer le cache si trop grand
    if (messageCache.size > CACHE_SIZE) {
        const firstKey = messageCache.keys().next().value;
        messageCache.delete(firstKey);
    }
}

function getCachedMessage(msgKey) {
    if (!msgKey?.id || !msgKey?.remoteJid) return null;
    const key = `${msgKey.remoteJid}_${msgKey.id}`;
    return messageCache.get(key) || null;
}

// Nettoyage périodique
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of messageCache) {
        if (now - value.timestamp > 600000) messageCache.delete(key);
    }
}, 120000);

// ═══════════════════════════════════════
// GET MESSAGE TYPE
// ═══════════════════════════════════════

function getMessageType(message) {
    if (!message) return 'Unknown';
    const keys = Object.keys(message);
    if (keys.includes('conversation')) return 'Text';
    if (keys.includes('extendedTextMessage')) return 'Text';
    if (keys.includes('imageMessage')) return 'Image';
    if (keys.includes('videoMessage')) return 'Video';
    if (keys.includes('stickerMessage')) return 'Sticker';
    if (keys.includes('audioMessage')) return message.audioMessage?.ptt ? 'Voice Note' : 'Audio';
    if (keys.includes('documentMessage')) return 'Document';
    if (keys.includes('contactMessage')) return 'Contact';
    if (keys.includes('locationMessage')) return 'Location';
    if (keys.includes('liveLocationMessage')) return 'Live Location';
    if (keys.includes('reactionMessage')) return 'Reaction';
    if (keys.includes('pollMessage')) return 'Poll';
    if (keys.includes('buttonsMessage')) return 'Buttons';
    if (keys.includes('templateMessage')) return 'Template';
    if (keys.includes('listMessage')) return 'List';
    if (keys.includes('productMessage')) return 'Product';
    if (keys.includes('orderMessage')) return 'Order';
    return keys[0] || 'Unknown';
}

// ═══════════════════════════════════════
// MAIN EVENT — Cache messages + Handle delete
// ═══════════════════════════════════════

async function antideleteEvent(sock, update) {
    try {
        const config = getConfig();
        if (!config.enabled) {
            // Cache only (no anti-delete)
            if (update.messages) {
                for (const msg of update.messages) {
                    cacheMessage(msg);
                }
            }
            return;
        }

        // Handle new messages → cache them
        if (update.messages) {
            for (const msg of update.messages) {
                if (msg.key?.fromMe) continue;
                cacheMessage(msg);
            }
        }

        // Handle deleted messages
        if (update.type === 'delete' || update.deleted) {
            const deletedKeys = update.keys || update.deleted || [];

            for (const key of deletedKeys) {
                const cached = getCachedMessage(key);
                if (!cached) continue;

                const botJid = sock.user?.id || '';
                if (!botJid) continue;

                const senderJid = key.participant || key.remoteJid || '';
                const senderNumber = senderJid.split('@')[0].split(':')[0];
                const chatJid = key.remoteJid;
                const isGroup = chatJid?.endsWith('@g.us');
                const msgType = getMessageType(cached.message);

                // Notifier le bot
                await sock.sendMessage(botJid, {
                    text:
                        '🗑️ *Anti-Delete Alert*\n\n' +
                        `👤 *From:* @${senderNumber}\n` +
                        (isGroup ? `👥 *Group:* ${chatJid.split('@')[0]}\n` : '📱 *Chat:* Private\n') +
                        `📄 *Type:* ${msgType}\n` +
                        `🕒 *Deleted:* ${new Date().toLocaleTimeString('en-US')}\n\n` +
                        '📌 *Content below ↓*',
                    contextInfo: {
                        mentionedJid: [senderJid],
                        ...STYLE,
                    },
                });

                // Relayer le contenu supprimé
                try {
                    const relayMessage = {
                        key: {
                            remoteJid: botJid,
                            fromMe: false,
                            id: crypto.randomBytes(8).toString('hex'),
                            participant: senderJid,
                        },
                        message: cached.message,
                    };

                    await sock.relayMessage(botJid, relayMessage.message, {
                        messageId: relayMessage.key.id,
                    });
                } catch (relayErr) {
                    // Fallback : envoyer le texte si le relay échoue
                    const text = cached.message?.conversation
                        || cached.message?.extendedTextMessage?.text
                        || cached.message?.imageMessage?.caption
                        || cached.message?.videoMessage?.caption
                        || '';

                    if (text) {
                        await sock.sendMessage(botJid, {
                            text: `📝 *Deleted Text:*\n${text}`,
                            contextInfo: STYLE,
                        });
                    }
                }
            }
        }

    } catch (err) {
        console.error('❌ antidelete event error:', err.message);
    }
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

async function antideleteCommand(sock, msg, args, jid) {
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const ownerNumber = process.env.OWNER_NUMBER || '50935729494';
        const isOwner = senderJid.includes(ownerNumber)
            || (sock.user?.id && sock.user.id.includes(senderJid.split('@')[0]))
            || (sock.user?.lid && sock.user.lid.includes(senderJid.split('@')[0]));

        if (!isOwner) {
            return sock.sendMessage(jid, {
                text: '🚫 *Owner only!*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        const config = getConfig();
        const subCommand = args[0]?.toLowerCase();

        // STATUS
        if (!subCommand) {
            return sock.sendMessage(jid, {
                text:
                    '🗑️ *Anti-Delete*\n\n' +
                    `📊 *Status:* ${config.enabled ? '✅ ON' : '❌ OFF'}\n\n` +
                    '📌 *Commands:*\n' +
                    '.antidelete on\n' +
                    '.antidelete off',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // ON
        if (subCommand === 'on') {
            config.enabled = true;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text:
                    '✅ *Anti-Delete Enabled*\n\n' +
                    '🗑️ Deleted messages will be sent to bot.\n' +
                    '📄 Supports: text, media, stickers, GIFs, voice notes.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        // OFF
        if (subCommand === 'off') {
            config.enabled = false;
            saveConfig(config);
            return sock.sendMessage(jid, {
                text: '❌ *Anti-Delete Disabled*',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        return sock.sendMessage(jid, {
            text: '⚠️ Use .antidelete on or .antidelete off',
            contextInfo: STYLE,
        }, { quoted: msg });

    } catch (err) {
        console.error('❌ antidelete command error:', err.message);
    }
}

module.exports = {
    event: 'messages.upsert',
    execute: antideleteEvent,
    name: 'antidelete',
    command: antideleteCommand,
};
