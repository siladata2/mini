const fs = require('fs');
const path = require('path');

// 📁 Configuration des chemins
const GOODBYE_FILE = path.join(process.cwd(), 'database', 'goodbye.json');

// 📁 Créer dossier + fichier si inexistant
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(GOODBYE_FILE)) fs.writeFileSync(GOODBYE_FILE, '{}');

// 🔁 Fonctions de lecture/sauvegarde
const getGoodbye = () => {
    try {
        return JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'));
    } catch (err) {
        console.error('❌ Erreur lecture goodbye.json:', err);
        return {};
    }
};

const saveGoodbye = (data) => {
    try {
        fs.writeFileSync(GOODBYE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Erreur sauvegarde goodbye.json:', err);
    }
};

// 🔒 Anti-spam : cache des derniers messages envoyés
const lastGoodbyeSent = new Map();

// =========================
// 👋 EVENT GOODBYE
// =========================
const goodbyeEvent = async (sock, update) => {
    try {
        const { id, participants, action } = update;

        if (!id || !participants) return;

        const db = getGoodbye();

        // ✅ ON PAR DÉFAUT
        if (db[id] === false) return;

        if (action === 'remove') {
            // Anti-spam: attendre un peu
            await new Promise(resolve => setTimeout(resolve, 1500));

            const metadata = await sock.groupMetadata(id).catch(() => null);
            if (!metadata) return;

            const groupName = metadata.subject || 'Groupe';
            const members = metadata.participants.length;

            for (let user of participants) {
                const jid = typeof user === 'string' ? user : user.id;
                if (!jid) continue;

                // 🔒 Anti-spam : éviter les doublons
                const cacheKey = `${id}_${jid}`;
                if (lastGoodbyeSent.has(cacheKey)) {
                    const lastTime = lastGoodbyeSent.get(cacheKey);
                    if (Date.now() - lastTime < 60000) { // 1 minute
                        continue;
                    }
                }
                lastGoodbyeSent.set(cacheKey, Date.now());

                // 📸 récupérer photo profil
                let pp;
                try {
                    pp = await sock.profilePictureUrl(jid, 'image');
                } catch {
                    pp = 'https://iili.io/BQeNq0b.jpg';
                }

                await sock.sendMessage(id, {
                    image: { url: pp },
                    caption: `ϟ 𝐙𝐞𝐧𝐢𝐭𝐬𝐮 𝐌𝐢𝐧𝐢
𝙶𝚘𝚘𝚍𝚋𝚢𝚎 🫂 @${jid.split('@')[0]} !☹

➟ *Group* ${groupName}
➟  ${members} now .


𝙒𝙚 𝙬𝙞𝙡𝙡 𝙢𝙞𝙨𝙨 𝙮𝙤𝙪 🥀
*https://whatsapp.com/channel/0029Vb8BKWwH5JLxq1ef1R43*`,
                    contextInfo: {
                        mentionedJid: [jid],
                        forwardingScore: 240,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                });

                // ⚡ anti-spam entre les membres
                await new Promise(res => setTimeout(res, 2000));
            }

            // Nettoyer le cache périodiquement
            setTimeout(() => {
                for (const user of participants) {
                    const jid = typeof user === 'string' ? user : user.id;
                    if (jid) {
                        const cacheKey = `${id}_${jid}`;
                        lastGoodbyeSent.delete(cacheKey);
                    }
                }
            }, 300000); // 5 minutes
        }

    } catch (err) {
        console.log('❌ Erreur goodbye:', err);
    }
};

// =========================
// ⚙️ COMMANDE GOODBYE
// =========================
const goodbyeCommand = async (sock, msg) => {
    try {
        const from = msg.key.remoteJid;
        if (!from.endsWith('@g.us')) return;

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (!body) return;

        // ✅ Support des DEUX préfixes
        const PREFIX = global.PREFIX || '.';
        const hasPrefix = body.startsWith(PREFIX) || body.startsWith('+');
        if (!hasPrefix) return;

        // Extraire la commande sans le préfixe
        let commandText = body;
        if (body.startsWith(PREFIX)) {
            commandText = body.slice(PREFIX.length).trim();
        } else if (body.startsWith('+')) {
            commandText = body.slice(1).trim();
        }

        // Vérifier si c'est la commande goodbye
        if (!commandText.toLowerCase().startsWith('goodbye')) return;

        const args = commandText.split(/\s+/);
        const option = args[1]?.toLowerCase();

        const db = getGoodbye();

        if (option === 'off') {
            db[from] = false;
            saveGoodbye(db);
            return sock.sendMessage(from, {
                text: '❌ *Goodbye disable* in this group'
            }, { quoted: msg });
        }

        if (option === 'on') {
            db[from] = true;
            saveGoodbye(db);
            return sock.sendMessage(from, {
                text: '✅ *Goodbye Enable* in this group''
            }, { quoted: msg });
        }

        const status = db[from] === false ? '❌ OFF' : '✅ ON';

        await sock.sendMessage(from, {
            text: `╭━━━━❲ *GOODBYE STATUS* ❳━━━━╮
┃
┃  ⚙️ *Statut :* ${status}
┃
┃  ${PREFIX}goodbye on  → Enable
┃  ${PREFIX}goodbye off → Disable
┃  +goodbye on          → Enable
┃  +goodbye off         → Disable
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

    } catch (err) {
        console.log('❌ Erreur commande goodbye:', err);
    }
};

// =========================
// 📤 EXPORT POUR LE CHARGEUR D'EVENTS
// =========================
module.exports = {
    event: 'group-participants.update',
    execute: goodbyeEvent
};

// =========================
// 📤 EXPORT POUR LA COMMANDE (optionnel)
// =========================
module.exports.command = {
    name: 'goodbye',
    execute: goodbyeCommand
};
