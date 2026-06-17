const fs = require('fs');
const path = require('path');

// 📁 Configuration des chemins
const WELCOME_FILE = path.join(process.cwd(), 'database', 'welcome.json');

// 📁 Créer dossier + fichier si inexistant
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(WELCOME_FILE)) fs.writeFileSync(WELCOME_FILE, '{}');

// 🔁 Fonctions de lecture/sauvegarde avec gestion d'erreurs
const getWelcome = () => {
    try {
        return JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
    } catch (err) {
        console.error('❌ Erreur lecture welcome.json:', err);
        return {};
    }
};

const saveWelcome = (data) => {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Erreur sauvegarde welcome.json:', err);
    }
};

// 🎲 Liste d'images (support mp4 et jpg)
const welcomeImages = [
    'https://files.catbox.moe/jcf2qc.jpg',
    'https://files.catbox.moe/tz07yl.jpg',
    'https://iili.io/BsJvF7R.jpg',
    'https://d.uguu.se/Kkpvxtht.mp4',
    'https://o.uguu.se/AlRGXkPp.mp4',
    'https://d.uguu.se/HutKqSjZ.mp4',
    'https://iili.io/BsJUPjV.jpg',
    'https://iili.io/BsdTfqJ.jpg',
    'https://iili.io/Bsd7U0u.jpg',
    'https://iili.io/BsdNyMu.jpg',
    'https://iili.io/Bsdk4MF.jpg',
    'https://iili.io/BsdgELN.jpg',
    'https://iili.io/Bsd6h21.jpg',
    'https://iili.io/BsdsRrN.jpg',
    'https://iili.io/BsdGUHF.jpg',
    'https://files.catbox.moe/8s31s2.jpg',
    'https://files.catbox.moe/48pqbp.jpg',
    'https://files.catbox.moe/ufzn87.jpg',
    'https://files.catbox.moe/718prk.jpg',
    'https://files.catbox.moe/3c33kh.jpg',
    'https://files.catbox.moe/ddmpaw.mp4',
    'https://files.catbox.moe/verxnu.jpg',
    'https://files.catbox.moe/noph7e.jpg'
];

// 🔀 Fonction pour choisir une image aléatoire
const getRandomImage = () => {
    return welcomeImages[Math.floor(Math.random() * welcomeImages.length)];
};

// ✅ Vérifier si c'est une image ou vidéo
const getMediaType = (url) => {
    return url.endsWith('.mp4') ? 'video' : 'image';
};

// 🔒 Anti-spam : cache des derniers messages envoyés
const lastWelcomeSent = new Map();

// =========================
// 🎉 EVENT WELCOME
// =========================
const welcomeEvent = async (sock, update) => {
    try {
        const { id, participants, action } = update;

        if (!id || !participants || !action) return;

        const db = getWelcome();

        // ✅ Par défaut ON (si non défini)
        if (db[id] === false) return;

        if (action === 'add') {
            // Anti-spam: attendre un peu pour éviter les erreurs
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
                if (lastWelcomeSent.has(cacheKey)) {
                    const lastTime = lastWelcomeSent.get(cacheKey);
                    if (Date.now() - lastTime < 60000) { // 1 minute
                        continue;
                    }
                }
                lastWelcomeSent.set(cacheKey, Date.now());

                // 🎲 Choisir média aléatoire
                const randomMedia = getRandomImage();
                const mediaType = getMediaType(randomMedia);

                // Préparer le message
                const messageContent = {
                    caption: `ϟ 𝐙𝐞𝐧𝐢𝐭𝐬𝐮 𝐌𝐢𝐧𝐢
*🅆🄴🄻🄲🄾🄼🄴 ✮* @${jid.split('@')[0]} to ${groupName} !
We are ${members} members now ☕︎.
яєѕρє¢т αℓℓ α∂мιиѕ ⚡︎.
Desc: ${groupName}

© 𝙋𝙤𝙬𝙚𝙧𝙚𝙙 𝙗𝙮 𝙘𝙮𝙗𝙚𝙧𝙣𝙤𝙫𝘼
*https://whatsapp.com/channel/0029Vb8BKWwH5JLxq1ef1R43*`,
                    contextInfo: {
                        mentionedJid: [jid],
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                };

                // Ajouter le média selon le type
                if (mediaType === 'video') {
                    messageContent.video = { url: randomMedia };
                } else {
                    messageContent.image = { url: randomMedia };
                }

                await sock.sendMessage(id, messageContent).catch(err => {
                    console.error('❌ Erreur envoi welcome:', err.message);
                });

                // ⚡ Anti-spam entre les membres
                await new Promise(res => setTimeout(res, 2000));
            }
        }

        // Nettoyer le cache périodiquement
        if (action === 'add' && participants.length > 0) {
            setTimeout(() => {
                for (const user of participants) {
                    const jid = typeof user === 'string' ? user : user.id;
                    if (jid) {
                        const cacheKey = `${id}_${jid}`;
                        lastWelcomeSent.delete(cacheKey);
                    }
                }
            }, 300000); // 5 minutes
        }

    } catch (err) {
        console.error('❌ Erreur welcome:', err.message || err);
    }
};

// =========================
// ⚙️ COMMANDE WELCOME
// =========================
const welcomeCommand = async (sock, msg) => {
    try {
        const from = msg.key.remoteJid;

        // Seulement groupe
        if (!from.endsWith('@g.us')) return;

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
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

        // Vérifier si c'est la commande welcome
        if (!commandText.toLowerCase().startsWith('welcome')) return;

        const args = commandText.split(/\s+/);
        const option = args[1]?.toLowerCase();

        const db = getWelcome();

        // Activer/Désactiver welcome
        if (option === 'on') {
            db[from] = true;
            saveWelcome(db);
            return sock.sendMessage(from, {
                text: '✅ *Welcome Enable* in this group''
            }, { quoted: msg });
        }

        if (option === 'off') {
            db[from] = false;
            saveWelcome(db);
            return sock.sendMessage(from, {
                text: '❌ *Welcome disable* in this group''
            }, { quoted: msg });
        }

        // Afficher le statut
        const status = db[from] === false ? '❌ OFF' : '✅ ON';
        await sock.sendMessage(from, {
            text: `╭━━━━❲ *WELCOME STATUS* ❳━━━━╮
┃
┃  ⚙️ *Status :* ${status}
┃
┃  ${PREFIX}welcome on  → Enable
┃  ${PREFIX}welcome off → Disable
┃  +welcome on          → Enable
┃  +welcome off         → Disable
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });

    } catch (err) {
        console.error('❌ Erreur commande welcome:', err.message || err);
    }
};

// =========================
// 📤 EXPORT POUR LE CHARGEUR D'EVENTS
// =========================
module.exports = {
    event: 'group-participants.update',
    execute: welcomeEvent
};

// =========================
// 📤 EXPORT POUR LA COMMANDE (optionnel)
// =========================
module.exports.command = {
    name: 'welcome',
    execute: welcomeCommand
};
