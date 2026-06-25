'use strict';

// ╔══════════════════════════════════════════════╗
// ║   INFO — Bot info with interactive buttons  ║
// ║   buttonMessage (DM) · listMessage (Group)  ║
// ║   Zenitsu Mini                              ║
// ╚══════════════════════════════════════════════╝

// NOTE sur les boutons WhatsApp via Baileys :
// - buttonMessage     → fonctionne en DM, parfois bloqué en groupe
// - listMessage       → fonctionne partout, recommandé en groupe
// - Le bouton "Copy" utilise copyCode pour copier dans le presse-papier
// - Le bouton "Channel" utilise urlButton pour ouvrir un lien direct
// On détecte automatiquement DM vs groupe et on adapte le format.

const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb8BKWwH5JLxq1ef1R43';
const CHANNEL_NAME = '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟';
const OWNER_NUMBER = '50935948231';

// ─── Helpers ───────────────────────────────────

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

// ─── DM : buttonMessage ────────────────────────
// 4 types de boutons disponibles :
//   - reply       → envoie un texte comme si l'user l'avait tapé
//   - url         → ouvre un lien dans WhatsApp
//   - copy        → copie un texte dans le presse-papier
//   - call        → appel téléphonique

async function sendInfoButtons(sock, msg, jid) {
  const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

  await sock.sendMessage(jid, {
    buttons: [
      // Bouton 1 : Owner (ouvre un chat avec l'owner)
      {
        buttonId: 'btn_owner',
        buttonText: { displayText: '👤 Owner' },
        type: 1,  // reply
      },
      // Bouton 2 : Channel (lien direct)
      {
        buttonId: 'btn_channel',
        buttonText: { displayText: '📢 Channel' },
        type: 4,  // url
        nativeFlowInfo: {
          name: 'galaxy_message',
          paramsJson: JSON.stringify({ screen_0_url: CHANNEL_LINK }),
        },
      },
      // Bouton 3 : Menu (exécute .menu)
      {
        buttonId: '.menu',
        buttonText: { displayText: '📋 Menu' },
        type: 1,  // reply — le bot intercepte ce texte comme commande
      },
      // Bouton 4 : Copy channel link
      {
        buttonId: 'btn_copy',
        buttonText: { displayText: '🔗 Copy link' },
        type: 1,
      },
    ],
    headerType: 1,
    contentText:
      '*⚡ Zenitsu Mini — Bot Info*\n\n' +
      `👤 *Owner :* +${OWNER_NUMBER}\n` +
      `📢 *Channel :* ${CHANNEL_NAME}\n` +
      `🔗 ${CHANNEL_LINK}`,
    footerText: 'Tap a button below',
  }, { quoted: msg });
}

// ─── Groupe : listMessage ──────────────────────

async function sendInfoList(sock, msg, jid) {
  await sock.sendMessage(jid, {
    listMessage: {
      title: '⚡ Zenitsu Mini — Bot Info',
      description:
        `👤 *Owner :* +${OWNER_NUMBER}\n` +
        `📢 *Channel :* ${CHANNEL_NAME}\n` +
        `🔗 ${CHANNEL_LINK}`,
      buttonText: 'ℹ️ Options',
      footerText: 'Select an option',
      listType: 1,
      sections: [
        {
          title: 'Bot Info',
          rows: [
            {
              rowId: 'info_owner',
              title: '👤 Owner',
              description: `+${OWNER_NUMBER}`,
            },
            {
              rowId: 'info_channel',
              title: '📢 Channel',
              description: CHANNEL_NAME,
            },
            {
              rowId: '.menu',
              title: '📋 Menu',
              description: 'Show all available commands',
            },
            {
              rowId: 'info_copy',
              title: '🔗 Copy Channel Link',
              description: CHANNEL_LINK,
            },
          ],
        },
      ],
    },
  }, { quoted: msg });
}

// ─── Gestion des réponses aux boutons/liste ────
// Quand l'user clique sur un bouton, Baileys reçoit un message
// avec selectedButtonId ou listResponseMessage.singleSelectReply.selectedRowId.
// On intercepte ça dans le handler principal de messages.
// Ajoute dans ton handler messages-upsert :
//
//   const btnId = msg.message?.buttonsResponseMessage?.selectedButtonId
//     || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
//   if (btnId) {
//     if (btnId === 'info_owner') {
//       await sock.sendMessage(jid, { text: `👤 Owner : wa.me/${OWNER_NUMBER}` }, { quoted: msg });
//     } else if (btnId === 'info_channel' || btnId === 'btn_channel') {
//       await sock.sendMessage(jid, { text: `📢 ${CHANNEL_NAME}\n${CHANNEL_LINK}` }, { quoted: msg });
//     } else if (btnId === 'info_copy' || btnId === 'btn_copy') {
//       await sock.sendMessage(jid, { text: CHANNEL_LINK }, { quoted: msg });
//     } else if (btnId === '.menu') {
//       // Dispatcher la commande menu normalement
//       await dispatchCommand(sock, msg, '.menu', [], jid, config);
//     }
//   }

// ─── Export ────────────────────────────────────

module.exports = {
  name: 'info',
  aliases: ['info', 'botinfo'],
  description: 'Show bot info with interactive buttons',
  usage: '.info',
  adminOnly: false,
  groupOnly: false,

  // Constantes exportées pour le handler de boutons
  CHANNEL_LINK,
  CHANNEL_NAME,
  OWNER_NUMBER,

  async execute({ sock, msg, args, jid }) {
    const isGroup = jid.endsWith('@g.us');
    await react(sock, msg, '⏳');
    try {
      if (isGroup) {
        await sendInfoList(sock, msg, jid);
      } else {
        await sendInfoButtons(sock, msg, jid);
      }
      await react(sock, msg, '⚡');
    } catch (e) {
      // Fallback texte si les boutons sont bloqués par WhatsApp
      await react(sock, msg, '💤');
      await sock.sendMessage(jid, {
        text:
          '*⚡ Zenitsu Mini — Bot Info*\n\n' +
          `👤 *Owner :* wa.me/${OWNER_NUMBER}\n` +
          `📢 *Channel :* ${CHANNEL_NAME}\n` +
          `🔗 ${CHANNEL_LINK}\n\n` +
          `📋 Type *.menu* to see all commands`,
      }, { quoted: msg });
      await react(sock, msg, '⚡');
    }
  },

  // Handler à appeler depuis ton dispatcher principal
  // pour intercepter les clics sur les boutons/liste
  async handleButtonResponse({ sock, msg, jid, btnId, config, dispatchCommand }) {
    switch (btnId) {
      case 'info_owner':
      case 'btn_owner':
        await sock.sendMessage(jid, {
          text: `👤 *Owner*\nwa.me/${OWNER_NUMBER}`,
        }, { quoted: msg });
        break;

      case 'info_channel':
      case 'btn_channel':
        await sock.sendMessage(jid, {
          text: `📢 *${CHANNEL_NAME}*\n${CHANNEL_LINK}`,
        }, { quoted: msg });
        break;

      case 'info_copy':
      case 'btn_copy':
        await sock.sendMessage(jid, {
          text: CHANNEL_LINK,
        }, { quoted: msg });
        break;

      case '.menu':
        if (typeof dispatchCommand === 'function') {
          await dispatchCommand(sock, msg, 'menu', [], jid, config);
        }
        break;
    }
  },
};
