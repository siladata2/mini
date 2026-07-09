'use strict';

// ╔══════════════════════════════════════════════════════════════╗
// ║           ZENITSU BOT — commands/savecontact.js             ║
// ║     Export group members as a .vcf contact file             ║
// ║     Silent command — reaction-only status feedback          ║
// ╚══════════════════════════════════════════════════════════════╝

const fs   = require('fs');
const path = require('path');

const CYBERNOVA_CONTEXT = {
  forwardingScore: 355,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid : '120363425394543602@newsletter',
    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
    serverMessageId: 202,
  },
};

// ──────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────

/**
 * Extract a clean international phone number from a WhatsApp JID.
 *
 * WhatsApp JIDs come in two forms:
 *   • Standard  : "15551234567@s.whatsapp.net"  → "15551234567"
 *   • LID (new) : "123456789012345@lid"          → cannot be used as phone number directly
 *
 * For LIDs we skip the contact (no real phone number extractable).
 * For standard JIDs the number before "@" IS the E.164 phone number (no leading "+").
 */
function phoneFromJid(jid = '') {
  if (!jid) return null;
  if (jid.endsWith('@lid')) return null; // LID — no usable phone number
  const [raw] = jid.split('@');
  // Must be digits only and at least 7 digits (shortest valid number)
  if (!/^\d{7,15}$/.test(raw)) return null;
  return raw; // already E.164 digits, we'll prepend "+" in the VCF
}

/**
 * Build a single VCARD 3.0 block.
 * contactName : best display name we have
 * phone       : E.164 digits string (no "+")
 * role        : "Admin" | "Member"
 * groupName   : group subject
 */
function buildVCard(contactName, phone, role, groupName) {
  // Sanitize name for VCF (strip commas/colons which break the format)
  const safeName = (contactName || phone).replace(/[,;:]/g, ' ').trim();

  return (
    `BEGIN:VCARD\r\n` +
    `VERSION:3.0\r\n` +
    `FN:${safeName}\r\n` +
    `N:${safeName};;;\r\n` +
    `TEL;TYPE=CELL,VOICE:+${phone}\r\n` +
    `X-GROUP:${groupName}\r\n` +
    `X-ROLE:${role}\r\n` +
    `END:VCARD\r\n`
  );
}

/**
 * Resolve the best display name for a participant.
 * Priority: pushName in metadata → sock contacts store → raw phone number.
 */
async function resolveName(sock, participant, phone) {
  // 1. pushName / notify set directly in group metadata (most reliable)
  if (participant.notify) return participant.notify;
  if (participant.name)   return participant.name;

  // 2. Check bot's local contact cache (no API call needed)
  try {
    const store = sock.store?.contacts || {};
    const jid   = participant.id;
    if (store[jid]) {
      const c = store[jid];
      const n = c.name || c.notify || c.verifiedName;
      if (n) return n;
    }
  } catch (_) {}

  // 3. Fallback: use formatted phone number as display name
  return `+${phone}`;
}

// ──────────────────────────────────────────────────────────────
//  COMMAND
// ──────────────────────────────────────────────────────────────
module.exports = {
  name    : 'savecontact',
  aliases : ['savecontacts', 'exportcontacts', 'vcf', 'exportvcf'],
  category: 'tools',

  async execute({ sock, msg, args, jid }) {

    // Groups only
    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, {
        text: '❌ This command only works in groups.',
        contextInfo: CYBERNOVA_CONTEXT,
      }, { quoted: msg });
      return;
    }

    // ── ⏳ Processing reaction ────────────────────────────────────
    try { await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } }); } catch (_) {}

    try {
      // ── Fetch group metadata ──────────────────────────────────
      const meta         = await sock.groupMetadata(jid);
      const groupName    = (meta.subject || 'Unknown_Group').replace(/[/\\?%*:|"<>]/g, '_');
      const participants = meta.participants || [];

      // Bot's own clean number to exclude from the export
      const botRaw = (sock.user?.id || '').split(':')[0].split('@')[0];

      // Separate admins set for quick lookup
      const adminSet = new Set(
        participants
          .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
          .map(p => p.id)
      );

      // ── Build VCF ─────────────────────────────────────────────
      const vcfLines  = [];
      let   exported  = 0;
      let   skipped   = 0;  // LIDs or unparseable JIDs

      for (const participant of participants) {
        const phone = phoneFromJid(participant.id);

        // Skip entries with no extractable phone number (LIDs, bot itself)
        if (!phone || phone === botRaw) {
          skipped++;
          continue;
        }

        const role = adminSet.has(participant.id) ? 'Admin' : 'Member';
        const name = await resolveName(sock, participant, phone);

        vcfLines.push(buildVCard(name, phone, role, groupName));
        exported++;
      }

      if (exported === 0) {
        try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
        await sock.sendMessage(jid, {
          text: '⚠️ No exportable contacts found in this group.',
          contextInfo: CYBERNOVA_CONTEXT,
        }, { quoted: msg });
        return;
      }

      // ── Write temp file ───────────────────────────────────────
      const tempDir  = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const fileName = `contacts_${groupName}_${Date.now()}.vcf`;
      const filePath = path.join(tempDir, fileName);
      const vcfData  = vcfLines.join('\r\n');

      fs.writeFileSync(filePath, vcfData, 'utf8');
      const fileBuffer = fs.readFileSync(filePath);
      const sizeKB     = (fileBuffer.length / 1024).toFixed(2);

      // ── Send VCF document ─────────────────────────────────────
      await sock.sendMessage(jid, {
        document: fileBuffer,
        mimetype : 'text/vcard',
        fileName : fileName,
        caption  :
          `╔══════════════════════╗\n` +
          `║  📇 *CONTACTS EXPORTED*  ║\n` +
          `╚══════════════════════╝\n\n` +
          `👥 *Group:* ${meta.subject}\n` +
          `📊 *Exported:* ${exported} contact${exported !== 1 ? 's' : ''}\n` +
          `👑 *Admins:* ${adminSet.size}\n` +
          `📦 *File size:* ${sizeKB} KB\n\n` +
          `💡 Import this VCF file to save all contacts.\n` +
          `⚡ _Exported by Zenitsu_`,
        contextInfo: CYBERNOVA_CONTEXT,
      }, { quoted: msg });

      // ── Clean temp file ───────────────────────────────────────
      try { fs.unlinkSync(filePath); } catch (_) {}

      // ── ✅ Done reaction ──────────────────────────────────────
      try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

    } catch (e) {
      console.error('[savecontact]', e);
      try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
      await sock.sendMessage(jid, {
        text: `❌ Failed to export contacts: ${e.message}`,
        contextInfo: CYBERNOVA_CONTEXT,
      }, { quoted: msg });
    }
  },
};
