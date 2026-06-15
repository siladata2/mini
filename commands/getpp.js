const axios = require("axios");

module.exports = {
    name: "getpp",
    aliases: ["pp", "avatar", "profilepic", "photo"],
    description: "Récupère la photo de profil d'un utilisateur",

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        
        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        try {
            let target = null;

            // 🔹 1. Si on répond à un message
            if (msg?.message?.extendedTextMessage?.contextInfo?.participant) {
                target = msg.message.extendedTextMessage.contextInfo.participant;
            }
            // 🔹 2. Si on mentionne quelqu'un
            else if (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            // 🔹 3. Si un numéro est fourni en argument
            else if (args[0]) {
                let number = args[0].replace(/[^0-9]/g, '');
                if (number.length < 10) {
                    return sock.sendMessage(from, {
                        text: '❌ *Numéro invalide*\n\nUtilisation: `.getpp 584168698003`\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                    }, { quoted: msg });
                }
                target = `${number}@s.whatsapp.net`;
            }
            // 🔹 4. Sinon soi-même
            else {
                target = msg?.key?.participant || msg?.key?.remoteJid;
            }

            if (!target) {
                return sock.sendMessage(from, {
                    text: '❌ *Cible introuvable*\n\nUtilisez :\n• Répondez à un message\n• Mentionnez quelqu\'un\n• .getpp [numéro]\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: "📸", key: msg.key }
                });
            }

            // Récupérer la photo de profil
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(target, "image");
            } catch {
                const targetName = target.split('@')[0];
                return sock.sendMessage(from, {
                    text: `❌ *Photo introuvable*\n\n👤 @${targetName}\n\nCet utilisateur n'a pas de photo de profil ou a bloqué l'accès.\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`,
                    mentions: [target]
                }, { quoted: msg });
            }

            // Télécharger en haute qualité
            const response = await axios.get(ppUrl, { 
                responseType: "arraybuffer",
                timeout: 10000
            });
            const buffer = Buffer.from(response.data, "binary");
            
            const fileSizeKB = (buffer.length / 1024).toFixed(2);
            const targetName = target.split('@')[0];

            // Style Cybernova
            const caption = `╭━━━━❲ *PHOTO DE PROFIL* ❳━━━━╮
┃
┃  👤 *Utilisateur :* @${targetName}
┃  📦 *Qualité :* HD
┃  📏 *Taille :* ${fileSizeKB} KB
┃  📅 *Récupérée le :* ${new Date().toLocaleDateString()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            // Envoyer l'image
            await sock.sendMessage(from, {
                image: buffer,
                caption: caption,
                mentions: [target],
                contextInfo: {
                    mentionedJid: [target],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 195
                    }
                }
            }, { quoted: msg });

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: "✅", key: msg.key }
                });
            }

        } catch (error) {
            console.error('❌ Erreur getpp:', error);
            
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: "💥", key: msg.key }
                });
            }
            
            let errorMsg = `╭━━━━❲ *ERREUR GETPP* ❳━━━━╮
┃
┃  ❌ *Impossible de récupérer*
┃  *la photo de profil*
┃
`;

            if (error.message.includes('timeout')) {
                errorMsg += `┃  ⏰ *Délai dépassé*
┃
┃  💡 *Réessayez dans quelques instants*
`;
            } else if (error.message.includes('404')) {
                errorMsg += `┃  🔍 *Photo non trouvée*
┃
┃  💡 *L'utilisateur n'a pas de photo*
`;
            } else {
                errorMsg += `┃  📝 *Erreur :* ${error.message.substring(0, 40)}
`;
            }

            errorMsg += `┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: errorMsg
            }, { quoted: msg });
        }
    }
};
