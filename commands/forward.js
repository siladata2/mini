const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'forward',
    aliases: ['fw', 'send', 'transfer'],
    description: 'Transfère un message vers un autre numéro/groupe',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        
        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        try {
            const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quoted) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
                }
                return sock.sendMessage(from, {
                    text: '❌\n.forward [number|group]\n*Exemple:*\n`.forward 584155555555`\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            const targetJid = args[0];
            if (!targetJid) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '⚠️', key: msg.key } });
                }
                return sock.sendMessage(from, {
                    text: '❌ *Cible manquante*\n\nUtilisation: `.forward [numéro]`\n\n*Exemple:*\n`.forward 584168698003`\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            // Nettoyer le numéro cible
            let cleanTarget = targetJid;
            if (!cleanTarget.includes('@s.whatsapp.net') && !cleanTarget.includes('@g.us')) {
                const number = cleanTarget.replace(/[^0-9]/g, '');
                if (number.length >= 10) {
                    cleanTarget = `${number}@s.whatsapp.net`;
                } else {
                    return sock.sendMessage(from, {
                        text: '❌ *Numéro invalide*\n\nVérifiez le format du numéro.\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                    }, { quoted: msg });
                }
            }

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });
            }
            await delay(1000);

            // IMAGE
            if (quoted.imageMessage) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });
                }

                const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                await delay(1000);
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                }
                
                const caption = `📷 *Message forwarded*`;
                await sock.sendMessage(cleanTarget, { 
                    image: buffer, 
                    mimetype: 'image/jpeg',
                    caption: caption,
                    contextInfo: {
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 195
                        }
                    }
                });
            }
            // VIDÉO
            else if (quoted.videoMessage) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });
                }

                const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                await delay(1000);
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                }
                
                const caption = `🎬 *Video forwarded*`;
                await sock.sendMessage(cleanTarget, { 
                    video: buffer, 
                    mimetype: 'video/mp4',
                    caption: caption,
                    contextInfo: {
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 195
                        }
                    }
                });
            }
            // DOCUMENT
            else if (quoted.documentMessage) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });
                }

                const stream = await downloadContentFromMessage(quoted.documentMessage, 'document');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                await delay(1000);
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                }
                
                const fileName = quoted.documentMessage.fileName || 'document.pdf';
                await sock.sendMessage(cleanTarget, { 
                    document: buffer, 
                    mimetype: quoted.documentMessage.mimetype || 'application/pdf',
                    fileName: fileName,
                    contextInfo: {
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 195
                        }
                    }
                });
            }
            // TEXTE
            else if (quoted.conversation || quoted.extendedTextMessage) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });
                }
                await delay(1000);
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                }
                
                const textContent = quoted.conversation || quoted.extendedTextMessage?.text || '';
                await sock.sendMessage(cleanTarget, {
                    text: `${textContent}`,
                    contextInfo: {
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 195
                        }
                    }
                });
            }
            // AUTRE
            else {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                }
                return sock.sendMessage(from, {
                    text: '❌ *Type not supported*\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            // Confirmation
            const targetDisplay = cleanTarget.split('@')[0];
            await sock.sendMessage(from, {
                text: `✅  ${targetDisplay}\n📁 Type : ${Object.keys(quoted)[0] || 'message'}\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ Forward ERROR:', err);
            
            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '💥', key: msg.key } });
            }
            
            await sock.sendMessage(from, {
                text: `❌ *Error*\n\n${err.message}\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });
        }
    }
};
