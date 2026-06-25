'use strict';

// ╔══════════════════════════════════════════════╗
// ║   GROUP STATUS — poster un status de groupe ║
// ║   (fonction récente Baileys / WhatsApp)     ║
// ║   Admin + Owner only · Zenitsu Mini         ║
// ╚══════════════════════════════════════════════╝

// NOTE : WhatsApp a introduit les "group statuses" (statuts de groupe)
// permettant à tous les membres du groupe de voir le statut.
// En Baileys, cela s'envoie via sock.sendMessage() vers le JID du groupe
// avec type 'status' dans les options, ou selon la version via
// sock.updateGroupDescription / sendStatusMessage selon la version Baileys.
// La méthode stable et largement supportée est d'envoyer au JID spécial
// du statut broadcasté au groupe : utilisation de sendMessage + viewOnce ou
// via groupStatus si disponible.
// Cette implémentation utilise la méthode la plus compatible.

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

// Résoudre le média : quoted > attaché au msg > URL
async function resolveMedia(sock, msg, args) {
  const mediaTypes = ['imageMessage', 'videoMessage'];

  // 1. Message cité
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    const qType = getContentType(quoted);
    if (mediaTypes.includes(qType)) {
      try {
        const fakeMsg = {
          key: {
            remoteJid: msg.key.remoteJid,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          },
          message: quoted,
        };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
        return { buffer, type: qType, caption: quoted[qType]?.caption || '' };
      } catch (_) {}
    }
  }

  // 2. Média attaché au message actuel
  const selfType = getContentType(msg.message);
  if (mediaTypes.includes(selfType)) {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      const caption = msg.message[selfType]?.caption || '';
      return { buffer, type: selfType, caption };
    } catch (_) {}
  }

  // 3. URL en argument (image uniquement)
  const url = args.find(a => /^https?:\/\/.+/.test(a));
  if (url) {
    try {
      const res  = await fetch(url);
      const ab   = await res.arrayBuffer();
      const buffer = Buffer.from(ab);
      // Retirer l'URL des args pour récupérer le caption restant
      const caption = args.filter(a => a !== url).join(' ').trim();
      return { buffer, type: 'imageMessage', caption };
    } catch (_) {}
  }

  return null;
}

// ─── Envoi du statut de groupe ─────────────────

async function sendGroupStatus(sock, msg, args, jid, ownerJid) {
  const meta = await getGroupMeta(sock, jid);
  if (!meta) return react(sock, msg, '💤');

  const senderJid = msg.key.participant || msg.key.remoteJid;

  // Vérif admin ou owner
  if (!isGroupAdmin(meta, senderJid) && senderJid !== ownerJid) {
    return react(sock, msg, '💤');
  }
  if (!isBotAdmin(meta, sock.user.id)) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg('⚠️ Bot must be *admin*'), { quoted: msg });
    return;
  }

  await react(sock, msg, '⏳');

  // Récupérer le texte (args sans éventuelle URL)
  const media = await resolveMedia(sock, msg, args);

  // ── Cas 1 : statut avec média (image ou vidéo) ──
  if (media) {
    const captionFromArgs = args.filter(a => !/^https?:\/\//.test(a)).join(' ').trim();
    const caption         = captionFromArgs || media.caption || '';

    try {
      if (media.type === 'imageMessage') {
        await sock.sendMessage(jid, {
          image: media.buffer,
          caption,
          // Envoyer comme statut de groupe : WhatsApp traite le message
          // posté dans le JID du groupe avec statusJidList comme un group status
          statusJidList: meta.participants.map(p => p.id),
        });
      } else if (media.type === 'videoMessage') {
        await sock.sendMessage(jid, {
          video: media.buffer,
          caption,
          statusJidList: meta.participants.map(p => p.id),
        });
      }
      await react(sock, msg, '⚡');
    } catch (e) {
      await react(sock, msg, '💤');
      await sock.sendMessage(jid, newsletterMsg(`❌ Échec envoi statut : ${e.message}`), { quoted: msg });
    }
    return;
  }

  // ── Cas 2 : statut texte ──
  const textContent = args.join(' ').trim();
  if (!textContent) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid,
      newsletterMsg(
        '❌ Fournis un texte, une image ou une vidéo.\n\n' +
        '*Usages :*\n' +
        '• `.groupstatus <texte>`\n' +
        '• `.groupstatus` (en citant une image/vidéo)\n' +
        '• `.groupstatus https://image.url <caption>`'
      ),
      { quoted: msg }
    );
    return;
  }

  try {
    await sock.sendMessage(jid, {
      text: textContent,
      statusJidList: meta.participants.map(p => p.id),
    });
    await react(sock, msg, '⚡');
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid, newsletterMsg(`❌ Échec : ${e.message}`), { quoted: msg });
  }
}

// ─── Export ────────────────────────────────────

module.exports = {
  name: 'groupstatus',
  aliases: ['gstatus', 'groupstatus'],
  description: 'Poster un statut visible par tous les membres du groupe',
  usage: '.groupstatus <texte> | .groupstatus (citer image/vidéo) | .groupstatus <url> <caption>',
  adminOnly: true,
  groupOnly: true,

  async execute({ sock, msg, args, jid, config }) {
    if (!jid.endsWith('@g.us')) {
      await react(sock, msg, '💤');
      return;
    }

    const ownerJid = config.OWNER_JID || config.ownerNumber + '@s.whatsapp.net';
    return sendGroupStatus(sock, msg, args, jid, ownerJid);
  },
};
