'use strict';

// ╔══════════════════════════════════════════════╗
// ║   GETJID — Get JID of a user or group       ║
// ║   Reply to a message → user JID             ║
// ║   In group without reply → group JID        ║
// ╚══════════════════════════════════════════════╝

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

module.exports = {
  name: 'getjid',
  aliases: ['getjid', 'jid', 'id'],
  description: 'Get the JID of a user (reply) or a group',
  usage: '.getjid [reply to a message]',
  adminOnly: false,
  groupOnly: false,

  async execute({ sock, msg, jid }) {
    const isGroup = jid.endsWith('@g.us');

    // Cas 1 : message cité → JID de l'auteur du message cité
    const quotedParticipant =
      msg.message?.extendedTextMessage?.contextInfo?.participant ||
      msg.message?.imageMessage?.contextInfo?.participant ||
      msg.message?.videoMessage?.contextInfo?.participant ||
      msg.message?.stickerMessage?.contextInfo?.participant ||
      msg.message?.audioMessage?.contextInfo?.participant;

    if (quotedParticipant) {
      await react(sock, msg, '⚡');
      await sock.sendMessage(jid, {
        text:
          '*📌 User JID*\n\n' +
          '```' + quotedParticipant + '```\n\n' +
          `👤 Number : *+${quotedParticipant.split('@')[0]}*`,
      }, { quoted: msg });
      return;
    }

    // Cas 2 : en groupe sans reply → JID du groupe
    if (isGroup) {
      await react(sock, msg, '⚡');
      await sock.sendMessage(jid, {
        text:
          '*📌 Group JID*\n\n' +
          '```' + jid + '```',
      }, { quoted: msg });
      return;
    }

    // Cas 3 : en DM sans reply → JID de l'expéditeur
    const senderJid = msg.key.participant || msg.key.remoteJid;
    await react(sock, msg, '⚡');
    await sock.sendMessage(jid, {
      text:
        '*📌 Your JID*\n\n' +
        '```' + senderJid + '```\n\n' +
        `👤 Number : *+${senderJid.split('@')[0].split(':')[0]}*`,
    }, { quoted: msg });
  },
};
