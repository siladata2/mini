module.exports = {
    name: 'owner',
    aliases: ['dev', 'creator', 'z3nitsu', 'contact'],
    description: 'Affiche les informations du propriétaire',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        const owner = '50935729494@s.whatsapp.net';

        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '⚡', key: msg.key }
            });
        }

        const caption = `╭━━━❲ *CONTACT OWNER* ❳━━━╮
┃
┃  👑 *Z3niTsu*
┃  wa.me/50935948231
┃  wa.me/${owner.split('@')[0]}
┃  wa.me/584168698003
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(from, {
            image: { url: 'https://iili.io/CFwUcRs.jpg' },
            caption: caption,
            contextInfo: {
                mentionedJid: [owner],
                forwardingScore: 540,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363425394543602@newsletter',
                    newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                    serverMessageId: 202
                }
            }
        }, { quoted: msg });
    }
};
