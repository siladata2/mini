const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

module.exports = {
    name: 'ocr',
    aliases: ['text', 'read', 'scan', 'reconnaitre'],
    description: 'Extraire le texte d\'une image',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        let tempFilePath = null;

        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        try {
            // Récupérer l'image (directe ou reply)
            let imageMessage = msg?.message?.imageMessage;
            if (!imageMessage) {
                const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                imageMessage = quoted?.imageMessage;
            }

            if (!imageMessage) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '❓', key: msg.key } });
                }
                return sock.sendMessage(from, {
                    text: '❌ *Usage:* Reply with ".ocr" to a image.\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            }

            // Téléchargement de l'image
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Sauvegarde temporaire
            const timestamp = Date.now();
            tempFilePath = path.join(process.cwd(), `temp_${timestamp}.jpg`);
            fs.writeFileSync(tempFilePath, buffer);

            // OCR avec Tesseract
            const { data: { text: extractedText } } = await Tesseract.recognize(
                tempFilePath, 
                'eng+fra',
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            console.log(`📖 OCR: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            // Nettoyer le fichier temporaire
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            if (!extractedText || !extractedText.trim()) {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                }
                return sock.sendMessage(from, {
                    text: '❌ no text\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            }

            // Style Cybernova
            const response = `╭━━━━❲ *OCR - TEXTE EXTRAIT* ❳━━━━╮
┃
┃  📝 *Text detected:*
┃
${extractedText.trim().split('\n').map(line => `┃  ${line}`).join('\n')}
┃
┃  📊 *Statistics:*
┃  • Symbols : ${extractedText.trim().length}
┃  • Lines: ${extractedText.trim().split('\n').length}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            await sock.sendMessage(from, {
                text: response,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202
                    }
                }
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ OCR ERROR:', err);

            // Nettoyer si erreur
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try { fs.unlinkSync(tempFilePath); } catch (e) {}
            }

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '💥', key: msg.key } });
            }

            let errorMsg = `❌ *Error OCR*\n\n`;
            if (err.message.includes('timeout')) {
                errorMsg += '⏰';
            } else if (err.message.includes('memory')) {
                errorMsg += '💾';
            } else {
                errorMsg += `📝 ${err.message}`;
            }
            
            errorMsg += '\n\n━━━━━━━━━━━━━━━\n_©CybernovA_';

            await sock.sendMessage(from, {
                text: errorMsg
            }, { quoted: msg });
        }
    }
};
