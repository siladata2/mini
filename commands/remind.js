
// ./commands/remind.js

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════

const REMINDERS_FILE = path.join(process.cwd(), 'database', 'reminders.json');
const MAX_REMINDERS = 3;
const COOLDOWN = 300000; // 5 minutes

// Init database
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(REMINDERS_FILE)) fs.writeFileSync(REMINDERS_FILE, '{}');

// ═══════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════

function getReminders() {
    try { return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8')); }
    catch (err) { return {}; }
}

function saveReminders(data) {
    try { fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error('❌ Save error:', err.message); }
}

// ═══════════════════════════════════════
// ACTIVE TIMERS
// ═══════════════════════════════════════

const activeTimers = new Map();

// ═══════════════════════════════════════
// PARSE TIME
// ═══════════════════════════════════════

function parseTimeString(input) {
    let totalSeconds = 0;
    const lower = input.toLowerCase();

    // Parse hours: h3, h1, hours3, etc.
    const hoursMatch = lower.match(/(?:h|hours?)\s*(\d+)/i);
    if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;

    // Parse minutes: m30, m5, minutes30, etc.
    const minutesMatch = lower.match(/(?:m|minutes?)\s*(\d+)/i);
    if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;

    // Parse seconds: s45, s10, seconds45, etc.
    const secondsMatch = lower.match(/(?:s|seconds?)\s*(\d+)/i);
    if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

    // If no time unit found, treat as seconds: 1800, 30, etc.
    if (!hoursMatch && !minutesMatch && !secondsMatch) {
        const numMatch = input.match(/^(\d+)$/);
        if (numMatch) totalSeconds = parseInt(numMatch[1]);
    }

    return totalSeconds;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    let result = [];
    if (h > 0) result.push(`${h}h`);
    if (m > 0) result.push(`${m}m`);
    if (s > 0 || result.length === 0) result.push(`${s}s`);
    return result.join(' ');
}

function formatDate(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

// ═══════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'remind',
    aliases: ['reminder', 'alarm', 'timer'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const botJid = sock.user?.id || jid;
        const subCommand = args[0]?.toLowerCase();

        // ═══════════════════════════════════
        // STOP
        // ═══════════════════════════════════
        if (subCommand === 'stop' || subCommand === 'cancel') {
            const userReminders = activeTimers.get(senderJid);
            if (!userReminders || userReminders.length === 0) {
                return sock.sendMessage(jid, {
                    text:
                        '⚠️ *No Active Reminders*\n\n' +
                        'You have no running reminders.\n\n' +
                        '⚡ _Zenitsu Reminder System_',
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

            // Clear all timers
            for (const timer of userReminders) {
                clearTimeout(timer.id);
            }
            activeTimers.delete(senderJid);

            return sock.sendMessage(jid, {
                text:
                    '🛑 *All Reminders Stopped*\n\n' +
                    `Cancelled ${userReminders.length} reminder(s).\n\n` +
                    '⚡ _Zenitsu Reminder System_',
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

        // ═══════════════════════════════════
        // LIST
        // ═══════════════════════════════════
        if (subCommand === 'list' || subCommand === 'show') {
            const userReminders = activeTimers.get(senderJid) || [];

            if (userReminders.length === 0) {
                return sock.sendMessage(jid, {
                    text: '📋 *No Active Reminders*\n\n⚡ _Zenitsu_',
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

            const now = Date.now();
            let listText = '📋 *Active Reminders*\n\n';

            userReminders.forEach((reminder, i) => {
                const remaining = Math.max(0, Math.floor((reminder.endTime - now) / 1000));
                listText +=
                    `*${i + 1}.* ⏰ ${formatDuration(reminder.totalSeconds)}\n` +
                    `   📝 ${reminder.note.substring(0, 50)}\n` +
                    `   ⏳ ${formatDuration(remaining)} remaining\n` +
                    `   📅 Ends: ${formatDate(new Date(reminder.endTime))}\n\n`;
            });

            listText += `🔢 *Total:* ${userReminders.length}/${MAX_REMINDERS}\n⚡ _Zenitsu_`;

            return sock.sendMessage(jid, {
                text: listText,
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

        // ═══════════════════════════════════
        // CREATE REMINDER
        // ═══════════════════════════════════

        // Parse time and note
        let timeArg = args[0] || '';
        let note = '';

        // Check if first arg is time
        const timeParsed = parseTimeString(timeArg);

        if (timeParsed > 0) {
            note = args.slice(1).join(' ');
        } else if (args.length >= 2) {
            // Maybe time is combined: h3m30s45
            const combinedTime = args.slice(0, -1).join('');
            const possibleTime = parseTimeString(combinedTime);
            if (possibleTime > 0) {
                timeArg = combinedTime;
                note = args[args.length - 1];
            } else {
                timeArg = args[0];
                note = args.slice(1).join(' ');
                const retry = parseTimeString(timeArg);
                if (retry === 0) {
                    return sock.sendMessage(jid, {
                        text:
                            '⚠️ *Invalid Time Format*\n\n' +
                            '📐 *Formats:*\n' +
                            '  .remind h1 m30 s45 | note\n' +
                            '  .remind m30 | note\n' +
                            '  .remind 1800 | note (seconds)\n\n' +
                            '💡 *Units:* h (hours), m (minutes), s (seconds)\n\n' +
                            '⚡ _Zenitsu Reminder System_',
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
        }

        const totalSeconds = parseTimeString(timeArg);

        if (totalSeconds <= 0) {
            return sock.sendMessage(jid, {
                text:
                    '⏰ *Reminder System*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.remind <time> | <note>\n' +
                    '.remind stop\n' +
                    '.remind list\n\n' +
                    '✨ *Examples:*\n' +
                    '.remind h3 m30 s45 | Meeting\n' +
                    '.remind m30 | Check food\n' +
                    '.remind 1800 | 30 minutes\n' +
                    '.remind h1 | One hour\n\n' +
                    '📐 *Units:* h (hours), m (minutes), s (seconds)\n' +
                    `🔢 *Max:* ${MAX_REMINDERS} reminders every 5 min`,
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

        // Limit check
        if (totalSeconds > 86400) {
            return sock.sendMessage(jid, {
                text: '⚠️ *Maximum 24 hours per reminder.*',
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

        // Cooldown check
        const userReminders = activeTimers.get(senderJid) || [];
        if (userReminders.length >= MAX_REMINDERS) {
            return sock.sendMessage(jid, {
                text:
                    `⚠️ *Max ${MAX_REMINDERS} Reminders*\n\n` +
                    'Stop existing reminders first:\n' +
                    '.remind stop\n\n' +
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

        // Clean note (remove leading | or .)
        note = note.replace(/^[|.\s]+/, '').trim() || 'Reminder';

        // Create reminder
        const now = Date.now();
        const endTime = now + (totalSeconds * 1000);
        const reminderNote = note;

        // Store in active timers
        if (!activeTimers.has(senderJid)) {
            activeTimers.set(senderJid, []);
        }

        const reminderId = setTimeout(async () => {
            // Send reminder to bot's own number
            const botOwnJid = botJid;

            try {
                await sock.sendMessage(botOwnJid, {
                    image: { url: 'https://iili.io/CcjxqtR.jpg' },
                    caption:
                        '⏰ *REMINDER — TIME\'S UP!*\n\n' +
                        `📝 *Note:* ${reminderNote}\n` +
                        `⏱ *Duration:* ${formatDuration(totalSeconds)}\n` +
                        `📅 *Set at:* ${formatDate(new Date(now))}\n` +
                        `🔔 *Triggered:* ${formatDate(new Date())}\n` +
                        `👤 *For:* @${senderJid.split('@')[0]}\n\n` +
                        '⚡ _Zenitsu Reminder System_',
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 350,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202,
                        },
                    },
                });
            } catch (err) {
                console.error('❌ Reminder send error:', err.message);
            }

            // Remove from active
            const currentReminders = activeTimers.get(senderJid) || [];
            const filtered = currentReminders.filter(r => r.id !== reminderId);
            if (filtered.length === 0) {
                activeTimers.delete(senderJid);
            } else {
                activeTimers.set(senderJid, filtered);
            }
        }, totalSeconds * 1000);

        // Store reminder info
        const reminderObj = {
            id: reminderId,
            note: reminderNote,
            totalSeconds,
            startTime: now,
            endTime: endTime,
        };

        userReminders.push(reminderObj);
        activeTimers.set(senderJid, userReminders);

        // Confirm
        await sock.sendMessage(jid, {
            text:
                '✅ *Reminder Set!*\n\n' +
                `📝 *Note:* ${reminderNote}\n` +
                `⏱ *Duration:* ${formatDuration(totalSeconds)}\n` +
                `📅 *Will trigger:* ${formatDate(new Date(endTime))}\n` +
                `🔢 *Active:* ${userReminders.length}/${MAX_REMINDERS}\n\n` +
                '📌 *.remind stop* to cancel\n' +
                '📋 *.remind list* to view\n\n' +
                '⚡ _Zenitsu Reminder System_',
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
    },
};
