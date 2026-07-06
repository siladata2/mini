
// ./commands/group.js

/**
 * Group Management Commands
 *
 * Usage (reply to a message or mention the target):
 *   .kick       - Remove the replied/mentioned user
 *   .add        - Add a user by number (e.g., .add 50912345678)
 *   .promote    - Promote the replied/mentioned user to admin
 *   .demote     - Demote the replied/mentioned admin to member
 *   .open       - Open the group (anyone can send messages)
 *   .close      - Close the group (only admins can send messages)
 *
 * All commands use reactions only (✅/❌) — no text responses.
 */

// ═══════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════

/**
 * Extract mentioned JIDs from a message
 * @param {object} msg - Baileys message object
 * @returns {string[]} Array of mentioned JIDs
 */
function getMentionedJids(msg) {
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    return mentions;
}

/**
 * Extract the JID of the quoted message sender
 * @param {object} msg - Baileys message object
 * @returns {string|null} Quoted sender JID or null
 */
function getQuotedJid(msg) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.participant) return null;
    return ctx.participant;
}

/**
 * Get the target JID(s) from a message (reply or mention)
 * Falls back: quoted message > mentions > null
 * @param {object} msg - Baileys message object
 * @returns {string[]} Array of target JIDs
 */
function getTargets(msg) {
    // Priority 1: quoted message sender
    const quoted = getQuotedJid(msg);
    if (quoted) return [quoted];

    // Priority 2: mentioned users
    const mentions = getMentionedJids(msg);
    if (mentions.length > 0) return mentions;

    return [];
}

/**
 * React to a message
 * @param {object} sock - Baileys socket
 * @param {string} jid - Chat JID
 * @param {object} msg - Message to react to
 * @param {string} emoji - Emoji reaction
 */
async function react(sock, jid, msg, emoji) {
    try {
        await sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    } catch (err) {
        // Silently ignore reaction errors
    }
}

/**
 * Check if the sender is a group admin
 * @param {object} sock - Baileys socket
 * @param {string} groupJid - Group JID
 * @param {string} senderJid - Sender JID
 * @returns {boolean} True if sender is admin
 */
async function isSenderAdmin(sock, groupJid, senderJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const participant = metadata.participants.find(p => p.id === senderJid);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (err) {
        return false;
    }
}

/**
 * Check if the bot is a group admin
 * @param {object} sock - Baileys socket
 * @param {string} groupJid - Group JID
 * @returns {boolean} True if bot is admin
 */
async function isBotAdmin(sock, groupJid) {
    const botJid = sock.user?.id;
    if (!botJid) return false;
    return isSenderAdmin(sock, groupJid, botJid);
}

// ═══════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════

/**
 * Kick user(s) from the group
 */
async function handleKick(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    const targets = getTargets(msg);
    if (targets.length === 0) {
        return react(sock, jid, msg, '❓');
    }

    let anySuccess = false;
    for (const target of targets) {
        // Don't kick admins (unless it's the sender themselves)
        if (await isSenderAdmin(sock, jid, target) && target !== senderJid) {
            continue;
        }
        try {
            await sock.groupParticipantsUpdate(jid, [target], 'remove');
            anySuccess = true;
        } catch (err) {
            // Individual failure, continue
        }
    }

    return react(sock, jid, msg, anySuccess ? '✅' : '❌');
}

/**
 * Add user(s) to the group by phone number
 */
async function handleAdd(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    // Get number from args or mentions
    if (args.length === 0) {
        return react(sock, jid, msg, '❓');
    }

    const numbers = args
        .map(n => n.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 7);

    if (numbers.length === 0) {
        return react(sock, jid, msg, '❓');
    }

    const jidsToAdd = numbers.map(n => n + '@s.whatsapp.net');
    let anySuccess = false;

    try {
        await sock.groupParticipantsUpdate(jid, jidsToAdd, 'add');
        anySuccess = true;
    } catch (err) {
        // If bulk add fails, try one by one
        for (const targetJid of jidsToAdd) {
            try {
                await sock.groupParticipantsUpdate(jid, [targetJid], 'add');
                anySuccess = true;
            } catch (singleErr) {
                // Individual failure, continue
            }
        }
    }

    return react(sock, jid, msg, anySuccess ? '✅' : '❌');
}

/**
 * Promote user(s) to admin
 */
async function handlePromote(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    const targets = getTargets(msg);
    if (targets.length === 0) {
        return react(sock, jid, msg, '❓');
    }

    let anySuccess = false;
    for (const target of targets) {
        try {
            await sock.groupParticipantsUpdate(jid, [target], 'promote');
            anySuccess = true;
        } catch (err) {
            // Individual failure, continue
        }
    }

    return react(sock, jid, msg, anySuccess ? '✅' : '❌');
}

/**
 * Demote admin(s) to member
 */
async function handleDemote(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    const targets = getTargets(msg);
    if (targets.length === 0) {
        return react(sock, jid, msg, '❓');
    }

    let anySuccess = false;
    for (const target of targets) {
        try {
            await sock.groupParticipantsUpdate(jid, [target], 'demote');
            anySuccess = true;
        } catch (err) {
            // Individual failure, continue
        }
    }

    return react(sock, jid, msg, anySuccess ? '✅' : '❌');
}

/**
 * Open the group (anyone can send messages)
 */
async function handleOpen(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    try {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        return react(sock, jid, msg, '🔓');
    } catch (err) {
        return react(sock, jid, msg, '❌');
    }
}

/**
 * Close the group (only admins can send messages)
 */
async function handleClose(sock, msg, args, jid, senderJid) {
    // Check if sender is admin
    if (!(await isSenderAdmin(sock, jid, senderJid))) {
        return react(sock, jid, msg, '🚫');
    }

    // Check if bot is admin
    if (await isBotAdmin(sock, jid)) {
        return react(sock, jid, msg, '🤖');
    }

    try {
        await sock.groupSettingUpdate(jid, 'announcement');
        return react(sock, jid, msg, '🔒');
    } catch (err) {
        return react(sock, jid, msg, '❌');
    }
}

// ═══════════════════════════════════════
// MAIN COMMAND DISPATCHER
// ═══════════════════════════════════════

const subCommands = {
    kick: handleKick,
    add: handleAdd,
    promote: handlePromote,
    demote: handleDemote,
    open: handleOpen,
    close: handleClose,
};

module.exports = {
    name: 'group',

    /**
     * Main execute function called by the bot
     * @param {object} ctx - Command context
     * @param {object} ctx.sock - Baileys socket
     * @param {object} ctx.msg - Message object
     * @param {string[]} ctx.args - Command arguments
     * @param {string} ctx.jid - Chat JID
     */
    async execute({ sock, msg, args, jid }) {
        // Only work in groups
        if (!jid.endsWith('@g.us')) return;

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const subCommand = args[0]?.toLowerCase();

        // Remove the subcommand from args (pass remaining args to handler)
        const remainingArgs = args.slice(1);

        if (!subCommand || !subCommands[subCommand]) {
            // Unknown subcommand — no reaction
            return;
        }

        // Execute the subcommand
        await subCommands[subCommand](sock, msg, remainingArgs, jid, senderJid);
    }
};
