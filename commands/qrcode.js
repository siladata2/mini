'use strict';

// ╔══════════════════════════════════════════════╗
// ║   QRCODE — Génère un QR code avec ⚡        ║
// ║   Aucune dépendance externe requise         ║
// ║   Admin/User · Zenitsu Mini                 ║
// ╚══════════════════════════════════════════════╝

// Stratégie :
//   1. Générer le QR via l'API publique api.qrserver.com (PNG brut)
//   2. Composer une image SVG finale qui encapsule le PNG + l'éclair ⚡
//      centré, avec fond semi-transparent, rendu inline en SVG vectoriel
//   3. Convertir le SVG en Buffer PNG grâce au module natif (svg→canvas-like)
//      → On envoie directement le SVG converti si disponible,
//        sinon on envoie le QR brut + l'éclair en caption
//
// Pour l'overlay ⚡ sur le PNG :
//   On utilise la lib "sharp" si disponible (npm install sharp),
//   sinon fallback sur envoi du QR seul avec l'éclair en caption.
//   Sharp est déjà souvent présent dans les projets Baileys.

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

// ─── QR API publique ───────────────────────────

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

async function fetchQrBuffer(data, size = 512) {
  const url = QR_API + '?' + new URLSearchParams({
    data,
    size: `${size}x${size}`,
    ecc: 'H',          // High error correction → nécessaire pour le logo au centre
    margin: '2',
    format: 'png',
    color: '000000',
    bgcolor: 'ffffff',
  }).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`QR API error ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// ─── Overlay ⚡ avec Sharp (optionnel) ─────────

async function overlayLightning(qrBuffer, size = 512) {
  let sharp;
  try { sharp = require('sharp'); } catch (_) { return null; }

  // SVG de l'éclair centré avec fond rond semi-transparent
  const iconSize  = Math.round(size * 0.18);  // ~18% de la taille du QR
  const halfIcon  = Math.round(iconSize / 2);
  const cx        = Math.round(size / 2);
  const cy        = Math.round(size / 2);

  // Points de l'éclair (polygone normalisé sur 100x100, centré)
  // Forme classique d'un bolt : pentagone asymétrique
  const boltSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 100 100">
  <!-- Fond circulaire blanc semi-transparent -->
  <circle cx="50" cy="50" r="48" fill="white" opacity="0.88"/>
  <!-- Éclair jaune avec contour sombre -->
  <polygon
    points="58,5 28,55 50,55 42,95 72,45 50,45 58,5"
    fill="#FFD700"
    stroke="#1a1a1a"
    stroke-width="3"
    stroke-linejoin="round"
  />
</svg>`;

  const iconBuffer = Buffer.from(boltSvg);

  try {
    const result = await sharp(qrBuffer)
      .composite([{
        input: iconBuffer,
        top:  cy - halfIcon,
        left: cx - halfIcon,
      }])
      .png()
      .toBuffer();
    return result;
  } catch (e) {
    return null;
  }
}

// ─── Fallback : SVG complet autonome ───────────
// Si sharp n'est pas dispo, on génère un SVG qui
// encapsule le QR PNG en base64 + l'éclair par-dessus.
// WhatsApp accepte les PNG, donc on encode le SVG et on
// retourne null pour signaler qu'on doit envoyer en caption.

async function buildSvgFallback(qrBuffer, size = 512) {
  const b64    = qrBuffer.toString('base64');
  const icon   = Math.round(size * 0.18);
  const half   = Math.round(icon / 2);
  const cx     = Math.round(size / 2);
  const cy     = Math.round(size / 2);
  const lx     = cx - half;
  const ly     = cy - half;

  // SVG complet : image QR + éclair superposé
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}">
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="${size}" height="${size}"/>
  <circle cx="${cx}" cy="${cy}" r="${half}" fill="white" opacity="0.88"/>
  <polygon
    transform="translate(${lx},${ly}) scale(${icon / 100})"
    points="58,5 28,55 50,55 42,95 72,45 50,45 58,5"
    fill="#FFD700" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"
  />
</svg>`;

  // Tenter la conversion SVG→PNG avec sharp si dispo
  try {
    const sharp = require('sharp');
    const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuf;
  } catch (_) {}

  // Dernier recours : retourner null (on enverra le QR brut)
  return null;
}

// ─── Commande principale ───────────────────────

async function handleQrcode(sock, msg, args, jid) {
  const text = args.join(' ').trim();

  if (!text) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid,
      newsletterMsg(
        '❌ *Usage :* `.qrcode <texte ou URL>`\n\n' +
        '_Exemple :_ `.qrcode https://github.com`\n' +
        '_Exemple :_ `.qrcode Zenitsu Mini Bot ⚡`'
      ),
      { quoted: msg }
    );
    return;
  }

  if (text.length > 900) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid,
      newsletterMsg('❌ Too long, Limit : *900 caractères*.'),
      { quoted: msg }
    );
    return;
  }

  await react(sock, msg, '⏳');

  let qrBuffer;
  try {
    qrBuffer = await fetchQrBuffer(text, 512);
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid,
      newsletterMsg(`❌\n_${e.message}_`),
      { quoted: msg }
    );
    return;
  }

  // Tenter l'overlay ⚡
  let finalBuffer = await overlayLightning(qrBuffer, 512);

  // Si sharp pas dispo, essayer le fallback SVG
  if (!finalBuffer) {
    finalBuffer = await buildSvgFallback(qrBuffer, 512);
  }

  // Dernier recours : QR brut sans overlay
  if (!finalBuffer) {
    finalBuffer = qrBuffer;
  }

  const previewText = text.length > 60 ? text.slice(0, 57) + '...' : text;

  try {
    await sock.sendMessage(jid, {
      image: finalBuffer,
      caption: ` *QR Code generated*\n\n📄 _${previewText}_`,
      contextInfo: { ...NEWSLETTER, mentionedJid: [] },
    }, { quoted: msg });
    await react(sock, msg, '⚡');
  } catch (e) {
    await react(sock, msg, '💤');
    await sock.sendMessage(jid,
      newsletterMsg(`❌ Erreur d'envoi : ${e.message}`),
      { quoted: msg }
    );
  }
}

// ─── Export ────────────────────────────────────

module.exports = {
  name: 'qrcode',
  aliases: ['qr', 'qrcode'],
  description: 'Génère un QR code avec un ⚡ au centre',
  usage: '.qrcode <texte ou URL>',
  adminOnly: false,
  groupOnly: false,

  async execute({ sock, msg, args, jid }) {
    return handleQrcode(sock, msg, args, jid);
  },
};
