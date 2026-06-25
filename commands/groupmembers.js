'use strict';

// ╔══════════════════════════════════════════════╗
// ║   GROUP MEMBERS — kick / add                ║
// ║   Admin + Owner only · Zenitsu Mini         ║
// ╚══════════════════════════════════════════════╝

const NEWSLETTER = {
  mentionedJid: [],
  forwardingScore: 350,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363425394543602@newsletter',
    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
    serverMessageId: 202,
  },
};

// ─── Helpers ───────────────────────────────────

function fmtJid(number) {
  return number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

function parseTarget(args, msg) {
  // Priorité 1 : mention dans le message
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.conversation?.match(/@([0-9]+)/)?.[1];
  if (mentioned) return mentioned.includes('@') ? mentioned : fmtJid(mentioned);

  // Priorité 2 : message cité
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return quoted;

  // Priorité 3 : numéro en argument
  if (args[0]) return fmtJid(args[0]);

  return null;
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
    p => (p.id === botJid || p.id === botNumber) && (p.admin === 'admin' || p.admin === 'superadmin')
  );
}

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

function newsletterMsg(text, mentions = []) {
  return {
    text,
    contextInfo: { ...NEWSLETTER, mentionedJid: mentions },
  };
}

// ─── Kick ──────────────────────────────────────

async function handleKick(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const botJid    = sock.user.id;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    await react(sock, msg, '💤');
    return;
  }
  if (!isBotAdmin(meta, botJid)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Bot must be *admin* '), { quoted: msg });
    return;
  }

  const target = parseTarget(args, msg);
  if (!target) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ no member detected'), { quoted: msg });
    return;
  }

  const targetMeta = meta.participants.find(p => p.id === target);
  if (!targetMeta) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Ce membre n\'est pas dans le groupe.'), { quoted: msg });
    return;
  }
  if (targetMeta.admin === 'superadmin') {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Impossible d\'expulser le créateur du groupe.'), { quoted: msg });
    return;
  }
  if (targetMeta.admin && senderJid !== ownerJid) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Tu ne peux pas expulser un autre admin.'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  try {
    await sock.groupParticipantsUpdate(jid, [target], 'remove');
    await react(sock, msg, '⚡');
    await sock.sendMessage(jid, newsletterMsg(
      `👢 @${target.split('@')[0]} kicked`,
      [target]
    ), { quoted: msg });
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Add ───────────────────────────────────────

async function handleAdd(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const botJid    = sock.user.id;

  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    await react(sock, msg, '💤');
    return;
  }
  if (!isBotAdmin(meta, botJid)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Bot must be *admin* '), { quoted: msg });
    return;
  }

  const number = args[0];
  if (!number || !/^\+?[0-9]{7,15}$/.test(number)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('❌ Usage : *.add <number>*\nEx : `.add 50912345678`'), { quoted: msg });
    return;
  }

  const target = fmtJid(number);
  const alreadyIn = meta.participants.some(p => p.id === target);
  if (alreadyIn) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`⚠️ @${target.split('@')[0]} est déjà dans le groupe.`, [target]), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');
  try {
    const result = await sock.groupParticipantsUpdate(jid, [target], 'add');
    const status = result?.[0]?.status;

    if (status === '200') {
      await react(sock, msg, '⚡');
      await sock.sendMessage(jid, newsletterMsg(
        `✅ @${target.split('@')[0]} added`,
        [target]
      ), { quoted: msg });
    } else if (status === '403') {
      await react(sock, msg, '💤');
      await sock.sendMessage(jid, newsletterMsg(`❌ @${target.split('@')[0]}`, [target]), { quoted: msg });
    } else if (status === '408') {
      await react(sock, msg, '💤');
      await sock.sendMessage(jid, newsletterMsg(`❌ *${number}* No detected on Whatsapp`), { quoted: msg });
    } else {
      await react(sock, msg, '💤');
      await sock.sendMessage(jid, newsletterMsg(`❌ Échec (code ${status}).`), { quoted: msg });
    }
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Erreur : ${e.message}`), { quoted: msg });
  }
}

// ─── Export ────────────────────────────────────

module.exports = {
  name: 'group-members',
  aliases: ['kick', 'add'],
  description: 'Expulser ou ajouter un membre (admin uniquement)',
  usage: '.kick @mention | .add <numéro>',
  adminOnly: true,
  groupOnly: true,

  async execute({ sock, msg, args, jid, config }) {
    if (!jid.endsWith('@g.us')) {
      await react(sock, msg, '💤');
      return;
    }

    const cmdUsed = msg.key?.id
      ? (extractCmdName(msg, config.prefix) || '')
      : '';

    // Déterminer la commande depuis le texte original
    const { getContentType } = require('@whiskeysockets/baileys');
    const type    = getContentType(msg.message);
    const content = msg.message[type];
    const rawText = (typeof content === 'string' ? content : content?.text || content?.caption || '')
      .trim()
      .slice(config.prefix.length)
      .split(/\s+/);
    const cmd = rawText.shift().toLowerCase();

    const ownerJid = config.OWNER_JID || config.ownerNumber + '@s.whatsapp.net';

    if (cmd === 'kick') return handleKick(sock, msg, args, jid, ownerJid);
    if (cmd === 'add')  return handleAdd(sock, msg, args, jid, ownerJid);
  },
};

function extractCmdName(msg, prefix) {
  try {
    const { getContentType } = require('@whiskeysockets/baileys');
    const type    = getContentType(msg.message);
    const content = msg.message[type];
    const text    = (typeof content === 'string' ? content : content?.text || content?.caption || '').trim();
    if (!text.startsWith(prefix)) return null;
    return text.slice(prefix.length).split(/\s+/)[0].toLowerCase();
  } catch { return null; }
}
