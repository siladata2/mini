'use strict';

// ╔══════════════════════════════════════════════╗
// ║   GROUP SETTINGS — mute/unmute              ║
// ║   setname · setdesc · setphoto              ║
// ║   Admin + Owner only · Zenitsu Mini         ║
// ╚══════════════════════════════════════════════╝

const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

const NEWSLETTER = {
  forwardingScore: 350,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363425394543602@newsletter',
    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
    serverMessageId: 202,
  },
};

// ─── Helpers ───────────────────────────────────

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

function newsletterMsg(text) {
  return { text, contextInfo: { ...NEWSLETTER, mentionedJid: [] } };
}

async function getGroupMeta(sock, jid) {
  try { return await sock.groupMetadata(jid); }
  catch { return null; }
}

function isGroupAdmin(meta, jid) {
  return meta.participants.some(
    p => p.id === jid && (p.admin === 'admin' || p.admin === 'superadmin')
  );
}

function isBotAdmin(meta, botJid) {
  const botNumber = botJid.split(':')[0] + '@s.whatsapp.net';
  return meta.participants.some(
    p => (p.id === botJid || p.id === botNumber) &&
         (p.admin === 'admin' || p.admin === 'superadmin')
  );
}

// Récupère le buffer d'une image : quoted > URL
async function resolveImage(sock, msg, args) {
  // 1. Message cité avec image
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    const qType = getContentType(quoted);
    if (qType === 'imageMessage') {
      try {
        // Reconstruire un faux msg pour downloadMediaMessage
        const fakeMsg = {
          key: { remoteJid: msg.key.remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId },
          message: quoted,
        };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
        return buffer;
      } catch (_) {}
    }
  }

  // 2. Image attachée au message lui-même
  const selfType = getContentType(msg.message);
  if (selfType === 'imageMessage') {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      return buffer;
    } catch (_) {}
  }

  // 3. URL en argument
  if (args[0] && /^https?:\/\/.+/.test(args[0])) {
    try {
      const res  = await fetch(args[0]);
      const ab   = await res.arrayBuffer();
      return Buffer.from(ab);
    } catch (_) {}
  }

  return null;
}

// ─── Mute / Unmute ─────────────────────────────

async function handleMute(sock, msg, args, jid, ownerJid, mute) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    return react(sock, msg, '💤');
  }
  if (!isBotAdmin(meta, sock.user.id)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Must be  *admin*'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  try {
    await sock.groupSettingUpdate(jid, mute ? 'announcement' : 'not_announcement');
    await react(sock, msg, '⚡');
    await sock.sendMessage(jid, newsletterMsg(
      mute
        ? '🔇 Group *closed* — Only admins can talk'
        : '🔊 Group *open* — everybody can talk now'
    ), { quoted: msg });
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Setname ───────────────────────────────────

async function handleSetname(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    return react(sock, msg, '💤');
  }
  if (!isBotAdmin(meta, sock.user.id)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Must be *admin*'), { quoted: msg });
    return;
  }

  const newName = args.join(' ').trim();
  if (!newName) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Usage : *.setname <new>*'), { quoted: msg });
    return;
  }
  if (newName.length > 100) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ *100 symbols Max*'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  try {
    await sock.groupUpdateSubject(jid, newName);
    await react(sock, msg, '⚡');
    await sock.sendMessage(jid, newsletterMsg(`✏️ New name *${newName}*`), { quoted: msg });
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Setdesc ───────────────────────────────────

async function handleSetdesc(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    return react(sock, msg, '💤');
  }
  if (!isBotAdmin(meta, sock.user.id)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Bot must be *admin*'), { quoted: msg });
    return;
  }

  const desc = args.join(' ').trim();
  if (!desc) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Usage : *.setdesc <description>*'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  try {
    await sock.groupUpdateDescription(jid, desc);
    await react(sock, msg, '⚡');
    await sock.sendMessage(jid, newsletterMsg('📝 Description updated'), { quoted: msg });
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Setphoto ──────────────────────────────────

async function handleSetphoto(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    return react(sock, msg, '💤');
  }
  if (!isBotAdmin(meta, sock.user.id)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠ Bot must be *admin*'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  const buffer = await resolveImage(sock, msg, args);
  if (!buffer) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ SEND AN IMAGE OR AN URL.\nEx : *.setphoto https://...*'), { quoted: msg });
    return;
  }

  try {
    await sock.updateProfilePicture(jid, buffer);
    await react(sock, msg, '⚡');
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Export ────────────────────────────────────

module.exports = {
  name: 'group-settings',
  aliases: ['mute', 'unmute', 'setname', 'setdesc', 'setphoto'],
  description: 'Paramètres du groupe (admin uniquement)',
  usage: '.mute | .unmute | .setname <nom> | .setdesc <desc> | .setphoto',
  adminOnly: true,
  groupOnly: true,

  async execute({ sock, msg, args, jid, config }) {
    if (!jid.endsWith('@g.us')) {
      await react(sock, msg, '💤');
      return;
    }

    const type    = getContentType(msg.message);
    const content = msg.message[type];
    const rawText = (typeof content === 'string' ? content : content?.text || content?.caption || '')
      .trim()
      .slice(config.prefix.length)
      .split(/\s+/);
    const cmd = rawText.shift().toLowerCase();

    const ownerJid = config.OWNER_JID || config.ownerNumber + '@s.whatsapp.net';

    switch (cmd) {
      case 'mute':     return handleMute(sock, msg, args, jid, ownerJid, true);
      case 'unmute':   return handleMute(sock, msg, args, jid, ownerJid, false);
      case 'setname':  return handleSetname(sock, msg, args, jid, ownerJid);
      case 'setdesc':  return handleSetdesc(sock, msg, args, jid, ownerJid);
      case 'setphoto': return handleSetphoto(sock, msg, args, jid, ownerJid);
    }
  },
};
