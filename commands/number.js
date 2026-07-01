
// ./commands/number.js

const axios = require('axios');

// ═══════════════════════════════════════
// STORE ACTIVE NUMBERS (per user)
// ═══════════════════════════════════════

const activeNumbers = new Map();

// ═══════════════════════════════════════
// COUNTRIES LIST
// ═══════════════════════════════════════

const COUNTRIES = [
    'random',
    'UK',
    'Indonesia',
    'Belgium',
    'USA',
    'France',
    'Germany',
    'Netherlands',
    'Philippines',
    'Malaysia',
];

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'number',
    aliases: ['sms', 'temp', 'tempmail', 'fakenumber', 'smsnumber'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const subCommand = args[0]?.toLowerCase();

        // ═══════════════════════════════════════
        // HELP
        // ═══════════════════════════════════════

        if (!subCommand || subCommand === 'help') {
            const countryList = COUNTRIES.map(c => `  ▸ ${c}`).join('\n');

            return sock.sendMessage(jid, {
                text:
                    '📱 *Temporary Number — Receive SMS*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.number generate [country]\n' +
                    '.number inbox\n' +
                    '.number stop\n' +
                    '.number status\n\n' +
                    '🌍 *Available Countries:*\n' +
                    `${countryList}\n\n` +
                    '✨ *Examples:*\n' +
                    '.number generate\n' +
                    '.number generate UK\n' +
                    '.number inbox\n' +
                    '.number stop\n\n' +
                    '💡 Number is valid for 10 minutes.\n' +
                    '📩 Inbox checks messages every 10 seconds.',
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

        // ═══════════════════════════════════════
        // GENERATE NEW NUMBER
        // ═══════════════════════════════════════

        if (subCommand === 'generate' || subCommand === 'gen' || subCommand === 'new') {
            // Stop any existing watcher
            stopWatcher(senderJid);

            const country = args[1] || 'random';

            if (!COUNTRIES.includes(country)) {
                return sock.sendMessage(jid, {
                    text:
                        '⚠️ *Invalid Country*\n\n' +
                        `Available: ${COUNTRIES.join(', ')}\n\n` +
                        '⚡ Using "random" by default.',
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

            try { await sock.sendMessage(jid, { react: { text: '📱', key: msg.key } }); } catch (_) {}

            try {
                const { data } = await axios.get(
                    `https://api.giftedtech.co.ke/api/tempgen/sms/generate?apikey=gifted&country=${country}`,
                    { timeout: 30000 }
                );

                // ── Extract number ──
                let phoneNumber = null;
                let expiresAt = null;

                if (data?.result?.number) {
                    phoneNumber = data.result.number;
                    expiresAt = data.result.expires || data.result.expires_at || '10 minutes';
                } else if (data?.number) {
                    phoneNumber = data.number;
                    expiresAt = data.expires || '10 minutes';
                } else if (typeof data === 'string' && data.match(/^\d+$/)) {
                    phoneNumber = data;
                    expiresAt = '10 minutes';
                }

                if (!phoneNumber) throw new Error('No number generated');

                // ── Store ──
                activeNumbers.set(senderJid, {
                    number: phoneNumber,
                    country: country,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 600000, // 10 minutes
                    messages: [],
                    watcher: null,
                    lastCheck: Date.now(),
                });

                // ── Send confirmation ──
                const replyText =
                    '📱 *Number Generated!*\n\n' +
                    `📞 *Number:* ${phoneNumber}\n` +
                    `🌍 *Country:* ${country}\n` +
                    `⏱ *Expires:* ${expiresAt}\n` +
                    `⏳ *Valid for:* 10 minutes\n\n` +
                    '📩 *Commands:*\n' +
                    '.number inbox — Check messages\n' +
                    '.number stop — Stop watching\n' +
                    '.number status — View info\n\n' +
                    '💡 Use this number to receive SMS verifications.\n' +
                    '🔄 Auto-checking messages every 10 seconds.';

                await sock.sendMessage(jid, {
                    text: replyText,
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

                // ── Start auto-watcher ──
                startWatcher(sock, senderJid, jid, msg);

                try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

            } catch (err) {
                console.error('❌ number generate error:', err.message);
                try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

                await sock.sendMessage(jid, {
                    text:
                        '❌ *Generation Failed*\n\n' +
                        `${err.message}\n\n` +
                        '⚡ Try again or use a different country.',
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
        }

        // ═══════════════════════════════════════
        // CHECK INBOX
        // ═══════════════════════════════════════

        if (subCommand === 'inbox' || subCommand === 'check' || subCommand === 'messages') {
            const active = activeNumbers.get(senderJid);

            if (!active) {
                return sock.sendMessage(jid, {
                    text:
                        '⚠️ *No Active Number*\n\n' +
                        'Generate a number first:\n' +
                        '.number generate\n\n' +
                        '⚡ Numbers expire after 10 minutes.',
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

            try { await sock.sendMessage(jid, { react: { text: '📩', key: msg.key } }); } catch (_) {}

            await checkInbox(sock, senderJid, jid, msg, active);

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        }

        // ═══════════════════════════════════════
        // STOP WATCHER
        // ═══════════════════════════════════════

        if (subCommand === 'stop' || subCommand === 'cancel' || subCommand === 'end') {
            const active = activeNumbers.get(senderJid);

            if (!active) {
                return sock.sendMessage(jid, {
                    text:
                        '⚠️ *No Active Number*\n\n' +
                        'There is no active number to stop.',
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

            stopWatcher(senderJid);

            await sock.sendMessage(jid, {
                text:
                    '🛑 *Number Released*\n\n' +
                    `📞 Number: ${active.number}\n` +
                    `📩 Messages received: ${active.messages.length}\n\n` +
                    '⚡ Number is no longer active.',
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

        // ═══════════════════════════════════════
        // STATUS
        // ═══════════════════════════════════════

        if (subCommand === 'status' || subCommand === 'info') {
            const active = activeNumbers.get(senderJid);

            if (!active) {
                return sock.sendMessage(jid, {
                    text:
                        '⚠️ *No Active Number*\n\n' +
                        'Generate one with: .number generate',
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

            const remainingMs = Math.max(0, active.expiresAt - Date.now());
            const remainingMin = Math.floor(remainingMs / 60000);
            const remainingSec = Math.floor((remainingMs % 60000) / 1000);

            await sock.sendMessage(jid, {
                text:
                    '📱 *Number Status*\n\n' +
                    `📞 *Number:* ${active.number}\n` +
                    `🌍 *Country:* ${active.country}\n` +
                    `📩 *Messages:* ${active.messages.length}\n` +
                    `⏱ *Remaining:* ${remainingMin}m ${remainingSec}s\n` +
                    `🔄 *Auto-check:* ${active.watcher ? '✅ Active' : '❌ Stopped'}\n\n` +
                    '⚡ Commands: .number inbox | .number stop',
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
    },
};

// ═══════════════════════════════════════
// INBOX CHECKER
// ═══════════════════════════════════════

async function checkInbox(sock, senderJid, jid, msg, active) {
    try {
        const { data } = await axios.get(
            `https://api.giftedtech.co.ke/api/tempgen/sms/inbox?apikey=gifted&number=${active.number}`,
            { timeout: 15000 }
        );

        // ── Extract messages ──
        let messages = [];

        if (data?.result?.messages && Array.isArray(data.result.messages)) {
            messages = data.result.messages;
        } else if (data?.messages && Array.isArray(data.messages)) {
            messages = data.messages;
        } else if (Array.isArray(data)) {
            messages = data;
        }

        if (messages.length === 0) {
            // Check if already showed "no messages" recently
            const lastNoMsg = active._lastNoMsgTime || 0;
            if (Date.now() - lastNoMsg > 30000) { // Only show every 30 seconds
                active._lastNoMsgTime = Date.now();
                return sock.sendMessage(jid, {
                    text:
                        '📩 *Inbox — No Messages*\n\n' +
                        `📞 Number: ${active.number}\n` +
                        `⏱ Waiting for SMS...\n\n` +
                        '💡 Messages appear automatically when received.',
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
            return;
        }

        // ── Check for new messages ──
        const existingIds = new Set(active.messages.map(m => m.id || m.text || m.sender));
        const newMessages = messages.filter(m => {
            const id = m.id || m.text || m.sender || JSON.stringify(m);
            return !existingIds.has(id);
        });

        if (newMessages.length === 0) return;

        // ── Add to active messages ──
        active.messages.push(...newMessages);

        // ── Notify user ──
        for (const sms of newMessages) {
            const sender = sms.sender || sms.from || 'Unknown';
            const text = sms.text || sms.message || sms.body || sms.content || '';
            const time = sms.time || sms.received || new Date().toLocaleTimeString();

            let notifyText =
                '📩 *New SMS Received!*\n\n' +
                `📞 *To:* ${active.number}\n` +
                `👤 *From:* ${sender}\n` +
                `🕒 *Time:* ${time}\n`;

            if (text) {
                notifyText += `💬 *Message:*\n${text}\n`;
            }

            notifyText += '\n⚡ Use .number inbox to see all messages.';

            await sock.sendMessage(jid, {
                text: notifyText,
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
        }

    } catch (err) {
        console.log('⚠️ inbox check error:', err.message);
        // Silently fail, watcher will retry
    }
}

// ═══════════════════════════════════════
// AUTO-WATCHER (every 10 seconds)
// ═══════════════════════════════════════

function startWatcher(sock, senderJid, jid, msg) {
    const active = activeNumbers.get(senderJid);
    if (!active) return;

    // Clear existing watcher
    if (active.watcher) clearInterval(active.watcher);

    active.watcher = setInterval(async () => {
        // Check if expired
        if (Date.now() >= active.expiresAt) {
            stopWatcher(senderJid);

            try {
                await sock.sendMessage(jid, {
                    text:
                        '⏰ *Number Expired*\n\n' +
                        `📞 Number: ${active.number}\n` +
                        `📩 Total messages: ${active.messages.length}\n\n` +
                        '⚡ Generate a new one: .number generate',
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

            return;
        }

        // Check inbox
        await checkInbox(sock, senderJid, jid, msg, active);

    }, 10000); // Every 10 seconds
}

// ═══════════════════════════════════════
// STOP WATCHER
// ═══════════════════════════════════════

function stopWatcher(senderJid) {
    const active = activeNumbers.get(senderJid);
    if (active) {
        if (active.watcher) clearInterval(active.watcher);
        activeNumbers.delete(senderJid);
    }
}

// ═══════════════════════════════════════
// CLEANUP ON EXIT
// ═══════════════════════════════════════

process.on('exit', () => {
    for (const [senderJid] of activeNumbers) {
        stopWatcher(senderJid);
    }
});
